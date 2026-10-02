'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ClassObj {
  id: string;
  class_name: string;
  join_code: string;
  teacher_id: string;
}

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
  profiles?: { full_name: string; email: string } | null;
  stimuli?: { title: string; theme: string } | null;
}

interface HighlightItem {
  id: string;
  text: string;
  color: string;
  category: string;
  note: string;
}

const THEMES = ['Sharing the Planet', 'Experiences', 'Identities', 'Social Organization', 'Human Ingenuity'];
const TEXT_TYPES = ['Speech', 'Essay', 'Blog', 'Proposal', 'Review', 'Article', 'Letter to the editor', 'Diary', 'Brochure/leaflet/pamphlet', 'Official report', 'Set of instructions/guidelines'];

const PRESET_TEMPLATES: Record<string, { title: string; prompt: string }> = {
  'Sharing the Planet': { title: 'Water Conservation Crisis', prompt: 'Many local residents are ignoring severe summer drought warnings and wasting water on their gardens. Write a text in which you describe the impact of this water shortage and suggest ways community members can conserve water.' },
  'Experiences': { title: 'The Value of Gap Years', prompt: 'Many students feel pressured to enter university immediately after high school. Write a text in which you describe your perspective on taking a gap year and explain how it fosters personal growth.' },
  'Identities': { title: 'Mental Health in Schools', prompt: 'Academic perfectionism is taking a severe toll on young people. Write a text emphasizing the importance of prioritizing mental health over grades and persuade your peers to support each other.' },
  'Social Organization': { title: 'Public Transportation Reform', prompt: 'Traffic congestion around your district has reached unacceptable levels. Write a text arguing for free public transportation for students and explain how this will benefit the city.' },
  'Human Ingenuity': { title: 'AI in the Classroom', prompt: 'Classrooms are integrating artificial intelligence tools. Write a text discussing how AI should be embraced as a collaborative learning assistant rather than feared.' }
};

const HIGHLIGHT_COLORS = [
  { key: 'yellow', label: 'Vocabulary / Word Choice', bg: 'bg-yellow-200 text-yellow-900 border-yellow-400' },
  { key: 'red', label: 'Grammar & Mechanics', bg: 'bg-rose-200 text-rose-900 border-rose-400' },
  { key: 'blue', label: 'Structure & Format', bg: 'bg-sky-200 text-sky-900 border-sky-400' },
  { key: 'green', label: 'Strong Argument / Good Point', bg: 'bg-emerald-200 text-emerald-900 border-emerald-400' },
];

