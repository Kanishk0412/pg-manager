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

    const invoice = await db.invoice.findFirst({
      where: { id, organization_id: session.organizationId, deleted_at: null },
      include: {
        tenant: true,
        room: true,
        bed: true,
        property: { include: { settings: true } },
        line_items: { orderBy: { sort_order: "asc" } },
        payments: { where: { deleted_at: null }, orderBy: { paid_at: "desc" } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: { message: "Invoice not found" } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { invoice } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
