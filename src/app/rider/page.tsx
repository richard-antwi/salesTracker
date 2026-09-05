'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bike,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Smartphone,
  Banknote,
  Building2,
  TrendingUp,
  Download,
  FileCheck,
  ShieldAlert,
  Archive,
} from 'lucide-react';
import { formatCedi } from '@/lib/calculations';

interface PaymentRecord {
  id: string;
  amount: number;
  datePaid: string;
  channel: 'MOMO' | 'CASH' | 'BANK';
  reference?: string;
  note?: string;
  voided: boolean;
}

interface DocumentItem {
  id: string;
  documentType: 'GHANA_CARD' | 'PASSPORT_PHOTO' | 'SIGNED_CONTRACT' | 'OTHER';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
}

interface RiderAgreementData {
  id: string;
  ownerName: string;
  ownerPhone: string;
  hirePurchasePrice: number;
  installmentAmount: number;
  frequency: 'WEEKLY' | 'MONTHLY';
  totalInstallments: number;
  startDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'REPOSSESSED';
  vehicle: {
    makeModel: string;
    registrationNo: string;
    colorYear?: string;
  };
  payments: PaymentRecord[];
  summary: {
    hirePurchasePrice: number;
    totalPaid: number;
    balanceRemaining: number;
    percentComplete: number;
    scheduledFinishDate: string;
    actualPaceFinishDate: string;
    nextDueDate: string;
    statusBadge: {
      label: 'On Track' | 'Overdue' | 'Severely Overdue' | 'Completed' | 'Defaulted' | 'Repossessed';
      variant: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'slate';
      daysOverdue: number;
    };
  };
}

