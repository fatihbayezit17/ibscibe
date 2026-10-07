'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface MockExam {
  id: string;
  subject: string;
  exam_date: string;       // YYYY-MM-DD
  exam_time: string;       // HH:MM
  day_of_week?: string;
  session_time: 'Morning' | 'Afternoon';
  target_class: string;
  invigilator_id: string;
}

// IBDP'de olabilecek başlıca dersler ve bileşenler listesi
const IBDP_SUBJECTS = [
  // Group 1: Studies in Language and Literature
  'English A: Language & Literature HL/SL',
  'English A: Literature HL/SL',
  'Turkish A: Language & Literature HL/SL',
  'Turkish A: Literature HL/SL',
  
  // Group 2: Language Acquisition
  'English B HL/SL',
  'German B HL/SL',
  'French B HL/SL',
  'Spanish B HL/SL',
  'German ab initio',
  
  // Group 3: Individuals and Societies
  'History HL/SL',
  'Geography HL/SL',
  'Economics HL/SL',
  'Business Management HL/SL',
  'Psychology HL/SL',
  'Global Politics HL/SL',
  
  // Group 4: Sciences
  'Biology HL/SL',
  'Chemistry HL/SL',
  'Physics HL/SL',
  'Computer Science HL/SL',
  'Environmental Systems and Societies (ESS) SL',
  
  // Group 5: Mathematics
  'Mathematics: Analysis and Approaches HL/SL',
  'Mathematics: Applications and Interpretation HL/SL',
  
  // Group 6 & Core
  'Visual Arts HL/SL',
  'Extended Essay (EE) Coordination',
  'Theory of Knowledge (TOK)'
];

