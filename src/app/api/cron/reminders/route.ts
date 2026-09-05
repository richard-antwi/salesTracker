import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateAgreementSummary } from '@/lib/calculations';
import { notifications } from '@/lib/notifications';
import { CONFIG } from '@/lib/config';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (CONFIG.CRON_SECRET && authHeader !== `Bearer ${CONFIG.CRON_SECRET}`) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
      }
    }

    const agreements = await prisma.agreement.findMany({
      where: { status: 'ACTIVE' },
      include: {
        organization: true,
        hirer: true,
        vehicle: true,
        payments: true,
      },
    });

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let remindersSent = 0;
    let overdueAlertsSent = 0;

    for (const agr of agreements) {
      const summary = calculateAgreementSummary(agr);

      // Check if due date is tomorrow (within 24 hours)
      const nextDue = new Date(summary.nextDueDate);
      const isDueTomorrow =
        nextDue.getFullYear() === tomorrow.getFullYear() &&
        nextDue.getMonth() === tomorrow.getMonth() &&
        nextDue.getDate() === tomorrow.getDate();

      if (isDueTomorrow) {
        await notifications.sendDueDateReminder(
          agr.hirer,
          summary.nextDueDate,
          Number(agr.installmentAmount)
        );
        remindersSent++;
      }

      // Check if overdue
      if (
        summary.statusBadge.label === 'Overdue' ||
        summary.statusBadge.label === 'Severely Overdue'
      ) {
        // Send overdue notification to organization's contact email or fallback to global admin email
        const targetAdminEmail = agr.organization?.contactEmail || CONFIG.ADMIN_EMAIL;
        await notifications.sendOverdueAlert(
          targetAdminEmail,
          agr.hirer.name,
          agr.vehicle.registrationNo,
          summary.statusBadge.daysOverdue,
          summary.balanceRemaining
        );
        overdueAlertsSent++;
      }
    }

    return NextResponse.json({
      success: true,
      processedAgreements: agreements.length,
      remindersSent,
      overdueAlertsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error running cron reminders:', error);
    return NextResponse.json({ error: 'Failed to process reminders cron' }, { status: 500 });
  }
}
