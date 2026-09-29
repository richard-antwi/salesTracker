'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Bike,
  FileText,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Settings,
  Wallet,
  DollarSign,
  TrendingUp,
  Search,
  Check,
  X,
  CreditCard,
  Lock,
  UserCheck,
  Eye,
  Mail,
  Phone,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { formatCedi } from '@/lib/calculations';

type ActiveTab = 'orgs' | 'agreements' | 'vehicles' | 'payments' | 'withdrawals' | 'users' | 'billing';

export default function EnterpriseSuperAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('orgs');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Global Data State
  const [data, setData] = useState<{
    metrics: {
      totalGMV: number;
      totalCollected: number;
      totalRemaining: number;
      collectionRatePercent: number;
      activeContractsCount: number;
      overdueContractsCount: number;
      totalOrganizationsCount: number;
      totalVehiclesCount: number;
      totalUsersCount: number;
      pendingOrgsCount: number;
      pendingWithdrawalsCount: number;
      pendingWalletChangesCount: number;
    };
    organizations: any[];
    agreements: any[];
    vehicles: any[];
    payments: any[];
    users: any[];
    withdrawals: any[];
    walletChanges: any[];
    settings: { monthlySubscriptionFee: number };
  } | null>(null);

  // User Password Reset Modal State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [updatingUser, setUpdatingUser] = useState(false);
  const [userSuccessMsg, setUserSuccessMsg] = useState('');

  async function fetchGlobalData() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/super-admin/global-data');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load enterprise data');
      setData(json);
    } catch (err: any) {
      console.error('Failed to load super admin data:', err);
      setError(err.message || 'Server error loading enterprise data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGlobalData();
  }, []);

  // Handler: Organization Access Status Change
  async function handleOrgStatus(orgId: string, status: string) {
    setUpdatingId(orgId);
    try {
      const res = await fetch(`/api/super-admin/organizations/${orgId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update organization');
      await fetchGlobalData();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setUpdatingId(null);
    }
  }

  // Handler: Withdrawal Status Update
  async function handleWithdrawalStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    if (!confirm(`Are you sure you want to mark this withdrawal as ${status}?`)) return;
    setUpdatingId(id);
    try {
      const res = await fetch('/api/super-admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('Failed to update withdrawal status');
      await fetchGlobalData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  // Handler: Wallet Change Status Update
  async function handleWalletChangeStatus(id: string, action: 'APPROVED' | 'REJECTED') {
    if (!confirm(`Are you sure you want to ${action.toLowerCase()} this payout wallet change request?`)) return;
    setUpdatingId(id);
    try {
      const res = await fetch('/api/super-admin/wallet-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) throw new Error('Failed to update wallet request');
      await fetchGlobalData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  // Handler: User Password Reset
  async function handleUserPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    setUpdatingUser(true);
    setUserSuccessMsg('');
    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, newPassword }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to reset password');
      setUserSuccessMsg(`Password for ${selectedUser.name} updated successfully!`);
      setTimeout(() => {
        setSelectedUser(null);
        setNewPassword('');
        setUserSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Error updating password');
    } finally {
      setUpdatingUser(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-400">Loading Enterprise 360° Command Center...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalGMV: 0,
    totalCollected: 0,
    totalRemaining: 0,
    collectionRatePercent: 0,
    activeContractsCount: 0,
    overdueContractsCount: 0,
    totalOrganizationsCount: 0,
    totalVehiclesCount: 0,
    totalUsersCount: 0,
    pendingOrgsCount: 0,
    pendingWithdrawalsCount: 0,
    pendingWalletChangesCount: 0,
  };

  // Filter datasets based on search query
  const query = searchQuery.toLowerCase().trim();

  const filteredOrgs = (data?.organizations || []).filter(
    (o) => o.name.toLowerCase().includes(query) || o.slug.toLowerCase().includes(query) || (o.contactEmail && o.contactEmail.toLowerCase().includes(query))
  );

  const filteredAgreements = (data?.agreements || []).filter(
    (a) =>
      a.hirer?.name.toLowerCase().includes(query) ||
      a.vehicle?.registrationNo.toLowerCase().includes(query) ||
      a.ownerName.toLowerCase().includes(query) ||
      a.organization?.name.toLowerCase().includes(query)
  );

  const filteredVehicles = (data?.vehicles || []).filter(
    (v) =>
      v.registrationNo.toLowerCase().includes(query) ||
      v.makeModel.toLowerCase().includes(query) ||
      (v.chassisNo && v.chassisNo.toLowerCase().includes(query)) ||
      (v.organization?.name && v.organization.name.toLowerCase().includes(query))
  );

  const filteredPayments = (data?.payments || []).filter(
    (p) =>
      (p.reference && p.reference.toLowerCase().includes(query)) ||
      p.agreement?.vehicle?.registrationNo.toLowerCase().includes(query) ||
      p.agreement?.hirer?.name.toLowerCase().includes(query) ||
      p.organization?.name.toLowerCase().includes(query)
  );

  const filteredUsers = (data?.users || []).filter(
    (u) =>
      u.name.toLowerCase().includes(query) ||
      u.phone.includes(query) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.organization?.name && u.organization.name.toLowerCase().includes(query))
  );

  const filteredWithdrawals = (data?.withdrawals || []).filter(
    (w) => w.organization?.name.toLowerCase().includes(query) || (w.note && w.note.toLowerCase().includes(query))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-emerald-500 selection:text-white">
      {/* Top Enterprise Command Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                  Super Admin Command Center
                </h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold tracking-wide uppercase">
                  Enterprise 360°
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Platform Operator Console &bull; <span className="text-emerald-400 font-semibold">Richard Antwi</span>
              </p>
            </div>
          </div>

          {/* Quick Action Header Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={fetchGlobalData}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              href="/super-admin/finance"
              className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Finance & Payouts</span>
            </Link>

            <Link
              href="/super-admin/settings"
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2 hover:text-white"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>

            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              }}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* Executive Portfolio KPI Board */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* GMV */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total GMV Capital</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-lg sm:text-xl font-black text-white">{formatCedi(metrics.totalGMV)}</p>
            <span className="text-[10px] text-slate-400 mt-1 font-medium">All Fleet Contracts</span>
          </div>

          {/* Capital Collected */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Collected</span>
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-lg sm:text-xl font-black text-teal-400">{formatCedi(metrics.totalCollected)}</p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.collectionRatePercent)}%` }}
              ></div>
            </div>
          </div>

          {/* Capital Outstanding */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Outstanding Principal</span>
              <CreditCard className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-lg sm:text-xl font-black text-indigo-300">{formatCedi(metrics.totalRemaining)}</p>
            <span className="text-[10px] text-indigo-400/80 mt-1 font-semibold">{metrics.collectionRatePercent}% Paid Off</span>
          </div>

          {/* Active vs Overdue */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active / Overdue</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-black text-emerald-400">{metrics.activeContractsCount}</p>
              <span className="text-xs text-slate-400 font-bold">Active</span>
              {metrics.overdueContractsCount > 0 && (
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  {metrics.overdueContractsCount} Overdue
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 font-medium">{metrics.totalVehiclesCount} Motors Enrolled</span>
          </div>

          {/* Organizations & Users */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Fleets & Users</span>
              <Building2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-black text-white">{metrics.totalOrganizationsCount}</p>
              <span className="text-xs text-slate-400 font-bold">Fleets</span>
              <span className="text-xs text-slate-400">({metrics.totalUsersCount} users)</span>
            </div>
            <span className="text-[10px] text-sky-400 mt-1 font-semibold">Multi-Tenant Platform</span>
          </div>

          {/* Pending Alerts */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Action Items</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-xl font-black text-amber-400">
              {metrics.pendingOrgsCount + metrics.pendingWithdrawalsCount + metrics.pendingWalletChangesCount}
            </p>
            <span className="text-[10px] text-slate-400 mt-1 font-medium">
              {metrics.pendingOrgsCount} Orgs &bull; {metrics.pendingWithdrawalsCount} Payouts
            </span>
          </div>
        </section>

        {/* Search & Main Tab Bar Container */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('orgs')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'orgs'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Fleet Orgs ({data?.organizations.length || 0})</span>
              {metrics.pendingOrgsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('agreements')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'agreements'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Contracts ({data?.agreements.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('vehicles')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'vehicles'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>Motors ({data?.vehicles.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'payments'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Ledger ({data?.payments.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'withdrawals'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Payouts ({data?.withdrawals.length || 0})</span>
              {metrics.pendingWithdrawalsCount > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-black rounded-full text-[9px]">
                  {metrics.pendingWithdrawalsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users ({data?.users.length || 0})</span>
            </button>
          </div>

          {/* Interactive Instant Search Filter */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Filter ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs font-medium pl-9 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: Organizations & Fleet Owners */}
        {activeTab === 'orgs' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" /> Fleet Owner Organizations Directory
              </h2>
              <span className="text-xs text-slate-400 font-medium">Showing {filteredOrgs.length} of {data?.organizations.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Organization</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Contact Email / Phone</th>
                    <th className="p-3.5">Fleet Size</th>
                    <th className="p-3.5">Payout Details</th>
                    <th className="p-3.5 text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm">{org.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">slug: {org.slug} &bull; Created {new Date(org.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                            org.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : org.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                              : org.status === 'SUSPENDED'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {org.status}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="text-white">{org.contactEmail}</div>
                        <div className="text-[10px] text-slate-400">{org.contactPhone || 'No phone'}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3 text-slate-300">
                          <span><strong>{org._count?.vehicles || 0}</strong> motors</span>
                          <span>&bull;</span>
                          <span><strong>{org._count?.agreements || 0}</strong> contracts</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {org.payoutNetwork ? (
                          <div>
                            <span className="font-bold text-emerald-400">{org.payoutNetwork}</span> &bull; {org.payoutAccountName}
                            <div className="text-[10px] font-mono text-slate-400">{org.payoutAccountNumber}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unconfigured</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {org.status !== 'APPROVED' && (
                            <button
                              onClick={() => handleOrgStatus(org.id, 'APPROVED')}
                              disabled={updatingId === org.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Approve
                            </button>
                          )}

                          {org.status === 'APPROVED' && (
                            <button
                              onClick={() => handleOrgStatus(org.id, 'SUSPENDED')}
                              disabled={updatingId === org.id}
                              className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg font-bold text-[11px] transition-colors disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Global Contracts & Agreements Vault */}
        {activeTab === 'agreements' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Nationwide Agreements Vault
              </h2>
              <span className="text-xs text-slate-400 font-medium">Showing {filteredAgreements.length} contracts</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Contract / Hirer</th>
                    <th className="p-3.5">Fleet Owner</th>
                    <th className="p-3.5">Vehicle</th>
                    <th className="p-3.5">Terms & Price</th>
                    <th className="p-3.5">Progress & Balance</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredAgreements.map((ag) => (
                    <tr key={ag.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm">{ag.hirer?.name || 'Unassigned'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{ag.hirer?.phone} &bull; Started {new Date(ag.startDate).toLocaleDateString()}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-white font-semibold">{ag.ownerName}</div>
                        <div className="text-[10px] text-slate-400">{ag.organization?.name}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-emerald-400">{ag.vehicle?.registrationNo}</div>
                        <div className="text-[10px] text-slate-400">{ag.vehicle?.makeModel}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{formatCedi(ag.hirePurchasePrice)}</div>
                        <div className="text-[10px] text-slate-400">
                          {formatCedi(ag.installmentAmount)} / {ag.frequency.toLowerCase()} ({ag.totalInstallments} total)
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-amber-400">{formatCedi(ag.summary.balanceRemaining)} left</div>
                        <div className="w-24 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-400 h-full rounded-full"
                            style={{ width: `${ag.summary.percentComplete}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            ag.summary.statusBadge.variant === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : ag.summary.statusBadge.variant === 'danger'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {ag.summary.statusBadge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <Link
                          href={`/admin/agreements/${ag.id}`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Vehicles & Motor Registry */}
        {activeTab === 'vehicles' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <Bike className="w-4 h-4 text-emerald-400" /> Universal Vehicle Registry
              </h2>
              <span className="text-xs text-slate-400 font-medium">{filteredVehicles.length} motors found</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Registration No</th>
                    <th className="p-3.5">Make & Model</th>
                    <th className="p-3.5">Fleet Owner</th>
                    <th className="p-3.5">Assigned Rider</th>
                    <th className="p-3.5">Chassis / Engine No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-emerald-400 text-sm">{v.registrationNo}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{v.makeModel}</div>
                        <div className="text-[10px] text-slate-400">{v.colorYear || 'No color/year'}</div>
                      </td>
                      <td className="p-3.5 text-slate-300 font-semibold">{v.organization?.name}</td>
                      <td className="p-3.5">
                        {v.agreement?.hirer ? (
                          <div>
                            <span className="font-bold text-white">{v.agreement.hirer.name}</span>
                            <div className="text-[10px] text-slate-400">{v.agreement.hirer.phone}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                        <div>Chassis: {v.chassisNo || 'N/A'}</div>
                        <div>Engine: {v.engineNo || 'N/A'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Payments Ledger */}
        {activeTab === 'payments' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" /> Platform Financial Ledger
              </h2>
              <span className="text-xs text-slate-400 font-medium">Top {filteredPayments.length} recent transactions</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Date Paid</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Channel</th>
                    <th className="p-3.5">Vehicle & Rider</th>
                    <th className="p-3.5">Organization</th>
                    <th className="p-3.5">Reference / Audit Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className={`hover:bg-slate-800/40 transition-colors ${p.voided ? 'opacity-50 line-through bg-rose-950/20' : ''}`}>
                      <td className="p-3.5 text-slate-300">{new Date(p.datePaid).toLocaleString()}</td>
                      <td className="p-3.5 font-bold text-white text-sm">{formatCedi(p.amount)}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-bold text-[10px]">{p.channel}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-emerald-400 font-mono">{p.agreement?.vehicle?.registrationNo}</div>
                        <div className="text-[10px] text-slate-400">{p.agreement?.hirer?.name}</div>
                      </td>
                      <td className="p-3.5 text-slate-400">{p.organization?.name}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">{p.reference || p.note || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: Withdrawals & Payouts */}
        {activeTab === 'withdrawals' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" /> Fleet Owner Payout & Withdrawal Requests
              </h2>
              <span className="text-xs text-slate-400 font-medium">{filteredWithdrawals.length} withdrawal requests</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Organization</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Date Requested</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Approve / Reject</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredWithdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white">{w.organization?.name}</td>
                      <td className="p-3.5 font-black text-emerald-400 text-sm">{formatCedi(w.amount)}</td>
                      <td className="p-3.5 text-slate-400">{new Date(w.createdAt).toLocaleString()}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            w.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : w.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {w.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleWithdrawalStatus(w.id, 'APPROVED')}
                              disabled={updatingId === w.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition-colors"
                            >
                              Approve Payout
                            </button>
                            <button
                              onClick={() => handleWithdrawalStatus(w.id, 'REJECTED')}
                              disabled={updatingId === w.id}
                              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg font-bold text-[11px] transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: System Users Directory */}
        {activeTab === 'users' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" /> Platform User Accounts Directory
              </h2>
              <span className="text-xs text-slate-400 font-medium">{filteredUsers.length} registered users</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">User Name</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Phone / Email</th>
                    <th className="p-3.5">Organization</th>
                    <th className="p-3.5 text-right">Reset Password</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white text-sm">{u.name}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : u.role === 'ADMIN'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="text-white font-mono">{u.phone}</div>
                        <div className="text-[10px] text-slate-400">{u.email || 'No email'}</div>
                      </td>
                      <td className="p-3.5 text-slate-300 font-semibold">{u.organization?.name || 'Platform Wide'}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setNewPassword('');
                            setUserSuccessMsg('');
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3 text-amber-400" /> Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Reset User Password Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" /> Reset User Password
              </h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUserPasswordReset} className="space-y-4">
              <div>
                <p className="text-xs text-slate-400">Target User:</p>
                <p className="font-bold text-white text-sm">{selectedUser.name} ({selectedUser.phone})</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl text-xs p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {userSuccessMsg && (
                <p className="text-xs p-2.5 rounded-lg border font-semibold text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                  {userSuccessMsg}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingUser}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {updatingUser ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
