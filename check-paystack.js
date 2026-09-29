const fetch = require('node-fetch');
async function test() {
  const secret = 'sk_test_5484299863bec7eff52f92b897317376775d32d9'; // From .env
  const ref = 'SUB_cmu9w112e0000vlro3tgja2dn_1790536833662';
  const response = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secret}`
    }
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
