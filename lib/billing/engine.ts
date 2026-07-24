/**
 * Billing engine — pure, side-effect-free computations used to assemble
 * invoices. Everything here is deterministic and unit-testable; persistence
 * and numbering live elsewhere. All money is rounded half-up to 2 decimals.
 *
 * Rules implemented per PRD:
 *  - 8.1 Pro-rated rent
 *  - 8.2 Rounding (half-up, 2 dp)
 *  - 8.4 Electricity split modes
 *  - Section 6.5 line-item assembly (rent, electricity, recurring charges, tax)
 */

export type SplitMode = "equal" | "by_days_occupied" | "primary_tenant" | "room_level";

export interface AllotmentInput {
  id: string;
  tenant_id: string;
  agreed_rent: number;
  move_in_date: Date;
  expected_move_out_date: Date | null;
  actual_move_out_date: Date | null;
  /** JSON string: [{ charge_head_id, amount }] */
  recurring_charges: string | null;
}

export interface ChargeHeadInput {
  id: string;
  name: string;
  code: string;
  type: string; // recurring_monthly | one_time | usage_based
  default_amount: number;
  applies_to: string; // per_bed | per_room | per_tenant
  is_taxable: boolean;
  is_active: boolean;
}

export interface SettingsInput {
  electricity_rate_per_unit: number;
  electricity_split_mode: string;
  prorate_partial_month: boolean;
  tax_enabled: boolean;
  tax_percent: number | null;
  tax_applies_to: string | null; // rent | electricity | all
}

export interface LineItem {
  charge_head_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  is_taxable: boolean;
  meta?: Record<string, unknown>;
  sort_order: number;
}

