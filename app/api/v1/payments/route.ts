import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ScopedDb } from "@/lib/db/scoped";
import { db } from "@/lib/db/client";
import { reserveReceiptNumber } from "@/lib/billing/receiptNumber";

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }
    const scoped = new ScopedDb(session.organizationId);
    const properties = await scoped.getProperties();
    if (properties.length === 0) {
      return NextResponse.json({ success: true, data: { payments: [], stats: {} } });
    }
    const payments = await scoped.getPayments(properties[0].id);
    const collected = payments
      .filter((p: any) => p.status === "recorded")
      .reduce((s: number, p: any) => s + p.amount, 0);

    return NextResponse.json({
      success: true,
      data: { payments, stats: { count: payments.length, totalCollected: round(collected) } },
    });
  } catch (error: any) {
    console.error("Payments GET error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

/**
 * Record a payment. May be tied to an invoice (updates its balance/status,
 * supporting partial payments and overpayment) or stand alone (advance/credit).
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }
    const body = await request.json();
    const amount = parseFloat(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: { message: "A positive payment amount is required." } }, { status: 400 });
    }

    const scoped = new ScopedDb(session.organizationId);
    const properties = await scoped.getProperties();
    if (properties.length === 0) {
      return NextResponse.json({ success: false, error: { message: "No property found." } }, { status: 400 });
    }
    const property: any = properties[0];

    // Resolve invoice + tenant (invoice is optional for advances).
    let invoice: any = null;
    let tenantId: string | null = body.tenantId || null;
    if (body.invoiceId) {
      invoice = await db.invoice.findFirst({
        where: { id: body.invoiceId, organization_id: session.organizationId, deleted_at: null },
      });
      if (!invoice) {
        return NextResponse.json({ success: false, error: { message: "Invoice not found." } }, { status: 404 });
      }
      if (invoice.status === "cancelled") {
        return NextResponse.json({ success: false, error: { message: "Cannot pay a cancelled invoice." } }, { status: 400 });
      }
      tenantId = invoice.tenant_id;
    }
    if (!tenantId) {
      return NextResponse.json({ success: false, error: { message: "Tenant or invoice is required." } }, { status: 400 });
    }

    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();

    const result = await db.$transaction(async (tx) => {
      const receiptNumber = await reserveReceiptNumber(tx, property.id, property.code, paidAt);

      const payment = await tx.payment.create({
        data: {
          organization_id: session.organizationId,
          property_id: property.id,
          receipt_number: receiptNumber,
          tenant_id: tenantId!,
          invoice_id: invoice?.id ?? null,
          amount: round(amount),
          payment_method: body.method || "cash",
          reference_number: body.reference || null,
          paid_at: paidAt,
          recorded_by_user_id: session.userId,
          notes: body.notes || null,
        },
      });

      let overpayment = 0;
      if (invoice) {
        const newPaid = round(invoice.amount_paid + amount);
        const newBalance = round(invoice.total_amount - newPaid);
        overpayment = newBalance < 0 ? round(-newBalance) : 0;
        const status = newBalance <= 0 ? "paid" : "partially_paid";
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            amount_paid: newPaid,
            balance_due: Math.max(0, newBalance),
            status,
          },
        });
      }

      return { payment, overpayment };
    });

    return NextResponse.json({
      success: true,
      data: {
        payment: result.payment,
        receiptNumber: result.payment.receipt_number,
        overpaymentCredit: result.overpayment,
      },
    });
  } catch (error: any) {
    console.error("Record payment error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
