const { Client } = require('pg');

const cs5432 = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:cQ%24X%214yiUQ%2332hY@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function test() {
  console.log('Testing session pooler port 5432 string:', cs5432);
  const client = new Client({ connectionString: cs5432 });
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ SUCCESS on port 5432 session pooler:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

test();
