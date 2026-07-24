import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ScopedDb } from "@/lib/db/scoped";
import { db } from "@/lib/db/client";
import { buildInvoice, splitElectricity, type AllotmentInput, type SplitMode } from "@/lib/billing/engine";
import { reserveInvoiceNumber } from "@/lib/billing/invoiceNumber";

function monthStart(input: string | null | undefined): Date {
  const now = new Date();
  if (!input) return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [y, m] = String(input).split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, (m || 1) - 1, 1));
}

/**
 * Generate monthly invoices for every allotment that occupied a bed during the
 * billing month. `preview: true` computes without persisting; otherwise the
 * invoices + line items are written atomically with sequential numbering.
 * Idempotent: an allotment that already has a non-cancelled invoice for the
 * month is skipped (PRD 6.5).
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await request.json();
    const billingMonth = monthStart(body.month);
    const preview = body.preview !== false; // default to preview for safety

    const scoped = new ScopedDb(session.organizationId);
    const properties = await scoped.getProperties();
    if (properties.length === 0) {
      return NextResponse.json({ success: false, error: { message: "No property found." } }, { status: 400 });
    }
    const property: any = properties[0];
    const settings = property.settings;
    if (!settings) {
      return NextResponse.json({ success: false, error: { message: "Property settings are not configured." } }, { status: 400 });
    }
    const chargeHeads = (await scoped.getChargeHeads(property.id)).map((c: any) => ({
      id: c.id, name: c.name, code: c.code, type: c.type,
      default_amount: c.default_amount, applies_to: c.applies_to,
      is_taxable: c.is_taxable, is_active: c.is_active,
    }));
    const elecHead = chargeHeads.find((c) => c.code?.toLowerCase() === "electricity" || c.name?.toLowerCase() === "electricity");

    const monthEnd = new Date(Date.UTC(billingMonth.getUTCFullYear(), billingMonth.getUTCMonth() + 1, 0, 23, 59, 59));

    // Allotments that occupied a bed during any part of the month.
    const allotments = await db.allotment.findMany({
      where: {
        organization_id: session.organizationId,
        property_id: property.id,
        deleted_at: null,
        status: { in: ["active", "on_notice", "vacated"] },
        move_in_date: { lte: monthEnd },
        OR: [{ actual_move_out_date: null }, { actual_move_out_date: { gte: billingMonth } }],
      },
      include: { tenant: true, room: true, bed: true },
      orderBy: { move_in_date: "asc" },
    });

    // Existing invoices this month → idempotency skip set.
    const existing = await db.invoice.findMany({
      where: {
        organization_id: session.organizationId,
        property_id: property.id,
        billing_month: billingMonth,
        deleted_at: null,
        status: { not: "cancelled" },
      },
      select: { allotment_id: true },
    });
    const alreadyBilled = new Set(existing.map((e) => e.allotment_id));

    // Electricity per room split across that room's occupants.
    const readings = await db.meterReading.findMany({
      where: { organization_id: session.organizationId, property_id: property.id, billing_month: billingMonth, deleted_at: null },
    });
    const readingByRoom = new Map(readings.map((r) => [r.room_id, r]));

    const occupantsByRoom = new Map<string, AllotmentInput[]>();
    for (const a of allotments) {
      const arr = occupantsByRoom.get(a.room_id) || [];
      arr.push(a as unknown as AllotmentInput);
      occupantsByRoom.set(a.room_id, arr);
    }
    const electricityShare = new Map<string, { amount: number; units: number; note: string; chargeHeadId: string | null }>();
    for (const [roomId, occ] of occupantsByRoom) {
      const reading = readingByRoom.get(roomId);
      if (!reading || reading.amount <= 0) continue;
      const shares = splitElectricity(
        reading.amount,
        reading.units_consumed,
        occ,
        (settings.electricity_split_mode || "equal") as SplitMode,
        billingMonth,
        settings.prorate_partial_month
      );
      for (const [allotmentId, share] of shares) {
        electricityShare.set(allotmentId, {
          amount: share.amount, units: reading.units_consumed, note: share.note, chargeHeadId: elecHead?.id ?? null,
        });
      }
    }

    const dueDate = new Date(Date.UTC(billingMonth.getUTCFullYear(), billingMonth.getUTCMonth(), settings.payment_due_day || 5));

    const computed = allotments.map((a) => {
      const built = buildInvoice({
        allotment: a as unknown as AllotmentInput,
        billingMonth,
        settings,
        chargeHeads,
        electricity: electricityShare.get(a.id) ?? null,
      });
      return {
        allotment_id: a.id,
        tenant_id: a.tenant_id,
        tenant_name: a.tenant.full_name,
        room_id: a.room_id,
        room_number: a.room.room_number,
        bed_id: a.bed_id,
        bed_label: a.bed.bed_label,
        alreadyBilled: alreadyBilled.has(a.id),
        ...built,
      };
    });

    const toBill = computed.filter((c) => !c.alreadyBilled && c.total > 0);

    if (preview) {
      return NextResponse.json({
        success: true,
        data: {
          preview: true,
          month: billingMonth.toISOString(),
          dueDate: dueDate.toISOString(),
          missingMeterRooms: [...occupantsByRoom.keys()].filter((rid) => !readingByRoom.has(rid)).length,
          invoices: computed,
          summary: {
            eligible: toBill.length,
            skipped: computed.length - toBill.length,
            totalBilled: Math.round(toBill.reduce((s, c) => s + c.total, 0) * 100) / 100,
          },
        },
      });
    }

    // ---- Persist ----------------------------------------------------------
    let created = 0;
    const createdInvoices: string[] = [];
    for (const c of toBill) {
      const invoice = await db.$transaction(async (tx) => {
        const invoiceNumber = await reserveInvoiceNumber(tx, property.id, property.code, billingMonth);
        return tx.invoice.create({
          data: {
            organization_id: session.organizationId,
            property_id: property.id,
            invoice_number: invoiceNumber,
            tenant_id: c.tenant_id,
            allotment_id: c.allotment_id,
            room_id: c.room_id,
            bed_id: c.bed_id,
            billing_month: billingMonth,
            period_start: c.periodStart,
            period_end: c.periodEnd,
            due_date: dueDate,
            subtotal: c.subtotal,
            tax_amount: c.taxAmount,
            total_amount: c.total,
            balance_due: c.total,
            status: "sent",
            generated_by: "manual",
            line_items: {
              create: c.lineItems.map((li) => ({
                charge_head_id: li.charge_head_id,
                description: li.description,
                quantity: li.quantity,
                unit_price: li.unit_price,
                amount: li.amount,
                meta: li.meta ? JSON.stringify(li.meta) : null,
                sort_order: li.sort_order,
              })),
            },
          },
        });
      });
      created++;
      createdInvoices.push(invoice.invoice_number);
    }

    return NextResponse.json({
      success: true,
      data: { preview: false, created, invoiceNumbers: createdInvoices },
    });
  } catch (error: any) {
    console.error("Generate invoices error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
