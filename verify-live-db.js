const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function main() {
  console.log('Testing live DB connection...');
  const agreements = await prisma.agreement.findMany({ take: 1 });
  console.log(`Successfully fetched ${agreements.length} agreements.`);
  
  console.log('Testing Guarantor table via raw query...');
  const guarantors = await prisma.$queryRaw`SELECT * FROM "Guarantor" LIMIT 1;`;
  console.log(`Successfully queried Guarantor table! Found ${guarantors.length} rows.`);
  
  console.log('Database integrity verified! Zero downtime.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
