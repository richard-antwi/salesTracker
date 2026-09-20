'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Shield, Phone, Mail, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { isValidGhanaPhone } from '@/lib/validation';

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
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'GUARANTOR'>('GUARANTOR');
  const [filterRole, setFilterRole] = useState<'ALL' | 'ADMIN' | 'GUARANTOR'>('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdUserNotice, setCreatedUserNotice] = useState<{
    name: string;
    phone: string;
    role: string;
    password: string;
    email?: string | null;
  } | null>(null);

  const phoneError = phoneTouched && !isValidGhanaPhone(phone) ? 'Enter a valid Ghana phone number (10 digits, starting with 0)' : '';

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

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setPhoneTouched(true);

    if (!name || !phone) {
      setError('Please fill in required fields (Name & Phone).');
      return;
    }

    if (!isValidGhanaPhone(phone)) {
      setError('Phone number is invalid. Enter a 10-digit Ghana mobile number starting with 0 (e.g. 0244123456).');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, password: password || undefined, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user account');
      }

      if (data.assignedPassword) {
        setCreatedUserNotice({
          name: data.user.name,
          phone: data.user.phone,
          role: data.user.role,
          password: data.assignedPassword,
          email: data.user.email,
        });
      }

      setSuccess(`${role === 'GUARANTOR' ? 'Guarantor' : 'Admin'} account created successfully for ${data.user.name}`);
      setName('');
      setPhone('');
      setPhoneTouched(false);
      setEmail('');
      setPassword('');
      await fetchAdminUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating user account');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredUsers = users.filter((u) => (filterRole === 'ALL' ? true : u.role === filterRole));

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
            <Shield className="w-5 h-5 text-emerald-600" /> Organization User & Account Access Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Provision and manage accounts for Fleet Administrators and Guarantors.
          </p>
        </div>

        {/* Created User Credentials Notice Banner */}
        {createdUserNotice && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Account Created & Login Credentials Dispatched!</span>
              </div>
              <button
                type="button"
                onClick={() => setCreatedUserNotice(null)}
                className="text-xs text-emerald-700 hover:text-emerald-950 font-bold underline"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-emerald-800">
              {createdUserNotice.email
                ? `An automated email with login credentials has been sent to ${createdUserNotice.email}.`
                : 'Account generated. Please copy these credentials and share with the user.'}
            </p>
            <div className="bg-white border border-emerald-200 rounded-xl p-3.5 text-xs space-y-1.5 font-mono">
              <div>Account Name: <strong className="text-slate-900">{createdUserNotice.name}</strong> ({createdUserNotice.role})</div>
              <div>Phone Number: <strong className="text-slate-900">{createdUserNotice.phone}</strong></div>
              <div>
                Auto-Generated Temporary Password:{' '}
                <strong className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-xs font-mono">
                  {createdUserNotice.password}
                </strong>
              </div>
              <div className="text-[11px] text-rose-700 font-sans font-semibold pt-1">
                🔒 User will be forced to change this password on first login.
              </div>
            </div>
          </div>
        )}

        {/* Quick Role Preset Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRole('GUARANTOR')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              role === 'GUARANTOR'
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Guarantor Account</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('ADMIN')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              role === 'ADMIN'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Create Fleet Admin Account</span>
          </button>
        </div>

        {/* Create User Form */}
        <form onSubmit={handleCreateUser} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-600" /> Add New {role === 'GUARANTOR' ? 'Guarantor' : 'Fleet Admin'} Account
            </h3>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${role === 'GUARANTOR' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-100 text-emerald-900 border-emerald-300'}`}>
              Selected Role: {role}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'GUARANTOR')}
                className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
              >
                <option value="GUARANTOR">GUARANTOR (Read-Only Portal Access for Hirer Guarantor)</option>
                <option value="ADMIN">ADMIN (Full Fleet Management Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={role === 'GUARANTOR' ? 'e.g. Kofi Guarantor' : 'e.g. Kwame Admin'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number (Ghana 10-digit) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 0208889900"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (!phoneTouched) setPhoneTouched(true);
                }}
                onBlur={() => setPhoneTouched(true)}
                className={`w-full bg-white border rounded-xl text-xs p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none ${phoneError ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-200'}`}
              />
              {phoneError && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {phoneError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (Optional for credentials)</label>
              <input
                type="email"
                placeholder="e.g. guarantor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Password <span className="text-slate-400 font-normal">(Leave blank to auto-generate unique password)</span>
              </label>
              <input
                type="password"
                placeholder="Leave blank to auto-generate unique password (e.g. WP-GUA-XXXXXX)"
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
              className={`${role === 'GUARANTOR' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors disabled:opacity-50 inline-flex items-center gap-1.5`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Creating Account...' : `Create ${role === 'GUARANTOR' ? 'Guarantor' : 'Admin'} Account`}</span>
            </button>
          </div>
        </form>

        {/* User Accounts List */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Registered Accounts</h3>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterRole('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${filterRole === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                All ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterRole('ADMIN')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${filterRole === 'ADMIN' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Admins ({users.filter((u) => u.role === 'ADMIN').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterRole('GUARANTOR')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${filterRole === 'GUARANTOR' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Guarantors ({users.filter((u) => u.role === 'GUARANTOR').length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-6 text-slate-400 text-xs">Loading user accounts...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">No Accounts Found</h3>
              <p className="text-xs text-slate-500">There are no {filterRole !== 'ALL' ? filterRole.toLowerCase() : ''} accounts matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredUsers.map((u) => (
                <div key={u.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm">{u.name}</span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        u.role === 'GUARANTOR'
                          ? 'bg-amber-100 text-amber-900 border-amber-200'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p className="flex items-center gap-1 font-mono">
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