export default function MockExamPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<MockExam[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  // Form State'leri
  const [subject, setSubject] = useState(IBDP_SUBJECTS[0]);
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('09:00');
  const [sessionTime, setSessionTime] = useState<'Morning' | 'Afternoon'>('Morning');
  const [targetClass, setTargetClass] = useState('IBDP-1A');
  const [invigilatorId, setInvigilatorId] = useState('');
  const [msg, setMsg] = useState('');

  // Düzenleme (Edit) Modal State'leri
  const [editingExam, setEditingExam] = useState<MockExam | null>(null);

  useEffect(() => {
    initMockPortal();
  }, []);

  const initMockPortal = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth';
        return;
      }

      const { data: mems, error: memsError } = await supabase
        .from('school_memberships')
        .select('user_id, role')
        .eq('role', 'teacher');

      if (memsError) {
        console.error('Error fetching memberships:', memsError);
      }

      if (mems) {
        const techList = await Promise.all(mems.map(async (m) => {
          const { data: prof } = await supabase.from('profiles').select('id, full_name, email').eq('id', m.user_id).single();
          return prof;
        }));
        setTeachers(techList.filter(Boolean));
      }
    } catch (err) {
      console.error('Init error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examDate) return;

    try {
      const dateObj = new Date(examDate);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

      const newExam: MockExam = {
        id: Math.random().toString(36).substring(2, 9),
        subject,
        exam_date: examDate,
        exam_time: examTime,
        day_of_week: dayName,
        session_time: sessionTime,
        target_class: targetClass,
        invigilator_id: invigilatorId
      };

      if (invigilatorId) {
        const { error: notifError } = await supabase.from('notifications').insert([
          {
            teacher_id: invigilatorId,
            title: 'New Exam Invigilation Assignment',
            message: `You have been assigned as an invigilator for "${subject}" on ${examDate} at ${examTime} (${sessionTime} session).`
          }
        ]);

        if (notifError) {
          console.error("Supabase Notification Error:", notifError);
          alert(`Database Error (Notifications): ${notifError.message}`);
          return;
        }
      }

      setExams([...exams, newExam]);
      setExamDate('');
      setExamTime('09:00');
      setMsg('Mock exam successfully scheduled and notification sent to the proctor!');
    } catch (err: any) {
      console.error("Unexpected Error during exam creation:", err);
      alert(`Unexpected Error: ${err.message || err}`);
    }
  };

  const handleDeleteExam = (id: string) => {
    if (!confirm('Are you sure you want to delete this exam schedule?')) return;
    setExams(exams.filter(ex => ex.id !== id));
  };

  const handleUpdateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;

    const dateObj = new Date(editingExam.exam_date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    setExams(exams.map(ex => ex.id === editingExam.id ? { ...editingExam, day_of_week: dayName } : ex));
    setEditingExam(null);
    alert('Exam schedule successfully updated!');
  };

  const handleExportPDF = () => {
    window.print();
  };

  const formatDateDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day} / ${month} / ${year}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-medium">Loading Mock Exam Hub...</div>;

  const sortedExams = [...exams].sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => router.push('/school-admin')} className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">
              ← Back to Dashboard
            </button>
            <span className="font-bold text-slate-900">| Mock Exam &amp; Invigilation Center</span>
          </div>
          <button onClick={() => { window.location.href = '/auth'; }} className="px-3 py-1.5 border text-xs bg-white rounded-lg text-slate-600 shadow-sm cursor-pointer">Sign Out</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl space-y-2 border border-emerald-900/50 print:hidden">
          <span className="px-3 py-1 bg-emerald-500/30 text-emerald-300 rounded-full text-[11px] font-mono uppercase tracking-widest border border-emerald-400/30">
            Examinations Office
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Mock Exam Scheduling &amp; Proctor Assignment</h2>
          <p className="text-xs text-slate-300">Create examination timetables, assign proctors, and oversee official IB subject sessions.</p>
        </div>

        {/* Sınav Oluşturma Formu */}
        <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-4 print:hidden">
          <h3 className="font-bold text-sm text-slate-900">Schedule New Mock Examination</h3>
          <form onSubmit={handleCreateExam} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select IBDP Subject / Component</label>
              <select 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                className="w-full px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900"
              >
                {IBDP_SUBJECTS.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Class</label>
              <select 
                value={targetClass} 
                onChange={e => setTargetClass(e.target.value)} 
                className="w-full px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900"
              >
                <option value="IBDP-1A">IBDP-1A</option>
                <option value="IBDP-1B">IBDP-1B</option>
                <option value="IBDP-2A">IBDP-2A</option>
                <option value="IBDP-2B">IBDP-2B</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Exam Date (Gün / Ay / Yıl)</label>
              <input 
                type="date" 
                required
                value={examDate} 
                onChange={e => setExamDate(e.target.value)} 
                className="w-full px-4 py-2.5 border rounded-xl text-xs bg-slate-50 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Exam Time (Saat)</label>
              <input 
                type="time" 
                required
                value={examTime} 
                onChange={e => setExamTime(e.target.value)} 
                className="w-full px-4 py-2.5 border rounded-xl text-xs bg-slate-50 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Session (Morning / Afternoon)</label>
              <select 
                value={sessionTime} 
                onChange={e => setSessionTime(e.target.value as any)} 
                className="w-full px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900"
              >
                <option value="Morning">Morning (AM)</option>
                <option value="Afternoon">Afternoon (PM)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assign Invigilator (Proctor / Görevli Öğretmen)</label>
              <select 
                value={invigilatorId} 
                onChange={e => setInvigilatorId(e.target.value)} 
                className="w-full px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900"
              >
                <option value="">Select Teacher...</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer">
                Schedule Exam &amp; Notify Proctor
              </button>
            </div>
          </form>

          {msg && <div className="p-3 bg-emerald-50 text-xs text-emerald-800 rounded-xl border border-emerald-200">{msg}</div>}
        </div>

        {/* Sınav Takvimi Tablosu */}
        <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between print:hidden">
            <h3 className="font-bold text-sm text-slate-900">Official Exam Timetable ({sortedExams.length})</h3>
            <button 
              onClick={handleExportPDF}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span>📥 Download Exam Timetable (PDF)</span>
            </button>
          </div>
          
          {sortedExams.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center bg-slate-50 rounded-2xl border">No mock examinations scheduled yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-3">Date (DD / MM / YYYY)</th>
                    <th className="p-3">Day</th>
                    <th className="p-3">Subject / Component</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Time &amp; Session</th>
                    <th className="p-3">Invigilator (Görevli Öğretmen)</th>
                    <th className="p-3 text-right print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {sortedExams.map((ex) => {
                    const proctor = teachers.find(t => t.id === ex.invigilator_id);
                    const isEvenDay = new Date(ex.exam_date).getDate() % 2 === 0;
                    const rowBgClass = isEvenDay ? 'bg-slate-50/90' : 'bg-emerald-50/40';

                    return (
                      <tr key={ex.id} className={`${rowBgClass} hover:bg-amber-50/50 transition-colors`}>
                        <td className="p-3 font-mono font-bold text-slate-900">{formatDateDDMMYYYY(ex.exam_date)}</td>
                        <td className="p-3 font-bold text-emerald-800">{ex.day_of_week}</td>
                        <td className="p-3 font-extrabold text-slate-900">{ex.subject}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px] font-bold uppercase">{ex.target_class}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-mono font-bold text-slate-900">{ex.exam_time || '09:00'}</div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold inline-block mt-0.5 ${ex.session_time === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                            {ex.session_time}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-indigo-600">{proctor ? proctor.full_name : 'Unassigned'}</td>
                        <td className="p-3 text-right space-x-2 print:hidden">
                          <button 
                            onClick={() => setEditingExam(ex)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteExam(ex.id)}
                            className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sınav Düzenleme (Edit) Modal Penceresi */}
        {editingExam && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-black text-base text-slate-900">Edit Mock Exam Schedule</h3>
                <button onClick={() => setEditingExam(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
              </div>

              <form onSubmit={handleUpdateExam} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subject / Component</label>
                  <select 
                    value={editingExam.subject} 
                    onChange={e => setEditingExam({ ...editingExam, subject: e.target.value })} 
                    className="w-full px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900"
                  >
                    {IBDP_SUBJECTS.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Exam Date (GG/AA/YYYY)</label>
                  <input 
                    type="date" 
                    required
                    value={editingExam.exam_date} 
                    onChange={e => setEditingExam({ ...editingExam, exam_date: e.target.value })} 
                    className="w-full px-4 py-2.5 border rounded-xl text-xs bg-slate-50 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Exam Time</label>
                  <input 
                    type="time" 
                    required
                    value={editingExam.exam_time || '09:00'} 
                    onChange={e => setEditingExam({ ...editingExam, exam_time: e.target.value })} 
                    className="w-full px-4 py-2.5 border rounded-xl text-xs bg-slate-50 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Session</label>
                  <select 
                    value={editingExam.session_time} 
                    onChange={e => setEditingExam({ ...editingExam, session_time: e.target.value as any })} 
                    className="w-full px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900"
                  >
                    <option value="Morning">Morning (AM)</option>
                    <option value="Afternoon">Afternoon (PM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assigned Invigilator</label>
                  <select 
                    value={editingExam.invigilator_id} 
                    onChange={e => setEditingExam({ ...editingExam, invigilator_id: e.target.value })} 
                    className="w-full px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900"
                  >
                    <option value="">Select Teacher...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingExam(null)} className="px-4 py-2 border text-xs font-bold rounded-xl text-slate-600">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}