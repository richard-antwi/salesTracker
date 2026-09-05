import { CONFIG } from './config';

export interface PaymentSummary {
  hirePurchasePrice: number;
  totalPaid: number;
  balanceRemaining: number;
  percentComplete: number;
  scheduledFinishDate: Date;
  actualPaceFinishDate: Date;
  nextDueDate: Date;
  statusBadge: {
    label: 'On Track' | 'Overdue' | 'Severely Overdue' | 'Completed' | 'Defaulted' | 'Repossessed';
    variant: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'slate';
    daysOverdue: number;
  };
}

/**
 * TODO: Late Fee / Penalty Calculation Plugin Point
 * Note: Automatic late fee logic is intentionally omitted per business specification.
 * When enabling penalty rules later, calculate fees based on daysOverdue beyond grace period.
 */
export function calculateLateFeePlaceholder(daysOverdue: number, installmentAmount: number): number {
  // Currently returns 0 (No fee added to current balances)
  if (daysOverdue <= CONFIG.GRACE_PERIOD_DAYS) return 0;
  // Placeholder formula for future penalty rules (e.g. 5% fee per overdue week)
  return 0;
}

export function formatCedi(amount: unknown): string {
  const numeric = typeof amount === 'number' ? amount : Number(amount || 0);
  const safeNum = isNaN(numeric) ? 0 : numeric;
  return `${CONFIG.CURRENCY_SYMBOL} ${safeNum.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function calculateAgreementSummary(agreement: {
  startDate: Date | string;
  hirePurchasePrice: unknown;
  installmentAmount: unknown;
  frequency: 'WEEKLY' | 'MONTHLY';
  totalInstallments: number;
  status?: string;
  payments?: Array<{ amount: unknown; voided: boolean; datePaid: Date | string }>;
}): PaymentSummary {
  const startDate = new Date(agreement.startDate);
  const today = new Date();

  const hirePurchasePrice = Number(agreement.hirePurchasePrice || 0);
  const installmentAmount = Number(agreement.installmentAmount || 0);

  // Active (non-voided) payments sum
  const activePayments = (agreement.payments || []).filter((p) => !p.voided);
  const totalPaid = activePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Balance & % Complete
  const rawBalance = hirePurchasePrice - totalPaid;
  const balanceRemaining = Math.max(0, rawBalance);
  const percentComplete = Math.min(100, Math.max(0, (totalPaid / Math.max(1, hirePurchasePrice)) * 100));

  // Period duration in days
  const periodDays = agreement.frequency === 'WEEKLY' ? 7 : 30;

  // 1. Scheduled Finish Date
  const scheduledDaysTotal = agreement.totalInstallments * periodDays;
  const scheduledFinishDate = new Date(startDate.getTime() + scheduledDaysTotal * 24 * 60 * 60 * 1000);

  // 2. Next Due Date (Based on number of full installments paid so far)
  const paidInstallmentCount = Math.floor(totalPaid / Math.max(1, installmentAmount));
  const nextDueDateDays = (paidInstallmentCount + 1) * periodDays;
  const nextDueDate = new Date(startDate.getTime() + nextDueDateDays * 24 * 60 * 60 * 1000);

  // 3. Actual Pace Finish Date
  let actualPaceFinishDate: Date;
  if (balanceRemaining <= 0) {
    const lastPaymentDate = activePayments.length > 0
      ? new Date(Math.max(...activePayments.map((p) => new Date(p.datePaid).getTime())))
      : today;
    actualPaceFinishDate = lastPaymentDate;
  } else if (totalPaid <= 0) {
    actualPaceFinishDate = new Date(scheduledFinishDate);
  } else {
    const elapsedMs = Math.max(1, today.getTime() - startDate.getTime());
    const elapsedDays = Math.max(1, elapsedMs / (24 * 60 * 60 * 1000));
    const elapsedPeriods = Math.max(0.1, elapsedDays / periodDays);

    const avgPaymentPerPeriod = totalPaid / elapsedPeriods;
    const remainingPeriods = balanceRemaining / Math.max(1, avgPaymentPerPeriod);

    const remainingMs = remainingPeriods * periodDays * 24 * 60 * 60 * 1000;
    actualPaceFinishDate = new Date(today.getTime() + remainingMs);
  }

  // 4. Overdue & Special Status Detection Logic
  let statusBadge: PaymentSummary['statusBadge'];
  if (agreement.status === 'DEFAULTED') {
    statusBadge = {
      label: 'Defaulted',
      variant: 'purple',
      daysOverdue: 0,
    };
  } else if (agreement.status === 'REPOSSESSED') {
    statusBadge = {
      label: 'Repossessed',
      variant: 'slate',
      daysOverdue: 0,
    };
  } else if (balanceRemaining <= 0 || agreement.status === 'COMPLETED') {
    statusBadge = {
      label: 'Completed',
      variant: 'info',
      daysOverdue: 0,
    };
  } else {
    const msPerDay = 24 * 60 * 60 * 1000;
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const nextDueMidnight = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth(), nextDueDate.getDate());

    const diffDays = Math.floor((todayMidnight.getTime() - nextDueMidnight.getTime()) / msPerDay);

    if (diffDays <= 0) {
      statusBadge = {
        label: 'On Track',
        variant: 'success',
        daysOverdue: 0,
      };
    } else {
      if (diffDays >= CONFIG.GRACE_PERIOD_DAYS) {
        statusBadge = {
          label: 'Severely Overdue',
          variant: 'danger',
          daysOverdue: diffDays,
        };
      } else {
        statusBadge = {
          label: 'Overdue',
          variant: 'warning',
          daysOverdue: diffDays,
        };
      }
    }
  }

  return {
    hirePurchasePrice,
    totalPaid,
    balanceRemaining,
    percentComplete,
    scheduledFinishDate,
    actualPaceFinishDate,
    nextDueDate,
    statusBadge,
  };
}
