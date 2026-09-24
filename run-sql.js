const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SubscriptionPayment" (
          "id" TEXT NOT NULL,
          "organizationId" TEXT NOT NULL,
          "amount" DECIMAL(12,2) NOT NULL,
          "reference" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'SUCCESS',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
      );
    `);
    
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPayment_reference_key" ON "SubscriptionPayment"("reference");
    `);

    await client.query(`
      ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `);

    console.log('SubscriptionPayment table created successfully');
  } catch(e) {
    if (e.code === '42P07') {
      console.log('Table already exists');
    } else if (e.code === '42710') {
      console.log('Constraint already exists');
    } else {
      console.log(e);
    }
  }
  await client.end();
}

run().catch(console.error);
