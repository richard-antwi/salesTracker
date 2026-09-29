const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function main() {
  console.log('Creating WalletChangeRequest table on live DB...');
  try {
    // Add columns to Organization table
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Organization" 
        ADD COLUMN "payoutNetwork" TEXT,
        ADD COLUMN "payoutAccountName" TEXT,
        ADD COLUMN "payoutAccountNumber" TEXT;
      `);
      console.log('Added payout wallet columns to Organization table');
    } catch (e) {
      console.log('Payout wallet columns might already exist:', e.message);
    }

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "WalletChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WalletChangeRequest" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "requestedBy" TEXT NOT NULL,
        "newNetwork" TEXT NOT NULL,
        "newAccountName" TEXT NOT NULL,
        "newAccountNumber" TEXT NOT NULL,
        "status" "WalletChangeStatus" NOT NULL DEFAULT 'PENDING',
        "resolvedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WalletChangeRequest_pkey" PRIMARY KEY ("id")
      );
    `);

    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "WalletChangeRequest" 
            ADD CONSTRAINT "WalletChangeRequest_organizationId_fkey" 
            FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") 
            ON DELETE RESTRICT ON UPDATE CASCADE;
        `);
    } catch(e) {
        console.log('Foreign key might already exist: ', e.message);
    }

    console.log('Successfully created WalletChangeRequest table on live DB!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
