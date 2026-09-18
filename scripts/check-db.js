const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  const users = await prisma.user.findMany();
  console.log('USERS IN DEV DB:', users.map((u) => ({ id: u.id, name: u.name, role: u.role, org: u.organizationId })));

  const orgs = await prisma.organization.findMany();
  console.log('ORGS IN DEV DB:', orgs.map((o) => ({ id: o.id, name: o.name, status: o.status })));

  const agreements = await prisma.agreement.findMany();
  console.log('AGREEMENTS IN DEV DB:', agreements.map((a) => ({ id: a.id, org: a.organizationId })));

  await prisma.$disconnect();
}

checkDb();
