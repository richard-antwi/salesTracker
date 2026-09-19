'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  PieChart,
  BarChart3,
  Users,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Wallet
} from 'lucide-react';
import { formatCedi } from '@/lib/calculations';

interface AgreementSummaryItem {
  id: string;
  startDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'REPOSSESSED';
  summary: {
    hirePurchasePrice: number;
    totalPaid: number;
    balanceRemaining: number;
    percentComplete: number;
    scheduledFinishDate: string;
    actualPaceFinishDate: string;
    statusBadge: {
      label: 'On Track' | 'Overdue' | 'Severely Overdue' | 'Completed' | 'Defaulted' | 'Repossessed';
    };
  };
  payments: Array<{
    amount: number;
    datePaid: string;
    voided: boolean;
  }>;
}

export default function AnalyticsDashboardPage() {
  const [agreements, setAgreements] = useState<AgreementSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgreements() {
      try {
        const res = await fetch('/api/agreements');
        const data = await res.json();
        if (res.ok && data.agreements) {
          setAgreements(data.agreements);
        }
      } catch (err) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAgreements();
  }, []);

  if (loading) {
    return <div className="text-center py-16 text-slate-500 text-sm">Loading analytics...</div>;
  }

  // 1. Portfolio Health Metrics
  const totalAgreements = agreements.length;
  const activeAgreements = agreements.filter(a => a.status === 'ACTIVE');
  const defaultedAgreements = agreements.filter(a => a.status === 'DEFAULTED');
  
  const defaultRate = totalAgreements > 0 ? (defaultedAgreements.length / totalAgreements) * 100 : 0;
  
  const onTrackCount = activeAgreements.filter(a => a.summary.statusBadge.label === 'On Track').length;
  const overdueCount = activeAgreements.length - onTrackCount;
  const onTrackRate = activeAgreements.length > 0 ? (onTrackCount / activeAgreements.length) * 100 : 0;

  // 2. Financial Metrics
  const totalExpectedReturn = agreements.reduce((sum, a) => sum + a.summary.hirePurchasePrice, 0);
  const totalCollected = agreements.reduce((sum, a) => sum + a.summary.totalPaid, 0);
  const totalOutstanding = agreements.reduce((sum, a) => sum + a.summary.balanceRemaining, 0);
  
  const portfolioCompletionRate = totalExpectedReturn > 0 ? (totalCollected / totalExpectedReturn) * 100 : 0;

  // 3. Revenue Trends (Group payments by month)
  const monthlyRevenue: Record<string, number> = {};
  agreements.forEach(agr => {
    agr.payments.forEach(p => {
      if (p.voided) return;
      const date = new Date(p.datePaid);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(p.amount);
    });
  });

  // Sort months chronologically
  const sortedMonths = Object.keys(monthlyRevenue).sort();
  // Take last 6 months for chart
  const last6Months = sortedMonths.slice(-6);
  const maxMonthlyRevenue = Math.max(...last6Months.map(m => monthlyRevenue[m] || 0), 1); // Avoid div by zero

  const formatMonthLabel = (yyyyMM: string) => {
    const [year, month] = yyyyMM.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleString('default', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            Analytics & Metrics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">High-level insights into your hire-purchase portfolio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Financial Overview Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm col-span-1 md:col-span-2 lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4 uppercase tracking-wider">
            <Wallet className="w-4 h-4 text-emerald-600" /> Portfolio Financials
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Expected Return
              </span>
              <span className="text-2xl font-black text-slate-900">{formatCedi(totalExpectedReturn)}</span>
              <p className="text-[10px] text-slate-500 mt-1">Total value of all contracts</p>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Collected
              </span>
              <span className="text-2xl font-black text-emerald-600">{formatCedi(totalCollected)}</span>
              <p className="text-[10px] text-slate-500 mt-1">Realized revenue to date</p>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Outstanding
              </span>
              <span className="text-2xl font-black text-amber-600">{formatCedi(totalOutstanding)}</span>
              <p className="text-[10px] text-slate-500 mt-1">Remaining balance to collect</p>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Overall Portfolio Completion</span>
              <span className="text-emerald-700">{portfolioCompletionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
              <div
                className="bg-emerald-600 h-full transition-all duration-1000 rounded-full"
                style={{ width: `${portfolioCompletionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Portfolio Health Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4 uppercase tracking-wider">
              <PieChart className="w-4 h-4 text-emerald-600" /> Portfolio Health
            </h2>
            
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700">On-Track Rate</span>
                </div>
                <span className="font-extrabold text-emerald-700 text-sm">{onTrackRate.toFixed(1)}%</span>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-700">Overdue Contracts</span>
                </div>
                <span className="font-extrabold text-amber-700 text-sm">{overdueCount}</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-semibold text-slate-700">System Default Rate</span>
                </div>
                <span className="font-extrabold text-rose-700 text-sm">{defaultRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-6 uppercase tracking-wider">
          <BarChart3 className="w-4 h-4 text-emerald-600" /> Revenue Collection Trend (Last 6 Active Months)
        </h2>
        
        {last6Months.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">No payment data available yet to show trends.</div>
        ) : (
          <div className="h-64 flex items-end justify-around gap-2 pt-8 border-b border-slate-200 pb-2 relative">
            {/* Y-Axis lines (rough approximation for visual structure) */}
            <div className="absolute top-0 left-0 w-full border-t border-slate-100 border-dashed" />
            <div className="absolute top-1/4 left-0 w-full border-t border-slate-100 border-dashed" />
            <div className="absolute top-2/4 left-0 w-full border-t border-slate-100 border-dashed" />
            <div className="absolute top-3/4 left-0 w-full border-t border-slate-100 border-dashed" />

            {last6Months.map((monthKey) => {
              const revenue = monthlyRevenue[monthKey];
              const heightPercent = (revenue / maxMonthlyRevenue) * 100;
              return (
                <div key={monthKey} className="flex flex-col items-center gap-2 w-full max-w-[60px] group z-10">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg absolute -translate-y-8 pointer-events-none whitespace-nowrap">
                    {formatCedi(revenue)}
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-full bg-emerald-500 rounded-t-sm hover:bg-emerald-400 transition-colors relative"
                    style={{ height: `${Math.max(heightPercent, 1)}%`, minHeight: '4px' }}
                  />
                  {/* Label */}
                  <span className="text-[10px] font-semibold text-slate-500 mt-2">{formatMonthLabel(monthKey)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Basic Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-emerald-950 text-white rounded-xl p-4 shadow-sm">
            <span className="text-[10px] text-emerald-400/80 uppercase tracking-wider block mb-1 font-semibold">Active Riders</span>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span className="text-xl font-bold">{activeAgreements.length}</span>
            </div>
         </div>
         <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1 font-semibold">Completed Contracts</span>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-slate-300" />
              <span className="text-xl font-bold">{agreements.filter(a => a.status === 'COMPLETED').length}</span>
            </div>
         </div>
      </div>
    </div>
  );
}
