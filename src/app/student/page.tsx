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
    totalSubmissions: 0
  });

  const [joinCode, setJoinCode] = useState('');
  const [schoolCodeInput, setSchoolCodeInput] = useState('');
  const [joinMsg, setJoinMsg] = useState('');

  useEffect(() => {
    initDashboard();
  }, []);

  const initDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    const defaultName = user.email?.split('@')[0] || 'Student User';
    const { data: prof } = await supabase
      .from('profiles')
      .upsert([{ id: user.id, full_name: defaultName, email: user.email }], { onConflict: 'id' })
      .select()
      .single();

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

    const { data: subs } = await supabase
      .from('submissions')
      .select('id, teacher_feedback, is_read_by_student')
      .eq('student_id', user.id);

    const unread = (subs || []).filter(s => s.teacher_feedback && s.is_read_by_student === false).length;

    setData({
      profile: prof || { full_name: defaultName, email: user.email },
      schoolName: sName,
      enrolledClasses: clsList,
      hasEEAccess: eeAccess,
      unreadCount: unread,
      totalSubmissions: (subs || []).length
    });

    setLoading(false);
  };

  const handleJoinSchoolLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolCodeInput.trim()) return;

    const { data: school, error: err } = await supabase
      .from('school_licenses')
      .select('id, school_name, student_limit')
      .eq('join_code', schoolCodeInput.trim().toUpperCase())
      .single();

    if (err || !school) {
      alert('Invalid school code.');
      return;
    }

    const { error: insErr } = await supabase.from('school_memberships').insert([{
      school_id: school.id,
      user_id: data.profile.id,
      role: 'student'
    }]);

    if (insErr) {
      alert('Error joining school: ' + insErr.message);
    } else {
      alert(`Successfully joined ${school.school_name}!`);
      await initDashboard();
      setSchoolCodeInput('');
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinMsg('');
    if (!joinCode.trim()) return;

    const { data: classObj, error: classErr } = await supabase
      .from('classes')
      .select('id, class_name')
      .eq('join_code', joinCode.trim().toUpperCase())
      .single();

    if (classErr || !classObj) {
      setJoinMsg('Invalid class code.');
      return;
    }

    const { error: joinErr } = await supabase.from('class_members').upsert([
      { class_id: classObj.id, student_id: data.profile.id }
    ], { onConflict: 'class_id,student_id' });

    if (joinErr) {
      setJoinMsg(joinErr.message);
    } else {
      setJoinMsg(`Successfully joined ${classObj.class_name}!`);
      setJoinCode('');
      await initDashboard();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-600">Loading Student Portal...</div>;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white shadow-sm">IB</div>
            <span className="font-bold text-slate-900">IBDP Student Portal</span>
            {data.schoolName && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                🏫 {data.schoolName}
              </span>
            )}
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

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Karşılama ve Durum Kartları */}
        <div className="p-8 bg-white border rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg font-bold border border-orange-200">
              Student Command Center
            </span>
            <h1 className="text-2xl font-black text-slate-900">Welcome back, {data.profile?.full_name}</h1>
            <p className="text-xs text-slate-500">Manage your classrooms, join school licenses, and access your IBDP exam modules below.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-4 bg-slate-50 border rounded-2xl text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Submissions</span>
              <span className="text-xl font-black text-slate-900">{data.totalSubmissions}</span>
            </div>
            <div className="p-4 bg-slate-50 border rounded-2xl text-center relative">
              {data.unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-600 rounded-full animate-ping" />}
              <span className="text-[10px] font-mono uppercase text-slate-400 block">New Feedback</span>
              <span className="text-xl font-black text-orange-600">{data.unreadCount}</span>
            </div>
          </div>
        </div>

        {/* Classroom & School Code Enrollment (Paper 1 sayfasından buraya taşındı) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!data.schoolName && (
            <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-3">
              <h3 className="font-bold text-xs text-indigo-900 uppercase">Join School License</h3>
              <form onSubmit={handleJoinSchoolLicense} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="ENTER SCHOOL CODE" 
                  value={schoolCodeInput} 
                  onChange={e => setSchoolCodeInput(e.target.value)} 
                  className="px-4 py-2 border rounded-xl text-xs uppercase bg-slate-50 flex-1 font-mono" 
                />
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer">Join</button>
              </form>
            </div>
          )}

          <div className={`p-6 bg-white border rounded-3xl shadow-sm space-y-3 ${!data.schoolName ? 'md:col-span-1' : 'md:col-span-2'}`}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xs text-slate-900 uppercase">Classroom Enrolment ({data.enrolledClasses.length})</h3>
              <form onSubmit={handleJoinClass} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="ENTER CLASS CODE (e.g. IB-1234)" 
                  value={joinCode} 
                  onChange={e => setJoinCode(e.target.value)} 
                  className="px-3 py-1.5 border rounded-xl text-xs uppercase bg-slate-50 font-mono" 
                />
                <button type="submit" className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer">Join Class</button>
              </form>
            </div>
            {data.enrolledClasses.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {data.enrolledClasses.map(c => (
                  <span key={c.id} className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                    ✓ Enrolled: {c.class_name} (Code: {c.join_code})
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">You are not enrolled in any class yet. Enter a class code above to join.</p>
            )}
            {joinMsg && <div className="p-2.5 bg-orange-50 text-xs text-orange-800 rounded-xl border border-orange-200">{joinMsg}</div>}
          </div>
        </div>

        {/* Gerçek IBDP Exam Paper Estetiğinde Paper 1 Giriş Kartı */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div 
            onClick={() => router.push('/student/paper1')}
            className="p-8 bg-white border-2 border-slate-900 rounded-3xl shadow-lg cursor-pointer hover:border-orange-600 transition-all flex flex-col justify-between space-y-8 group relative overflow-hidden"
          >
            {/* Üst IB Sınav Kağıdı Kodu ve Logosu */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
              <div className="space-y-1 font-mono text-[11px] font-bold tracking-widest text-slate-600">
                <div>SPEC/2/ABENG/HP1/ENG/TZ0/XX</div>
                <div className="text-[10px] text-slate-400">EXAMINATION PAPER • PORTAL ACCESS</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-black tracking-tighter text-sm shadow-md">
                ib
              </div>
            </div>

            {/* Çok Dilli Başlıklar (Gönderdiğiniz Görseldeki Gibi) */}
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

          {/* Extended Essay (EE) Kartı (Sadece Yetkisi Varsa) */}
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