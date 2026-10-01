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
  created_at: string;
}

export default function SuperAdminPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<SchoolLicense[]>([]);

  const [schoolName, setSchoolName] = useState('');
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [coordinatorPassword, setCoordinatorPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    const { data } = await supabase.from('school_licenses').select('*').order('created_at', { ascending: false });
    if (data) setSchools(data);
    setLoading(false);
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!schoolName.trim() || !coordinatorEmail.trim() || !coordinatorPassword.trim() || !joinCode.trim()) {
      alert('Please fill in all fields including temporary password.');
      return;
    }

    try {
      // 1. API üzerinden koordinatör kullanıcısını oluşturalım
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: coordinatorEmail.trim().toLowerCase(),
          password: coordinatorPassword.trim(),
          fullName: `${schoolName} Coordinator`,
          role: 'teacher'
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create coordinator account.');

      // 2. Okul lisansını oluşturalım
      const { data: schoolData, error: schoolErr } = await supabase.from('school_licenses').insert([{
        school_name: schoolName.trim(),
        coordinator_email: coordinatorEmail.trim().toLowerCase(),
        join_code: joinCode.trim().toUpperCase(),
        teacher_limit: 3,
        student_limit: 50
      }]).select().single();

      if (schoolErr) throw schoolErr;

      // 3. Koordinatör üyelik ilişkisini kuralım
      if (schoolData && resData.userId) {
        await supabase.from('school_memberships').insert([{
          school_id: schoolData.id,
          user_id: resData.userId,
          role: 'coordinator'
        }]);
      }

      setMsg('School license and coordinator account successfully created!');
      setSchoolName('');
      setCoordinatorEmail('');
      setCoordinatorPassword('');
      setJoinCode('');
      await loadSchools();
    } catch (err: any) {
      setMsg('Error: ' + err.message);
    }
  };

  const handleDeleteSchool = async (school: SchoolLicense) => {
    if (!confirm(`Are you sure you want to delete "${school.school_name}"? This will remove the license and revoke the coordinator's account.`)) return;

    try {
      // 1. Bu okula ait koordinatörün user_id'sini bulalım
      const { data: membership } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', school.id)
        .eq('role', 'coordinator')
        .single();

      // 2. Eğer koordinatör varsa, Auth sisteminden ve tablolardan tamamen silelim
      if (membership?.user_id) {
        await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: membership.user_id })
        });
      }

      // 3. Okul lisansını veritabanından silelim
      const { error } = await supabase.from('school_licenses').delete().eq('id', school.id);
      if (error) throw error;

      await loadSchools();
      alert('School license and associated coordinator account successfully removed.');
    } catch (err: any) {
      alert('Error deleting school: ' + err.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Super Admin...</div>;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-white shadow-sm">⚡</div>
            <span className="font-bold">System Super Admin (Platform Management)</span>
          </div>
          <button onClick={() => { window.location.href = '/auth'; }} className="px-3 py-1.5 border text-xs bg-white rounded-lg text-slate-600 shadow-sm cursor-pointer">Sign Out</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        <div className="p-6 bg-white border rounded-3xl space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900">Create New Institutional School License &amp; Coordinator Account</h3>
          <form onSubmit={handleCreateSchool} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input 
              type="text" 
              placeholder="School Name" 
              value={schoolName} 
              onChange={e => setSchoolName(e.target.value)} 
              className="px-4 py-2.5 border rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none" 
            />
            <input 
              type="email" 
              placeholder="Coordinator Email" 
              value={coordinatorEmail} 
              onChange={e => setCoordinatorEmail(e.target.value)} 
              className="px-4 py-2.5 border rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none" 
            />
            <input 
              type="password" 
              placeholder="Temp Password" 
              value={coordinatorPassword} 
              onChange={e => setCoordinatorPassword(e.target.value)} 
              className="px-4 py-2.5 border rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none" 
            />
            <input 
              type="text" 
              placeholder="School Code (e.g. BAL-2026)" 
              value={joinCode} 
              onChange={e => setJoinCode(e.target.value)} 
              className="px-4 py-2.5 border rounded-xl text-xs uppercase bg-slate-50 text-slate-900 focus:outline-none" 
            />
            <button type="submit" className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer">
              Create School &amp; Account
            </button>
          </form>
          {msg && <div className="p-3 bg-rose-50 text-xs text-rose-800 rounded-xl border border-rose-200">{msg}</div>}
        </div>

        <div className="p-6 bg-white border rounded-3xl space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900">All Registered Schools ({schools.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schools.map(sc => (
              <div key={sc.id} className="p-5 border rounded-2xl bg-slate-50 space-y-3 relative">
                <button onClick={() => handleDeleteSchool(sc)} className="absolute top-4 right-4 text-xs text-rose-600 font-bold hover:underline cursor-pointer">Delete School</button>
                <h4 className="font-extrabold text-base text-slate-900">{sc.school_name}</h4>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>Coordinator: <b>{sc.coordinator_email}</b></div>
                  <div>School Code: <span className="font-mono bg-white px-2 py-0.5 rounded border font-bold text-indigo-700">{sc.join_code}</span></div>
                  <div className="pt-2 flex gap-4 text-[11px] font-bold text-slate-700">
                    <span>Teacher Limit: {sc.teacher_limit}</span>
                    <span>Student Limit: {sc.student_limit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}