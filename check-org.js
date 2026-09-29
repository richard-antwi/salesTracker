const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function main() {
  const rider = await prisma.user.findUnique({ where: { phone: '0550000001' } });
  const admin = await prisma.user.findUnique({ where: { phone: '0550000000' } });
  console.log('Rider Org ID:', rider.organizationId);
  console.log('Admin Org ID:', admin.organizationId);
  console.log('Are they the same?', rider.organizationId === admin.organizationId);
}
main();
