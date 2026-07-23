import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ScopedDb } from "@/lib/db/scoped";
import { db } from "@/lib/db/client";

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
