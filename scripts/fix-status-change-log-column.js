const { Client } = require('pg');

const PROD_DB_URL = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:cQ%24X%214yiUQ%2332hY@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function fixStatusChangeLog() {
  console.log('⚡ Adding missing organizationId column to StatusChangeLog table on live Supabase Postgres...');
  const client = new Client({ connectionString: PROD_DB_URL });
  await client.connect();

  try {
    await client.query(`
      ALTER TABLE "StatusChangeLog" ADD COLUMN IF NOT EXISTS "organizationId" TEXT REFERENCES "Organization"("id");
    `);

    // Set default org for existing status logs
    const orgRes = await client.query(`SELECT id FROM "Organization" WHERE slug = 'work-and-pay-ghana'`);
    if (orgRes.rows.length > 0) {
      const orgId = orgRes.rows[0].id;
      await client.query(`UPDATE "StatusChangeLog" SET "organizationId" = $1 WHERE "organizationId" IS NULL`, [orgId]);
    }

    console.log('✅ Successfully added organizationId column to StatusChangeLog table!');
  } catch (err) {
    console.error('❌ Error fixing StatusChangeLog:', err);
  } finally {
    await client.end();
  }
}

fixStatusChangeLog();
