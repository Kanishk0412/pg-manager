import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const property = await db.property.findFirst({
      where: { organization_id: session.organizationId, deleted_at: null },
      include: { settings: true, charge_heads: { where: { deleted_at: null }, orderBy: { sort_order: "asc" } } },
    });

    return NextResponse.json({ success: true, data: { property } });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: { property: null } });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await request.json();
    const { propertyId, name, legalName, code, brandColor, electricityRate, billDay, dueDay, lateFeeAmount, lateFeeGraceDays, floorLabels } = body;

    if (!propertyId) {
      return NextResponse.json({ success: false, error: { message: "Property ID required" } }, { status: 400 });
    }

    // Update Property branding
    const updatedProperty = await db.property.update({
      where: { id: propertyId },
      data: {
        name,
        legal_name: legalName,
        code,
        brand_color: brandColor,
      },
    });

    // Update Property Settings
    const settingsData: any = {
      electricity_rate_per_unit: parseFloat(electricityRate || 10),
      bill_generation_day: parseInt(billDay || 1, 10),
      payment_due_day: parseInt(dueDay || 5, 10),
      late_fee_amount: parseFloat(lateFeeAmount || 200),
      late_fee_grace_days: parseInt(lateFeeGraceDays || 5, 10),
    };

    if (floorLabels !== undefined) {
      settingsData.floor_labels = typeof floorLabels === "string" ? floorLabels : JSON.stringify(floorLabels);
    }

    await db.propertySettings.update({
      where: { property_id: propertyId },
      data: settingsData,
    });

    return NextResponse.json({ success: true, data: { property: updatedProperty } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
