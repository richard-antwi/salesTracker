'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bike, LogOut, PlusCircle, CreditCard, LayoutDashboard, Shield, TrendingUp } from 'lucide-react';

interface NavbarProps {
  user?: {
    name: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'RIDER' | 'GUARANTOR';
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

  if (!user && pathname !== '/') {
    // Hide navbar on login/register pages if not authenticated
    return null;
  }

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <Link
            href={
              !user 
                ? '/'
                : user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
                ? '/admin/dashboard'
                : user.role === 'GUARANTOR'
                ? '/guarantor/dashboard'
                : '/rider'
            }
            className="flex items-center gap-2.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md group-hover:bg-emerald-500 transition-colors">
              <Bike className="w-6 h-6" />
            </div>
            <div className="hidden sm:block">
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
            {!user ? (
              // PUBLIC NAVBAR
              <>
                <a href="#about" className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2">
                  About Us
                </a>
                <a href="#features" className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2">
                  Features
                </a>
                <a href="#how-it-works" className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2">
                  How it Works
                </a>
                <Link
                  href="/login"
                  className="ml-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-md transition-all"
                >
                  Log In
                </Link>
              </>
            ) : (
              // AUTHENTICATED NAVBAR
              <>
                {isAdmin ? (
                  <>
                    {user.role === 'SUPER_ADMIN' && (
                      <Link
                        href="/super-admin"
                        className={`hidden md:flex px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold items-center gap-1.5 transition-colors ${
                          pathname === '/super-admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20'
                        }`}
                      >
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span>Super Admin</span>
                      </Link>
                    )}
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
                      href="/admin/analytics"
                      className={`hidden md:flex px-3 py-2 rounded-lg text-xs sm:text-sm font-medium items-center gap-1.5 transition-colors ${
                        pathname === '/admin/analytics'
                          ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span className="hidden sm:inline">Analytics</span>
                    </Link>
                    <Link
                      href="/admin/settings/billing"
                      className={`hidden md:flex px-3 py-2 rounded-lg text-xs sm:text-sm font-medium items-center gap-1.5 transition-colors ${
                        pathname === '/admin/settings/billing'
                          ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="hidden sm:inline">Billing</span>
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
                ) : user.role === 'GUARANTOR' ? (
                  <Link
                    href="/guarantor/dashboard"
                    className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      pathname === '/guarantor/dashboard'
                        ? 'bg-slate-800 text-amber-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Guarantor Portal</span>
                  </Link>
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
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
