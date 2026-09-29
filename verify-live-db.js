const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function main() {
  console.log('Testing live DB connection and new tables...');
  try {
    const orgs = await prisma.$queryRaw`SELECT "id", "payoutNetwork", "payoutAccountName" FROM "Organization" LIMIT 1;`;
    console.log('Organization payout columns exist! Row:', orgs[0]);

    const walletRequests = await prisma.$queryRaw`SELECT * FROM "WalletChangeRequest" LIMIT 1;`;
    console.log('WalletChangeRequest table exists! Rows found:', walletRequests.length);

    console.log('Live Database is fully updated and verified!');
  } catch (err) {
    console.error('Error verifying live DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
