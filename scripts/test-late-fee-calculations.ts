import { calculateContractLateFee, calculateAgreementSummary } from '../src/lib/calculations';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runLateFeeTests() {
  console.log('--------------------------------------------------');
  console.log('🧪 RUNNING PHASE 1: LATE FEE PENALTY TEST SUITE');
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

  // Unit Test 1: Disabled late fee returns 0
  const feeDisabled = calculateContractLateFee({
    enableLateFee: false,
    lateFeeType: 'FLAT',
    lateFeeAmount: 50,
    gracePeriodDays: 7,
    daysOverdue: 20,
    installmentAmount: 300,
    periodDays: 7,
  });
  assert(feeDisabled === 0, 'Late fee disabled returns GH₵ 0 even when 20 days overdue');

  // Unit Test 2: Within grace period returns 0
  const feeInGrace = calculateContractLateFee({
    enableLateFee: true,
    lateFeeType: 'FLAT',
    lateFeeAmount: 50,
    gracePeriodDays: 7,
    daysOverdue: 5,
    installmentAmount: 300,
    periodDays: 7,
  });
  assert(feeInGrace === 0, 'Late fee within 7-day grace period returns GH₵ 0');

  // Unit Test 3: FLAT late fee calculation (1 period overdue = GH₵ 50)
  const feeFlat1 = calculateContractLateFee({
    enableLateFee: true,
    lateFeeType: 'FLAT',
    lateFeeAmount: 50,
    gracePeriodDays: 7,
    daysOverdue: 10, // 3 days past grace period => 1 week period
    installmentAmount: 300,
    periodDays: 7,
  });
  assert(feeFlat1 === 50, `FLAT fee (1 period late) expected GH₵ 50, got GH₵ ${feeFlat1}`);

  // Unit Test 4: PERCENTAGE late fee calculation (2 periods overdue @ 5% of GH₵ 300 = GH₵ 30)
  const feePercent2 = calculateContractLateFee({
    enableLateFee: true,
    lateFeeType: 'PERCENTAGE',
    lateFeeAmount: 5, // 5%
    gracePeriodDays: 7,
    daysOverdue: 20, // 13 days past grace period => 2 week periods
    installmentAmount: 300,
    periodDays: 7,
  });
  assert(feePercent2 === 30, `PERCENTAGE fee (2 periods late @ 5% of 300) expected GH₵ 30, got GH₵ ${feePercent2}`);

  // Integration Test: Database Persistence & Summary calculation
  try {
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.log('  ⚠️ Skipping DB integration test (no organization found in dev DB)');
    } else {
      const user = await prisma.user.findFirst({ where: { role: 'RIDER' } });
      const vehicle = await prisma.vehicle.findFirst({ where: { agreement: null } });

      if (user && vehicle) {
        const testAgreement = await prisma.agreement.create({
          data: {
            organizationId: org.id,
            ownerName: 'Test Owner',
            ownerPhone: '0240001122',
            hirerId: user.id,
            vehicleId: vehicle.id,
            cashPrice: 10000,
            hirePurchasePrice: 14000,
            installmentAmount: 300,
            frequency: 'WEEKLY',
            totalInstallments: 46,
            startDate: new Date('2024-01-01'),
            enableLateFee: true,
            lateFeeType: 'FLAT',
            lateFeeAmount: 50,
            gracePeriodDays: 7,
          },
        });

        const summary = calculateAgreementSummary(testAgreement);
        assert(summary.enableLateFee === true, 'Database agreement correctly loaded enableLateFee = true');
        assert(summary.lateFeeAmount === 50, 'Database agreement correctly loaded lateFeeAmount = 50');

        // Clean up test record
        await prisma.agreement.delete({ where: { id: testAgreement.id } });
        console.log('  🧹 Cleaned up temporary test agreement from DB');
      }
    }
  } catch (err: any) {
    console.error('  ⚠️ DB Integration test error:', err.message);
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

runLateFeeTests();
