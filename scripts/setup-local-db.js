const { Client } = require('pg');

async function main() {
  // Common default local postgres credentials
  const defaultUrls = [
    'postgresql://postgres:postgres@localhost:5432/postgres',
    'postgresql://postgres:admin@localhost:5432/postgres',
    'postgresql://postgres:root@localhost:5432/postgres',
    'postgresql://postgres@localhost:5432/postgres'
  ];

  let connectedClient = null;
  let workingUrl = null;

  for (const url of defaultUrls) {
    try {
      const client = new Client({ connectionString: url });
      await client.connect();
      connectedClient = client;
      workingUrl = url;
      break;
    } catch (err) {
      // ignore and try next
    }
  }

  if (!connectedClient) {
    console.error('Could not connect to local Postgres with default credentials.');
    process.exit(1);
  }

  console.log('Connected to local Postgres at:', workingUrl);

  try {
    const res = await connectedClient.query("SELECT 1 FROM pg_database WHERE datname = 'salestracker_multitenant_dev'");
    if (res.rowCount === 0) {
      await connectedClient.query('CREATE DATABASE salestracker_multitenant_dev');
      console.log('Created local database salestracker_multitenant_dev');
    } else {
      console.log('Database salestracker_multitenant_dev already exists.');
    }
  } catch (err) {
    console.error('Error creating database:', err.message);
  } finally {
    await connectedClient.end();
  }
}

main();
