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
    const { tenantId, roomId, bedId, moveInDate, agreedRent, securityDeposit, expectedMoveOutDate, bookingAdvance } = body;

    if (!tenantId || !roomId || !bedId || !moveInDate) {
      return NextResponse.json({ success: false, error: { message: "Tenant, Room, Bed, and Move-in Date are required" } }, { status: 400 });
    }

    // Verify bed exists and belongs to org
    const bed = await db.bed.findFirst({
      where: { id: bedId, organization_id: session.organizationId, deleted_at: null },
      include: { room: true },
    });

    if (!bed) {
      return NextResponse.json({ success: false, error: { message: "Bed not found" } }, { status: 404 });
    }

    const moveIn = new Date(moveInDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFutureBooking = moveIn > today;

    // Overlap validation: Check for any active/reserved allotments on this bed
    // that overlap with the requested period
    const moveOut = expectedMoveOutDate ? new Date(expectedMoveOutDate) : null;
    const overlappingAllotment = await db.allotment.findFirst({
      where: {
        bed_id: bedId,
        status: { in: ["active", "reserved", "on_notice"] },
        deleted_at: null,
        // Overlap condition: existing.move_in <= requested.move_out AND existing.expected_move_out >= requested.move_in
        // If no expected_move_out, treat as open-ended (always overlaps with future)
        move_in_date: moveOut ? { lte: moveOut } : undefined,
      },
      include: { tenant: true },
    });

    if (overlappingAllotment) {
      // Additional check: if the overlapping allotment has an expected_move_out and it's before our move_in, no overlap
      const existingEnd = overlappingAllotment.expected_move_out_date || overlappingAllotment.actual_move_out_date;
      const hasRealOverlap = !existingEnd || existingEnd >= moveIn;

      if (hasRealOverlap) {
        const tenantName = overlappingAllotment.tenant?.full_name || "another tenant";
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "BOOKING_OVERLAP",
              message: `Bed ${bed.room.room_number}-${bed.bed_label} has an overlapping ${overlappingAllotment.status} booking by ${tenantName} (${overlappingAllotment.move_in_date.toISOString().split("T")[0]} → ${existingEnd ? existingEnd.toISOString().split("T")[0] : "open-ended"})`,
              field: "bed_id",
            },
          },
          { status: 400 }
        );
      }
    }

    // For immediate bookings, also check bed status
    if (!isFutureBooking && bed.status !== "vacant") {
      const activeAllotment = await db.allotment.findFirst({
        where: { bed_id: bed.id, status: "active", deleted_at: null },
        include: { tenant: true },
      });
      const tenantName = activeAllotment?.tenant?.full_name || "another tenant";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BED_ALREADY_OCCUPIED",
            message: `Bed ${bed.room.room_number}-${bed.bed_label} is already ${bed.status} by ${tenantName}`,
            field: "bed_id",
          },
        },
        { status: 400 }
      );
    }

    // Execute atomic allotment transaction
    const allotment = await db.$transaction(async (tx) => {
      const rentAmount = parseFloat(agreedRent || bed.room.default_rent);
      const depositAmount = parseFloat(securityDeposit || bed.room.default_rent);

      const createdAllotment = await tx.allotment.create({
        data: {
          organization_id: session.organizationId,
          property_id: bed.room.property_id,
          tenant_id: tenantId,
          room_id: roomId,
          bed_id: bedId,
          status: isFutureBooking ? "reserved" : "active",
          booking_date: new Date(),
          move_in_date: moveIn,
          expected_move_out_date: moveOut,
          agreed_rent: rentAmount,
          security_deposit_amount: depositAmount,
          security_deposit_paid: isFutureBooking ? parseFloat(bookingAdvance || "0") : depositAmount,
          booking_advance_amount: isFutureBooking ? parseFloat(bookingAdvance || "0") : 0,
        },
      });

      // Update bed status
      await tx.bed.update({
        where: { id: bedId },
        data: {
          status: isFutureBooking ? "reserved" : "occupied",
          current_allotment_id: createdAllotment.id,
        },
      });

      // Update tenant status
      await tx.tenant.update({
        where: { id: tenantId },
        data: { status: isFutureBooking ? "upcoming" : "active" },
      });

      return createdAllotment;
    });

    return NextResponse.json({ success: true, data: { allotment } });
  } catch (error: any) {
    console.error("Create allotment error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
