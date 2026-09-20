import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import Link from 'next/link';
import { Bike, ShieldCheck, CreditCard, TrendingUp, ChevronRight, Lock, CheckCircle2 } from 'lucide-react';
import DemoButton from '@/components/DemoButton';

export default async function HomePage() {
  const session = await getCurrentSession();

  // Redirect authenticated users to their respective dashboards
  if (session) {
    if (session.role === 'ADMIN' || session.role === 'SUPER_ADMIN') {
      redirect('/admin/dashboard');
    } else if (session.role === 'GUARANTOR') {
      redirect('/guarantor/dashboard');
    } else {
      redirect('/rider');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200">
      
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-400 via-slate-900 to-slate-900"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-semibold mb-6 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Ghana's #1 Hire-Purchase Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Manage your <span className="text-emerald-400">Motorcycle Fleet</span> <br className="hidden md:block"/> with absolute confidence.
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Eliminate paper ledgers, automate late fees, and let your riders pay via Mobile Money. The complete operating system for Work-and-Pay owners in Ghana.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/request-access" 
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              Create Organization
              <ChevronRight className="w-5 h-5" />
            </Link>
            <DemoButton />
          </div>
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Built for transparency. <br/>Designed for growth.</h2>
              <p className="text-slate-600 text-lg mb-6 leading-relaxed">
                The traditional "Work-and-Pay" model is broken. Vehicle owners lose track of manual payments, riders get frustrated by hidden late fees, and guarantors are left in the dark until it's too late.
              </p>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                We built this platform to bring trust back to the ecosystem. By automating calculations and providing dedicated portals for everyone involved, we protect the owner's investment while empowering the rider to achieve ownership.
              </p>
              <ul className="space-y-3">
                {['Bank-level encryption for sensitive data', 'Legally binding digital contracts', 'Real-time financial reconciliation'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-slate-50 rounded-3xl transform rotate-3 scale-105"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Guarantor Protection</h3>
                    <p className="text-sm text-slate-500">Secure Vault</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-2 bg-slate-100 rounded-full w-full"></div>
                  <div className="h-2 bg-slate-100 rounded-full w-5/6"></div>
                  <div className="h-2 bg-slate-100 rounded-full w-4/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES / FEATURES SECTION */}
      <section id="features" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to manage your fleet</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">Stop using WhatsApp and notebooks. Upgrade to a professional operating system built specifically for the Ghanaian transport sector.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Automated Tracking</h3>
              <p className="text-slate-600 leading-relaxed">
                The system automatically calculates grace periods, applies late fees, and updates the projected finish date based on the rider's actual payment speed.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Digital Payments</h3>
              <p className="text-slate-600 leading-relaxed">
                Riders can pay their weekly installments directly from their phones using MTN MoMo, Vodafone Cash, or Card via our secure Paystack integration.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Enterprise Security</h3>
              <p className="text-slate-600 leading-relaxed">
                Protect your account with Two-Factor Authentication (2FA). All sensitive Guarantor ID cards and phone numbers are encrypted at rest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / WALKTHROUGH */}
      <section id="how-it-works" className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Get started in minutes, not days.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-8 left-[15%] right-[15%] h-0.5 bg-slate-800 z-0"></div>

            {/* Step 1 */}
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Register Rider</h3>
              <p className="text-slate-400">
                Create a new agreement. Input the motorcycle price, weekly installment, and guarantor details.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-slate-800 border-2 border-slate-700 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Track Payments</h3>
              <p className="text-slate-400">
                Log cash payments or let the rider pay online. The system handles the math and issues digital receipts.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-slate-800 border-2 border-slate-700 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Transfer Ownership</h3>
              <p className="text-slate-400">
                When the balance hits zero, generate a final PDF clearance statement and hand over the papers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center items-center gap-2 mb-6">
            <Bike className="w-6 h-6 text-emerald-500" />
            <span className="text-xl font-bold text-white tracking-tight">Work & Pay</span>
          </div>
          <p className="mb-6 max-w-md mx-auto">
            Empowering Ghana's transport sector with modern financial technology and transparent contract management.
          </p>
          <div className="flex justify-center gap-6 mb-8 text-sm font-medium">
            <a href="#about" className="hover:text-emerald-400 transition-colors">About Us</a>
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How it Works</a>
            <Link href="/login" className="hover:text-emerald-400 transition-colors">Login</Link>
          </div>
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} Work & Pay Ghana. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
