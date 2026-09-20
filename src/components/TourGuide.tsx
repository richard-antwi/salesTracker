'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

interface TourGuideProps {
  agreementsCount: number;
}

export default function TourGuide({ agreementsCount }: TourGuideProps) {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Only show tour if they have 0 agreements AND haven't seen it yet
    if (agreementsCount === 0) {
      const hasSeenTour = localStorage.getItem('has_seen_tour');
      if (!hasSeenTour) {
        // Small delay to allow page to render first
        const timer = setTimeout(() => setShowTour(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [agreementsCount]);

  if (!showTour) return null;

  const dismissTour = () => {
    localStorage.setItem('has_seen_tour', 'true');
    setShowTour(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full relative overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Glow effect header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
        
        <button 
          onClick={dismissTour}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-5 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 mb-2">Welcome to your new Fleet!</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Your dashboard is currently empty. To get started, click the <strong className="text-slate-900">Add First Motorcycle</strong> button or <strong className="text-slate-900">+ New Agreement</strong> at the top to register your first rider.
          </p>
          
          <button
            onClick={dismissTour}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-95"
          >
            Got it, let's go!
          </button>
        </div>
      </div>
    </div>
  );
}
