'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bike,
  User,
  CreditCard,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Smartphone,
  Banknote,
  Building2,
  Calendar,
  Download,
  FileText,
  ShieldAlert,
  Archive,
  Upload,
  FileCheck,
  History,
  AlertCircle,
  X,
} from 'lucide-react';
import { formatCedi } from '@/lib/calculations';

interface PaymentItem {
  id: string;
  amount: number;
  datePaid: string;
  channel: 'MOMO' | 'CASH' | 'BANK';
  reference?: string;
  note?: string;
  voided: boolean;
  createdAt: string;
}

interface StatusLogItem {
  id: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
  createdAt: string;
  changedBy: {
    name: string;
  };
}

interface DocumentItem {
  id: string;
  documentType: 'GHANA_CARD' | 'PASSPORT_PHOTO' | 'SIGNED_CONTRACT' | 'OTHER';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
  uploadedBy: {
    name: string;
  };
}

interface AgreementDetail {
  id: string;
  ownerName: string;
  ownerPhone: string;
  guarantor1Name?: string;
  guarantor1Phone?: string;
  guarantor2Name?: string;
  guarantor2Phone?: string;
  cashPrice: number;
  hirePurchasePrice: number;
  installmentAmount: number;
  frequency: 'WEEKLY' | 'MONTHLY';
  totalInstallments: number;
  startDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'REPOSSESSED';
  hirer: {
    name: string;
    phone: string;
    email?: string;
  };
  vehicle: {
    makeModel: string;
    registrationNo: string;
    chassisNo?: string;
    engineNo?: string;
    colorYear?: string;
  };
  payments: PaymentItem[];
  statusLogs?: StatusLogItem[];
  summary: {
    hirePurchasePrice: number;
    totalPaid: number;
    balanceRemaining: number;
    percentComplete: number;
    scheduledFinishDate: string;
    actualPaceFinishDate: string;
    nextDueDate: string;
    statusBadge: {
      label: 'On Track' | 'Overdue' | 'Severely Overdue' | 'Completed' | 'Defaulted' | 'Repossessed';
      variant: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'slate';
      daysOverdue: number;
    };
  };
}

