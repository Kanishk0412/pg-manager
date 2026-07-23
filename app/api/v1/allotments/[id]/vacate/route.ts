import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const moveOutDate = body.moveOutDate ? new Date(body.moveOutDate) : new Date();
    const deductions = parseFloat(body.deductions || "0");
    const deductionNotes = body.deductionNotes || "";

    // Get allotment with full details
    const allotment = await db.allotment.findFirst({
      where: { id, organization_id: session.organizationId, deleted_at: null },
      include: {
        tenant: true,
        room: true,
        bed: true,
        property: { include: { settings: true } },
        invoices: { where: { deleted_at: null } },
      },
    });

    if (!allotment) {
      return NextResponse.json({ success: false, error: { message: "Allotment not found" } }, { status: 404 });
    }

    if (!["active", "on_notice", "reserved"].includes(allotment.status)) {
      return NextResponse.json(
        { success: false, error: { message: `Cannot vacate allotment with status "${allotment.status}".` } },
        { status: 400 }
      );
    }

    // Compute final settlement
    const settings = allotment.property.settings;
    const moveIn = allotment.move_in_date;

    // Pro-rated rent for partial month
    const monthStart = new Date(moveOutDate.getFullYear(), moveOutDate.getMonth(), 1);
    const monthEnd = new Date(moveOutDate.getFullYear(), moveOutDate.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();
    const occupiedDays = Math.max(1, Math.min(
      moveOutDate.getDate(),
      Math.ceil((moveOutDate.getTime() - Math.max(moveIn.getTime(), monthStart.getTime())) / (1000 * 60 * 60 * 24)) + 1
    ));
    const proRatedRent = settings?.prorate_partial_month
      ? Math.round((allotment.agreed_rent * occupiedDays / daysInMonth) * 100) / 100
      : allotment.agreed_rent;

    // Outstanding dues from unpaid invoices
    const outstandingDues = allotment.invoices
      .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
      .reduce((sum, inv) => sum + inv.balance_due, 0);

    // Security deposit calculation
    const securityDeposit = allotment.security_deposit_paid;
    const depositRefundable = Math.max(0, securityDeposit - deductions);
    const totalDues = outstandingDues + proRatedRent;
    const netPayableByTenant = Math.max(0, totalDues - depositRefundable);
    const netRefundable = Math.max(0, depositRefundable - totalDues);

    const settlement = {
      proRatedRent,
      occupiedDays,
      daysInMonth,
      outstandingDues,
      securityDepositPaid: securityDeposit,
      deductions,
      deductionNotes,
      depositRefundable,
      totalDues,
      netPayableByTenant,
      netRefundable,
    };

    // Atomic vacate transaction
    const updated = await db.$transaction(async (tx) => {
      const updatedAllotment = await tx.allotment.update({
        where: { id },
        data: {
          status: "vacated",
          actual_move_out_date: moveOutDate,
          security_deposit_deductions: deductions,
          security_deposit_refunded: depositRefundable,
        },
        include: { tenant: true, room: true, bed: true },
      });

      // Free the bed
      await tx.bed.update({
        where: { id: allotment.bed_id },
        data: { status: "vacant", current_allotment_id: null },
      });

      // Check if tenant has any other active allotments
      const otherActive = await tx.allotment.findFirst({
        where: {
          tenant_id: allotment.tenant_id,
          status: { in: ["active", "on_notice"] },
          id: { not: id },
          deleted_at: null,
        },
      });

      if (!otherActive) {
        await tx.tenant.update({
          where: { id: allotment.tenant_id },
          data: { status: "vacated" },
        });
      }

      return updatedAllotment;
    });

    return NextResponse.json({
      success: true,
      data: { allotment: updated, settlement },
    });
  } catch (error: any) {
    console.error("Vacate error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
