'use client';

import { useState } from 'react';
import { Shield, QrCode, Smartphone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [tempSecret, setTempSecret] = useState('');
  const [token, setToken] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false); // In a real app, fetch initial state from API

  const handleSetup2FA = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setQrCodeUrl(data.qrCodeUrl);
      setTempSecret(data.secret);
    } catch (err: any) {
      setError(err.message || 'Failed to start 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', token, tempSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSuccess('Two-Factor Authentication successfully enabled!');
      setIs2FAEnabled(true);
      setQrCodeUrl('');
      setTempSecret('');
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable' }),
      });
      if (res.ok) {
        setIs2FAEnabled(false);
        setSuccess('Two-Factor Authentication disabled.');
      }
    } catch (err: any) {
      setError('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Security Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account security and two-factor authentication.</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${is2FAEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Two-Factor Authentication (2FA)</h2>
            <p className="text-sm text-slate-500">
              {is2FAEnabled 
                ? 'Your account is currently protected with an authenticator app.' 
                : 'Protect your account by requiring an authentication code in addition to your password.'}
            </p>
          </div>
        </div>

        <div className="p-6 bg-slate-50">
          {!is2FAEnabled && !qrCodeUrl && (
            <button
              onClick={handleSetup2FA}
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              Set Up 2FA
            </button>
          )}

          {is2FAEnabled && (
            <button
              onClick={handleDisable2FA}
              disabled={loading}
              className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-2.5 px-6 rounded-xl text-sm transition-colors"
            >
              Disable 2FA
            </button>
          )}

          {qrCodeUrl && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                  <Image src={qrCodeUrl} alt="QR Code" width={160} height={160} className="rounded-lg" />
                </div>
                <div className="space-y-4 flex-1">
                  <h3 className="font-bold text-slate-900 text-base">Scan with Authenticator App</h3>
                  <p className="text-sm text-slate-600">
                    Use Google Authenticator, Authy, or your preferred 2FA app to scan the QR code. Then, enter the 6-digit code below.
                  </p>
                  
                  <form onSubmit={handleVerify2FA} className="flex items-end gap-3 max-w-sm">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Authentication Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={token}
                        onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-center tracking-[0.5em] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || token.length !== 6}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl transition-colors disabled:opacity-50"
                    >
                      Verify
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-amber-100 text-amber-600">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
            <p className="text-sm text-slate-500">Update your account password to maintain security.</p>
          </div>
        </div>

        <div className="p-6 bg-slate-50">
          <PasswordChangeForm />
        </div>
      </div>
    </div>
  );
}

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess('Password successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="font-medium">{success}</p>
        </div>
      )}
      
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl transition-colors disabled:opacity-50 mt-2 text-sm flex justify-center items-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Update Password
      </button>
    </form>
  );
}
