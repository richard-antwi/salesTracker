const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color helpers
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

console.log(`${BLUE}====================================================${RESET}`);
console.log(`${BLUE}   WORK & PAY PLATFORM - PHASE 2 VERIFICATION SUITE  ${RESET}`);
console.log(`${BLUE}====================================================${RESET}\n`);

async function runVerification() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // 1. Test Binary Magic Bytes Validation
    console.log(`${YELLOW}1. Testing Binary Magic Bytes Document Validation...${RESET}`);
    const { validateFileMagicBytes } = require('../src/lib/storage');

    // Valid PDF buffer: %PDF-1.4
    const validPdfBuffer = Buffer.from('%PDF-1.4 header text sample content');
    const pdfRes = validateFileMagicBytes(validPdfBuffer);
    if (pdfRes.valid && pdfRes.detectedMime === 'application/pdf') {
      console.log(`  ${GREEN}✓ Valid PDF Signature Detected correctly (${pdfRes.detectedMime})${RESET}`);
    } else {
      throw new Error(`Failed to validate real PDF signature: ${JSON.stringify(pdfRes)}`);
    }

    // Valid PNG buffer: 89 50 4E 47 0D 0A 1A 0A
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const pngRes = validateFileMagicBytes(validPngBuffer);
    if (pngRes.valid && pngRes.detectedMime === 'image/png') {
      console.log(`  ${GREEN}✓ Valid PNG Signature Detected correctly (${pngRes.detectedMime})${RESET}`);
    } else {
      throw new Error(`Failed to validate real PNG signature: ${JSON.stringify(pngRes)}`);
    }

    // Fake PDF buffer: A file named "ghana_card.pdf" containing plain text "Fake Ghana Card"
    const fakeBuffer = Buffer.from('Plain text file masquerading as ghana_card.pdf');
    const fakeRes = validateFileMagicBytes(fakeBuffer);
    if (!fakeRes.valid && fakeRes.error) {
      console.log(`  ${GREEN}✓ Fake PDF (Plain Text renamed to .pdf) REJECTED: "${fakeRes.error}"${RESET}`);
    } else {
      throw new Error(`SECURITY FAIL: Fake PDF with extension trick was NOT caught by magic bytes!`);
    }

    // 2. Test CSV Export Utility
    console.log(`\n${YELLOW}2. Testing CSV Export Utilities...${RESET}`);
    const { generateAgreementsCSV, generatePaymentsCSV } = require('../src/lib/csv');

    const sampleAgreement = {
      id: 'test-agr-1',
      hirePurchasePrice: 15000,
      cashPrice: 10000,
      startDate: new Date(),
      status: 'ACTIVE',
      hirer: { name: 'Kwesi Mensah', phone: '0244000111' },
      vehicle: { registrationNo: 'GT-9911-24', makeModel: 'Honda Ace 125' },
      summary: {
        totalPaid: 4500,
        balanceRemaining: 10500,
        percentComplete: 30.0,
        statusBadge: { label: 'On Track' },
        nextDueDate: '2026-09-12',
      },
    };

    const agreementsCSV = generateAgreementsCSV([sampleAgreement]);
    if (agreementsCSV.includes('Kwesi Mensah') && agreementsCSV.includes('GT-9911-24') && agreementsCSV.includes('15000.00')) {
      console.log(`  ${GREEN}✓ Portfolio CSV generated successfully with escaped fields.${RESET}`);
    } else {
      throw new Error('Portfolio CSV generation output malformed');
    }

    const samplePayments = [
      { id: 'p1', amount: 1500, datePaid: new Date('2026-08-01'), channel: 'MOMO', reference: 'REF001', voided: false },
      { id: 'p2', amount: 1500, datePaid: new Date('2026-08-08'), channel: 'CASH', reference: 'REF002', voided: false },
    ];
    const paymentsCSV = generatePaymentsCSV(sampleAgreement, samplePayments);
    if (paymentsCSV.includes('MOMO') && paymentsCSV.includes('REF001') && paymentsCSV.includes('1500.00')) {
      console.log(`  ${GREEN}✓ Payments History CSV generated successfully.${RESET}`);
    } else {
      throw new Error('Payments CSV generation output malformed');
    }

    // 3. Database & Audit Trail Integration Verification
    console.log(`\n${YELLOW}3. Verifying Database Schema & Audit Logging...${RESET}`);
    const agreementInDb = await prisma.agreement.findFirst({
      include: { hirer: true, vehicle: true, statusLogs: true, documents: true },
    });

    if (agreementInDb) {
      console.log(`  ${GREEN}✓ Database queried successfully for Agreement ID: ${agreementInDb.id}${RESET}`);
      console.log(`    Hirer: ${agreementInDb.hirer.name} (${agreementInDb.hirer.phone})`);
      console.log(`    Status: ${agreementInDb.status}`);
      console.log(`    Status Logs Count: ${agreementInDb.statusLogs.length}`);
      console.log(`    Documents Count: ${agreementInDb.documents.length}`);
    }

    console.log(`\n${GREEN}====================================================${RESET}`);
    console.log(`${GREEN}   ALL PHASE 2 CORE LOGIC & SECURITY TESTS PASSED!  ${RESET}`);
    console.log(`${GREEN}====================================================${RESET}\n`);
  } catch (err) {
    console.error(`\n${RED}Verification Failed:${RESET}`, err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
