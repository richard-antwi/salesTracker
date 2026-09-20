'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DemoButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: data.phone, password: data.password }),
      });

      if (!loginRes.ok) {
        throw new Error('Failed to log into demo account.');
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Could not launch demo mode. Please try again.');
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleDemoLogin}
      disabled={loading}
      className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-lg font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
    >
      <Play className="w-5 h-5 text-emerald-400" />
      {loading ? 'Launching Sandbox...' : 'Try Interactive Demo'}
    </button>
  );
}