export default function TeacherPortal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasEESupervisorAccess, setHasEESupervisorAccess] = useState(false);

  const [activeTab, setActiveTab] = useState<'classes' | 'tasks' | 'submissions'>('classes');
  const [classes, setClasses] = useState<ClassObj[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [classMembersMap, setClassMembersMap] = useState<{ [id: string]: any[] }>({});
  
  const [selectedStudentSubmissions, setSelectedStudentSubmissions] = useState<Submission[] | null>(null);
  const [activeStudentName, setActiveStudentName] = useState<string>('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const [assignedTasks, setAssignedTasks] = useState<Stimulus[]>([]);
  const [taskTheme, setTaskTheme] = useState(THEMES[0]);
  const [taskLevel, setTaskLevel] = useState<'SL' | 'HL'>('SL');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPrompt, setTaskPrompt] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [selectedTextTypes, setSelectedTextTypes] = useState<string[]>(['Speech', 'Essay', 'Blog']);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [tScoreA, setTScoreA] = useState<number>(6);
  const [tScoreB, setTScoreB] = useState<number>(6);
  const [tScoreC, setTScoreC] = useState<number>(3);
  const [tFeedback, setTFeedback] = useState('');
  const [grading, setGrading] = useState(false);

  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [activeHighlightColor, setActiveHighlightColor] = useState<string>('yellow');

  useEffect(() => {
    initTeacher();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('teacher-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        () => { loadTeacherData(user.id); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stimuli' },
        () => { loadTeacherData(user.id); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const initTeacher = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setUser(user);

    // Öğretmenin profil bilgilerini çekelim
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setTeacherProfile(prof);

    await checkSchoolMembership(user.id);
    await checkEESupervisorAccess(user.id);
    await loadTeacherData(user.id);
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

  const checkEESupervisorAccess = async (userId: string) => {
    const { count } = await supabase
      .from('extended_essays')
      .select('*', { count: 'exact', head: true })
      .eq('supervisor_id', userId);

    if (count && count > 0) {
      setHasEESupervisorAccess(true);
    }
  };

  const loadTeacherData = async (teacherId: string) => {
    const { data: classData } = await supabase.from('classes').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
    
    let teacherClassIds: string[] = [];
    if (classData) {
      setClasses(classData);
      teacherClassIds = classData.map(c => c.id);
      if (classData.length > 0 && !targetClassId) setTargetClassId(classData[0].id);

      const memMap: { [id: string]: any[] } = {};
      for (const cls of classData) {
        const { data: mems } = await supabase.from('class_members').select('student_id').eq('class_id', cls.id);
        if (mems && mems.length > 0) {
          const sIds = mems.map(m => m.student_id);
          const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', sIds);
          const profMap = new Map((profs || []).map(p => [p.id, p]));
          memMap[cls.id] = sIds.map(id => profMap.get(id) || { id, full_name: `Student (${id.slice(0, 6)})`, email: '' });
        } else {
          memMap[cls.id] = [];
        }
      }
      setClassMembersMap(memMap);
    }

    const { data: stimData } = await supabase.from('stimuli').select('*');
    if (stimData) {
      setAssignedTasks(stimData.filter(s => s.class_id !== null));
    }

    let subData: any[] = [];
    if (teacherClassIds.length > 0) {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .or(`class_id.in.(${teacherClassIds.join(',')}),class_id.is.null`)
        .order('created_at', { ascending: false });
      subData = data || [];
    } else {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });
      subData = data || [];
    }

    if (subData.length > 0) {
      const enhanced = await Promise.all(subData.map(async (sub) => {
        const { data: p } = await supabase.from('profiles').select('full_name, email').eq('id', sub.student_id).single();
        return {
          ...sub,
          profiles: p || { full_name: `Student (${sub.student_id.slice(0, 6)})`, email: '' }
        };
      }));

      enhanced.sort((a, b) => {
        const aPending = a.criterion_a_score === null ? 1 : 0;
        const bPending = b.criterion_a_score === null ? 1 : 0;
        if (aPending !== bPending) return bPending - aPending;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setSubmissions(enhanced);
      if (enhanced.length > 0 && !selectedSub) {
        setSelectedSub(enhanced[0]);
        setTScoreA(enhanced[0].criterion_a_score ?? 6);
        setTScoreB(enhanced[0].criterion_b_score ?? 6);
        setTScoreC(enhanced[0].criterion_c_score ?? 3);
        setTFeedback(enhanced[0].teacher_feedback || '');
        setHighlights(enhanced[0].teacher_highlights || []);
      }
    } else {
      setSubmissions([]);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const generatedJoinCode = 'IB-' + Math.floor(1000 + Math.random() * 9000);
    const { error } = await supabase.from('classes').insert([{ teacher_id: user.id, class_name: newClassName.trim(), join_code: generatedJoinCode }]);
    if (error) {
      alert('Error creating class: ' + error.message);
    } else {
      setNewClassName('');
      await loadTeacherData(user.id);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    await supabase.from('classes').delete().eq('id', classId);
    await loadTeacherData(user.id);
  };

  const handleDeleteSubmission = async (subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bu ödev gönderisini silmek istediğinize emin misiniz?')) return;
    
    const { error } = await supabase.from('submissions').delete().eq('id', subId);
    if (error) {
      alert('Gönderi silinirken hata oluştu: ' + error.message);
    } else {
      if (selectedSub?.id === subId) {
        setSelectedSub(null);
      }
      await loadTeacherData(user.id);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Bu atanan görevi silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('stimuli').delete().eq('id', taskId);
    if (error) {
      alert('Görev silinirken hata oluştu: ' + error.message);
    } else {
      await loadTeacherData(user.id);
    }
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleInspectStudent = (studentId: string, studentName: string) => {
    setActiveStudentName(studentName);
    const studentSubs = submissions.filter(s => s.student_id === studentId);
    setSelectedStudentSubmissions(studentSubs);
  };

  const handleJumpToSubmission = (sub: Submission) => {
    setSelectedStudentSubmissions(null);
    setActiveTab('submissions');
    setSelectedSub(sub);
    setTScoreA(sub.criterion_a_score ?? 6);
    setTScoreB(sub.criterion_b_score ?? 6);
    setTScoreC(sub.criterion_c_score ?? 3);
    setTFeedback(sub.teacher_feedback || '');
    setHighlights(sub.teacher_highlights || []);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskPrompt || !targetClassId) {
      alert('Please fill in all required fields.');
      return;
    }
    const { error } = await supabase.from('stimuli').insert([{
      theme: taskTheme,
      level: taskLevel,
      title: taskTitle,
      prompt: taskPrompt,
      text_options: selectedTextTypes,
      class_id: targetClassId,
      deadline: taskDeadline ? new Date(taskDeadline).toISOString() : null
    }]);

    if (error) {
      alert('Error assigning task: ' + error.message);
    } else {
      alert('Task successfully assigned with deadline!');
      setTaskTitle('');
      setTaskPrompt('');
      setTaskDeadline('');
      await loadTeacherData(user.id);
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSub) return;
    setGrading(true);
    try {
      const { error } = await supabase.from('submissions').update({
        criterion_a_score: tScoreA,
        criterion_b_score: tScoreB,
        criterion_c_score: tScoreC,
        teacher_feedback: tFeedback,
        teacher_highlights: highlights,
        is_read_by_student: false
      }).eq('id', selectedSub.id);

      if (error) throw error;
      alert('Teacher grade, color highlights and feedback successfully sent to student!');
      await loadTeacherData(user.id);
    } catch (err: any) {
      alert('Error saving grade: ' + err.message);
    } finally {
      setGrading(false);
    }
  };

  const handleTextHighlightSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const matchedColorObj = HIGHLIGHT_COLORS.find(c => c.key === activeHighlightColor) || HIGHLIGHT_COLORS[0];
    const newHighlight: HighlightItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: selectedText,
      color: activeHighlightColor,
      category: matchedColorObj.label,
      note: ''
    };

    setHighlights(prev => [...prev, newHighlight]);
    selection.removeAllRanges();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Teacher Portal...</div>;

  const pendingCount = submissions.filter(s => s.criterion_a_score === null).length;
  const teacherDisplayName = teacherProfile?.full_name || user?.email?.split('@')[0] || 'Teacher';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white shadow-sm">T</div>
            <span className="font-bold">Teacher Portal</span>
            {schoolName && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                🏫 {schoolName}
              </span>
            )}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 font-mono border border-orange-200">{user?.email}</span>
          </div>
          <div className="flex space-x-3 items-center">
            <button onClick={() => setActiveTab('classes')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'classes' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Classes ({classes.length})</button>
            <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'tasks' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Assign Tasks</button>
            <button onClick={() => setActiveTab('submissions')} className={`px-4 py-2 rounded-xl text-sm font-semibold relative transition-all cursor-pointer ${activeTab === 'submissions' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              Submissions &amp; Grading ({submissions.length})
              {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">{pendingCount}</span>}
            </button>

            {hasEESupervisorAccess && (
              <button 
                onClick={() => router.push('/teacher/ee')} 
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>EE Supervisor</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">EE</span>
              </button>
            )}

            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth'; }} className="px-3 py-1.5 border text-xs bg-white rounded-lg text-slate-600 hover:text-slate-900 shadow-sm cursor-pointer">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Banner with Real Books Photo Background */}
        <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-200 text-white p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-900">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=2000&q=80" 
              alt="Library and Books" 
              className="w-full h-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-slate-950/80" />
          </div>

          <div className="space-y-2 relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 bg-orange-600/90 text-white rounded-lg font-bold border border-orange-500/40 backdrop-blur-sm">
              Teacher Command Center
            </span>
            {/* Giriş yapan öğretmenin adı dinamik olarak basılır */}
            <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-md">
              Welcome back, {teacherDisplayName}
            </h1>
            <p className="text-xs text-slate-200 max-w-xl drop-shadow">Manage your IBDP classes, assign tasks with deadlines, and evaluate student submissions using AI and color-coded feedback.</p>
          </div>

          <div className="flex items-center gap-3 relative z-10 shrink-0">
            <div className="p-4 bg-slate-900/80 border border-slate-700/60 backdrop-blur-md rounded-2xl text-center shadow-lg min-w-[95px]">
              <span className="text-[10px] font-mono uppercase text-slate-300 block">Classes</span>
              <span className="text-xl font-black text-white inline-block">{classes.length}</span>
            </div>

            <div className="p-4 bg-orange-950/80 border border-orange-500/40 backdrop-blur-md rounded-2xl text-center shadow-lg min-w-[95px]">
              <span className="text-[10px] font-mono uppercase text-orange-200 block">Submissions</span>
              <span className="text-xl font-black text-orange-400 inline-block">{submissions.length}</span>
            </div>

            <div 
              onClick={() => setActiveTab('submissions')}
              className="p-4 bg-amber-950/80 hover:bg-amber-900/80 border border-amber-500/40 backdrop-blur-md rounded-2xl text-center relative cursor-pointer transition-all shadow-lg group min-w-[95px]"
            >
              {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />}
              <span className="text-[10px] font-mono uppercase text-amber-200 font-bold block">Pending</span>
              <span className="text-xl font-black text-amber-400 group-hover:scale-105 transition-transform inline-block">{pendingCount}</span>
            </div>
          </div>
        </div>

        {pendingCount > 0 && activeTab !== 'submissions' && (
          <div onClick={() => setActiveTab('submissions')} className="p-4 rounded-3xl bg-amber-500 text-white font-bold text-xs flex items-center justify-between shadow-md cursor-pointer hover:bg-amber-600 transition-all">
            <span>🔔 You have {pendingCount} new student submission(s) waiting for your review and grading!</span>
            <span className="underline">Click to Grade Now ➔</span>
          </div>
        )}

        {activeTab === 'classes' ? (
          <div className="space-y-6">
            <div className="p-6 bg-white border rounded-3xl space-y-4 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900">Create New Class</h3>
              <form onSubmit={handleCreateClass} className="flex gap-3">
                <input type="text" placeholder="Class Name (e.g. IBDP Year 2 English B)" value={newClassName} onChange={e => setNewClassName(e.target.value)} className="px-4 py-2.5 border rounded-xl text-xs flex-1 bg-slate-50 text-slate-900 focus:outline-none" />
                <button type="submit" className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer">Create Class</button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {classes.map(cls => {
                const members = classMembersMap[cls.id] || [];
                return (
                  <div key={cls.id} className="p-6 bg-white border rounded-3xl space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl">
                        <span className="text-xs font-mono font-bold text-orange-800">Code: {cls.join_code}</span>
                        <button onClick={() => handleCopyCode(cls.join_code, cls.id)} className="text-[10px] font-bold text-orange-600 hover:underline cursor-pointer">{copiedCodeId === cls.id ? 'Copied ✓' : 'Copy Code'}</button>
                      </div>
                      <button onClick={() => handleDeleteClass(cls.id)} className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer">Delete</button>
                    </div>
                    <h4 className="font-extrabold text-base text-slate-900">{cls.class_name}</h4>
                    <div className="pt-3 border-t text-xs space-y-2">
                      <b>Enrolled Students ({members.length}):</b>
                      {members.length === 0 ? (
                        <p className="text-slate-400 italic">No students joined yet.</p>
                      ) : (
                        <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {members.map((st: any) => (
                            <li
                              key={st.id}
                              onClick={() => handleInspectStudent(st.id, st.full_name || st.email)}
                              className="bg-slate-50 hover:bg-orange-50 border border-slate-200 p-2.5 rounded-xl flex justify-between items-center cursor-pointer transition-all"
                            >
                              <span className="font-semibold text-slate-800">{st.full_name || st.email}</span>
                              <span className="text-[10px] text-orange-600 font-bold underline">View Work ➔</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedStudentSubmissions && (
              <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Submissions by: {activeStudentName}
                    </h3>
                    <button
                      onClick={() => setSelectedStudentSubmissions(null)}
                      className="px-3 py-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      Close ✕
                    </button>
                  </div>
                  {selectedStudentSubmissions.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center">This student has not submitted any essays yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedStudentSubmissions.map(sub => {
                        const totalAi = (sub.ai_score_a || 0) + (sub.ai_score_b || 0) + (sub.ai_score_c || 0);
                        return (
                          <div
                            key={sub.id}
                            onClick={() => handleJumpToSubmission(sub)}
                            className="p-4 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-200 cursor-pointer space-y-2 transition-all relative group"
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-orange-700">{sub.chosen_text_type}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600">{sub.word_count} words • AI Score: {totalAi}/30</span>
                                <button
                                  onClick={(e) => handleDeleteSubmission(sub.id, e)}
                                  title="Delete submission"
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <p className="text-xs font-serif text-slate-800 line-clamp-2">{sub.content}</p>
                            <span className="text-[11px] text-orange-600 font-bold underline inline-block">Read &amp; Grade This Essay ➔</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'tasks' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="p-6 bg-white border rounded-3xl space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-slate-900">Assign Task &amp; Stimulus to Class</h3>
                <form onSubmit={handleSaveTask} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Classroom</label>
                    <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 text-slate-900">
                      {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} ({c.join_code})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Theme</label>
                      <select value={taskTheme} onChange={e => {
                        const th = e.target.value;
                        setTaskTheme(th);
                        if (PRESET_TEMPLATES[th]) {
                          setTaskTitle(PRESET_TEMPLATES[th].title);
                          setTaskPrompt(PRESET_TEMPLATES[th].prompt);
                        }
                      }} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50">{THEMES.map(th => <option key={th} value={th}>{th}</option>)}</select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Level</label>
                      <select value={taskLevel} onChange={e => setTaskLevel(e.target.value as any)} className="w-full p-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-orange-700"><option value="SL">Standard Level (SL)</option><option value="HL">Higher Level (HL)</option></select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Task Title</label>
                    <input type="text" placeholder="Task Title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Task Prompt Scenario</label>
                    <textarea rows={4} placeholder="Task Prompt Scenario..." value={taskPrompt} onChange={e => setTaskPrompt(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Deadline Date &amp; Time</label>
                      <input type="datetime-local" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Allowed Text Types</label>
                      <select onChange={e => {
                        const val = e.target.value;
                        if (val && !selectedTextTypes.includes(val)) setSelectedTextTypes([...selectedTextTypes, val]);
                      }} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50">
                        <option value="">+ Add Text Type</option>
                        {TEXT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedTextTypes.map(t => (
                      <span key={t} className="px-2 py-1 bg-orange-50 text-orange-800 rounded-lg text-[10px] font-bold border border-orange-200 flex items-center gap-1">
                        {t} <button type="button" onClick={() => setSelectedTextTypes(selectedTextTypes.filter(x => x !== t))} className="text-rose-600 cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                  <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer">Assign Task with Deadline</button>
                </form>
              </div>

              <div className="p-6 bg-white border rounded-3xl space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-slate-900">📋 Previously Assigned Tasks ({assignedTasks.length})</h3>
                {assignedTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No tasks assigned yet.</p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {assignedTasks.map(task => {
                      const clsObj = classes.find(c => c.id === task.class_id);
                      return (
                        <div key={task.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">{task.theme} ({task.level})</span>
                              {clsObj && <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{clsObj.class_name}</span>}
                            </div>
                            <h4 className="text-xs font-black text-slate-900">{task.title}</h4>
                            <p className="text-[11px] text-slate-600 line-clamp-2">{task.prompt}</p>
                            {task.deadline && (
                              <p className="text-[10px] text-rose-600 font-bold">⏰ Deadline: {new Date(task.deadline).toLocaleString()}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            title="Delete assigned task"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0"
                          >
                            🗑️
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-900">💡 Preset Templates by Theme</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {Object.entries(PRESET_TEMPLATES).map(([theme, tmpl]) => (
                  <div key={theme} onClick={() => { setTaskTheme(theme); setTaskTitle(tmpl.title); setTaskPrompt(tmpl.prompt); }} className="p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl cursor-pointer transition-all space-y-1">
                    <span className="text-[10px] font-bold text-orange-700 uppercase">{theme}</span>
                    <h4 className="text-xs font-extrabold text-slate-900">{tmpl.title}</h4>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{tmpl.prompt}</p>
                    <span className="text-[10px] text-orange-600 font-bold underline inline-block pt-1">Use as Template ➔</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-3 space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
              <h3 className="text-sm font-extrabold text-slate-900 px-1 mb-1">Submissions ({submissions.length})</h3>
              {submissions.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-2xl border text-slate-400 text-xs">No submissions yet for your classes.</div>
              ) : (
                submissions.map(sub => {
                  const isPending = sub.criterion_a_score === null;
                  const isSelected = selectedSub?.id === sub.id;

                  return (
                    <div 
                      key={sub.id} 
                      onClick={() => { 
                        setSelectedSub(sub); 
                        setTScoreA(sub.criterion_a_score ?? 6); 
                        setTScoreB(sub.criterion_b_score ?? 6); 
                        setTScoreC(sub.criterion_c_score ?? 3); 
                        setTFeedback(sub.teacher_feedback || ''); 
                        setHighlights(sub.teacher_highlights || []);
                      }} 
                      className={`p-3.5 border rounded-2xl bg-white cursor-pointer relative transition-all ${isSelected ? 'border-orange-600 ring-2 ring-orange-500 shadow-sm bg-orange-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      {isPending ? (
                        <span className="absolute top-2.5 right-8 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      ) : (
                        <span className="absolute top-2.5 right-8 text-xs font-bold text-emerald-600">✓</span>
                      )}

                      <button
                        onClick={(e) => handleDeleteSubmission(sub.id, e)}
                        title="Delete submission"
                        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer z-10"
                      >
                        🗑️
                      </button>

                      <div className="font-bold text-xs text-slate-900 truncate pr-8">{sub.profiles?.full_name || 'Student'}</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 pr-6">
                        <span className="font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">{sub.chosen_text_type}</span>
                        <span>{sub.word_count}w</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-9">
              {selectedSub ? (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  <div className="xl:col-span-7 p-6 bg-white border border-slate-200 rounded-3xl space-y-5 shadow-xl">
                    <div className="flex justify-between items-center border-b pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-black text-base text-slate-900">{selectedSub.profiles?.full_name}</h3>
                          <button
                            onClick={(e) => handleDeleteSubmission(selectedSub.id, e)}
                            title="Delete submission"
                            className="px-2.5 py-1 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>🗑️</span> Delete
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Task Type: <span className="font-bold text-orange-700">{selectedSub.chosen_text_type}</span> • Total Words: <b>{selectedSub.word_count}</b></p>
                      </div>
                      <div className="px-3 py-1.5 bg-orange-50 rounded-2xl border border-orange-200 text-center">
                        <span className="block text-[9px] font-bold text-orange-800 uppercase">AI Score</span>
                        <span className="text-xs font-black text-slate-900">{(selectedSub.ai_score_a || 0) + (selectedSub.ai_score_b || 0) + (selectedSub.ai_score_c || 0)} / 30</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Highlight Palette (Select text to mark):</span>
                        <span className="text-[10px] text-slate-400 italic">Highlight active color below</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {HIGHLIGHT_COLORS.map(col => (
                          <button
                            key={col.key}
                            type="button"
                            onClick={() => setActiveHighlightColor(col.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${col.bg} ${activeHighlightColor === col.key ? 'ring-2 ring-slate-900 shadow-xs scale-105' : 'opacity-80 hover:opacity-100'}`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-current inline-block" />
                            {col.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                        <span>Student Essay Manuscript</span>
                        <span className="text-[11px] text-orange-600">💡 Tip: Select any text snippet to add a color-coded highlight note.</span>
                      </div>
                      <div 
                        onMouseUp={handleTextHighlightSelection}
                        className="p-6 bg-amber-50/30 border border-slate-300 rounded-2xl font-serif text-sm leading-[2.4rem] text-slate-900 max-h-[450px] overflow-y-auto whitespace-pre-line shadow-inner select-text cursor-text"
                      >
                        {selectedSub.content}
                      </div>
                    </div>

                    {selectedSub.ai_feedback && (
                      <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl text-xs space-y-1">
                        <b>🤖 AI Analytical Feedback:</b>
                        <p className="whitespace-pre-line text-slate-700 leading-relaxed">{selectedSub.ai_feedback}</p>
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-5 p-6 bg-white border border-slate-200 rounded-3xl space-y-5 shadow-xl self-start">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b pb-3">Evaluation &amp; Color Feedback</h4>

                    <div className="space-y-2.5">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Marked Highlights ({highlights.length})</span>
                      {highlights.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200">No highlights added yet. Select text from the essay to attach color feedback.</p>
                      ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {highlights.map((h, idx) => {
                            const colorObj = HIGHLIGHT_COLORS.find(c => c.key === h.color) || HIGHLIGHT_COLORS[0];
                            return (
                              <div key={h.id} className={`p-3 rounded-xl border text-xs space-y-1.5 ${colorObj.bg}`}>
                                <div className="flex items-center justify-between font-bold text-[10px] uppercase">
                                  <span>#{idx + 1} • {h.category}</span>
                                  <button onClick={() => setHighlights(highlights.filter(item => item.id !== h.id))} className="text-rose-700 font-bold cursor-pointer">✕</button>
                                </div>
                                <p className="italic font-serif bg-white/60 p-1.5 rounded text-[11px]">"{h.text}"</p>
                                <input
                                  type="text"
                                  placeholder="Add specific note for this highlight..."
                                  value={h.note}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setHighlights(highlights.map(item => item.id === h.id ? { ...item, note: val } : item));
                                  }}
                                  className="w-full p-2 bg-white/90 border rounded-lg text-xs text-slate-900 focus:outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Crit. A (/12)</label>
                        <input type="number" min="0" max="12" value={tScoreA} onChange={e => setTScoreA(Number(e.target.value))} className="w-full p-2 border rounded-xl text-xs font-bold text-center" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Crit. B (/12)</label>
                        <input type="number" min="0" max="12" value={tScoreB} onChange={e => setTScoreB(Number(e.target.value))} className="w-full p-2 border rounded-xl text-xs font-bold text-center" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Crit. C (/6)</label>
                        <input type="number" min="0" max="6" value={tScoreC} onChange={e => setTScoreC(Number(e.target.value))} className="w-full p-2 border rounded-xl text-xs font-bold text-center" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-700 uppercase">Overall Teacher Guidance &amp; Feedback</label>
                      <textarea 
                        rows={4} 
                        value={tFeedback} 
                        onChange={e => setTFeedback(e.target.value)} 
                        placeholder="Write overall guidance and attach highlight notes..." 
                        className="w-full p-3 border rounded-2xl text-xs bg-slate-50 text-slate-900" 
                      />
                    </div>

                    <button 
                      onClick={handleGradeSubmission} 
                      disabled={grading} 
                      className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {grading ? 'Saving Grade...' : 'Save & Send Grade to Student'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center bg-white border rounded-3xl text-xs text-slate-400">
                  Select a student submission from the left panel to open the wide reading and color-highlighting workspace.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}