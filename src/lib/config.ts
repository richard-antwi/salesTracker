export const CONFIG = {
  APP_NAME: 'Work & Pay',
  CURRENCY_SYMBOL: 'GH₵',
  CURRENCY_CODE: 'GHS',
  GRACE_PERIOD_DAYS: parseInt(process.env.GRACE_PERIOD_DAYS || '7', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'work_and_pay_fallback_dev_secret_2026',
  DEFAULT_PAYMENT_CHANNEL: 'MOMO' as const,
  PAYMENT_CHANNELS: ['MOMO', 'CASH', 'BANK'] as const,

  // Gmail SMTP Notification Configuration
  // Note: Gmail free tier caps at ~500 emails/day. Sender display shows user's Gmail address.
  GMAIL_USER: process.env.GMAIL_USER || '',
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD || '',

  // Legacy Resend Config (Retained for backup)
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'Work & Pay <onboarding@resend.dev>',

  // SMS Configuration (Africa's Talking Stub)
  SMS_ENABLED: process.env.SMS_ENABLED === 'true',
  AFRICAS_TALKING_API_KEY: process.env.AFRICAS_TALKING_API_KEY || '',
  AFRICAS_TALKING_USERNAME: process.env.AFRICAS_TALKING_USERNAME || 'sandbox',

  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@workandpay.gh',
  CRON_SECRET: process.env.CRON_SECRET || 'work_and_pay_cron_secret_2026',
};
