'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TurkishAHub() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Üst Navigasyon */}
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/student" className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
              &larr; Öğrenci Paneline Dön
            </Link>
          </div>
          <span className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-800 font-bold border border-red-200">
            Language A: Literature Hub
          </span>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        
        {/* Banner Alanı */}
        <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-200 text-white p-8 md:p-10 bg-slate-900">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=2000&q=80" 
              alt="Turkish Literature" 
              className="w-full h-full object-cover opacity-25 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/80 to-transparent" />
          </div>

          <div className="space-y-2 relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 bg-red-600/85 text-white rounded-lg font-bold border border-red-500/30 backdrop-blur-sm">
              Türkçe A: Edebiyat Bölümü
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-white">Ana Dil Edebiyat Sınav Çalışma Alanı</h1>
            <p className="text-xs text-slate-300 max-w-xl">
              Metin çözümleme becerilerinizi geliştirmek ve karşılaştırmalı edebiyat denemeleri yazmak için aşağıdaki sınav bileşenlerini seçin.
            </p>
          </div>
        </div>

        {/* Paper 1 ve Paper 2 Seçim Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* Paper 1 Kartı */}
          <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-300 flex flex-col justify-between group min-h-[360px]">
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80" 
                alt="Paper 1" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/75 to-slate-900/40" />
            </div>

            <div className="relative z-10 p-8 flex flex-col justify-between h-full space-y-6 text-white">
              <div className="flex justify-between items-start border-b border-white/20 pb-4">
                <div className="space-y-0.5 font-mono text-[11px] font-bold tracking-widest text-slate-300">
                  <div>EXAMINATION COMPONENT</div>
                  <div className="text-[10px] text-red-300">GUIDED LITERARY ANALYSIS</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                  P1
                </div>
              </div>

              <div className="space-y-3 font-serif">
                <h3 className="text-2xl font-black text-white">Paper 1: Metin Çözümleme</h3>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  Görünmeyen düzyazı veya şiir metinleri üzerinden yönlendirilmiş çözümleme yazın; Kriter A, B, C ve D'ye göre yapay zeka destekli detaylı geribildirim alın.
                </p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => router.push('/student/turkish-a/paper1')}
                  className="w-full py-3 px-4 bg-slate-900/75 hover:bg-slate-900/90 backdrop-blur-md border border-white/25 text-white text-xs font-bold rounded-xl text-center shadow-md transition-all cursor-pointer"
                >
                  Paper 1 Çalışma Ortamını Başlat ➔
                </button>
              </div>
            </div>
          </div>

          {/* Paper 2 Kartı */}
          <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-300 flex flex-col justify-between group min-h-[360px]">
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80" 
                alt="Paper 2" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/75 to-slate-900/40" />
            </div>

            <div className="relative z-10 p-8 flex flex-col justify-between h-full space-y-6 text-white">
              <div className="flex justify-between items-start border-b border-white/20 pb-4">
                <div className="space-y-0.5 font-mono text-[11px] font-bold tracking-widest text-slate-300">
                  <div>EXAMINATION COMPONENT</div>
                  <div className="text-[10px] text-purple-300">COMPARATIVE LITERATURE</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center font-black text-xs shadow-md">
                  P2
                </div>
              </div>

              <div className="space-y-3 font-serif">
                <h3 className="text-2xl font-black text-white">Paper 2: Karşılaştırmalı Edebiyat</h3>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  Derste incelenen eserler üzerinden mekân kullanımı, çatışma, anlatım teknikleri ve tematik karşılaştırmalar içeren kompozisyonlar kurgulayın.
                </p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => router.push('/student/turkish-a/paper2')}
                  className="w-full py-3 px-4 bg-slate-900/75 hover:bg-slate-900/90 backdrop-blur-md border border-white/25 text-white text-xs font-bold rounded-xl text-center shadow-md transition-all cursor-pointer"
                >
                  Paper 2 Çalışma Ortamını Başlat ➔
                </button>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}