import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { CONFIG } from './config';
import { formatCedi } from './calculations';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendSmsOptions {
  to: string;
  message: string;
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }>;
}

export interface SmsProvider {
  send(options: SendSmsOptions): Promise<{ success: boolean; id?: string; error?: string }>;
}

// 1. Gmail SMTP Email Provider (Active for direct inbox delivery without custom domain)
// Note: Gmail free tier caps at ~500 emails/day. Sender display shows user's Gmail address.
export class GmailSmtpEmailProvider implements EmailProvider {
  private transporter: Transporter | null = null;

  constructor() {
    if (CONFIG.GMAIL_USER && CONFIG.GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: CONFIG.GMAIL_USER,
          pass: CONFIG.GMAIL_APP_PASSWORD,
        },
      });
    }
  }

  async send({ to, subject, html, text }: SendEmailOptions) {
    if (!this.transporter || !CONFIG.GMAIL_USER || !CONFIG.GMAIL_APP_PASSWORD) {
      console.log(`\n📧 [EMAIL FALLBACK / DEV MODE]`);
      console.log(`   To: ${to}`);
      console.log(`   From: ${CONFIG.GMAIL_USER || CONFIG.EMAIL_FROM_ADDRESS}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Text Body: ${text || html.replace(/<[^>]+>/g, '')}`);
      console.log(`--------------------------------------------------\n`);
      return { success: true, id: 'fallback-dev-id' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"Work & Pay" <${CONFIG.GMAIL_USER}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ''),
      });

      console.log(`✅ [GMAIL SMTP LIVE] Email sent to ${to} (MessageID: ${info.messageId})`);
      return { success: true, id: info.messageId };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown Gmail SMTP Error';
      console.error('Gmail SMTP Exception:', errMsg);
      return { success: false, error: errMsg };
    }
  }
}

// 2. Resend Email Provider (Retained as backup option)
export class ResendEmailProvider implements EmailProvider {
  private resend: Resend | null = null;

  constructor() {
    if (CONFIG.RESEND_API_KEY) {
      this.resend = new Resend(CONFIG.RESEND_API_KEY);
    }
  }

  async send({ to, subject, html, text }: SendEmailOptions) {
    if (!this.resend || !CONFIG.RESEND_API_KEY) {
      console.log(`\n📧 [EMAIL FALLBACK / DEV MODE]`);
      console.log(`   To: ${to}`);
      console.log(`   From: ${CONFIG.EMAIL_FROM_ADDRESS}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Text Body: ${text || html.replace(/<[^>]+>/g, '')}`);
      console.log(`--------------------------------------------------\n`);
      return { success: true, id: 'fallback-dev-id' };
    }

    try {
      const response = await this.resend.emails.send({
        from: CONFIG.EMAIL_FROM_ADDRESS,
        to: [to],
        subject,
        html,
        text,
      });

      if (response.error) {
        console.error('Resend Email Error:', response.error);
        return { success: false, error: response.error.message };
      }

      console.log(`✅ [RESEND EMAIL LIVE] Sent to ${to} (ID: ${response.data?.id})`);
      return { success: true, id: response.data?.id };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown Resend Error';
      console.error('Resend Email Exception:', errMsg);
      return { success: false, error: errMsg };
    }
  }
}

// 3. Africa's Talking SMS Provider (Stubbed by default via SMS_ENABLED)
export class AfricasTalkingSmsProvider implements SmsProvider {
  async send({ to, message }: SendSmsOptions) {
    if (!CONFIG.SMS_ENABLED) {
      console.log(`📱 [SMS STUB] Would have sent to ${to} : ${message}`);
      return { success: true, id: 'sms-stub-id' };
    }

    try {
      const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          apiKey: CONFIG.AFRICAS_TALKING_API_KEY,
        },
        body: new URLSearchParams({
          username: CONFIG.AFRICAS_TALKING_USERNAME,
          to,
          message,
        }),
      });

      const data = await response.json();
      console.log(`✅ [AFRICA'S TALKING SMS LIVE] Sent to ${to}`);
      return { success: true, id: JSON.stringify(data) };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown Africa\'s Talking Error';
      console.error('Africa\'s Talking Error:', errMsg);
      return { success: false, error: errMsg };
    }
  }
}

