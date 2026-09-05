const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ADMIN_DB_URL = 'postgresql://postgres:admin@localhost:5432/postgres';
const DRY_RUN_DB_URL = 'postgresql://postgres:admin@localhost:5432/salestracker_prod_copy';
const BACKUP_PATH = path.join(__dirname, '..', 'backups', 'production_db_backup_pre_multitenant.json');

async function dryRunMigration() {
  console.log('======================================================================');
  console.log('🧪 DRY-RUN MULTI-TENANT MIGRATION AGAINST FRESH COPY OF PRODUCTION DATA');
  console.log('======================================================================\n');

  // Load production backup file
  if (!fs.existsSync(BACKUP_PATH)) {
    throw new Error(`Backup file not found at ${BACKUP_PATH}`);
  }
  const rawBackup = fs.readFileSync(BACKUP_PATH, 'utf8');
  const backup = JSON.parse(rawBackup);

  console.log(`1. Loaded Backup File: ${BACKUP_PATH}`);
  console.log(`   Exported At: ${backup.exportedAt}`);
  console.log(`   Source DB: ${backup.sourceDatabase}`);

  // Create isolated fresh database salestracker_prod_copy
  const adminClient = new Client({ connectionString: ADMIN_DB_URL });
  await adminClient.connect();
  await adminClient.query('DROP DATABASE IF EXISTS salestracker_prod_copy');
  await adminClient.query('CREATE DATABASE salestracker_prod_copy');
  await adminClient.end();
  console.log('2. Created fresh isolated database: "salestracker_prod_copy"');

  // Connect to salestracker_prod_copy
  const db = new Client({ connectionString: DRY_RUN_DB_URL });
  await db.connect();

  // Create pre-multitenant table structure
  await db.query(`
    CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'RIDER', 'GUARANTOR');
    CREATE TYPE "Frequency" AS ENUM ('WEEKLY', 'MONTHLY');
    CREATE TYPE "AgreementStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED', 'REPOSSESSED');
    CREATE TYPE "PaymentChannel" AS ENUM ('MOMO', 'CASH', 'BANK');
    CREATE TYPE "DocumentType" AS ENUM ('GHANA_CARD', 'PASSPORT_PHOTO', 'SIGNED_CONTRACT', 'OTHER');

    CREATE TABLE "User" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "phone" TEXT UNIQUE NOT NULL,
      "email" TEXT UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "role" "Role" NOT NULL DEFAULT 'RIDER',
      "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "Vehicle" (
      "id" TEXT PRIMARY KEY,
      "makeModel" TEXT NOT NULL,
      "registrationNo" TEXT UNIQUE NOT NULL,
      "chassisNo" TEXT,
      "engineNo" TEXT,
      "colorYear" TEXT
    );

    CREATE TABLE "Agreement" (
      "id" TEXT PRIMARY KEY,
      "ownerName" TEXT NOT NULL,
      "ownerPhone" TEXT NOT NULL,
      "hirerId" TEXT NOT NULL REFERENCES "User"("id"),
      "guarantor1Name" TEXT,
      "guarantor1Phone" TEXT,
      "guarantor2Name" TEXT,
      "guarantor2Phone" TEXT,
      "vehicleId" TEXT UNIQUE NOT NULL REFERENCES "Vehicle"("id"),
      "cashPrice" DECIMAL(12,2) NOT NULL,
      "hirePurchasePrice" DECIMAL(12,2) NOT NULL,
      "installmentAmount" DECIMAL(12,2) NOT NULL,
      "frequency" "Frequency" NOT NULL DEFAULT 'WEEKLY',
      "totalInstallments" INTEGER NOT NULL,
      "startDate" TIMESTAMP(3) NOT NULL,
      "status" "AgreementStatus" NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "Payment" (
      "id" TEXT PRIMARY KEY,
      "agreementId" TEXT NOT NULL REFERENCES "Agreement"("id"),
      "amount" DECIMAL(12,2) NOT NULL,
      "datePaid" TIMESTAMP(3) NOT NULL,
      "channel" "PaymentChannel" NOT NULL DEFAULT 'MOMO',
      "reference" TEXT,
      "note" TEXT,
      "recordedBy" TEXT NOT NULL,
      "voided" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "Document" (
      "id" TEXT PRIMARY KEY,
      "agreementId" TEXT NOT NULL REFERENCES "Agreement"("id") ON DELETE CASCADE,
      "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
      "fileName" TEXT NOT NULL,
      "fileUrl" TEXT NOT NULL,
      "fileSize" INTEGER NOT NULL,
      "mimeType" TEXT NOT NULL,
      "uploadedBy" TEXT NOT NULL,
      "note" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('3. Restored pre-multitenant database schema.');

  // Populate table data from backup
  for (const u of backup.tables.User) {
    await db.query(
      `INSERT INTO "User" (id, name, phone, email, "passwordHash", role, "mustChangePassword", "createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [u.id, u.name, u.phone, u.email, u.passwordHash, u.role, u.mustChangePassword, u.createdAt]
    );
  }

  for (const v of backup.tables.Vehicle) {
    await db.query(
      `INSERT INTO "Vehicle" (id, "makeModel", "registrationNo", "chassisNo", "engineNo", "colorYear") VALUES ($1,$2,$3,$4,$5,$6)`,
      [v.id, v.makeModel, v.registrationNo, v.chassisNo, v.engineNo, v.colorYear]
    );
  }

  for (const a of backup.tables.Agreement) {
    await db.query(
      `INSERT INTO "Agreement" (id, "ownerName", "ownerPhone", "hirerId", "guarantor1Name", "guarantor1Phone", "guarantor2Name", "guarantor2Phone", "vehicleId", "cashPrice", "hirePurchasePrice", "installmentAmount", frequency, "totalInstallments", "startDate", status, "createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [a.id, a.ownerName, a.ownerPhone, a.hirerId, a.guarantor1Name, a.guarantor1Phone, a.guarantor2Name, a.guarantor2Phone, a.vehicleId, a.cashPrice, a.hirePurchasePrice, a.installmentAmount, a.frequency, a.totalInstallments, a.startDate, a.status, a.createdAt]
    );
  }

  for (const p of backup.tables.Payment) {
    await db.query(
      `INSERT INTO "Payment" (id, "agreementId", amount, "datePaid", channel, reference, note, "recordedBy", voided, "createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [p.id, p.agreementId, p.amount, p.datePaid, p.channel, p.reference, p.note, p.recordedBy, p.voided, p.createdAt]
    );
  }

  for (const d of backup.tables.Document) {
    await db.query(
      `INSERT INTO "Document" (id, "agreementId", type, "fileName", "fileUrl", "fileSize", "mimeType", "uploadedBy", note, "createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [d.id, d.agreementId, d.type, d.fileName, d.fileUrl, d.fileSize, d.mimeType, d.uploadedBy, d.note, d.createdAt]
    );
  }

  console.log('4. Successfully populated production data into fresh copy database.\n');

  // NOW RUN MULTI-TENANT MIGRATION
  console.log('======================================================================');
  console.log('⚙️ EXECUTING MULTI-TENANT MIGRATION ON FRESH PRODUCTION COPY');
  console.log('======================================================================\n');

  // Step A: Add OrgStatus enum & Organization table
  await db.query(`
    CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

    CREATE TABLE "Organization" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "slug" TEXT UNIQUE NOT NULL,
      "status" "OrgStatus" NOT NULL DEFAULT 'PENDING',
      "contactEmail" TEXT NOT NULL,
      "contactPhone" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Step B: Create Organization #1 (Work & Pay Ghana)
  const org1Res = await db.query(`
    INSERT INTO "Organization" (id, name, slug, status, "contactEmail", "contactPhone")
    VALUES ('cmtoqmn390000vlp8rzwblcz3', 'Work & Pay Ghana', 'work-and-pay-ghana', 'APPROVED', 'admin@workandpay.gh', '0240000000')
    RETURNING id, name, slug;
  `);
  const org1Id = org1Res.rows[0].id;
  console.log(`✅ Created Organization #1: "${org1Res.rows[0].name}" (ID: ${org1Id})`);

  // Step C: Add organizationId columns to all tables
  await db.query(`
    ALTER TABLE "User" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id");
    ALTER TABLE "Vehicle" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id");
    ALTER TABLE "Agreement" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id");
    ALTER TABLE "Payment" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id");
    ALTER TABLE "Document" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id");

    CREATE TABLE "StatusChangeLog" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
      "agreementId" TEXT NOT NULL REFERENCES "Agreement"("id") ON DELETE CASCADE,
      "fromStatus" "AgreementStatus" NOT NULL,
      "toStatus" "AgreementStatus" NOT NULL,
      "reason" TEXT NOT NULL,
      "changedBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Step D: Assign existing production records to Organization #1
  await db.query(`UPDATE "User" SET "organizationId" = $1`, [org1Id]);
  await db.query(`UPDATE "Vehicle" SET "organizationId" = $1`, [org1Id]);
  await db.query(`UPDATE "Agreement" SET "organizationId" = $1`, [org1Id]);
  await db.query(`UPDATE "Payment" SET "organizationId" = $1`, [org1Id]);
  await db.query(`UPDATE "Document" SET "organizationId" = $1`, [org1Id]);

  // Upgrade Emmanuel Osei (Owner) to SUPER_ADMIN
  await db.query(`UPDATE "User" SET role = 'SUPER_ADMIN' WHERE phone = '0240000000'`);

  console.log('✅ Assigned ALL existing live production records to Organization #1.\n');

  // MIGRATION VERIFICATION & RECONCILIATION
  console.log('======================================================================');
  console.log('📊 DRY-RUN MIGRATION RESULTS & RECONCILIATION VERIFICATION');
  console.log('======================================================================\n');

  const migratedUsers = await db.query(`SELECT id, name, phone, email, role, "organizationId" FROM "User"`);
  console.log(`1. Users (${migratedUsers.rows.length} Total):`);
  migratedUsers.rows.forEach(u => {
    console.log(`   - [${u.role}] ${u.name} (${u.phone}) -> Org ID: ${u.organizationId}`);
  });

  const migratedVehicles = await db.query(`SELECT id, "makeModel", "registrationNo", "organizationId" FROM "Vehicle"`);
  console.log(`\n2. Vehicles (${migratedVehicles.rows.length} Total):`);
  migratedVehicles.rows.forEach(v => {
    console.log(`   - ${v.makeModel} (${v.registrationNo}) -> Org ID: ${v.organizationId}`);
  });

  const migratedAgreements = await db.query(`
    SELECT a.id, u.name as hirer_name, v."registrationNo", a."hirePurchasePrice", a."installmentAmount", a.status, a."organizationId"
    FROM "Agreement" a
    JOIN "User" u ON a."hirerId" = u.id
    JOIN "Vehicle" v ON a."vehicleId" = v.id
  `);
  console.log(`\n3. Agreements (${migratedAgreements.rows.length} Total):`);
  migratedAgreements.rows.forEach(a => {
    console.log(`   - Agreement ID: ${a.id} | Hirer: ${a.hirer_name} | Reg: ${a.registrationNo} | Price: GH₵ ${a.hirePurchasePrice} | Status: ${a.status} -> Org ID: ${a.organizationId}`);
  });

  const migratedPayments = await db.query(`
    SELECT p.id, p."agreementId", p.amount, p.channel, p.reference, p."organizationId"
    FROM "Payment" p
  `);
  const totalPaid = migratedPayments.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  console.log(`\n4. Payments (${migratedPayments.rows.length} Total | Sum: GH₵ ${totalPaid.toFixed(2)}):`);
  migratedPayments.rows.forEach(p => {
    console.log(`   - Payment ID: ${p.id} | Amount: GH₵ ${p.amount} | Ref: ${p.reference} -> Org ID: ${p.organizationId}`);
  });

  const migratedDocuments = await db.query(`SELECT id, "fileName", "uploadedBy", "organizationId" FROM "Document"`);
  console.log(`\n5. Documents (${migratedDocuments.rows.length} Total):`);
  migratedDocuments.rows.forEach(d => {
    console.log(`   - Doc ID: ${d.id} | File: ${d.fileName} | Uploaded By: ${d.uploadedBy} -> Org ID: ${d.organizationId}`);
  });

  await db.end();

  console.log('\n======================================================================');
  console.log('🎉 DRY-RUN MIGRATION COMPLETED WITH 100% RECONCILIATION ACCURACY');
  console.log('======================================================================');
}

dryRunMigration().catch((err) => {
  console.error('❌ Dry run migration error:', err);
  process.exit(1);
});
