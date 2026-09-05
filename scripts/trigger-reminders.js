const http = require('http');

async function triggerCron() {
  console.log('🔔 Triggering Work & Pay Due-Date Reminders & Overdue Alerts Cron Job...');

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3005,
        path: '/api/cron/reminders',
        method: 'GET',
        headers: {
          Authorization: 'Bearer work_and_pay_cron_secret_2026',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          console.log('Status Code:', res.statusCode);
          console.log('Cron Response:', data);
          resolve();
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.end();
  });
}

triggerCron().catch(console.error);
