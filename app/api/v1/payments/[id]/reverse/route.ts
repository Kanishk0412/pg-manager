import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Reverse a recorded payment (PRD 6.6). Reason is mandatory. The linked
 * invoice's paid amount / balance / status are rolled back, and the action is
 * written to the audit log. Financial records are never hard-deleted (8.7).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const reason = String(body.reason || "").trim();
    if (!reason) {
      return NextResponse.json(
        { success: false, error: { code: "REASON_REQUIRED", message: "A reversal reason is required.", field: "reason" } },
        { status: 400 }
      );
    }

    const payment = await db.payment.findFirst({
      where: { id, organization_id: session.organizationId, deleted_at: null },
      include: { invoice: true },
    });
    if (!payment) {
      return NextResponse.json({ success: false, error: { message: "Payment not found" } }, { status: 404 });
    }
    if (payment.status === "reversed") {
      return NextResponse.json({ success: false, error: { message: "Payment is already reversed." } }, { status: 400 });
    }

    const updated = await db.$transaction(async (tx) => {
      const before = { status: payment.status, invoice_status: payment.invoice?.status, balance_due: payment.invoice?.balance_due };

      const rev = await tx.payment.update({
        where: { id: payment.id },
        data: { status: "reversed", reversal_reason: reason },
      });

      if (payment.invoice) {
        const newPaid = round(payment.invoice.amount_paid - payment.amount);
        const newBalance = round(payment.invoice.total_amount - newPaid);
        const status = newBalance <= 0 ? "paid" : newPaid > 0 ? "partially_paid" : "sent";
        await tx.invoice.update({
          where: { id: payment.invoice.id },
          data: { amount_paid: Math.max(0, newPaid), balance_due: Math.max(0, newBalance), status },
        });
      }

      await tx.auditLog.create({
        data: {
          organization_id: session.organizationId,
          user_id: session.userId,
          action: "payment.reverse",
          entity_type: "payment",
          entity_id: payment.id,
          before: JSON.stringify(before),
          after: JSON.stringify({ status: "reversed", reason }),
        },
      });

      return rev;
    });

    return NextResponse.json({ success: true, data: { payment: updated } });
  } catch (error: any) {
    console.error("Reverse payment error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
