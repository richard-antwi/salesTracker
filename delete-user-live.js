const { PrismaClient } = require('@prisma/client');

async function deleteUserByEmail(url, label, targetEmail) {
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });

  try {
    console.log(`\n==============================================`);
    console.log(`  Deleting User: "${targetEmail}" on ${label}`);
    console.log(`==============================================`);

    // Find users matching targetEmail or variation (case-insensitive)
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: targetEmail },
          { email: 'emmanuel@gmal.com' },
          { email: 'emmanuel@gmail.com' }
        ]
      }
    });

    if (users.length === 0) {
      console.log(`ℹ️ No user found with email "${targetEmail}".`);
      return;
    }

    for (const user of users) {
      console.log(`Found target user: ${user.name} (${user.email} / ID: ${user.id}). Cleaning up dependencies...`);

      // 1. Delete status change logs
      const logs = await prisma.statusChangeLog.deleteMany({
        where: { OR: [{ changedBy: user.name }, { agreement: { hirerId: user.id } }] }
      });
      console.log(`- Deleted ${logs.count} status change log records.`);

      // 2. Delete documents uploaded by user or linked to user agreements
      const docs = await prisma.document.deleteMany({
        where: { OR: [{ uploadedBy: user.id }, { agreement: { hirerId: user.id } }] }
      });
      console.log(`- Deleted ${docs.count} document records.`);

      // 3. Delete payments recorded by user or linked to user agreements
      const payments = await prisma.payment.deleteMany({
        where: { OR: [{ recordedBy: user.id }, { agreement: { hirerId: user.id } }] }
      });
      console.log(`- Deleted ${payments.count} payment records.`);

      // 4. Delete agreements where hirer is this user
      const agreements = await prisma.agreement.deleteMany({
        where: { hirerId: user.id }
      });
      console.log(`- Deleted ${agreements.count} agreement records.`);

      // 5. If user owns an organization, check if org needs deletion or unlinking
      if (user.organizationId) {
        const orgAgreements = await prisma.agreement.findMany({ where: { organizationId: user.organizationId } });
        if (orgAgreements.length === 0) {
          // Clean up vehicles in empty org
          await prisma.vehicle.deleteMany({ where: { organizationId: user.organizationId } });
        }
      }

      // 6. Delete user record
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`✅ User "${user.email}" (${user.name}) deleted completely!`);
    }

    // Print remaining admin accounts
    const remainingAdmins = await prisma.user.findMany({
      select: { name: true, phone: true, email: true, role: true }
    });
    console.log(`\nRemaining Users in ${label}:`);
    console.table(remainingAdmins);

  } catch (err) {
    console.error(`❌ Error during deletion on ${label}:`, err);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const localUrl = 'postgresql://postgres:admin@localhost:5432/salestracker_multitenant_dev?schema=public';
  const liveUrl = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

  await deleteUserByEmail(localUrl, 'Local Development Database', 'emmanuel@gmal.com');
  await deleteUserByEmail(liveUrl, 'Live Supabase Production Database', 'emmanuel@gmal.com');
}

run();
