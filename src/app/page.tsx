'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans relative overflow-hidden">
      {/* Arka Planda Gerçek Amerikan Üniversitesi Kampüs Fotoğrafı */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=2000&q=80" 
          alt="American University Campus" 
          className="w-full h-full object-cover opacity-50"
        />
        {/* Metinlerin okunabilirliği için şık ama resmin görünmesini sağlayan dengeli karartma */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/80 to-slate-950/90" />
      </div>

      {/* Üst Header */}
      <header className="border-b border-white/10 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white shadow-lg text-lg">
              IS
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white block">IBscribe</span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-orange-400 block font-bold">English B Assessment Portal</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.push('/auth')} 
              className="text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer px-4 py-2"
            >
              Sign Up
            </button>
            <button 
              onClick={() => router.push('/auth')} 
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Access Portal</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </header>

      {/* Ana Hero Alanı */}
      <main className="max-w-5xl mx-auto px-6 py-24 md:py-32 flex-1 w-full flex flex-col items-center text-center space-y-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          Designed for IBDP Coordinators, Teachers &amp; Candidates
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-white drop-shadow-md">
          Transforming Paper 1 Assessment with <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400">AI &amp; Precision</span>
        </h1>

        <p className="text-sm md:text-base text-slate-200 max-w-2xl leading-relaxed font-medium drop-shadow">
          An advanced institutional ecosystem featuring automated OCR handwriting transcription, criterion-mapped AI scoring, and interactive color-coded teacher markups.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button 
            onClick={() => router.push('/auth')}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-orange-600/40 transition-all cursor-pointer flex items-center justify-center gap-3 group"
          >
            <span>Access Portal Now</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        {/* Özellik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 w-full text-left">
          <div className="p-6 bg-slate-900/85 backdrop-blur-md border border-white/15 rounded-3xl space-y-2 shadow-2xl">
            <div className="text-orange-400 font-mono text-xs font-bold uppercase tracking-widest">01 / OCR Transcription</div>
            <h3 className="font-extrabold text-base text-white">Handwriting to Digital</h3>
            <p className="text-xs text-slate-300 leading-relaxed">Instantly convert student paper drafts and exam booklets into editable digital manuscripts via advanced vision models.</p>
          </div>

          <div className="p-6 bg-slate-900/85 backdrop-blur-md border border-white/15 rounded-3xl space-y-2 shadow-2xl">
            <div className="text-orange-400 font-mono text-xs font-bold uppercase tracking-widest">02 / IB Criteria</div>
            <h3 className="font-extrabold text-base text-white">Criterion Mapping</h3>
            <p className="text-xs text-slate-300 leading-relaxed">Evaluate essays strictly against IBDP English B Criteria A (Language), B (Message), and C (Conceptual understanding).</p>
          </div>

          <div className="p-6 bg-slate-900/85 backdrop-blur-md border border-white/15 rounded-3xl space-y-2 shadow-2xl">
            <div className="text-orange-400 font-mono text-xs font-bold uppercase tracking-widest">03 / Color Markups</div>
            <h3 className="font-extrabold text-base text-white">Interactive Feedback</h3>
            <p className="text-xs text-slate-300 leading-relaxed">Empower teachers with color-coded text highlighting palettes, custom notes, and real-time student notifications.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/85 py-8 text-center text-xs text-slate-400 relative z-10">
        <p>© 2026 IBscribe Assessment Portal. All institutional rights reserved.</p>
      </footer>
    </div>
  );
}