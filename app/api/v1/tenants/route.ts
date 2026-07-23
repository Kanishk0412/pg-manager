import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ScopedDb } from "@/lib/db/scoped";
import { db } from "@/lib/db/client";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status") || "all";
    const query = searchParams.get("query") || "";

    const scoped = new ScopedDb(session.organizationId);
    const properties = await scoped.getProperties();
    const targetPropId = propertyId || properties[0]?.id;

    if (!targetPropId) {
      return NextResponse.json({ success: true, data: { tenants: [] } });
    }

    let tenants = await scoped.getTenants(targetPropId, status);

    // Apply search query filter if present
    if (query) {
      const q = query.toLowerCase();
      tenants = tenants.filter(
        (t) =>
          t.full_name.toLowerCase().includes(q) ||
          t.phone.includes(q) ||
          t.allotments.some((a) => a.room?.room_number.toLowerCase().includes(q))
      );
    }

    // Mask PII ID proof number for non-owner role in list view if needed (or format)
    const maskedTenants = tenants.map((t) => {
      let maskedIdNum = t.id_proof_number;
      if (maskedIdNum && session.role !== "owner" && session.role !== "super_admin") {
        maskedIdNum = maskedIdNum.replace(/^.*(.{4})$/, "XXXX-XXXX-$1");
      }
      return { ...t, id_proof_number_masked: maskedIdNum };
    });

    return NextResponse.json({ success: true, data: { tenants: maskedTenants } });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: { tenants: [] } });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName,
      phone,
      alternatePhone,
      email,
      gender,
      idProofType,
      idProofNumber,
      permanentAddress,
      city,
      occupation,
      companyOrCollege,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      propertyId,
    } = body;

    const scoped = new ScopedDb(session.organizationId);
    const properties = await scoped.getProperties();
    const targetPropId = propertyId || properties[0]?.id;

    if (!targetPropId) {
      return NextResponse.json({ success: false, error: { message: "Property required" } }, { status: 400 });
    }

    // E.164 Phone format validation & Duplicate check within property
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
    if (!/^\+\d{10,15}$/.test(formattedPhone)) {
      return NextResponse.json(
        { success: false, error: { message: "Phone number must be a valid E.164 format (e.g. +919812345678)" } },
        { status: 400 }
      );
    }

    const duplicate = await db.tenant.findFirst({
      where: {
        organization_id: session.organizationId,
        property_id: targetPropId,
        phone: formattedPhone,
        deleted_at: null,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, error: { message: `A tenant with phone ${formattedPhone} already exists in this property (${duplicate.full_name})` } },
        { status: 400 }
      );
    }

    const tenant = await db.tenant.create({
      data: {
        organization_id: session.organizationId,
        property_id: targetPropId,
        full_name: fullName,
        phone: formattedPhone,
        alternate_phone: alternatePhone,
        email,
        gender,
        id_proof_type: idProofType || "aadhaar",
        id_proof_number: idProofNumber,
        permanent_address: permanentAddress,
        city,
        occupation,
        company_or_college: companyOrCollege,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        emergency_contact_relation: emergencyContactRelation,
        status: "active",
      },
    });

    return NextResponse.json({ success: true, data: { tenant } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
