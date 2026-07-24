import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSession } from "@/lib/auth/session";

/**
 * Daily job: mark past-due invoices overdue and apply a one-time late fee
 * (PRD 8.3). Same access model as the reservation job: Vercel Cron via
 * `Authorization: Bearer <CRON_SECRET>` (all orgs) or an authenticated user
 * scoped to their own org; otherwise 401.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  let organizationScope: string | null = null;
  if (!isCron) {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }
    organizationScope = session.organizationId;
  }

  try {
    const now = new Date();

    const candidates = await db.invoice.findMany({
      where: {
        deleted_at: null,
        status: { in: ["sent", "partially_paid"] },
        balance_due: { gt: 0 },
        ...(organizationScope ? { organization_id: organizationScope } : {}),
      },
      include: { property: { include: { settings: true } } },
    });

    let markedOverdue = 0;
    let lateFeesApplied = 0;

    for (const inv of candidates) {
      const settings = inv.property.settings;
      const graceDays = settings?.late_fee_grace_days ?? 0;
      const dueWithGrace = new Date(inv.due_date);
      dueWithGrace.setDate(dueWithGrace.getDate() + graceDays);
      if (now <= dueWithGrace) continue; // still within grace

      // Compute a one-time late fee if enabled and not already applied.
      let lateFee = 0;
      if (settings?.late_fee_enabled && inv.late_fee_amount === 0) {
        lateFee =
          settings.late_fee_type === "percent"
            ? Math.round(((inv.total_amount * (settings.late_fee_amount || 0)) / 100) * 100) / 100
            : settings.late_fee_amount || 0;
      }

      await db.$transaction(async (tx) => {
        if (lateFee > 0) {
          await tx.invoiceLineItem.create({
            data: {
              invoice_id: inv.id,
              charge_head_id: null,
              description: `Late fee (${settings!.late_fee_type === "percent" ? settings!.late_fee_amount + "%" : "flat"})`,
              quantity: 1,
              unit_price: lateFee,
              amount: lateFee,
              sort_order: 99,
            },
          });
        }
        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            status: "overdue",
            late_fee_amount: inv.late_fee_amount + lateFee,
            total_amount: Math.round((inv.total_amount + lateFee) * 100) / 100,
            balance_due: Math.round((inv.balance_due + lateFee) * 100) / 100,
          },
        });
      });

      markedOverdue++;
      if (lateFee > 0) lateFeesApplied++;
    }

    return NextResponse.json({
      success: true,
      data: {
        markedOverdue,
        lateFeesApplied,
        message: `Marked ${markedOverdue} invoices overdue, applied ${lateFeesApplied} late fees.`,
      },
    });
  } catch (error: any) {
    console.error("Mark overdue error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
