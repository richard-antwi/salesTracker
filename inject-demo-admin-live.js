const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function main() {
  const bcrypt = require('bcryptjs');
  
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-fleet' },
    update: {},
    create: {
      name: 'Demo Fleet Sandbox',
      slug: 'demo-fleet',
      status: 'APPROVED',
      contactEmail: 'demo@workandpay.gh',
      contactPhone: '0550000000',
      subscriptionStatus: 'TRIAL',
      trialEndsAt: new Date(new Date().setDate(new Date().getDate() + 14)),
    }
  });

  const passwordHash = await bcrypt.hash('DEMO', 10);

  const demoUser = await prisma.user.upsert({
    where: { phone: '0550000000' },
    update: { role: 'ADMIN', organizationId: org.id },
    create: {
      organizationId: org.id,
      name: 'Demo Admin',
      phone: '0550000000',
      email: 'admin@demo.com',
      passwordHash,
      role: 'ADMIN',
      mustChangePassword: false,
    }
  });
  console.log('Created/Updated Demo Admin live:', demoUser.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
