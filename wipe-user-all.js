const { PrismaClient } = require('@prisma/client');

async function wipeUserData(url, label, targetEmail) {
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });

  try {
    console.log(`\n==============================================`);
    console.log(`  Wiping ALL data for "${targetEmail}" on ${label}`);
    console.log(`==============================================`);

    // 1. Find users matching target email
    const targetUsers = await prisma.user.findMany({
      where: {
        email: { contains: targetEmail, mode: 'insensitive' }
      }
    });

    console.log(`Found ${targetUsers.length} user record(s) matching ${targetEmail}.`);

    for (const u of targetUsers) {
      console.log(`\nProcessing User: ${u.name} (${u.email} / Phone: ${u.phone} / ID: ${u.id})...`);

      // Delete payments recorded by user or linked to user as hirer
      const p1 = await prisma.payment.deleteMany({
        where: { OR: [{ recordedBy: u.id }, { agreement: { hirerId: u.id } }] }
      });
      console.log(`  - Deleted ${p1.count} payments.`);

      // Delete docs uploaded by user or linked to user as hirer
      const d1 = await prisma.document.deleteMany({
        where: { OR: [{ uploadedBy: u.id }, { agreement: { hirerId: u.id } }] }
      });
      console.log(`  - Deleted ${d1.count} documents.`);

      // Delete status logs changed by user or linked to user as hirer
      const l1 = await prisma.statusChangeLog.deleteMany({
        where: { OR: [{ changedBy: u.name }, { agreement: { hirerId: u.id } }] }
      });
      console.log(`  - Deleted ${l1.count} status logs.`);

      // Delete agreements where user is hirer or owner
      const ags = await prisma.agreement.findMany({
        where: {
          OR: [
            { hirerId: u.id },
            { ownerPhone: u.phone },
            { ownerName: { contains: u.name, mode: 'insensitive' } }
          ]
        }
      });

      for (const ag of ags) {
        console.log(`  - Wiping Agreement ID ${ag.id}...`);
        await prisma.payment.deleteMany({ where: { agreementId: ag.id } });
        await prisma.document.deleteMany({ where: { agreementId: ag.id } });
        await prisma.statusChangeLog.deleteMany({ where: { agreementId: ag.id } });
        await prisma.agreement.delete({ where: { id: ag.id } });
        if (ag.vehicleId) {
          try { await prisma.vehicle.delete({ where: { id: ag.vehicleId } }); } catch {}
        }
      }

      // If user is tied to an organization, clean up org data if owned
      if (u.organizationId) {
        const org = await prisma.organization.findUnique({ where: { id: u.organizationId } });
        if (org && (org.contactEmail?.toLowerCase() === targetEmail.toLowerCase() || org.contactPhone === u.phone)) {
          console.log(`  - Wiping Organization ${org.name} (${org.id})...`);
          
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
      }

      // Delete user record
      try {
        await prisma.user.delete({ where: { id: u.id } });
        console.log(`  - User ${u.name} (${u.email}) deleted completely.`);
      } catch (e) {
        console.log(`  - User ${u.id} already deleted with organization.`);
      }
    }

    // Direct check for any remaining agreements/orgs by email string
    const remainingOrgs = await prisma.organization.findMany({
      where: { contactEmail: { contains: targetEmail, mode: 'insensitive' } }
    });
    for (const org of remainingOrgs) {
      await prisma.vehicle.deleteMany({ where: { organizationId: org.id } });
      await prisma.user.deleteMany({ where: { organizationId: org.id } });
      await prisma.organization.delete({ where: { id: org.id } });
      console.log(`  - Cleaned up lingering organization ${org.name}.`);
    }

    console.log(`✅ Completed wipe for "${targetEmail}" on ${label}.`);

  } catch (err) {
    console.error(`❌ Error wiping data on ${label}:`, err);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const localUrl = 'postgresql://postgres:admin@localhost:5432/salestracker_multitenant_dev?schema=public';
  const liveUrl = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

  const target = 'yaaadepa313@gmail.com';
  await wipeUserData(localUrl, 'Local Development Database', target);
  await wipeUserData(liveUrl, 'Live Supabase Production Database', target);
}

run();
