import { CONFIG } from './config';

export interface PaymentSummary {
  hirePurchasePrice: number;
  totalPaid: number;
  balanceRemaining: number;
  enableLateFee: boolean;
  lateFeeType: 'FLAT' | 'PERCENTAGE';
  lateFeeAmount: number;
  gracePeriodDays: number;
  accumulatedLateFee: number;
  totalAmountDue: number;
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
 * Calculates late fee based on agreement contract penalty settings.
 */
export function calculateContractLateFee(options: {
  enableLateFee?: boolean;
  lateFeeType?: string;
  lateFeeAmount?: unknown;
  gracePeriodDays?: number;
  daysOverdue: number;
  installmentAmount: number;
  periodDays: number;
}): number {
  if (!options.enableLateFee) return 0;
  const graceDays = options.gracePeriodDays ?? CONFIG.GRACE_PERIOD_DAYS;
  if (options.daysOverdue <= graceDays) return 0;

  const overdueDaysAfterGrace = options.daysOverdue - graceDays;
  const overduePeriods = Math.max(1, Math.ceil(overdueDaysAfterGrace / options.periodDays));
  const feeRateOrAmount = toSafeNumber(options.lateFeeAmount);

  if (options.lateFeeType === 'PERCENTAGE') {
    const feePerPeriod = (feeRateOrAmount / 100) * options.installmentAmount;
    return Math.round(overduePeriods * feePerPeriod * 100) / 100;
  } else {
    // FLAT fee per overdue period
    return Math.round(overduePeriods * feeRateOrAmount * 100) / 100;
  }
}

function toSafeNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
}

export function formatCedi(amount: unknown): string {
  const safeNum = toSafeNumber(amount);
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
  enableLateFee?: boolean;
  lateFeeType?: string;
  lateFeeAmount?: unknown;
  gracePeriodDays?: number;
  payments?: Array<{ amount: unknown; voided: boolean; datePaid: Date | string }>;
}): PaymentSummary {
  const startDate = new Date(agreement.startDate);
  const today = new Date();

  const hirePurchasePrice = toSafeNumber(agreement.hirePurchasePrice);
  const installmentAmount = toSafeNumber(agreement.installmentAmount);

  // Active (non-voided) payments sum
  const activePayments = (agreement.payments || []).filter((p) => !p.voided);
  const totalPaid = activePayments.reduce((sum, p) => sum + toSafeNumber(p.amount), 0);

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
      const graceDays = agreement.gracePeriodDays ?? CONFIG.GRACE_PERIOD_DAYS;
      if (diffDays >= graceDays) {
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

  // 5. Late Fee / Penalty Accrual
  const enableLateFee = Boolean(agreement.enableLateFee);
  const lateFeeType = (agreement.lateFeeType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FLAT') as 'FLAT' | 'PERCENTAGE';
  const lateFeeAmount = toSafeNumber(agreement.lateFeeAmount);
  const gracePeriodDays = agreement.gracePeriodDays ?? CONFIG.GRACE_PERIOD_DAYS;

  const accumulatedLateFee = calculateContractLateFee({
    enableLateFee,
    lateFeeType,
    lateFeeAmount,
    gracePeriodDays,
    daysOverdue: statusBadge.daysOverdue,
    installmentAmount,
    periodDays,
  });

  const totalAmountDue = balanceRemaining + accumulatedLateFee;

  return {
    hirePurchasePrice,
    totalPaid,
    balanceRemaining,
    enableLateFee,
    lateFeeType,
    lateFeeAmount,
    gracePeriodDays,
    accumulatedLateFee,
    totalAmountDue,
    percentComplete,
    scheduledFinishDate,
    actualPaceFinishDate,
    nextDueDate,
    statusBadge,
  };
}
