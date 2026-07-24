import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }
    const { id } = await params;

    const payment = await db.payment.findFirst({
      where: { id, organization_id: session.organizationId, deleted_at: null },
      include: {
        tenant: true,
        property: { include: { settings: true } },
        invoice: { include: { room: true, bed: true } },
      },
    });

    if (!payment) {
      return NextResponse.json({ success: false, error: { message: "Payment not found" } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { payment } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
