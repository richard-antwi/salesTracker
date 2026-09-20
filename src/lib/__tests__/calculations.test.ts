import { calculateAgreementSummary, calculateContractLateFee } from '../calculations';

describe('calculations.ts', () => {
  describe('calculateContractLateFee', () => {
    it('returns 0 if enableLateFee is false', () => {
      const fee = calculateContractLateFee({
        enableLateFee: false,
        daysOverdue: 10,
        installmentAmount: 100,
        periodDays: 7,
      });
      expect(fee).toBe(0);
    });

    it('returns 0 if daysOverdue is within grace period', () => {
      const fee = calculateContractLateFee({
        enableLateFee: true,
        daysOverdue: 5,
        gracePeriodDays: 7,
        installmentAmount: 100,
        periodDays: 7,
        lateFeeType: 'FLAT',
        lateFeeAmount: 20,
      });
      expect(fee).toBe(0);
    });

    it('calculates FLAT fee correctly when overdue', () => {
      // 10 days overdue, 7 days grace = 3 days after grace.
      // 3 days / 7 days period = 1 period (Math.ceil(3/7))
      // 1 period * 20 = 20
      const fee = calculateContractLateFee({
        enableLateFee: true,
        daysOverdue: 10,
        gracePeriodDays: 7,
        installmentAmount: 100,
        periodDays: 7,
        lateFeeType: 'FLAT',
        lateFeeAmount: 20,
      });
      expect(fee).toBe(20);
    });

    it('calculates FLAT fee for multiple overdue periods', () => {
      // 20 days overdue, 5 days grace = 15 days after grace
      // 15 days / 7 days = 3 periods (Math.ceil(15/7))
      // 3 * 20 = 60
      const fee = calculateContractLateFee({
        enableLateFee: true,
        daysOverdue: 20,
        gracePeriodDays: 5,
        installmentAmount: 100,
        periodDays: 7,
        lateFeeType: 'FLAT',
        lateFeeAmount: 20,
      });
      expect(fee).toBe(60);
    });

    it('calculates PERCENTAGE fee correctly', () => {
      // 10 days overdue, 7 days grace = 3 days after grace
      // 3 days / 7 = 1 period
      // 5% of 100 = 5.
      // 1 period * 5 = 5
      const fee = calculateContractLateFee({
        enableLateFee: true,
        daysOverdue: 10,
        gracePeriodDays: 7,
        installmentAmount: 100,
        periodDays: 7,
        lateFeeType: 'PERCENTAGE',
        lateFeeAmount: 5,
      });
      expect(fee).toBe(5);
    });
  });

  describe('calculateAgreementSummary', () => {
    it('calculates balance and percent complete correctly with zero payments', () => {
      const summary = calculateAgreementSummary({
        startDate: new Date(),
        hirePurchasePrice: 5000,
        installmentAmount: 100,
        frequency: 'WEEKLY',
        totalInstallments: 50,
        payments: [],
      });

      expect(summary.hirePurchasePrice).toBe(5000);
      expect(summary.totalPaid).toBe(0);
      expect(summary.balanceRemaining).toBe(5000);
      expect(summary.percentComplete).toBe(0);
    });

    it('calculates balance correctly with some payments', () => {
      const summary = calculateAgreementSummary({
        startDate: new Date(),
        hirePurchasePrice: 5000,
        installmentAmount: 100,
        frequency: 'WEEKLY',
        totalInstallments: 50,
        payments: [
          { amount: 100, voided: false, datePaid: new Date() },
          { amount: 200, voided: false, datePaid: new Date() },
          { amount: 100, voided: true, datePaid: new Date() }, // voided should be ignored
        ],
      });

      expect(summary.totalPaid).toBe(300);
      expect(summary.balanceRemaining).toBe(4700);
      expect(summary.percentComplete).toBe(6);
    });

    it('handles overpayment by capping balance at 0 and percent at 100', () => {
      const summary = calculateAgreementSummary({
        startDate: new Date(),
        hirePurchasePrice: 5000,
        installmentAmount: 100,
        frequency: 'WEEKLY',
        totalInstallments: 50,
        payments: [
          { amount: 6000, voided: false, datePaid: new Date() },
        ],
      });

      expect(summary.totalPaid).toBe(6000);
      expect(summary.balanceRemaining).toBe(0);
      expect(summary.percentComplete).toBe(100);
      expect(summary.statusBadge.label).toBe('Completed');
    });

    it('calculates nextDueDate correctly', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const summary = calculateAgreementSummary({
        startDate,
        hirePurchasePrice: 5000,
        installmentAmount: 100,
        frequency: 'WEEKLY',
        totalInstallments: 50,
        payments: [
          { amount: 100, voided: false, datePaid: new Date('2024-01-05T00:00:00Z') },
        ],
      });

      // 1 payment of 100 made. Next due date should be 2 weeks from start date (since 1 week is paid)
      // paidInstallmentCount = 1
      // nextDueDateDays = (1 + 1) * 7 = 14
      // Jan 1 + 14 days = Jan 15
      expect(summary.nextDueDate.toISOString().startsWith('2024-01-15')).toBeTruthy();
    });
  });
});
