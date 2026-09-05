'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bike, ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle, Building2, User, Phone, Mail, Lock } from 'lucide-react';
import { isValidGhanaPhone } from '@/lib/validation';

export default function RequestAccessPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const phoneError = phoneTouched && !isValidGhanaPhone(contactPhone) ? 'Enter a valid Ghana phone number (10 digits, starting with 0)' : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhoneTouched(true);
    setError('');

    if (!businessName || !ownerName || !contactPhone || !contactEmail || !adminPassword) {
      setError('Please fill in all required fields including initial password.');
      return;
    }

    if (!isValidGhanaPhone(contactPhone)) {
      setError('Contact Phone number is invalid. Enter a 10-digit Ghana number starting with 0 (e.g. 0244123456).');
      return;
    }

    if (adminPassword.length < 6) {
      setError('Initial Admin Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/organizations/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName,
          ownerName,
          contactPhone,
          contactEmail,
          adminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setSubmittedSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during submission');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/login" className="inline-flex items-center justify-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg group-hover:bg-emerald-500 transition-colors">
              <Bike className="w-7 h-7" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Work & Pay Platform</h1>
          <p className="text-xs text-slate-400">Request Organization Access for your Fleet</p>
        </div>

        {submittedSuccess ? (
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Access Request Submitted!</h2>
              <p className="text-xs text-slate-300">
                Your request for <strong className="text-emerald-400">{businessName}</strong> has been received.
              </p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-3.5 rounded-xl border border-slate-700/50">
              The platform administrator will review your application. Upon approval, you will receive login credentials at <strong className="text-slate-200">{contactEmail}</strong>.
            </p>
            <Link
              href="/login"
              className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors shadow-md text-center"
            >
              Return to Login Page
            </Link>
          </div>
        ) : (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Business Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Business / Fleet Name <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Accra Rider Express"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Owner Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Owner / Fleet Admin Name <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kwame Mensah"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contact Phone Number <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0244123456"
                    value={contactPhone}
                    onChange={(e) => {
                      setContactPhone(e.target.value);
                      if (!phoneTouched) setPhoneTouched(true);
                    }}
                    onBlur={() => setPhoneTouched(true)}
                    className={`w-full bg-slate-900 border rounded-xl text-xs pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none ${phoneError ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-700'}`}
                  />
                </div>
                {phoneError && (
                  <p className="text-[11px] font-semibold text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {phoneError}
                  </p>
                )}
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contact Email Address <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="kwame@accrarider.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Initial Admin Password */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Initial Admin Password <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="Set admin login password (min 6 chars)"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Submitting Application...' : 'Submit Access Request'}</span>
              </button>

              <div className="pt-2 text-center">
                <Link href="/login" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
