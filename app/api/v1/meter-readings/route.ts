import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ScopedDb } from "@/lib/db/scoped";
import { db } from "@/lib/db/client";

// Parse "YYYY-MM" (or a full date) to the first-of-month in UTC.
function monthStart(input: string | null): Date {
  const now = new Date();
  if (!input) return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [y, m] = input.split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, (m || 1) - 1, 1));
}
function prevMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const month = monthStart(searchParams.get("month"));

    const scoped = new ScopedDb(session.organizationId);
    const properties = await scoped.getProperties();
    if (properties.length === 0) {
      return NextResponse.json({ success: true, data: { rows: [], month: month.toISOString(), rate: 10 } });
    }
    const property = properties[0];
    const rate = (property as any).settings?.electricity_rate_per_unit ?? 10;

    const rooms = await db.room.findMany({
      where: {
        organization_id: session.organizationId,
        property_id: property.id,
        deleted_at: null,
        is_active: true,
        has_separate_meter: true,
      },
      orderBy: [{ floor: "asc" }, { room_number: "asc" }],
    });

    const thisMonth = await db.meterReading.findMany({
      where: { organization_id: session.organizationId, property_id: property.id, billing_month: month, deleted_at: null },
    });
    const prev = await db.meterReading.findMany({
      where: { organization_id: session.organizationId, property_id: property.id, billing_month: prevMonthStart(month), deleted_at: null },
    });
    const thisByRoom = new Map(thisMonth.map((r) => [r.room_id, r]));
    const prevByRoom = new Map(prev.map((r) => [r.room_id, r]));

    const rows = rooms.map((room) => {
      const existing = thisByRoom.get(room.id);
      const carryForward = prevByRoom.get(room.id)?.current_reading ?? 0;
      return {
        room_id: room.id,
        room_number: room.room_number,
        floor: room.floor,
        meter_number: room.meter_number,
        previous_reading: existing ? existing.previous_reading : carryForward,
        current_reading: existing ? existing.current_reading : null,
        units_consumed: existing ? existing.units_consumed : null,
        amount: existing ? existing.amount : null,
        rate: existing ? existing.rate_per_unit : rate,
        saved: !!existing,
      };
    });

    return NextResponse.json({ success: true, data: { rows, month: month.toISOString(), rate, propertyId: property.id } });
  } catch (error: any) {
    console.error("Meter readings GET error:", error);
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
    const month = monthStart(body.month);
    const readings: any[] = Array.isArray(body.readings) ? body.readings : [];
    if (readings.length === 0) {
      return NextResponse.json({ success: false, error: { message: "No readings submitted." } }, { status: 400 });
    }

    const scoped = new ScopedDb(session.organizationId);
    const properties = await scoped.getProperties();
    if (properties.length === 0) {
      return NextResponse.json({ success: false, error: { message: "No property found." } }, { status: 400 });
    }
    const property = properties[0];
    const defaultRate = (property as any).settings?.electricity_rate_per_unit ?? 10;

    const saved: any[] = [];
    const warnings: string[] = [];

    for (const r of readings) {
      const roomId = String(r.roomId || "");
      if (!roomId) continue;
      const room = await db.room.findFirst({
        where: { id: roomId, organization_id: session.organizationId, deleted_at: null },
      });
      if (!room) continue;

      const current = parseFloat(r.currentReading);
      if (!Number.isFinite(current)) continue; // skip blanks

      const previous = parseFloat(r.previousReading) || 0;
      const meterReset = !!r.meterReset;

      // Validation: current must be >= previous unless the meter was reset/replaced.
      if (!meterReset && current < previous) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "READING_DECREASED",
              message: `Room ${room.room_number}: current reading (${current}) is less than previous (${previous}). Tick "meter reset" if the meter was replaced.`,
              field: roomId,
            },
          },
          { status: 400 }
        );
      }

      const units = meterReset ? current : current - previous;
      const rate = parseFloat(r.rate) || defaultRate;
      const amount = Math.round(units * rate * 100) / 100;

      // Anomaly flag: units > 2x the average of the last 3 months for this room.
      const history = await db.meterReading.findMany({
        where: { room_id: roomId, organization_id: session.organizationId, deleted_at: null, billing_month: { lt: month } },
        orderBy: { billing_month: "desc" },
        take: 3,
      });
      if (history.length > 0) {
        const avg = history.reduce((s, h) => s + h.units_consumed, 0) / history.length;
        if (avg > 0 && units > avg * 2) {
          warnings.push(`Room ${room.room_number}: ${units} units is over 2× the recent average (${avg.toFixed(0)}). Please verify.`);
        }
      }

      const record = await db.meterReading.upsert({
        where: { room_id_billing_month: { room_id: roomId, billing_month: month } },
        create: {
          organization_id: session.organizationId,
          property_id: property.id,
          room_id: roomId,
          billing_month: month,
          previous_reading: previous,
          current_reading: current,
          units_consumed: units,
          rate_per_unit: rate,
          amount,
          entered_by_user_id: session.userId,
          notes: r.notes || null,
        },
        update: {
          previous_reading: previous,
          current_reading: current,
          units_consumed: units,
          rate_per_unit: rate,
          amount,
          entered_by_user_id: session.userId,
          notes: r.notes || null,
          deleted_at: null,
        },
      });
      saved.push(record);
    }

    return NextResponse.json({ success: true, data: { savedCount: saved.length, warnings } });
  } catch (error: any) {
    console.error("Meter readings POST error:", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
