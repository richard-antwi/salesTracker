'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Shield, Phone, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function fetchAdminUsers() {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone || !password) {
      setError('Please fill in all required fields (Name, Phone, Password).');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create admin user');
      }

      setSuccess(`Admin account created successfully for ${data.user.name}`);
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      await fetchAdminUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating admin user');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" /> Admin User Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create and manage additional administrator accounts with full fleet management access.
          </p>
        </div>

        {/* Create Admin Form */}
        <form onSubmit={handleCreateAdmin} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-emerald-600" /> Add New Administrator
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kwame Mensah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 0244123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (Optional)</label>
              <input
                type="email"
                placeholder="e.g. kwame@workandpay.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Creating...' : 'Create Admin Account'}</span>
            </button>
          </div>
        </form>

        {/* Existing Admin Accounts List */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Current Administrator Accounts</h3>

          {loading ? (
            <div className="text-center py-6 text-slate-400 text-xs">Loading admin accounts...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {users.map((u) => (
                <div key={u.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm">{u.name}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                      ADMIN
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {u.phone}
                    </p>
                    {u.email && (
                      <p className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" /> {u.email}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 pt-1">
                      Registered: {new Date(u.createdAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
