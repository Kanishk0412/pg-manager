import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await params;

    const allotment = await db.allotment.findFirst({
      where: { id, organization_id: session.organizationId, deleted_at: null },
      include: {
        tenant: true,
        room: true,
        bed: true,
        invoices: {
          where: { deleted_at: null },
          orderBy: { billing_month: "desc" },
        },
      },
    });

    if (!allotment) {
      return NextResponse.json({ success: false, error: { message: "Allotment not found" } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { allotment } });
  } catch (error: any) {
    console.error("Get allotment error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function PATCH(
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

    const allotment = await db.allotment.findFirst({
      where: { id, organization_id: session.organizationId, deleted_at: null },
    });

    if (!allotment) {
      return NextResponse.json({ success: false, error: { message: "Allotment not found" } }, { status: 404 });
    }

    const allowedFields: Record<string, any> = {};
    if (body.agreedRent !== undefined) allowedFields.agreed_rent = parseFloat(body.agreedRent);
    if (body.expectedMoveOutDate !== undefined) allowedFields.expected_move_out_date = body.expectedMoveOutDate ? new Date(body.expectedMoveOutDate) : null;
    if (body.notes !== undefined) allowedFields.notes = body.notes;
    if (body.securityDepositAmount !== undefined) allowedFields.security_deposit_amount = parseFloat(body.securityDepositAmount);
    if (body.securityDepositPaid !== undefined) allowedFields.security_deposit_paid = parseFloat(body.securityDepositPaid);

    const updated = await db.allotment.update({
      where: { id },
      data: allowedFields,
      include: { tenant: true, room: true, bed: true },
    });

    return NextResponse.json({ success: true, data: { allotment: updated } });
  } catch (error: any) {
    console.error("Update allotment error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
