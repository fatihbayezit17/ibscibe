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
  profiles?: { full_name: string; email: string; class_name?: string };
}

interface ClassGroup {
  name: string;
  bgImage: string;
  type: 'class' | 'teachers';
}

interface LoungeMessage {
  id: string;
  sender_email: string;
  message: string;
  created_at: string;
}

export default function SchoolAdminPortal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [schoolLicense, setSchoolLicense] = useState<SchoolLicense | null>(null);
  const [members, setMembers] = useState<SchoolMember[]>([]);
  
  // Yeni Üye Ekleme Form State'leri
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberFullName, setNewMemberFullName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'teacher' | 'student'>('teacher');
  const [newMemberClass, setNewMemberClass] = useState('IBDP-1A');
  const [msg, setMsg] = useState('');
  const [tempPasswordGenerated, setTempPasswordGenerated] = useState('');
  
  const [classes, setClasses] = useState<ClassGroup[]>([
    { name: 'IBDP-1A', bgImage: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80', type: 'class' },
    { name: 'IBDP-1B', bgImage: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=600&q=80', type: 'class' },
    { name: 'IBDP-2A', bgImage: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=600&q=80', type: 'class' },
    { name: 'IBDP-2B', bgImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80', type: 'class' },
    { name: 'Faculty Members', bgImage: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80', type: 'teachers' }
  ]);

  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassBg, setNewClassBg] = useState('https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80');

  const [activeGroup, setActiveGroup] = useState<ClassGroup | null>(null);
  const [activeFacultyTab, setActiveFacultyTab] = useState<'members' | 'lounge'>('members');

  const [loungeMessages, setLoungeMessages] = useState<LoungeMessage[]>([
    { id: '1', sender_email: 'coordinator@nilufer.k12.tr', message: 'Welcome esteemed faculty members! Please coordinate mock exam schedules via this channel.', created_at: new Date().toISOString() }
  ]);
  const [newMsgText, setNewMsgText] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');

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
      const lic = memData.school_licenses as any;
      setSchoolLicense({
        ...lic,
        teacher_limit: lic.teacher_limit || 20,
        student_limit: lic.student_limit || 100
      });
      
      const { data: allMems } = await supabase
        .from('school_memberships')
        .select('*')
        .eq('school_id', lic.id);

      if (allMems) {
        const enhanced = await Promise.all(allMems.map(async (m) => {
          const { data: prof } = await supabase.from('profiles').select('full_name, email, class_name').eq('id', m.user_id).maybeSingle();
          return {
            ...m,
            profiles: prof || { full_name: 'Unnamed User', email: m.user_id.slice(0, 8), class_name: 'IBDP-1A' }
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
    if (!newMemberEmail.trim() || !newMemberFullName.trim() || !schoolLicense) {
      setMsg('Please fill in both Full Name and Email Address.');
      return;
    }

    const teacherCount = members.filter(m => m.role === 'teacher').length;
    const studentCount = members.filter(m => m.role === 'student').length;

    const tLimit = schoolLicense.teacher_limit || 20;
    const sLimit = schoolLicense.student_limit || 100;

    if (newMemberRole === 'teacher' && teacherCount >= tLimit) {
      setMsg(`Teacher quota reached! Max limit is ${tLimit}.`);
      return;
    }
    if (newMemberRole === 'student' && studentCount >= sLimit) {
      setMsg(`Student quota reached! Max limit is ${sLimit}.`);
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
          fullName: newMemberFullName.trim(),
          role: newMemberRole
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create user account.');

      // Profili Ad, Soyad, E-posta ve Sınıf bilgisi ile güncelleyelim
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: resData.userId,
        full_name: newMemberFullName.trim(),
        email: newMemberEmail.trim().toLowerCase(),
        class_name: newMemberRole === 'student' ? newMemberClass : 'Faculty'
      });

      if (profErr) throw profErr;

      const { error: insErr } = await supabase.from('school_memberships').insert([{
        school_id: schoolLicense.id,
        user_id: resData.userId,
        role: newMemberRole
      }]);

      if (insErr) throw insErr;

      setMsg(`Successfully added ${newMemberFullName} (${newMemberEmail}) as ${newMemberRole}!`);
      setTempPasswordGenerated(generatedPassword);
      setNewMemberEmail('');
      setNewMemberFullName('');
      await loadSchoolData(user.id);
    } catch (err: any) {
      setMsg('Error adding member: ' + err.message);
    }
  };

  const handleRemoveMember = async (member: SchoolMember) => {
    if (!confirm(`Are you sure you want to completely delete ${member.profiles?.full_name || member.profiles?.email || 'this user'}?`)) return;

    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.user_id })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to delete user account.');

      await loadSchoolData(user.id);
      alert('User successfully deleted.');
    } catch (err: any) {
      alert('Error removing member: ' + err.message);
    }
  };

  const handleResetPassword = async (member: SchoolMember) => {
    const name = member.profiles?.full_name || member.profiles?.email || 'User';
    const newPassword = prompt(`Enter new temporary password for "${name}":`);
    if (!newPassword) return;

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.user_id, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Password successfully updated!\nNew Password: ${newPassword}`);
      } else {
        alert('Error: ' + (data.error || 'Could not update password.'));
      }
    } catch (err: any) {
      alert('Connection error: ' + err.message);
    }
  };

  const handleSendLoungeMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim()) return;

    const messageText = newMsgText.trim();
    const senderEmail = user?.email || 'Coordinator';

    const newMsg: LoungeMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender_email: senderEmail,
      message: messageText,
      created_at: new Date().toISOString()
    };

    setLoungeMessages([newMsg, ...loungeMessages]);
    setNewMsgText('');
    setBroadcastMsg('Message posted and notifications sent to all faculty members!');
    setTimeout(() => setBroadcastMsg(''), 4000);

    const teachersList = members.filter(m => m.role === 'teacher');
    if (teachersList.length > 0) {
      const notificationRows = teachersList.map(t => ({
        teacher_id: t.user_id,
        title: 'New Faculty Lounge Announcement',
        message: `${senderEmail}: "${messageText}"`,
        is_read: false
      }));

      await supabase.from('notifications').insert(notificationRows);
    }
  };

  const handleCreateNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setClasses([...classes, { name: newClassName.trim(), bgImage: newClassBg, type: 'class' }]);
    setNewClassName('');
    setShowAddClassModal(false);
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-medium">Loading School Coordinator Portal...</div>;

  const teacherCount = members.filter(m => m.role === 'teacher').length;
  const studentCount = members.filter(m => m.role === 'student').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm print:hidden">
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
          <button onClick={() => { window.location.href = '/auth'; }} className="px-3 py-1.5 border text-xs bg-white rounded-lg text-slate-600 shadow-sm hover:bg-slate-50 cursor-pointer">Sign Out</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Banner */}
        <div 
          className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-white shadow-xl flex flex-col justify-center border border-slate-800 print:hidden"
          style={{ 
            backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.9)), url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="z-10 max-w-2xl space-y-3">
            <span className="inline-block px-3 py-1 bg-indigo-500/30 text-indigo-200 rounded-full text-[11px] font-mono uppercase tracking-widest border border-indigo-400/30 backdrop-blur-md">
              IBDP Executive Dashboard
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Institutional AI &amp; Academic Coordination Hub
            </h2>
            <p className="text-sm text-slate-200 leading-relaxed">
              Seamlessly manage classes, teacher assignments, core requirements, mock exams, and AI-driven assessments from a single centralized platform.
            </p>
          </div>
        </div>

        {/* EE, CAS & Mock Exam Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <div 
            onClick={() => router.push('/school-admin/ee')}
            className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl shadow-md cursor-pointer hover:opacity-95 transition-all flex items-center justify-between group border border-indigo-800/50"
          >
            <div className="space-y-1">
              <span className="inline-block px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded-md text-[10px] font-mono uppercase tracking-widest border border-indigo-400/30">
                IBDP Core
              </span>
              <h3 className="text-base font-black tracking-tight">Extended Essay (EE) Center</h3>
              <p className="text-[11px] text-slate-300">Manage student pathways &amp; supervisors.</p>
            </div>
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center font-bold group-hover:translate-x-1 transition-transform">➔</div>
          </div>

          <div 
            onClick={() => alert('CAS Management module is ready for integration!')}
            className="p-6 bg-gradient-to-br from-purple-900 to-slate-900 text-white rounded-3xl shadow-md cursor-pointer hover:opacity-95 transition-all flex items-center justify-between group border border-purple-800/50"
          >
            <div className="space-y-1">
              <span className="inline-block px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded-md text-[10px] font-mono uppercase tracking-widest border border-purple-400/30">
                IBDP Core
              </span>
              <h3 className="text-base font-black tracking-tight">CAS Management Suite</h3>
              <p className="text-[11px] text-slate-300">Oversee Creativity, Activity &amp; Service.</p>
            </div>
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center font-bold group-hover:translate-x-1 transition-transform">➔</div>
          </div>

          <div 
            onClick={() => router.push('/school-admin/mock')}
            className="p-6 bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-3xl shadow-md cursor-pointer hover:opacity-95 transition-all flex items-center justify-between group border border-emerald-800/50"
          >
            <div className="space-y-1">
              <span className="inline-block px-2 py-0.5 bg-emerald-500/30 text-emerald-300 rounded-md text-[10px] font-mono uppercase tracking-widest border border-emerald-400/30">
                Examinations
              </span>
              <h3 className="text-base font-black tracking-tight">Mock Exam &amp; Invigilation</h3>
              <p className="text-[11px] text-slate-300">Schedule exams &amp; assign proctors.</p>
            </div>
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center font-bold group-hover:translate-x-1 transition-transform">➔</div>
          </div>
        </div>

        {/* Quota Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
          <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Faculty Members Quota</span>
            <div className="text-3xl font-black text-indigo-600">{teacherCount} / {schoolLicense?.teacher_limit || 20}</div>
          </div>
          <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Student Account Quota</span>
            <div className="text-3xl font-black text-orange-600">{studentCount} / {schoolLicense?.student_limit || 100}</div>
          </div>
        </div>

        {/* Add Member Panel (Full Name ve Email Alanı Eklendi) */}
        <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-4 print:hidden">
          <h3 className="font-bold text-sm text-slate-900">Add Teacher or Student (Auto-generates Temporary Password)</h3>
          <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-3">
            <input 
              type="text" 
              placeholder="Full Name (e.g. Dr. Ahmet Yılmaz)" 
              value={newMemberFullName} 
              onChange={e => setNewMemberFullName(e.target.value)} 
              className="px-4 py-2.5 border rounded-xl text-xs flex-1 bg-slate-50 text-slate-900 focus:outline-none" 
            />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={newMemberEmail} 
              onChange={e => setNewMemberEmail(e.target.value)} 
              className="px-4 py-2.5 border rounded-xl text-xs flex-1 bg-slate-50 text-slate-900 focus:outline-none" 
            />
            <select 
              value={newMemberRole} 
              onChange={e => setNewMemberRole(e.target.value as any)} 
              className="px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900"
            >
              <option value="teacher">Faculty Member / Teacher</option>
              <option value="student">Student Account</option>
            </select>

            {newMemberRole === 'student' && (
              <select 
                value={newMemberClass} 
                onChange={e => setNewMemberClass(e.target.value)} 
                className="px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900"
              >
                {classes.filter(c => c.type === 'class').map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            )}

            <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer">
              Create &amp; Add Member
            </button>
          </form>
          {msg && <div className="p-3 bg-indigo-50 text-xs text-indigo-800 rounded-xl border border-indigo-200">{msg}</div>}
          {tempPasswordGenerated && (
            <div className="p-3 bg-emerald-50 text-xs text-emerald-800 rounded-xl border border-emerald-200">
              🔑 Generated Temporary Password: <b className="font-mono bg-white px-2 py-0.5 rounded">{tempPasswordGenerated}</b>
            </div>
          )}
        </div>

        {/* Classes & Groups Section */}
        <div className="space-y-4 print:hidden">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Classes &amp; Staff Groups</h3>
            <button 
              onClick={() => setShowAddClassModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span>➕ Add New Class / Group</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {classes.map((cls) => {
              const count = members.filter(m => {
                if (cls.type === 'teachers') return m.role === 'teacher';
                return m.role === 'student' && (m.profiles?.class_name || 'IBDP-1A') === cls.name;
              }).length;

              return (
                <div 
                  key={cls.name}
                  onClick={() => { setActiveGroup(cls); setActiveFacultyTab('members'); }}
                  className="relative overflow-hidden rounded-3xl p-5 text-white cursor-pointer shadow-lg transition-all border border-slate-200 hover:scale-[1.02] group"
                  style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.85)), url('${cls.bgImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="relative z-10 space-y-6">
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      {cls.type === 'teachers' ? 'Faculty Lounge & Directory' : 'IBDP Class'}
                    </span>
                    <div>
                      <h4 className="text-xl font-black group-hover:text-indigo-300 transition-colors">{cls.name}</h4>
                      <p className="text-xs text-slate-200 mt-1">{count} Registered Members</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal / Active Group Drawer */}
        {activeGroup && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border space-y-5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                    {activeGroup.type === 'teachers' ? 'Faculty Central Hub' : 'Classroom Folder'}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">{activeGroup.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {activeGroup.type === 'teachers' && (
                    <div className="flex bg-slate-100 p-1 rounded-xl print:hidden">
                      <button 
                        onClick={() => setActiveFacultyTab('members')} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeFacultyTab === 'members' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                      >
                        Faculty Directory
                      </button>
                      <button 
                        onClick={() => setActiveFacultyTab('lounge')} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeFacultyTab === 'lounge' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                      >
                        ☕ Teachers' Lounge (Chat)
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={handleExportPDF}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 print:hidden"
                  >
                    <span>📥 Download PDF</span>
                  </button>
                  <button 
                    onClick={() => setActiveGroup(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold cursor-pointer print:hidden"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {activeGroup.type === 'teachers' && activeFacultyTab === 'lounge' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                    <h4 className="font-bold text-xs text-amber-900">☕ Teachers' Lounge &amp; Announcements</h4>
                    <p className="text-[11px] text-amber-700">Official coordination channel for faculty discussions, exam briefs, and announcements.</p>
                  </div>

                  {broadcastMsg && <div className="p-3 bg-emerald-50 text-xs text-emerald-800 rounded-xl border border-emerald-200">{broadcastMsg}</div>}

                  <form onSubmit={handleSendLoungeMessage} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Type an announcement or message to all teachers..." 
                      value={newMsgText} 
                      onChange={e => setNewMsgText(e.target.value)} 
                      className="flex-1 p-3 border rounded-xl text-xs bg-slate-50"
                    />
                    <button type="submit" className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer">
                      Post &amp; Notify All
                    </button>
                  </form>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {loungeMessages.map(msg => (
                      <div key={msg.id} className="p-4 rounded-2xl bg-slate-50 border space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span className="font-bold text-indigo-700">{msg.sender_email}</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.filter(m => {
                    if (activeGroup.type === 'teachers') return m.role === 'teacher';
                    return m.role === 'student' && (m.profiles?.class_name || 'IBDP-1A') === activeGroup.name;
                  }).length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center">No members found in this group yet.</p>
                  ) : (
                    members.filter(m => {
                      if (activeGroup.type === 'teachers') return m.role === 'teacher';
                      return m.role === 'student' && (m.profiles?.class_name || 'IBDP-1A') === activeGroup.name;
                    }).map(m => (
                      <div key={m.id} className="p-4 rounded-2xl bg-slate-50 border flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{m.profiles?.full_name || 'Unnamed User'}</div>
                          <div className="text-[11px] text-slate-500">{m.profiles?.email || 'No Email'}</div>
                        </div>
                        <div className="flex items-center gap-3 print:hidden">
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border">
                            {m.role}
                          </span>
                          <button 
                            onClick={() => handleResetPassword(m)} 
                            className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200"
                          >
                            Reset Password
                          </button>
                          {m.role !== 'coordinator' && (
                            <button onClick={() => handleRemoveMember(m)} className="text-xs text-rose-600 font-bold hover:underline cursor-pointer">
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Class Modal */}
        {showAddClassModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-black text-base text-slate-900">Create New Class or Group</h3>
                <button onClick={() => setShowAddClassModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
              </div>

              <form onSubmit={handleCreateNewClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Class / Group Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. IBDP-2C" 
                    value={newClassName} 
                    onChange={e => setNewClassName(e.target.value)} 
                    className="w-full px-4 py-2.5 border rounded-xl text-xs bg-slate-50 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Card Background Image URL</label>
                  <input 
                    type="url" 
                    required
                    value={newClassBg} 
                    onChange={e => setNewClassBg(e.target.value)} 
                    className="w-full px-4 py-2.5 border rounded-xl text-xs bg-slate-50 text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddClassModal(false)} className="px-4 py-2 border text-xs font-bold rounded-xl text-slate-600">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">Create Group</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}