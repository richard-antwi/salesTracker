const { PrismaClient } = require('@prisma/client');

async function pushLiveIndexes() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
      }
    }
  });

  try {
    console.log('⚡ Pushing performance indexes to Live Supabase Production Database...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS "Organization_status_idx" ON "Organization"("status")',
      'CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId")',
      'CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role")',
      'CREATE INDEX IF NOT EXISTS "Vehicle_organizationId_idx" ON "Vehicle"("organizationId")',
      'CREATE INDEX IF NOT EXISTS "Agreement_organizationId_idx" ON "Agreement"("organizationId")',
      'CREATE INDEX IF NOT EXISTS "Agreement_hirerId_idx" ON "Agreement"("hirerId")',
      'CREATE INDEX IF NOT EXISTS "Agreement_status_idx" ON "Agreement"("status")',
      'CREATE INDEX IF NOT EXISTS "Payment_organizationId_idx" ON "Payment"("organizationId")',
      'CREATE INDEX IF NOT EXISTS "Payment_agreementId_idx" ON "Payment"("agreementId")',
      'CREATE INDEX IF NOT EXISTS "Payment_datePaid_idx" ON "Payment"("datePaid")',
      'CREATE INDEX IF NOT EXISTS "Payment_voided_idx" ON "Payment"("voided")',
      'CREATE INDEX IF NOT EXISTS "Document_organizationId_idx" ON "Document"("organizationId")',
      'CREATE INDEX IF NOT EXISTS "Document_agreementId_idx" ON "Document"("agreementId")',
      'CREATE INDEX IF NOT EXISTS "WithdrawalRequest_organizationId_idx" ON "WithdrawalRequest"("organizationId")',
      'CREATE INDEX IF NOT EXISTS "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status")',
      'CREATE INDEX IF NOT EXISTS "WalletChangeRequest_organizationId_idx" ON "WalletChangeRequest"("organizationId")',
      'CREATE INDEX IF NOT EXISTS "WalletChangeRequest_status_idx" ON "WalletChangeRequest"("status")',
    ];

    for (const sql of indexes) {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ Applied: ${sql.split('ON')[1].trim()}`);
    }

    console.log('\n🚀 All 17 database performance indexes live on Supabase!');

  } catch (err) {
    console.error('Error applying live indexes:', err);
  } finally {
    await prisma.$disconnect();
  }
}

pushLiveIndexes();
