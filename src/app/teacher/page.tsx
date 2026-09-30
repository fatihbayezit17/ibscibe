'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ClassItem {
  id: string;
  class_name: string;
  join_code: string;
  created_at: string;
  students?: { id: string; full_name: string }[];
}

interface SubmissionItem {
  id: string;
  student_id: string;
  prompt_id: string | null;
  chosen_text_type: string;
  content: string;
  word_count: number;
  ai_score_a: number | null;
  ai_score_b: number | null;
  ai_score_c: number | null;
  ai_feedback: string | null;
  criterion_a_score: number | null;
  criterion_b_score: number | null;
  criterion_c_score: number | null;
  teacher_feedback: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export default function TeacherPortal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<'submissions' | 'classes' | 'stimuli'>('submissions');

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [classMsg, setClassMsg] = useState('');

  const [stimTheme, setStimTheme] = useState('Identities');
  const [stimLevel, setStimLevel] = useState<'SL' | 'HL'>('SL');
  const [targetClassId, setTargetClassId] = useState<string>('global');
  const [stimTitle, setStimTitle] = useState('');
  const [stimPrompt, setStimPrompt] = useState('');
  const [stimOption1, setStimOption1] = useState('');
  const [stimOption2, setStimOption2] = useState('');
  const [stimOption3, setStimOption3] = useState('');
  const [stimMsg, setStimMsg] = useState('');

  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  
  // Seçilen Öğrenci ve Yazıları
  const [activeStudent, setActiveStudent] = useState<{ id: string; full_name: string } | null>(null);
  const [selectedSub, setSelectedSub] = useState<SubmissionItem | null>(null);

  const [sliderA, setSliderA] = useState<number>(6);
  const [sliderB, setSliderB] = useState<number>(6);
  const [sliderC, setSliderC] = useState<number>(3);
  const [teacherNote, setTeacherNote] = useState<string>('');
  const [savingGrade, setSavingGrade] = useState<boolean>(false);

  useEffect(() => {
    checkTeacher();
  }, []);

