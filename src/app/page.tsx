'use client';

import React from 'react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 flex flex-col selection:bg-orange-600 selection:text-white">
      {/* Top Academic Banner */}
      <div className="bg-slate-900 text-slate-200 px-4 py-2 text-center text-xs font-semibold tracking-wider flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
        IBDP English B Paper 1 Assessment &amp; Evaluation Suite
      </div>

      {/* Navbar */}
      <header className="border-b border-slate-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 flex items-center justify-center font-black text-white shadow-lg shadow-orange-600/25 tracking-tighter text-lg">
              IS
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 block">IBscribe</span>
              <span className="text-[10px] font-bold text-orange-700 tracking-widest uppercase">English B Assessment Portal</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="/auth"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 inline-block"
            >
              Sign Up
            </a>
            <a
              href="/auth"
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-md shadow-orange-600/20 transition-all transform hover:-translate-y-0.5 inline-block"
            >
              Access Portal ➔
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-28 flex flex-col items-center text-center justify-center space-y-16">
        <div className="space-y-8 max-w-4xl">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-orange-50 border border-orange-200/80 text-orange-800 text-xs font-bold uppercase tracking-wider shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
            Designed for IBDP Coordinators, Teachers &amp; Candidates
          </div>

          <h1 className="text-4xl sm:text-7xl font-black tracking-tight text-slate-900 leading-[1.08]">
            Transforming Paper 1 Assessment with <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">AI &amp; Precision</span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
            An advanced institutional ecosystem featuring automated OCR handwriting transcription, criterion-mapped AI scoring, and interactive color-coded teacher markups.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/auth"
              className="w-full sm:w-auto px-10 py-4.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-sm shadow-xl shadow-orange-600/25 transition-all transform hover:-translate-y-0.5 inline-block text-center"
            >
              Access Portal Now ➔
            </a>
          </div>
        </div>

        {/* Professional Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pt-12 text-left">
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-2xl -z-10 group-hover:scale-125 transition-transform" />
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 text-2xl font-bold shadow-xs">
              🤖
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Gemini AI Evaluation</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Provides rigorous formative feedback mapped strictly to Paper 1 assessment criteria A (Language), B (Message), and C (Conceptual Understanding) out of 30 marks.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-2xl -z-10 group-hover:scale-125 transition-transform" />
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 text-2xl font-bold shadow-xs">
              🎨
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Color-Coded Highlights</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Teachers can highlight precise student manuscript snippets with custom color categories and annotation notes for powerful targeted guidance.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -z-10 group-hover:scale-125 transition-transform" />
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 text-2xl font-bold shadow-xs">
              🏫
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Institutional Licensing</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Secure school onboarding with automated quota management for school coordinators, English B teachers, and student cohorts.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 py-10 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 IBscribe Assessment Platform. All rights reserved.</span>
          <a href="/auth" className="font-bold text-slate-700 hover:text-orange-600 transition-colors inline-block">
            Sign Up / Register ➔
          </a>
        </div>
      </footer>
    </div>
  );
}