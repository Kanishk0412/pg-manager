import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { newRoomId, newBedId, transferDate, newRent } = body;

    if (!newRoomId || !newBedId) {
      return NextResponse.json(
        { success: false, error: { message: "New room and bed are required for transfer" } },
        { status: 400 }
      );
    }

    const xferDate = transferDate ? new Date(transferDate) : new Date();

    // Get current allotment
    const currentAllotment = await db.allotment.findFirst({
      where: { id, organization_id: session.organizationId, deleted_at: null },
      include: { tenant: true, room: true, bed: true },
    });

    if (!currentAllotment) {
      return NextResponse.json({ success: false, error: { message: "Allotment not found" } }, { status: 404 });
    }

    if (!["active", "on_notice"].includes(currentAllotment.status)) {
      return NextResponse.json(
        { success: false, error: { message: `Cannot transfer allotment with status "${currentAllotment.status}".` } },
        { status: 400 }
      );
    }

    // Verify new bed
    const newBed = await db.bed.findFirst({
      where: { id: newBedId, organization_id: session.organizationId, deleted_at: null },
      include: { room: true },
    });

    if (!newBed) {
      return NextResponse.json({ success: false, error: { message: "New bed not found" } }, { status: 404 });
    }

    if (newBed.status !== "vacant") {
      return NextResponse.json(
        { success: false, error: { message: `Bed ${newBed.room.room_number}-${newBed.bed_label} is ${newBed.status}, cannot transfer here` } },
        { status: 400 }
      );
    }

    // Atomic transfer
    const result = await db.$transaction(async (tx) => {
      // 1. Close current allotment
      await tx.allotment.update({
        where: { id },
        data: {
          status: "vacated",
          actual_move_out_date: xferDate,
          notes: `${currentAllotment.notes || ""}\nTransferred to Room ${newBed.room.room_number}-${newBed.bed_label} on ${xferDate.toISOString().split("T")[0]}`.trim(),
        },
      });

      // 2. Free old bed
      await tx.bed.update({
        where: { id: currentAllotment.bed_id },
        data: { status: "vacant", current_allotment_id: null },
      });

      // 3. Create new allotment
      const newAllotment = await tx.allotment.create({
        data: {
          organization_id: session.organizationId,
          property_id: newBed.room.property_id,
          tenant_id: currentAllotment.tenant_id,
          room_id: newRoomId,
          bed_id: newBedId,
          status: "active",
          booking_date: new Date(),
          move_in_date: xferDate,
          agreed_rent: newRent ? parseFloat(newRent) : currentAllotment.agreed_rent,
          security_deposit_amount: currentAllotment.security_deposit_amount,
          security_deposit_paid: currentAllotment.security_deposit_paid,
          notes: `Transferred from Room ${currentAllotment.room.room_number}-${currentAllotment.bed.bed_label}`,
        },
        include: { tenant: true, room: true, bed: true },
      });

      // 4. Update new bed
      await tx.bed.update({
        where: { id: newBedId },
        data: { status: "occupied", current_allotment_id: newAllotment.id },
      });

      // 5. Ensure tenant status is active
      await tx.tenant.update({
        where: { id: currentAllotment.tenant_id },
        data: { status: "active" },
      });

      return newAllotment;
    });

    return NextResponse.json({
      success: true,
      data: {
        newAllotment: result,
        previousRoom: `${currentAllotment.room.room_number}-${currentAllotment.bed.bed_label}`,
        newRoom: `${newBed.room.room_number}-${newBed.bed_label}`,
      },
    });
  } catch (error: any) {
    console.error("Transfer error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
