const nodemailer = require('nodemailer');

async function testBrevo() {
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.BREVO_USER || 'b40022001@smtp-brevo.com',
      pass: process.env.BREVO_PASS || 'dummy',
    },
  });

  try {
    const info = await transporter.sendMail({
      from: '"Work & Pay Test" <b40022001@smtp-brevo.com>',
      to: 'richardantwi8888@gmail.com', 
      subject: 'Brevo SMTP Test',
      text: 'This is a test email to verify Brevo SMTP credentials.',
    });

    console.log('✅ Brevo SMTP is WORKING! Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Brevo SMTP Failed:', error.message);
  }
}

testBrevo();
