const { Client } = require('pg');

async function runFor(url) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorCode" TEXT;`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorExpiresAt" TIMESTAMP(3);`);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Guarantor" (
        "id" TEXT NOT NULL,
        "agreementId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Guarantor_pkey" PRIMARY KEY ("id")
      );
    `);
    
    // Add foreign key only if it doesn't exist (can fail if already exists, so wrap in try-catch inside the query or just catch the specific error)
    try {
      await client.query(`
        ALTER TABLE "Guarantor" ADD CONSTRAINT "Guarantor_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
    } catch (e) {
      if (e.code !== '42710') { // 42710 is duplicate_object
        console.error('Error adding foreign key for Guarantor:', e);
      }
    }

    try {
      await client.query(`
        CREATE TABLE "Witness" (
            "id" TEXT NOT NULL,
            "agreementId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "phone" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "Witness_pkey" PRIMARY KEY ("id")
        );
      `);
    } catch (e) {
      if (e.code !== '42P07') { // 42P07 is duplicate_table
        console.error('Error creating Witness table:', e);
      }
    }

    try {
      await client.query(`
        ALTER TABLE "Witness" ADD CONSTRAINT "Witness_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
    } catch (e) {
      if (e.code !== '42710') { // 42710 is duplicate_object
        console.error('Error adding foreign key:', e);
      }
    }

    console.log('Successfully applied updates for URL:', url.substring(0, 30) + '...');
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
