const { PrismaClient } = require('@prisma/client');

async function check(url, label) {
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });
  try {
    const users = await prisma.user.findMany({
      select: { name: true, phone: true, email: true, role: true }
    });
    console.log(`\n--- ${label} ---`);
    console.table(users);
  } catch (err) {
    console.error(`Error checking ${label}:`, err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await check('postgresql://postgres:admin@localhost:5432/salestracker_multitenant_dev?schema=public', 'Local Database');
  await check('postgresql://postgres:dbadmin%408888R@db.jhxctmcjbjkicgrlzftr.supabase.co:5432/postgres', 'Live Supabase Database');
}

main();
