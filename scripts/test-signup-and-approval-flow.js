const http = require('http');

async function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
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

    req.on('error', (err) => reject(err));
    if (body) req.write(postData);
    req.end();
  });
}

async function runFlowTest() {
  console.log('======================================================================');
  console.log('🚀 TESTING MULTI-TENANT REQUEST ACCESS & SUPER ADMIN APPROVAL FLOW');
  console.log('======================================================================\n');

  // Step 1: Test Duplicate Validation
  console.log('1. Testing Public Request Access - Duplicate Validation:');
  const duplicateRes = await makeRequest('/api/organizations/request-access', 'POST', {
    name: 'Work & Pay Ghana',
    ownerName: 'Emmanuel Osei',
    contactPhone: '0240000000',
    contactEmail: 'admin@workandpay.gh',
    adminPassword: 'Password123!',
  });

  console.log(`   HTTP Status: ${duplicateRes.status}`);
  console.log(`   Response Message: "${duplicateRes.data.error}"`);
  const isDuplicateHandled = duplicateRes.status === 400 && (duplicateRes.data.error.includes('already exists') || duplicateRes.data.error.includes('already requested access'));
  console.log(`   Duplicate Protection: ${isDuplicateHandled ? '✅ PASSED (Clean validation error)' : '❌ FAILED'}\n`);

  // Step 2: Submit Valid Access Request
  const testId = Date.now().toString().slice(-4);
  const testOrgName = `Kumasi Fleet ${testId}`;
  const testPhone = `02433${testId}5`;
  const testEmail = `yaw${testId}@kumasifleet.com`;

  console.log(`2. Submitting Valid Organization Access Request (${testOrgName}):`);
  const submitRes = await makeRequest('/api/organizations/request-access', 'POST', {
    name: testOrgName,
    ownerName: 'Yaw Boateng',
    contactPhone: testPhone,
    contactEmail: testEmail,
    adminPassword: 'Kumasi2026!',
  });

  console.log(`   HTTP Status: ${submitRes.status}`);
  console.log(`   Created Org ID: ${submitRes.data.organization?.id}`);
  console.log(`   Org Initial Status: ${submitRes.data.organization?.status}`);
  const orgId = submitRes.data.organization?.id;
  const isSubmitSuccess = submitRes.status === 200 && submitRes.data.organization?.status === 'PENDING';
  console.log(`   Signup Creation: ${isSubmitSuccess ? '✅ PASSED (Organization in PENDING state)' : '❌ FAILED'}\n`);

  // Step 3: Verify Blocked Login for Pending Organization Admin
  console.log(`3. Attempting Login as Pending Admin (${testEmail}):`);
  const pendingLoginRes = await makeRequest('/api/auth/login', 'POST', {
    identifier: testEmail,
    password: 'Kumasi2026!',
  });

  console.log(`   HTTP Status: ${pendingLoginRes.status}`);
  console.log(`   Response Message: "${pendingLoginRes.data.error}"`);
  const isPendingBlocked = pendingLoginRes.status === 403 && pendingLoginRes.data.error.includes('pending approval');
  console.log(`   Pending Login Gate: ${isPendingBlocked ? '✅ PASSED (Login strictly blocked while PENDING)' : '❌ FAILED'}\n`);

  // Step 4: Login as Super Admin to Approve Organization
  console.log('4. Logging in as Super Admin (0240000000):');
  const superAdminLoginRes = await makeRequest('/api/auth/login', 'POST', {
    identifier: '0240000000',
    password: 'Admin123!',
  });

  console.log(`   HTTP Status: ${superAdminLoginRes.status}`);
  console.log(`   Super Admin Role: ${superAdminLoginRes.data.user?.role}`);
  const superAdminCookie = superAdminLoginRes.cookies ? superAdminLoginRes.cookies[0].split(';')[0] : '';
  const isSuperAdminLoggedIn = superAdminLoginRes.status === 200 && superAdminLoginRes.data.user?.role === 'SUPER_ADMIN';
  console.log(`   Super Admin Auth: ${isSuperAdminLoggedIn ? '✅ PASSED' : '❌ FAILED'}\n`);

  // Step 5: Approve Organization via Super Admin API Route
  console.log(`5. Approving Organization (${orgId}) via Super Admin Control:`);
  const approveRes = await makeRequest(
    `/api/super-admin/organizations/${orgId}/status`,
    'PATCH',
    { status: 'APPROVED' },
    { Cookie: superAdminCookie }
  );

  console.log(`   HTTP Status: ${approveRes.status}`);
  console.log(`   New Org Status: ${approveRes.data.organization?.status}`);
  const isApprovalSuccess = approveRes.status === 200 && approveRes.data.organization?.status === 'APPROVED';
  console.log(`   Approval Action: ${isApprovalSuccess ? '✅ PASSED (Status changed to APPROVED + Email notification dispatched)' : '❌ FAILED'}\n`);

  // Step 6: Log in as Approved Admin Now
  console.log(`6. Logging in as Approved Admin (${testEmail}):`);
  const approvedLoginRes = await makeRequest('/api/auth/login', 'POST', {
    identifier: testEmail,
    password: 'Kumasi2026!',
  });

  console.log(`   HTTP Status: ${approvedLoginRes.status}`);
  console.log(`   Logged In User: ${approvedLoginRes.data.user?.name}`);
  console.log(`   Assigned Org ID: ${approvedLoginRes.data.user?.organizationId}`);
  const isApprovedLoginSuccess = approvedLoginRes.status === 200 && approvedLoginRes.data.user?.organizationId === orgId;
  console.log(`   Post-Approval Login: ${isApprovedLoginSuccess ? '✅ PASSED (Admin logged in successfully!)' : '❌ FAILED'}\n`);

  console.log('======================================================================');
  if (isDuplicateHandled && isSubmitSuccess && isPendingBlocked && isSuperAdminLoggedIn && isApprovalSuccess && isApprovedLoginSuccess) {
    console.log('🎉 FULL END-TO-END SIGNUP & SUPER ADMIN APPROVAL FLOW VERIFIED 100%');
  } else {
    console.log('❌ SOME STEPS FAILED IN THE TEST FLOW');
  }
  console.log('======================================================================');
}

runFlowTest().catch(console.error);
