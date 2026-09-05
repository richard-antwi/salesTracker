const { PrismaClient } = require('@prisma/client');
const { calculateAgreementSummary } = require('../src/lib/calculations');

const PROD_URL = 'postgresql://postgres:cQ%24X%214yiUQ%2332hY@db.jhxctmcjbjkicgrlzftr.supabase.co:5432/postgres?sslmode=require';

const prisma = new PrismaClient({
  datasources: {
    db: { url: PROD_URL },
  },
});

async function testQuery() {
  console.log('--- Querying Prisma on Live Database ---');
  try {
    const rawAgreement = await prisma.agreement.findUnique({
      where: { id: 'cmtokerqf000cvlvw7wtqt05g' },
      include: {
        hirer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        vehicle: true,
        payments: {
          orderBy: { datePaid: 'desc' },
        },
        statusLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    console.log('✅ findUnique succeeded!');
    console.log('rawAgreement hirer:', rawAgreement.hirer);
    console.log('rawAgreement vehicle:', rawAgreement.vehicle);
    console.log('rawAgreement payments count:', rawAgreement.payments.length);

    console.log('--- Testing calculateAgreementSummary ---');
    const summary = calculateAgreementSummary(rawAgreement);
    console.log('✅ summary calculated:', summary);

    console.log('--- Testing agreement object assembly ---');
    const agreement = {
      ...rawAgreement,
      statusLogs: (rawAgreement.statusLogs || []).map((log) => ({
        ...log,
        previousStatus: log.fromStatus,
        newStatus: log.toStatus,
        changedBy: { name: log.changedBy },
      })),
      summary,
    };

    console.log('--- Testing JSON serialization ---');
    const jsonStr = JSON.stringify({ agreement });
    console.log('✅ JSON serialization succeeded! Bytes:', jsonStr.length);

  } catch (err) {
    console.error('❌ ERROR AT STEP:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
