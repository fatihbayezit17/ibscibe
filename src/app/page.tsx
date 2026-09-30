'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-black text-xl text-white shadow-md shadow-indigo-500/20">
              IB
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">IBScribe</span>
              <span className="block text-[10px] uppercase font-semibold tracking-wider text-indigo-600">Paper 1 Writing Suite</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/auth"
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-sm font-medium transition-all text-slate-700 shadow-sm"
            >
              Sign In
            </Link>
            <Link
              href="/auth"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center text-center px-6 py-20 max-w-5xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-6">
          <span>✨ International Baccalaureate Diploma Programme</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Master <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">IB English B</span> Paper 1 Writing
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-3xl leading-relaxed">
          The ultimate platform for Standard Level (SL) and Higher Level (HL) candidates. Practice with 100+ theme-based stimuli, get instant AI-assisted evaluation across Criteria A, B, and C, or join your teacher's virtual classroom.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/auth"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all text-base"
          >
            Start Writing (Free)
          </Link>
          <Link
            href="/auth"
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 border border-slate-200 font-semibold rounded-2xl transition-all text-base text-slate-700 shadow-sm"
          >
            Teacher Portal
          </Link>
        </div>

        {/* Feature Badges */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold mb-4">
              SL/HL
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Tailored Word Counts</h3>
            <p className="text-sm text-slate-600">
              Strict compliance with IB guidelines: 250–400 words for SL and 450–600 words for HL with active tracking.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold mb-4">
              AI &amp; Manual
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Dual Grading Matrix</h3>
            <p className="text-sm text-slate-600">
              Instant Criterion A, B, and C feedback from Gemini AI alongside interactive slider-based teacher reviews.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 font-bold mb-4">
              5 Themes
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">100+ IB Stimuli</h3>
            <p className="text-sm text-slate-600">
              Rich stimulus library across Identities, Experiences, Human Ingenuity, Social Organization, and Sharing the Planet.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500 bg-white">
        &copy; {new Date().getFullYear()} IBScribe. Built for IB DP English B educators & students.
      </footer>
    </div>
  );
}