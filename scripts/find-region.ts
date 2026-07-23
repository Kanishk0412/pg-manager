import { PrismaClient } from "@prisma/client";

const regions = [
  "us-east-1", "us-west-1", "eu-west-1", "ap-southeast-1",
  "ap-south-1", "ap-northeast-1", "eu-central-1", "us-east-2"
];

async function tryRegion(region: string) {
  const url = `postgresql://postgres.anykzxrayhzvnuroqcrh:kXQ11vTMJpcULJHj@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=5`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const count = await prisma.tenant.count();
    console.log(`✅ ${region}: SUCCESS - ${count} tenants`);
    await prisma.$disconnect();
    return true;
  } catch (err: any) {
    console.log(`❌ ${region}: ${err.message?.substring(0, 80)}`);
    await prisma.$disconnect();
    return false;
  }
}

async function main() {
  for (const region of regions) {
    const ok = await tryRegion(region);
    if (ok) break;
  }
}

main();
