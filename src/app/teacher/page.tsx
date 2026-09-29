'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Submission {
  id: string;
  student_name: string;
  class_code: string;
  chosen_text_type: string;
  content: string;
  word_count: number;
  created_at: string;
  ai_score_a: number | null;
  ai_score_b: number | null;
  ai_score_c: number | null;
  ai_feedback: string | null;
  teacher_score_a?: number | null;
  teacher_score_b?: number | null;
  teacher_score_c?: number | null;
  teacher_feedback?: string | null;
  is_finalized?: boolean;
}

interface ClassItem {
  id: string;
  class_name: string;
  join_code: string;
  teacher_email: string;
}

export default function TeacherHub() {
  const [teacherEmail, setTeacherEmail] = useState<string>('fatih@school.edu');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassCode, setSelectedClassCode] = useState<string>('ALL');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Öğretmen değerlendirme formu alanları
  const [tScoreA, setTScoreA] = useState<number>(0);
  const [tScoreB, setTScoreB] = useState<number>(0);
  const [tScoreC, setTScoreC] = useState<number>(0);
  const [tFeedback, setTFeedback] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Yeni sınıf açma modal state'i
  const [showNewClassModal, setShowNewClassModal] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassCode, setNewClassCode] = useState<string>('');

  const loadTeacherClasses = async () => {
    try {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_email', teacherEmail.trim().toLowerCase());

      if (data) setClasses(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSubmissions = async () => {
    try {
      let query = supabase.from('submissions').select('*').order('created_at', { ascending: false });

      if (selectedClassCode !== 'ALL') {
        query = query.eq('class_code', selectedClassCode);
      }

      const { data, error } = await query;
      if (!error && data) {
        setSubmissions(data as Submission[]);
        if (selectedSubmission) {
          const updated = data.find((s) => s.id === selectedSubmission.id);
          if (updated) setSelectedSubmission(updated as Submission);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTeacherClasses();
  }, [teacherEmail]);

  useEffect(() => {
    loadSubmissions();
  }, [selectedClassCode]);

  useEffect(() => {
    if (selectedSubmission) {
      setTScoreA(
        selectedSubmission.teacher_score_a !== null && selectedSubmission.teacher_score_a !== undefined
          ? selectedSubmission.teacher_score_a
          : selectedSubmission.ai_score_a ?? 0
      );
      setTScoreB(
        selectedSubmission.teacher_score_b !== null && selectedSubmission.teacher_score_b !== undefined
          ? selectedSubmission.teacher_score_b
          : selectedSubmission.ai_score_b ?? 0
      );
      setTScoreC(
        selectedSubmission.teacher_score_c !== null && selectedSubmission.teacher_score_c !== undefined
          ? selectedSubmission.teacher_score_c
          : selectedSubmission.ai_score_c ?? 0
      );
      setTFeedback(selectedSubmission.teacher_feedback || '');
    }
  }, [selectedSubmission]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassCode.trim()) return;

    const { error } = await supabase.from('classes').insert([
      {
        class_name: newClassName.trim(),
        join_code: newClassCode.trim().toUpperCase(),
        teacher_email: teacherEmail.trim().toLowerCase(),
      },
    ]);

    if (!error) {
      setShowNewClassModal(false);
      setNewClassName('');
      setNewClassCode('');
      loadTeacherClasses();
    } else {
      alert('Error creating class: ' + error.message);
    }
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;

    if (tScoreA < 0 || tScoreA > 12 || tScoreB < 0 || tScoreB > 12 || tScoreC < 0 || tScoreC > 6) {
      alert('Scores exceed bounds: Criterion A (0-12), Criterion B (0-12), Criterion C (0-6).');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('submissions')
      .update({
        teacher_score_a: Number(tScoreA),
        teacher_score_b: Number(tScoreB),
        teacher_score_c: Number(tScoreC),
        teacher_feedback: tFeedback,
        is_finalized: true,
      })
      .eq('id', selectedSubmission.id);

    setIsSaving(false);

    if (!error) {
      alert('✓ Evaluation and feedback finalized! The student can now view this in their portfolio.');
      setSelectedSubmission({
        ...selectedSubmission,
        teacher_score_a: Number(tScoreA),
        teacher_score_b: Number(tScoreB),
        teacher_score_c: Number(tScoreC),
        teacher_feedback: tFeedback,
        is_finalized: true,
      });
      loadSubmissions();
    } else {
      alert('Error saving grade: ' + error.message);
    }
  };

  const aiTotal =
    (selectedSubmission?.ai_score_a || 0) +
    (selectedSubmission?.ai_score_b || 0) +
    (selectedSubmission?.ai_score_c || 0);

  const teacherTotal = Number(tScoreA) + Number(tScoreB) + Number(tScoreC);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-neutral-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="font-serif font-black text-2xl text-neutral-900 tracking-tight">IBscribe</div>
          <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-100">
            Teacher Assessment & Moderation Desk
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs bg-neutral-100 px-3 py-1.5 rounded-lg border">
            <span className="text-neutral-500">Teacher:</span>
            <input
              type="email"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              className="bg-transparent font-medium text-neutral-800 focus:outline-none w-44 font-mono text-xs"
              placeholder="fatih@school.edu"
            />
          </div>

          <button
            onClick={() => setShowNewClassModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition shadow-sm"
          >
            + Create New Class
          </button>

          <button
            onClick={loadSubmissions}
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold px-3 py-2 rounded-lg transition border"
          >
            🔄 Refresh
          </button>

          <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-900 underline">
            ← Student Exam View
          </Link>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left: Class Selection & Candidate Submissions */}
        <section className="w-5/12 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Class Filter</span>
              <span className="text-xs text-neutral-400 font-mono">Total Papers: {submissions.length}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedClassCode('ALL')}
                className={`text-xs px-3 py-1 rounded-md font-semibold transition ${
                  selectedClassCode === 'ALL'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-600 border hover:bg-neutral-100'
                }`}
              >
                All Classes
              </button>
              {classes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClassCode(c.join_code)}
                  className={`text-xs px-3 py-1 rounded-md font-semibold font-mono transition ${
                    selectedClassCode === c.join_code
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white text-neutral-600 border hover:bg-neutral-100'
                  }`}
                >
                  {c.class_name} ({c.join_code})
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {submissions.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 text-sm">
                No submissions found.
              </div>
            ) : (
              submissions.map((sub) => {
                const isSelected = selectedSubmission?.id === sub.id;
                const totalScore = sub.is_finalized
                  ? (sub.teacher_score_a || 0) + (sub.teacher_score_b || 0) + (sub.teacher_score_c || 0)
                  : (sub.ai_score_a || 0) + (sub.ai_score_b || 0) + (sub.ai_score_c || 0);

                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubmission(sub)}
                    className={`p-4 cursor-pointer transition flex items-center justify-between hover:bg-neutral-50 ${
                      isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-neutral-900">{sub.student_name}</span>
                        <span className="text-[10px] font-mono bg-neutral-100 px-2 py-0.5 rounded border">
                          {sub.class_code}
                        </span>
                        {sub.is_finalized ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                            ✓ Teacher Graded
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                            AI Draft ({sub.ai_score_a ?? 0}+{sub.ai_score_b ?? 0}+{sub.ai_score_c ?? 0})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500">
                        <span>{sub.chosen_text_type}</span> • <span>{sub.word_count} words</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-indigo-700">{totalScore}/30</div>
                      <div className="text-[10px] text-neutral-400">
                        {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right: Paper Grading Desk */}
        <section className="w-7/12 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
          {selectedSubmission ? (
            <div className="flex-1 flex flex-col overflow-y-auto p-8 space-y-6">
              {/* Paper Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-neutral-900">
                    {selectedSubmission.student_name}
                  </h2>
                  <div className="flex items-center space-x-3 mt-1 text-xs text-neutral-500">
                    <span>Class: <strong className="font-mono">{selectedSubmission.class_code}</strong></span>
                    <span>•</span>
                    <span>Format: <strong>{selectedSubmission.chosen_text_type}</strong></span>
                    <span>•</span>
                    <span>Words: <strong>{selectedSubmission.word_count}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="bg-neutral-100 border border-neutral-200 px-3.5 py-2 rounded-xl text-center">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">AI Suggested</div>
                    <div className="text-lg font-mono font-bold text-neutral-700">{aiTotal} / 30</div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl text-center">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">
                      {selectedSubmission.is_finalized ? 'Final Teacher Mark' : 'Teacher Draft'}
                    </div>
                    <div className="text-xl font-black font-mono text-indigo-950">{teacherTotal} / 30</div>
                  </div>
                </div>
              </div>

              {/* 1. AI Criteria Breakdown & Diagnostic Feedback */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">✨</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      AI Rubric Diagnostic (Individual Criteria Breakdown)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                    Total: {aiTotal} / 30
                  </span>
                </div>

                {/* AI Criteria Badges */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-center">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Criterion A (Language)</div>
                    <div className="text-lg font-black font-mono text-neutral-800 mt-0.5">
                      {selectedSubmission.ai_score_a ?? 0} <span className="text-xs font-normal text-neutral-400">/ 12</span>
                    </div>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-center">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Criterion B (Message)</div>
                    <div className="text-lg font-black font-mono text-neutral-800 mt-0.5">
                      {selectedSubmission.ai_score_b ?? 0} <span className="text-xs font-normal text-neutral-400">/ 12</span>
                    </div>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-center">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Criterion C (Conventions)</div>
                    <div className="text-lg font-black font-mono text-neutral-800 mt-0.5">
                      {selectedSubmission.ai_score_c ?? 0} <span className="text-xs font-normal text-neutral-400">/ 6</span>
                    </div>
                  </div>
                </div>

                {/* AI Diagnostic Explanation */}
                <div className="bg-white/90 rounded-lg p-3.5 border border-amber-200/80 text-xs font-sans text-neutral-800 whitespace-pre-line leading-relaxed">
                  {selectedSubmission.ai_feedback || 'No diagnostic notes available.'}
                </div>
              </div>

              {/* 2. Teacher Final Mark & Feedback Controls */}
              <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Official Teacher Evaluation & Moderation
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-700">
                    Candidate Mark: {teacherTotal} / 30
                  </span>
                </div>

                {/* Rubric Inputs */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-neutral-300 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-neutral-700">Criterion A</span>
                      <span className="text-neutral-400 font-mono">max 12</span>
                    </div>
                    <div className="text-[10px] text-neutral-500">Grammar & Lexis</div>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={tScoreA}
                      onChange={(e) => setTScoreA(Number(e.target.value))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1 text-sm font-mono font-bold text-neutral-900 focus:bg-white"
                    />
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-neutral-300 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-neutral-700">Criterion B</span>
                      <span className="text-neutral-400 font-mono">max 12</span>
                    </div>
                    <div className="text-[10px] text-neutral-500">Message & Ideas</div>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={tScoreB}
                      onChange={(e) => setTScoreB(Number(e.target.value))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1 text-sm font-mono font-bold text-neutral-900 focus:bg-white"
                    />
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-neutral-300 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-neutral-700">Criterion C</span>
                      <span className="text-neutral-400 font-mono">max 6</span>
                    </div>
                    <div className="text-[10px] text-neutral-500">Format & Register</div>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={tScoreC}
                      onChange={(e) => setTScoreC(Number(e.target.value))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1 text-sm font-mono font-bold text-neutral-900 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Teacher Feedback Textarea */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                    Teacher's Official Feedback & Examiner Notes (Published to Student)
                  </label>
                  <textarea
                    rows={3}
                    value={tFeedback}
                    onChange={(e) => setTFeedback(e.target.value)}
                    placeholder="Write detailed remarks for the candidate: highlight strong paragraphs, identify specific language/register lapses..."
                    className="w-full bg-white border border-neutral-300 rounded-lg p-3 text-xs leading-relaxed text-neutral-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveGrade}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg transition shadow flex items-center space-x-2"
                  >
                    <span>{isSaving ? 'Publishing...' : '✓ Finalize & Publish to Candidate Portfolio'}</span>
                  </button>
                </div>
              </div>

              {/* 3. Candidate Paper Response */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Candidate's Written Response
                </span>
                <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200 font-serif text-base leading-relaxed text-neutral-900 whitespace-pre-wrap">
                  {selectedSubmission.content}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-neutral-400 space-y-2">
              <div className="text-4xl">📝</div>
              <div className="font-semibold text-neutral-700">Select an examination paper to review</div>
              <div className="text-xs max-w-xs">
                Candidate text, AI baseline scores, and rubric controls will appear here.
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Sınıf Oluşturma Modalı */}
      {showNewClassModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateClass} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">Create New Class</h3>
            <div>
              <label className="text-xs font-semibold text-neutral-600 block mb-1">Class Name</label>
              <input
                type="text"
                required
                placeholder="e.g. 11-A IBDP English B"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-600 block mb-1">Join Code (For Students)</label>
              <input
                type="text"
                required
                placeholder="e.g. IB-2026"
                value={newClassCode}
                onChange={(e) => setNewClassCode(e.target.value.toUpperCase())}
                className="w-full border rounded-lg p-2.5 text-sm font-mono uppercase"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewClassModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Create Class
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}