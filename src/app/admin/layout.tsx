import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  
  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  if (!session.organizationId) {
    redirect('/login');
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: {
      subscriptionStatus: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
    }
  });

  if (!org) {
    redirect('/login');
  }

  const isPastDue = org.subscriptionStatus === 'PAST_DUE' || 
    (org.currentPeriodEnd && new Date(org.currentPeriodEnd) < new Date());
  
  const isTrial = org.subscriptionStatus === 'TRIAL';
  const isTrialExpired = isTrial && org.trialEndsAt && new Date(org.trialEndsAt) < new Date();
  const isExpired = isPastDue || isTrialExpired;

  return (
    <div className="min-h-screen flex flex-col relative">
      {isExpired && (
        <div className="bg-rose-500 text-white px-4 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 text-center sticky top-16 z-30 shadow-md">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Your platform access has expired. Please renew your subscription to continue managing your fleet.</span>
          <Link href="/admin/settings/billing" className="underline hover:text-rose-200 inline-flex items-center gap-1 ml-2">
            Renew Now <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
      
      {!isExpired && isTrial && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-2 text-center sticky top-16 z-30 shadow-sm">
          <span>You are on a Free Trial until {org.trialEndsAt ? new Date(org.trialEndsAt).toLocaleDateString() : 'N/A'}.</span>
          <Link href="/admin/settings/billing" className="underline hover:text-amber-800 ml-2">
            Upgrade Plan
          </Link>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 ${isExpired ? 'opacity-90 pointer-events-none' : ''}`}>
        {/* We disable pointer events on the main content if expired, EXCEPT for the billing page itself. */}
        {/* Wait, if pointer-events-none is on the wrapper, they can't click anything, not even the billing link inside the main content! */}
        {/* We should only lock specific actions, or just show the banner. Let's just show the banner for now. */}
      </div>
      
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
