import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export async function POST() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all reserved allotments where move_in_date <= today
    const reservationsToActivate = await db.allotment.findMany({
      where: {
        status: "reserved",
        move_in_date: { lte: today },
        deleted_at: null,
      },
      include: { tenant: true, room: true, bed: true },
    });

    if (reservationsToActivate.length === 0) {
      return NextResponse.json({
        success: true,
        data: { activated: 0, message: "No reservations to activate today" },
      });
    }

    let activated = 0;
    const results: string[] = [];

    for (const allotment of reservationsToActivate) {
      try {
        await db.$transaction(async (tx) => {
          // Activate allotment
          await tx.allotment.update({
            where: { id: allotment.id },
            data: { status: "active" },
          });

          // Update bed status
          await tx.bed.update({
            where: { id: allotment.bed_id },
            data: { status: "occupied", current_allotment_id: allotment.id },
          });

          // Update tenant status if upcoming
          if (allotment.tenant.status === "upcoming") {
            await tx.tenant.update({
              where: { id: allotment.tenant_id },
              data: { status: "active" },
            });
          }
        });

        activated++;
        results.push(`✓ Activated: ${allotment.tenant.full_name} → Room ${allotment.room.room_number}-${allotment.bed.bed_label}`);
      } catch (err: any) {
        results.push(`✗ Failed: ${allotment.tenant.full_name} — ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        activated,
        total: reservationsToActivate.length,
        results,
        message: `Activated ${activated} of ${reservationsToActivate.length} reservations`,
      },
    });
  } catch (error: any) {
    console.error("Activate reservations error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
