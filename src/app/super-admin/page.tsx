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
  Edit,
  Smartphone,
  Send,
  MessageSquare,
} from 'lucide-react';
import { formatCedi } from '@/lib/calculations';

type ActiveTab = 'orgs' | 'agreements' | 'vehicles' | 'payments' | 'withdrawals' | 'users' | 'wallets' | 'billing' | 'sms';

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
    smsLogs?: any[];
  } | null>(null);

  // Super Admin Agreement Inspection Modal State
  const [inspectingAgreement, setInspectingAgreement] = useState<any | null>(null);

  // Edit Agreement Modal State (Super Admin Native)
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const [editCashPrice, setEditCashPrice] = useState('');
  const [editHpPrice, setEditHpPrice] = useState('');
  const [editInstallment, setEditInstallment] = useState('');
  const [editFrequency, setEditFrequency] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [editTotalInstallments, setEditTotalInstallments] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editMakeModel, setEditMakeModel] = useState('');
  const [editRegNo, setEditRegNo] = useState('');
  const [editHirerName, setEditHirerName] = useState('');
  const [editHirerPhone, setEditHirerPhone] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerPhone, setEditOwnerPhone] = useState('');

  // User Password Reset Modal State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [updatingUser, setUpdatingUser] = useState(false);
  const [userSuccessMsg, setUserSuccessMsg] = useState('');

  // SMS Hub & Messaging Center State
  const [smsBalance, setSmsBalance] = useState<number | null>(null);
  const [smsLoadingBalance, setSmsLoadingBalance] = useState(false);
  const [smsRecipientMode, setSmsRecipientMode] = useState<'all' | 'selected' | 'test'>('selected');
  const [smsSelectedRiderIds, setSmsSelectedRiderIds] = useState<string[]>([]);
  const [smsBroadcastMessage, setSmsBroadcastMessage] = useState('');
  const [smsTestNumber, setSmsTestNumber] = useState('0592303054');
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [togglingRiderId, setTogglingRiderId] = useState<string | null>(null);
  const [riderSearchFilter, setRiderSearchFilter] = useState('');

  async function fetchSmsBalance() {
    try {
      setSmsLoadingBalance(true);
      const res = await fetch('/api/super-admin/sms/balance');
      const json = await res.json();
      if (res.ok) {
        setSmsBalance(json.balance);
      }
    } catch (e) {
      console.error('Failed to load SMS balance', e);
    } finally {
      setSmsLoadingBalance(false);
    }
  }

  async function handleToggleRiderPaymentSms(riderId: string, currentState: boolean) {
    try {
      setTogglingRiderId(riderId);
      const newState = !currentState;
      const res = await fetch('/api/super-admin/sms/riders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId, receivePaymentSms: newState }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update rider SMS setting');
      setData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: (prev.users || []).map((u: any) =>
            u.id === riderId ? { ...u, receivePaymentSms: newState } : u
          ),
        };
      });
    } catch (err: any) {
      alert(err.message || 'Error updating rider SMS setting');
    } finally {
      setTogglingRiderId(null);
    }
  }

  async function handleSendBroadcastSms(e: React.FormEvent) {
    e.preventDefault();
    if (!smsBroadcastMessage.trim()) {
      alert('Please enter an SMS message body');
      return;
    }

    if (smsRecipientMode === 'test' && !smsTestNumber.trim()) {
      alert('Please enter a test phone number (e.g. 0592303054)');
      return;
    }

    if (smsRecipientMode === 'selected' && smsSelectedRiderIds.length === 0) {
      alert('Please select at least one rider checkbox to message');
      return;
    }

    const recipientCount =
      smsRecipientMode === 'test'
        ? 1
        : smsRecipientMode === 'all'
        ? (data?.users || []).filter((u: any) => u.role === 'RIDER').length
        : smsSelectedRiderIds.length;

    if (!confirm(`Are you sure you want to dispatch SMS to ${recipientCount} recipient(s)?`)) {
      return;
    }

    setSmsSending(true);
    setSmsResult(null);

    try {
      const res = await fetch('/api/super-admin/sms/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientMode: smsRecipientMode,
          selectedUserIds: smsSelectedRiderIds,
          message: smsBroadcastMessage,
          testPhone: smsTestNumber,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send SMS');

      setSmsResult({
        success: true,
        message: `Dispatched successfully! Delivered: ${json.delivered}, Failed: ${json.failed}`,
        details: json,
      });

      fetchSmsBalance();
      fetchGlobalData();
    } catch (err: any) {
      setSmsResult({
        success: false,
        message: err.message || 'Failed to dispatch SMS',
      });
    } finally {
      setSmsSending(false);
    }
  }

  async function fetchGlobalData() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/super-admin/global-data');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load enterprise data');
      setData(json);

      // Keep inspectingAgreement updated if opened
      if (inspectingAgreement) {
        const updated = (json.agreements || []).find((a: any) => a.id === inspectingAgreement.id);
        if (updated) setInspectingAgreement(updated);
      }
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

  function openEditModal(ag: any) {
    setEditCashPrice(String(ag.cashPrice));
    setEditHpPrice(String(ag.hirePurchasePrice));
    setEditInstallment(String(ag.installmentAmount));
    setEditFrequency(ag.frequency);
    setEditTotalInstallments(String(ag.totalInstallments));
    setEditStartDate(new Date(ag.startDate).toISOString().split('T')[0]);

    setEditMakeModel(ag.vehicle?.makeModel || '');
    setEditRegNo(ag.vehicle?.registrationNo || '');

    setEditHirerName(ag.hirer?.name || '');
    setEditHirerPhone(ag.hirer?.phone || '');

    setEditOwnerName(ag.ownerName || '');
    setEditOwnerPhone(ag.ownerPhone || '');

    setEditError('');
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inspectingAgreement) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const res = await fetch(`/api/agreements/${inspectingAgreement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: editOwnerName,
          ownerPhone: editOwnerPhone,
          cashPrice: editCashPrice,
          hirePurchasePrice: editHpPrice,
          installmentAmount: editInstallment,
          frequency: editFrequency,
          totalInstallments: editTotalInstallments,
          startDate: editStartDate,
          vehicle: {
            makeModel: editMakeModel,
            registrationNo: editRegNo,
          },
          hirer: {
            name: editHirerName,
            phone: editHirerPhone,
          },
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update agreement');
      await fetchGlobalData();
      setShowEditModal(false);
    } catch (err: any) {
      setEditError(err.message || 'Error saving changes');
    } finally {
      setSavingEdit(false);
    }
  }

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

  // Handler: Wallet Change Request Approval / Rejection
  async function handleWalletChangeStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this wallet change request?`)) return;
    setUpdatingId(id);
    try {
      const res = await fetch('/api/super-admin/wallet-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update wallet request');
      alert(resData.message || 'Wallet change request updated.');
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

            <button
              onClick={() => {
                setActiveTab('sms');
                fetchSmsBalance();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'sms'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>SMS Hub</span>
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
                    <th className="p-3.5 text-right">Super Admin Control</th>
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
                        <button
                          onClick={() => setInspectingAgreement(ag)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 hover:border-emerald-500/40 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Inspect Contract</span>
                        </button>
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
          <div className="space-y-6">
            {/* Wallet Change Approval Requests (Anti-Scam Verification) */}
            {data?.walletChanges && data.walletChanges.filter((wc: any) => wc.status === 'PENDING').length > 0 && (
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                  <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-400" /> Anti-Scam Security: Pending Wallet Update Requests ({data.walletChanges.filter((wc: any) => wc.status === 'PENDING').length})
                  </h3>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 uppercase tracking-wider">
                    Super Admin Verification Required
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.walletChanges
                    .filter((wc: any) => wc.status === 'PENDING')
                    .map((wc: any) => (
                      <div key={wc.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{wc.organization?.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">Requested by: {wc.requestedBy}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Current Verified Wallet</p>
                            <p className="font-semibold text-slate-400 text-[11px] truncate">
                              {wc.organization?.payoutNetwork || 'None'} &bull; {wc.organization?.payoutAccountName || 'Not Set'}
                            </p>
                            <p className="font-mono text-slate-500 text-[11px]">{wc.organization?.payoutAccountNumber || 'N/A'}</p>
                          </div>
                          <div className="border-l border-slate-800 pl-2">
                            <p className="text-[10px] text-emerald-400 font-bold uppercase">Requested New Wallet</p>
                            <p className="font-bold text-emerald-300 text-[11px]">
                              {wc.newNetwork} &bull; {wc.newAccountName}
                            </p>
                            <p className="font-mono text-white text-[11px] font-bold">{wc.newAccountNumber}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleWalletChangeStatus(wc.id, 'REJECTED')}
                            disabled={updatingId === wc.id}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all"
                          >
                            Reject Request
                          </button>
                          <button
                            onClick={() => handleWalletChangeStatus(wc.id, 'APPROVED')}
                            disabled={updatingId === wc.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                          >
                            Approve Wallet Update
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Withdrawal Requests Main Table */}
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
                      <th className="p-3.5">Destination Payout Wallet</th>
                      <th className="p-3.5">Amount Requested</th>
                      <th className="p-3.5">Date Requested</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Approve / Reject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredWithdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-white">{w.organization?.name}</td>
                        <td className="p-3.5">
                          {w.organization?.payoutAccountNumber ? (
                            <div>
                              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-extrabold uppercase">
                                  {w.organization.payoutNetwork || 'MOMO'}
                                </span>
                                <span>{w.organization.payoutAccountName}</span>
                              </div>
                              <div className="font-mono text-slate-300 text-[11px] mt-0.5">
                                {w.organization.payoutAccountNumber}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                              ⚠️ No Verified Wallet Registered
                            </span>
                          )}
                        </td>
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
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition-colors shadow-sm"
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

        {/* TAB 7: All Fleet Admin Verified Payout Wallets Directory */}
        {activeTab === 'wallets' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Fleet Owner Verified Payout Wallets Directory
              </h2>
              <span className="text-xs text-slate-400 font-medium">Showing {filteredOrgs.length} fleet owner wallets</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Organization</th>
                    <th className="p-3.5">Contact Email / Phone</th>
                    <th className="p-3.5">Verified Payout Network</th>
                    <th className="p-3.5">Account Name</th>
                    <th className="p-3.5">Account / Phone Number</th>
                    <th className="p-3.5">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white text-sm">{org.name}</td>
                      <td className="p-3.5">
                        <div className="text-white">{org.contactEmail}</div>
                        <div className="text-[10px] text-slate-400">{org.contactPhone || 'N/A'}</div>
                      </td>
                      <td className="p-3.5 font-bold text-emerald-400">
                        {org.payoutNetwork ? (
                          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-extrabold uppercase">
                            {org.payoutNetwork}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Not Configured</span>
                        )}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-200">{org.payoutAccountName || 'N/A'}</td>
                      <td className="p-3.5 font-mono text-white text-xs">{org.payoutAccountNumber || 'N/A'}</td>
                      <td className="p-3.5">
                        {org.payoutAccountNumber ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            VERIFIED & ACTIVE
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            NO WALLET REGISTERED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: SMS HUB & MESSAGING SUITE */}
        {activeTab === 'sms' && (
          <div className="space-y-6">
            {/* Top Gateway Status & Credit Balance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SMS Gateway</span>
                  <h3 className="text-base font-black text-white mt-1">SMSOnlineGH (v5)</h3>
                  <p className="text-xs text-emerald-400 font-mono mt-0.5">dev.smsonlinegh.com</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Credit Balance</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-2xl font-black text-white">
                      {smsBalance !== null ? Number(smsBalance).toLocaleString() : '---'}
                    </h3>
                    <span className="text-xs text-slate-400 font-bold">SMS Units</span>
                  </div>
                  <button
                    onClick={fetchSmsBalance}
                    disabled={smsLoadingBalance}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 mt-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${smsLoadingBalance ? 'animate-spin' : ''}`} />
                    <span>Check Live Balance</span>
                  </button>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment SMS Gating</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-2xl font-black text-amber-400">
                      {(data?.users || []).filter((u: any) => u.role === 'RIDER' && u.receivePaymentSms).length} /{' '}
                      {(data?.users || []).filter((u: any) => u.role === 'RIDER').length}
                    </h3>
                    <span className="text-xs text-slate-400 font-bold">Riders Opted In</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Overdue SMS is automatic for all</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Quick Test SMS Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Quick Personal Number Test</h4>
                  <p className="text-[11px] text-slate-400">Test live gateway delivery to your personal phone number</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={smsTestNumber}
                  onChange={(e) => setSmsTestNumber(e.target.value)}
                  placeholder="0592303054"
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono w-36 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  disabled={smsSending}
                  onClick={() => {
                    setSmsRecipientMode('test');
                    if (!smsBroadcastMessage) {
                      setSmsBroadcastMessage('Work & Pay Live System Test: SMS integration via SMSOnlineGH is active.');
                    }
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Set as Target</span>
                </button>
              </div>
            </div>

            {/* Feedback Message */}
            {smsResult && (
              <div
                className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
                  smsResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <span>{smsResult.message}</span>
                <button onClick={() => setSmsResult(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Main Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Rider Payment SMS Opt-In & Selection Table (7 Cols) */}
              <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" /> Rider SMS Management
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Toggle who receives SMS on payment recording, or select riders for broadcast.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Search riders..."
                      value={riderSearchFilter}
                      onChange={(e) => setRiderSearchFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white w-full sm:w-40 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const allRiderIds = (data?.users || [])
                          .filter((u: any) => u.role === 'RIDER')
                          .map((u: any) => u.id);
                        if (smsSelectedRiderIds.length === allRiderIds.length) {
                          setSmsSelectedRiderIds([]);
                        } else {
                          setSmsSelectedRiderIds(allRiderIds);
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-bold whitespace-nowrap"
                    >
                      {smsSelectedRiderIds.length > 0 ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto flex-1 max-h-[520px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10 border-b border-slate-800">
                      <tr>
                        <th className="p-3 text-center w-10">Select</th>
                        <th className="p-3">Rider Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Fleet Org</th>
                        <th className="p-3 text-center">Payment SMS</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {(data?.users || [])
                        .filter((u: any) => u.role === 'RIDER')
                        .filter((u: any) => {
                          if (!riderSearchFilter) return true;
                          const q = riderSearchFilter.toLowerCase();
                          return (
                            u.name.toLowerCase().includes(q) ||
                            u.phone.toLowerCase().includes(q) ||
                            (u.organization?.name || '').toLowerCase().includes(q)
                          );
                        })
                        .map((rider: any) => {
                          const isSelected = smsSelectedRiderIds.includes(rider.id);
                          const isToggling = togglingRiderId === rider.id;
                          return (
                            <tr
                              key={rider.id}
                              className={`hover:bg-slate-800/40 transition-colors ${
                                isSelected ? 'bg-emerald-500/5' : ''
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSmsSelectedRiderIds((prev) => [...prev, rider.id]);
                                    } else {
                                      setSmsSelectedRiderIds((prev) => prev.filter((id) => id !== rider.id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-white">{rider.name}</div>
                                {rider.email && (
                                  <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                                    {rider.email}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 font-mono text-emerald-400 font-semibold">{rider.phone}</td>
                              <td className="p-3 text-slate-300 text-[11px]">{rider.organization?.name || 'N/A'}</td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    rider.receivePaymentSms
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                                  }`}
                                >
                                  {rider.receivePaymentSms ? 'ENABLED' : 'DISABLED'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  disabled={isToggling}
                                  onClick={() => handleToggleRiderPaymentSms(rider.id, Boolean(rider.receivePaymentSms))}
                                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                                    rider.receivePaymentSms
                                      ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                                  } disabled:opacity-50`}
                                >
                                  {isToggling ? 'Updating...' : rider.receivePaymentSms ? 'Disable' : 'Enable'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: SMS Broadcast Composer & Phone Preview (5 Cols) */}
              <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-400" /> Send Custom SMS
                      </h3>
                      <p className="text-[11px] text-slate-400">Dispatch targeted SMS directly via SMSOnlineGH</p>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-950 px-2.5 py-1 rounded-md text-emerald-400 border border-slate-800">
                      Sender: WorkAndPay
                    </span>
                  </div>

                  <form onSubmit={handleSendBroadcastSms} className="space-y-4">
                    {/* Recipient Target Choice */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Recipient Target Audience
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setSmsRecipientMode('selected')}
                          className={`p-2 rounded-xl text-[11px] font-bold border text-center transition-all ${
                            smsRecipientMode === 'selected'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div>Selected</div>
                          <div className="text-[9px] text-slate-500 font-normal">
                            ({smsSelectedRiderIds.length} checked)
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSmsRecipientMode('all')}
                          className={`p-2 rounded-xl text-[11px] font-bold border text-center transition-all ${
                            smsRecipientMode === 'all'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div>All Riders</div>
                          <div className="text-[9px] text-slate-500 font-normal">
                            ({(data?.users || []).filter((u: any) => u.role === 'RIDER').length} total)
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSmsRecipientMode('test')}
                          className={`p-2 rounded-xl text-[11px] font-bold border text-center transition-all ${
                            smsRecipientMode === 'test'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div>Test Single</div>
                          <div className="text-[9px] text-slate-500 font-normal">(Custom phone)</div>
                        </button>
                      </div>
                    </div>

                    {/* Test Phone Input if Mode == Test */}
                    {smsRecipientMode === 'test' && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Test Destination Number
                        </label>
                        <input
                          type="text"
                          value={smsTestNumber}
                          onChange={(e) => setSmsTestNumber(e.target.value)}
                          placeholder="0592303054"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    {/* Quick Template Chips */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Insert Template
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSmsBroadcastMessage(
                              'Reminder: Please ensure scheduled weekly payments are submitted on time. Contact fleet management for assistance. - Work & Pay'
                            )
                          }
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md"
                        >
                          + Weekly Reminder
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSmsBroadcastMessage(
                              'Important: System maintenance scheduled this Sunday. Platform access may experience brief downtime. - Work & Pay Management'
                            )
                          }
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md"
                        >
                          + Maintenance
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSmsBroadcastMessage(
                              'Notice to all Riders: Please drive safely and ensure all DVLA protective gear is worn. Ride safe! - Work & Pay'
                            )
                          }
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md"
                        >
                          + Safety Notice
                        </button>
                      </div>
                    </div>

                    {/* Message Box */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Message Body
                        </label>
                        <span
                          className={`text-[10px] font-mono ${
                            smsBroadcastMessage.length > 160 ? 'text-amber-400 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {smsBroadcastMessage.length} / 160 chars (
                          {Math.max(1, Math.ceil(smsBroadcastMessage.length / 160))} SMS page)
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={smsBroadcastMessage}
                        onChange={(e) => setSmsBroadcastMessage(e.target.value)}
                        placeholder="Type message to broadcast to riders..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={smsSending}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {smsSending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Dispatching SMS Broadcast...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>
                            Send SMS Broadcast (
                            {smsRecipientMode === 'test'
                              ? '1 Test'
                              : smsRecipientMode === 'all'
                              ? `${(data?.users || []).filter((u: any) => u.role === 'RIDER').length} Riders`
                              : `${smsSelectedRiderIds.length} Selected`}
                            )
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Bottom Panel: Recent SMS Delivery Audit Trail */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" /> Recent SMS Gateway Logs
                  </h3>
                  <p className="text-[11px] text-slate-400">Full audit trail of overdue notices, payment alerts, and broadcasts</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">Recent Logs</span>
              </div>

              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Recipient</th>
                      <th className="p-3">Purpose</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Message</th>
                      <th className="p-3">Batch / Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {((data as any)?.smsLogs || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                          No SMS messages logged yet. Use the Quick Test bar above to send your first message!
                        </td>
                      </tr>
                    ) : (
                      ((data as any)?.smsLogs || []).map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-white font-bold">{log.recipient}</span>
                            {log.recipientName && (
                              <span className="text-[10px] text-slate-400 ml-1.5">({log.recipientName})</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                log.purpose === 'OVERDUE'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : log.purpose === 'PAYMENT'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : log.purpose === 'TEST'
                                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                  : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              }`}
                            >
                              {log.purpose}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                log.status === 'SENT'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300 text-[11px] max-w-xs truncate" title={log.message}>
                            {log.message}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                            {log.error ? <span className="text-rose-400">{log.error}</span> : log.batchId || 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* NATIVE SUPER ADMIN CONTRACT INSPECTOR MODAL */}
      {inspectingAgreement && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8 text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md">
                      Super Admin Inspector
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                        inspectingAgreement.summary?.statusBadge?.variant === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : inspectingAgreement.summary?.statusBadge?.variant === 'danger'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {inspectingAgreement.summary?.statusBadge?.label || inspectingAgreement.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-white mt-1">
                    {inspectingAgreement.hirer?.name} &bull; <span className="text-emerald-400 font-mono">{inspectingAgreement.vehicle?.registrationNo}</span>
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setInspectingAgreement(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metric Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Price</span>
                <p className="text-base font-black text-white">{formatCedi(inspectingAgreement.hirePurchasePrice)}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Paid</span>
                <p className="text-base font-black text-teal-400">{formatCedi(inspectingAgreement.summary?.totalPaid)}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Remaining Balance</span>
                <p className="text-base font-black text-amber-400">{formatCedi(inspectingAgreement.summary?.balanceRemaining)}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Paid %</span>
                <p className="text-base font-black text-indigo-400">{Math.round(inspectingAgreement.summary?.percentComplete || 0)}%</p>
              </div>
            </div>

            {/* Inspector Grid: 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Financial & Owner Terms */}
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Financial & Owner Terms
                </h4>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Fleet Owner:</span>
                    <span className="font-bold text-white">{inspectingAgreement.ownerName} ({inspectingAgreement.ownerPhone})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Organization:</span>
                    <span className="font-semibold text-slate-200">{inspectingAgreement.organization?.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Cash Price:</span>
                    <span className="font-semibold text-white">{formatCedi(inspectingAgreement.cashPrice)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Installments:</span>
                    <span className="font-semibold text-white">{formatCedi(inspectingAgreement.installmentAmount)} / {inspectingAgreement.frequency.toLowerCase()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Total Installments:</span>
                    <span className="font-semibold text-white">{inspectingAgreement.totalInstallments}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Start Date:</span>
                    <span className="font-semibold text-white">{new Date(inspectingAgreement.startDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Motor Vehicle & Hirer Info */}
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5" /> Motor Vehicle & Hirer Info
                </h4>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Vehicle Plate:</span>
                    <span className="font-bold text-emerald-400 font-mono">{inspectingAgreement.vehicle?.registrationNo}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Make & Model:</span>
                    <span className="font-semibold text-white">{inspectingAgreement.vehicle?.makeModel}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Hirer (Rider):</span>
                    <span className="font-bold text-white">{inspectingAgreement.hirer?.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Rider Phone:</span>
                    <span className="font-semibold text-white">{inspectingAgreement.hirer?.phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Guarantor 1:</span>
                    <span className="font-semibold text-slate-300">{inspectingAgreement.guarantor1Name || 'None'} ({inspectingAgreement.guarantor1Phone || 'N/A'})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Ledger History inside Inspector */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Payment Ledger History</h4>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Amount</th>
                      <th className="p-2.5">Channel</th>
                      <th className="p-2.5">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {(inspectingAgreement.payments || []).map((p: any) => (
                      <tr key={p.id} className={p.voided ? 'line-through opacity-50 bg-rose-950/20' : ''}>
                        <td className="p-2.5 text-slate-400">{new Date(p.datePaid).toLocaleDateString()}</td>
                        <td className="p-2.5 font-bold text-white">{formatCedi(p.amount)}</td>
                        <td className="p-2.5 font-bold text-emerald-400">{p.channel}</td>
                        <td className="p-2.5 text-slate-400 font-mono">{p.reference || p.note || 'N/A'}</td>
                      </tr>
                    ))}
                    {(!inspectingAgreement.payments || inspectingAgreement.payments.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-500 italic">No payments recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Super Admin Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => openEditModal(inspectingAgreement)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Contract Details</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/agreements/${inspectingAgreement.id}/pdf`}
                  download
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" /> PDF Statement
                </a>
                <a
                  href={`/api/agreements/${inspectingAgreement.id}/export-csv`}
                  download
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" /> Export CSV
                </a>
                <button
                  onClick={() => setInspectingAgreement(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUPER ADMIN NATIVE EDIT AGREEMENT MODAL */}
      {showEditModal && inspectingAgreement && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-400" /> Super Admin Edit Contract Terms
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="bg-slate-950 p-4 rounded-2xl space-y-3 border border-slate-800">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Financial Terms</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cash Price (GHS)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={editCashPrice}
                      onChange={(e) => setEditCashPrice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs p-2.5 text-white focus:ring-2 focus:ring-emerald-500 font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Hire-Purchase Price (GHS)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={editHpPrice}
                      onChange={(e) => setEditHpPrice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs p-2.5 text-white focus:ring-2 focus:ring-emerald-500 font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Installment Amount (GHS)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={editInstallment}
                      onChange={(e) => setEditInstallment(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs p-2.5 text-white focus:ring-2 focus:ring-emerald-500 font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Frequency</label>
                    <select
                      value={editFrequency}
                      onChange={(e) => setEditFrequency(e.target.value as 'WEEKLY' | 'MONTHLY')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs p-2.5 text-white focus:ring-2 focus:ring-emerald-500 font-medium outline-none"
                    >
                      <option value="WEEKLY">WEEKLY</option>
                      <option value="MONTHLY">MONTHLY</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Total Installments</label>
                    <input
                      type="number"
                      required
                      value={editTotalInstallments}
                      onChange={(e) => setEditTotalInstallments(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs p-2.5 text-white focus:ring-2 focus:ring-emerald-500 font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs p-2.5 text-white focus:ring-2 focus:ring-emerald-500 font-medium outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl space-y-3 border border-slate-800">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Vehicle Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Make / Model</label>
                    <input
                      type="text"
                      required
                      value={editMakeModel}
                      onChange={(e) => setEditMakeModel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Registration No</label>
                    <input
                      type="text"
                      required
                      value={editRegNo}
                      onChange={(e) => setEditRegNo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl space-y-3 border border-slate-800">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Hirer & Owner Info</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Hirer (Rider) Name</label>
                    <input
                      type="text"
                      required
                      value={editHirerName}
                      onChange={(e) => setEditHirerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Hirer Phone</label>
                    <input
                      type="text"
                      required
                      value={editHirerPhone}
                      onChange={(e) => setEditHirerPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {editError && (
                <p className="text-xs p-2.5 rounded-lg border font-semibold text-rose-400 bg-rose-500/10 border-rose-500/20">
                  {editError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {savingEdit ? 'Saving...' : 'Save Contract Terms'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
