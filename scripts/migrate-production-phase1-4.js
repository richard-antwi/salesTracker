const { Client } = require('pg');

const PROD_DB_URL = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:cQ%24X%214yiUQ%2332hY@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function migrateProductionPhase1To4() {
  console.log('======================================================================');
  console.log('🚀 EXECUTING PHASE 1-4 SCHEMA MIGRATION ON LIVE PRODUCTION SUPABASE DB');
  console.log('======================================================================\n');

  const client = new Client({ connectionString: PROD_DB_URL });
  await client.connect();
  console.log('✅ Connected to live production Supabase PostgreSQL database.');

  try {
    await client.query('BEGIN');

    console.log('1. Adding contract penalty columns to Agreement table...');
    await client.query(`
      ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "enableLateFee" BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "lateFeeType" TEXT NOT NULL DEFAULT 'FLAT';
      ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "lateFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
      ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "gracePeriodDays" INTEGER NOT NULL DEFAULT 7;
    `);

    await client.query('COMMIT');
    console.log('\n✅ Live Production PostgreSQL database schema migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Production database migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateProductionPhase1To4();
