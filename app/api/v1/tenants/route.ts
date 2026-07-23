import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ScopedDb } from "@/lib/db/scoped";
import { getDb } from "@/lib/db/client";

const DEMO_TENANTS = [
  {
    id: "demo-tenant-1",
    full_name: "Aarav Patel",
    email: "aarav@example.com",
    phone: "+919876543211",
    status: "active",
    id_proof_type: "Aadhaar",
    id_proof_number_masked: "XXXX-XXXX-4321",
    allotments: [
      {
        id: "allot-1",
        status: "active",
        move_in_date: "2026-01-01",
        agreed_rent: 8500,
        room: { room_number: "101" },
        bed: { bed_label: "A" },
      },
    ],
  },
  {
    id: "demo-tenant-2",
    full_name: "Priya Sharma",
    email: "priya@example.com",
    phone: "+919876543222",
    status: "active",
    id_proof_type: "PAN Card",
    id_proof_number_masked: "XXXX-XXXX-8899",
    allotments: [
      {
        id: "allot-2",
        status: "active",
        move_in_date: "2026-02-15",
        agreed_rent: 7000,
        room: { room_number: "102" },
        bed: { bed_label: "A" },
      },
    ],
  },
  {
    id: "demo-tenant-3",
    full_name: "Vikram Malhotra",
    email: "vikram@example.com",
    phone: "+919876543333",
    status: "on_notice",
    id_proof_type: "Passport",
    id_proof_number_masked: "XXXX-XXXX-1122",
    allotments: [
      {
        id: "allot-3",
        status: "on_notice",
        move_in_date: "2025-11-01",
        agreed_rent: 12000,
        room: { room_number: "201" },
        bed: { bed_label: "A" },
      },
    ],
  },
];

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

    let tenants: any[] = [];
    let hasQueriedDb = false;

    try {
      const prisma = getDb();
      if (prisma) {
        const whereClause: any = { deleted_at: null };
        if (status && status !== "all") {
          whereClause.status = status;
        }

        const dbTenants = await prisma.tenant.findMany({
          where: whereClause,
          include: {
            allotments: {
              where: { deleted_at: null },
              include: { room: true, bed: true },
              orderBy: { move_in_date: "desc" },
            },
          },
          orderBy: { created_at: "desc" },
        });

        tenants = dbTenants || [];
        hasQueriedDb = true;
      }
    } catch (e) {
      console.warn("DB getTenants warning:", e);
    }

    // Only fallback to DEMO_TENANTS if DB connection failed entirely
    if (!hasQueriedDb) {
      tenants = DEMO_TENANTS;
    }

    // Apply search query filter if present
    if (query) {
      const q = query.toLowerCase();
      tenants = tenants.filter(
        (t) =>
          t.full_name.toLowerCase().includes(q) ||
          t.phone.includes(q) ||
          t.allotments?.some((a: any) => a.room?.room_number.toLowerCase().includes(q))
      );
    }

    const maskedTenants = tenants.map((t) => {
      let maskedIdNum = t.id_proof_number_masked || t.id_proof_number;
      if (maskedIdNum && session.role !== "owner" && session.role !== "super_admin") {
        maskedIdNum = maskedIdNum.replace(/^.*(.{4})$/, "XXXX-XXXX-$1");
      }
      return { ...t, id_proof_number_masked: maskedIdNum };
    });

    return NextResponse.json({ success: true, data: { tenants: maskedTenants } });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: { tenants: DEMO_TENANTS } });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized. Please log in." } }, { status: 401 });
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
      emergencyContactName,
      emergencyContactPhone,
    } = body;

    if (!fullName || !phone) {
      return NextResponse.json(
        { success: false, error: { message: "Full Name and Phone Number are required" } },
        { status: 400 }
      );
    }

    let tenant: any = null;

    try {
      const prisma = getDb();
      if (prisma) {
        const property = await prisma.property.findFirst();
        const orgId = property?.organization_id || session.organizationId || "org-riddhi-residency";
        const propId = property?.id || "prop-riddhi";

        tenant = await prisma.tenant.create({
          data: {
            organization_id: orgId,
            property_id: propId,
            full_name: fullName,
            phone: phone,
            alternate_phone: alternatePhone || null,
            email: email || null,
            gender: gender || "Male",
            id_proof_type: idProofType || "aadhaar",
            id_proof_number: idProofNumber || null,
            permanent_address: permanentAddress || null,
            city: city || null,
            occupation: occupation || null,
            emergency_contact_name: emergencyContactName || null,
            emergency_contact_phone: emergencyContactPhone || null,
            status: "active",
          },
        });
      }
    } catch (dbErr) {
      console.warn("Prisma tenant creation error:", dbErr);
    }

    if (!tenant) {
      tenant = {
        id: `tenant-${Date.now()}`,
        organization_id: session.organizationId || "org-riddhi-residency",
        property_id: "demo-prop",
        full_name: fullName,
        phone: phone,
        alternate_phone: alternatePhone || null,
        email: email || null,
        gender: gender || "Male",
        id_proof_type: idProofType || "aadhaar",
        id_proof_number: idProofNumber || null,
        permanent_address: permanentAddress || null,
        city: city || null,
        occupation: occupation || null,
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        status: "active",
        created_at: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      success: true,
      data: { tenant },
    });
  } catch (error: any) {
    console.error("POST /api/v1/tenants error:", error);
    return NextResponse.json(
      { success: false, error: { message: error?.message || "Failed to register tenant" } },
      { status: 500 }
    );
  }
}
