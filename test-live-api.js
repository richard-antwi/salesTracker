async function testLiveApi() {
  const response = await fetch('https://salestrackergh.vercel.app/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier: 'richardrichfavourantwi88@gmail.com'
    })
  });
  
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
}

testLiveApi();
