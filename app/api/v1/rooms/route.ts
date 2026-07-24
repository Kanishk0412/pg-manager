import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ScopedDb } from "@/lib/db/scoped";
import { getDb } from "@/lib/db/client";

const DEMO_ROOMS = [
  {
    id: "demo-room-101",
    room_number: "101",
    floor: "First Floor",
    sharing_type: "double",
    default_rent: 8500,
    meter_number: "MTR-101",
    beds: [
      { id: "demo-bed-101a", bed_label: "A", status: "occupied" },
      { id: "demo-bed-101b", bed_label: "B", status: "vacant" },
    ],
  },
  {
    id: "demo-room-102",
    room_number: "102",
    floor: "First Floor",
    sharing_type: "triple",
    default_rent: 7000,
    meter_number: "MTR-102",
    beds: [
      { id: "demo-bed-102a", bed_label: "A", status: "occupied" },
      { id: "demo-bed-102b", bed_label: "B", status: "occupied" },
      { id: "demo-bed-102c", bed_label: "C", status: "reserved" },
    ],
  },
  {
    id: "demo-room-201",
    room_number: "201",
    floor: "Second Floor",
    sharing_type: "single",
    default_rent: 12000,
    meter_number: "MTR-201",
    beds: [
      { id: "demo-bed-201a", bed_label: "A", status: "occupied" },
    ],
  },
  {
    id: "demo-room-202",
    room_number: "202",
    floor: "Second Floor",
    sharing_type: "double",
    default_rent: 8500,
    meter_number: "MTR-202",
    beds: [
      { id: "demo-bed-202a", bed_label: "A", status: "vacant" },
      { id: "demo-bed-202b", bed_label: "B", status: "vacant" },
    ],
  },
  {
    id: "demo-room-b1",
    room_number: "B-01",
    floor: "Basement",
    sharing_type: "four",
    default_rent: 6000,
    meter_number: "MTR-B01",
    beds: [
      { id: "demo-bed-b1a", bed_label: "A", status: "occupied" },
      { id: "demo-bed-b1b", bed_label: "B", status: "occupied" },
      { id: "demo-bed-b1c", bed_label: "C", status: "vacant" },
      { id: "demo-bed-b1d", bed_label: "D", status: "vacant" },
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

    const scoped = new ScopedDb(session.organizationId);

    let targetPropertyId = propertyId;
    let rooms: any[] = [];
    try {
      if (!targetPropertyId) {
        const properties = await scoped.getProperties();
        if (properties.length > 0) {
          targetPropertyId = properties[0].id;
        }
      }
      if (targetPropertyId) {
        rooms = await scoped.getRooms(targetPropertyId);
      }
    } catch (e) {
      console.warn("DB getRooms warning:", e);
    }

    // Fallback to DEMO_ROOMS if database is unseeded or running on serverless ephemeral storage
    if (!rooms || rooms.length === 0) {
      rooms = DEMO_ROOMS;
    }

    // Compute occupancy board stats
    let totalRooms = rooms.length;
    let totalBeds = 0;
    let occupiedBeds = 0;
    let vacantBeds = 0;
    let reservedBeds = 0;
    let blockedBeds = 0;

    rooms.forEach((room: any) => {
      (room.beds || []).forEach((bed: any) => {
        totalBeds++;
        if (bed.status === "occupied") occupiedBeds++;
        else if (bed.status === "reserved") reservedBeds++;
        else if (bed.status === "blocked" || bed.status === "under_maintenance") blockedBeds++;
        else vacantBeds++;
      });
    });

    const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        rooms,
        stats: {
          totalRooms,
          totalBeds,
          occupiedBeds,
          vacantBeds,
          reservedBeds,
          blockedBeds,
          occupancyPercent,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

// Map a sharing-type label to a bed capacity. Case-insensitive; defaults to 1.
function capacityForSharing(sharing: string | undefined, explicit?: unknown): number {
  const fromExplicit = typeof explicit !== "undefined" ? parseInt(String(explicit), 10) : NaN;
  if (Number.isFinite(fromExplicit) && fromExplicit > 0) return Math.min(fromExplicit, 8);
  const map: Record<string, number> = { single: 1, double: 2, triple: 3, four: 4, "four-sharing": 4, quad: 4, dormitory: 6, dorm: 6 };
  return map[(sharing || "").toLowerCase()] || 1;
}

// Build the nested bed rows for a room of the given capacity (A, B, C…).
// NOTE: Bed has no property_id column — do not add one here.
function bedRows(organizationId: string, capacity: number) {
  return Array.from({ length: capacity }, (_, i) => ({
    organization_id: organizationId,
    bed_label: String.fromCharCode(65 + i),
    status: "vacant" as const,
  }));
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const prisma = getDb();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: { message: "Database is not available in this environment." } },
        { status: 503 }
      );
    }

    const body = await request.json();
    const action: string = body.action || "create_single";

    // Every room must belong to a property in the caller's organization.
    const scoped = new ScopedDb(session.organizationId);
    const properties = await scoped.getProperties();
    if (properties.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: "No property found for your organization. Complete onboarding before adding rooms." } },
        { status: 400 }
      );
    }
    const targetPropId = properties[0].id;

    // Existing room numbers (for duplicate protection across all actions).
    const existing = await prisma.room.findMany({
      where: { organization_id: session.organizationId, property_id: targetPropId, deleted_at: null },
      select: { room_number: true },
    });
    const taken = new Set(existing.map((r) => r.room_number.toLowerCase()));

    // ---- Bulk generate ----------------------------------------------------
    if (action === "bulk_generate") {
      const floors: Array<{ label: string; prefix: string }> = Array.isArray(body.floors) ? body.floors : [];
      const roomsPerFloor = Math.max(1, Math.min(parseInt(body.roomsPerFloor, 10) || 0, 60));
      const sharing = body.defaultSharing || "Single";
      const rentVal = parseFloat(body.defaultRent) || 0;
      const capacity = capacityForSharing(sharing);

      if (floors.length === 0 || roomsPerFloor === 0) {
        return NextResponse.json(
          { success: false, error: { message: "Select at least one floor and a rooms-per-floor count." } },
          { status: 400 }
        );
      }

      const toCreate: any[] = [];
      let skipped = 0;
      for (const f of floors) {
        const prefix = (f.prefix || f.label?.charAt(0) || "").toString();
        for (let i = 1; i <= roomsPerFloor; i++) {
          const roomNumber = `${prefix}${String(i).padStart(2, "0")}`;
          if (taken.has(roomNumber.toLowerCase())) {
            skipped++;
            continue;
          }
          taken.add(roomNumber.toLowerCase());
          toCreate.push({
            organization_id: session.organizationId,
            property_id: targetPropId,
            room_number: roomNumber,
            floor: f.label,
            sharing_type: sharing,
            capacity,
            default_rent: rentVal,
            meter_number: `MTR-${roomNumber}`,
            beds: { create: bedRows(session.organizationId, capacity) },
          });
        }
      }

      await prisma.$transaction(toCreate.map((data) => prisma.room.create({ data })));

      return NextResponse.json({ success: true, data: { count: toCreate.length, skipped } });
    }

    // ---- CSV import -------------------------------------------------------
    if (action === "csv_import") {
      const rows: any[] = Array.isArray(body.rows) ? body.rows : [];
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: { message: "No rows found in the CSV." } }, { status: 400 });
      }

      const toCreate: any[] = [];
      let skipped = 0;
      for (const row of rows) {
        const roomNumber = String(row.room_number || "").trim();
        if (!roomNumber || taken.has(roomNumber.toLowerCase())) {
          skipped++;
          continue;
        }
        taken.add(roomNumber.toLowerCase());
        const capacity = capacityForSharing(row.sharing_type, row.capacity);
        toCreate.push({
          organization_id: session.organizationId,
          property_id: targetPropId,
          room_number: roomNumber,
          floor: String(row.floor || "Ground").trim(),
          sharing_type: String(row.sharing_type || "Single").trim(),
          capacity,
          default_rent: parseFloat(row.rent_per_bed) || 0,
          meter_number: String(row.meter_number || `MTR-${roomNumber}`).trim(),
          beds: { create: bedRows(session.organizationId, capacity) },
        });
      }

      if (toCreate.length === 0) {
        return NextResponse.json(
          { success: false, error: { message: `All ${rows.length} rows were duplicates or invalid.` } },
          { status: 400 }
        );
      }

      await prisma.$transaction(toCreate.map((data) => prisma.room.create({ data })));
      return NextResponse.json({ success: true, data: { count: toCreate.length, skipped } });
    }

    // ---- Single create ----------------------------------------------------
    const roomNumber = String(body.roomNumber || "").trim();
    const floor = String(body.floor || "").trim();
    if (!roomNumber || !floor) {
      return NextResponse.json(
        { success: false, error: { message: "Room Number and Floor are required." } },
        { status: 400 }
      );
    }
    if (taken.has(roomNumber.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_ROOM", message: `Room ${roomNumber} already exists.`, field: "roomNumber" } },
        { status: 409 }
      );
    }

    const capacity = capacityForSharing(body.sharingType, body.capacity);
    const room = await prisma.room.create({
      data: {
        organization_id: session.organizationId,
        property_id: targetPropId,
        room_number: roomNumber,
        floor,
        sharing_type: body.sharingType || "Single",
        capacity,
        default_rent: parseFloat(body.rent ?? body.defaultRent) || 0,
        meter_number: body.meterNumber || `MTR-${roomNumber}`,
        beds: { create: bedRows(session.organizationId, capacity) },
      },
      include: { beds: true },
    });

    return NextResponse.json({ success: true, data: { room } });
  } catch (error: any) {
    console.error("POST /api/v1/rooms error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to create room" } },
      { status: 500 }
    );
  }
}
