const { Client } = require('pg');
const { execSync } = require('child_process');

const cs = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:cQ%24X%214yiUQ%2332hY@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=no-verify';

async function migrate() {
  console.log('Connecting to Supabase PostgreSQL...');
  const client = new Client({ connectionString: cs });
  await client.connect();

  console.log('Executing PostgreSQL DDL Schema Migration...');

  const sql = `
    -- Enums
    DO $$ BEGIN
        CREATE TYPE "Role" AS ENUM ('ADMIN', 'RIDER', 'GUARANTOR');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
        CREATE TYPE "Frequency" AS ENUM ('WEEKLY', 'MONTHLY');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
        CREATE TYPE "AgreementStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED', 'REPOSSESSED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
        CREATE TYPE "PaymentChannel" AS ENUM ('MOMO', 'CASH', 'BANK');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
        CREATE TYPE "DocumentType" AS ENUM ('GHANA_CARD', 'PASSPORT_PHOTO', 'SIGNED_CONTRACT', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    -- Tables
    CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL UNIQUE,
        "email" TEXT UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'RIDER',
        "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "Vehicle" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "makeModel" TEXT NOT NULL,
        "registrationNo" TEXT NOT NULL UNIQUE,
        "chassisNo" TEXT,
        "engineNo" TEXT,
        "colorYear" TEXT
    );

    CREATE TABLE IF NOT EXISTS "Agreement" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "ownerName" TEXT NOT NULL,
        "ownerPhone" TEXT NOT NULL,
        "hirerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "guarantor1Name" TEXT,
        "guarantor1Phone" TEXT,
        "guarantor2Name" TEXT,
        "guarantor2Phone" TEXT,
        "vehicleId" TEXT NOT NULL UNIQUE REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "cashPrice" DECIMAL(12, 2) NOT NULL,
        "hirePurchasePrice" DECIMAL(12, 2) NOT NULL,
        "installmentAmount" DECIMAL(12, 2) NOT NULL,
        "frequency" "Frequency" NOT NULL DEFAULT 'WEEKLY',
        "totalInstallments" INTEGER NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "status" "AgreementStatus" NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "Payment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "agreementId" TEXT NOT NULL REFERENCES "Agreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "amount" DECIMAL(12, 2) NOT NULL,
        "datePaid" TIMESTAMP(3) NOT NULL,
        "channel" "PaymentChannel" NOT NULL DEFAULT 'MOMO',
        "reference" TEXT,
        "note" TEXT,
        "recordedBy" TEXT NOT NULL,
        "voided" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "StatusChangeLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "agreementId" TEXT NOT NULL REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "fromStatus" "AgreementStatus" NOT NULL,
        "toStatus" "AgreementStatus" NOT NULL,
        "reason" TEXT NOT NULL,
        "changedBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "Document" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "agreementId" TEXT NOT NULL REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
        "fileName" TEXT NOT NULL,
        "fileUrl" TEXT NOT NULL,
        "fileSize" INTEGER NOT NULL,
        "mimeType" TEXT NOT NULL,
        "uploadedBy" TEXT NOT NULL,
        "note" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await client.query(sql);
  console.log('✅ PostgreSQL Schema Applied Cleanly to Supabase!');
  await client.end();

  console.log('\n🌱 Seeding PostgreSQL Database...');
  execSync('node prisma/seed-postgres.js', { stdio: 'inherit' });
  console.log('🎉 PostgreSQL Migration and Seeding Complete!');
}

migrate().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
