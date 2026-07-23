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
    const noticeDate = body.noticeDate ? new Date(body.noticeDate) : new Date();

    // Get allotment with property settings for notice period
    const allotment = await db.allotment.findFirst({
      where: { id, organization_id: session.organizationId, deleted_at: null },
      include: {
        tenant: true,
        room: true,
        bed: true,
        property: { include: { settings: true } },
      },
    });

    if (!allotment) {
      return NextResponse.json({ success: false, error: { message: "Allotment not found" } }, { status: 404 });
    }

    if (allotment.status !== "active") {
      return NextResponse.json(
        { success: false, error: { message: `Cannot give notice on allotment with status "${allotment.status}". Only active allotments can receive notice.` } },
        { status: 400 }
      );
    }

    // Compute expected move-out date: notice_date + notice_period_days
    const noticePeriodDays = allotment.property.settings?.notice_period_days || 30;
    const expectedMoveOut = new Date(noticeDate);
    expectedMoveOut.setDate(expectedMoveOut.getDate() + noticePeriodDays);

    // Atomic update
    const updated = await db.$transaction(async (tx) => {
      const updatedAllotment = await tx.allotment.update({
        where: { id },
        data: {
          status: "on_notice",
          notice_given_date: noticeDate,
          expected_move_out_date: expectedMoveOut,
        },
        include: { tenant: true, room: true, bed: true },
      });

      // Update tenant status
      await tx.tenant.update({
        where: { id: allotment.tenant_id },
        data: { status: "on_notice" },
      });

      return updatedAllotment;
    });

    return NextResponse.json({
      success: true,
      data: {
        allotment: updated,
        noticePeriodDays,
        expectedMoveOutDate: expectedMoveOut.toISOString().split("T")[0],
      },
    });
  } catch (error: any) {
    console.error("Give notice error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
