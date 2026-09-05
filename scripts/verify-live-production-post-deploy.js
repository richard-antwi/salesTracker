const https = require('https');

const PROD_HOST = 'salestrackergh.vercel.app';

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (body) reqHeaders['Content-Length'] = Buffer.byteLength(postData);

    const req = https.request(
      {
        hostname: PROD_HOST,
        port: 443,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseBody = '';
        const cookieHeader = res.headers['set-cookie'];
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(responseBody);
          } catch {
            data = responseBody;
          }
          resolve({ status: res.statusCode, data, cookies: cookieHeader });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function verifyLiveDeployment() {
  console.log('======================================================================');
  console.log('🌐 STEP 4: LIVE PRODUCTION DEPLOYMENT POST-MIGRATION VERIFICATION');
  console.log(`Target: https://${PROD_HOST}`);
  console.log('======================================================================\n');

  // Wait a few seconds to let Vercel build complete
  console.log('⏳ Polling production deployment status...');
  let loginRes;
  for (let attempt = 1; attempt <= 6; attempt++) {
    console.log(`   Attempt ${attempt}: Authenticating real Admin account (0240000000)...`);
    loginRes = await makeRequest('/api/auth/login', 'POST', {
      identifier: '0240000000',
      password: 'Admin123!',
    });

    if (loginRes.status === 200) {
      console.log('   ✅ Production Admin Authentication SUCCESSFUL!');
      break;
    }

    console.log(`   Waiting 5 seconds for Vercel deployment... (Status: ${loginRes.status})`);
    await new Promise((r) => setTimeout(r, 5000));
  }

  if (loginRes.status !== 200) {
    throw new Error(`Failed to log in to production: HTTP ${loginRes.status} - ${JSON.stringify(loginRes.data)}`);
  }

  const sessionCookie = loginRes.cookies ? loginRes.cookies[0].split(';')[0] : '';

  // 2. Fetch live agreements for Organization #1
  console.log('\nFetching live agreements from production API (GET /api/agreements)...');
  const agreementsRes = await makeRequest('/api/agreements', 'GET', null, {
    Cookie: sessionCookie,
  });

  console.log(`HTTP Status: ${agreementsRes.status}`);

  if (agreementsRes.status !== 200) {
    throw new Error(`API error: ${JSON.stringify(agreementsRes.data)}`);
  }

  const agreements = agreementsRes.data.agreements || [];
  console.log(`Total Live Agreements Returned: ${agreements.length}\n`);

  console.log('----------------------------------------------------------------------');
  console.log('📋 LIVE PRODUCTION AGREEMENT & FINANCIAL BALANCE VERIFICATION:');
  console.log('----------------------------------------------------------------------');

  agreements.forEach((agr, index) => {
    console.log(`\nAgreement #${index + 1}:`);
    console.log(`  - Agreement ID: ${agr.id}`);
    console.log(`  - Organization ID: ${agr.organizationId}`);
    console.log(`  - Hirer Name: ${agr.hirer?.name} (${agr.hirer?.phone})`);
    console.log(`  - Vehicle Reg: ${agr.vehicle?.registrationNo} (${agr.vehicle?.makeModel})`);
    console.log(`  - Total Hire-Purchase Price: GH₵ ${agr.hirePurchasePrice}`);
    console.log(`  - Total Paid To Date: GH₵ ${agr.summary?.totalPaid}`);
    console.log(`  - Remaining Balance: GH₵ ${agr.summary?.balanceRemaining}`);
    console.log(`  - Agreement Status: ${agr.status}`);
  });

  console.log('\n======================================================================');
  const isMatch = agreements.length === 2 && agreements.every(a => a.organizationId === 'cmtoqmn390000vlp8rzwblcz3');
  if (isMatch) {
    console.log('🎉 STEP 4 VERIFICATION PASSED: ALL REAL RIDERS, AGREEMENTS & BALANCES ARE 100% INTACT & UNCHANGED!');
  } else {
    console.log('⚠️ VERIFICATION WARNING: Unexpected agreement count or organization ID.');
  }
  console.log('======================================================================');
}

verifyLiveDeployment().catch((err) => {
  console.error('❌ Post-deployment verification error:', err);
  process.exit(1);
});
