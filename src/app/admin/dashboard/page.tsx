'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bike,
  Plus,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Download,
  Search,
  Users,
  ShieldAlert,
  Archive,
  ArrowUpDown,
} from 'lucide-react';
import { formatCedi } from '@/lib/calculations';

interface AgreementSummaryItem {
  id: string;
  ownerName: string;
  hirePurchasePrice: number;
  installmentAmount: number;
  frequency: 'WEEKLY' | 'MONTHLY';
  startDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'REPOSSESSED';
  hirer: {
    name: string;
    phone: string;
  };
  vehicle: {
    makeModel: string;
    registrationNo: string;
  };
  summary: {
    hirePurchasePrice: number;
    totalPaid: number;
    balanceRemaining: number;
    percentComplete: number;
    nextDueDate: string;
    statusBadge: {
      label: 'On Track' | 'Overdue' | 'Severely Overdue' | 'Completed' | 'Defaulted' | 'Repossessed';
      variant: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'slate';
      daysOverdue: number;
    };
  };
}

export default function AdminDashboardPage() {
  const [agreements, setAgreements] = useState<AgreementSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'DEFAULTED' | 'REPOSSESSED' | 'COMPLETED'>('ALL');
  const [sortBy, setSortBy] = useState<'balance-desc' | 'balance-asc' | 'progress-desc' | 'progress-asc' | 'date-asc'>('balance-desc');

  useEffect(() => {
    async function fetchAgreements() {
      try {
        const res = await fetch('/api/agreements');
        const data = await res.json();
        if (res.ok && data.agreements) {
          setAgreements(data.agreements);
        }
      } catch (err) {
        console.error('Failed to load agreements:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAgreements();
  }, []);

  // Compute portfolio metrics
  const totalAgreements = agreements.length;
  const activeCount = agreements.filter((a) => a.status === 'ACTIVE').length;
  const overdueCount = agreements.filter(
    (a) => a.summary.statusBadge.label === 'Overdue' || a.summary.statusBadge.label === 'Severely Overdue'
  ).length;
  const defaultedCount = agreements.filter((a) => a.status === 'DEFAULTED').length;
  const repossessedCount = agreements.filter((a) => a.status === 'REPOSSESSED').length;
  const totalCollected = agreements.reduce((sum, a) => sum + a.summary.totalPaid, 0);
  const totalPortfolioValue = agreements.reduce((sum, a) => sum + a.summary.hirePurchasePrice, 0);

  // Search & Filtered & Sorted agreements list
  const filteredAgreements = agreements
    .filter((agr) => {
      // 1. Status Filter
      if (filter === 'ACTIVE') {
        if (agr.status !== 'ACTIVE') return false;
      } else if (filter === 'OVERDUE') {
        if (agr.summary.statusBadge.label !== 'Overdue' && agr.summary.statusBadge.label !== 'Severely Overdue') return false;
      } else if (filter === 'DEFAULTED') {
        if (agr.status !== 'DEFAULTED') return false;
      } else if (filter === 'REPOSSESSED') {
        if (agr.status !== 'REPOSSESSED') return false;
      } else if (filter === 'COMPLETED') {
        if (agr.summary.statusBadge.label !== 'Completed' && agr.status !== 'COMPLETED') return false;
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = agr.hirer.name.toLowerCase().includes(q);
        const phoneMatch = agr.hirer.phone.toLowerCase().includes(q);
        const regMatch = agr.vehicle.registrationNo.toLowerCase().includes(q);
        const makeMatch = agr.vehicle.makeModel.toLowerCase().includes(q);
        return nameMatch || phoneMatch || regMatch || makeMatch;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'balance-desc') return b.summary.balanceRemaining - a.summary.balanceRemaining;
      if (sortBy === 'balance-asc') return a.summary.balanceRemaining - b.summary.balanceRemaining;
      if (sortBy === 'progress-desc') return b.summary.percentComplete - a.summary.percentComplete;
      if (sortBy === 'progress-asc') return a.summary.percentComplete - b.summary.percentComplete;
      if (sortBy === 'date-asc') return new Date(a.summary.nextDueDate).getTime() - new Date(b.summary.nextDueDate).getTime();
      return 0;
    });

  const renderBadge = (badge: AgreementSummaryItem['summary']['statusBadge']) => {
    switch (badge.label) {
      case 'On Track':
        return (
          <span className="badge-on-track inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> On Track
          </span>
        );
      case 'Overdue':
        return (
          <span className="badge-overdue inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Overdue ({badge.daysOverdue}d)
          </span>
        );
      case 'Severely Overdue':
        return (
          <span className="badge-severely-overdue inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Overdue ({badge.daysOverdue}d)
          </span>
        );
      case 'Completed':
        return (
          <span className="badge-completed inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Fully Paid
          </span>
        );
      case 'Defaulted':
        return (
          <span className="badge-defaulted inline-flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Defaulted
          </span>
        );
      case 'Repossessed':
        return (
          <span className="badge-repossessed inline-flex items-center gap-1">
            <Archive className="w-3 h-3" /> Repossessed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage hire-purchase agreements, track payments & fleet status</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/agreements/export-csv"
            download
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </a>

          <Link
            href="/admin/users"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>Admin Users</span>
          </Link>

          <Link
            href="/admin/agreements/new"
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>New Agreement</span>
          </Link>

          <Link
            href="/admin/payments/new"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md inline-flex items-center gap-1.5"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </Link>
        </div>
      </div>

      {/* Portfolio Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Agreements
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-slate-900">{totalAgreements}</span>
            <span className="text-xs text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              {activeCount} Active
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Overdue / Flagged
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-slate-900">{overdueCount}</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                overdueCount > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {overdueCount > 0 ? `${overdueCount} Flagged` : 'All Clean'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Collected
          </span>
          <div className="mt-1">
            <span className="text-xl font-extrabold text-emerald-600 block">{formatCedi(totalCollected)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Portfolio Value
          </span>
          <div className="mt-1">
            <span className="text-xl font-extrabold text-slate-900 block">{formatCedi(totalPortfolioValue)}</span>
          </div>
        </div>
      </div>

      {/* Search, Sorting & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        {/* Search Bar & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search hirer name, phone, or vehicle registration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="balance-desc">Balance (High → Low)</option>
              <option value="balance-asc">Balance (Low → High)</option>
              <option value="progress-desc">Progress % (High → Low)</option>
              <option value="progress-asc">Progress % (Low → High)</option>
              <option value="date-asc">Due Date (Earliest)</option>
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100">
          {(['ALL', 'ACTIVE', 'OVERDUE', 'DEFAULTED', 'REPOSSESSED', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === tab
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'ALL' && `All (${totalAgreements})`}
              {tab === 'ACTIVE' && `Active (${activeCount})`}
              {tab === 'OVERDUE' && `Overdue (${overdueCount})`}
              {tab === 'DEFAULTED' && `Defaulted (${defaultedCount})`}
              {tab === 'REPOSSESSED' && `Repossessed (${repossessedCount})`}
              {tab === 'COMPLETED' && 'Completed'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading agreements portfolio...</div>
        ) : filteredAgreements.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Bike className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-600">No agreements match your search or filter criteria.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile <640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Hirer & Vehicle</th>
                    <th className="py-3 px-4">Financial Terms</th>
                    <th className="py-3 px-4">Balance Remaining</th>
                    <th className="py-3 px-4">Progress (% Paid)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAgreements.map((agr) => {
                    const badge = agr.summary.statusBadge;
                    return (
                      <tr key={agr.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <Link href={`/admin/agreements/${agr.id}`} className="hover:text-emerald-700">
                            <span className="font-bold text-slate-900 text-sm block">{agr.hirer.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {agr.vehicle.makeModel} • {agr.vehicle.registrationNo}
                            </span>
                          </Link>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="block text-slate-900 font-semibold">
                            {formatCedi(agr.summary.hirePurchasePrice)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {formatCedi(agr.installmentAmount)} / {agr.frequency.toLowerCase()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-slate-900 text-sm block">
                            {formatCedi(agr.summary.balanceRemaining)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Collected: {formatCedi(agr.summary.totalPaid)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 w-44">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                            <span>{agr.summary.percentComplete.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                            <div
                              className="bg-emerald-600 h-full transition-all duration-500 rounded-full"
                              style={{ width: `${agr.summary.percentComplete}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {renderBadge(badge)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {agr.status === 'ACTIVE' && (
                              <Link
                                href={`/admin/payments/new?agreementId=${agr.id}`}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-xs transition-colors"
                              >
                                + Pay
                              </Link>
                            )}
                            <Link
                              href={`/admin/agreements/${agr.id}`}
                              className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Visible ONLY on small screens <640px / ~375px) */}
            <div className="sm:hidden space-y-3">
              {filteredAgreements.map((agr) => {
                const badge = agr.summary.statusBadge;
                return (
                  <div
                    key={agr.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{agr.hirer.name}</h3>
                        <p className="text-xs text-slate-500 font-mono">
                          {agr.vehicle.makeModel} • {agr.vehicle.registrationNo}
                        </p>
                      </div>
                      <div>
                        {renderBadge(badge)}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Progress ({agr.summary.percentComplete.toFixed(1)}%)</span>
                        <span className="text-slate-500">
                          {formatCedi(agr.summary.totalPaid)} / {formatCedi(agr.summary.hirePurchasePrice)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full transition-all duration-500 rounded-full"
                          style={{ width: `${agr.summary.percentComplete}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2.5">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Balance Remaining</span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {formatCedi(agr.summary.balanceRemaining)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {agr.status === 'ACTIVE' && (
                          <Link
                            href={`/admin/payments/new?agreementId=${agr.id}`}
                            className="bg-emerald-600 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm"
                          >
                            Record Payment
                          </Link>
                        )}
                        <Link
                          href={`/admin/agreements/${agr.id}`}
                          className="bg-white border border-slate-300 text-slate-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
