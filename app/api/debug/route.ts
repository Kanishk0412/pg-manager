import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

export async function GET() {
  const result: any = {
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + "...",
    nodeEnv: process.env.NODE_ENV,
    prismaOk: false,
    tenantCount: 0,
    error: null,
  };

  try {
    const prisma = getDb();
    result.prismaOk = !!prisma;
    if (prisma) {
      const count = await prisma.tenant.count();
      result.tenantCount = count;
      const sample = await prisma.tenant.findFirst();
      result.sampleTenant = sample?.full_name || null;
    }
  } catch (err: any) {
    result.error = err.message || String(err);
  }

  return NextResponse.json(result);
}
