import type { Metadata } from 'next';
import './globals.css';
import { getCurrentSession } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Work & Pay — Motorcycle Hire-Purchase Platform',
  description: 'Payment tracking platform for motorcycle hire-purchase business in Ghana',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        <Navbar user={session} />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
