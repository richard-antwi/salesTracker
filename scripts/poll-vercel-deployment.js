const https = require('https');

function checkDeployment() {
  return new Promise((resolve) => {
    https.get('https://salestrackergh.vercel.app/login', (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const hasEyeIcon = body.includes('lucide-eye') || body.includes('Eye');
        const hasRequestAccess = body.includes('request-access');
        const vercelId = res.headers['x-vercel-id'];
        resolve({
          status: res.statusCode,
          hasEyeIcon,
          hasRequestAccess,
          vercelId,
        });
      });
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function poll() {
  console.log('======================================================================');
  console.log('⏳ POLLING VERCEL PRODUCTION DEPLOYMENT STATUS');
  console.log('======================================================================\n');

  for (let i = 1; i <= 10; i++) {
    const result = await checkDeployment();
    console.log(`Check #${i} [${new Date().toLocaleTimeString()}]:`);
    console.log(`  - HTTP Status: ${result.status}`);
    console.log(`  - Vercel Deployment ID: ${result.vercelId || 'N/A'}`);
    console.log(`  - Request Access Link Present: ${result.hasRequestAccess ? '✅ YES' : '❌ NO'}`);

    if (result.hasRequestAccess && result.status === 200) {
      console.log('\n======================================================================');
      console.log('🎉 VERCEL PRODUCTION DEPLOYMENT IS 100% READY AND LIVE!');
      console.log('======================================================================');
      return;
    }

    console.log('  - Deployment building/propagating... waiting 6 seconds...\n');
    await new Promise((r) => setTimeout(r, 6000));
  }
}

poll();
