import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSession } from "@/lib/auth/session";

/**
 * Daily job: activate reservations whose move_in_date has arrived.
 *
 * Access control (this route mutates data, so it must never be open):
 *  - Scheduled path: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 *    When it matches, the job runs across ALL organizations.
 *  - Manual path: an authenticated user can trigger it from the UI; that run
 *    is scoped to the caller's own organization only.
 *  - Anything else -> 401.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  let organizationScope: string | null = null;
  if (!isCron) {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }
    organizationScope = session.organizationId;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reservationsToActivate = await db.allotment.findMany({
      where: {
        status: "reserved",
        move_in_date: { lte: today },
        deleted_at: null,
        ...(organizationScope ? { organization_id: organizationScope } : {}),
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
          await tx.allotment.update({
            where: { id: allotment.id },
            data: { status: "active" },
          });

          await tx.bed.update({
            where: { id: allotment.bed_id },
            data: { status: "occupied", current_allotment_id: allotment.id },
          });

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