/** Round half-up to 2 decimal places. */
export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function endOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}
function daysBetweenInclusive(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * PRD 8.1 — pro-rated rent for a billing month. Returns the full agreed rent
 * when the tenant occupied the whole month (or pro-rating is disabled).
 */
export function proRateRent(
  allotment: AllotmentInput,
  billingMonth: Date,
  prorate: boolean
): { amount: number; occupiedDays: number; daysInMonth: number; prorated: boolean } {
  const monthStart = startOfMonth(billingMonth);
  const monthEnd = endOfMonth(billingMonth);
  const daysInMonth = monthEnd.getUTCDate();

  const occupiedStart = allotment.move_in_date > monthStart ? allotment.move_in_date : monthStart;
  const rawEnd = allotment.actual_move_out_date || allotment.expected_move_out_date || monthEnd;
  const occupiedEnd = rawEnd < monthEnd ? rawEnd : monthEnd;

  if (occupiedEnd < occupiedStart) {
    return { amount: 0, occupiedDays: 0, daysInMonth, prorated: true };
  }

  const occupiedDays = Math.min(daysBetweenInclusive(occupiedStart, occupiedEnd), daysInMonth);
  const isPartial = occupiedDays < daysInMonth;

  if (!prorate || !isPartial) {
    return { amount: roundMoney(allotment.agreed_rent), occupiedDays: daysInMonth, daysInMonth, prorated: false };
  }
  return {
    amount: roundMoney((allotment.agreed_rent * occupiedDays) / daysInMonth),
    occupiedDays,
    daysInMonth,
    prorated: true,
  };
}

/**
 * PRD 8.4 — split a room's electricity amount across its active occupants.
 * `occupants` are the allotments active in the room for the billing month.
 * Returns a map of allotment_id -> { amount, share_note }.
 */
export function splitElectricity(
  totalAmount: number,
  units: number,
  occupants: AllotmentInput[],
  mode: SplitMode,
  billingMonth: Date,
  prorate: boolean
): Map<string, { amount: number; note: string }> {
  const result = new Map<string, { amount: number; note: string }>();
  if (occupants.length === 0 || totalAmount <= 0) return result;

  if (mode === "primary_tenant" || mode === "room_level") {
    // Whole amount to the first (primary) occupant.
    const primary = occupants[0];
    result.set(primary.id, {
      amount: roundMoney(totalAmount),
      note: `${units} units (full room meter)`,
    });
    return result;
  }

  if (mode === "by_days_occupied") {
    const weights = occupants.map((o) => proRateRent(o, billingMonth, prorate).occupiedDays || 1);
    const totalWeight = weights.reduce((s, w) => s + w, 0) || occupants.length;
    let allocated = 0;
    occupants.forEach((o, i) => {
      const isLast = i === occupants.length - 1;
      const amt = isLast ? roundMoney(totalAmount - allocated) : roundMoney((totalAmount * weights[i]) / totalWeight);
      allocated += amt;
      result.set(o.id, { amount: amt, note: `${weights[i]} days share of ${units} units` });
    });
    return result;
  }

  // default: equal split, remainder pinned to the last occupant so shares sum exactly.
  const per = roundMoney(totalAmount / occupants.length);
  let allocated = 0;
  occupants.forEach((o, i) => {
    const isLast = i === occupants.length - 1;
    const amt = isLast ? roundMoney(totalAmount - allocated) : per;
    allocated += amt;
    result.set(o.id, { amount: amt, note: `1/${occupants.length} of ${units} units` });
  });
  return result;
}

/**
 * Assemble the full set of line items + totals for a single allotment's
 * invoice in a given billing month.
 */
export function buildInvoice(params: {
  allotment: AllotmentInput;
  billingMonth: Date;
  settings: SettingsInput;
  chargeHeads: ChargeHeadInput[];
  /** Electricity share already computed for this allotment (from splitElectricity). */
  electricity?: { amount: number; units: number; note: string; chargeHeadId: string | null } | null;
}): {
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  periodStart: Date;
  periodEnd: Date;
} {
  const { allotment, billingMonth, settings, chargeHeads, electricity } = params;
  const monthStart = startOfMonth(billingMonth);
  const monthEnd = endOfMonth(billingMonth);
  const lineItems: LineItem[] = [];

  const rentHead = chargeHeads.find((c) => c.code?.toLowerCase() === "rent" || c.name?.toLowerCase() === "rent");
  const rent = proRateRent(allotment, billingMonth, settings.prorate_partial_month);
  if (rent.amount > 0) {
    lineItems.push({
      charge_head_id: rentHead?.id ?? null,
      description: rent.prorated
        ? `Rent (${rent.occupiedDays}/${rent.daysInMonth} days pro-rated)`
        : "Rent (full month)",
      quantity: 1,
      unit_price: rent.amount,
      amount: rent.amount,
      is_taxable: rentHead?.is_taxable ?? false,
      meta: { occupiedDays: rent.occupiedDays, daysInMonth: rent.daysInMonth, prorated: rent.prorated },
      sort_order: 0,
    });
  }

  if (electricity && electricity.amount > 0) {
    const elecHead = chargeHeads.find(
      (c) => c.code?.toLowerCase() === "electricity" || c.name?.toLowerCase() === "electricity"
    );
    lineItems.push({
      charge_head_id: electricity.chargeHeadId ?? elecHead?.id ?? null,
      description: `Electricity — ${electricity.note}`,
      quantity: 1,
      unit_price: electricity.amount,
      amount: electricity.amount,
      is_taxable: elecHead?.is_taxable ?? false,
      meta: { units: electricity.units, rate: settings.electricity_rate_per_unit },
      sort_order: 1,
    });
  }

  // Allotment-specific recurring charges override defaults when present.
  let overrides: Array<{ charge_head_id: string; amount: number }> = [];
  try {
    overrides = allotment.recurring_charges ? JSON.parse(allotment.recurring_charges) : [];
  } catch {
    overrides = [];
  }
  const overrideMap = new Map(overrides.map((o) => [o.charge_head_id, o.amount]));

  const recurringHeads = chargeHeads.filter(
    (c) =>
      c.is_active &&
      c.type === "recurring_monthly" &&
      c.code?.toLowerCase() !== "rent" &&
      (overrideMap.has(c.id) || c.default_amount > 0)
  );
  recurringHeads.forEach((c, i) => {
    const amount = roundMoney(overrideMap.get(c.id) ?? c.default_amount);
    if (amount <= 0) return;
    lineItems.push({
      charge_head_id: c.id,
      description: c.name,
      quantity: 1,
      unit_price: amount,
      amount,
      is_taxable: c.is_taxable,
      meta: {},
      sort_order: 2 + i,
    });
  });

  const subtotal = roundMoney(lineItems.reduce((s, li) => s + li.amount, 0));

  // Tax (PRD 4.3 / 8): applies to rent, electricity, or all — respecting each
  // line's taxable flag when tax_applies_to is "all".
  let taxable = 0;
  if (settings.tax_enabled && settings.tax_percent && settings.tax_percent > 0) {
    const appliesTo = (settings.tax_applies_to || "all").toLowerCase();
    for (const li of lineItems) {
      const isRent = li.sort_order === 0;
      const isElec = li.description.startsWith("Electricity");
      if (
        appliesTo === "all" ? li.is_taxable : appliesTo === "rent" ? isRent : appliesTo === "electricity" ? isElec : false
      ) {
        taxable += li.amount;
      }
    }
  }
  const taxAmount = roundMoney((taxable * (settings.tax_percent || 0)) / 100);
  const total = roundMoney(subtotal + taxAmount);

  return { lineItems, subtotal, taxAmount, total, periodStart: monthStart, periodEnd: monthEnd };
}