export default function AgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [agreement, setAgreement] = useState<AgreementDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'DEFAULTED' | 'REPOSSESSED'>('DEFAULTED');
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Document Upload State
  const [docType, setDocType] = useState<'GHANA_CARD' | 'PASSPORT_PHOTO' | 'SIGNED_CONTRACT' | 'OTHER'>('GHANA_CARD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState('');
  const [docSuccess, setDocSuccess] = useState('');

  async function fetchAgreement() {
    try {
      const res = await fetch(`/api/agreements/${resolvedParams.id}`);
      const data = await res.json();
      if (res.ok && data.agreement) {
        setAgreement(data.agreement);
      } else {
        setError(data.error || 'Agreement not found');
      }
    } catch (err) {
      console.error('Failed to load agreement:', err);
      setError('Error loading agreement details');
    }
  }

  async function fetchDocuments() {
    try {
      const res = await fetch(`/api/agreements/${resolvedParams.id}/documents`);
      const data = await res.json();
      if (res.ok && data.documents) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchAgreement(), fetchDocuments()]);
      setLoading(false);
    }
    init();
  }, [resolvedParams.id]);

  async function handleVoidPayment(paymentId: string) {
    if (!confirm('Are you sure you want to void this payment? This action is soft-deleted and logged for audit purposes.')) {
      return;
    }

    setVoidingId(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}/void`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to void payment');
      }
      await fetchAgreement();
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error voiding payment');
    } finally {
      setVoidingId(null);
    }
  }

  async function handleStatusChangeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!statusReason.trim()) {
      setStatusError('Please provide a reason for the status change.');
      return;
    }

    setUpdatingStatus(true);
    setStatusError('');

    try {
      const res = await fetch(`/api/agreements/${resolvedParams.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus,
          reason: statusReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update agreement status');
      }

      setShowStatusModal(false);
      setStatusReason('');
      await fetchAgreement();
      router.refresh();
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDocumentUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setDocError('Please select a file to upload');
      return;
    }

    setUploadingDoc(true);
    setDocError('');
    setDocSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', docType);

      const res = await fetch(`/api/agreements/${resolvedParams.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }

      setDocSuccess(`Successfully uploaded ${selectedFile.name}`);
      setSelectedFile(null);
      await fetchDocuments();
    } catch (err: unknown) {
      setDocError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingDoc(false);
    }
  }

  const renderBadge = (badge: AgreementDetail['summary']['statusBadge']) => {
    switch (badge.label) {
      case 'On Track':
        return (
          <span className="badge-on-track inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> On Track
          </span>
        );
      case 'Overdue':
        return (
          <span className="badge-overdue inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Overdue ({badge.daysOverdue} days)
          </span>
        );
      case 'Severely Overdue':
        return (
          <span className="badge-severely-overdue inline-flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Overdue ({badge.daysOverdue} days)
          </span>
        );
      case 'Completed':
        return (
          <span className="badge-completed inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
          </span>
        );
      case 'Defaulted':
        return (
          <span className="badge-defaulted inline-flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Defaulted
          </span>
        );
      case 'Repossessed':
        return (
          <span className="badge-repossessed inline-flex items-center gap-1">
            <Archive className="w-3.5 h-3.5" /> Repossessed
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-slate-500 text-sm">Loading agreement details...</div>;
  }

  if (error || !agreement) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-rose-600 font-semibold">{error || 'Agreement not found'}</p>
        <Link href="/admin/dashboard" className="text-xs bg-slate-900 text-white px-4 py-2 rounded-xl inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { summary, vehicle, hirer, payments, statusLogs } = agreement;
  const badge = summary.statusBadge;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowStatusModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Update Status</span>
          </button>

          <a
            href={`/api/agreements/${agreement.id}/export-csv`}
            download
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-2 rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </a>

          <a
            href={`/api/agreements/${agreement.id}/pdf`}
            download
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-2 rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>PDF Statement</span>
          </a>

          {agreement.status === 'ACTIVE' && (
            <Link
              href={`/admin/payments/new?agreementId=${agreement.id}`}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-md inline-flex items-center gap-1.5 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Bike className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{hirer.name}</h1>
              <p className="text-xs text-slate-500 font-mono">
                {vehicle.makeModel} • {vehicle.registrationNo}
              </p>
            </div>
          </div>

          <div>{renderBadge(badge)}</div>
        </div>

        {/* Financial Progress & Projections Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Total Hire-Purchase Price</span>
              <span className="font-bold text-slate-900 text-base">{formatCedi(summary.hirePurchasePrice)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Total Paid to Date</span>
              <span className="font-bold text-emerald-600 text-base">{formatCedi(summary.totalPaid)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Balance Remaining</span>
              <span className="font-extrabold text-slate-900 text-base">{formatCedi(summary.balanceRemaining)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Installment Rate</span>
              <span className="font-semibold text-slate-800">
                {formatCedi(agreement.installmentAmount)} / {agreement.frequency.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Overall Progress</span>
              <span>{summary.percentComplete.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${summary.percentComplete}%` }}
              />
            </div>
          </div>

          {/* Projected Finishing Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold block">Scheduled Finish (Paper Contract):</span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-4 h-4 text-slate-600" />
                {new Date(summary.scheduledFinishDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              <span className="text-emerald-800 font-semibold block">Actual Pace Finish (Live Velocity):</span>
              <span className="font-bold text-emerald-950 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                {new Date(summary.actualPaceFinishDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Contract Details Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-t border-slate-100 pt-5">
          {/* Hirer & Owner Info */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" /> Contract Parties
            </h3>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Hirer Name</span>
                <span className="font-bold text-slate-900">{hirer.name}</span> ({hirer.phone})
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Vehicle Owner</span>
                <span className="font-semibold text-slate-800">{agreement.ownerName}</span> ({agreement.ownerPhone})
              </div>
              {agreement.guarantor1Name && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Guarantor 1</span>
                  <span className="font-medium text-slate-800">{agreement.guarantor1Name}</span> ({agreement.guarantor1Phone})
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-emerald-600" /> Vehicle Specs
            </h3>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Reg Number</span>
                <span className="font-bold text-slate-900 text-xs">{vehicle.registrationNo}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Chassis Number</span>
                <span className="text-slate-800">{vehicle.chassisNo || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Engine Number</span>
                <span className="text-slate-800">{vehicle.engineNo || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log / Status History Timeline */}
        {statusLogs && statusLogs.length > 0 && (
          <div className="space-y-3 border-t border-slate-100 pt-5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <History className="w-4 h-4 text-amber-600" /> Status Audit Trail History
            </h3>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              {statusLogs.map((log) => (
                <div key={log.id} className="text-xs border-b border-slate-200/60 last:border-0 pb-2.5 last:pb-0">
                  <div className="flex items-center justify-between font-semibold text-slate-900 mb-0.5">
                    <span>
                      Changed to <strong className="uppercase font-extrabold">{log.newStatus}</strong> (from {log.previousStatus})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleString('en-GB')}
                    </span>
                  </div>
                  <p className="text-slate-600 bg-white p-2 rounded border border-slate-200 text-[11px]">
                    <strong>Reason:</strong> {log.reason} — <em>by {log.changedBy.name}</em>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Vault Section */}
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" /> Document Vault
              </h3>
              <p className="text-xs text-slate-500">Ghana Card scans, passport photos, and signed contract paperwork</p>
            </div>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleDocumentUpload} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Document Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as typeof docType)}
                  className="w-full bg-white border border-slate-200 rounded-lg text-xs font-semibold p-2 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="GHANA_CARD">Ghana Card Scan</option>
                  <option value="PASSPORT_PHOTO">Passport Photo</option>
                  <option value="SIGNED_CONTRACT">Signed Paper Contract</option>
                  <option value="OTHER">Other Verification Document</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Choose File (PDF, PNG, JPEG max 5MB)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  <button
                    type="submit"
                    disabled={uploadingDoc || !selectedFile}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingDoc ? 'Validating...' : 'Upload'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message for Binary Validation / Magic Bytes */}
            {docError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Validation Failed:</strong>
                  <span>{docError}</span>
                </div>
              </div>
            )}

            {docSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg text-xs font-semibold">
                {docSuccess}
              </div>
            )}
          </form>

          {/* Document Vault List */}
          {documents.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl">
              No documents uploaded to this vault yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200 p-3.5 rounded-xl flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 inline-block mb-0.5">
                        {doc.documentType.replace(/_/g, ' ')}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs truncate" title={doc.fileName}>
                        {doc.fileName}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {(doc.fileSize / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>

                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors shrink-0 ml-2"
                    title="Download / View Document"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payments History Table & Soft-Delete / Void Action */}
        <div className="space-y-3 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Payment History Log</h3>
            <span className="text-xs text-slate-500 font-medium">Soft-delete voided entries</span>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl">
              No payments recorded for this agreement yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-y border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Reference / Notes</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className={p.voided ? 'bg-rose-50/40 text-slate-400 line-through' : 'hover:bg-slate-50'}
                    >
                      <td className="py-3 px-3">
                        {new Date(p.datePaid).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-900">{formatCedi(p.amount)}</td>

                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1">
                          {p.channel === 'MOMO' && <Smartphone className="w-3.5 h-3.5 text-emerald-600" />}
                          {p.channel === 'CASH' && <Banknote className="w-3.5 h-3.5 text-amber-600" />}
                          {p.channel === 'BANK' && <Building2 className="w-3.5 h-3.5 text-blue-600" />}
                          {p.channel}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="block font-mono text-[11px]">{p.reference || '—'}</span>
                        {p.note && <span className="text-[10px] text-slate-500 block not-italic">{p.note}</span>}
                      </td>

                      <td className="py-3 px-3">
                        {p.voided ? (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                            Voided (Audit)
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {!p.voided && (
                          <button
                            onClick={() => handleVoidPayment(p.id)}
                            disabled={voidingId === p.id}
                            title="Soft-delete void payment"
                            className="text-rose-600 hover:text-rose-800 text-xs font-semibold px-2 py-1 bg-rose-50 border border-rose-200 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Void</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" /> Update Agreement Status
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStatusChangeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Target Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as typeof newStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold p-2.5 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="DEFAULTED">DEFAULTED (Missed payments / Flagged)</option>
                  <option value="REPOSSESSED">REPOSSESSED (Vehicle impounded/retrieved)</option>
                  <option value="ACTIVE">ACTIVE (Reinstated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Status Change <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this status is being changed (e.g. 3 consecutive weeks missed payment without notice)..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-3 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {statusError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-semibold">
                  {statusError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating...' : 'Confirm Status Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
