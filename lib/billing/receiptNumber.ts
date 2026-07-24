import type { Prisma } from "@prisma/client";

/**
 * Reserve the next receipt number for a property, atomically.
 * Must run inside a Prisma transaction so the counter increment commits with
 * the payment insert (mirrors invoice numbering — PRD 6.6).
 *
 * Format: {prefix}-{PROPERTY_CODE}-{YYYYMM}-{0001}
 */
export async function reserveReceiptNumber(
  tx: Prisma.TransactionClient,
  propertyId: string,
  propertyCode: string,
  when: Date
): Promise<string> {
  const settings = await tx.propertySettings.update({
    where: { property_id: propertyId },
    data: { receipt_next_number: { increment: 1 } },
    select: { receipt_next_number: true, receipt_prefix: true },
  });

  const seq = settings.receipt_next_number - 1;
  const prefix = settings.receipt_prefix || "RCP";
  const ym = `${when.getUTCFullYear()}${String(when.getUTCMonth() + 1).padStart(2, "0")}`;
  const code = (propertyCode || "PG").toUpperCase();
  return `${prefix}-${code}-${ym}-${String(seq).padStart(4, "0")}`;
}
