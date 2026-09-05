const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateAgreementSummary } = require('../src/lib/calculations');

async function diagnose() {
  console.log('=== OVERDUE CALCULATION DIAGNOSTIC ===\n');
  const today = new Date();
  console.log('Today\'s Date (UTC):', today.toISOString().split('T')[0]);
  console.log('Today\'s Date (Local):', today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));

  const agreements = await prisma.agreement.findMany({
    include: {
      hirer: true,
      vehicle: true,
      payments: true,
    },
  });

  for (const agr of agreements) {
    const activePayments = agr.payments.filter((p) => !p.voided);
    const totalPaid = activePayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const summary = calculateAgreementSummary(agr);

    const startDate = new Date(agr.startDate);
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const periodDays = agr.frequency === 'WEEKLY' ? 7 : 30;
    const expectedInstallmentsSoFar = Math.min(agr.totalInstallments, Math.floor(daysSinceStart / periodDays));
    const expectedPaidSoFar = expectedInstallmentsSoFar * Number(agr.installmentAmount);
    const paidInstallmentCount = Math.floor(totalPaid / Math.max(1, Number(agr.installmentAmount)));

    console.log(`\n--------------------------------------------------`);
    console.log(`RIDER: ${agr.hirer.name} (${agr.hirer.phone})`);
    console.log(`VEHICLE: ${agr.vehicle.makeModel} (${agr.vehicle.registrationNo})`);
    console.log(`Start Date: ${startDate.toISOString().split('T')[0]}`);
    console.log(`Days Elapsed Since Start: ${daysSinceStart} days (${(daysSinceStart / periodDays).toFixed(1)} ${agr.frequency.toLowerCase()}s)`);
    console.log(`Installment Rate: GH₵ ${agr.installmentAmount} / ${agr.frequency.toLowerCase()}`);
    console.log(`Expected Paid So Far (${expectedInstallmentsSoFar} installments): GH₵ ${expectedPaidSoFar.toFixed(2)}`);
    console.log(`Actual Total Paid (${activePayments.length} valid payments): GH₵ ${totalPaid.toFixed(2)} (${paidInstallmentCount} full installments)`);
    console.log(`Paid Shortfall: GH₵ ${(expectedPaidSoFar - totalPaid).toFixed(2)}`);
    console.log(`Next Due Date: ${new Date(summary.nextDueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`);
    console.log(`Status Badge Label: "${summary.statusBadge.label}"`);
    console.log(`Days Overdue: ${summary.statusBadge.daysOverdue} days late`);
    console.log(`Bucket Category: ${summary.statusBadge.daysOverdue >= 7 ? 'RED (Severely Overdue >= 7 days)' : summary.statusBadge.daysOverdue >= 1 ? 'YELLOW (Overdue 1-6 days)' : 'ON TRACK'}`);
  }

  console.log('\n==================================================');
}

diagnose().catch(console.error).finally(() => prisma.$disconnect());
