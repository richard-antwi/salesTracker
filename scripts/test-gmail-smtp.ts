import { GmailSmtpEmailProvider } from '../src/lib/notifications';
import { CONFIG } from '../src/lib/config';

// Set process env dynamically for test execution
process.env.GMAIL_USER = 'richardrichfavourantwi88@gmail.com';
process.env.GMAIL_APP_PASSWORD = 'zygoomyauepofzvc';

// Reload CONFIG dynamically
CONFIG.GMAIL_USER = 'richardrichfavourantwi88@gmail.com';
CONFIG.GMAIL_APP_PASSWORD = 'zygoomyauepofzvc';

async function main() {
  console.log('Testing Live Gmail SMTP Delivery...');
  console.log(`From: ${CONFIG.GMAIL_USER}`);
  
  const recipient = process.argv[2] || 'richardantwi8888@gmail.com';
  console.log(`To: ${recipient}`);

  const provider = new GmailSmtpEmailProvider();
  const result = await provider.send({
    to: recipient,
    subject: '🎉 Work & Pay Platform: Production Gmail SMTP Test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #10b981; border-radius: 12px; padding: 24px; background: #f0fdf4;">
        <h2 style="color: #047857; margin-top: 0;">✅ Gmail SMTP Verified!</h2>
        <p>Hello,</p>
        <p>This is an automated test email from the <strong>Work & Pay</strong> motorcycle hire-purchase platform in Ghana.</p>
        <p>Your Gmail App Password integration is working perfectly!</p>
        <hr style="border: 0; border-top: 1px solid #a7f3d0; margin: 16px 0;" />
        <p style="font-size: 12px; color: #065f46;">Sent via Nodemailer & Gmail SMTP (Free Tier - 500/day limit)</p>
      </div>
    `,
    text: 'Work & Pay Platform: Gmail SMTP integration successfully verified!',
  });

  if (result.success) {
    console.log(`\n🎉 SUCCESS! Email delivered to ${recipient}. Message ID: ${result.id}`);
  } else {
    console.error(`\n❌ FAILED to send email: ${result.error}`);
    process.exit(1);
  }
}

main();
