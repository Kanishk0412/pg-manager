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

    const scoped = new ScopedDb(session.organizationId);

    let targetPropertyId = propertyId;
    let rooms: any[] = [];
    try {
      if (!targetPropertyId) {
        const properties = await scoped.getProperties();
        if (!properties.length) {
          return NextResponse.json({
            success: true,
            data: {
              rooms: [],
              stats: { totalRooms: 0, totalBeds: 0, occupiedBeds: 0, vacantBeds: 0, reservedBeds: 0, blockedBeds: 0, occupancyPercent: 0 }
            }
          });
        }
        targetPropertyId = properties[0].id;
      }
      rooms = await scoped.getRooms(targetPropertyId!);
    } catch (e) {
      console.warn("DB getRooms warning:", e);
      return NextResponse.json({
        success: true,
        data: {
          rooms: [],
          stats: { totalRooms: 0, totalBeds: 0, occupiedBeds: 0, vacantBeds: 0, reservedBeds: 0, blockedBeds: 0, occupancyPercent: 0 }
        }
      });
    }

    // Compute occupancy board stats
    let totalRooms = rooms.length;
    let totalBeds = 0;
    let occupiedBeds = 0;
    let vacantBeds = 0;
    let reservedBeds = 0;
    let blockedBeds = 0;

    rooms.forEach((room) => {
      room.beds.forEach((bed) => {
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
    console.error("Get rooms error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await request.json();
    const { action, propertyId, roomNumber, floor, sharingType, capacity, rent, meterNumber, amenities } = body;

    const scoped = new ScopedDb(session.organizationId);
    let targetPropId = propertyId;

    if (!targetPropId) {
      const props = await scoped.getProperties();
      targetPropId = props[0]?.id;
    }

    if (!targetPropId) {
      return NextResponse.json({ success: false, error: { message: "No property found" } }, { status: 400 });
    }

    // Single Room Add
    if (action === "create_single") {
      const existing = await db.room.findFirst({
        where: { organization_id: session.organizationId, property_id: targetPropId, room_number: roomNumber, deleted_at: null },
      });

      if (existing) {
        return NextResponse.json({ success: false, error: { message: `Room ${roomNumber} already exists in this property` } }, { status: 400 });
      }

      const room = await db.room.create({
        data: {
          organization_id: session.organizationId,
          property_id: targetPropId,
          room_number: roomNumber,
          floor: floor || "Ground",
          sharing_type: sharingType || "Single",
          capacity: capacity || 1,
          default_rent: rent || 0,
          meter_number: meterNumber || `MTR-${roomNumber}`,
          amenities: JSON.stringify(amenities || []),
        },
      });

      // Auto create beds A, B, C...
      const bedLabels = ["A", "B", "C", "D", "E", "F"];
      for (let i = 0; i < (capacity || 1); i++) {
        await db.bed.create({
          data: {
            organization_id: session.organizationId,
            room_id: room.id,
            bed_label: bedLabels[i],
            status: "vacant",
          },
        });
      }

      return NextResponse.json({ success: true, data: { room } });
    }

    // Bulk Generate Rooms
    if (action === "bulk_generate") {
      const { floors, roomsPerFloor, defaultSharing, defaultRent } = body;

      const createdRoomsCount = await db.$transaction(async (tx) => {
        let count = 0;
        const bedLabels = ["A", "B", "C", "D", "E", "F"];

        for (const f of floors) {
          const floorLabel = f.label; // e.g. Ground, 1st Floor
          const prefix = f.prefix; // e.g. G, 1, 2
          const cap = defaultSharing === "Single" ? 1 : defaultSharing === "Double" ? 2 : 3;

          for (let r = 1; r <= roomsPerFloor; r++) {
            const numStr = prefix === "G" ? `G${r.toString().padStart(2, "0")}` : `${prefix}${r.toString().padStart(2, "0")}`;

            // Check duplicate
            const exists = await tx.room.findFirst({
              where: { organization_id: session.organizationId, property_id: targetPropId, room_number: numStr, deleted_at: null },
            });
            if (exists) continue;

            const room = await tx.room.create({
              data: {
                organization_id: session.organizationId,
                property_id: targetPropId,
                room_number: numStr,
                floor: floorLabel,
                sharing_type: defaultSharing,
                capacity: cap,
                default_rent: defaultRent,
                meter_number: `MTR-${numStr}`,
              },
            });

            for (let b = 0; b < cap; b++) {
              await tx.bed.create({
                data: {
                  organization_id: session.organizationId,
                  room_id: room.id,
                  bed_label: bedLabels[b],
                  status: "vacant",
                },
              });
            }
            count++;
          }
        }
        return count;
      });

      return NextResponse.json({ success: true, data: { count: createdRoomsCount } });
    }

    return NextResponse.json({ success: false, error: { message: "Invalid action" } }, { status: 400 });
  } catch (error: any) {
    console.error("Room action error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
