'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface SchoolLicense {
  id: string;
  school_name: string;
  coordinator_email: string;
  teacher_limit: number;
  student_limit: number;
  join_code: string;
}

interface SchoolMember {
  id: string;
  user_id: string;
  role: 'coordinator' | 'teacher' | 'student';
  profiles?: { full_name: string; email: string };
}

export default function SchoolAdminPortal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [schoolLicense, setSchoolLicense] = useState<SchoolLicense | null>(null);
  const [members, setMembers] = useState<SchoolMember[]>([]);
  
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'teacher' | 'student'>('teacher');
  const [msg, setMsg] = useState('');
  const [tempPasswordGenerated, setTempPasswordGenerated] = useState('');

  useEffect(() => {
    initSchoolAdmin();
  }, []);

  const initSchoolAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setUser(user);
    await loadSchoolData(user.id);
    setLoading(false);
  };

  const loadSchoolData = async (userId: string) => {
    const { data: memData } = await supabase
      .from('school_memberships')
      .select('school_id, role, school_licenses(*)')
      .eq('user_id', userId)
      .single();

    if (memData && memData.school_licenses) {
      setSchoolLicense(memData.school_licenses as any);
      
      const { data: allMems } = await supabase
        .from('school_memberships')
        .select('*')
        .eq('school_id', (memData.school_licenses as any).id);

      if (allMems) {
        const enhanced = await Promise.all(allMems.map(async (m) => {
          const { data: prof } = await supabase.from('profiles').select('full_name, email').eq('id', m.user_id).single();
          return {
            ...m,
            profiles: prof || { full_name: 'User', email: '' }
          };
        }));
        setMembers(enhanced);
      }
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setTempPasswordGenerated('');
    if (!newMemberEmail.trim() || !schoolLicense) return;

    const teacherCount = members.filter(m => m.role === 'teacher').length;
    const studentCount = members.filter(m => m.role === 'student').length;

    if (newMemberRole === 'teacher' && teacherCount >= schoolLicense.teacher_limit) {
      setMsg(`Teacher quota reached! Max limit is ${schoolLicense.teacher_limit}.`);
      return;
    }
    if (newMemberRole === 'student' && studentCount >= schoolLicense.student_limit) {
      setMsg(`Student quota reached! Max limit is ${schoolLicense.student_limit}.`);
      return;
    }

    const generatedPassword = 'IB-' + Math.random().toString(36).slice(-8);

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMemberEmail.trim().toLowerCase(),
          password: generatedPassword,
          fullName: `${newMemberRole === 'teacher' ? 'Teacher' : 'Student'} (${newMemberEmail.split('@')[0]})`,
          role: newMemberRole
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create user account.');

      const { error: insErr } = await supabase.from('school_memberships').insert([{
        school_id: schoolLicense.id,
        user_id: resData.userId,
        role: newMemberRole
      }]);

      if (insErr) throw insErr;

      setMsg(`Successfully added ${newMemberEmail} as ${newMemberRole}!`);
      setTempPasswordGenerated(generatedPassword);
      setNewMemberEmail('');
      await loadSchoolData(user.id);
    } catch (err: any) {
      setMsg('Error adding member: ' + err.message);
    }
  };

  const handleRemoveMember = async (member: SchoolMember) => {
    if (!confirm(`Are you sure you want to completely delete ${member.profiles?.email || 'this user'} from the platform? This will revoke their access permanently.`)) return;

    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.user_id })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to delete user account.');

      await loadSchoolData(user.id);
      alert('User successfully deleted and revoked from the platform.');
    } catch (err: any) {
      alert('Error removing member: ' + err.message);
    }
  };

  const handleResetPassword = async (member: SchoolMember) => {
    const email = member.profiles?.email || 'User';
    const newPassword = prompt(`"${email}" için yeni geçici şifre girin:`);
    if (!newPassword) return;

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.user_id, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Şifre başarıyla güncellendi!\nYeni Şifre: ${newPassword}`);
      } else {
        alert('Hata: ' + (data.error || 'Şifre güncellenemedi.'));
      }
    } catch (err: any) {
      alert('Bir bağlantı hatası oluştu: ' + err.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading School Admin Portal...</div>;

  const teacherCount = members.filter(m => m.role === 'teacher').length;
  const studentCount = members.filter(m => m.role === 'student').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">🏫</div>
            <span className="font-bold">School Coordinator Portal</span>
            {schoolLicense && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                {schoolLicense.school_name} (Code: {schoolLicense.join_code})
              </span>
            )}
          </div>
          <button onClick={() => { window.location.href = '/auth'; }} className="px-3 py-1.5 border text-xs bg-white rounded-lg text-slate-600 shadow-sm cursor-pointer">Sign Out</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Gerçekçi ve Profesyonel Kurumsal Fotoğraflı Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between border border-slate-800">
          
          {/* Sol Taraf: Metinler */}
          <div className="z-10 max-w-xl space-y-3">
            <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[11px] font-mono uppercase tracking-widest border border-indigo-500/30">
              IBDP Institutional Suite
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-snug">
              Kurumunuz IBDP Süreçlerini Yapay Zeka ile Yönetiyor!
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              English B Paper 1 analizleri, akıllı OCR değerlendirmeleri ve Extended Essay komuta merkezi ile öğretmenlerinizin yükünü hafifletin, öğrenci başarısını zirveye taşıyın.
            </p>
          </div>

          {/* Sağ Taraf: Gerçekçi ve Kaliteli Eğitim/Ofis Fotoğrafı (Unsplash) */}
          <div className="mt-6 md:mt-0 z-10 relative w-full md:w-72 h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
            <img 
              src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80" 
              alt="IBDP Education & Technology" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
              <span className="text-[11px] font-medium text-white/90 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                ✨ Modern Eğitim Teknolojisi
              </span>
            </div>
          </div>

          {/* Arka Plan Işık Efektleri */}
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* IBDP Extended Essay (EE) Komuta Merkezi Hızlı Erişim Kartı */}
        <div 
          onClick={() => router.push('/school-admin/ee')}
          className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl shadow-md cursor-pointer hover:opacity-95 transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="inline-block px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded-md text-[10px] font-mono uppercase tracking-widest border border-indigo-400/30">
              IBDP Core Requirement
            </span>
            <h3 className="text-lg font-black tracking-tight">Extended Essay (EE) Command Center</h3>
            <p className="text-xs text-slate-300">
              Manage student pathway groupings, assign supervisor teachers, review research questions (RQs), and oversee submission statuses.
            </p>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-lg group-hover:translate-x-1 transition-transform">
            ➔
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">English Teachers Quota</span>
            <div className="text-3xl font-black text-indigo-600">{teacherCount} / {schoolLicense?.teacher_limit}</div>
          </div>
          <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Student Account Quota</span>
            <div className="text-3xl font-black text-orange-600">{studentCount} / {schoolLicense?.student_limit}</div>
          </div>
        </div>

        <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Add Teacher or Student (Auto-generates Temporary Password)</h3>
          <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-3">
            <input 
              type="email" 
              placeholder="User Email Address" 
              value={newMemberEmail} 
              onChange={e => setNewMemberEmail(e.target.value)} 
              className="px-4 py-2.5 border rounded-xl text-xs flex-1 bg-slate-50 text-slate-900 focus:outline-none" 
            />
            <select 
              value={newMemberRole} 
              onChange={e => setNewMemberRole(e.target.value as any)} 
              className="px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900"
            >
              <option value="teacher">English Teacher</option>
              <option value="student">Student Account</option>
            </select>
            <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer">
              Create &amp; Add Member
            </button>
          </form>
          {msg && <div className="p-3 bg-indigo-50 text-xs text-indigo-800 rounded-xl border border-indigo-200">{msg}</div>}
          {tempPasswordGenerated && (
            <div className="p-3 bg-emerald-50 text-xs text-emerald-800 rounded-xl border border-emerald-200">
              🔑 Generated Temporary Password for User: <b className="font-mono bg-white px-2 py-0.5 rounded">{tempPasswordGenerated}</b> (Share this with the user securely).
            </div>
          )}
        </div>

        <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Licensed School Members ({members.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {members.map(m => (
              <div key={m.id} className="p-4 rounded-2xl bg-slate-50 border flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900">{m.profiles?.full_name || 'User'}</div>
                  <div className="text-[11px] text-slate-500">{m.profiles?.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border">
                    {m.role}
                  </span>
                  
                  <button 
                    onClick={() => handleResetPassword(m)} 
                    className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200"
                  >
                    Şifre Sıfırla
                  </button>

                  {m.role !== 'coordinator' && (
                    <button onClick={() => handleRemoveMember(m)} className="text-xs text-rose-600 font-bold hover:underline cursor-pointer">
                      Delete &amp; Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}