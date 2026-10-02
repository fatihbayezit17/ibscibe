'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { StimulusTaskCard } from '@/components/StimulusTaskCard';

interface Stimulus {
  id: string;
  theme: string;
  level: string;
  title: string;
  prompt: string;
  text_options: string[];
  class_id?: string | null;
  deadline?: string | null;
}

interface Submission {
  id: string;
  student_id: string;
  class_id?: string | null;
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
  teacher_highlights?: any[];
  is_read_by_student: boolean | null;
  created_at: string;
  stimuli?: { title: string; theme: string } | null;
}

const EXACT_IB_PAPER1_POOL: Stimulus[] = [
  {
    id: 'ib-p1-1',
    theme: 'Social Organization',
    level: 'SL',
    title: 'Junk Food Consumption Among Peers',
    prompt: 'You have noticed that many of your classmates consume a lot of junk food which affects their health negatively. Write a text in which you explain to your peers the dangers of consuming too much junk food and suggest ways to maintain a balanced diet instead.',
    text_options: ['Email', 'Essay', 'Speech']
  },
  {
    id: 'ib-p1-2',
    theme: 'Sharing the Planet',
    level: 'HL',
    title: 'Global Warming Campaign Competition',
    prompt: 'Your school principal is running a competition for the best campaign to raise awareness about global warming among teenagers. Write your entry for this competition, to be submitted to the principal, in which you describe what the campaign is and why you think it would be effective.',
    text_options: ['Blog', 'Email', 'Proposal']
  },
  {
    id: 'ib-p1-3',
    theme: 'Identities',
    level: 'SL',
    title: 'Experiencing Discrimination',
    prompt: 'You recently had an experience where you felt discriminated against, and you want to express your point of view to others. Write a text in which you describe what happened, and explain why you felt the treatment you received was wrong.',
    text_options: ['Blog', 'Proposal', 'Speech']
  },
  {
    id: 'ib-p1-4',
    theme: 'Experiences',
    level: 'HL',
    title: 'Community Service Overseas',
    prompt: 'You recently spent six months volunteering in a community development project overseas. Write a text in which you describe your daily responsibilities, evaluate the main challenges you faced, and persuade young people to join future international projects.',
    text_options: ['Article', 'Official report', 'Speech']
  },
  {
    id: 'ib-p1-5',
    theme: 'Human Ingenuity',
    level: 'SL',
    title: 'The Impact of Social Media Algorithms',
    prompt: 'Modern social media platforms use advanced algorithms that dictate what teenagers see online. Write a text in which you describe how these algorithms influence daily habits and evaluate whether users have lost control over their digital lives.',
    text_options: ['Opinion column/editorial', 'Essay', 'Blog']
  }
];

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: 'bg-yellow-200 text-yellow-900 border-yellow-400',
  red: 'bg-rose-200 text-rose-900 border-rose-400',
  blue: 'bg-sky-200 text-sky-900 border-sky-400',
  green: 'bg-emerald-200 text-emerald-900 border-emerald-400',
};

