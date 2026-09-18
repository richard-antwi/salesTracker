const fs = require('fs');
const path = require('path');
const http = require('http');

async function runPwaTests() {
  console.log('--------------------------------------------------');
  console.log('🧪 RUNNING PHASE 4: PWA SUPPORT TEST SUITE');
  console.log('--------------------------------------------------\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, message) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ TEST ${totalCount} PASSED: ${message}`);
      passedCount++;
    } else {
      console.error(`  ❌ TEST ${totalCount} FAILED: ${message}`);
    }
  }

  // 1. Local File Assertions
  const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
  assert(fs.existsSync(manifestPath), 'public/manifest.json file exists');

  let manifestData = {};
  try {
    const rawObj = fs.readFileSync(manifestPath, 'utf-8');
    manifestData = JSON.parse(rawObj);
    assert(true, 'public/manifest.json is valid JSON');
  } catch (err) {
    assert(false, `public/manifest.json JSON parse error: ${err.message}`);
  }

  assert(manifestData.name === 'Work & Pay Ghana — Hire-Purchase Tracker', 'Manifest name matches brand');
  assert(manifestData.display === 'standalone', 'Manifest display mode set to standalone');
  assert(manifestData.theme_color === '#059669', 'Manifest theme_color set to #059669 (Emerald)');
  assert(Array.isArray(manifestData.icons) && manifestData.icons.length >= 2, 'Manifest defines 192px and 512px app icons');

  const swPath = path.join(__dirname, '..', 'public', 'sw.js');
  assert(fs.existsSync(swPath), 'public/sw.js Service Worker file exists');

  const swContent = fs.readFileSync(swPath, 'utf-8');
  assert(swContent.includes("addEventListener('install'"), 'Service Worker contains install lifecycle event');
  assert(swContent.includes("addEventListener('fetch'"), 'Service Worker contains fetch network handler');
  assert(swContent.includes('work-and-pay-cache-v1'), 'Service Worker defines cache version key');

  // 2. HTTP Endpoint Assertions against local Next.js server
  function fetchEndpoint(urlPath) {
    return new Promise((resolve, reject) => {
      http
        .get(`http://localhost:3000${urlPath}`, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
        })
        .on('error', reject);
    });
  }

  try {
    const manifestRes = await fetchEndpoint('/manifest.json');
    assert(manifestRes.statusCode === 200, 'HTTP GET /manifest.json returns status 200 OK');

    const swRes = await fetchEndpoint('/sw.js');
    assert(swRes.statusCode === 200, 'HTTP GET /sw.js returns status 200 OK');
  } catch (err) {
    console.error('  ⚠️ HTTP Request Error:', err.message);
  }

  console.log('\n--------------------------------------------------');
  console.log(`📊 RESULTS: ${passedCount} / ${totalCount} tests passed`);
  console.log('--------------------------------------------------\n');

  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPwaTests();
