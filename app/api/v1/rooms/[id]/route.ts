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

    const room = await db.room.findFirst({
      where: { id, organization_id: session.organizationId, deleted_at: null },
      include: {
        beds: {
          where: { deleted_at: null },
          include: {
            allotments: {
              where: { status: { in: ["active", "reserved", "on_notice"] }, deleted_at: null },
              include: { tenant: true },
            },
          },
        },
        meter_readings: {
          orderBy: { billing_month: "desc" },
          take: 6,
        },
      },
    });

    if (!room) {
      return NextResponse.json({ success: false, error: { message: "Room not found" } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { room } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { action, capacity, sharingType, is_active } = body;

    const room = await db.room.findFirst({
      where: { id, organization_id: session.organizationId, deleted_at: null },
      include: {
        beds: {
          where: { deleted_at: null },
          include: {
            allotments: {
              where: { status: { in: ["active", "reserved"] }, deleted_at: null },
              include: { tenant: true },
            },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ success: false, error: { message: "Room not found" } }, { status: 404 });
    }

    // 1. Deactivation check
    if (is_active === false || action === "deactivate") {
      const activeOrReservedBeds = room.beds.filter((b) => b.status === "occupied" || b.status === "reserved");
      if (activeOrReservedBeds.length > 0) {
        const tenantNames = activeOrReservedBeds
          .map((b) => b.allotments[0]?.tenant?.full_name || "Unknown")
          .filter(Boolean)
          .join(", ");

        return NextResponse.json(
          {
            success: false,
            error: {
              code: "ROOM_HAS_OCCUPANTS",
              message: `Cannot deactivate Room ${room.room_number}: Room currently has active/reserved beds occupied by ${tenantNames}.`,
              field: "is_active",
            },
          },
          { status: 400 }
        );
      }

      await db.room.update({
        where: { id: room.id },
        data: { is_active: false },
      });
      return NextResponse.json({ success: true, message: `Room ${room.room_number} deactivated successfully` });
    }

    // 2. Capacity adjustment check
    if (action === "update_capacity" && capacity) {
      const newCapacity = parseInt(capacity, 10);
      const currentCapacity = room.beds.length;

      if (newCapacity === currentCapacity) {
        return NextResponse.json({ success: true, data: { room } });
      }

      const bedLabels = ["A", "B", "C", "D", "E", "F", "G", "H"];

      if (newCapacity > currentCapacity) {
        // Add beds
        for (let i = currentCapacity; i < newCapacity; i++) {
          await db.bed.create({
            data: {
              organization_id: session.organizationId,
              room_id: room.id,
              bed_label: bedLabels[i],
              status: "vacant",
            },
          });
        }
      } else {
        // Decrease capacity: Check beds to be removed from the tail
        const bedsToRemove = room.beds.slice(newCapacity);
        const occupiedToRemove = bedsToRemove.filter((b) => b.status === "occupied" || b.status === "reserved");

        if (occupiedToRemove.length > 0) {
          const conflictBed = occupiedToRemove[0];
          const tenantName = conflictBed.allotments[0]?.tenant?.full_name || "a tenant";
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "BED_OCCUPIED",
                message: `Cannot reduce capacity of Room ${room.room_number}: Bed ${room.room_number}-${conflictBed.bed_label} is currently ${conflictBed.status} by ${tenantName}.`,
                field: "capacity",
              },
            },
            { status: 400 }
          );
        }

        // Soft delete vacant beds to be removed
        for (const b of bedsToRemove) {
          await db.bed.update({
            where: { id: b.id },
            data: { deleted_at: new Date(), is_active: false },
          });
        }
      }

      // Update room capacity & sharing type
      const updatedRoom = await db.room.update({
        where: { id: room.id },
        data: {
          capacity: newCapacity,
          sharing_type: sharingType || (newCapacity === 1 ? "Single" : newCapacity === 2 ? "Double" : "Triple"),
        },
        include: { beds: { where: { deleted_at: null } } },
      });

      return NextResponse.json({ success: true, data: { room: updatedRoom } });
    }

    return NextResponse.json({ success: false, error: { message: "No valid action provided" } }, { status: 400 });
  } catch (error: any) {
    console.error("Update room error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
