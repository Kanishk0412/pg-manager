import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ScopedDb } from "@/lib/db/scoped";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const scoped = new ScopedDb(session.organizationId);
    const properties = await scoped.getProperties();
    if (properties.length === 0) {
      return NextResponse.json({ success: true, data: { invoices: [], stats: {} } });
    }
    let invoices = await scoped.getInvoices(properties[0].id);
    if (statusFilter && statusFilter !== "all") {
      invoices = invoices.filter((i: any) => i.status === statusFilter);
    }

    const stats = invoices.reduce(
      (acc: any, inv: any) => {
        acc.totalBilled += inv.total_amount;
        acc.totalCollected += inv.amount_paid;
        acc.totalOutstanding += inv.balance_due;
        if (inv.status === "overdue") acc.overdueCount++;
        return acc;
      },
      { totalBilled: 0, totalCollected: 0, totalOutstanding: 0, overdueCount: 0, count: invoices.length }
    );
    stats.totalBilled = Math.round(stats.totalBilled * 100) / 100;
    stats.totalCollected = Math.round(stats.totalCollected * 100) / 100;
    stats.totalOutstanding = Math.round(stats.totalOutstanding * 100) / 100;

    return NextResponse.json({ success: true, data: { invoices, stats } });
  } catch (error: any) {
    console.error("Invoices GET error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
