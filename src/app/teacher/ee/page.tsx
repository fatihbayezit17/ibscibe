'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface StudentEE {
  id: string;
  student_id: string;
  pathway: 'subject-focused' | 'interdisciplinary';
  subject_or_subjects: string;
  interdisciplinary_framework?: string;
  research_question?: string;
  rationale?: string;
  status: string;
  profiles?: { full_name: string; email: string };
}

export default function TeacherEEPortal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [studentEssays, setStudentEssays] = useState<StudentEE[]>([]);
  const [selectedEE, setSelectedEE] = useState<StudentEE | null>(null);

  const [rrsEntries, setRrsEntries] = useState<any[]>([]);
  const [reflections, setReflections] = useState<any[]>([]);
  const [evaluation, setEvaluation] = useState<any>(null);

  const [scoreA, setScoreA] = useState<number>(4);
  const [scoreB, setScoreB] = useState<number>(4);
  const [scoreC, setScoreC] = useState<number>(4);
  const [scoreD, setScoreD] = useState<number>(5);
  const [scoreE, setScoreE] = useState<number>(3);
  const [supervisorFeedback, setSupervisorFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    initTeacherEE();
  }, []);

  const initTeacherEE = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setUser(user);
    await loadTeacherEEDiff(user.id);
    setLoading(false);
  };

  const loadTeacherEEDiff = async (teacherId: string) => {
    // Öğretmenin okulundaki veya sınıflarındaki öğrencilerin EE çalışmalarını çekelim
    const { data: eeData } = await supabase
      .from('extended_essays')
      .select('*')
      .order('created_at', { ascending: false });

    if (eeData) {
      const enhanced = await Promise.all(eeData.map(async (ee) => {
        const { data: prof } = await supabase.from('profiles').select('full_name, email').eq('id', ee.student_id).single();
        return {
          ...ee,
          profiles: prof || { full_name: `Student (${ee.student_id.slice(0, 6)})`, email: '' }
        };
      }));
      setStudentEssays(enhanced);
      if (enhanced.length > 0 && !selectedEE) {
        selectEE(enhanced[0]);
      }
    }
  };

  const selectEE = async (ee: StudentEE) => {
    setSelectedEE(ee);

    // RRS notlarını çek
    const { data: rrs } = await supabase.from('ee_rrs_entries').select('*').eq('ee_id', ee.id).order('created_at', { ascending: false });
    setRrsEntries(rrs || []);

    // Yansıma oturumlarını çek
    const { data: refs } = await supabase.from('ee_reflections').select('*').eq('ee_id', ee.id).order('session_number', { ascending: true });
    setReflections(refs || []);

    // Değerlendirme / Taslak verisini çek
    const { data: evalData } = await supabase.from('ee_evaluations').select('*').eq('ee_id', ee.id).single();
    if (evalData) {
      setEvaluation(evalData);
      setScoreA(evalData.criterion_a ?? 4);
      setScoreB(evalData.criterion_b ?? 4);
      setScoreC(evalData.criterion_c ?? 4);
      setScoreD(evalData.criterion_d ?? 5);
      setScoreE(evalData.criterion_e ?? 3);
      setSupervisorFeedback(evalData.supervisor_feedback || '');
    } else {
      setEvaluation(null);
      setSupervisorFeedback('');
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedEE) return;
    await supabase.from('extended_essays').update({ status: newStatus }).eq('id', selectedEE.id);
    alert(`EE status updated to: ${newStatus}`);
    await loadTeacherEEDiff(user.id);
  };

  const handleSaveEvaluation = async () => {
    if (!selectedEE) return;
    setSaving(true);

    const { data: existing } = await supabase.from('ee_evaluations').select('id').eq('ee_id', selectedEE.id).single();

    const payload = {
      ee_id: selectedEE.id,
      criterion_a: scoreA,
      criterion_b: scoreB,
      criterion_c: scoreC,
      criterion_d: scoreD,
      criterion_e: scoreE,
      supervisor_feedback: supervisorFeedback
    };

    if (existing) {
      await supabase.from('ee_evaluations').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('ee_evaluations').insert([payload]);
    }

    alert('Supervisor grades and open-ended guidance successfully saved!');
    setSaving(false);
    await loadTeacherEEDiff(user.id);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Supervisor EE Portal...</div>;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white shadow-sm">SUP</div>
            <span className="font-bold">Supervisor Extended Essay Portal</span>
          </div>
          <button onClick={() => router.push('/teacher')} className="px-3 py-1.5 border text-xs bg-white rounded-lg text-slate-600 shadow-sm cursor-pointer">← Back to Teacher Portal</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sol Liste: Öğrencilerin EE Çalışmaları */}
          <div className="lg:col-span-4 space-y-3 max-h-[80vh] overflow-y-auto pr-1">
            <h3 className="text-xs font-black uppercase text-slate-500 px-1">Student Extended Essays ({studentEssays.length})</h3>
            {studentEssays.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-2xl border text-slate-400 text-xs">No student EE proposals submitted yet.</div>
            ) : (
              studentEssays.map(ee => (
                <div 
                  key={ee.id} 
                  onClick={() => selectEE(ee)} 
                  className={`p-4 border rounded-2xl bg-white cursor-pointer relative transition-all ${selectedEE?.id === ee.id ? 'border-orange-600 ring-2 ring-orange-500 shadow-sm bg-orange-50/20' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="font-bold text-xs text-slate-900">{ee.profiles?.full_name || 'Student'}</div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{ee.subject_or_subjects} ({ee.pathway})</div>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ee.status === 'approved_rq' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    Status: {ee.status}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Sağ Alan: Seçilen Öğrencinin EE Detayları, RRS ve 30 Puanlık Rubrik Değerlendirmesi */}
          <div className="lg:col-span-8 space-y-6">
            {selectedEE ? (
              <div className="space-y-6">
                {/* Proposal & RQ Onay Alanı */}
                <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h3 className="font-black text-base text-slate-900">{selectedEE.profiles?.full_name}'s Extended Essay</h3>
                      <p className="text-xs text-slate-500">Pathway: <span className="font-bold text-indigo-700">{selectedEE.pathway}</span> • Subject: <b>{selectedEE.subject_or_subjects}</b></p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateStatus('approved_rq')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer">Approve RQ ✓</button>
                      <button onClick={() => handleUpdateStatus('draft')} className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer">Request Revision</button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div><b>Research Question:</b> <span className="font-serif text-slate-800 bg-slate-50 px-2 py-1 rounded block mt-1">{selectedEE.research_question || 'Not specified'}</span></div>
                    <div><b>Rationale:</b> <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl mt-1 leading-relaxed">{selectedEE.rationale || 'No rationale provided.'}</p></div>
                  </div>
                </div>

                {/* Öğrenci RRS Notları ve Yansımaları */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-900 border-b pb-2">RRS &amp; AI Prompt Log ({rrsEntries.length})</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {rrsEntries.map(ent => (
                        <div key={ent.id} className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1">
                          <span className="font-bold text-[10px] text-indigo-700 uppercase bg-indigo-50 px-1.5 py-0.5 rounded">{ent.entry_type}</span>
                          <p className="text-slate-800">{ent.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-900 border-b pb-2">3 Mandatory Reflection Sessions (RPF)</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {reflections.map(ref => (
                        <div key={ref.id} className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1">
                          <div className="font-bold text-slate-900">Session {ref.session_number}</div>
                          <p className="text-slate-600">Student Notes: {ref.student_notes || 'Pending student entry.'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Taslak ve 30 Puanlık Değerlendirme (Kılavuz Uyumlu: Açık Uçlu Soru Desteği) */}
                <div className="p-8 bg-white border rounded-3xl shadow-sm space-y-6">
                  <div className="border-b pb-3">
                    <h4 className="font-black text-sm text-slate-900">Draft Review &amp; 30-Point Assessment (Criteria A-E)[cite: 30]</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Note: Supervisors are not permitted to make direct edits. Use open-ended guiding questions (e.g., "How does this evidence support your argument?")[cite: 33, 47].</p>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-serif text-slate-800 max-h-60 overflow-y-auto whitespace-pre-line">
                    <b>Student Essay Draft Content:</b>
                    <p className="mt-2">{evaluation?.draft_content || 'No draft submitted yet.'}</p>
                  </div>

                  <div className="grid grid-cols-5 gap-2 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Crit. A (/6)[cite: 30]</label>
                      <input type="number" min="0" max="6" value={scoreA} onChange={e => setScoreA(Number(e.target.value))} className="w-full p-2 border rounded-xl text-xs font-bold text-center" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Crit. B (/6)[cite: 30]</label>
                      <input type="number" min="0" max="6" value={scoreB} onChange={e => setScoreB(Number(e.target.value))} className="w-full p-2 border rounded-xl text-xs font-bold text-center" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Crit. C (/6)[cite: 30]</label>
                      <input type="number" min="0" max="6" value={scoreC} onChange={e => setScoreC(Number(e.target.value))} className="w-full p-2 border rounded-xl text-xs font-bold text-center" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Crit. D (/8)[cite: 30]</label>
                      <input type="number" min="0" max="8" value={scoreD} onChange={e => setScoreD(Number(e.target.value))} className="w-full p-2 border rounded-xl text-xs font-bold text-center" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Crit. E (/4)[cite: 29, 30]</label>
                      <input type="number" min="0" max="4" value={scoreE} onChange={e => setScoreE(Number(e.target.value))} className="w-full p-2 border rounded-xl text-xs font-bold text-center" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Supervisor Guidance &amp; Open-Ended Questions (Safe Framework)[cite: 33, 47]</label>
                    <textarea 
                      rows={4}
                      value={supervisorFeedback}
                      onChange={e => setSupervisorFeedback(e.target.value)}
                      placeholder="Ask pointed, open-ended questions like: 'I'm not sure I follow your argument here, because... What did you mean here?'"
                      className="w-full p-3 border rounded-2xl text-xs bg-slate-50 text-slate-900"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-black text-indigo-900">Total Score: {scoreA + scoreB + scoreC + scoreD + scoreE} / 30[cite: 30]</span>
                    <button 
                      onClick={handleSaveEvaluation} 
                      disabled={saving} 
                      className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      {saving ? 'Saving...' : 'Save Supervisor Feedback & Grades ➔'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center bg-white border rounded-3xl text-xs text-slate-400">
                Select a student extended essay from the left panel to review their proposal, RRS, and draft.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}