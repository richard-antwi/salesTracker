import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { formatCedi } from './calculations';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
    paddingBottom: 10,
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 9,
    color: '#059669',
    fontFamily: 'Helvetica-Bold',
  },
  meta: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'right',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    backgroundColor: '#f0fdf4',
    padding: 4,
    marginBottom: 6,
    borderRadius: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  col2: {
    width: '50%',
  },
  col3: {
    width: '33.33%',
  },
  label: {
    fontSize: 8,
    color: '#64748b',
    fontFamily: 'Helvetica-Bold',
  },
  value: {
    fontSize: 9,
    color: '#0f172a',
  },
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#334155',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 5,
    fontSize: 8,
  },
  tableRowVoided: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 5,
    fontSize: 8,
    backgroundColor: '#fff5f5',
    color: '#94a3b8',
  },
  thDate: { width: '15%' },
  thAmount: { width: '15%' },
  thChannel: { width: '15%' },
  thRef: { width: '25%' },
  thBalance: { width: '15%' },
  thStatus: { width: '15%', textAlign: 'right' },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94a3b8',
  },
});

export interface StatementPDFProps {
  agreement: {
    id: string;
    ownerName: string;
    ownerPhone: string;
    hirer: {
      name: string;
      phone: string;
      email?: string | null;
    };
    vehicle: {
      makeModel: string;
      registrationNo: string;
      chassisNo?: string | null;
      engineNo?: string | null;
      colorYear?: string | null;
    };
    cashPrice: number | unknown;
    hirePurchasePrice: number | unknown;
    installmentAmount: number | unknown;
    frequency: string;
    totalInstallments: number;
    startDate: string | Date;
    payments: Array<{
      id: string;
      amount: number | unknown;
      datePaid: string | Date;
      channel: string;
      reference?: string | null;
      note?: string | null;
      voided: boolean;
    }>;
    summary: {
      hirePurchasePrice: number;
      totalPaid: number;
      balanceRemaining: number;
      percentComplete: number;
      scheduledFinishDate: string | Date;
      actualPaceFinishDate: string | Date;
      nextDueDate: string | Date;
      statusBadge: {
        label: string;
      };
    };
  };
}

