const { Client } = require('pg');

const PROD_DB_URL = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:cQ%24X%214yiUQ%2332hY@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function migrateLiveProduction() {
  console.log('======================================================================');
  console.log('🚀 EXECUTING MULTI-TENANT MIGRATION ON LIVE PRODUCTION SUPABASE DB');
  console.log('======================================================================\n');

  const client = new Client({ connectionString: PROD_DB_URL });
  await client.connect();
  console.log('✅ Connected to live production Supabase PostgreSQL database.');

  try {
    // 1. Add SUPER_ADMIN enum value outside transaction (PostgreSQL requirement)
    console.log('1. Upgrading Role enum in PostgreSQL...');
    await client.query(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`);

    await client.query('BEGIN');

    // 2. Add OrgStatus enum & Organization table if not exists
    console.log('2. Creating Organization table & OrgStatus enum...');
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrgStatus') THEN
          CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS "Organization" (
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

    // 3. Create Organization #1 (Work & Pay Ghana)
    console.log('3. Provisioning Organization #1 (Work & Pay Ghana)...');
    const orgRes = await client.query(`
      INSERT INTO "Organization" (id, name, slug, status, "contactEmail", "contactPhone")
      VALUES ('cmtoqmn390000vlp8rzwblcz3', 'Work & Pay Ghana', 'work-and-pay-ghana', 'APPROVED', 'admin@workandpay.gh', '0240000000')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status
      RETURNING id;
    `);
    const org1Id = orgRes.rows[0].id;
    console.log(`   Organization #1 ID: ${org1Id}`);

    // 4. Add organizationId columns to existing tables if missing
    console.log('4. Adding organizationId scoping columns across tables...');
    await client.query(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationId" TEXT REFERENCES "Organization"("id");
      ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "organizationId" TEXT REFERENCES "Organization"("id");
      ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "organizationId" TEXT REFERENCES "Organization"("id");
      ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "organizationId" TEXT REFERENCES "Organization"("id");
      ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "organizationId" TEXT REFERENCES "Organization"("id");

      CREATE TABLE IF NOT EXISTS "StatusChangeLog" (
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

    // 5. Update existing records to link to Organization #1
    console.log('5. Scoping all existing production records to Organization #1...');
    await client.query(`UPDATE "User" SET "organizationId" = $1 WHERE "organizationId" IS NULL`, [org1Id]);
    await client.query(`UPDATE "Vehicle" SET "organizationId" = $1 WHERE "organizationId" IS NULL`, [org1Id]);
    await client.query(`UPDATE "Agreement" SET "organizationId" = $1 WHERE "organizationId" IS NULL`, [org1Id]);
    await client.query(`UPDATE "Payment" SET "organizationId" = $1 WHERE "organizationId" IS NULL`, [org1Id]);
    await client.query(`UPDATE "Document" SET "organizationId" = $1 WHERE "organizationId" IS NULL`, [org1Id]);

    // 6. Upgrade Emmanuel Osei (Owner) account to SUPER_ADMIN
    console.log('6. Upgrading Emmanuel Osei account to SUPER_ADMIN...');
    await client.query(`UPDATE "User" SET role = 'SUPER_ADMIN' WHERE phone = '0240000000'`);

    await client.query('COMMIT');
    console.log('✅ Live production database transaction COMMITTED successfully!');

    // 7. Verify production database record counts
    console.log('\n======================================================================');
    console.log('📊 LIVE PRODUCTION DATABASE MIGRATION VERIFICATION');
    console.log('======================================================================');
    const usersCount = await client.query(`SELECT COUNT(*) FROM "User" WHERE "organizationId" = $1`, [org1Id]);
    const vehiclesCount = await client.query(`SELECT COUNT(*) FROM "Vehicle" WHERE "organizationId" = $1`, [org1Id]);
    const agreementsCount = await client.query(`SELECT COUNT(*) FROM "Agreement" WHERE "organizationId" = $1`, [org1Id]);
    const paymentsCount = await client.query(`SELECT COUNT(*) FROM "Payment" WHERE "organizationId" = $1`, [org1Id]);
    const documentsCount = await client.query(`SELECT COUNT(*) FROM "Document" WHERE "organizationId" = $1`, [org1Id]);

    console.log(`   - Users Scoped to Org #1: ${usersCount.rows[0].count}`);
    console.log(`   - Vehicles Scoped to Org #1: ${vehiclesCount.rows[0].count}`);
    console.log(`   - Agreements Scoped to Org #1: ${agreementsCount.rows[0].count}`);
    console.log(`   - Payments Scoped to Org #1: ${paymentsCount.rows[0].count}`);
    console.log(`   - Documents Scoped to Org #1: ${documentsCount.rows[0].count}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, transaction ROLLED BACK:', err);
    throw err;
  } finally {
    await client.end();
  }
}

migrateLiveProduction().catch((err) => {
  console.error('❌ Fatal production migration error:', err);
  process.exit(1);
});
