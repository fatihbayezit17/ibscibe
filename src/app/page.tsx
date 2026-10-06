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
          className="w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/90 to-slate-950" />
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
              <span className="text-[10px] font-mono tracking-widest uppercase text-orange-400 block font-bold">IBDP Assessment &amp; Portfolio Ecosystem</span>
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

      {/* Ana Hero Alanı - Öz ve Güçlü Pazarlama */}
      <main className="max-w-5xl mx-auto px-6 py-24 md:py-32 flex-1 w-full flex flex-col items-center text-center space-y-8 relative z-10">
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

        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button 
            onClick={handleNavigateAuth}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-orange-600/40 transition-all cursor-pointer flex items-center justify-center gap-3 group"
          >
            <span>Access Portal Now</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        {/* Özellik Kartları (Daha Net ve Nokta Atışı) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 w-full text-left">
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