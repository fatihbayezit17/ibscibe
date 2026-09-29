'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface PastPaper {
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

export default function StudentExamPage() {
  // Navigation / Mode
  const [viewMode, setViewMode] = useState<'lobby' | 'exam' | 'portfolio'>('lobby');

  // Candidate Details
  const [candidateName, setCandidateName] = useState('');
  const [classCode, setClassCode] = useState('');

  // Exam Stimulus & Text Types
  const stimulusPrompt =
    'Your school is organizing an international cultural exchange week. Write a text to encourage student participation, detailing the benefits and suggesting specific activities they can join.';
  const availableTextTypes = ['Article', 'Speech', 'Official Letter'];
  const [selectedTextType, setSelectedTextType] = useState('Article');

  // Exam Editor State
  const [writtenText, setWrittenText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(75 * 60); // 75 mins standard Paper 1
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OCR state
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission Result Modal
  const [submissionResult, setSubmissionResult] = useState<{
    scoreA: number;
    scoreB: number;
    scoreC: number;
    feedback: string;
  } | null>(null);

  // Portfolio State
  const [pastPapers, setPastPapers] = useState<PastPaper[]>([]);
  const [loadingPastPapers, setLoadingPastPapers] = useState(false);

  // Word Counter & Paste Prevention
  useEffect(() => {
    const words = writtenText.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  }, [writtenText]);

  // Exam Timer
  useEffect(() => {
    if (viewMode !== 'exam') return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert('Exam time is up! Auto-submitting response.');
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [viewMode, writtenText]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Start Exam
  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !classCode.trim()) {
      alert('Please provide your name and class code.');
      return;
    }
    setViewMode('exam');
  };

  // Fetch Past Papers for Portfolio
  const loadPortfolio = async () => {
    if (!candidateName.trim()) {
      alert('Please enter your name first to retrieve your past papers.');
      return;
    }
    setLoadingPastPapers(true);
    setViewMode('portfolio');

    let query = supabase
      .from('submissions')
      .select('*')
      .ilike('student_name', candidateName.trim())
      .order('created_at', { ascending: false });

    if (classCode.trim()) {
      query = query.eq('class_code', classCode.trim().toUpperCase());
    }

    const { data, error } = await query;
    if (!error && data) {
      setPastPapers(data as PastPaper[]);
    }
    setLoadingPastPapers(false);
  };

  // OCR Upload Action
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.text) {
        setWrittenText((prev) => (prev ? prev + '\n\n' + data.text : data.text));
      } else {
        alert(data.error || 'Failed to extract handwriting.');
      }
    } catch (err: any) {
      alert('OCR error: ' + err.message);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submit Exam
  const handleSubmit = async () => {
    if (!writtenText.trim()) {
      alert('Please write or scan your response before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Call AI Rubric Evaluation Service
      const evalRes = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentText: writtenText,
          chosenTextType: selectedTextType,
          promptText: stimulusPrompt,
        }),
      });

      const evalData = await evalRes.json();
      const scoreA = evalData.scoreA ?? 0;
      const scoreB = evalData.scoreB ?? 0;
      const scoreC = evalData.scoreC ?? 0;
      const feedback = evalData.feedback || '';

      // 2. Save directly to Supabase
      const { error: dbError } = await supabase.from('submissions').insert([
        {
          student_name: candidateName.trim(),
          class_code: classCode.trim().toUpperCase(),
          chosen_text_type: selectedTextType,
          content: writtenText,
          word_count: wordCount,
          ai_score_a: scoreA,
          ai_score_b: scoreB,
          ai_score_c: scoreC,
          ai_feedback: feedback,
        },
      ]);

      if (dbError) {
        throw new Error(dbError.message);
      }

      setSubmissionResult({
        scoreA,
        scoreB,
        scoreC,
        feedback,
      });
    } catch (err: any) {
      console.error(err);
      alert('Submission error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-neutral-800 flex flex-col font-sans select-none">
      {/* Top Navbar */}
      <header className="bg-white border-b border-neutral-200 px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <span className="font-serif font-black text-2xl text-neutral-900 tracking-tight">IBscribe</span>
          <span className="bg-neutral-100 text-neutral-600 text-xs px-2.5 py-0.5 rounded font-mono uppercase border">
            Paper 1 Examination System
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/teacher"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition"
          >
            Teacher Hub →
          </Link>
        </div>
      </header>

      {/* LOBBY / LOGIN VIEW */}
      {viewMode === 'lobby' && (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-8 max-w-md w-full space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-serif font-bold text-neutral-900">IB DP English B Paper 1</h1>
              <p className="text-xs text-neutral-500">
                Candidate examination portal with timed response environment & verified handwriting OCR.
              </p>
            </div>

            <form onSubmit={handleStartExam} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Full Candidate Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zeynep Yılmaz"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-neutral-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Class / Join Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IB-2026"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  className="w-full border border-neutral-300 rounded-lg p-3 text-sm font-mono uppercase focus:ring-2 focus:ring-neutral-800 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-3 rounded-lg text-sm shadow transition"
              >
                Begin Examination (75 mins)
              </button>
            </form>

            <div className="border-t pt-4 text-center">
              <button
                type="button"
                onClick={loadPortfolio}
                className="text-xs text-neutral-600 hover:text-neutral-900 font-semibold underline"
              >
                📂 View Past Submissions & Portfolio
              </button>
            </div>
          </div>
        </main>
      )}

      {/* PORTFOLIO / PAST PAPERS VIEW */}
      {viewMode === 'portfolio' && (
        <main className="flex-1 max-w-4xl mx-auto w-full p-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-2xl font-serif font-bold text-neutral-900">
                Past Submissions: {candidateName || 'Candidate'}
              </h2>
              <p className="text-xs text-neutral-500 mt-1">Review your submitted examination papers, AI feedback, and official teacher evaluations.</p>
            </div>
            <button
              onClick={() => setViewMode('lobby')}
              className="text-xs font-semibold bg-neutral-900 text-white px-4 py-2 rounded-lg"
            >
              ← Back to Examination Lobby
            </button>
          </div>

          {loadingPastPapers ? (
            <div className="text-center py-12 text-sm text-neutral-400">Loading your candidate portfolio...</div>
          ) : pastPapers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
              <div className="text-3xl mb-2">📭</div>
              <div className="font-semibold text-neutral-700">No past papers found</div>
              <div className="text-xs text-neutral-400 mt-1">Make sure candidate name matches your submitted papers.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {pastPapers.map((paper) => {
                const totalScore = paper.is_finalized
                  ? (paper.teacher_score_a || 0) + (paper.teacher_score_b || 0) + (paper.teacher_score_c || 0)
                  : (paper.ai_score_a || 0) + (paper.ai_score_b || 0) + (paper.ai_score_c || 0);

                return (
                  <div key={paper.id} className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-neutral-900 text-base">{paper.chosen_text_type}</span>
                          <span className="text-[10px] font-mono bg-neutral-100 px-2 py-0.5 rounded border">
                            {paper.class_code}
                          </span>
                          {paper.is_finalized ? (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                              ✓ Graded by Teacher
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-200">
                              ⏳ Pending Teacher Review
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1">
                          Submitted on {new Date(paper.created_at).toLocaleDateString()} at {new Date(paper.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {paper.word_count} words
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold font-mono text-indigo-700">{totalScore} / 30</div>
                        <div className="text-[10px] text-neutral-400">Total Marks</div>
                      </div>
                    </div>

                    {/* Teacher Remarks if finalized */}
                    {paper.teacher_feedback && (
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900">
                        <strong className="block mb-1">👩‍🏫 Teacher's Evaluation & Feedback:</strong>
                        <p className="whitespace-pre-line">{paper.teacher_feedback}</p>
                      </div>
                    )}

                    {/* Paper text snippet */}
                    <div className="bg-neutral-50 p-4 rounded-lg border text-xs font-serif text-neutral-800 line-clamp-3">
                      {paper.content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* EXAM VIEW */}
      {viewMode === 'exam' && (
        <main className="flex-1 flex overflow-hidden p-6 gap-6">
          {/* Left Panel: Prompt & Rules */}
          <section className="w-5/12 bg-white rounded-xl border border-neutral-200 p-6 flex flex-col justify-between shadow-sm">
            <div className="space-y-6 overflow-y-auto">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Stimulus Task</span>
                <div className="mt-2 p-4 bg-amber-50/60 border border-amber-200 rounded-lg text-sm font-serif leading-relaxed text-amber-950">
                  {stimulusPrompt}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  Select Text Type
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableTextTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTextType(t)}
                      className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold border transition ${
                        selectedTextType === t
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Handwriting Upload OCR */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700">📷 Upload Handwritten Paper</span>
                  <span className="text-[10px] text-neutral-400">Gemini Vision OCR</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isScanning}
                  className="text-xs text-neutral-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-white hover:file:bg-neutral-700"
                />
                {isScanning && <div className="text-xs text-indigo-600 font-semibold animate-pulse">Transcribing handwriting...</div>}
              </div>
            </div>

            {/* Candidate & Timer Footer */}
            <div className="border-t pt-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-neutral-800">{candidateName}</div>
                <div className="text-[10px] font-mono text-neutral-400">{classCode}</div>
              </div>
              <div className="font-mono text-xl font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                ⏱ {formatTimer(timeLeftSeconds)}
              </div>
            </div>
          </section>

          {/* Right Panel: Exam Writing Canvas */}
          <section className="w-7/12 bg-white rounded-xl border border-neutral-200 p-6 flex flex-col shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Examination Canvas ({selectedTextType})
              </span>
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs text-neutral-500">
                  Words: <strong className="text-neutral-800">{wordCount}</strong> / 250–400
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-sm"
                >
                  {isSubmitting ? 'Evaluating with AI...' : 'Submit to Teacher'}
                </button>
              </div>
            </div>

            <textarea
              value={writtenText}
              onChange={(e) => setWrittenText(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                alert('Copy-pasting is restricted during the IB Paper 1 examination session.');
              }}
              placeholder="Begin writing your authentic examination response here..."
              className="flex-1 w-full p-4 font-serif text-base leading-relaxed text-neutral-900 border-none focus:outline-none resize-none select-text"
            />
          </section>
        </main>
      )}

      {/* Submission Success & Rubric Report Modal */}
      {submissionResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Submitted Successfully!</span>
                <h3 className="text-xl font-bold font-serif text-neutral-900 mt-0.5">Instant IB Rubric Report</h3>
              </div>
              <div className="text-2xl font-black font-mono text-indigo-700">
                {submissionResult.scoreA + submissionResult.scoreB + submissionResult.scoreC} / 30
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-neutral-50 p-3 rounded-lg border">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Criterion A</span>
                <div className="text-lg font-bold font-mono text-neutral-800">{submissionResult.scoreA}/12</div>
                <span className="text-[10px] text-neutral-500">Language</span>
              </div>
              <div className="bg-neutral-50 p-3 rounded-lg border">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Criterion B</span>
                <div className="text-lg font-bold font-mono text-neutral-800">{submissionResult.scoreB}/12</div>
                <span className="text-[10px] text-neutral-500">Message</span>
              </div>
              <div className="bg-neutral-50 p-3 rounded-lg border">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Criterion C</span>
                <div className="text-lg font-bold font-mono text-neutral-800">{submissionResult.scoreC}/6</div>
                <span className="text-[10px] text-neutral-500">Conventions</span>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 max-h-44 overflow-y-auto">
              <div className="text-xs font-bold uppercase text-amber-900 mb-1">✨ Examiner Feedback</div>
              <p className="text-xs text-amber-950 whitespace-pre-line leading-relaxed font-sans">
                {submissionResult.feedback}
              </p>
            </div>

            <button
              onClick={() => {
                setSubmissionResult(null);
                setWrittenText('');
                setViewMode('lobby');
              }}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-2.5 rounded-lg text-sm"
            >
              Return to Lobby / New Exam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}