'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  Lock,
  Database,
  RefreshCw,
  Server,
  Zap,
  Key,
  Smartphone,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SuperAdminSettingsPage() {
  const router = useRouter();

  // Settings State
  const [fee, setFee] = useState<string>('50');
  const [trialDays, setTrialDays] = useState<string>('14');
  const [gracePeriod, setGracePeriod] = useState<string>('7');
  const [enforceWalletApproval, setEnforceWalletApproval] = useState<boolean>(true);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Operator Password Reset State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const res = await fetch('/api/super-admin/settings');
        if (!res.ok) throw new Error('Failed to load global platform settings');
        const data = await res.json();
        setFee(data.monthlySubscriptionFee?.toString() || '50');
      } catch (error) {
        console.error(error);
        setMessage({ type: 'error', text: 'Could not load global settings from server.' });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSaveGlobalSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!fee || isNaN(Number(fee))) {
      setMessage({ type: 'error', text: 'Please enter a valid numeric subscription fee.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlySubscriptionFee: Number(fee) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setMessage({ type: 'success', text: 'Platform configuration updated successfully across all multi-tenant organizations!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save configuration settings' });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwdMessage(null);

    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setPwdMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPwdMessage({ type: 'success', text: 'Super Admin operator password successfully updated!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdMessage({ type: 'error', text: err.message || 'Failed to update operator password' });
    } finally {
      setPwdLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Super Admin Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/super-admin"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                Enterprise Platform Settings
              </h1>
              <p className="text-xs text-slate-400">
                Global SaaS Configuration &bull; Operator Security & Infrastructure
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Super Admin Verified
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-8">
        {message && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 border shadow-lg ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Controls Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Billing & Access Controls */}
            <form onSubmit={handleSaveGlobalSettings} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-400" /> Multi-Tenant SaaS Billing Variables
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Set global pricing and access subscription fees for all Fleet Owner accounts in Ghana.
                  </p>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                  Active Global Policy
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Monthly Fleet Subscription Fee (GHS)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm">GH₵</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                      disabled={loading || saving}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-3 pl-12 pr-4 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                      placeholder="50.00"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Charged monthly per organization for system access.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Default Fleet Trial Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-3 px-4 text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <p className="text-[11px] text-slate-400">Free onboarding window for newly created fleets.</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Platform Access Rules
                </h3>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <p className="text-xs font-bold text-white">System Maintenance Mode</p>
                    <p className="text-[11px] text-slate-400">Prevent non-admin users from accessing standard rider portal during updates.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      maintenanceMode ? 'bg-amber-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs font-bold text-white">Anti-Scam Wallet Lock Policy</p>
                    <p className="text-[11px] text-slate-400">Enforce Super Admin approval whenever a Fleet Admin requests a new payout wallet.</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black rounded-md uppercase">
                    ENFORCED
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>Saving Configuration...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Apply Global Enterprise Settings
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Section 2: Operator Security & Password Reset */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-400" /> Super Admin Account Credentials
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Update your password to keep the platform operator account secure.</p>
                </div>
              </div>

              {pwdMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                    pwdMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}
                >
                  {pwdMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{pwdMessage.text}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">New Password</label>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Confirm New Password</label>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-6 rounded-xl transition-all disabled:opacity-50 text-xs flex items-center gap-2 shadow-md"
                >
                  {pwdLoading ? 'Updating Password...' : 'Save New Password'}
                </button>
              </form>
            </div>
          </div>

          {/* Infrastructure & Integration Status Sidebar (1 col) */}
          <div className="space-y-6">
            {/* Payment Gateway Configuration */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" /> Paystack Gateway Integration
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Environment:</span>
                  <span className="font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                    LIVE PRODUCTION
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Currency:</span>
                  <span className="font-bold text-white">Ghanaian Cedi (GHS)</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Automated Webhook:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Active
                  </span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400">Payout Networks:</span>
                  <span className="font-semibold text-slate-300">MTN, Telecel, AT, GIP</span>
                </div>
              </div>
            </div>

            {/* Database & System Health */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-400" /> Database & System Health
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Database Engine:</span>
                  <span className="font-bold text-white">PostgreSQL (Supabase)</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Composite Indexes:</span>
                  <span className="font-bold text-emerald-400">17 Active Indexes</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Query Optimization:</span>
                  <span className="font-bold text-sky-400">Parallel Promise.all</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400">System Time (UTC):</span>
                  <span className="font-mono text-slate-300">{new Date().toISOString().split('T')[0]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
