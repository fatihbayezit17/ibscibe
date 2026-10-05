'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Paper2Page() {
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [level, setLevel] = useState<'SL' | 'HL'>('SL');
  
  const [examState, setExamState] = useState<'reading' | 'exam' | 'finished'>('reading');
  const [readingTimeLeft, setReadingTimeLeft] = useState(5 * 60);
  const [examTimeLeft, setExamTimeLeft] = useState(60 * 60);

  // Dinamik Veriler
  const [stimulus, setStimulus] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);

  // Supabase'den Paper 2 verilerini çekme
  useEffect(() => {
    async function fetchPaper2Data() {
      try {
        const { data: stimuliData } = await supabase
          .from('paper2_stimuli')
          .select('*')
          .limit(1)
          .single();

        if (stimuliData) {
          setStimulus(stimuliData);
          const { data: qData } = await supabase
            .from('paper2_questions')
            .select('*')
            .eq('stimulus_id', stimuliData.id)
            .order('question_number', { ascending: true });

          if (qData) setQuestions(qData);
        }
      } catch (err) {
        console.error('Error fetching paper 2 data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPaper2Data();
  }, []);

  // Okuma Süresi Sayacı
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (examState === 'reading' && readingTimeLeft > 0) {
      timer = setInterval(() => setReadingTimeLeft((prev) => prev - 1), 1000);
    } else if (examState === 'reading' && readingTimeLeft === 0) {
      setExamState('exam');
    }
    return () => clearInterval(timer);
  }, [examState, readingTimeLeft]);

  // Sınav Süresi Sayacı
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (examState === 'exam' && examTimeLeft > 0) {
      timer = setInterval(() => setExamTimeLeft((prev) => prev - 1), 1000);
    } else if (examState === 'exam' && examTimeLeft === 0) {
      handleExamSubmit();
    }
    return () => clearInterval(timer);
  }, [examState, examTimeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (qId: string, option: string) => {
    if (examState === 'finished') return;
    setSelectedAnswers({ ...selectedAnswers, [qId]: option });
  };

  // Sınavı Tamamlama ve Sonucu Kaydetme
  const handleExamSubmit = async () => {
    setExamState('finished');
    setShowResults(true);

    // Puan Hesaplama
    let correctCount = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correct_answer) {
        correctCount += 1;
      }
    });
    setScore(correctCount);

    // Sonucu Veritabanına Kaydet (Öğretmen paneli ve My Portfolio için)
    try {
      await supabase.from('student_submissions').insert([
        {
          student_username: 'alitugrul',
          paper_type: 'Paper2',
          score: correctCount,
          total_questions: questions.length,
          details: selectedAnswers,
        },
      ]);
    } catch (err) {
      console.error('Error saving submission:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600 font-medium">Loading Paper 2 Assessment Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Üst Bilgi Barı */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-600 text-white font-bold px-3 py-1.5 rounded-xl text-sm">
              IB
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">IBDP Student Portal</h1>
              <span className="text-xs text-indigo-600 font-medium">Nilüfer Anadolu İmam Hatip Lisesi</span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-end">
            {/* Seviye Seçimi (SL / HL) */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
              <button
                onClick={() => setLevel('SL')}
                className={`px-3 py-1.5 rounded-lg transition ${level === 'SL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}
              >
                English B SL
              </button>
              <button
                onClick={() => setLevel('HL')}
                className={`px-3 py-1.5 rounded-lg transition ${level === 'HL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}
              >
                English B HL
              </button>
            </div>

            {/* Durum ve Sayaç Rozeti + Küçük Skip Butonu */}
            <div className={`px-4 py-2 rounded-xl text-sm font-mono flex items-center gap-3 text-white ${
              examState === 'reading' ? 'bg-amber-600' : examState === 'exam' ? 'bg-slate-900' : 'bg-emerald-600'
            }`}>
              <span>
                {examState === 'reading' && `📖 Reading Time: ${formatTime(readingTimeLeft)}`}
                {examState === 'exam' && `⏳ Exam Time: ${formatTime(examTimeLeft)}`}
                {examState === 'finished' && `✓ Score: ${score} / ${questions.length}`}
              </span>

              {examState === 'reading' && (
                <button
                  onClick={() => setExamState('exam')}
                  className="bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded text-xs font-sans transition"
                  title="Skip Reading Period"
                >
                  Skip →
                </button>
              )}
            </div>

            <Link 
              href="/student" 
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Okuma Süresi Sarı Uyarı Banner'ı */}
      {examState === 'reading' && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-center">
          <p className="text-xs md:text-sm text-amber-800 font-medium">
            ⚠ **Reading Period:** Please read the stimulus text carefully. Questions will unlock automatically when the timer ends, or you can skip using the button above.
          </p>
        </div>
      )}

      {/* Ana İçerik */}
      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <span className="text-xs font-semibold tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">
              Paper 2 • Reading Comprehension ({level} Level)
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              {stimulus?.title || "Reading Assessment"}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sol Taraf: Okuma Metni */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{stimulus?.title}</h3>
                <span className="text-xs text-slate-500">Text Type: <strong className="text-indigo-600">{stimulus?.text_type}</strong></span>
              </div>
              <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-mono">
                {stimulus?.exam_session}
              </span>
            </div>
            
            <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-line text-sm md:text-base">
              {stimulus?.content}
            </div>
          </div>

          {/* Sağ Taraf: Sorular */}
          <div className="lg:col-span-6 space-y-6">
            {questions.map((q, index) => {
              // Sorunun HL mi SL mi olduğunu belirleyen örnek mantık (veya veritabanından gelen alan)
              const questionLevel = index % 2 === 0 ? 'SL' : 'HL';

              return (
                <div 
                  key={q.id} 
                  className={`bg-white rounded-2xl p-6 shadow-sm border transition ${
                    examState === 'reading' ? 'opacity-60 border-slate-200 pointer-events-none' : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="font-semibold text-slate-800">
                      <span className="text-indigo-600 mr-2">Q{index + 1}.</span> {q.question_text}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                      questionLevel === 'HL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {questionLevel}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {q.options.map((opt: string, optIdx: number) => {
                      const optLetter = opt.charAt(0);
                      const isSelected = selectedAnswers[q.id] === optLetter;
                      return (
                        <button
                          key={optIdx}
                          disabled={examState === 'reading' || examState === 'finished'}
                          onClick={() => handleOptionSelect(q.id, optLetter)}
                          className={`w-full text-left p-3 rounded-xl text-sm transition border ${
                            isSelected 
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-medium' 
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sonuç ve Examiner Notu */}
                  {showResults && (
                    <div className={`mt-4 p-4 rounded-xl text-sm ${
                      selectedAnswers[q.id] === q.correct_answer 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}>
                      <p className="font-semibold mb-1">
                        {selectedAnswers[q.id] === q.correct_answer ? '✓ Correct Answer' : `✗ Incorrect (Correct: ${q.correct_answer})`}
                      </p>
                      <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200/60 font-sans">
                        {q.examiner_note}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Gönder Butonu */}
            {examState !== 'finished' && (
              <div className="flex justify-end pt-2">
                <button
                  disabled={examState === 'reading'}
                  onClick={handleExamSubmit}
                  className={`px-6 py-3 font-medium rounded-xl transition shadow-sm ${
                    examState === 'reading' 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  Submit & Check Answers
                </button>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}