'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, Shield, User, Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // First Login Password Change state
  const [mustChangePwdUser, setMustChangePwdUser] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePwdError, setChangePwdError] = useState('');
  const [changePwdSuccess, setChangePwdSuccess] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.user?.mustChangePassword) {
        setMustChangePwdUser(true);
        setLoading(false);
        return;
      }

      // Redirect based on role
      if (data.user?.role === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (data.user?.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/rider');
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangePwdError('');
    if (newPassword !== confirmPassword) {
      setChangePwdError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setChangePwdError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setChangePwdSuccess(true);
      setTimeout(() => {
        router.push('/rider');
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setChangePwdError(err instanceof Error ? err.message : 'Error changing password');
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAdmin() {
    setIdentifier('0240000000');
    setPassword('Admin123!');
    setError('');
  }

  function fillDemoRider() {
    setIdentifier('0241112233');
    setPassword('Rider123!');
    setError('');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Subtle Background Radial Accent */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md">
        {/* App Logo & Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl mb-4 border border-emerald-400/30">
            <Bike className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Work & Pay</h1>
          <p className="text-slate-400 text-sm mt-1">Motorcycle Hire-Purchase Platform — Ghana</p>
        </div>

        {mustChangePwdUser ? (
          /* First-Time Login Password Change Screen (Per Requirement #1) */
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <Shield className="w-6 h-6 shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white">First Login Password Update</h2>
                <p className="text-xs text-slate-400">Please choose a new secure password for your account</p>
              </div>
            </div>

            {changePwdSuccess ? (
              <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-4 text-emerald-300 text-center flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <span className="font-semibold text-sm">Password updated successfully!</span>
                <span className="text-xs text-emerald-400/80">Redirecting to your dashboard...</span>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {changePwdError && (
                  <div className="bg-rose-950/60 border border-rose-800 text-rose-300 px-3 py-2.5 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{changePwdError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
                >
                  {loading ? 'Updating Password...' : 'Set Password & Continue'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Standard Login Form */
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number or Email</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 0241112233 or admin@workandpay.gh"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Demo Quick Logins for Testing */}
            <div className="mt-8 pt-6 border-t border-slate-800/80">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
                Demo Quick Access
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={fillDemoAdmin}
                  className="bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 p-2.5 rounded-xl text-xs font-medium text-left flex flex-col gap-0.5 transition-colors group"
                >
                  <span className="text-emerald-400 font-semibold group-hover:text-emerald-300 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">Emmanuel Osei</span>
                </button>

                <button
                  type="button"
                  onClick={fillDemoRider}
                  className="bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 p-2.5 rounded-xl text-xs font-medium text-left flex flex-col gap-0.5 transition-colors group"
                >
                  <span className="text-amber-400 font-semibold group-hover:text-amber-300 flex items-center gap-1">
                    <Bike className="w-3 h-3" /> Rider
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">Kwesi Mensah</span>
                </button>
              </div>
            </div>

            {/* Public Request Access Link */}
            <div className="mt-5 text-center pt-4 border-t border-slate-800/60">
              <p className="text-xs text-slate-400 mb-1.5">Manage a motorcycle fleet?</p>
              <a
                href="/request-access"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 rounded-lg border border-emerald-500/20"
              >
                <span>Request Organization Access</span> &rarr;
              </a>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-slate-500">
          Work & Pay Hire-Purchase System &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
