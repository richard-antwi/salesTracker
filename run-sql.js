const { Client } = require('pg');

async function runFor(url) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorCode" TEXT;`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorExpiresAt" TIMESTAMP(3);`);
    console.log('Successfully altered User table for URL:', url.substring(0, 30) + '...');
  } catch(e) {
    console.log(e);
  }
  await client.end();
}

async function run() {
  await runFor('postgresql://postgres:admin@localhost:5432/salestracker_multitenant_dev?schema=public');
  await runFor('postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true');
}

run().catch(console.error);
