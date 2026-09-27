require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"Work & Pay Ghana" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // send to self for testing
      subject: 'Test Email Configuration',
      text: 'If you receive this, the email configuration is working.',
    });
    console.log('Success:', info.messageId);
  } catch (err) {
    console.error('Email error:', err);
  }
}
testEmail();
