const net = require('net');

const targets = [
  { host: 'aws-0-eu-central-1.pooler.supabase.com', port: 6543 },
  { host: 'aws-0-eu-central-1.pooler.supabase.com', port: 5432 },
  { host: 'db.jhxctmcjbjkicgrlzftr.supabase.co', port: 5432 },
  { host: 'db.jhxctmcjbjkicgrlzftr.supabase.co', port: 6543 },
];

function checkTarget(target) {
  return new Promise((resolve) => {
    console.log(`Testing TCP connection to ${target.host}:${target.port}...`);
    const socket = new net.Socket();
    socket.setTimeout(4000);

    socket.on('connect', () => {
      console.log(`✅ REACHABLE: ${target.host}:${target.port}`);
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      console.log(`❌ TIMEOUT: ${target.host}:${target.port}`);
      socket.destroy();
      resolve(false);
    });

    socket.on('error', (err) => {
      console.log(`❌ ERROR on ${target.host}:${target.port} -> ${err.message}`);
      socket.destroy();
      resolve(false);
    });

    socket.connect(target.port, target.host);
  });
}

async function main() {
  for (const target of targets) {
    await checkTarget(target);
  }
}

main();
