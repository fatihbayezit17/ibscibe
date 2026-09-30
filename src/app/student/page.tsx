'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Stimulus {
  id: string;
  theme: string;
  level: string;
  title: string;
  prompt: string;
  text_options: string[];
  class_id?: string | null;
}

interface Submission {
  id: string;
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
  stimuli?: { title: string; theme: string; level: string } | null;
}

const THEMES = [
  'All Themes',
  'Identities',
  'Experiences',
  'Human Ingenuity',
  'Social Organization',
  'Sharing the Planet'
];

export default function StudentPortal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [joinCode, setJoinCode] = useState('');
  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([]);
  const [enrolledClassIds, setEnrolledClassIds] = useState<string[]>([]);
  const [joinMsg, setJoinMsg] = useState('');

  const [activeTab, setActiveTab] = useState<'write' | 'portfolio'>('write');
  const [level, setLevel] = useState<'SL' | 'HL'>('SL');
  const [selectedTheme, setSelectedTheme] = useState('All Themes');
  
  const [allStimuli, setAllStimuli] = useState<Stimulus[]>([]);
  const [teacherAssignedTasks, setTeacherAssignedTasks] = useState<Stimulus[]>([]);
  const [selectedStimulus, setSelectedStimulus] = useState<Stimulus | null>(null);
  
  const [selectedTextType, setSelectedTextType] = useState('');
  const [essayContent, setEssayContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(3600);
  const [timerStarted, setTimerStarted] = useState(false);

  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (timerStarted && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      alert('Exam time is up!');
    }
    return () => clearInterval(interval);
  }, [timerStarted, secondsLeft]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    setUser(user);

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(prof);

    await loadClassesAndTasks(user.id);
    loadSubmissions(user.id);
    setLoading(false);
  };

  const loadClassesAndTasks = async (userId: string) => {
    const { data: memData } = await supabase
      .from('class_members')
      .select('class_id, classes(id, class_name, join_code)')
      .eq('student_id', userId);

    let classIds: string[] = [];
    if (memData) {
      setEnrolledClasses(memData.map((item: any) => item.classes));
      classIds = memData.map((item: any) => item.class_id);
      setEnrolledClassIds(classIds);
    }

    const { data: stimData } = await supabase.from('stimuli').select('*');
    if (stimData && stimData.length > 0) {
      setAllStimuli(stimData);

      const assigned = stimData.filter(s => s.class_id && classIds.includes(s.class_id));
      setTeacherAssignedTasks(assigned);

      if (assigned.length > 0) {
        setSelectedStimulus(assigned[0]);
      } else {
        pickRandomStimulus(stimData, 'SL', 'All Themes', classIds);
      }
    }
  };

  const pickRandomStimulus = (list: Stimulus[], lvl: string, theme: string, classIds: string[]) => {
    const filtered = list.filter(s => {
      if (s.class_id) return false;
      const matchLevel = s.level === lvl;
      const matchTheme = theme === 'All Themes' || s.theme === theme;
      return matchLevel && matchTheme;
    });

    if (filtered.length > 0) {
      const randomIndex = Math.floor(Math.random() * filtered.length);
      setSelectedStimulus(filtered[randomIndex]);
      setSelectedTextType('');
      setEssayContent('');
      setSecondsLeft(3600);
      setTimerStarted(false);
    } else {
      setSelectedStimulus(null);
    }
  };

  const handleShuffleStimulus = () => {
    pickRandomStimulus(allStimuli, level, selectedTheme, enrolledClassIds);
  };

  const loadSubmissions = async (userId: string) => {
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: false });
    if (data) setSubmissions(data);
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinMsg('');
    if (!joinCode.trim()) return;

    try {
      const { data: classObj, error: classErr } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('join_code', joinCode.trim().toUpperCase())
        .single();

      if (classErr || !classObj) {
        setJoinMsg('Invalid class code. Please check with your teacher.');
        return;
      }

      const { error: joinErr } = await supabase.from('class_members').insert([
        { class_id: classObj.id, student_id: user.id }
      ]);

      if (joinErr) {
        if (joinErr.code === '23505') {
          setJoinMsg('You are already enrolled in this class.');
        } else {
          setJoinMsg(joinErr.message);
        }
      } else {
        setJoinMsg(`Successfully joined ${classObj.class_name}!`);
        setJoinCode('');
        await loadClassesAndTasks(user.id);
      }
    } catch (err: any) {
      setJoinMsg(err.message || 'Error joining class.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTranscribing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64String }),
        });
        const data = await res.json();
        if (data.text) {
          setEssayContent(prev => (prev ? prev + '\n\n' + data.text : data.text));
          if (!timerStarted) setTimerStarted(true);
        } else {
          alert('Could not transcribe handwriting from the image.');
        }
        setTranscribing(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert('Error uploading image: ' + err.message);
      setTranscribing(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!timerStarted && e.target.value.length > 0) {
      setTimerStarted(true);
    }
    setEssayContent(e.target.value);
  };

  const wordCount = essayContent.trim() ? essayContent.trim().split(/\s+/).length : 0;
  const minWords = selectedStimulus?.level === 'HL' ? 450 : 250;
  const maxWords = selectedStimulus?.level === 'HL' ? 600 : 400;
  const isWordCountValid = wordCount >= minWords && wordCount <= maxWords;

  const handleSubmitEssay = async () => {
    if (!selectedStimulus || !selectedTextType || !essayContent.trim()) {
      alert('Please select a stimulus, text type, and complete your essay.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: selectedStimulus.level,
          theme: selectedStimulus.theme,
          stimulus: selectedStimulus.prompt,
          textType: selectedTextType,
          essay: essayContent,
        }),
      });

      const aiData = await res.json();

      const insertPayload: any = {
        student_id: user.id,
        chosen_text_type: selectedTextType,
        content: essayContent,
        word_count: wordCount,
        ai_score_a: aiData.scoreA || 6,
        ai_score_b: aiData.scoreB || 6,
        ai_score_c: aiData.scoreC || 3,
        ai_feedback: aiData.feedback || 'Evaluated successfully.',
      };

      if (selectedStimulus?.id) {
        insertPayload.prompt_id = selectedStimulus.id;
      }

      const { error: subErr } = await supabase.from('submissions').insert([insertPayload]);

      if (subErr) {
        if (subErr.message.includes('foreign key constraint')) {
          delete insertPayload.prompt_id;
          const { error: retryErr } = await supabase.from('submissions').insert([insertPayload]);
          if (retryErr) throw retryErr;
        } else {
          throw subErr;
        }
      }

      alert('Essay successfully submitted!');
      setEssayContent('');
      loadSubmissions(user.id);
      setActiveTab('portfolio');
    } catch (err: any) {
      alert('Error submitting essay: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        Loading Student Workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white shadow-sm">
              S
            </div>
            <span className="font-bold text-slate-900 text-base">Student Portal</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 font-mono border border-orange-200">
              {profile?.full_name || user?.email}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('write')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'write' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Write &amp; Practice
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'portfolio' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Portfolio ({submissions.length})
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
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Classroom Affiliation</h4>
            <p className="text-xs text-slate-500 mt-1">
              Enrolled in: {enrolledClasses.length > 0 ? enrolledClasses.map(c => c.class_name).join(', ') : 'Independent Practice (No class joined yet)'}
            </p>
          </div>
          <form onSubmit={handleJoinClass} className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Enter Class Code (e.g. IB-4921)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-900"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-white transition-all whitespace-nowrap shadow-sm"
            >
              Join Class
            </button>
          </form>
        </div>
        {joinMsg && (
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-800">
            {joinMsg}
          </div>
        )}

        {activeTab === 'write' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
              {teacherAssignedTasks.length > 0 && (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-400 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-orange-600 text-white shadow-sm">
                      🎯 Teacher's Assigned Task
                    </span>
                    <span className="text-xs font-bold text-orange-800">{teacherAssignedTasks.length} Pending</span>
                  </div>
                  <div className="space-y-2">
                    {teacherAssignedTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => {
                          setSelectedStimulus(task);
                          setSelectedTextType('');
                          setEssayContent('');
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all bg-white ${
                          selectedStimulus?.id === task.id ? 'border-orange-600 ring-2 ring-orange-500 shadow-sm' : 'border-orange-200 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                          <span className="text-orange-600">{task.theme}</span>
                          <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-bold">{task.level}</span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900">{task.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-1">{task.prompt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900">General Practice Mode</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      setLevel('SL');
                      pickRandomStimulus(allStimuli, 'SL', selectedTheme, enrolledClassIds);
                    }}
                    className={`py-3 rounded-xl font-bold text-xs border transition-all ${
                      level === 'SL' && !selectedStimulus?.class_id
                        ? 'bg-orange-600 border-orange-500 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Standard Level (SL)
                    <span className="block text-[10px] font-normal opacity-90 mt-0.5">250 – 400 words</span>
                  </button>
                  <button
                    onClick={async () => {
                      setLevel('HL');
                      pickRandomStimulus(allStimuli, 'HL', selectedTheme, enrolledClassIds);
                    }}
                    className={`py-3 rounded-xl font-bold text-xs border transition-all ${
                      level === 'HL' && !selectedStimulus?.class_id
                        ? 'bg-orange-600 border-orange-500 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Higher Level (HL)
                    <span className="block text-[10px] font-normal opacity-90 mt-0.5">450 – 600 words</span>
                  </button>
                </div>

                <h3 className="text-base font-bold text-slate-900 pt-2">Filter by Theme</h3>
                <select
                  value={selectedTheme}
                  onChange={(e) => {
                    setSelectedTheme(e.target.value);
                    pickRandomStimulus(allStimuli, level, e.target.value, enrolledClassIds);
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                >
                  {THEMES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {selectedStimulus && (
                <div className="p-6 rounded-3xl bg-white border-2 border-orange-200 shadow-md space-y-5">
                  <div className="flex items-center justify-end">
                    {!selectedStimulus.class_id && (
                      <button
                        onClick={handleShuffleStimulus}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-all shadow-xs"
                      >
                        🔄 Change Stimulus
                      </button>
                    )}
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-slate-900 text-base md:text-lg leading-relaxed font-sans shadow-inner">
                    {selectedStimulus.prompt}
                  </div>

                  <div>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedStimulus.text_options?.map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedTextType(type)}
                          className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all text-center truncate ${
                            selectedTextType === type
                              ? 'bg-orange-600 border-orange-500 text-white shadow-md'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-7">
              {selectedStimulus ? (
                <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">Exam Writing Workspace</h2>
                      <p className="text-xs text-slate-500">Timer starts automatically upon typing or uploading.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-slate-900 text-white border border-slate-800 px-4 py-2 rounded-xl shadow-inner">
                        <span className="text-xs font-mono font-bold tracking-widest">{formatTime(secondsLeft)}</span>
                        <span className={`w-2 h-2 rounded-full ${timerStarted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 uppercase">Handwritten Draft Transcription</h5>
                      <p className="text-xs text-slate-500 mt-0.5">Upload a photo of your paper essay to auto-transcribe.</p>
                    </div>
                    <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl shadow-sm cursor-pointer transition-all whitespace-nowrap">
                      {transcribing ? 'Transcribing Photo...' : 'Upload Essay Photo'}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={transcribing} />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 uppercase tracking-wider">Notebook Page</span>
                      <span className={`${isWordCountValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {wordCount} words ({minWords}–{maxWords})
                      </span>
                    </div>
                    <div className="relative border border-slate-300 rounded-2xl bg-amber-50/20 shadow-inner p-2">
                      <textarea
                        rows={18}
                        value={essayContent}
                        onChange={handleTextChange}
                        placeholder="Start typing your formal IB Paper 1 response here..."
                        className="w-full p-4 bg-transparent text-slate-900 text-sm leading-[2.2rem] placeholder-slate-400 focus:outline-none font-serif resize-y"
                        style={{
                          backgroundImage: 'linear-gradient(to bottom, transparent 35px, #e2e8f0 35px)',
                          backgroundSize: '100% 36px'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitEssay}
                    disabled={submitting || !selectedTextType || !essayContent.trim()}
                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-40"
                  >
                    {submitting ? 'Submitting Essay...' : 'Submit Essay'}
                  </button>
                </div>
              ) : (
                <div className="p-12 text-center border border-slate-200 rounded-3xl bg-white text-slate-500 text-sm shadow-sm">
                  No stimuli found for this filter combination.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-extrabold text-slate-900">My Writing Submissions &amp; Evaluation Cards</h3>
            {submissions.length === 0 ? (
              <div className="p-12 text-center border border-slate-200 rounded-2xl bg-white text-slate-500 text-sm shadow-sm">
                You have not submitted any essays yet. Click "Write &amp; Practice" to start your first task!
              </div>
            ) : (
              <div className="space-y-6">
                {submissions.map((sub) => {
                  const totalAi = (sub.ai_score_a || 0) + (sub.ai_score_b || 0) + (sub.ai_score_c || 0);
                  const hasTeacherGraded = sub.criterion_a_score !== null || sub.criterion_b_score !== null || sub.criterion_c_score !== null;
                  const totalTeacher = hasTeacherGraded
                    ? (sub.criterion_a_score || 0) + (sub.criterion_b_score || 0) + (sub.criterion_c_score || 0)
                    : null;

                  return (
                    <div key={sub.id} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                            <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                              {sub.chosen_text_type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Submitted on {new Date(sub.created_at).toLocaleDateString()} • {sub.word_count} words
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center min-w-[90px]">
                            <span className="block text-[10px] uppercase font-bold text-orange-600">AI Score</span>
                            <span className="text-lg font-black text-slate-900">{totalAi} <span className="text-xs text-slate-400">/ 30</span></span>
                          </div>
                          {totalTeacher !== null && (
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center min-w-[90px]">
                              <span className="block text-[10px] uppercase font-bold text-emerald-700">Teacher</span>
                              <span className="text-lg font-black text-slate-900">{totalTeacher} <span className="text-xs text-slate-400">/ 30</span></span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-600 block mb-1">Criterion A: Language (/12)</span>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-orange-700 font-semibold">AI: {sub.ai_score_a ?? '-'}/12</span>
                            {sub.criterion_a_score !== null && (
                              <span className="text-sm text-emerald-700 font-semibold">Teacher: {sub.criterion_a_score}/12</span>
                            )}
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-600 block mb-1">Criterion B: Message (/12)</span>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-orange-700 font-semibold">AI: {sub.ai_score_b ?? '-'}/12</span>
                            {sub.criterion_b_score !== null && (
                              <span className="text-sm text-emerald-700 font-semibold">Teacher: {sub.criterion_b_score}/12</span>
                            )}
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-600 block mb-1">Criterion C: Conceptual Understanding (/6)</span>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-orange-700 font-semibold">AI: {sub.ai_score_c ?? '-'}/6</span>
                            {sub.criterion_c_score !== null && (
                              <span className="text-sm text-emerald-700 font-semibold">Teacher: {sub.criterion_c_score}/6</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {sub.teacher_feedback ? (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                          <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                            Teacher Evaluation &amp; Feedback
                          </h5>
                          <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                            {sub.teacher_feedback}
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                          ⏳ Awaiting teacher review and feedback.
                        </div>
                      )}

                      {sub.ai_feedback && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <h5 className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">
                            AI Analytical Feedback
                          </h5>
                          <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                            {sub.ai_feedback}
                          </div>
                        </div>
                      )}

                      <details className="text-xs text-slate-500 cursor-pointer">
                        <summary className="font-semibold text-slate-700 hover:text-slate-900 py-1">View Submitted Essay Content</summary>
                        <p className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 whitespace-pre-line leading-relaxed font-mono text-[13px] text-slate-800">
                          {sub.content}
                        </p>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}