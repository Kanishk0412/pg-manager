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

    // Overlap validation (PRD 8.6): two date ranges [aStart,aEnd] and
    // [bStart,bEnd] overlap iff aStart <= bEnd AND bStart <= aEnd. Open-ended
    // bookings (no expected_move_out) are treated as running to +infinity.
    // We fetch ALL live bookings on the bed and check each, rather than relying
    // on a single findFirst which can silently pick the wrong row.
    const moveOut = expectedMoveOutDate ? new Date(expectedMoveOutDate) : null;
    const reqStart = moveIn.getTime();
    const reqEnd = moveOut ? moveOut.getTime() : Number.POSITIVE_INFINITY;

    const bedBookings = await db.allotment.findMany({
      where: {
        bed_id: bedId,
        status: { in: ["active", "reserved", "on_notice"] },
        deleted_at: null,
      },
      include: { tenant: true },
    });

    const conflict = bedBookings.find((existing) => {
      const exStart = existing.move_in_date.getTime();
      const exEndDate = existing.expected_move_out_date || existing.actual_move_out_date;
      const exEnd = exEndDate ? exEndDate.getTime() : Number.POSITIVE_INFINITY;
      return exStart <= reqEnd && reqStart <= exEnd;
    });

    if (conflict) {
      const existingEnd = conflict.expected_move_out_date || conflict.actual_move_out_date;
      const tenantName = conflict.tenant?.full_name || "another tenant";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BOOKING_OVERLAP",
            message: `Bed ${bed.room.room_number}-${bed.bed_label} has an overlapping ${conflict.status} booking by ${tenantName} (${conflict.move_in_date.toISOString().split("T")[0]} → ${existingEnd ? existingEnd.toISOString().split("T")[0] : "open-ended"})`,
            field: "bed_id",
          },
        },
        { status: 400 }
      );
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
