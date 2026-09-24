'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function PasswordChangeForm() {
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
          <AlertTriangle className="w-4 h-4 shrink-0" />
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
          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900"
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
