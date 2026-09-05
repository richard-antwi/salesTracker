import { formatCedi } from './calculations';

function escapeCSV(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

export function generateAgreementsCSV(agreements: any[]): string {
  const headers = [
    'Hirer Name',
    'Hirer Phone',
    'Vehicle Reg No',
    'Make & Model',
    'Start Date',
    'Cash Price (GH₵)',
    'Hire-Purchase Price (GH₵)',
    'Total Paid (GH₵)',
    'Balance Remaining (GH₵)',
    '% Complete',
    'Account Status',
    'Next Due Date',
  ];

  const rows = agreements.map((agr) => {
    const summary = agr.summary || {};
    const badge = summary.statusBadge || {};
    return [
      escapeCSV(agr.hirer?.name),
      escapeCSV(agr.hirer?.phone),
      escapeCSV(agr.vehicle?.registrationNo),
      escapeCSV(agr.vehicle?.makeModel),
      escapeCSV(new Date(agr.startDate).toISOString().split('T')[0]),
      escapeCSV(Number(agr.cashPrice || 0).toFixed(2)),
      escapeCSV(Number(agr.hirePurchasePrice || 0).toFixed(2)),
      escapeCSV(Number(summary.totalPaid || 0).toFixed(2)),
      escapeCSV(Number(summary.balanceRemaining || 0).toFixed(2)),
      escapeCSV((summary.percentComplete || 0).toFixed(1) + '%'),
      escapeCSV(agr.status === 'ACTIVE' ? badge.label || 'Active' : agr.status),
      escapeCSV(summary.nextDueDate ? new Date(summary.nextDueDate).toISOString().split('T')[0] : 'N/A'),
    ].join(',');
  });

  return [headers.map(escapeCSV).join(','), ...rows].join('\n');
}

export function generatePaymentsCSV(agreement: any, payments: any[]): string {
  const headers = [
    'Date Paid',
    'Amount (GH₵)',
    'Channel',
    'Reference No',
    'Note',
    'Payment Status',
    'Running Balance (GH₵)',
  ];

  // Order payments chronologically to compute running balance
  const sorted = [...payments].sort((a, b) => new Date(a.datePaid).getTime() - new Date(b.datePaid).getTime());
  let runningPaid = 0;
  const hpPrice = Number(agreement.hirePurchasePrice || agreement.summary?.hirePurchasePrice || 0);

  const rows = sorted.map((p) => {
    const amt = Number(p.amount || 0);
    if (!p.voided) runningPaid += amt;
    const runningBal = Math.max(0, hpPrice - runningPaid);

    return [
      escapeCSV(new Date(p.datePaid).toISOString().split('T')[0]),
      escapeCSV(amt.toFixed(2)),
      escapeCSV(p.channel),
      escapeCSV(p.reference || 'N/A'),
      escapeCSV(p.note || 'N/A'),
      escapeCSV(p.voided ? 'VOIDED' : 'CONFIRMED'),
      escapeCSV(runningBal.toFixed(2)),
    ].join(',');
  });

  return [headers.map(escapeCSV).join(','), ...rows].join('\n');
}