// 4. Facade Notification Service (Defaults to GmailSmtpEmailProvider)
export class NotificationService {
  private emailProvider: EmailProvider;
  private smsProvider: SmsProvider;

  constructor(
    emailProvider: EmailProvider = new GmailSmtpEmailProvider(),
    smsProvider: SmsProvider = new AfricasTalkingSmsProvider()
  ) {
    this.emailProvider = emailProvider;
    this.smsProvider = smsProvider;
  }

  // Trigger 1: Payment Recorded
  async sendPaymentReceived(
    rider: { name: string; email?: string | null; phone: string },
    payment: { amount: number; channel: string },
    balanceRemaining: number
  ) {
    const formattedAmount = formatCedi(payment.amount);
    const formattedBalance = formatCedi(balanceRemaining);
    const textMsg = `Hello ${rider.name}, ${formattedAmount} received via ${payment.channel}. Balance now ${formattedBalance}. Thank you! - Work & Pay`;

    // 1. Send SMS (or Log SMS Stub)
    await this.smsProvider.send({
      to: rider.phone,
      message: textMsg,
    });

    // 2. Send Email if rider has an email address
    if (rider.email) {
      const htmlMsg = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #ffffff;">
          <h2 style="color: #059669; margin-top: 0;">Payment Received</h2>
          <p>Hello <strong>${rider.name}</strong>,</p>
          <p>We have successfully recorded your hire-purchase payment:</p>
          <ul style="background: #f8fafc; padding: 16px; border-radius: 8px; list-style: none;">
            <li><strong>Amount Received:</strong> ${formattedAmount}</li>
            <li><strong>Payment Channel:</strong> ${payment.channel}</li>
            <li><strong>New Remaining Balance:</strong> ${formattedBalance}</li>
          </ul>
          <p style="color: #64748b; font-size: 13px;">Thank you for your prompt payment!</p>
        </div>
      `;
      await this.emailProvider.send({
        to: rider.email,
        subject: `Payment Receipt: ${formattedAmount} Received - Work & Pay`,
        html: htmlMsg,
        text: textMsg,
      });
    }
  }

  // Trigger 2: Due Date Reminder (1 day before due date)
  async sendDueDateReminder(
    rider: { name: string; email?: string | null; phone: string },
    dueDate: Date,
    installmentAmount: number
  ) {
    const formattedDate = new Date(dueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const formattedAmount = formatCedi(installmentAmount);
    const textMsg = `Reminder: Hello ${rider.name}, your hire-purchase payment of ${formattedAmount} is due tomorrow (${formattedDate}). Please pay via MoMo/Cash. - Work & Pay`;

    await this.smsProvider.send({ to: rider.phone, message: textMsg });

    if (rider.email) {
      const htmlMsg = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #ffffff;">
          <h2 style="color: #d97706; margin-top: 0;">Upcoming Payment Reminder</h2>
          <p>Hello <strong>${rider.name}</strong>,</p>
          <p>This is a friendly reminder that your next motorcycle installment is due tomorrow:</p>
          <ul style="background: #fffbeb; padding: 16px; border-radius: 8px; list-style: none; border: 1px solid #fef3c7;">
            <li><strong>Due Date:</strong> ${formattedDate}</li>
            <li><strong>Amount Due:</strong> ${formattedAmount}</li>
          </ul>
          <p style="color: #64748b; font-size: 13px;">Please make your payment via Mobile Money or Cash to stay on track.</p>
        </div>
      `;
      await this.emailProvider.send({
        to: rider.email,
        subject: `Upcoming Payment Due Reminder (${formattedAmount}) - Work & Pay`,
        html: htmlMsg,
        text: textMsg,
      });
    }
  }

