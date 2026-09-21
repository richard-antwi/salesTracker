import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // 1. Create Enum (ignore error if exists)
    try {
      await prisma.$executeRawUnsafe(`CREATE TYPE "SubStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');`);
    } catch (e: any) {
      console.log('Enum may already exist:', e.message);
    }

    // 2. Alter Organization
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Organization" ADD COLUMN "subscriptionStatus" "SubStatus" NOT NULL DEFAULT 'TRIAL';`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Organization" ADD COLUMN "trialEndsAt" TIMESTAMP(3);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Organization" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Organization" ADD COLUMN "paystackCustomerCode" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Organization" ADD COLUMN "paystackSubscriptionCode" TEXT;`);
    } catch (e: any) {
      console.log('Organization columns may already exist:', e.message);
    }

    // 3. Create SystemSettings
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "SystemSettings" (
            "id" TEXT NOT NULL DEFAULT 'global',
            "monthlySubscriptionFee" DECIMAL(10,2) NOT NULL DEFAULT 50,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
        );
      `);
    } catch (e: any) {
      console.log('SystemSettings table may already exist:', e.message);
    }

    return NextResponse.json({ success: true, message: 'Database migrated successfully via raw SQL' });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Failed to migrate', details: error.message }, { status: 500 });
  }
}
