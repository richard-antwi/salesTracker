import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getCurrentSession } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import PwaRegister from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: 'Work & Pay — Motorcycle Hire-Purchase Platform',
  description: 'Payment tracking platform for motorcycle hire-purchase business in Ghana',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Work & Pay',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
        <PwaRegister />
        <Navbar user={session} />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
