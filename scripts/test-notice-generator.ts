import { PrismaClient } from '@prisma/client';
import { calculateAgreementSummary } from '../src/lib/calculations';
import { generateLegalNoticePDFBuffer } from '../src/lib/pdf-generator';

const prisma = new PrismaClient();

async function runNoticeGeneratorTests() {
  console.log('--------------------------------------------------');
  console.log('🧪 RUNNING PHASE 3: LEGAL NOTICE PDF TEST SUITE');
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
    const agreement = await prisma.agreement.findFirst({
      include: {
        hirer: true,
        vehicle: true,
      },
    });

    assert(!!agreement, 'Found an active agreement in dev DB for PDF generation test');

    if (agreement) {
      const summary = calculateAgreementSummary(agreement);
      const fullAgreement = {
        ...agreement,
        summary,
      };

      // 1. Test Default Notice PDF Buffer Generation
      const defaultPdfBuffer = await generateLegalNoticePDFBuffer(fullAgreement, 'DEFAULT');
      assert(Buffer.isBuffer(defaultPdfBuffer), 'Default Notice returned valid Node.js Buffer');
      assert(defaultPdfBuffer.length > 1000, `Default Notice PDF size is valid (${defaultPdfBuffer.length} bytes)`);
      const defaultHeader = defaultPdfBuffer.toString('utf-8', 0, 5);
      assert(defaultHeader === '%PDF-', 'Default Notice PDF header magic bytes valid (%PDF-)');

      // 2. Test Repossession Notice PDF Buffer Generation
      const repossessionPdfBuffer = await generateLegalNoticePDFBuffer(fullAgreement, 'REPOSSESSION');
      assert(Buffer.isBuffer(repossessionPdfBuffer), 'Repossession Notice returned valid Node.js Buffer');
      assert(repossessionPdfBuffer.length > 1000, `Repossession Notice PDF size is valid (${repossessionPdfBuffer.length} bytes)`);
      const repossessionHeader = repossessionPdfBuffer.toString('utf-8', 0, 5);
      assert(repossessionHeader === '%PDF-', 'Repossession Notice PDF header magic bytes valid (%PDF-)');
    }
  } catch (err: any) {
    console.error('  ❌ Notice PDF Generation Error:', err.message);
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

runNoticeGeneratorTests();
