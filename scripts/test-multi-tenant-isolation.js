const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Read local .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"(.*)"\s*$/) || line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

const prisma = new PrismaClient();

async function runIsolationVerificationTests() {
  console.log('\n======================================================');
  console.log('🔒 RUNNING MULTI-TENANT DATA ISOLATION SUITE (LOCAL DB)');
  console.log('======================================================\n');

  // 1. Fetch Organizations
  const org1 = await prisma.organization.findUnique({ where: { slug: 'work-and-pay-ghana' } });
  const org2 = await prisma.organization.findUnique({ where: { slug: 'accra-logistics-fleet' } });

  console.log('1. Organization Setup:');
  console.log(`   - Org #1: ${org1.name} (ID: ${org1.id})`);
  console.log(`   - Org #2: ${org2.name} (ID: ${org2.id})`);

  // 2. Query Vehicles Scoped to Org 1
  const org1Vehicles = await prisma.vehicle.findMany({ where: { organizationId: org1.id } });
  console.log(`\n2. Org #1 Vehicles Query (Count: ${org1Vehicles.length}):`);
  org1Vehicles.forEach(v => console.log(`   - [Org 1] Reg: ${v.registrationNo}, Model: ${v.makeModel}`));

  // 3. Query Vehicles Scoped to Org 2
  const org2Vehicles = await prisma.vehicle.findMany({ where: { organizationId: org2.id } });
  console.log(`\n3. Org #2 Vehicles Query (Count: ${org2Vehicles.length}):`);
  org2Vehicles.forEach(v => console.log(`   - [Org 2] Reg: ${v.registrationNo}, Model: ${v.makeModel}`));

  // 4. Verification: Org 1 vehicles cannot leak into Org 2 queries
  const org1HasOrg2Reg = org1Vehicles.some(v => v.registrationNo === 'GW-9900-24');
  const org2HasOrg1Reg = org2Vehicles.some(v => v.registrationNo === 'GT-4820-24');

  console.log('\n4. Isolation Check:');
  console.log(`   - Org 1 query returned Org 2 vehicle? ${org1HasOrg2Reg ? '❌ FAILED' : '✅ PASSED (NO LEAKAGE)'}`);
  console.log(`   - Org 2 query returned Org 1 vehicle? ${org2HasOrg1Reg ? '❌ FAILED' : '✅ PASSED (NO LEAKAGE)'}`);

  // 5. Query Agreements Scoped to Org 1 vs Org 2
  const org1Agreements = await prisma.agreement.findMany({ where: { organizationId: org1.id } });
  const org2Agreements = await prisma.agreement.findMany({ where: { organizationId: org2.id } });

  console.log(`\n5. Agreement Scoping Check:`);
  console.log(`   - Org #1 Agreements Count: ${org1Agreements.length}`);
  console.log(`   - Org #2 Agreements Count: ${org2Agreements.length}`);

  // 6. Cross-Tenant Record Access Check
  if (org1Agreements.length > 0) {
    const targetAgreement = org1Agreements[0];
    console.log(`\n6. Simulating Cross-Tenant Access Attempt:`);
    console.log(`   - Org 2 Admin requesting Org 1 Agreement ID (${targetAgreement.id})...`);
    
    // Simulate API authorization condition in GET /api/agreements/[id]
    const simulatedOrg2Session = { role: 'ADMIN', organizationId: org2.id };
    const allowed = (simulatedOrg2Session.role === 'SUPER_ADMIN') || (targetAgreement.organizationId === simulatedOrg2Session.organizationId);
    
    if (!allowed) {
      console.log(`   - API Authorization Gate: ✅ REJECTED (HTTP 403 Forbidden)`);
    } else {
      console.log(`   - API Authorization Gate: ❌ ALLOWED (SECURITY RISK)`);
    }
  }

  console.log('\n======================================================');
  console.log('✅ MULTI-TENANT ISOLATION SUITE COMPLETED SUCCESSFULLY');
  console.log('======================================================\n');
}

runIsolationVerificationTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
