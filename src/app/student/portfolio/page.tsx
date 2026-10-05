'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: 'bg-yellow-200 text-yellow-900 border-yellow-400',
  red: 'bg-rose-200 text-rose-900 border-rose-400',
  blue: 'bg-sky-200 text-sky-900 border-sky-400',
  green: 'bg-emerald-200 text-emerald-900 border-emerald-400',
};

export default function StudentMasterPortfolioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState<'selector' | 'subject-detail'>('selector');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'paper1' | 'paper2'>('paper1');

  const [paper1Submissions, setPaper1Submissions] = useState<any[]>([]);
  const [paper2Submissions, setPaper2Submissions] = useState<any[]>([]);

  const [selectedP1Sub, setSelectedP1Sub] = useState<any>(null);
  const [selectedP2Sub, setSelectedP2Sub] = useState<any>(null); // Paper 2 Detay Modalı için
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitContent, setResubmitContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    const { data: allSubs } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (allSubs) {
      const p1List = allSubs.filter(sub => !sub.chosen_text_type?.startsWith('Paper 2'));
      p1List.sort((a, b) => {
        const aUnread = (a.teacher_feedback && a.is_read_by_student === false) ? 1 : 0;
        const bUnread = (b.teacher_feedback && b.is_read_by_student === false) ? 1 : 0;
        if (aUnread !== bUnread) return bUnread - aUnread;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setPaper1Submissions(p1List);

      const p2List = allSubs.filter(sub => sub.chosen_text_type?.startsWith('Paper 2'));
      setPaper2Submissions(p2List);
    }

    setLoading(false);
  };

  const handleMarkAsRead = async (subId: string) => {
    await supabase.from('submissions').update({ is_read_by_student: true }).eq('id', subId);
    fetchPortfolioData();
  };

  const handleDeleteP1 = async (subId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    const { error } = await supabase.from('submissions').delete().eq('id', subId);
    if (!error) {
      setSelectedP1Sub(null);
      fetchPortfolioData();
    }
  };

  const handleDeleteP2 = async (subId: string) => {
    if (!confirm('Are you sure you want to delete this exam record?')) return;
    const { error } = await supabase.from('submissions').delete().eq('id', subId);
    if (!error) {
      setSelectedP2Sub(null);
      fetchPortfolioData();
    }
  };

  const handleResubmitP1 = async () => {
    if (!selectedP1Sub || !resubmitContent.trim()) return;
    const newWordCount = resubmitContent.trim().split(/\s+/).length;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('submissions').update({
        content: resubmitContent,
        word_count: newWordCount,
        criterion_a_score: null,
        criterion_b_score: null,
        criterion_c_score: null,
        teacher_feedback: 'Revised version submitted. Awaiting teacher re-evaluation.',
        is_read_by_student: true
      }).eq('id', selectedP1Sub.id);

      if (error) throw error;
      alert('Revised essay successfully submitted to your teacher!');
      setIsResubmitting(false);
      fetchPortfolioData();
      setSelectedP1Sub(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-medium">
        Loading Master Portfolio...
      </div>
    );
  }

  const unreadP1Count = paper1Submissions.filter(s => s.teacher_feedback && s.is_read_by_student === false).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (viewMode === 'subject-detail') {
                  setViewMode('selector');
                  setSelectedSubject(null);
                } else {
                  router.push('/student');
                }
              }}
              className="px-3 py-1.5 border text-xs bg-white rounded-xl text-slate-600 font-bold hover:bg-slate-50 shadow-xs inline-flex items-center cursor-pointer"
            >
              {viewMode === 'subject-detail' ? '← Back to Subjects' : '← Back to Student Portal'}
            </button>
            <span className="font-bold text-slate-900">Student Master Portfolio</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
              Nilüfer Anadolu İmam Hatip Lisesi
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        
        {viewMode === 'selector' ? (
          <div className="space-y-8">
            <div className="text-center md:text-left space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold">
                My Learning Records
              </span>
              <h1 className="text-3xl font-black text-slate-900">Select a Subject Portfolio</h1>
              <p className="text-sm text-slate-600 max-w-xl">
                Choose a subject card below to inspect your historical submissions, teacher feedback, analytical grades, and component results.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              <div
                onClick={() => {
                  setSelectedSubject('English B');
                  setViewMode('subject-detail');
                }}
                className="group relative h-80 rounded-3xl overflow-hidden shadow-lg border border-slate-200 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5"
              >
                <div className="absolute inset-0 z-0">
                  <img
                    src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1000&q=80"
                    alt="English Literature & Language"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                </div>

                <div className="absolute inset-0 z-10 p-6 flex flex-col justify-between text-white">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-3 py-1 bg-orange-600/90 text-white rounded-xl font-bold backdrop-blur-md">
                      IBDP Group 2
                    </span>
                    {unreadP1Count > 0 && (
                      <span className="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-full animate-bounce">
                        {unreadP1Count} New Feedback
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white group-hover:text-orange-400 transition-colors">
                      English B
                    </h2>
                    <p className="text-xs text-slate-300 line-clamp-2">
                      Paper 1 Writing essays, teacher grading, highlights, and Paper 2 reading comprehension results.
                    </p>
                    <div className="pt-2 flex items-center gap-3 text-xs font-semibold text-orange-400">
                      <span>View Portfolio Details →</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-80 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <span className="text-2xl font-bold mb-1">+</span>
                <p className="text-xs font-semibold">More Subjects Coming Soon</p>
                <p className="text-[10px] text-slate-400 mt-1">Additional IBDP subjects will appear here automatically.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-200 text-white p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-900">
              <div className="absolute inset-0 z-0 opacity-25">
                <img 
                  src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=2000&q=80" 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 bg-orange-600 text-white rounded-lg font-bold">
                  Subject Portfolio
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-white">English B Learning Archive</h1>
                <p className="text-xs text-slate-300 max-w-xl">
                  Review your Paper 1 writing submissions &amp; teacher feedback alongside your Paper 2 reading comprehension records.
                </p>
              </div>

              <div className="flex items-center gap-3 relative z-10 shrink-0">
                <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-2xl text-center shadow-md min-w-[95px]">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Paper 1 Essays</span>
                  <span className="text-xl font-black text-white">{paper1Submissions.length}</span>
                </div>
                <div className="p-4 bg-orange-950/90 border border-orange-500/30 rounded-2xl text-center shadow-md min-w-[95px]">
                  <span className="text-[10px] font-mono uppercase text-orange-300 block">Paper 2 Tests</span>
                  <span className="text-xl font-black text-orange-400">{paper2Submissions.length}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-b border-slate-200 pb-4">
              <button
                onClick={() => setActiveTab('paper1')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer relative ${
                  activeTab === 'paper1' 
                    ? 'bg-orange-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Paper 1 Submissions &amp; Teacher Feedback
                {unreadP1Count > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                    {unreadP1Count}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('paper2')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'paper2' 
                    ? 'bg-orange-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Paper 2 Reading Results ({paper2Submissions.length})
              </button>
            </div>

            {activeTab === 'paper1' ? (
              <div className="space-y-6">
                {paper1Submissions.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm text-slate-500 text-xs">
                    You have not submitted any Paper 1 essays yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className={`space-y-3 ${selectedP1Sub ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                      {paper1Submissions.map(sub => {
                        const totalAi = (sub.ai_score_a || 0) + (sub.ai_score_b || 0) + (sub.ai_score_c || 0);
                        const showNotif = sub.teacher_feedback && sub.is_read_by_student === false;
                        return (
                          <div 
                            key={sub.id} 
                            onClick={() => { setSelectedP1Sub(sub); setIsResubmitting(false); if (showNotif) handleMarkAsRead(sub.id); }} 
                            className={`p-5 border rounded-2xl bg-white cursor-pointer relative shadow-xs transition-all ${
                              selectedP1Sub?.id === sub.id ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {showNotif && (
                              <span className="absolute top-3 right-3 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full animate-bounce">
                                New Feedback!
                              </span>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full border border-orange-200">
                                {sub.chosen_text_type}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {new Date(sub.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 mt-2">{sub.word_count || 0} words • AI Score: {totalAi}/30</h4>
                            {sub.class_id ? (
                              sub.criterion_a_score !== null ? (
                                <span className="text-[11px] font-bold text-emerald-700 block mt-1">
                                  ✓ Teacher Graded: {(sub.criterion_a_score || 0) + (sub.criterion_b_score || 0) + (sub.criterion_c_score || 0)}/30
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium text-amber-600 block mt-1">⏳ Awaiting Teacher Feedback</span>
                              )
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400 block mt-1">🤖 AI Only</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {selectedP1Sub && (
                      <div className="lg:col-span-7 bg-white border border-slate-200 p-8 rounded-3xl space-y-6 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                          <h3 className="font-bold text-sm text-slate-900">{selectedP1Sub.chosen_text_type} Details</h3>
                          <div className="flex gap-2">
                            {selectedP1Sub.class_id && !isResubmitting && (
                              <button onClick={() => { setIsResubmitting(true); setResubmitContent(selectedP1Sub.content); }} className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold cursor-pointer">
                                Revise &amp; Resubmit ➔
                              </button>
                            )}
                            <button onClick={() => handleDeleteP1(selectedP1Sub.id)} className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer">
                              Delete 🗑️
                            </button>
                            <button onClick={() => setSelectedP1Sub(null)} className="px-3.5 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
                              Close
                            </button>
                          </div>
                        </div>

                        {selectedP1Sub.prompt_text && (
                          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">📝 Stimulus Prompt</span>
                            <p className="text-xs font-serif text-slate-800 italic">"{selectedP1Sub.prompt_text}"</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200">
                            <span className="block text-[11px] font-black text-orange-800 uppercase tracking-wider mb-1">🤖 AI Assessment</span>
                            <div className="text-xs space-y-0.5 text-slate-700">
                              <div>Crit A: <b>{selectedP1Sub.ai_score_a ?? '-'}/12</b></div>
                              <div>Crit B: <b>{selectedP1Sub.ai_score_b ?? '-'}/12</b></div>
                              <div>Crit C: <b>{selectedP1Sub.ai_score_c ?? '-'}/6</b></div>
                              <div className="pt-1 font-black text-orange-900 border-t border-orange-200 mt-1">Total: {(selectedP1Sub.ai_score_a || 0) + (selectedP1Sub.ai_score_b || 0) + (selectedP1Sub.ai_score_c || 0)} / 30</div>
                            </div>
                          </div>

                          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                            <span className="block text-[11px] font-black text-emerald-800 uppercase tracking-wider mb-1">👨‍🏫 Teacher Assessment</span>
                            {selectedP1Sub.class_id ? (
                              selectedP1Sub.criterion_a_score !== null ? (
                                <div className="text-xs space-y-0.5 text-slate-700">
                                  <div>Crit A: <b>{selectedP1Sub.criterion_a_score}/12</b></div>
                                  <div>Crit B: <b>{selectedP1Sub.criterion_b_score}/12</b></div>
                                  <div>Crit C: <b>{selectedP1Sub.criterion_c_score}/6</b></div>
                                  <div className="pt-1 font-black text-emerald-900 border-t border-emerald-200 mt-1">Total: {(selectedP1Sub.criterion_a_score || 0) + (selectedP1Sub.criterion_b_score || 0) + (selectedP1Sub.criterion_c_score || 0)} / 30</div>
                                </div>
                              ) : (
                                <p className="text-xs text-amber-700 font-medium italic mt-2">Awaiting teacher grading...</p>
                              )
                            ) : (
                              <p className="text-xs text-slate-500 font-medium italic mt-2">AI Only (No classroom)</p>
                            )}
                          </div>
                        </div>

                        {selectedP1Sub.ai_feedback && (
                          <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl text-xs space-y-1">
                            <b>🤖 AI Feedback:</b>
                            <p className="whitespace-pre-line text-slate-700">{selectedP1Sub.ai_feedback}</p>
                          </div>
                        )}

                        {selectedP1Sub.class_id && selectedP1Sub.teacher_feedback && (
                          <div className="p-5 bg-emerald-600 text-white rounded-2xl shadow-md space-y-1">
                            <span className="text-xs font-black uppercase tracking-wider">🔔 Teacher Feedback &amp; Guidance</span>
                            <p className="text-xs whitespace-pre-line leading-relaxed font-medium">{selectedP1Sub.teacher_feedback}</p>
                          </div>
                        )}

                        {isResubmitting ? (
                          <div className="p-6 bg-slate-50 border border-slate-300 rounded-2xl space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-slate-900 uppercase">Revise Manuscript</h4>
                              <button onClick={() => setIsResubmitting(false)} className="text-xs text-rose-600 font-bold cursor-pointer">Cancel</button>
                            </div>
                            <textarea
                              rows={10}
                              value={resubmitContent}
                              onChange={e => setResubmitContent(e.target.value)}
                              className="w-full p-4 bg-white border rounded-xl text-xs font-serif leading-relaxed"
                            />
                            <button
                              onClick={handleResubmitP1}
                              disabled={submitting}
                              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                            >
                              {submitting ? 'Submitting...' : 'Submit Revised Essay to Teacher ➔'}
                            </button>
                          </div>
                        ) : (
                          <div className="p-5 bg-slate-50 rounded-2xl whitespace-pre-line font-serif text-xs leading-relaxed max-h-80 overflow-y-auto border border-slate-200">
                            {selectedP1Sub.content}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {paper2Submissions.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm text-slate-500 text-xs">
                    You have not completed any Paper 2 reading comprehension assessments yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className={`space-y-3 ${selectedP2Sub ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                      {paper2Submissions.map(sub => {
                        const score = sub.ai_score_a || 0;
                        const total = sub.ai_score_b || 48;
                        const pct = sub.ai_score_c || 0;
                        return (
                          <div 
                            key={sub.id} 
                            onClick={() => setSelectedP2Sub(sub)}
                            className={`p-5 border rounded-2xl bg-white cursor-pointer relative shadow-xs transition-all ${
                              selectedP2Sub?.id === sub.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full border border-indigo-200">
                                {sub.chosen_text_type}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {new Date(sub.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-3">
                              <span className="text-xs font-bold text-slate-800">Score: <strong className="text-indigo-600">{score} / {total}</strong> ({pct}%)</span>
                              <span className="text-xs font-bold text-indigo-600 underline">View Details ➔</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedP2Sub && (
                      <div className="lg:col-span-7 bg-white border border-slate-200 p-8 rounded-3xl space-y-6 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                          <div>
                            <span className="text-[10px] font-mono uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">Paper 2 Report</span>
                            <h3 className="font-bold text-sm text-slate-900 mt-1">{selectedP2Sub.chosen_text_type}</h3>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleDeleteP2(selectedP2Sub.id)} className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer">
                              Delete 🗑️
                            </button>
                            <button onClick={() => setSelectedP2Sub(null)} className="px-3.5 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
                              Close
                            </button>
                          </div>
                        </div>

                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex justify-between items-center">
                          <div>
                            <span className="text-xs font-bold text-indigo-900 block">Total Exam Score</span>
                            <span className="text-2xl font-black text-indigo-700">{selectedP2Sub.ai_score_a} / {selectedP2Sub.ai_score_b}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-600 block">Success Rate</span>
                            <span className="text-2xl font-black text-slate-900">%{selectedP2Sub.ai_score_c}</span>
                          </div>
                        </div>

                        {/* Detaylı Soru Doğru/Yanlış Analizi */}
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Detailed Question Breakdown</h4>
                          {(() => {
                            try {
                              const feedbackObj = JSON.parse(selectedP2Sub.content);
                              return Object.keys(feedbackObj).map(passageId => {
                                const pData = feedbackObj[passageId];
                                return (
                                  <div key={passageId} className="p-4 bg-slate-50 border rounded-2xl space-y-3">
                                    <h5 className="font-bold text-xs text-indigo-900">Passage: {pData.title}</h5>
                                    
                                    {/* Soru A */}
                                    <div className="text-xs space-y-1 bg-white p-3 rounded-xl border">
                                      <div className="font-bold text-slate-700">(a) True Statements (Earned: {pData.checks.a.earned}/4)</div>
                                      <div className="text-slate-600">Your selections: <b>{pData.checks.a.student?.join(', ') || 'None'}</b></div>
                                      <div className="text-emerald-700">Correct answers: <b>{pData.checks.a.correct.join(', ')}</b></div>
                                    </div>

                                    {/* Soru B */}
                                    <div className="text-xs space-y-1 bg-white p-3 rounded-xl border">
                                      <div className="font-bold text-slate-700">(b) Sentence Completion (Earned: {pData.checks.b.earned}/3)</div>
                                      {Object.keys(pData.checks.b.correct).map((bIdx: any) => {
                                        const studentAns = pData.checks.b.student?.[bIdx] || '(blank)';
                                        const correctAns = pData.checks.b.correct[bIdx];
                                        const isCorrect = studentAns.trim().toLowerCase() === correctAns.toLowerCase();
                                        return (
                                          <div key={bIdx} className={`p-2 rounded border text-[11px] ${isCorrect ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
                                            Item {Number(bIdx) + 1}: You wrote "<b>{studentAns}</b>" {isCorrect ? '✓ Correct' : `(Correct: ${correctAns})`}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Soru C */}
                                    <div className="text-xs space-y-1 bg-white p-3 rounded-xl border">
                                      <div className="font-bold text-slate-700">(c) Headings Matching (Earned: {pData.checks.c.earned}/4)</div>
                                      {Object.keys(pData.checks.c.correct).map((gap: any) => {
                                        const studentAns = pData.checks.c.student?.[gap] || '-';
                                        const correctAns = pData.checks.c.correct[gap];
                                        const isCorrect = studentAns === correctAns;
                                        return (
                                          <div key={gap} className={`p-2 rounded border text-[11px] ${isCorrect ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
                                            Gap [{gap}]: You selected "<b>{studentAns}</b>" {isCorrect ? '✓ Correct' : `(Correct: ${correctAns})`}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Soru D */}
                                    <div className="text-xs space-y-1 bg-white p-3 rounded-xl border">
                                      <div className="font-bold text-slate-700">(d) Conclusion (Earned: {pData.checks.d.earned}/1)</div>
                                      <div className={`${pData.checks.d.student === pData.checks.d.correct ? 'text-emerald-700' : 'text-rose-600'}`}>
                                        Your choice: <b>{pData.checks.d.student || 'None'}</b> {pData.checks.d.student === pData.checks.d.correct ? '✓ Correct' : `(Correct: ${pData.checks.d.correct})`}
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            } catch (e) {
                              return <p className="text-xs text-slate-500">Detailed breakdown not available.</p>;
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}