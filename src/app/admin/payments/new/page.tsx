'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, CheckCircle2, ArrowLeft, AlertCircle, Smartphone, Banknote, Building2 } from 'lucide-react';
import { CONFIG } from '@/lib/config';
import { formatCedi } from '@/lib/calculations';

interface AgreementOption {
  id: string;
  hirer: { name: string; phone: string };
  vehicle: { makeModel: string; registrationNo: string };
  installmentAmount: number;
  summary: {
    balanceRemaining: number;
    percentComplete: number;
    statusBadge: { label: string; variant: string };
  };
}

function RecordPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('agreementId');

  const [agreements, setAgreements] = useState<AgreementOption[]>([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState<string>(preselectedId || '');
  const [amount, setAmount] = useState<string>('');
  const [channel, setChannel] = useState<'MOMO' | 'CASH' | 'BANK'>(CONFIG.DEFAULT_PAYMENT_CHANNEL);
  const [datePaid, setDatePaid] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadAgreements() {
      try {
        const res = await fetch('/api/agreements');
        const data = await res.json();
        if (res.ok && data.agreements) {
          setAgreements(data.agreements);
          if (!selectedAgreementId && data.agreements.length > 0) {
            setSelectedAgreementId(data.agreements[0].id);
            setAmount(data.agreements[0].installmentAmount.toString());
          } else if (preselectedId) {
            const found = data.agreements.find((a: AgreementOption) => a.id === preselectedId);
            if (found) setAmount(found.installmentAmount.toString());
          }
        }
      } catch (err) {
        console.error('Failed to load agreements:', err);
      } finally {
        setFetching(false);
      }
    }
    loadAgreements();
  }, [preselectedId, selectedAgreementId]);

  const activeAgreement = agreements.find((a) => a.id === selectedAgreementId);

  function handleAgreementChange(id: string) {
    setSelectedAgreementId(id);
    const selected = agreements.find((a) => a.id === id);
    if (selected) {
      setAmount(selected.installmentAmount.toString());
    }
  }

  function addPresetAmount(val: number) {
    setAmount(val.toString());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!selectedAgreementId) {
      setError('Please select an agreement');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid positive payment amount');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/agreements/${selectedAgreementId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          datePaid,
          channel,
          reference: reference || null,
          note: note || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record payment');
      }

      setSuccessMsg(`Payment of ${formatCedi(parseFloat(amount))} recorded successfully!`);
      setTimeout(() => {
        router.push(`/admin/agreements/${selectedAgreementId}`);
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error recording payment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
        <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Record Payment</h1>
          <p className="text-xs text-slate-500">Log incoming hire-purchase payment</p>
        </div>
      </div>

      {fetching ? (
        <div className="text-center py-8 text-slate-500 text-sm">Loading agreements list...</div>
      ) : agreements.length === 0 ? (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm text-slate-600">No active agreements found.</p>
          <Link
            href="/admin/agreements/new"
            className="inline-block bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            Create First Agreement
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Rider/Agreement Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
              Select Rider / Agreement *
            </label>
            <select
              value={selectedAgreementId}
              onChange={(e) => handleAgreementChange(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            >
              {agreements.map((agr) => (
                <option key={agr.id} value={agr.id}>
                  {agr.hirer.name} ({agr.vehicle.registrationNo}) — Bal: {formatCedi(agr.summary.balanceRemaining)}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Balance Info */}
          {activeAgreement && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block">Current Balance</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatCedi(activeAgreement.summary.balanceRemaining)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Weekly Installment</span>
                <span className="font-semibold text-emerald-700">
                  {formatCedi(activeAgreement.installmentAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Payment Amount Input & Fast Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
              Payment Amount ({CONFIG.CURRENCY_SYMBOL}) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400 font-semibold text-sm">
                {CONFIG.CURRENCY_SYMBOL}
              </span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-12 pr-3 py-3 rounded-xl border border-slate-300 text-slate-900 font-bold text-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* Fast Presets */}
            <div className="mt-2.5 flex flex-wrap gap-2">
              {activeAgreement && (
                <button
                  type="button"
                  onClick={() => addPresetAmount(activeAgreement.installmentAmount)}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold text-xs px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                >
                  Standard ({formatCedi(activeAgreement.installmentAmount)})
                </button>
              )}
              <button
                type="button"
                onClick={() => addPresetAmount(100)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
              >
                + GH₵100
              </button>
              <button
                type="button"
                onClick={() => addPresetAmount(200)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
              >
                + GH₵200
              </button>
              <button
                type="button"
                onClick={() => addPresetAmount(300)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
              >
                + GH₵300
              </button>
              <button
                type="button"
                onClick={() => addPresetAmount(500)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
              >
                + GH₵500
              </button>
            </div>
          </div>

          {/* Payment Channel — MoMo is Default/First Option */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
              Payment Channel *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('MOMO')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  channel === 'MOMO'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold ring-2 ring-emerald-600/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <span className="text-xs">MoMo (Default)</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('CASH')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  channel === 'CASH'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold ring-2 ring-emerald-600/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-5 h-5 text-amber-600" />
                <span className="text-xs">Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('BANK')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  channel === 'BANK'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold ring-2 ring-emerald-600/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-5 h-5 text-blue-600" />
                <span className="text-xs">Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date Received *</label>
              <input
                type="date"
                value={datePaid}
                onChange={(e) => setDatePaid(e.target.value)}
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reference No. / MoMo ID</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. MM-948201 or Receipt #012"
                className="input-field"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Week 6 installment paid via MTN MoMo"
              rows={2}
              className="input-field"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50"
          >
            {loading ? 'Recording Payment...' : `Confirm & Record Payment (${formatCedi(parseFloat(amount || '0'))})`}
          </button>
        </form>
      )}
    </div>
  );
}

export default function RecordPaymentPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          Fast Mobile Entry
        </span>
      </div>

      <Suspense fallback={<div className="text-center py-12 text-slate-500 text-sm">Loading form...</div>}>
        <RecordPaymentContent />
      </Suspense>
    </div>
  );
}
