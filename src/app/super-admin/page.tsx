'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Building2, CheckCircle2, XCircle, AlertTriangle, Users, Bike, FileText, ArrowLeft, RefreshCw, LogOut } from 'lucide-react';

interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  contactEmail: string;
  contactPhone: string | null;
  createdAt: string;
  _count: {
    users: number;
    vehicles: number;
    agreements: number;
    payments: number;
  };
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchOrganizations() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/super-admin/organizations');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch organizations');
      }
      setOrganizations(data.organizations || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrganizations();
  }, []);

  async function handleStatusChange(orgId: string, newStatus: string) {
    setUpdatingId(orgId);
    try {
      const res = await fetch(`/api/super-admin/organizations/${orgId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update organization status');
      }
      await fetchOrganizations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const pendingOrgs = organizations.filter(o => o.status === 'PENDING');
  const approvedOrgs = organizations.filter(o => o.status === 'APPROVED');
  const otherOrgs = organizations.filter(o => o.status === 'REJECTED' || o.status === 'SUSPENDED');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Platform Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Super Admin Platform Control</h1>
              <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                Platform Operator
              </span>
            </div>
            <p className="text-xs text-slate-400">Manage tenant organizations, approvals, and system-wide fleet oversight</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrganizations}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-2xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Pending Applications Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" /> Pending Access Requests ({pendingOrgs.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500 text-xs">Loading organizations...</div>
          ) : pendingOrgs.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
              No pending organization access requests.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingOrgs.map((org) => (
                <div key={org.id} className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{org.name}</h3>
                      <span className="text-xs text-slate-400 font-mono">slug: {org.slug}</span>
                    </div>
                    <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                      PENDING REVIEW
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <p>Contact Email: <strong className="text-white">{org.contactEmail}</strong></p>
                    <p>Contact Phone: <strong className="text-white">{org.contactPhone || 'N/A'}</strong></p>
                    <p className="text-[10px] text-slate-500 pt-1">Requested: {new Date(org.createdAt).toLocaleString('en-GB')}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleStatusChange(org.id, 'REJECTED')}
                      disabled={updatingId === org.id}
                      className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold text-xs rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleStatusChange(org.id, 'APPROVED')}
                      disabled={updatingId === org.id}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve Fleet Access
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Active & Approved Organizations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Approved Active Fleets ({approvedOrgs.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedOrgs.map((org) => (
              <div key={org.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{org.name}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">slug: {org.slug}</span>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    APPROVED
                  </span>
                </div>

                {/* Fleet Statistics */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Users: <strong className="text-white">{org._count.users}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Bike className="w-3.5 h-3.5 text-slate-400" />
                    <span>Vehicles: <strong className="text-white">{org._count.vehicles}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Agreements: <strong className="text-white">{org._count.agreements}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Payments: <strong className="text-white">{org._count.payments}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                  <span className="text-slate-500 text-[10px]">{org.contactEmail}</span>
                  <button
                    onClick={() => handleStatusChange(org.id, 'SUSPENDED')}
                    disabled={updatingId === org.id}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    Suspend Fleet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Suspended or Rejected Organizations */}
        {otherOrgs.length > 0 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <h2 className="text-base font-bold text-slate-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-slate-500" /> Suspended / Rejected ({otherOrgs.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherOrgs.map((org) => (
                <div key={org.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-3 opacity-80">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-300">{org.name}</h3>
                      <span className="text-[11px] text-slate-500 font-mono">{org.contactEmail}</span>
                    </div>
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {org.status}
                    </span>
                  </div>

                  <button
                    onClick={() => handleStatusChange(org.id, 'APPROVED')}
                    disabled={updatingId === org.id}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-1.5 rounded-xl transition-colors"
                  >
                    Re-Approve Access
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
