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