export default function StudentPaper1Portal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([]);
  const [enrolledClassIds, setEnrolledClassIds] = useState<string[]>([]);
  const [selectedSubmissionClassId, setSelectedSubmissionClassId] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'write' | 'portfolio'>('write');
  const [level, setLevel] = useState<'SL' | 'HL'>('SL');
  const [selectedTextTypeFilter, setSelectedTextTypeFilter] = useState('All Text Types');
  
  const [allStimuli, setAllStimuli] = useState<Stimulus[]>([]);
  const [teacherAssignedTasks, setTeacherAssignedTasks] = useState<Stimulus[]>([]);
  const [selectedStimulus, setSelectedStimulus] = useState<Stimulus | null>(null);
  
  const [selectedTextType, setSelectedTextType] = useState('');
  const [essayContent, setEssayContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const [selectedPortfolioSub, setSelectedPortfolioSub] = useState<Submission | null>(null);
  const [evaluationModalData, setEvaluationModalData] = useState<any>(null);

  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitContent, setResubmitContent] = useState('');

  const [examPhase, setExamPhase] = useState<'reading' | 'writing' | 'finished'>('reading');
  const [secondsLeft, setSecondsLeft] = useState<number>(300);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    initPortal();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && timerActive) {
      if (examPhase === 'reading') {
        const writingTime = selectedStimulus?.level === 'HL' ? 5400 : 4500;
        setExamPhase('writing');
        setSecondsLeft(writingTime);
      } else if (examPhase === 'writing') {
        setExamPhase('finished');
        setTimerActive(false);
        alert('Exam time is up!');
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, secondsLeft, examPhase, selectedStimulus]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initPortal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setUser(user);

    const defaultName = user.email?.split('@')[0] || 'Student User';
    const { data: prof } = await supabase
      .from('profiles')
      .upsert([{ id: user.id, full_name: defaultName, email: user.email }], { onConflict: 'id' })
      .select()
      .single();

    if (prof) setProfile(prof);
    else setProfile({ id: user.id, full_name: defaultName, email: user.email });

    await checkSchoolMembership(user.id);
    await loadStudentData(user.id);
    setLoading(false);
  };

  const checkSchoolMembership = async (userId: string) => {
    const { data: mem } = await supabase
      .from('school_memberships')
      .select('school_licenses(school_name)')
      .eq('user_id', userId)
      .single();

    if (mem && mem.school_licenses) {
      setSchoolName((mem.school_licenses as any).school_name);
    }
  };

  const loadStudentData = async (userId: string) => {
    const { data: memData } = await supabase
      .from('class_members')
      .select('class_id, classes(id, class_name, join_code)')
      .eq('student_id', userId);

    let classIds: string[] = [];
    if (memData && memData.length > 0) {
      const clsList = memData.map((item: any) => item.classes).filter(Boolean);
      setEnrolledClasses(clsList);
      classIds = clsList.map((c: any) => c.id);
      setEnrolledClassIds(classIds);
      if (!selectedSubmissionClassId && clsList.length > 0) {
        setSelectedSubmissionClassId(clsList[0].id);
      }
    } else {
      setEnrolledClasses([]);
      setEnrolledClassIds([]);
    }

    const { data: subData } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: false });

    if (subData) {
      subData.sort((a, b) => {
        const aUnread = (a.teacher_feedback && a.is_read_by_student === false) ? 1 : 0;
        const bUnread = (b.teacher_feedback && b.is_read_by_student === false) ? 1 : 0;
        if (aUnread !== bUnread) return bUnread - aUnread;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setSubmissions(subData);
    }

    const { data: stimData } = await supabase.from('stimuli').select('*');
    const combinedStimuli = [...EXACT_IB_PAPER1_POOL, ...(stimData || [])];
    
    setAllStimuli(combinedStimuli);
    const assigned = combinedStimuli.filter(s => s.class_id && classIds.includes(s.class_id));
    setTeacherAssignedTasks(assigned);

    if (assigned.length > 0) {
      startReadingPhase(assigned[0]);
    } else {
      pickRandomStimulus(combinedStimuli, 'SL', 'All Text Types', classIds);
    }
  };

  const startReadingPhase = (stim: Stimulus) => {
    setSelectedStimulus(stim);
    setSelectedTextType('');
    setEssayContent('');
    setExamPhase('reading');
    setSecondsLeft(300);
    setTimerActive(true);
  };

  const skipReadingTime = () => {
    const writingTime = selectedStimulus?.level === 'HL' ? 5400 : 4500;
    setExamPhase('writing');
    setSecondsLeft(writingTime);
  };

  const pickRandomStimulus = (list: Stimulus[], lvl: string, textTypeFilter: string, classIds: string[]) => {
    const filtered = list.filter(s => {
      if (s.class_id && !classIds.includes(s.class_id)) return false;
      const matchLevel = s.level === lvl;
      const matchType = textTypeFilter === 'All Text Types' || s.text_options?.includes(textTypeFilter);
      return matchLevel && matchType;
    });

    if (filtered.length > 0) {
      const randomIndex = Math.floor(Math.random() * filtered.length);
      startReadingPhase(filtered[randomIndex]);
    } else {
      setSelectedStimulus(null);
      setTimerActive(false);
    }
  };

  const handleShuffleStimulus = () => {
    pickRandomStimulus(allStimuli, level, selectedTextTypeFilter, enrolledClassIds);
  };

  const handleMarkAsRead = async (subId: string) => {
    await supabase.from('submissions').update({ is_read_by_student: true }).eq('id', subId);
    await loadStudentData(user.id);
    if (selectedPortfolioSub?.id === subId) {
      setSelectedPortfolioSub(prev => prev ? { ...prev, is_read_by_student: true } : null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (examPhase === 'reading') {
      alert('Please wait for reading time to finish.');
      return;
    }
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

  const wordCount = essayContent.trim() ? essayContent.trim().split(/\s+/).length : 0;
  const minWords = selectedStimulus?.level === 'HL' ? 450 : 250;
  const maxWords = selectedStimulus?.level === 'HL' ? 600 : 400;
  const isWordCountValid = wordCount >= minWords && wordCount <= maxWords;

  const handleSubmitEssay = async () => {
    if (!selectedStimulus || !selectedTextType || !essayContent.trim()) {
      alert('Please select a stimulus, text type, and complete your essay.');
      return;
    }

    if (enrolledClasses.length > 0 && !selectedSubmissionClassId) {
      alert('Please select which class teacher you want to submit this essay to.');
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
      const scoreA = aiData.scoreA || 6;
      const scoreB = aiData.scoreB || 6;
      const scoreC = aiData.scoreC || 3;
      const feedback = aiData.feedback || 'Evaluated successfully.';

      const targetClassId = selectedSubmissionClassId || enrolledClasses[0]?.id || null;

      const insertPayload: any = {
        student_id: user.id,
        class_id: targetClassId,
        prompt_id: selectedStimulus.id || null,
        chosen_text_type: selectedTextType,
        content: essayContent,
        word_count: wordCount,
        ai_score_a: scoreA,
        ai_score_b: scoreB,
        ai_score_c: scoreC,
        ai_feedback: feedback,
        is_read_by_student: false
      };

      const { error: subErr } = await supabase.from('submissions').insert([insertPayload]);
      if (subErr) throw subErr;

      await loadStudentData(user.id);
      setEvaluationModalData({ scoreA, scoreB, scoreC, feedback, textType: selectedTextType, wordCount, essayContent });
      setEssayContent('');
    } catch (err: any) {
      alert('Error submitting essay: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmitEssay = async () => {
    if (!selectedPortfolioSub || !resubmitContent.trim()) return;
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
      }).eq('id', selectedPortfolioSub.id);

      if (error) throw error;
      alert('Essay successfully updated and resubmitted to your teacher!');
      setIsResubmitting(false);
      await loadStudentData(user.id);
      setSelectedPortfolioSub(null);
    } catch (err: any) {
      alert('Error resubmitting essay: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Paper 1 Environment...</div>;

  const unreadFeedbackCount = submissions.filter(s => s.teacher_feedback && s.is_read_by_student === false).length;
  const all17TextList = ['Speech', 'Essay', 'Blog', 'Proposal', 'Review', 'Article', 'Letter to the editor', 'Diary', 'Brochure/leaflet/pamphlet', 'Official report', 'Set of instructions/guidelines', 'Opinion column/editorial', 'Personal correspondence (email/letter)'];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => router.push('/student')} className="px-3 py-1.5 border text-xs bg-white rounded-xl text-slate-600 font-bold hover:bg-slate-50 shadow-xs cursor-pointer">
              ← Back to Portal
            </button>
            <span className="font-bold text-slate-900">English B Paper 1 Exam Environment</span>
            {schoolName && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                🏫 {schoolName}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => setActiveTab('write')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'write' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Write &amp; Practice</button>
            <button onClick={() => setActiveTab('portfolio')} className={`px-4 py-2 rounded-xl text-sm font-semibold relative transition-all cursor-pointer ${activeTab === 'portfolio' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              My Portfolio ({submissions.length})
              {unreadFeedbackCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-bounce">
                  {unreadFeedbackCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* AI Değerlendirme Sonuç Modalı */}
      {evaluationModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-lg font-black">IBDP Paper 1 Evaluation Results</h3>
              <button onClick={() => setEvaluationModalData(null)} className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold cursor-pointer">Close ✕</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-orange-50 rounded-2xl text-center border border-orange-200">
                <div className="text-[10px] uppercase font-bold text-orange-800">Crit A (Language)</div>
                <div className="text-xl font-black text-orange-900 mt-1">{evaluationModalData.scoreA}/12</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-2xl text-center border border-orange-200">
                <div className="text-[10px] uppercase font-bold text-orange-800">Crit B (Message)</div>
                <div className="text-xl font-black text-orange-900 mt-1">{evaluationModalData.scoreB}/12</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-2xl text-center border border-orange-200">
                <div className="text-[10px] uppercase font-bold text-orange-800">Crit C (Conceptual)</div>
                <div className="text-xl font-black text-orange-900 mt-1">{evaluationModalData.scoreC}/6</div>
              </div>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl text-xs whitespace-pre-line leading-relaxed border border-slate-200">{evaluationModalData.feedback}</div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-semibold text-center">
              ⏳ Teacher Feedback: <b>Awaiting teacher evaluation and grading...</b>
            </div>
            <button onClick={() => { setEvaluationModalData(null); setActiveTab('portfolio'); }} className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl shadow-md cursor-pointer">Go to Portfolio ➔</button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6 print:p-0">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-4 print:hidden">
          <div className="text-xs font-bold text-slate-700">
            Enrolled Classes: {enrolledClasses.length > 0 ? enrolledClasses.map(c => c.class_name).join(', ') : 'None (Using Default Pool)'}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Practice Level:</span>
            <button onClick={() => { setLevel('SL'); pickRandomStimulus(allStimuli, 'SL', selectedTextTypeFilter, enrolledClassIds); }} className={`px-3 py-1.5 text-xs font-bold border rounded-xl transition-all cursor-pointer ${level === 'SL' ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-50 text-slate-700'}`}>SL (250-400)</button>
            <button onClick={() => { setLevel('HL'); pickRandomStimulus(allStimuli, 'HL', selectedTextTypeFilter, enrolledClassIds); }} className={`px-3 py-1.5 text-xs font-bold border rounded-xl transition-all cursor-pointer ${level === 'HL' ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-50 text-slate-700'}`}>HL (450-600)</button>
            <select value={selectedTextTypeFilter} onChange={e => { setSelectedTextTypeFilter(e.target.value); pickRandomStimulus(allStimuli, level, e.target.value, enrolledClassIds); }} className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 font-semibold max-w-xs">
              <option value="All Text Types">All Text Types</option>
              {all17TextList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {activeTab === 'write' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6 print:hidden">
              {teacherAssignedTasks.length > 0 && (
                <div className="p-6 rounded-3xl bg-amber-50 border-2 border-orange-400 space-y-3 shadow-md">
                  <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">🔔 Teacher Assignment</span>
                  {teacherAssignedTasks.map(t => (
                    <div key={t.id} onClick={() => startReadingPhase(t)} className="p-4 bg-white rounded-2xl border border-orange-200 cursor-pointer hover:border-orange-400 transition-all">
                      <h4 className="text-xs font-extrabold text-slate-900">{t.title}</h4>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">{t.prompt}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedStimulus && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 px-1">
                    <span>{selectedStimulus.theme} • {selectedStimulus.level}</span>
                    {!selectedStimulus.class_id && <button onClick={handleShuffleStimulus} className="text-orange-600 underline font-semibold text-xs cursor-pointer">Change Stimulus</button>}
                  </div>
                  <StimulusTaskCard
                    promptText={selectedStimulus.prompt}
                    wordCountMin={selectedStimulus.level === 'HL' ? 450 : 250}
                    wordCountMax={selectedStimulus.level === 'HL' ? 600 : 400}
                    options={selectedStimulus.text_options || ['Article', 'Proposal', 'Review']}
                    selectedOption={selectedTextType}
                    onSelectOption={(opt) => setSelectedTextType(opt)}
                  />
                </div>
              )}
            </div>

            <div className="lg:col-span-7">
              {selectedStimulus ? (
                <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900">Exam Writing Workspace</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {examPhase === 'reading' ? 'Your reading time has started.' : 'Writing time active. You can type or upload your handwritten draft.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`px-4 py-2 rounded-2xl shadow-md text-white flex items-center gap-2.5 transition-all ${
                        examPhase === 'reading' ? 'bg-amber-600' : 'bg-emerald-600'
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-lg">
                          {examPhase === 'reading' ? 'Reading' : 'Writing'}
                        </span>
                        <span className="text-sm font-mono font-black tracking-widest">{formatTime(secondsLeft)}</span>
                      </div>
                      {examPhase === 'reading' && (
                        <button onClick={skipReadingTime} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-sm transition-all whitespace-nowrap cursor-pointer">
                          Skip Reading ➔
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 uppercase">Handwritten Draft Transcription</h5>
                      <p className="text-xs text-slate-500 mt-0.5">Upload a photo of your paper essay to auto-transcribe via Gemini OCR.</p>
                    </div>
                    <label className={`px-4 py-2 text-white font-semibold text-xs rounded-xl shadow-sm transition-all whitespace-nowrap ${examPhase === 'reading' ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 cursor-pointer'}`}>
                      {transcribing ? 'Transcribing Photo...' : 'Upload Essay Photo'}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={transcribing || examPhase === 'reading'} />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 uppercase tracking-wider">Notebook Page</span>
                      <span className={`${isWordCountValid ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}`}>
                        {wordCount} words ({minWords}–{maxWords})
                      </span>
                    </div>

                    <div className="relative border border-slate-300 rounded-3xl bg-amber-50/20 shadow-inner p-3">
                      <textarea
                        rows={18}
                        value={essayContent}
                        disabled={examPhase === 'reading'}
                        onCopy={e => e.preventDefault()}
                        onPaste={e => e.preventDefault()}
                        onChange={e => setEssayContent(e.target.value)}
                        placeholder={examPhase === 'reading' ? 'Reading time active. You can plan or start writing anytime...' : 'Start typing your formal IB Paper 1 response here...'}
                        className={`w-full p-4 bg-transparent text-slate-900 text-sm leading-[2.2rem] placeholder-slate-400 focus:outline-none font-serif resize-y ${examPhase === 'reading' ? 'opacity-70 bg-slate-100/40' : ''}`}
                        style={{
                          backgroundImage: 'linear-gradient(to bottom, transparent 35px, #cbd5e1 35px)',
                          backgroundSize: '100% 36px'
                        }}
                      />
                    </div>
                  </div>

                  {enrolledClasses.length > 0 && (
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <h5 className="text-xs font-bold text-indigo-900 uppercase">Target Classroom / Teacher</h5>
                        <p className="text-[11px] text-indigo-700">Select which enrolled class this submission belongs to.</p>
                      </div>
                      <select
                        value={selectedSubmissionClassId}
                        onChange={e => setSelectedSubmissionClassId(e.target.value)}
                        className="px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none"
                      >
                        {enrolledClasses.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button onClick={handleSubmitEssay} disabled={submitting || !selectedTextType || !essayContent.trim() || examPhase === 'reading'} className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-40 cursor-pointer">
                    {submitting ? 'Evaluating with AI & Submitting...' : 'Submit'}
                  </button>
                </div>
              ) : <div className="p-12 text-center bg-white border rounded-3xl text-slate-400 text-xs">No task selected.</div>}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-extrabold print:hidden">My Writing Submissions &amp; Feedback Portfolio</h3>
            {submissions.length === 0 ? <div className="p-12 text-center bg-white rounded-2xl border text-slate-500 text-sm">You have not submitted any essays yet.</div> : (
              
              /* GÜNCELLENEN KISIM: Sol liste dar (col-span-4), sağ detay alanı geniş (col-span-8) */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className={`space-y-3 ${selectedPortfolioSub ? 'lg:col-span-4' : 'lg:col-span-12'} print:hidden`}>
                  {submissions.map(sub => {
                    const totalAi = (sub.ai_score_a || 0) + (sub.ai_score_b || 0) + (sub.ai_score_c || 0);
                    const showNotif = sub.teacher_feedback && sub.is_read_by_student === false;
                    return (
                      <div key={sub.id} onClick={() => { setSelectedPortfolioSub(sub); setIsResubmitting(false); if (showNotif) handleMarkAsRead(sub.id); }} className="p-5 border border-slate-200 rounded-2xl bg-white cursor-pointer relative shadow-xs hover:border-slate-300 transition-all">
                        {showNotif && <span className="absolute top-3 right-3 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full animate-bounce">New Feedback!</span>}
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full border border-orange-200">{sub.chosen_text_type}</span>
                        <h4 className="text-xs font-bold text-slate-900 mt-2">{sub.word_count} words • AI Score: {totalAi}/30</h4>
                        {sub.criterion_a_score !== null && (
                          <span className="text-[11px] font-bold text-emerald-700 block mt-1">✓ Teacher Graded: {(sub.criterion_a_score || 0) + (sub.criterion_b_score || 0) + (sub.criterion_c_score || 0)}/30</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedPortfolioSub && (
                  <div className="lg:col-span-8 bg-white border border-slate-200 p-8 rounded-3xl space-y-6 shadow-xl print:shadow-none print:w-full">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4 print:hidden">
                      <h3 className="font-bold text-sm text-slate-900">{selectedPortfolioSub.chosen_text_type}</h3>
                      <div className="flex gap-2">
                        {!isResubmitting && (
                          <button onClick={() => { setIsResubmitting(true); setResubmitContent(selectedPortfolioSub.content); }} className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold cursor-pointer">
                            Revise &amp; Resubmit ➔
                          </button>
                        )}
                        <button onClick={() => window.print()} className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer">Print PDF</button>
                        <button onClick={() => { setSelectedPortfolioSub(null); setIsResubmitting(false); }} className="px-3.5 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">Close</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200">
                        <span className="block text-[11px] font-black text-orange-800 uppercase tracking-wider mb-1">🤖 AI Assessment</span>
                        <div className="text-xs space-y-0.5 text-slate-700">
                          <div>Crit A (Lang): <b>{selectedPortfolioSub.ai_score_a ?? '-'}/12</b></div>
                          <div>Crit B (Msg): <b>{selectedPortfolioSub.ai_score_b ?? '-'}/12</b></div>
                          <div>Crit C (Concept): <b>{selectedPortfolioSub.ai_score_c ?? '-'}/6</b></div>
                          <div className="pt-1 font-black text-orange-900 border-t border-orange-200 mt-1">Total: {(selectedPortfolioSub.ai_score_a || 0) + (selectedPortfolioSub.ai_score_b || 0) + (selectedPortfolioSub.ai_score_c || 0)} / 30</div>
                        </div>
                      </div>

                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                        <span className="block text-[11px] font-black text-emerald-800 uppercase tracking-wider mb-1">👨‍🏫 Teacher Assessment</span>
                        {selectedPortfolioSub.criterion_a_score !== null ? (
                          <div className="text-xs space-y-0.5 text-slate-700">
                            <div>Crit A (Lang): <b>{selectedPortfolioSub.criterion_a_score}/12</b></div>
                            <div>Crit B (Msg): <b>{selectedPortfolioSub.criterion_b_score}/12</b></div>
                            <div>Crit C (Concept): <b>{selectedPortfolioSub.criterion_c_score}/6</b></div>
                            <div className="pt-1 font-black text-emerald-900 border-t border-emerald-200 mt-1">Total: {(selectedPortfolioSub.criterion_a_score || 0) + (selectedPortfolioSub.criterion_b_score || 0) + (selectedPortfolioSub.criterion_c_score || 0)} / 30</div>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-700 font-medium italic mt-2">Awaiting teacher evaluation and grading...</p>
                        )}
                      </div>
                    </div>

                    {selectedPortfolioSub.ai_feedback && (
                      <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl text-xs space-y-1">
                        <b>🤖 AI Analytical Feedback:</b>
                        <p className="whitespace-pre-line text-slate-700 leading-relaxed">{selectedPortfolioSub.ai_feedback}</p>
                      </div>
                    )}

                    {selectedPortfolioSub.teacher_feedback && (
                      <div className="p-5 bg-emerald-500 text-white rounded-2xl shadow-md space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                          <span>🔔 Teacher Feedback &amp; Guidance</span>
                        </div>
                        <p className="text-xs whitespace-pre-line leading-relaxed font-medium">
                          {selectedPortfolioSub.teacher_feedback}
                        </p>
                      </div>
                    )}

                    {selectedPortfolioSub.teacher_highlights && selectedPortfolioSub.teacher_highlights.length > 0 && (
                      <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">🎨 Teacher Color Highlights &amp; Notes</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {selectedPortfolioSub.teacher_highlights.map((h: any, idx: number) => {
                            const badgeStyle = HIGHLIGHT_COLOR_MAP[h.color] || HIGHLIGHT_COLOR_MAP['yellow'];
                            return (
                              <div key={h.id || idx} className={`p-3 rounded-xl border text-xs space-y-1 ${badgeStyle}`}>
                                <div className="font-bold text-[10px] uppercase">#{idx + 1} • {h.category}</div>
                                <p className="italic font-serif bg-white/70 p-1 rounded text-[11px]">"{h.text}"</p>
                                {h.note && <p className="font-semibold text-slate-900 pt-0.5">Note: {h.note}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {isResubmitting ? (
                      <div className="p-6 bg-slate-50 border border-slate-300 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-slate-900 uppercase">Revise Your Essay Manuscript</h4>
                          <button onClick={() => setIsResubmitting(false)} className="text-xs text-rose-600 font-bold cursor-pointer">Cancel</button>
                        </div>
                        <textarea
                          rows={12}
                          value={resubmitContent}
                          onChange={e => setResubmitContent(e.target.value)}
                          className="w-full p-4 bg-white border rounded-xl text-xs font-serif leading-relaxed focus:outline-none"
                        />
                        <button
                          onClick={handleResubmitEssay}
                          disabled={submitting}
                          className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          {submitting ? 'Submitting Revised Version...' : 'Submit Revised Essay to Teacher ➔'}
                        </button>
                      </div>
                    ) : (
                      <div className="p-5 bg-slate-50 rounded-2xl whitespace-pre-line font-serif text-xs leading-relaxed max-h-96 overflow-y-auto border border-slate-200">
                        {selectedPortfolioSub.content}
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