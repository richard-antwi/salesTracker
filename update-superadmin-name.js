const { PrismaClient } = require('@prisma/client');

async function updateName(url, label) {
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });

  try {
    const user = await prisma.user.findFirst({
      where: { email: 'richardrichfavourantwi88@gmail.com' }
    });

    if (user) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { name: 'Richard Antwi' }
      });
      console.log(`✅ Updated Super Admin name on ${label}: "${updated.name}" (${updated.email})`);
    } else {
      console.log(`⚠️ User richardrichfavourantwi88@gmail.com not found on ${label}`);
    }
  } catch (err) {
    console.error(`❌ Error on ${label}:`, err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const localUrl = 'postgresql://postgres:admin@localhost:5432/salestracker_multitenant_dev?schema=public';
  const liveUrl = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

  await updateName(localUrl, 'Local Development Database');
  await updateName(liveUrl, 'Live Supabase Production Database');
}

run();
