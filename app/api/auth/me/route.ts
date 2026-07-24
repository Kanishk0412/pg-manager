import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ScopedDb } from "@/lib/db/scoped";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  // Resolve the real organization + primary property so the UI never has to
  // hardcode a property name. Fail soft: if the DB is unreachable we still
  // return the session so the app keeps working.
  let organizationName: string | null = null;
  let property: { id: string; name: string; brand_color: string | null; currency_symbol: string | null } | null = null;
  try {
    const scoped = new ScopedDb(session.organizationId);
    const properties = await scoped.getProperties();
    if (properties.length > 0) {
      const p = properties[0];
      organizationName = p.name;
      property = {
        id: p.id,
        name: p.name,
        brand_color: (p as any).brand_color ?? null,
        currency_symbol: (p as any).currency_symbol ?? null,
      };
    }
  } catch {
    // ignore — session-only response
  }

  return NextResponse.json({
    success: true,
    data: { user: session, organizationName, property },
  });
}
