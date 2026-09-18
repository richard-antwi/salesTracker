'use client';

import { useEffect, useState } from 'react';
import {
  Bike,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Archive,
  UserCheck,
  Calendar,
  Phone,
  Shield,
  CreditCard,
} from 'lucide-react';

interface GuarantorAgreement {
  id: string;
  ownerName: string;
  ownerPhone: string;
  guarantor1Name: string | null;
  guarantor1Phone: string | null;
  guarantor2Name: string | null;
  guarantor2Phone: string | null;
  cashPrice: number;
  hirePurchasePrice: number;
  installmentAmount: number;
  frequency: 'WEEKLY' | 'MONTHLY';
  totalInstallments: number;
  startDate: string;
  status: string;
  hirer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  vehicle: {
    makeModel: string;
    registrationNo: string;
    colorYear: string | null;
  };
  payments: Array<{
    id: string;
    amount: number;
    datePaid: string;
    channel: string;
    reference: string | null;
  }>;
  summary: {
    hirePurchasePrice: number;
    totalPaid: number;
    balanceRemaining: number;
    enableLateFee: boolean;
    accumulatedLateFee: number;
    totalAmountDue: number;
    percentComplete: number;
    scheduledFinishDate: string;
    actualPaceFinishDate: string;
    nextDueDate: string;
    statusBadge: {
      label: string;
      daysOverdue: number;
    };
  };
}

export default function GuarantorDashboard() {
  const [agreements, setAgreements] = useState<GuarantorAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchGuarantorAgreements() {
      try {
        const res = await fetch('/api/guarantor/agreements');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch guarantor agreements');
        }
        setAgreements(data.agreements || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred loading guarantor portal.');
      } finally {
        setLoading(false);
      }
    }
    fetchGuarantorAgreements();
  }, []);

  const formatCedi = (val: number) => {
    return `GH₵ ${val.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderBadge = (badge: GuarantorAgreement['summary']['statusBadge']) => {
    switch (badge.label) {
      case 'On Track':
        return (
          <span className="badge-on-track inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> On Track
          </span>
        );
      case 'Overdue':
      case 'Severely Overdue':
        return (
          <span className="badge-overdue inline-flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Overdue ({badge.daysOverdue} days)
          </span>
        );
      case 'Completed':
        return (
          <span className="badge-completed inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
          </span>
        );
      case 'Defaulted':
        return (
          <span className="badge-defaulted inline-flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Defaulted
          </span>
        );
      case 'Repossessed':
        return (
          <span className="badge-repossessed inline-flex items-center gap-1">
            <Archive className="w-3.5 h-3.5" /> Repossessed
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-500 text-sm">
        Loading guaranteed agreements...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Guarantor Portal Access Error</h2>
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Guarantor Portal
              </span>
              <span className="text-xs text-slate-400 font-medium">Read-Only Financial View</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">Guaranteed Agreements ({agreements.length})</h1>
          </div>
        </div>
      </div>

      {agreements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <Bike className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Active Guaranteed Agreements</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You currently have no hire-purchase agreements registered under your guarantor phone number. Contact the fleet owner if you believe this is an error.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {agreements.map((agr) => {
            const { summary, vehicle, hirer, payments } = agr;
            const badge = summary.statusBadge;

            return (
              <div key={agr.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                {/* Hirer & Vehicle Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold border border-slate-200">
                      <Bike className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{hirer.name}</h2>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" /> {hirer.phone} • {vehicle.makeModel} ({vehicle.registrationNo})
                      </div>
                    </div>
                  </div>
                  <div>{renderBadge(badge)}</div>
                </div>

                {/* Balance & Progress Metrics */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Total Price</span>
                      <span className="font-bold text-slate-900 text-sm sm:text-base">{formatCedi(summary.hirePurchasePrice)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Total Paid</span>
                      <span className="font-bold text-emerald-600 text-sm sm:text-base">{formatCedi(summary.totalPaid)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Balance Remaining</span>
                      <span className="font-extrabold text-slate-900 text-sm sm:text-base">{formatCedi(summary.balanceRemaining)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Installment</span>
                      <span className="font-semibold text-slate-800">
                        {formatCedi(agr.installmentAmount)} / {agr.frequency.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Hirer Repayment Progress</span>
                      <span>{summary.percentComplete.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${summary.percentComplete}%` }}
                      />
                    </div>
                  </div>

                  {/* Late Fee Warning if Accrued */}
                  {summary.enableLateFee && summary.accumulatedLateFee > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs flex items-center justify-between text-rose-800">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Accrued Overdue Late Fee</span>
                      </div>
                      <span className="font-bold">{formatCedi(summary.accumulatedLateFee)}</span>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-semibold block">Scheduled Contract Completion:</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-4 h-4 text-slate-600" />
                        {new Date(summary.scheduledFinishDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                      <span className="text-emerald-800 font-semibold block">Live Pace Projected Completion:</span>
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        {new Date(summary.actualPaceFinishDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Payments Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" /> Recent Payments Logged ({payments.length})
                    </span>
                  </div>

                  {payments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl">No payments logged yet.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Channel</th>
                            <th className="p-3">Reference</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {payments.slice(0, 5).map((pmt) => (
                            <tr key={pmt.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-medium text-slate-800">
                                {new Date(pmt.datePaid).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="p-3 font-bold text-emerald-700">{formatCedi(pmt.amount)}</td>
                              <td className="p-3 uppercase text-[10px] font-bold text-slate-600">{pmt.channel}</td>
                              <td className="p-3 font-mono text-[11px] text-slate-500">{pmt.reference || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
