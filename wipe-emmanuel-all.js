const { PrismaClient } = require('@prisma/client');

async function wipeEmmanuelData(url, label) {
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });

  try {
    console.log(`\n==============================================`);
    console.log(`  Wiping ALL Emmanuel Asiamah data on ${label}`);
    console.log(`==============================================`);

    // 1. Find agreements with ownerName or hirer matching Emmanuel
    const agreements = await prisma.agreement.findMany({
      where: {
        OR: [
          { ownerName: { contains: 'Emmanuel Asiamah', mode: 'insensitive' } },
          { ownerName: { contains: 'Asiamah', mode: 'insensitive' } },
          { ownerPhone: '0544524532' },
          { hirer: { email: { contains: 'emmanuel@gmal', mode: 'insensitive' } } },
          { hirer: { email: { contains: 'emmanuel@gmail', mode: 'insensitive' } } },
        ]
      },
      include: { vehicle: true, hirer: true }
    });

    console.log(`Found ${agreements.length} matching agreements to delete.`);

    for (const ag of agreements) {
      console.log(`Deleting agreement ID ${ag.id} (Owner: ${ag.ownerName}, Hirer: ${ag.hirer?.name}, Vehicle: ${ag.vehicle?.registrationNo})...`);
      
      // Delete status logs, documents, payments
      const logs = await prisma.statusChangeLog.deleteMany({ where: { agreementId: ag.id } });
      const docs = await prisma.document.deleteMany({ where: { agreementId: ag.id } });
      const pmts = await prisma.payment.deleteMany({ where: { agreementId: ag.id } });
      console.log(`  - Deleted ${logs.count} logs, ${docs.count} docs, ${pmts.count} payments.`);

      // Delete agreement
      await prisma.agreement.delete({ where: { id: ag.id } });

      // Delete vehicle if not linked to other agreements
      if (ag.vehicleId) {
        try {
          await prisma.vehicle.delete({ where: { id: ag.vehicleId } });
          console.log(`  - Deleted vehicle ${ag.vehicleId}.`);
        } catch (e) {
          console.log(`  - Vehicle ${ag.vehicleId} in use or already deleted.`);
        }
      }
    }

    // 2. Find any Organizations created by Emmanuel or with contactEmail emmanuel@gmal.com / phone 0544524532
    const orgs = await prisma.organization.findMany({
      where: {
        OR: [
          { contactEmail: { contains: 'emmanuel@gmal', mode: 'insensitive' } },
          { contactEmail: { contains: 'emmanuel@gmail', mode: 'insensitive' } },
          { contactPhone: '0544524532' }
        ]
      }
    });

    console.log(`Found ${orgs.length} matching organizations.`);

    for (const org of orgs) {
      console.log(`Cleaning up organization ${org.name} (${org.id})...`);
      await prisma.payment.deleteMany({ where: { organizationId: org.id } });
      await prisma.document.deleteMany({ where: { organizationId: org.id } });
      await prisma.statusChangeLog.deleteMany({ where: { organizationId: org.id } });
      await prisma.withdrawalRequest.deleteMany({ where: { organizationId: org.id } });
      await prisma.walletChangeRequest.deleteMany({ where: { organizationId: org.id } });
      await prisma.subscriptionPayment.deleteMany({ where: { organizationId: org.id } });
      
      const orgAgs = await prisma.agreement.findMany({ where: { organizationId: org.id } });
      for (const ag of orgAgs) {
        await prisma.payment.deleteMany({ where: { agreementId: ag.id } });
        await prisma.document.deleteMany({ where: { agreementId: ag.id } });
        await prisma.statusChangeLog.deleteMany({ where: { agreementId: ag.id } });
        await prisma.agreement.delete({ where: { id: ag.id } });
      }

      await prisma.vehicle.deleteMany({ where: { organizationId: org.id } });
      await prisma.user.deleteMany({ where: { organizationId: org.id } });
      await prisma.organization.delete({ where: { id: org.id } });
      console.log(`  - Organization ${org.name} deleted completely.`);
    }

    // 3. Delete any remaining users matching name Emmanuel Asiamah or phone 0544524532
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'emmanuel@gmal', mode: 'insensitive' } },
          { phone: '0544524532' },
          { name: { contains: 'Emmanuel Asiamah', mode: 'insensitive' } }
        ]
      }
    });
    console.log(`Deleted ${deletedUsers.count} remaining matching users.`);

    // Check remaining total agreements count
    const remainingAgreements = await prisma.agreement.count();
    console.log(`Total remaining agreements in ${label}: ${remainingAgreements}`);

  } catch (err) {
    console.error(`❌ Error wiping data on ${label}:`, err);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const localUrl = 'postgresql://postgres:admin@localhost:5432/salestracker_multitenant_dev?schema=public';
  const liveUrl = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

  await wipeEmmanuelData(localUrl, 'Local Development Database');
  await wipeEmmanuelData(liveUrl, 'Live Supabase Production Database');
}

run();