export function StatementDocument({ agreement }: StatementPDFProps) {
  const generatedAt = new Date().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate running balance per active payment
  let runningPaid = 0;
  const hpPrice = agreement.summary.hirePurchasePrice;

  // Payments ordered chronologically for statement table
  const sortedPayments = [...agreement.payments].sort(
    (a, b) => new Date(a.datePaid).getTime() - new Date(b.datePaid).getTime()
  );

  const paymentsWithRunningBalance = sortedPayments.map((p) => {
    const amt = Number(p.amount || 0);
    if (!p.voided) {
      runningPaid += amt;
    }
    const currentBalance = Math.max(0, hpPrice - runningPaid);
    return {
      ...p,
      numericAmount: amt,
      runningBalance: currentBalance,
    };
  });

  return (
    <Document title={`Statement-${agreement.vehicle.registrationNo}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Work & Pay</Text>
            <Text style={styles.subtitle}>Hire-Purchase Payment Statement (Ghana)</Text>
          </View>
          <View style={styles.meta}>
            <Text>Agr. ID: {agreement.id.slice(-8).toUpperCase()}</Text>
            <Text>Generated: {generatedAt}</Text>
          </View>
        </View>

        {/* Contract Parties & Vehicle Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Contract Parties & Vehicle Specifications</Text>
          <View style={styles.row}>
            <View style={styles.col3}>
              <Text style={styles.label}>Hirer (Rider):</Text>
              <Text style={styles.value}>{agreement.hirer.name}</Text>
              <Text style={styles.value}>Tel: {agreement.hirer.phone}</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>Vehicle Owner:</Text>
              <Text style={styles.value}>{agreement.ownerName}</Text>
              <Text style={styles.value}>Tel: {agreement.ownerPhone}</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>Motorcycle Details:</Text>
              <Text style={styles.value}>{agreement.vehicle.makeModel}</Text>
              <Text style={styles.value}>Reg No: {agreement.vehicle.registrationNo}</Text>
              <Text style={styles.value}>Chassis: {agreement.vehicle.chassisNo || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Financial Terms & Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Financial Terms & Live Progress Summary</Text>
          <View style={styles.row}>
            <View style={styles.col3}>
              <Text style={styles.label}>Hire-Purchase Price:</Text>
              <Text style={styles.value}>{formatCedi(agreement.summary.hirePurchasePrice)}</Text>
              <Text style={styles.label}>Installment Rate:</Text>
              <Text style={styles.value}>
                {formatCedi(Number(agreement.installmentAmount))} / {agreement.frequency.toLowerCase()}
              </Text>
            </View>

            <View style={styles.col3}>
              <Text style={styles.label}>Total Paid to Date:</Text>
              <Text style={styles.value}>{formatCedi(agreement.summary.totalPaid)}</Text>
              <Text style={styles.label}>Remaining Balance:</Text>
              <Text style={styles.value}>{formatCedi(agreement.summary.balanceRemaining)}</Text>
              <Text style={styles.label}>Overall Progress:</Text>
              <Text style={styles.value}>{agreement.summary.percentComplete.toFixed(1)}% Paid</Text>
            </View>

            <View style={styles.col3}>
              <Text style={styles.label}>Scheduled Finish (Contract):</Text>
              <Text style={styles.value}>
                {new Date(agreement.summary.scheduledFinishDate).toLocaleDateString('en-GB')}
              </Text>
              <Text style={styles.label}>Actual Pace Finish (Live):</Text>
              <Text style={styles.value}>
                {new Date(agreement.summary.actualPaceFinishDate).toLocaleDateString('en-GB')}
              </Text>
              <Text style={styles.label}>Account Status:</Text>
              <Text style={styles.value}>{agreement.summary.statusBadge.label}</Text>
            </View>
          </View>
        </View>

        {/* Payment History Statement Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Complete Payment History Statement</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.thDate}>Date</Text>
              <Text style={styles.thAmount}>Amount</Text>
              <Text style={styles.thChannel}>Channel</Text>
              <Text style={styles.thRef}>Ref / Note</Text>
              <Text style={styles.thBalance}>Running Bal.</Text>
              <Text style={styles.thStatus}>Status</Text>
            </View>

            {paymentsWithRunningBalance.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={{ width: '100%', textAlign: 'center', color: '#94a3b8' }}>
                  No payments recorded yet.
                </Text>
              </View>
            ) : (
              paymentsWithRunningBalance.map((p) => (
                <View key={p.id} style={p.voided ? styles.tableRowVoided : styles.tableRow}>
                  <Text style={styles.thDate}>
                    {new Date(p.datePaid).toLocaleDateString('en-GB')}
                  </Text>
                  <Text style={styles.thAmount}>{formatCedi(p.numericAmount)}</Text>
                  <Text style={styles.thChannel}>{p.channel}</Text>
                  <Text style={styles.thRef}>{p.reference || p.note || '—'}</Text>
                  <Text style={styles.thBalance}>{formatCedi(p.runningBalance)}</Text>
                  <Text style={styles.thStatus}>
                    {p.voided ? '[VOIDED]' : 'CONFIRMED'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Work & Pay Motorcycle Hire-Purchase Platform — Official Record</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateStatementPDFBuffer(agreement: StatementPDFProps['agreement']): Promise<Buffer> {
  const doc = <StatementDocument agreement={agreement} />;
  const buffer = await renderToBuffer(doc);
  return buffer;
}

export interface LegalNoticePDFProps {
  agreement: {
    id: string;
    ownerName: string;
    ownerPhone: string;
    guarantor1Name?: string | null;
    guarantor1Phone?: string | null;
    guarantor2Name?: string | null;
    guarantor2Phone?: string | null;
    hirer: {
      name: string;
      phone: string;
      email?: string | null;
    };
    vehicle: {
      makeModel: string;
      registrationNo: string;
      chassisNo?: string | null;
      engineNo?: string | null;
      colorYear?: string | null;
    };
    summary: {
      hirePurchasePrice: number;
      totalPaid: number;
      balanceRemaining: number;
      enableLateFee: boolean;
      accumulatedLateFee: number;
      totalAmountDue: number;
      statusBadge: {
        label: string;
        daysOverdue: number;
      };
    };
  };
  noticeType: 'DEFAULT' | 'REPOSSESSION';
}

function LegalNoticeDocument({ agreement, noticeType }: LegalNoticePDFProps) {
  const isDefault = noticeType === 'DEFAULT';
  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {isDefault ? 'FORMAL DEFAULT NOTICE' : 'NOTICE OF REPOSSESSION'}
            </Text>
            <Text style={{ fontSize: 9, color: isDefault ? '#c2410c' : '#b91c1c', fontFamily: 'Helvetica-Bold', marginTop: 2 }}>
              {isDefault ? 'DEMAND LETTER — SECTION 8 CONTRACT BREACH' : 'AUTHORIZATION FOR IMMEDIATE VEHICLE REPOSSESSION'}
            </Text>
          </View>
          <View>
            <Text style={styles.meta}>Date: {todayStr}</Text>
            <Text style={styles.meta}>Ref: {agreement.id.slice(-8).toUpperCase()}</Text>
          </View>
        </View>

        {/* Notice Target Banner */}
        <View style={{ backgroundColor: isDefault ? '#fff7ed' : '#fef2f2', borderLeftWidth: 4, borderLeftColor: isDefault ? '#f97316' : '#ef4444', padding: 8, marginBottom: 12 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: isDefault ? '#9a3412' : '#991b1b' }}>
            {isDefault
              ? 'ATTENTION HIRER & GUARANTOR: FINAL NOTICE TO SETTLE OVERDUE ARREARS'
              : 'OFFICIAL NOTICE OF REPOSSESSION & REVOCATION OF POSSESSION RIGHTS'}
          </Text>
        </View>

        {/* Parties Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. CONTRACT PARTIES & GUARANTOR DETAILS</Text>
          <View style={styles.row}>
            <View style={styles.col2}>
              <Text style={styles.label}>HIRER (RIDER):</Text>
              <Text style={styles.value}>{agreement.hirer.name}</Text>
              <Text style={styles.value}>Phone: {agreement.hirer.phone}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>VEHICLE OWNER:</Text>
              <Text style={styles.value}>{agreement.ownerName}</Text>
              <Text style={styles.value}>Phone: {agreement.ownerPhone}</Text>
            </View>
          </View>
          <View style={{ marginTop: 4 }}>
            <Text style={styles.label}>GUARANTOR(S):</Text>
            <Text style={styles.value}>
              Guarantor 1: {agreement.guarantor1Name || 'N/A'} {agreement.guarantor1Phone ? `(${agreement.guarantor1Phone})` : ''}
            </Text>
            {agreement.guarantor2Name && (
              <Text style={styles.value}>
                Guarantor 2: {agreement.guarantor2Name} ({agreement.guarantor2Phone || 'N/A'})
              </Text>
            )}
          </View>
        </View>

        {/* Vehicle Identification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. MOTORCYCLE IDENTIFICATION</Text>
          <View style={styles.row}>
            <View style={styles.col3}>
              <Text style={styles.label}>MAKE & MODEL:</Text>
              <Text style={styles.value}>{agreement.vehicle.makeModel}</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>REGISTRATION NO:</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>{agreement.vehicle.registrationNo}</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>COLOR / YEAR:</Text>
              <Text style={styles.value}>{agreement.vehicle.colorYear || 'N/A'}</Text>
            </View>
          </View>
          <View style={[styles.row, { marginTop: 4 }]}>
            <View style={styles.col2}>
              <Text style={styles.label}>CHASSIS NO:</Text>
              <Text style={styles.value}>{agreement.vehicle.chassisNo || 'N/A'}</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>ENGINE NO:</Text>
              <Text style={styles.value}>{agreement.vehicle.engineNo || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Financial Statement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. FINANCIAL BREACH & ARREARS SUMMARY</Text>
          <View style={styles.row}>
            <View style={styles.col3}>
              <Text style={styles.label}>HIRE-PURCHASE PRICE:</Text>
              <Text style={styles.value}>{formatCedi(agreement.summary.hirePurchasePrice)}</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>TOTAL PAID TO DATE:</Text>
              <Text style={styles.value}>{formatCedi(agreement.summary.totalPaid)}</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.label}>BASE BALANCE REMAINING:</Text>
              <Text style={styles.value}>{formatCedi(agreement.summary.balanceRemaining)}</Text>
            </View>
          </View>
          {agreement.summary.enableLateFee && (
            <View style={[styles.row, { marginTop: 4 }]}>
              <View style={styles.col2}>
                <Text style={styles.label}>ACCRUED LATE FEE PENALTY:</Text>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#c2410c' }}>
                  {formatCedi(agreement.summary.accumulatedLateFee)}
                </Text>
              </View>
              <View style={styles.col2}>
                <Text style={styles.label}>TOTAL AMOUNT DUE:</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#b91c1c' }}>
                  {formatCedi(agreement.summary.totalAmountDue)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Formal Legal Declaration & Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. LEGAL TERMS & ACTION REQUIRED (SECTION 8)</Text>
          {isDefault ? (
            <Text style={{ fontSize: 8.5, lineHeight: 1.4, color: '#1e293b' }}>
              TAKE NOTICE that you are in breach of the financial payment schedule under Section 8 of the Work & Pay Hire-Purchase Agreement. As of this date, your account is overdue by {agreement.summary.statusBadge.daysOverdue} days. You are hereby formally requested to settle the full outstanding amount of {formatCedi(agreement.summary.totalAmountDue || agreement.summary.balanceRemaining)} within SEVEN (7) CALENDAR DAYS from the date of this notice. Failure to remedy this default will result in immediate termination of the agreement, revocation of vehicle usage, and physical repossession of the motorcycle without further notice or judicial process.
            </Text>
          ) : (
            <Text style={{ fontSize: 8.5, lineHeight: 1.4, color: '#1e293b' }}>
              TAKE NOTICE that due to un-remedied default under Section 8 of the Hire-Purchase Agreement, your right to possess and operate the motorcycle ({agreement.vehicle.registrationNo}) is hereby IMMEDIATELY TERMINATED. The Vehicle Owner or designated repossession agents are authorized to locate, secure, and take possession of the motorcycle wherever situated. The Hirer and Guarantors are ordered to surrender the motorcycle, keys, and DVLA documentation immediately. Any resistance or concealment of the vehicle will result in criminal complaint for conversion and recovery of legal expenses.
            </Text>
          )}
        </View>

        {/* Signatures */}
        <View style={{ marginTop: 20 }}>
          <View style={styles.row}>
            <View style={styles.col2}>
              <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 25 }}>ISSUED & SIGNED BY OWNER:</Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 3, width: '80%' }}>
                {agreement.ownerName}
              </Text>
            </View>
            <View style={styles.col2}>
              <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 25 }}>HIRER / WITNESS ACKNOWLEDGMENT:</Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 3, width: '80%' }}>
                Signature / Thumbprint
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Work & Pay Hire-Purchase Legal Enforcement System — Section 8 Contract Action</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateLegalNoticePDFBuffer(
  agreement: LegalNoticePDFProps['agreement'],
  noticeType: 'DEFAULT' | 'REPOSSESSION'
): Promise<Buffer> {
  const doc = <LegalNoticeDocument agreement={agreement} noticeType={noticeType} />;
  const buffer = await renderToBuffer(doc);
  return buffer;
}

