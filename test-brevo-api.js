async function testBrevoApi() {
  const apiKey = process.env.BREVO_API_KEY || 'dummy';
  const email = process.env.ADMIN_EMAIL || 'test@example.com';

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Work & Pay Test', email: email },
      to: [{ email: email, name: 'Richard' }],
      subject: 'Brevo API Test',
      htmlContent: '<html><body><h1>This is a test from the Brevo API.</h1></body></html>'
    })
  });

  const data = await response.json();
  console.log('Brevo API Response Status:', response.status);
  console.log('Brevo API Response Body:', data);
}

testBrevoApi().catch(console.error);
