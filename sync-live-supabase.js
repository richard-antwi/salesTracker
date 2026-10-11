const { PrismaClient } = require('@prisma/client');

async function syncLiveSupabase() {
  const liveUrl = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: liveUrl,
      },
    },
  });

  try {
    console.log('⚡ Synchronizing Schema Columns to Live Supabase Production Database...');

    // 1. Ensure Enum types exist
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "WalletChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('✅ Checked WalletChangeStatus enum');
    } catch (e) {
      console.log('Enum check note:', e.message);
    }

    // 2. Ensure WalletChangeRequest table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WalletChangeRequest" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "requestedBy" TEXT NOT NULL,
        "newNetwork" TEXT NOT NULL,
        "newAccountName" TEXT NOT NULL,
        "newAccountNumber" TEXT NOT NULL,
        "status" "WalletChangeStatus" NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "resolvedAt" TIMESTAMP(3),
        CONSTRAINT "WalletChangeRequest_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Checked WalletChangeRequest table');

    // 3. Add columns if not exists
    const alterStatements = [
      'ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;',
      'ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "payoutNetwork" TEXT;',
      'ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "payoutAccountName" TEXT;',
      'ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "payoutAccountNumber" TEXT;',
      'ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "payerAccount" TEXT;',
      'ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "payeeAccount" TEXT;',
      'ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "sourceAccount" TEXT;',
      'ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "destinationAccount" TEXT;',
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "receivePaymentSms" BOOLEAN NOT NULL DEFAULT false;',
    ];

    for (const sql of alterStatements) {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ Applied column: ${sql}`);
    }

    // 3.5 Ensure SmsLog table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SmsLog" (
        "id" TEXT NOT NULL,
        "recipient" TEXT NOT NULL,
        "recipientName" TEXT,
        "message" TEXT NOT NULL,
        "senderId" TEXT NOT NULL,
        "purpose" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'SENT',
        "batchId" TEXT,
        "error" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Checked SmsLog table');

    // 4. Ensure foreign keys & indexes exist
    const indexStatements = [
      'CREATE INDEX IF NOT EXISTS "WalletChangeRequest_organizationId_idx" ON "WalletChangeRequest"("organizationId");',
      'CREATE INDEX IF NOT EXISTS "WalletChangeRequest_status_idx" ON "WalletChangeRequest"("status");',
    ];

    for (const sql of indexStatements) {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ Applied index: ${sql}`);
    }

    console.log('\n🎉 Live Supabase Database Schema Sync Complete!');
  } catch (err) {
    console.error('❌ Error syncing live Supabase DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

syncLiveSupabase();
