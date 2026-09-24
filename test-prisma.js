const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function main() {
  const users = await prisma.user.findFirst();
  console.log('Success:', users ? true : false);
}
main().catch(console.error).finally(() => prisma.$disconnect());
