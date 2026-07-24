import type { Prisma } from "@prisma/client";

/**
 * Reserve the next invoice number for a property, atomically.
 *
 * Must be called inside a Prisma transaction (`tx`) so the counter increment
 * and the invoice insert commit together — this is what prevents two
 * concurrent generations from minting the same number (PRD 6.5).
 *
 * Format: {prefix}-{PROPERTY_CODE}-{YYYYMM}-{0001}
 */
export async function reserveInvoiceNumber(
  tx: Prisma.TransactionClient,
  propertyId: string,
  propertyCode: string,
  billingMonth: Date
): Promise<string> {
  // `increment` returns the row with the already-incremented value, so the
  // sequence number we actually consumed is (new value - 1).
  const settings = await tx.propertySettings.update({
    where: { property_id: propertyId },
    data: { invoice_next_number: { increment: 1 } },
    select: { invoice_next_number: true, invoice_prefix: true },
  });

  const seq = settings.invoice_next_number - 1;
  const prefix = settings.invoice_prefix || "INV";
  const ym = `${billingMonth.getUTCFullYear()}${String(billingMonth.getUTCMonth() + 1).padStart(2, "0")}`;
  const code = (propertyCode || "PG").toUpperCase();
  return `${prefix}-${code}-${ym}-${String(seq).padStart(4, "0")}`;
}
