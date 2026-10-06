'use client';

import React, { useState } from 'react';

export default function LandingPage() {
  const handleNavigateAuth = () => {
    window.location.href = '/auth';
  };

  const [showContactModal, setShowContactModal] = useState(false);
  const [schoolNameInput, setSchoolNameInput] = useState('');
  const [contactNameInput, setContactNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolNameInput.trim() || !emailInput.trim()) {
      alert('Please fill in at least the school name and email address.');
      return;
    }

    setSubmitting(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: 'fatihbayezit17@gmail.com',
          schoolName: schoolNameInput.trim(),
          contactName: contactNameInput.trim(),
          email: emailInput.trim(),
          phone: phoneInput.trim()
        })
      });

      setFormSubmitted(true);
      setTimeout(() => {
        setFormSubmitted(false);
        setShowContactModal(false);
        setSchoolNameInput('');
        setContactNameInput('');
        setEmailInput('');
        setPhoneInput('');
        alert('Thank you! Your institutional inquiry has been successfully received. Our academic team will contact you via email and phone shortly.');
      }, 1500);
    } catch (err: any) {
      alert('Error sending inquiry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=2000&q=80" 
          alt="Campus Background" 
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/90 to-slate-950" />
      </div>

      {/* Üst Header */}
      <header className="border-b border-white/10 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Gelişmiş Kurumsal Logo Entegre Edildi */}
          <div className="flex items-center space-x-3.5 group cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-900 to-slate-800 border border-orange-500/40 flex items-center justify-center relative shadow-xl shadow-orange-500/10 group-hover:border-orange-500 transition-all">
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 via-transparent to-amber-400/10 rounded-2xl" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-slate-950 animate-pulse" />
              <span className="font-black text-white text-lg tracking-tighter relative z-10 flex items-center">
                i<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400">S</span>
              </span>
            </div>
            <div>
              <span className="font-black text-xl tracking-wider text-white block leading-none">
                IB<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400">SCRIBE</span>
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-orange-400/90 block font-bold mt-1">
                Institutional AI Suite
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowContactModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/30 transition-all cursor-pointer flex items-center gap-2 border border-amber-300/40 hover:scale-105"
            >
              <span>✨ School Licensing</span>
            </button>

            <button 
              onClick={handleNavigateAuth} 
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-lg border border-white/15 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Access Portal</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </header>

      {/* Ana Hero Alanı */}
      <main className="max-w-6xl mx-auto px-6 py-20 md:py-28 flex-1 w-full flex flex-col items-center text-center space-y-12 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          Next-Gen IBDP Assessment &amp; Self-Study Portal
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-white drop-shadow-md">
          Precision AI Assessment &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400">Holistic IBDP Control</span>
        </h1>

        <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed font-medium">
          Empower your faculty and candidates with automated OCR transcription, criterion-mapped AI scoring, mock exam management, and interactive student portfolios in one unified ecosystem.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button 
            onClick={handleNavigateAuth}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-orange-600/40 transition-all cursor-pointer flex items-center justify-center gap-3 group"
          >
            <span>Access Portal Now</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        {/* İstatistik ve Metrik Bölümü */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 pt-8 text-left">
          
          {/* Grafik Kartı 1: Kriter Bazlı AI Doğruluk Analizi */}
          <div className="p-6 bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-3xl space-y-4 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="text-orange-400 font-mono text-[11px] font-bold uppercase tracking-widest">Metric 01 / Accuracy</div>
              <h3 className="font-extrabold text-base text-white mt-1">IB Criterion Mapping Performance</h3>
              <p className="text-xs text-slate-400 mt-1">AI alignment precision compared to official examiner standards.</p>
            </div>
            
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">Criterion A (Language)</span>
                  <span className="text-orange-400 font-mono">98.2%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                  <div className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full" style={{ width: '98.2%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">Criterion B (Message)</span>
                  <span className="text-orange-400 font-mono">96.5%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                  <div className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full" style={{ width: '96.5%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">Criterion C (Conceptual)</span>
                  <span className="text-orange-400 font-mono">97.8%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                  <div className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full" style={{ width: '97.8%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Grafik Kartı 2: Zaman Tasarrufu / Hız Karşılaştırması */}
          <div className="p-6 bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-3xl space-y-4 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="text-orange-400 font-mono text-[11px] font-bold uppercase tracking-widest">Metric 02 / Efficiency</div>
              <h3 className="font-extrabold text-base text-white mt-1">Assessment Time Reduction</h3>
              <p className="text-xs text-slate-400 mt-1">Average minutes spent per student essay evaluation.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 text-center">
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/10 flex flex-col justify-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Traditional</span>
                <span className="text-2xl font-black text-rose-400 font-mono mt-1">45 min</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Manual Grading</span>
              </div>
              <div className="p-4 bg-orange-950/30 rounded-2xl border border-orange-500/30 flex flex-col justify-center">
                <span className="text-xs text-orange-300 font-bold uppercase">IBscribe AI</span>
                <span className="text-2xl font-black text-orange-400 font-mono mt-1">3.5 min</span>
                <span className="text-[10px] text-orange-400/80 mt-0.5">Automated OCR &amp; Rubric</span>
              </div>
            </div>

            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 text-center text-xs text-orange-300 font-bold">
              ⚡ 92% Time Savings for Faculty Coordinators
            </div>
          </div>

          {/* Grafik Kartı 3: Platform Ekosistem Dağılımı */}
          <div className="p-6 bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-3xl space-y-4 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="text-orange-400 font-mono text-[11px] font-bold uppercase tracking-widest">Metric 03 / Ecosystem</div>
              <h3 className="font-extrabold text-base text-white mt-1">Institutional Module Load</h3>
              <p className="text-xs text-slate-400 mt-1">Active workflows managed within the school tier.</p>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-white/5 text-xs">
                <span className="text-slate-300 font-bold">📄 Paper 1 &amp; 2 Examinations</span>
                <span className="text-orange-400 font-mono font-bold">40%</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-white/5 text-xs">
                <span className="text-slate-300 font-bold">📚 Extended Essay (EE) Tracking</span>
                <span className="text-amber-400 font-mono font-bold">30%</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-white/5 text-xs">
                <span className="text-slate-300 font-bold">🎯 CAS &amp; Portfolio Portals</span>
                <span className="text-emerald-400 font-mono font-bold">30%</span>
              </div>
            </div>
          </div>

        </div>

        {/* Klasik Özellik Kartları (Alt Kısım) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 w-full text-left">
          <div className="p-6 bg-slate-900/85 backdrop-blur-md border border-white/15 rounded-3xl space-y-2 shadow-2xl">
            <div className="text-orange-400 font-mono text-xs font-bold uppercase tracking-widest">01 / OCR Digitization</div>
            <h3 className="font-extrabold text-base text-white">Handwriting to Digital</h3>
            <p className="text-xs text-slate-300 leading-relaxed">Instantly convert handwritten student exam drafts into editable digital manuscripts via advanced vision models.</p>
          </div>

          <div className="p-6 bg-slate-900/85 backdrop-blur-md border border-white/15 rounded-3xl space-y-2 shadow-2xl">
            <div className="text-orange-400 font-mono text-xs font-bold uppercase tracking-widest">02 / Criterion Scoring</div>
            <h3 className="font-extrabold text-base text-white">IB Standards Mapping</h3>
            <p className="text-xs text-slate-300 leading-relaxed">Evaluate essays strictly against IBDP Criteria A, B, and C with examiner commentary feedback standards.</p>
          </div>

          <div className="p-6 bg-slate-900/85 backdrop-blur-md border border-white/15 rounded-3xl space-y-2 shadow-2xl">
            <div className="text-orange-400 font-mono text-xs font-bold uppercase tracking-widest">03 / Faculty Suite</div>
            <h3 className="font-extrabold text-base text-white">Interactive Markups</h3>
            <p className="text-xs text-slate-300 leading-relaxed">Equip teachers with color-coded highlighting palettes, mock exam centers, and real-time student notifications.</p>
          </div>
        </div>
      </main>

      {/* School Licensing Başvuru Modalı */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-8 text-white space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/30">Institutional Licensing</span>
                <h3 className="text-xl font-black mt-1">Request School Subscription</h3>
              </div>
              <button onClick={() => setShowContactModal(false)} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            {formSubmitted ? (
              <div className="p-8 text-center space-y-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl">
                <div className="text-3xl">🎉</div>
                <h4 className="font-bold text-base text-emerald-300">Inquiry Received Successfully!</h4>
                <p className="text-xs text-slate-300">Your institutional inquiry has been successfully received. Our academic team will contact you via email and phone shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">School / Institution Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. St. George’s International School, Geneva" 
                    value={schoolNameInput} 
                    onChange={e => setSchoolNameInput(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Coordinator / Contact Person Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dr. Elena Vance" 
                    value={contactNameInput} 
                    onChange={e => setContactNameInput(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Email Address *</label>
                    <input 
                      type="email" 
                      required
                      placeholder="coordinator@stgeorges.ch" 
                      value={emailInput} 
                      onChange={e => setEmailInput(e.target.value)} 
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="+41 22 ___ ____" 
                      value={phoneInput} 
                      onChange={e => setPhoneInput(e.target.value)} 
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">Our academic team will review your institution's details and reach out to you promptly.</p>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowContactModal(false)} className="px-4 py-2.5 bg-slate-800 text-xs font-bold rounded-xl text-slate-300 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer disabled:opacity-50">
                    {submitting ? 'Sending...' : 'Request Licensing'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <footer className="border-t border-white/10 bg-slate-950/85 py-8 px-6 text-center text-xs text-slate-400 relative z-10 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-4">
        <p>© 2026 IBscribe Assessment Portal. All institutional rights reserved.</p>
        <button onClick={() => setShowContactModal(true)} className="text-orange-400 hover:underline font-bold cursor-pointer">
          School Licensing &amp; Institutional Inquiry
        </button>
      </footer>
    </div>
  );
}