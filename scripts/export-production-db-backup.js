const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROD_DB_URL = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:cQ%24X%214yiUQ%2332hY@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';
const BACKUP_PATH_PROJECT = path.join(__dirname, '..', 'backups', 'production_db_backup_pre_multitenant.json');
const BACKUP_PATH_ARTIFACTS = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\87bc0194-e431-4ed5-b6d6-eb7d190cfbf7\\production_db_backup_pre_multitenant.json';

async function exportProductionData() {
  console.log('📦 Starting FULL PRODUCTION DATABASE BACKUP...');
  console.log(`Connecting to live production database at Supabase...`);

  const client = new Client({ connectionString: PROD_DB_URL });
  await client.connect();

  console.log('✅ Connected to production PostgreSQL.');

  const backupData = {
    exportedAt: new Date().toISOString(),
    sourceDatabase: 'salestrackergh_production (Supabase jhxctmcjbjkicgrlzftr)',
    tables: {},
  };

  // List of tables to back up (case sensitive per Prisma quote rules if necessary)
  const tables = ['User', 'Vehicle', 'Agreement', 'Payment', 'StatusChangeLog', 'Document'];

  for (const table of tables) {
    try {
      const res = await client.query(`SELECT * FROM "${table}"`);
      backupData.tables[table] = res.rows;
      console.log(`   - Table "${table}": ${res.rows.length} records backed up.`);
    } catch (err) {
      console.error(`⚠️ Could not backup table "${table}":`, err.message);
      backupData.tables[table] = [];
    }
  }

  await client.end();

  // Create backups directory if it doesn't exist
  const backupsDir = path.dirname(BACKUP_PATH_PROJECT);
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const jsonString = JSON.stringify(backupData, null, 2);

  // Write to project backups directory
  fs.writeFileSync(BACKUP_PATH_PROJECT, jsonString, 'utf8');
  console.log(`\n💾 Project Backup Saved to: ${BACKUP_PATH_PROJECT}`);

  // Write to artifacts directory
  const artifactsDir = path.dirname(BACKUP_PATH_ARTIFACTS);
  if (fs.existsSync(artifactsDir)) {
    fs.writeFileSync(BACKUP_PATH_ARTIFACTS, jsonString, 'utf8');
    console.log(`💾 Artifacts Backup Saved to: ${BACKUP_PATH_ARTIFACTS}`);
  }

  console.log('\n======================================================================');
  console.log('✅ PRODUCTION DATABASE BACKUP COMPLETED SUCCESSFULLY');
  console.log(`Total File Size: ${(Buffer.byteLength(jsonString) / 1024).toFixed(2)} KB`);
  console.log('======================================================================');
}

exportProductionData().catch((err) => {
  console.error('❌ Error exporting production backup:', err);
  process.exit(1);
});
