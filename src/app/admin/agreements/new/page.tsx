'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bike, User, ShieldCheck, DollarSign, Calendar, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { CONFIG } from '@/lib/config';
import { isValidGhanaPhone } from '@/lib/validation';

export default function NewAgreementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdPasswordNotice, setCreatedPasswordNotice] = useState<string | null>(null);

  // Form State
  const [ownerName, setOwnerName] = useState('Emmanuel Osei (Owner)');
  const [ownerPhone, setOwnerPhone] = useState('0240000000');

  // Hirer
  const [hirerName, setHirerName] = useState('');
  const [hirerPhone, setHirerPhone] = useState('');
  const [hirerEmail, setHirerEmail] = useState('');
  const [hirerPassword, setHirerPassword] = useState('');

  // Guarantors
  const [guarantor1Name, setGuarantor1Name] = useState('');
  const [guarantor1Phone, setGuarantor1Phone] = useState('');
  const [guarantor2Name, setGuarantor2Name] = useState('');
  const [guarantor2Phone, setGuarantor2Phone] = useState('');

  // Phone Touched / Validation States
  const [ownerPhoneTouched, setOwnerPhoneTouched] = useState(false);
  const [hirerPhoneTouched, setHirerPhoneTouched] = useState(false);
  const [guarantor1PhoneTouched, setGuarantor1PhoneTouched] = useState(false);
  const [guarantor2PhoneTouched, setGuarantor2PhoneTouched] = useState(false);

  // Vehicle
  const [makeModel, setMakeModel] = useState('Bajaj Boxer BM 150');
  const [registrationNo, setRegistrationNo] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [colorYear, setColorYear] = useState('Red / 2024');

  // Financial Terms
  const [cashPrice, setCashPrice] = useState('11000');
  const [hirePurchasePrice, setHirePurchasePrice] = useState('15000');
  const [installmentAmount, setInstallmentAmount] = useState('300');
  const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [totalInstallments, setTotalInstallments] = useState('50');
  const [isAutoCalculated, setIsAutoCalculated] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Compute calculated installments (Math.ceil(hirePurchasePrice / installmentAmount))
  const computeCalculatedInstallments = (hpStr: string, instStr: string): number | null => {
    const hp = parseFloat(hpStr);
    const inst = parseFloat(instStr);
    if (!isNaN(hp) && !isNaN(inst) && inst > 0) {
      return Math.ceil(hp / inst);
    }
    return null;
  };

  // Recalculate live when Hire-Purchase Price, Installment Amount, or Frequency changes
  useEffect(() => {
    if (isAutoCalculated) {
      const calculated = computeCalculatedInstallments(hirePurchasePrice, installmentAmount);
      if (calculated !== null) {
        setTotalInstallments(String(calculated));
      }
    }
  }, [hirePurchasePrice, installmentAmount, frequency, isAutoCalculated]);

  // Handler for manual override of Total Installments
  function handleTotalInstallmentsChange(val: string) {
    setTotalInstallments(val);
    setIsAutoCalculated(false);
  }

  function handleResetTotalInstallments() {
    setIsAutoCalculated(true);
    const calculated = computeCalculatedInstallments(hirePurchasePrice, installmentAmount);
    if (calculated !== null) {
      setTotalInstallments(String(calculated));
    }
  }

  // Validation helpers
  const ownerPhoneError = ownerPhoneTouched && !isValidGhanaPhone(ownerPhone) ? 'Enter a valid Ghana phone number (10 digits, starting with 0)' : '';
  const hirerPhoneError = hirerPhoneTouched && !isValidGhanaPhone(hirerPhone) ? 'Enter a valid Ghana phone number (10 digits, starting with 0)' : '';
  const guarantor1PhoneError = guarantor1PhoneTouched && guarantor1Phone.trim().length > 0 && !isValidGhanaPhone(guarantor1Phone) ? 'Enter a valid Ghana phone number (10 digits, starting with 0)' : '';
  const guarantor2PhoneError = guarantor2PhoneTouched && guarantor2Phone.trim().length > 0 && !isValidGhanaPhone(guarantor2Phone) ? 'Enter a valid Ghana phone number (10 digits, starting with 0)' : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Mark all phone fields as touched to trigger inline error displays if invalid
    setOwnerPhoneTouched(true);
    setHirerPhoneTouched(true);
    setGuarantor1PhoneTouched(true);
    setGuarantor2PhoneTouched(true);

    if (!isValidGhanaPhone(ownerPhone)) {
      setError('Owner Phone number is invalid. Enter a 10-digit Ghana number starting with 0 (e.g. 0244123456).');
      return;
    }

    if (!isValidGhanaPhone(hirerPhone)) {
      setError('Hirer Phone number is invalid. Enter a 10-digit Ghana number starting with 0 (e.g. 0245556677).');
      return;
    }

    if (guarantor1Phone.trim().length > 0 && !isValidGhanaPhone(guarantor1Phone)) {
      setError('Guarantor 1 Phone number is invalid. Enter a 10-digit Ghana number starting with 0.');
      return;
    }

    if (guarantor2Phone.trim().length > 0 && !isValidGhanaPhone(guarantor2Phone)) {
      setError('Guarantor 2 Phone number is invalid. Enter a 10-digit Ghana number starting with 0.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName,
          ownerPhone,
          hirerName,
          hirerPhone,
          hirerEmail,
          hirerPassword: hirerPassword || undefined,
          guarantor1Name,
          guarantor1Phone,
          guarantor2Name,
          guarantor2Phone,
          makeModel,
          registrationNo,
          chassisNo,
          engineNo,
          colorYear,
          cashPrice,
          hirePurchasePrice,
          installmentAmount,
          frequency,
          totalInstallments,
          startDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create agreement');
      }

      if (data.assignedPassword) {
        setCreatedPasswordNotice(data.assignedPassword);
      } else {
        router.push('/admin/dashboard');
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back button & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <span className="text-xs font-medium text-slate-500">Digitize Paper Agreement</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Hire-Purchase Agreement</h1>
            <p className="text-xs text-slate-500">
              Enter owner, hirer, vehicle, and financial details per paper contract
            </p>
          </div>
        </div>

        {createdPasswordNotice ? (
          /* Password Notice Modal after creation */
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Agreement & Rider Account Created!</h2>
              <p className="text-xs text-slate-600 mt-1">
                Provide these initial credentials to the rider. They will be forced to set a new password on first login.
              </p>
            </div>

            <div className="bg-white border border-emerald-200 rounded-xl p-4 max-w-sm mx-auto text-left space-y-2">
              <div className="text-xs text-slate-500">Phone Number: <strong className="text-slate-900">{hirerPhone}</strong></div>
              <div className="text-xs text-slate-500">Initial Password: <strong className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono text-sm">{createdPasswordNotice}</strong></div>
            </div>

            <button
              onClick={() => {
                router.push('/admin/dashboard');
                router.refresh();
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
            >
              Done & Return to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Owner Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>1. Vehicle Owner Info</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Owner Phone *</label>
                  <input
                    type="text"
                    value={ownerPhone}
                    onChange={(e) => {
                      setOwnerPhone(e.target.value);
                      if (!ownerPhoneTouched) setOwnerPhoneTouched(true);
                    }}
                    onBlur={() => setOwnerPhoneTouched(true)}
                    required
                    placeholder="e.g. 0240000000"
                    className={`input-field ${ownerPhoneError ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : ''}`}
                  />
                  {ownerPhoneError && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {ownerPhoneError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Hirer / Rider Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>2. Hirer (Rider) Account Info</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hirer Full Name *</label>
                  <input
                    type="text"
                    value={hirerName}
                    onChange={(e) => setHirerName(e.target.value)}
                    placeholder="e.g. Yaw Boateng"
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hirer Phone Number *</label>
                  <input
                    type="text"
                    value={hirerPhone}
                    onChange={(e) => {
                      setHirerPhone(e.target.value);
                      if (!hirerPhoneTouched) setHirerPhoneTouched(true);
                    }}
                    onBlur={() => setHirerPhoneTouched(true)}
                    placeholder="e.g. 0245556677"
                    required
                    className={`input-field ${hirerPhoneError ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : ''}`}
                  />
                  {hirerPhoneError && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {hirerPhoneError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hirer Email (Optional)</label>
                  <input
                    type="email"
                    value={hirerEmail}
                    onChange={(e) => setHirerEmail(e.target.value)}
                    placeholder="yaw@example.com"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Initial Password (Optional — auto-generated if blank)
                  </label>
                  <input
                    type="password"
                    value={hirerPassword}
                    onChange={(e) => setHirerPassword(e.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Guarantors */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-amber-600" />
                <span>3. Guarantors (Optional)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Guarantor 1 Name</label>
                  <input
                    type="text"
                    value={guarantor1Name}
                    onChange={(e) => setGuarantor1Name(e.target.value)}
                    placeholder="e.g. Joseph Kwarteng"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Guarantor 1 Phone</label>
                  <input
                    type="text"
                    value={guarantor1Phone}
                    onChange={(e) => {
                      setGuarantor1Phone(e.target.value);
                      if (!guarantor1PhoneTouched) setGuarantor1PhoneTouched(true);
                    }}
                    onBlur={() => setGuarantor1PhoneTouched(true)}
                    placeholder="e.g. 0208889900"
                    className={`input-field ${guarantor1PhoneError ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : ''}`}
                  />
                  {guarantor1PhoneError && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {guarantor1PhoneError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Guarantor 2 Name</label>
                  <input
                    type="text"
                    value={guarantor2Name}
                    onChange={(e) => setGuarantor2Name(e.target.value)}
                    placeholder="e.g. Abena Serwaa"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Guarantor 2 Phone</label>
                  <input
                    type="text"
                    value={guarantor2Phone}
                    onChange={(e) => {
                      setGuarantor2Phone(e.target.value);
                      if (!guarantor2PhoneTouched) setGuarantor2PhoneTouched(true);
                    }}
                    onBlur={() => setGuarantor2PhoneTouched(true)}
                    placeholder="e.g. 0554443322"
                    className={`input-field ${guarantor2PhoneError ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : ''}`}
                  />
                  {guarantor2PhoneError && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {guarantor2PhoneError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Vehicle Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
                <Bike className="w-4 h-4 text-emerald-600" />
                <span>4. Vehicle Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Make & Model *</label>
                  <input
                    type="text"
                    value={makeModel}
                    onChange={(e) => setMakeModel(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Registration No. *</label>
                  <input
                    type="text"
                    value={registrationNo}
                    onChange={(e) => setRegistrationNo(e.target.value)}
                    placeholder="e.g. GT-8812-24"
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Color / Year</label>
                  <input
                    type="text"
                    value={colorYear}
                    onChange={(e) => setColorYear(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Chassis Number</label>
                  <input
                    type="text"
                    value={chassisNo}
                    onChange={(e) => setChassisNo(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Engine Number</label>
                  <input
                    type="text"
                    value={engineNo}
                    onChange={(e) => setEngineNo(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Financial Terms */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>5. Financial Terms ({CONFIG.CURRENCY_SYMBOL})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cash Price ({CONFIG.CURRENCY_SYMBOL}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashPrice}
                    onChange={(e) => setCashPrice(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hire-Purchase Price ({CONFIG.CURRENCY_SYMBOL}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={hirePurchasePrice}
                    onChange={(e) => setHirePurchasePrice(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Installment Amount ({CONFIG.CURRENCY_SYMBOL}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Payment Frequency *</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as 'WEEKLY' | 'MONTHLY')}
                    className="input-field"
                  >
                    <option value="WEEKLY">Weekly (Standard)</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Total Installments *
                    </label>
                    {isAutoCalculated ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        auto-calculated
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResetTotalInstallments}
                        title="Click to reset to auto-calculated value"
                        className="text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> custom (reset)
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={totalInstallments}
                    onChange={(e) => handleTotalInstallmentsChange(e.target.value)}
                    required
                    className={`input-field ${isAutoCalculated ? 'bg-emerald-50/20 border-emerald-300 font-semibold text-slate-900' : 'bg-amber-50/20 border-amber-300 font-semibold'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date *</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Link
                href="/admin/dashboard"
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md disabled:opacity-50"
              >
                {loading ? 'Creating Agreement...' : 'Save & Digitize Agreement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