  const checkTeacher = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }
      setUser(session.user);

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      setProfile(prof || { full_name: session.user.email, role: 'teacher' });

      await loadClassesWithStudents();
      await loadSubmissions();
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassesWithStudents = async () => {
    try {
      const { data: classData } = await supabase.from('classes').select('*').order('created_at', { ascending: false });
      if (!classData) return;

      const classesWithStudents = await Promise.all(
        classData.map(async (c) => {
          const { data: memberData } = await supabase
            .from('class_members')
            .select('student_id, profiles:student_id(id, full_name)')
            .eq('class_id', c.id);

          const students = memberData ? memberData.map((m: any) => m.profiles).filter(Boolean) : [];
          return { ...c, students };
        })
      );

      setClasses(classesWithStudents);
    } catch (err) {
      console.error('Error loading classes:', err);
    }
  };

  const loadSubmissions = async () => {
    try {
      const { data } = await supabase
        .from('submissions')
        .select('*, profiles:student_id(full_name)')
        .order('created_at', { ascending: false });
      if (data) setSubmissions(data);
    } catch (err) {
      console.error('Error loading submissions:', err);
    }
  };

  const handleSelectStudent = (student: { id: string; full_name: string }) => {
    setActiveStudent(student);
    setSelectedSub(null);
  };

  const openGradingView = (sub: SubmissionItem) => {
    setSelectedSub(sub);
    setSliderA(sub.criterion_a_score ?? sub.ai_score_a ?? 6);
    setSliderB(sub.criterion_b_score ?? sub.ai_score_b ?? 6);
    setSliderC(sub.criterion_c_score ?? sub.ai_score_c ?? 3);
    setTeacherNote(sub.teacher_feedback ?? '');
  };

  const saveTeacherEvaluation = async () => {
    if (!selectedSub) return;
    setSavingGrade(true);

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          criterion_a_score: sliderA,
          criterion_b_score: sliderB,
          criterion_c_score: sliderC,
          teacher_feedback: teacherNote,
        })
        .eq('id', selectedSub.id);

      if (error) throw error;

      alert('Evaluation and feedback successfully saved & sent to student!');
      await loadSubmissions();
      const updatedSub = { ...selectedSub, criterion_a_score: sliderA, criterion_b_score: sliderB, criterion_c_score: sliderC, teacher_feedback: teacherNote };
      setSelectedSub(updatedSub);
    } catch (err: any) {
      alert('Error updating submission: ' + err.message);
    } finally {
      setSavingGrade(false);
    }
  };

  const handleDeleteSubmission = async (subId: string) => {
    if (!confirm('Are you sure you want to delete this student submission?')) return;
    const { error } = await supabase.from('submissions').delete().eq('id', subId);
    if (error) {
      alert('Error deleting submission: ' + error.message);
    } else {
      loadSubmissions();
      setSelectedSub(null);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this classroom?')) return;
    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (error) {
      alert('Error deleting class: ' + error.message);
    } else {
      loadClassesWithStudents();
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassMsg('');
    if (!newClassName.trim()) return;

    const generatedCode = 'IB-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    const { error } = await supabase.from('classes').insert([
      { class_name: newClassName.trim(), join_code: generatedCode }
    ]);

    if (error) {
      setClassMsg('Error creating class: ' + error.message);
    } else {
      setClassMsg(`Class "${newClassName}" created with code: ${generatedCode}`);
      setNewClassName('');
      loadClassesWithStudents();
    }
  };

  const handleAddStimulus = async (e: React.FormEvent) => {
    e.preventDefault();
    setStimMsg('');
    if (!stimTitle || !stimPrompt || !stimOption1 || !stimOption2 || !stimOption3) {
      setStimMsg('Please fill in the title, prompt, and all 3 text type options.');
      return;
    }

    const payload: any = {
      theme: stimTheme,
      level: stimLevel,
      title: stimTitle,
      prompt: stimPrompt,
      text_options: [stimOption1, stimOption2, stimOption3],
      created_by: user.id,
    };

    if (targetClassId !== 'global') {
      payload.class_id = targetClassId;
    }

    const { error } = await supabase.from('stimuli').insert([payload]);

    if (error) {
      setStimMsg('Error: ' + error.message);
    } else {
      setStimMsg(targetClassId === 'global' ? 'Stimulus added to global library!' : 'Task successfully assigned to the selected class!');
      setStimTitle('');
      setStimPrompt('');
      setStimOption1('');
      setStimOption2('');
      setStimOption3('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium text-sm">
        Loading Educator Portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white shadow-sm">
              T
            </div>
            <span className="font-bold text-slate-900 text-base">Teacher Portal</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 font-mono border border-orange-200">
              {profile?.full_name || user?.email}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => { setActiveStudent(null); setSelectedSub(null); setTab('submissions'); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === 'submissions' && !activeStudent && !selectedSub ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Submissions ({submissions.length})
            </button>
            <button
              onClick={() => { setActiveStudent(null); setSelectedSub(null); setTab('classes'); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === 'classes' && !activeStudent && !selectedSub ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Classes &amp; Students ({classes.length})
            </button>
            <button
              onClick={() => { setActiveStudent(null); setSelectedSub(null); setTab('stimuli'); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === 'stimuli' && !activeStudent && !selectedSub ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Add Task / Stimulus
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/');
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:text-slate-900 ml-2 bg-white shadow-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* 1. ÖĞRENCİ SEÇİLDİYSE VE BİR YAZI İNCELENİYORSA: ÇİFT SÜTUNLU DEĞERLENDİRME SAYFASI */}
        {selectedSub && activeStudent ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedSub(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  ← Back to {activeStudent.full_name}'s Submissions
                </button>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Evaluating: {activeStudent.full_name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Format: <span className="font-mono text-orange-600 font-bold">{selectedSub.chosen_text_type}</span> • {selectedSub.word_count} words • Submitted on {new Date(selectedSub.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleDeleteSubmission(selectedSub.id)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs rounded-xl transition-all"
              >
                🗑️ Delete Submission
              </button>
            </div>

            {/* ÇİFT SÜTUN: SOL METİN, SAĞ AI & ÖĞRETMEN DEĞERLENDİRME */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-6 space-y-6">
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Student's Written Submission</h3>
                  <div className="p-5 rounded-2xl bg-amber-50/20 border border-slate-300 text-slate-800 text-sm leading-[2.2rem] font-serif whitespace-pre-line max-h-[650px] overflow-y-auto shadow-inner"
                    style={{
                      backgroundImage: 'linear-gradient(to bottom, transparent 35px, #e2e8f0 35px)',
                      backgroundSize: '100% 36px'
                    }}
                  >
                    {selectedSub.content}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-6">
                {selectedSub.ai_feedback && (
                  <div className="p-6 rounded-3xl bg-orange-50/60 border border-orange-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-orange-700 uppercase tracking-wider">AI Analytical Feedback &amp; Score</h4>
                      <span className="px-3 py-1 bg-orange-600 text-white rounded-lg text-xs font-bold shadow-xs">
                        AI Total: {(selectedSub.ai_score_a || 0) + (selectedSub.ai_score_b || 0) + (selectedSub.ai_score_c || 0)} / 30
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-white p-4 rounded-xl border border-orange-200 shadow-xs">
                      {selectedSub.ai_feedback}
                    </div>
                  </div>
                )}

                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-lg space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Teacher Assessment Sliders</h4>
                    <span className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl font-black text-sm shadow-sm">
                      Total: {sliderA + sliderB + sliderC} / 30
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">Criterion A: Language (Grammar &amp; Vocab)</span>
                      <span className="text-orange-600 text-sm">{sliderA} / 12</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={12}
                      value={sliderA}
                      onChange={(e) => setSliderA(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">Criterion B: Message (Relevance &amp; Arguments)</span>
                      <span className="text-orange-600 text-sm">{sliderB} / 12</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={12}
                      value={sliderB}
                      onChange={(e) => setSliderB(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">Criterion C: Conceptual Understanding</span>
                      <span className="text-orange-600 text-sm">{sliderC} / 6</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      value={sliderC}
                      onChange={(e) => setSliderC(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Teacher Feedback &amp; Guidance
                    </label>
                    <textarea
                      rows={5}
                      value={teacherNote}
                      onChange={(e) => setTeacherNote(e.target.value)}
                      placeholder="Write constructive guidance for the student..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed shadow-sm"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={savingGrade}
                    onClick={saveTeacherEvaluation}
                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
                  >
                    {savingGrade ? 'Saving Evaluation...' : 'Save & Publish Evaluation to Student'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeStudent ? (
          /* 2. ÖĞRENCİ SEÇİLDİ ANCAK YAZI SEÇİLMEDİYSE: ÖĞRENCİNİN TÜM YAZILARININ LİSTESİ */
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveStudent(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  ← Back to Classes
                </button>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Submissions by: {activeStudent.full_name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Select a submission below to inspect and evaluate.</p>
                </div>
              </div>
            </div>

            {submissions.filter(s => s.student_id === activeStudent.id).length === 0 ? (
              <div className="p-12 text-center border border-slate-200 rounded-2xl bg-white text-slate-500 text-sm shadow-sm">
                {activeStudent.full_name} has not submitted any essays yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {submissions.filter(s => s.student_id === activeStudent.id).map((sub) => {
                  const isGraded = sub.criterion_a_score !== null || sub.criterion_b_score !== null || sub.criterion_c_score !== null;
                  const totalTeacher = isGraded ? (sub.criterion_a_score || 0) + (sub.criterion_b_score || 0) + (sub.criterion_c_score || 0) : null;

                  return (
                    <div key={sub.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900 text-base">{sub.chosen_text_type}</span>
                          <span className="text-xs text-slate-500">({sub.word_count} words)</span>
                        </div>
                        <p className="text-xs text-slate-400">Submitted on {new Date(sub.created_at).toLocaleDateString()}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {isGraded ? (
                            <span className="text-xs font-bold text-emerald-600">Graded: {totalTeacher}/30</span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600">Needs Review</span>
                          )}
                        </div>
                        <button
                          onClick={() => openGradingView(sub)}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                        >
                          Inspect &amp; Grade ➔
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* 3. STANDART SEKMELER (Submissions, Classes, Stimuli) */
          <>
            {tab === 'submissions' && (
              <div className="space-y-6">
                <h2 className="text-xl font-extrabold text-slate-900">Student Essay Submissions</h2>
                {submissions.length === 0 ? (
                  <div className="p-12 text-center border border-slate-200 rounded-2xl bg-white text-slate-500 text-sm shadow-sm">
                    No submissions received yet. Share your class join code with students!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {submissions.map((sub) => {
                      const isGraded = sub.criterion_a_score !== null || sub.criterion_b_score !== null || sub.criterion_c_score !== null;
                      const totalTeacher = isGraded
                        ? (sub.criterion_a_score || 0) + (sub.criterion_b_score || 0) + (sub.criterion_c_score || 0)
                        : null;

                      return (
                        <div
                          key={sub.id}
                          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-900 text-base">
                                {sub.profiles?.full_name || 'Student Candidate'}
                              </span>
                              <span className="text-xs text-slate-500 font-mono">({sub.chosen_text_type})</span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {sub.word_count} words • Submitted on {new Date(sub.created_at).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[11px] block text-slate-500">AI Score: {(sub.ai_score_a || 0) + (sub.ai_score_b || 0) + (sub.ai_score_c || 0)}/30</span>
                              {isGraded ? (
                                <span className="text-xs font-bold text-emerald-600">Graded: {totalTeacher}/30</span>
                              ) : (
                                <span className="text-xs font-semibold text-amber-600">Needs Review</span>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                const st = { id: sub.student_id, full_name: sub.profiles?.full_name || 'Student' };
                                setActiveStudent(st);
                                openGradingView(sub);
                              }}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                            >
                              {isGraded ? 'Edit Evaluation' : 'Evaluate Work'}
                            </button>

                            <button
                              onClick={() => handleDeleteSubmission(sub.id)}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs rounded-xl transition-all"
                              title="Delete Submission"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'classes' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-5 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Create a New Classroom</h3>
                  <p className="text-xs text-slate-500">
                    Generate an automatic join code for your English B students to automatically group their work under your portal.
                  </p>
                  {classMsg && (
                    <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-800">
                      {classMsg}
                    </div>
                  )}
                  <form onSubmit={handleCreateClass} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Class Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder="e.g. IBDP Year 1 English B - Period 3"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                    >
                      Generate Classroom &amp; Code
                    </button>
                  </form>
                </div>

                <div className="md:col-span-7 space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Active Classrooms &amp; Enrolled Students ({classes.length})</h3>
                  {classes.length === 0 ? (
                    <div className="p-8 text-center border border-slate-200 rounded-2xl text-xs text-slate-500 bg-white shadow-sm">
                      No classes created yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {classes.map((c) => (
                        <div
                          key={c.id}
                          className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                              <h4 className="font-bold text-slate-900 text-base">{c.class_name}</h4>
                              <span className="text-xs text-slate-500">Created on {new Date(c.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Student Code</span>
                                <span className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 font-mono font-bold text-sm tracking-wider">
                                  {c.join_code}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteClass(c.id)}
                                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs rounded-xl transition-all"
                                title="Delete Classroom"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          <div>
                            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                              Enrolled Students ({c.students?.length || 0})
                            </h5>
                            {c.students && c.students.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {c.students.map((st: any) => (
                                  <button
                                    key={st.id}
                                    onClick={() => handleSelectStudent(st)}
                                    className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-xs font-bold text-slate-800 hover:text-orange-700 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                    title="Click to view all student's submissions"
                                  >
                                    👤 {st.full_name || 'Student'} ➔
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No students have joined this class with the code yet.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'stimuli' && (
              <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
                <h3 className="text-lg font-bold text-slate-900">Add Custom Stimulus or Assign Class Task</h3>
                <p className="text-xs text-slate-500">
                  Create an original stimulus. Select a specific class to assign it as an official teacher task, which will appear at the very top of your students' screens.
                </p>

                {stimMsg && (
                  <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-800">
                    {stimMsg}
                  </div>
                )}

                <form onSubmit={handleAddStimulus} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Assign To Classroom</label>
                    <select
                      value={targetClassId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                    >
                      <option value="global">Global Library (Practice for Everyone)</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>🎯 Class Assignment: {c.class_name} ({c.join_code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Theme</label>
                      <select
                        value={stimTheme}
                        onChange={(e) => setStimTheme(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                      >
                        <option value="Identities">Identities</option>
                        <option value="Experiences">Experiences</option>
                        <option value="Human Ingenuity">Human Ingenuity</option>
                        <option value="Social Organization">Social Organization</option>
                        <option value="Sharing the Planet">Sharing the Planet</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Level</label>
                      <select
                        value={stimLevel}
                        onChange={(e) => setStimLevel(e.target.value as 'SL' | 'HL')}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                      >
                        <option value="SL">Standard Level (SL)</option>
                        <option value="HL">Higher Level (HL)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Title</label>
                    <input
                      type="text"
                      required
                      value={stimTitle}
                      onChange={(e) => setStimTitle(e.target.value)}
                      placeholder="e.g. Urban Farming Initiatives"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Prompt Scenario</label>
                    <textarea
                      rows={4}
                      required
                      value={stimPrompt}
                      onChange={(e) => setStimPrompt(e.target.value)}
                      placeholder="Write the contextual stimulus scenario here according to IB Paper 1 guidelines..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      3 Prescribed Text Types
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        value={stimOption1}
                        onChange={(e) => setStimOption1(e.target.value)}
                        placeholder="e.g. Speech"
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                      />
                      <input
                        type="text"
                        required
                        value={stimOption2}
                        onChange={(e) => setStimOption2(e.target.value)}
                        placeholder="e.g. Article"
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                      />
                      <input
                        type="text"
                        required
                        value={stimOption3}
                        onChange={(e) => setStimOption3(e.target.value)}
                        placeholder="e.g. Brochure"
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                  >
                    Publish Task / Stimulus
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}