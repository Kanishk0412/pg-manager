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
    const dateStr = searchParams.get("date");
    const propertyId = searchParams.get("propertyId");

    if (!dateStr) {
      return NextResponse.json({ success: false, error: { message: "date parameter is required (YYYY-MM-DD)" } }, { status: 400 });
    }

    const targetDate = new Date(dateStr + "T23:59:59.999Z");
    const scoped = new ScopedDb(session.organizationId);

    // Get property
    let targetPropertyId = propertyId;
    if (!targetPropertyId) {
      const properties = await scoped.getProperties();
      if (!properties.length) {
        return NextResponse.json({ success: true, data: { rooms: [], stats: {}, date: dateStr } });
      }
      targetPropertyId = properties[0].id;
    }

    // Get all rooms with beds
    const rooms = await db.room.findMany({
      where: {
        organization_id: session.organizationId,
        property_id: targetPropertyId!,
        deleted_at: null,
      },
      include: {
        beds: {
          where: { deleted_at: null },
        },
      },
      orderBy: [{ floor: "asc" }, { room_number: "asc" }],
    });

    // Get ALL allotments that could be relevant for this date
    // An allotment is relevant if: move_in_date <= targetDate AND (no move_out or move_out >= targetDate)
    const allotments = await db.allotment.findMany({
      where: {
        organization_id: session.organizationId,
        property_id: targetPropertyId!,
        deleted_at: null,
        status: { in: ["active", "reserved", "on_notice", "vacated"] },
        move_in_date: { lte: targetDate },
      },
      include: { tenant: true },
    });

    // Build a bed->allotment map for the target date
    const bedAllotmentMap = new Map<string, { status: string; tenant: any; allotment: any }>();

    for (const allotment of allotments) {
      const effectiveEnd = allotment.actual_move_out_date || allotment.expected_move_out_date;

      // Skip if allotment ended before target date
      if (effectiveEnd && effectiveEnd < new Date(dateStr + "T00:00:00.000Z")) continue;

      // Skip cancelled allotments
      if (allotment.status === "cancelled") continue;

      // For vacated allotments, only consider if move-out was on or after target date
      if (allotment.status === "vacated") {
        if (allotment.actual_move_out_date && allotment.actual_move_out_date < new Date(dateStr + "T00:00:00.000Z")) continue;
      }

      // Determine projected bed status
      const moveInDate = allotment.move_in_date;
      let projectedStatus = "occupied";

      if (allotment.status === "reserved" && moveInDate > new Date(dateStr + "T23:59:59.999Z")) {
        projectedStatus = "reserved"; // Still in the future
      } else if (allotment.status === "reserved" && moveInDate <= targetDate) {
        projectedStatus = "occupied"; // Would have been activated by then
      } else if (allotment.status === "on_notice") {
        projectedStatus = "occupied"; // Still occupied until actual move-out
      }

      bedAllotmentMap.set(allotment.bed_id, {
        status: projectedStatus,
        tenant: allotment.tenant,
        allotment,
      });
    }

    // Augment rooms with projected bed statuses
    const projectedRooms = rooms.map((room) => ({
      ...room,
      beds: room.beds.map((bed) => {
        const mapping = bedAllotmentMap.get(bed.id);
        return {
          ...bed,
          status: mapping ? mapping.status : "vacant",
          allotments: mapping
            ? [{ ...mapping.allotment, tenant: mapping.tenant }]
            : [],
        };
      }),
    }));

    // Compute stats
    let totalRooms = projectedRooms.length;
    let totalBeds = 0, occupiedBeds = 0, vacantBeds = 0, reservedBeds = 0, blockedBeds = 0;

    projectedRooms.forEach((room) => {
      room.beds.forEach((bed) => {
        totalBeds++;
        if (bed.status === "occupied") occupiedBeds++;
        else if (bed.status === "reserved") reservedBeds++;
        else if (bed.status === "blocked" || bed.status === "under_maintenance") blockedBeds++;
        else vacantBeds++;
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        rooms: projectedRooms,
        stats: {
          totalRooms,
          totalBeds,
          occupiedBeds,
          vacantBeds,
          reservedBeds,
          blockedBeds,
          occupancyPercent: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        },
        date: dateStr,
      },
    });
  } catch (error: any) {
    console.error("Availability error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
