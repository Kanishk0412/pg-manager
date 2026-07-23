import { getDb } from "../lib/db/client";

async function main() {
  const prisma = getDb();
  if (!prisma) {
    console.error("Prisma client is null");
    return;
  }
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        allotments: {
          include: { room: true, bed: true }
        }
      }
    });
    console.log("SUCCESS! Total Tenants in Supabase DB:", tenants.length);
    tenants.forEach(t => console.log(`- ${t.full_name} (${t.phone})`));
  } catch (err) {
    console.error("SUPABASE QUERY ERROR:", err);
  }
}

main();
