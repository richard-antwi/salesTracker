'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bike, LogOut, PlusCircle, CreditCard, LayoutDashboard, Shield } from 'lucide-react';

interface NavbarProps {
  user?: {
    name: string;
    role: 'ADMIN' | 'RIDER' | 'GUARANTOR';
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  if (!user || pathname === '/login') {
    return null;
  }

  const isAdmin = user.role === 'ADMIN';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <Link href={isAdmin ? '/admin/dashboard' : '/rider'} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md group-hover:bg-emerald-500 transition-colors">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                Work & Pay
              </span>
              <span className="block text-[10px] text-emerald-400 font-medium tracking-wider uppercase">
                Ghana Hire-Purchase
              </span>
            </div>
          </Link>

          {/* Navigation Links for Desktop & Mobile Header Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {isAdmin ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    pathname === '/admin/dashboard'
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <Link
                  href="/admin/payments/new"
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    pathname === '/admin/payments/new'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Record Payment</span>
                </Link>
                <Link
                  href="/admin/agreements/new"
                  className={`hidden md:flex px-3 py-2 rounded-lg text-xs sm:text-sm font-medium items-center gap-1.5 transition-colors ${
                    pathname === '/admin/agreements/new'
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>New Agreement</span>
                </Link>
              </>
            ) : (
              <Link
                href="/rider"
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  pathname === '/rider'
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>My Agreement</span>
              </Link>
            )}

            {/* User Badge & Logout */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3 ml-1 sm:ml-2">
              <div className="hidden sm:block text-right">
                <span className="block text-xs font-semibold text-white truncate max-w-[120px]">
                  {user.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  <Shield className="w-2.5 h-2.5" />
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
