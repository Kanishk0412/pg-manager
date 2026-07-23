import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await request.json();
    const { action, chargeHeadId, propertyId, name, code, type, defaultAmount, appliesTo, isActive } = body;

    // Toggle active state
    if (action === "toggle_active" && chargeHeadId) {
      const head = await db.chargeHead.update({
        where: { id: chargeHeadId },
        data: { is_active: isActive },
      });
      return NextResponse.json({ success: true, data: { chargeHead: head } });
    }

    // Create custom charge head
    if (action === "create" && propertyId && name) {
      const head = await db.chargeHead.create({
        data: {
          organization_id: session.organizationId,
          property_id: propertyId,
          name,
          code: code || name.toUpperCase().replace(/\s+/g, "_"),
          type: type || "recurring_monthly",
          default_amount: parseFloat(defaultAmount || 0),
          applies_to: appliesTo || "per_tenant",
          is_system: false,
          is_active: true,
        },
      });
      return NextResponse.json({ success: true, data: { chargeHead: head } });
    }

    return NextResponse.json({ success: false, error: { message: "Invalid action" } }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
