const { PrismaClient } = require('@prisma/client');

async function migrate(url, label) {
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });

  try {
    console.log(`\n==============================================`);
    console.log(`  Processing Database: ${label}`);
    console.log(`==============================================`);

    // Step 1: Delete original account with email 'richardantwi8888@gmail.com' completely
    const originalAccount = await prisma.user.findFirst({
      where: { email: 'richardantwi8888@gmail.com' }
    });

    if (originalAccount) {
      console.log(`[Step 1] Found original account (${originalAccount.name} / ID: ${originalAccount.id}). Cleaning up dependencies...`);
      
      // Delete status change logs by this user
      await prisma.statusChangeLog.deleteMany({ where: { changedBy: originalAccount.name } });
      
      // Delete documents uploaded by this user
      await prisma.document.deleteMany({ where: { uploadedBy: originalAccount.id } });
      
      // Delete payments recorded by this user
      await prisma.payment.deleteMany({ where: { recordedBy: originalAccount.id } });
      
      // Delete agreements where hirer is this user
      const userAgreements = await prisma.agreement.findMany({ where: { hirerId: originalAccount.id } });
      for (const ag of userAgreements) {
        await prisma.payment.deleteMany({ where: { agreementId: ag.id } });
        await prisma.document.deleteMany({ where: { agreementId: ag.id } });
        await prisma.statusChangeLog.deleteMany({ where: { agreementId: ag.id } });
        await prisma.agreement.delete({ where: { id: ag.id } });
      }

      // Delete the user record completely
      await prisma.user.delete({ where: { id: originalAccount.id } });
      console.log(`[Step 1 ✅] Deleted original account richardantwi8888@gmail.com completely.`);
    } else {
      console.log(`[Step 1 ℹ️] No original account found with email richardantwi8888@gmail.com.`);
    }

    // Step 2: Change admin 'richardrichfavourantwi88@gmail.com' to 'richardantwi8888@gmail.com'
    const testAdmin = await prisma.user.findFirst({
      where: { email: 'richardrichfavourantwi88@gmail.com' }
    });

    if (testAdmin) {
      await prisma.user.update({
        where: { id: testAdmin.id },
        data: { email: 'richardantwi8888@gmail.com' }
      });
      console.log(`[Step 2 ✅] Updated Admin (${testAdmin.name}) email from richardrichfavourantwi88@gmail.com -> richardantwi8888@gmail.com.`);
    } else {
      console.log(`[Step 2 ⚠️] No admin found with email richardrichfavourantwi88@gmail.com.`);
    }

    // Step 3: Change Super Admin 'admin@workandpay.gh' to 'richardrichfavourantwi88@gmail.com'
    const superAdmin = await prisma.user.findFirst({
      where: { OR: [{ email: 'admin@workandpay.gh' }, { phone: '0240000000' }, { role: 'SUPER_ADMIN' }] }
    });

    if (superAdmin) {
      await prisma.user.update({
        where: { id: superAdmin.id },
        data: { email: 'richardrichfavourantwi88@gmail.com' }
      });
      console.log(`[Step 3 ✅] Updated Super Admin (${superAdmin.name}) email from ${superAdmin.email} -> richardrichfavourantwi88@gmail.com.`);
    } else {
      console.log(`[Step 3 ⚠️] No Super Admin found to update.`);
    }

    // Verify final state
    const allAdmins = await prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
      select: { name: true, phone: true, email: true, role: true }
    });
    console.log(`\nFinal Admin Accounts in ${label}:`);
    console.table(allAdmins);

  } catch (err) {
    console.error(`❌ Error migrating ${label}:`, err);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const localUrl = 'postgresql://postgres:admin@localhost:5432/salestracker_multitenant_dev?schema=public';
  const liveUrl = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

  await migrate(localUrl, 'Local Development Database');
  await migrate(liveUrl, 'Live Supabase Production Database');
}

run();
