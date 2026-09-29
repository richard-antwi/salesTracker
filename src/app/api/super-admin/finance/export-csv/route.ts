import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatCedi } from '@/lib/calculations';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const [subscriptionPayments, riderPayments, withdrawals] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        include: { organization: { select: { name: true, contactEmail: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.findMany({
        take: 1000,
        orderBy: { datePaid: 'desc' },
        include: {
          organization: { select: { name: true, payoutNetwork: true, payoutAccountNumber: true } },
          agreement: {
            select: {
              vehicle: { select: { registrationNo: true, makeModel: true } },
              hirer: { select: { name: true, phone: true } },
            },
          },
        },
      }),
      prisma.withdrawalRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: { name: true, payoutNetwork: true, payoutAccountName: true, payoutAccountNumber: true },
          },
        },
      }),
    ]);

    // Build CSV Content
    let csv = 'Transaction Type,Date,From (Payer / Source Account),To (Payee / Destination Account),Amount (GHS),Channel / Method,Reference / Audit Note,Status\n';

    // 1. SaaS Subscriptions
    subscriptionPayments.forEach((sp) => {
      const from = `Fleet Admin - ${sp.organization?.name || 'Organization'} (${sp.organization?.contactEmail || 'N/A'})`;
      const to = 'Work & Pay SaaS Platform Revenue Account';
      const amt = Number(sp.amount).toFixed(2);
      const date = new Date(sp.createdAt).toISOString();
      csv += `"SaaS Subscription Fee","${date}","${from}","${to}","${amt}","PAYSTACK MoMo/Card","${sp.reference}","${sp.status}"\n`;
    });

    // 2. Rider Collections
    riderPayments.forEach((p) => {
      if (p.voided) return;
      const hirerName = p.agreement?.hirer?.name || 'Rider';
      const hirerPhone = p.agreement?.hirer?.phone || 'N/A';
      const plate = p.agreement?.vehicle?.registrationNo || 'N/A';

      const from = p.payerAccount || `Rider: ${hirerName} (${hirerPhone})`;
      const to = p.payeeAccount || `Organization Escrow: ${p.organization?.name || 'Fleet'} [Vehicle: ${plate}]`;
      const amt = Number(p.amount).toFixed(2);
      const date = new Date(p.datePaid).toISOString();
      csv += `"Rider Collection","${date}","${from}","${to}","${amt}","${p.channel}","${p.reference || p.note || 'N/A'}","COMPLETED"\n`;
    });

    // 3. Fleet Owner Payout Withdrawals
    withdrawals.forEach((w) => {
      const net = w.organization?.payoutNetwork || 'MOMO';
      const name = w.organization?.payoutAccountName || w.organization?.name;
      const num = w.organization?.payoutAccountNumber || 'N/A';

      const from = w.sourceAccount || 'Work & Pay Platform Treasury Account';
      const to = w.destinationAccount || `Fleet Wallet: ${net} - ${name} (${num})`;
      const amt = Number(w.amount).toFixed(2);
      const date = new Date(w.createdAt).toISOString();
      csv += `"Fleet Payout Withdrawal","${date}","${from}","${to}","${amt}","BANK/MOMO DISBURSEMENT","${w.note || 'Payout Request'}","${w.status}"\n`;
    });

    const filename = `WorkAndPay-Financial-Audit-Report-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating financial CSV audit report:', error);
    return NextResponse.json({ error: 'Failed to generate financial audit export' }, { status: 500 });
  }
}