  // Trigger 3: Overdue Alert (Sent to Admin/Owner)
  async sendOverdueAlert(
    adminEmail: string,
    hirerName: string,
    vehicleReg: string,
    daysOverdue: number,
    balanceRemaining: number
  ) {
    const formattedBalance = formatCedi(balanceRemaining);
    const subject = `⚠️ Overdue Alert: ${hirerName} (${vehicleReg}) is ${daysOverdue} days late`;
    const textMsg = `Admin Alert: Rider ${hirerName} (Vehicle: ${vehicleReg}) is ${daysOverdue} days overdue on payment. Remaining balance: ${formattedBalance}.`;

    const htmlMsg = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; background: #fff5f5;">
        <h2 style="color: #dc2626; margin-top: 0;">Overdue Payment Alert</h2>
        <p>Attention Admin,</p>
        <p>The following hire-purchase agreement has been flagged as <strong>Overdue</strong>:</p>
        <ul style="background: #ffffff; padding: 16px; border-radius: 8px; list-style: none; border: 1px solid #fee2e2;">
          <li><strong>Rider Name:</strong> ${hirerName}</li>
          <li><strong>Vehicle Reg:</strong> ${vehicleReg}</li>
          <li><strong>Days Overdue:</strong> ${daysOverdue} days late</li>
          <li><strong>Outstanding Balance:</strong> ${formattedBalance}</li>
        </ul>
        <p style="color: #7f1d1d; font-size: 13px;">Please check the Admin Dashboard to follow up with the rider.</p>
      </div>
    `;

    await this.emailProvider.send({
      to: adminEmail,
      subject,
      html: htmlMsg,
      text: textMsg,
    });
  }

  // Trigger 4: Fully Paid Milestone (Sent to both Rider and Admin)
  async sendFullyPaidMilestone(
    rider: { name: string; email?: string | null; phone: string },
    adminEmail: string,
    hirerName: string,
    vehicleReg: string
  ) {
    const riderText = `CONGRATULATIONS ${rider.name}! Your motorcycle (${vehicleReg}) is FULLY PAID OFF! The owner will begin DVLA ownership transfer. - Work & Pay`;
    const adminText = `MILESTONE: Rider ${hirerName} (${vehicleReg}) has fully paid off their agreement! Please initiate DVLA ownership transfer per contract.`;

    // Notify Rider via SMS
    await this.smsProvider.send({ to: rider.phone, message: riderText });

    // Notify Rider via Email
    if (rider.email) {
      const riderHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; background: #f0fdf4;">
          <h1 style="color: #15803d; margin-top: 0;">🎉 Congratulations!</h1>
          <p>Hello <strong>${rider.name}</strong>,</p>
          <p>You have officially completed all hire-purchase payments for motorcycle <strong>${vehicleReg}</strong>!</p>
          <p>Your vehicle balance is now <strong>GH₵ 0.00</strong>. Per your contract, the owner has been notified to start the DVLA ownership transfer to your name.</p>
          <p style="color: #166534; font-size: 13px; font-weight: bold;">Thank you for being a valued rider!</p>
        </div>
      `;
      await this.emailProvider.send({
        to: rider.email,
        subject: `🎉 Fully Paid Milestone Reached! (${vehicleReg}) - Work & Pay`,
        html: riderHtml,
        text: riderText,
      });
    }

