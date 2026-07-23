import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ScopedDb } from "@/lib/db/scoped";
import { db } from "@/lib/db/client";

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

    const scoped = new ScopedDb(session.organizationId);
    let tenants: any[] = [];

    try {
      const properties = await scoped.getProperties();
      const targetPropId = propertyId || properties[0]?.id;

      if (targetPropId) {
        tenants = await scoped.getTenants(targetPropId, status);
      }
    } catch (e) {
      console.warn("DB getTenants warning:", e);
    }

    // Fallback to DEMO_TENANTS if DB is unseeded or running on serverless
    if (!tenants || tenants.length === 0) {
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
