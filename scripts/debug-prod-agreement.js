const { Client } = require('pg');

const PROD_DB_URL = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:cQ%24X%214yiUQ%2332hY@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function debugAgreement() {
  const client = new Client({ connectionString: PROD_DB_URL });
  await client.connect();

  console.log('--- Checking Agreement cmtokerqf000cvlvw7wtqt05g ---');
  const agr = await client.query(`SELECT * FROM "Agreement" WHERE id = 'cmtokerqf000cvlvw7wtqt05g'`);
  console.log('Agreement row:', agr.rows[0]);

  console.log('--- Checking StatusChangeLog table ---');
  try {
    const logs = await client.query(`SELECT * FROM "StatusChangeLog" WHERE "agreementId" = 'cmtokerqf000cvlvw7wtqt05g'`);
    console.log('StatusChangeLog rows:', logs.rows);
  } catch (err) {
    console.error('StatusChangeLog query error:', err.message);
  }

  console.log('--- Checking Payments ---');
  const payments = await client.query(`SELECT * FROM "Payment" WHERE "agreementId" = 'cmtokerqf000cvlvw7wtqt05g'`);
  console.log('Payments count:', payments.rows.length);

  await client.end();
}

debugAgreement().catch(console.error);