export default function RiderMyAgreementPage() {
  const [agreement, setAgreement] = useState<RiderAgreementData | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchRiderAgreement() {
      try {
        const res = await fetch('/api/agreements');
        const data = await res.json();

        if (res.ok && data.agreements && data.agreements.length > 0) {
          const agr = data.agreements[0];
          setAgreement(agr);

          // Fetch rider documents
          const docRes = await fetch(`/api/agreements/${agr.id}/documents`);
          const docData = await docRes.json();
          if (docRes.ok && docData.documents) {
            setDocuments(docData.documents);
          }
        } else {
          setError('No active hire-purchase agreement found for your account.');
        }
      } catch (err) {
        console.error('Failed to load rider agreement:', err);
        setError('Error loading agreement data');
      } finally {
        setLoading(false);
      }
    }
    fetchRiderAgreement();
  }, []);

  const renderBadge = (badge: RiderAgreementData['summary']['statusBadge']) => {
    switch (badge.label) {
      case 'On Track':
        return (
          <span className="badge-on-track inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> On Track
          </span>
        );
      case 'Overdue':
        return (
          <span className="badge-overdue inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Overdue ({badge.daysOverdue}d)
          </span>
        );
      case 'Severely Overdue':
        return (
          <span className="badge-severely-overdue inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Overdue ({badge.daysOverdue}d)
          </span>
        );
      case 'Completed':
        return (
          <span className="badge-completed inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Fully Paid!
          </span>
        );
      case 'Defaulted':
        return (
          <span className="badge-defaulted inline-flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Defaulted
          </span>
        );
      case 'Repossessed':
        return (
          <span className="badge-repossessed inline-flex items-center gap-1">
            <Archive className="w-3 h-3" /> Repossessed
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-16 text-center text-slate-500 text-sm">
        Loading your agreement & payment history...
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Bike className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">No Agreement Found</h2>
        <p className="text-xs text-slate-500">{error || 'Please contact your vehicle owner.'}</p>
      </div>
    );
  }

  const { summary, vehicle, payments } = agreement;
  const badge = summary.statusBadge;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-16">
      {/* Vehicle & Rider Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                My Motorcycle Agreement
              </span>
              <h1 className="text-lg font-extrabold text-white">{vehicle.makeModel}</h1>
              <span className="text-xs font-mono text-slate-400">{vehicle.registrationNo}</span>
            </div>
          </div>

          <div>{renderBadge(badge)}</div>
        </div>

        {/* Big Balance Display & Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Balance Remaining</span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatCedi(summary.balanceRemaining)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-400 font-bold block">{summary.percentComplete.toFixed(1)}% Paid</span>
              <span className="text-[11px] text-slate-400">
                {formatCedi(summary.totalPaid)} / {formatCedi(summary.hirePurchasePrice)}
              </span>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-700">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${summary.percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Financial Projections Box — Dual Finishing Dates per Section 3 of Spec */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Projected Completion Dates
          </span>
          <span className="text-[10px] text-slate-500">Live Pace Projections</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Scheduled Finish Date */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">1. Scheduled Finish (Contract)</span>
            <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-600" />
              {new Date(summary.scheduledFinishDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="text-[10px] text-slate-400 block">Paper contract deadline</span>
          </div>

          {/* 2. Actual Pace Finish Date */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-800 block">2. Actual Pace Finish (Current Velocity)</span>
            <span className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              {new Date(summary.actualPaceFinishDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="text-[10px] text-emerald-700 block">Based on your payment rate so far</span>
          </div>
        </div>

        {/* Installment & Next Due Summary */}
        <div className="pt-2 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100">
          <div>
            <span className="text-slate-400 block text-[10px]">Installment Rate</span>
            <span className="font-bold text-slate-900">
              {formatCedi(agreement.installmentAmount)} / {agreement.frequency.toLowerCase()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Next Due Date</span>
            <span className="font-bold text-emerald-700">
              {new Date(summary.nextDueDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Live PDF Statement Export Action */}
      <div className="flex items-center justify-between bg-emerald-950 text-white rounded-xl p-3.5 text-xs shadow-sm">
        <span className="flex items-center gap-2 font-semibold text-emerald-100">
          <FileText className="w-4 h-4 text-emerald-400" /> Official Hire-Purchase Statement
        </span>
        <a
          href={`/api/agreements/${agreement.id}/pdf`}
          download
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Download PDF
        </a>
      </div>

      {/* Document Vault Section for Rider (Read-Only) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-emerald-600" /> My Verification Documents
          </h2>
          <span className="text-xs text-slate-500">{documents.length} Files On File</span>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">No contract documents uploaded yet.</div>
        ) : (
          <div className="space-y-2.5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded inline-block">
                      {doc.documentType.replace(/_/g, ' ')}
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs truncate" title={doc.fileName}>
                      {doc.fileName}
                    </h4>
                  </div>
                </div>

                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-600 hover:text-emerald-700 bg-white rounded-lg border border-slate-200 text-xs font-semibold flex items-center gap-1 shrink-0 ml-2 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" /> View
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Payment History Statement</h2>
          <span className="text-xs text-slate-500">{payments.length} Payments Recorded</span>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">No payments recorded yet.</div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div
                key={p.id}
                className={`p-3.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                  p.voided
                    ? 'bg-rose-50/40 border-rose-200 opacity-65 line-through'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-xs">
                    {p.channel === 'MOMO' && <Smartphone className="w-4 h-4 text-emerald-600" />}
                    {p.channel === 'CASH' && <Banknote className="w-4 h-4 text-amber-600" />}
                    {p.channel === 'BANK' && <Building2 className="w-4 h-4 text-blue-600" />}
                  </div>

                  <div>
                    <span className="font-extrabold text-slate-900 text-sm block">
                      {formatCedi(p.amount)}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {new Date(p.datePaid).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      via {p.channel}
                    </span>
                    {p.reference && (
                      <span className="text-[10px] font-mono text-slate-400">Ref: {p.reference}</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {p.voided ? (
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                      VOIDED
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      CONFIRMED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Owner Contact Information */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-center justify-between">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase">Vehicle Owner</span>
          <span className="font-bold text-slate-900">{agreement.ownerName}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase">Contact Phone</span>
          <a href={`tel:${agreement.ownerPhone}`} className="font-bold text-emerald-700 hover:underline">
            {agreement.ownerPhone}
          </a>
        </div>
      </div>
    </div>
  );
}
