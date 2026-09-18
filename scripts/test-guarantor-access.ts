import { PrismaClient } from '@prisma/client';
import { calculateAgreementSummary } from '../src/lib/calculations';

const prisma = new PrismaClient();

async function runGuarantorTests() {
  console.log('--------------------------------------------------');
  console.log('🧪 RUNNING PHASE 2: GUARANTOR PORTAL TEST SUITE');
  console.log('--------------------------------------------------\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, message: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ TEST ${totalCount} PASSED: ${message}`);
      passedCount++;
    } else {
      console.error(`  ❌ TEST ${totalCount} FAILED: ${message}`);
    }
  }

  try {
    const org = await prisma.organization.findFirst();
    assert(!!org, 'Dev DB contains at least one Organization');

    if (org) {
      // 1. Create a test Guarantor user
      const guarantorPhone = '0209998877';
      let guarantorUser = await prisma.user.findUnique({ where: { phone: guarantorPhone } });
      if (!guarantorUser) {
        guarantorUser = await prisma.user.create({
          data: {
            organizationId: org.id,
            name: 'Kofi Guarantor',
            phone: guarantorPhone,
            passwordHash: 'dummyhash',
            role: 'GUARANTOR',
          },
        });
      }

      // 2. Create a test Hirer user & Vehicle
      const hirerUser = await prisma.user.findFirst({ where: { role: 'RIDER' } });
      const vehicle = await prisma.vehicle.findFirst({ where: { agreement: null } });

      assert(!!hirerUser && !!vehicle, 'Found available Rider and Vehicle in DB');

      if (hirerUser && vehicle) {
        // 3. Create test agreement linked to this guarantor's phone
        const testAgreement = await prisma.agreement.create({
          data: {
            organizationId: org.id,
            ownerName: 'Emmanuel Owner',
            ownerPhone: '0240000000',
            hirerId: hirerUser.id,
            vehicleId: vehicle.id,
            guarantor1Name: 'Kofi Guarantor',
            guarantor1Phone: guarantorPhone,
            cashPrice: 12000,
            hirePurchasePrice: 16000,
            installmentAmount: 320,
            frequency: 'WEEKLY',
            totalInstallments: 50,
            startDate: new Date('2024-02-01'),
            enableLateFee: true,
            lateFeeType: 'FLAT',
            lateFeeAmount: 40,
            gracePeriodDays: 7,
          },
          include: {
            hirer: true,
            vehicle: true,
            payments: true,
          },
        });

        // 4. Query DB mimicking Guarantor API logic
        const guarantorAgreements = await prisma.agreement.findMany({
          where: {
            organizationId: org.id,
            OR: [
              { guarantor1Phone: guarantorPhone },
              { guarantor2Phone: guarantorPhone },
            ],
          },
          include: {
            hirer: { select: { id: true, name: true, phone: true } },
            vehicle: true,
            payments: { where: { voided: false } },
          },
        });

        assert(guarantorAgreements.length > 0, 'Guarantor query returned linked agreement');
        assert(guarantorAgreements[0].hirer.name === hirerUser.name, 'Guarantor can view correct Hirer name');
        assert(guarantorAgreements[0].vehicle.makeModel === vehicle.makeModel, 'Guarantor can view correct Vehicle make & model');

        const summary = calculateAgreementSummary(guarantorAgreements[0]);
        assert(summary.hirePurchasePrice === 16000, 'Guarantor summary calculates total price (GH₵ 16,000)');

        // 5. Test negative isolation (Unlinked phone number returns 0 agreements)
        const unlinkedAgreements = await prisma.agreement.findMany({
          where: {
            organizationId: org.id,
            OR: [
              { guarantor1Phone: '0000000000' },
              { guarantor2Phone: '0000000000' },
            ],
          },
        });
        assert(unlinkedAgreements.length === 0, 'Unlinked phone number receives 0 agreements (Tenant & Guarantor Isolation)');

        // Cleanup
        await prisma.agreement.delete({ where: { id: testAgreement.id } });
        await prisma.user.delete({ where: { id: guarantorUser.id } });
        console.log('  🧹 Cleaned up temporary Guarantor test records');
      }
    }
  } catch (err: any) {
    console.error('  ❌ DB Error:', err.message);
  }

  console.log('\n--------------------------------------------------');
  console.log(`📊 RESULTS: ${passedCount} / ${totalCount} tests passed`);
  console.log('--------------------------------------------------\n');

  await prisma.$disconnect();
  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runGuarantorTests();
