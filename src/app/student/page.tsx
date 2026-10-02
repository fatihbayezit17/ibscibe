'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface StudentDashboardData {
  profile: any;
  schoolName: string | null;
  enrolledClasses: any[];
  hasEEAccess: boolean;
  unreadCount: number;
  totalSubmissions: number;
  latestSubmissionWithFeedback: any | null;
  assignedTasks: any[];
  unreadTasksCount: number;
}

export default function StudentDashboardPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentDashboardData>({
    profile: null,
    schoolName: null,
    enrolledClasses: [],
    hasEEAccess: false,
    unreadCount: 0,
    totalSubmissions: 0,
    latestSubmissionWithFeedback: null,
    assignedTasks: [],
    unreadTasksCount: 0
  });

  const [joinCode, setJoinCode] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);

  useEffect(() => {
    initDashboard();
  }, []);

  useEffect(() => {
    if (!data.profile?.id) return;

    const channel = supabase
      .channel('student-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `student_id=eq.${data.profile.id}` },
        () => { initDashboard(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stimuli' },
        () => { initDashboard(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data.profile?.id]);

  const initDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    const defaultName = user.email?.split('@')[0] || 'Student User';
    
    const { data: prof } = await supabase
      .from('profiles')
      .update({ full_name: defaultName, email: user.email })
      .eq('id', user.id)
      .select()
      .single();

    let profileData = prof;
    if (!profileData) {
      const { data: newProf } = await supabase
        .from('profiles')
        .insert([{ id: user.id, full_name: defaultName, email: user.email, role: 'student' }])
        .select()
        .single();
      profileData = newProf;
    }

    let sName = null;
    const { data: mem } = await supabase
      .from('school_memberships')
      .select('school_licenses(school_name)')
      .eq('user_id', user.id)
      .single();
    if (mem && mem.school_licenses) {
      sName = (mem.school_licenses as any).school_name;
    }

    let eeAccess = false;
    const { data: eeData } = await supabase
      .from('extended_essays')
      .select('id')
      .eq('student_id', user.id)
      .maybeSingle();
    if (eeData) eeAccess = true;

    const { data: classMem } = await supabase
      .from('class_members')
      .select('classes(id, class_name, join_code)')
      .eq('student_id', user.id);
    const clsList = (classMem || []).map((item: any) => item.classes).filter(Boolean);
    const classIds = clsList.map(c => c.id);

    const { data: subs } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    const unreadSubs = (subs || []).filter(s => s.teacher_feedback && s.is_read_by_student === false);
    const latestWithFeedback = (subs || []).find(s => s.teacher_feedback) || null;

    let tasksList: any[] = [];
    if (classIds.length > 0) {
      const { data: tData } = await supabase
        .from('stimuli')
        .select('*')
        .in('class_id', classIds)
        .order('id', { ascending: false });
      tasksList = tData || [];
    }

    const readTaskIds = JSON.parse(localStorage.getItem('read_task_ids_sevval') || '[]');
    const unreadTasks = tasksList.filter(t => !readTaskIds.includes(t.id));

    setData({
      profile: profileData,
      schoolName: sName,
      enrolledClasses: clsList,
      hasEEAccess: eeAccess,
      unreadCount: unreadSubs.length,
      totalSubmissions: (subs || []).length,
      latestSubmissionWithFeedback: latestWithFeedback,
      assignedTasks: tasksList,
      unreadTasksCount: unreadTasks.length
    });

    setLoading(false);
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinMsg('');
    if (!joinCode.trim()) return;

    try {
      const { data: resData, error: rpcError } = await supabase.rpc('join_class_by_code', {
        p_join_code: joinCode.trim(),
        p_student_id: data.profile.id
      });

      if (rpcError) {
        setJoinMsg('Error: ' + rpcError.message);
        return;
      }

      if (resData && !resData.success) {
        setJoinMsg(resData.error || 'Invalid code.');
        return;
      }

      setJoinMsg(`Joined ${resData.className}!`);
      setJoinCode('');
      await initDashboard();
    } catch (err: any) {
      setJoinMsg('Error: ' + err.message);
    }
  };

  const handleLeaveClass = async (classId: string) => {
    if (!confirm('Are you sure you want to leave this class?')) return;
    
    const { error } = await supabase
      .from('class_members')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', data.profile.id);

    if (error) {
      alert('Error leaving class: ' + error.message);
    } else {
      await initDashboard();
    }
  };

  const handleOpenFeedback = async () => {
    if (!data.latestSubmissionWithFeedback) {
      alert('No teacher feedback available yet.');
      return;
    }
    if (data.latestSubmissionWithFeedback.is_read_by_student === false) {
      await supabase.from('submissions').update({ is_read_by_student: true }).eq('id', data.latestSubmissionWithFeedback.id);
      setData(prev => ({ ...prev, unreadCount: 0 }));
    }
    setShowFeedbackModal(true);
  };

  const handleOpenTasks = () => {
    if (data.assignedTasks.length === 0) {
      alert('No assigned tasks from your teachers yet.');
      return;
    }
    const allIds = data.assignedTasks.map(t => t.id);
    localStorage.setItem('read_task_ids_sevval', JSON.stringify(allIds));
    setData(prev => ({ ...prev, unreadTasksCount: 0 }));
    setShowTasksModal(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-600">Loading Student Portal...</div>;

  const sub = data.latestSubmissionWithFeedback;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white shadow-sm">IB</div>
            <span className="font-bold text-slate-900">IBDP Student Portal</span>
            
            {/* Okul ve Sınıf Rozetleri Üst Header'da */}
            {data.schoolName && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                🏫 {data.schoolName}
              </span>
            )}

            {data.enrolledClasses.map(c => (
              <span key={c.id} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1.5">
                <span>✓ {c.class_name}</span>
                <span className="text-[10px] font-mono bg-white px-1.5 py-0.2 rounded border text-slate-600">{c.join_code}</span>
                <button onClick={() => handleLeaveClass(c.id)} className="text-rose-600 hover:text-rose-800 font-black cursor-pointer" title="Leave class">×</button>
              </span>
            ))}

            {/* Sınıf Yoksa Hızlı Kod Girme Alanı */}
            {data.enrolledClasses.length === 0 && (
              <form onSubmit={handleJoinClass} className="flex items-center gap-1.5">
                <input 
                  type="text" 
                  placeholder="CLASS CODE (e.g. IB-1234)" 
                  value={joinCode} 
                  onChange={e => setJoinCode(e.target.value)} 
                  className="px-2.5 py-1 border rounded-lg text-[11px] uppercase bg-slate-50 font-mono w-40" 
                />
                <button type="submit" className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg shadow-xs cursor-pointer">Join</button>
              </form>
            )}
            {joinMsg && <span className="text-[11px] font-bold text-orange-600">{joinMsg}</span>}
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-600 hidden sm:inline">{data.profile?.full_name}</span>
            <button 
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth'; }} 
              className="px-3 py-1.5 rounded-lg border text-xs bg-white text-rose-600 hover:bg-rose-50 font-bold shadow-xs cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Feedback Modal */}
      {showFeedbackModal && sub && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full border border-orange-200">{sub.chosen_text_type}</span>
                <h3 className="text-lg font-black mt-1">Teacher Feedback &amp; Assessment</h3>
              </div>
              <button onClick={() => setShowFeedbackModal(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold cursor-pointer">Close ✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200">
                <span className="block text-[11px] font-black text-orange-800 uppercase tracking-wider mb-1">🤖 AI Assessment</span>
                <div className="text-xs space-y-0.5 text-slate-700">
                  <div>Crit A (Lang): <b>{sub.ai_score_a ?? '-'}/12</b></div>
                  <div>Crit B (Msg): <b>{sub.ai_score_b ?? '-'}/12</b></div>
                  <div>Crit C (Concept): <b>{sub.ai_score_c ?? '-'}/6</b></div>
                  <div className="pt-1 font-black text-orange-900 border-t border-orange-200 mt-1">Total: {(sub.ai_score_a || 0) + (sub.ai_score_b || 0) + (sub.ai_score_c || 0)} / 30</div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="block text-[11px] font-black text-emerald-800 uppercase tracking-wider mb-1">👨‍🏫 Teacher Assessment</span>
                {sub.criterion_a_score !== null ? (
                  <div className="text-xs space-y-0.5 text-slate-700">
                    <div>Crit A (Lang): <b>{sub.criterion_a_score}/12</b></div>
                    <div>Crit B (Msg): <b>{sub.criterion_b_score}/12</b></div>
                    <div>Crit C (Concept): <b>{sub.criterion_c_score}/6</b></div>
                    <div className="pt-1 font-black text-emerald-900 border-t border-emerald-200 mt-1">Total: {(sub.criterion_a_score || 0) + (sub.criterion_b_score || 0) + (sub.criterion_c_score || 0)} / 30</div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 font-medium italic mt-2">Awaiting teacher evaluation and grading...</p>
                )}
              </div>
            </div>

            {sub.teacher_feedback && (
              <div className="p-5 bg-emerald-500 text-white rounded-2xl shadow-md space-y-1.5">
                <div className="text-xs font-black uppercase tracking-wider">🔔 Teacher Feedback &amp; Guidance</div>
                <p className="text-xs whitespace-pre-line leading-relaxed font-medium">{sub.teacher_feedback}</p>
              </div>
            )}

            <div className="p-5 bg-slate-50 rounded-2xl whitespace-pre-line font-serif text-xs leading-relaxed max-h-48 overflow-y-auto border border-slate-200">
              {sub.content}
            </div>

            <button onClick={() => setShowFeedbackModal(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-md cursor-pointer">Close Window</button>
          </div>
        </div>
      )}

      {/* Assigned Tasks Modal */}
      {showTasksModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full border border-indigo-200">Teacher Assignments</span>
                <h3 className="text-lg font-black mt-1">Assigned Tasks &amp; Stimuli</h3>
              </div>
              <button onClick={() => setShowTasksModal(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold cursor-pointer">Close ✕</button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {data.assignedTasks.map(task => (
                <div key={task.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">{task.theme} ({task.level})</span>
                      {task.deadline && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">⏰ {new Date(task.deadline).toLocaleString()}</span>}
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900">{task.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{task.prompt}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => {
                        setShowTasksModal(false);
                        router.push('/student/paper1');
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all"
                    >
                      Go to Paper 1 Exam Environment ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowTasksModal(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-md cursor-pointer">Close Window</button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Banner with Real Photo Background */}
        <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-200 text-white p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-900">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=80" 
              alt="" 
              className="w-full h-full object-cover opacity-25 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/80 to-transparent" />
          </div>

          <div className="space-y-2 relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 bg-orange-600/80 text-white rounded-lg font-bold border border-orange-500/30 backdrop-blur-sm">
              Student Command Center
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-white">Welcome back, {data.profile?.full_name}</h1>
            <p className="text-xs text-slate-300 max-w-xl">Manage your classrooms, review teacher feedback, and access your IBDP exam modules below.</p>
          </div>

          <div className="flex items-center gap-3 relative z-10 shrink-0">
            <div 
              onClick={handleOpenTasks}
              className="p-4 bg-indigo-900/80 hover:bg-indigo-800/90 border border-indigo-500/30 backdrop-blur-md rounded-2xl text-center relative cursor-pointer transition-all shadow-md group min-w-[95px]"
            >
              {data.unreadTasksCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full animate-ping" />}
              <span className="text-[10px] font-mono uppercase text-indigo-200 font-bold block">Assigned Tasks</span>
              <span className="text-xl font-black text-white group-hover:scale-105 transition-transform inline-block">{data.assignedTasks.length}</span>
            </div>

            <div className="p-4 bg-slate-800/80 border border-slate-700/50 backdrop-blur-md rounded-2xl text-center shadow-md min-w-[95px]">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Submissions</span>
              <span className="text-xl font-black text-white inline-block">{data.totalSubmissions}</span>
            </div>

            <div 
              onClick={handleOpenFeedback}
              className="p-4 bg-orange-950/80 hover:bg-orange-900/80 border border-orange-500/30 backdrop-blur-md rounded-2xl text-center relative cursor-pointer transition-all shadow-md group min-w-[95px]"
            >
              {data.unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />}
              <span className="text-[10px] font-mono uppercase text-orange-300 font-bold block">New Feedback</span>
              <span className="text-xl font-black text-orange-400 group-hover:scale-105 transition-transform inline-block">{data.unreadCount}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div 
            onClick={() => router.push('/student/paper1')}
            className="p-8 bg-white border-2 border-slate-900 rounded-3xl shadow-lg cursor-pointer hover:border-orange-600 transition-all flex flex-col justify-between space-y-8 group relative overflow-hidden"
          >
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
              <div className="space-y-1 font-mono text-[11px] font-bold tracking-widest text-slate-600">
                <div>SPEC/2/ABENG/HP1/ENG/TZ0/XX</div>
                <div className="text-[10px] text-slate-400">EXAMINATION PAPER • PORTAL ACCESS</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-black tracking-tighter text-sm shadow-md">
                ib
              </div>
            </div>

            <div className="space-y-3 font-serif">
              <div>
                <h3 className="text-lg font-black text-slate-900">English B — Higher/Standard level — Paper 1</h3>
                <h4 className="text-xs font-semibold text-slate-600">Anglais B — Niveau supérieur / moyen — Épreuve 1</h4>
                <h4 className="text-xs font-semibold text-slate-600">Inglés B — Nivel superior / medio — Prueba 1</h4>
              </div>

              <div className="pt-2 text-xs font-sans text-slate-700 space-y-1 bg-slate-50 p-4 rounded-xl border">
                <p className="font-bold text-slate-900">• Complete one task [30 marks / points]</p>
                <p className="font-medium text-slate-500">• Time allowed: 1 hour 30 minutes</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-xs font-bold text-orange-600 group-hover:translate-x-1 transition-transform">Launch Paper 1 Exam Environment ➔</span>
              <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-mono font-bold uppercase">Ready</span>
            </div>
          </div>

          {data.hasEEAccess ? (
            <div 
              onClick={() => router.push('/student/ee')}
              className="p-8 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl shadow-lg cursor-pointer hover:opacity-95 transition-all flex flex-col justify-between space-y-8 group"
            >
              <div className="flex justify-between items-start border-b border-white/20 pb-6">
                <div className="space-y-1 font-mono text-[11px] font-bold tracking-widest text-indigo-300">
                  <div>IBDP/CORE/EE/2027/SESSION</div>
                  <div className="text-[10px] text-indigo-400">EXTENDED ESSAY WORKSPACE</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                  EE
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-black tracking-tight font-serif">Extended Essay Research &amp; Draft Workspace</h3>
                <p className="text-xs text-slate-300 font-sans max-w-md">
                  Access your Proposal, Title Page, RRS &amp; AI Prompt Log, 3 Mandatory Reflection Sessions (RPF), APA 7 Bibliography, and Draft PDF Export.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-xs font-bold text-indigo-300 group-hover:translate-x-1 transition-transform">Launch EE Workspace ➔</span>
                <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-mono font-bold uppercase">Active</span>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white border-2 border-dashed border-slate-300 rounded-3xl flex flex-col justify-between space-y-8 opacity-75">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div className="space-y-1 font-mono text-[11px] font-bold tracking-widest text-slate-400">
                  <div>IBDP/CORE/EE/LOCKED</div>
                  <div className="text-[10px]">EXTENDED ESSAY WORKSPACE</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm">
                  🔒
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-800 font-serif">Extended Essay Workspace</h3>
                <p className="text-xs text-slate-500 font-sans max-w-md">
                  Your Extended Essay workspace is currently locked. It will appear here automatically once your school coordinator assigns your EE subject and supervisor.
                </p>
              </div>

              <div className="pt-4 border-t text-xs font-bold text-slate-400 italic font-sans">
                Awaiting coordinator assignment...
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}