import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ScopedDb } from "@/lib/db/scoped";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }
    const { id } = await params;

    const scoped = new ScopedDb(session.organizationId);
    const tenant = await scoped.getTenant(id);

    if (!tenant) {
      return NextResponse.json({ success: false, error: { message: "Tenant not found" } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { tenant } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