    // Notify Admin via Email
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; background: #ffffff;">
        <h2 style="color: #059669; margin-top: 0;">Agreement Completed: DVLA Transfer Required</h2>
        <p>Hello Owner/Admin,</p>
        <p>Rider <strong>${hirerName}</strong> has made their final payment for motorcycle <strong>${vehicleReg}</strong>.</p>
        <p style="background: #f1f5f9; padding: 12px; border-radius: 6px;">
          <strong>Action Required:</strong> Initiate DVLA ownership transfer per Section 3/Section 8 of the paper contract.
        </p>
      </div>
    `;

    await this.emailProvider.send({
      to: adminEmail,
      subject: `MILESTONE: Agreement Completed for ${hirerName} (${vehicleReg})`,
      html: adminHtml,
      text: adminText,
    });
  }

  // Trigger 5: Status Changed (DEFAULTED / REPOSSESSED / ACTIVE)
  async sendAgreementStatusChangedNotification(
    rider: { name: string; email?: string | null; phone: string },
    vehicleReg: string,
    newStatus: string,
    reason: string
  ) {
    if (newStatus === 'DEFAULTED') {
      const smsText = `Hello ${rider.name}, your Work & Pay agreement for motorcycle ${vehicleReg} has been updated to Defaulted due to missed payments. We understand challenges happen — please contact management as soon as possible to review payment options. - Work & Pay`;
      
      await this.smsProvider.send({ to: rider.phone, message: smsText });

      if (rider.email) {
        const htmlMsg = `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #fde68a; border-radius: 12px; padding: 24px; background: #fffbeb;">
            <h2 style="color: #b45309; margin-top: 0;">Important Notice: Agreement Status Update</h2>
            <p>Hello <strong>${rider.name}</strong>,</p>
            <p>We are reaching out regarding your hire-purchase agreement for motorcycle <strong>${vehicleReg}</strong>. Your agreement status has been updated to <strong>Defaulted</strong> following missed scheduled payments.</p>
            <div style="background: #ffffff; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Details/Reason:</strong> ${reason}</p>
            </div>
            <p>We recognize that unexpected financial difficulties can occur, and we want to work with you to find a workable solution. Please contact management at your earliest convenience so we can discuss options to get your payment plan back on track.</p>
            <p style="color: #78350f; font-size: 13px; margin-top: 24px;">Thank you for your cooperation.<br/><strong>Work & Pay Team</strong></p>
          </div>
        `;
        await this.emailProvider.send({
          to: rider.email,
          subject: `Important Notice Regarding Your Work & Pay Agreement (${vehicleReg})`,
          html: htmlMsg,
          text: smsText,
        });
      }
    } else if (newStatus === 'REPOSSESSED') {
      // POST-RECOVERY NOTICE: Fires after physical vehicle retrieval has occurred
      const smsText = `Hello ${rider.name}, motorcycle ${vehicleReg} has been recovered and updated to Repossessed status. Reason: ${reason}. Please contact management immediately to discuss account settlement. - Work & Pay`;

      await this.smsProvider.send({ to: rider.phone, message: smsText });

      if (rider.email) {
        const htmlMsg = `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; background: #f8fafc;">
            <h2 style="color: #334155; margin-top: 0;">Notice of Vehicle Repossession</h2>
            <p>Hello <strong>${rider.name}</strong>,</p>
            <p>This notice confirms that motorcycle <strong>${vehicleReg}</strong> has been recovered by management and its agreement status updated to <strong>Repossessed</strong>.</p>
            <div style="background: #ffffff; border-left: 4px solid #64748b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0; color: #334155; font-size: 14px;"><strong>Reason for Repossession:</strong> ${reason}</p>
            </div>
            <p>Please reach out to management promptly to review your account balance, discuss settlement options, and clarify next steps regarding your agreement.</p>
            <p style="color: #475569; font-size: 13px; margin-top: 24px;">Work & Pay Management</p>
          </div>
        `;
        await this.emailProvider.send({
          to: rider.email,
          subject: `Notice of Vehicle Repossession & Account Status (${vehicleReg}) - Work & Pay`,
          html: htmlMsg,
          text: smsText,
        });
      }
    }
  }
}

export const notifications = new NotificationService();
