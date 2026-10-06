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
  package_name?: string;
  created_at: string;
}

interface SchoolInquiry {
  id: string;
  school_name: string;
  contact_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
}

const SUPER_ADMIN_PASS = 'nVb+101622';

// 3 Farklı Abonelik Paketi
const PACKAGES = [
  { name: 'Starter Tier (Trial / Small)', teachers: 5, students: 20 },
  { name: 'Professional Tier (Standard)', teachers: 20, students: 100 },
  { name: 'Enterprise Tier (Unlimited)', teachers: 999, students: 9999 }
];

export default function SuperAdminPortal() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPass, setInputPass] = useState('');
  const [passError, setPassError] = useState('');

  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<SchoolLicense[]>([]);
  const [inquiries, setInquiries] = useState<SchoolInquiry[]>([]);

  // Okul Oluşturma State'leri
  const [schoolName, setSchoolName] = useState('');
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [coordinatorPassword, setCoordinatorPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[1].name); // Varsayılan Professional
  const [msg, setMsg] = useState('');

  // Paket Değiştirme Modal State'i
  const [editingSchoolPackage, setEditingSchoolPackage] = useState<SchoolLicense | null>(null);
  const [newPackageChoice, setNewPackageChoice] = useState(PACKAGES[1].name);

  useEffect(() => {
    const authState = sessionStorage.getItem('super_admin_auth');
    if (authState === 'true') {
      setIsAuthenticated(true);
      loadAllData();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (inputPass === SUPER_ADMIN_PASS) {
      sessionStorage.setItem('super_admin_auth', 'true');
      setIsAuthenticated(true);
      setLoading(true);
      loadAllData();
    } else {
      setPassError('Incorrect Super Admin password. Access denied.');
    }
  };

  const loadAllData = async () => {
    await Promise.all([loadSchools(), loadInquiries()]);
    setLoading(false);
  };

  const loadSchools = async () => {
    const { data } = await supabase.from('school_licenses').select('*').order('created_at', { ascending: false });
    if (data) setSchools(data);
  };

  const loadInquiries = async () => {
    const { data } = await supabase.from('school_inquiries').select('*').order('created_at', { ascending: false });
    if (data) setInquiries(data);
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!schoolName.trim() || !coordinatorEmail.trim() || !coordinatorPassword.trim() || !joinCode.trim()) {
      alert('Please fill in all fields including temporary password.');
      return;
    }

    const pkg = PACKAGES.find(p => p.name === selectedPackage) || PACKAGES[1];

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

      // 2. Okul lisansını paket sınırlarıyla oluşturalım
      const { data: schoolData, error: schoolErr } = await supabase.from('school_licenses').insert([{
        school_name: schoolName.trim(),
        coordinator_email: coordinatorEmail.trim().toLowerCase(),
        join_code: joinCode.trim().toUpperCase(),
        teacher_limit: pkg.teachers,
        student_limit: pkg.students,
        package_name: pkg.name
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
      const { data: membership } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', school.id)
        .eq('role', 'coordinator')
        .single();

      if (membership?.user_id) {
        await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: membership.user_id })
        });
      }

      const { error } = await supabase.from('school_licenses').delete().eq('id', school.id);
      if (error) throw error;

      await loadSchools();
      alert('School license and associated coordinator account successfully removed.');
    } catch (err: any) {
      alert('Error deleting school: ' + err.message);
    }
  };

  const handleDeleteInquiry = async (inqId: string) => {
    if (!confirm('Are you sure you want to remove this inquiry?')) return;
    const { error } = await supabase.from('school_inquiries').delete().eq('id', inqId);
    if (!error) {
      await loadInquiries();
    } else {
      alert('Error deleting inquiry: ' + error.message);
    }
  };

  const handleUpdatePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchoolPackage) return;

    const pkg = PACKAGES.find(p => p.name === newPackageChoice) || PACKAGES[1];

    const { error } = await supabase
      .from('school_licenses')
      .update({
        package_name: pkg.name,
        teacher_limit: pkg.teachers,
        student_limit: pkg.students
      })
      .eq('id', editingSchoolPackage.id);

    if (error) {
      alert('Error updating package: ' + error.message);
    } else {
      alert(`Package successfully updated to "${pkg.name}"!`);
      setEditingSchoolPackage(null);
      await loadSchools();
    }
  };

  const handleResetCoordinatorPassword = async (school: SchoolLicense) => {
    const newPassword = prompt(`Enter new temporary password for coordinator "${school.coordinator_email}":`);
    if (!newPassword) return;

    try {
      const { data: membership } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', school.id)
        .eq('role', 'coordinator')
        .single();

      if (!membership?.user_id) throw new Error('Coordinator user ID not found.');

      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: membership.user_id, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Password successfully updated!\nNew Password: ${newPassword}`);
      } else {
        alert('Error: ' + (data.error || 'Could not update password.'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-rose-600 rounded-2xl mx-auto flex items-center justify-center text-xl font-black shadow-lg">⚡</div>
            <h2 className="text-xl font-black tracking-tight">Super Admin Security Portal</h2>
            <p className="text-xs text-slate-400">Please enter your master super admin security password to proceed.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter Super Admin Password"
                value={inputPass}
                onChange={e => setInputPass(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                autoFocus
              />
            </div>
            {passError && <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl font-semibold">{passError}</div>}
            <button type="submit" className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer">
              Authenticate Access ➔
            </button>
          </form>
          <div className="text-center pt-2">
            <button onClick={() => router.push('/auth')} className="text-xs text-slate-400 hover:text-white underline cursor-pointer">← Back to Auth / Login</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Super Admin...</div>;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-white shadow-sm">⚡</div>
            <span className="font-bold">System Super Admin (Platform &amp; License Management)</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportPDF}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              📥 Download Licenses PDF
            </button>
            <button 
              onClick={() => { 
                sessionStorage.removeItem('super_admin_auth');
                window.location.href = '/auth'; 
              }} 
              className="px-3 py-1.5 border text-xs bg-white rounded-lg text-slate-600 shadow-sm cursor-pointer hover:bg-slate-50 font-bold"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        
        {/* Gelen Okul Lisans Başvuruları (School Licensing Inquiries) */}
        <div className="p-6 bg-white border rounded-3xl space-y-4 shadow-sm print:hidden">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
              Incoming School Licensing Inquiries ({inquiries.length})
            </h3>
            <button onClick={loadInquiries} className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer">
              🔄 Refresh Inquiries
            </button>
          </div>

          {inquiries.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border rounded-2xl text-xs text-slate-400">
              No new school licensing requests submitted from the landing page yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inquiries.map(inq => (
                <div key={inq.id} className="p-5 border border-amber-200 rounded-2xl bg-amber-50/40 space-y-2 relative shadow-xs">
                  <button 
                    onClick={() => handleDeleteInquiry(inq.id)} 
                    className="absolute top-4 right-4 text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Dismiss ✕
                  </button>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded border border-amber-300 inline-block">
                    New Inquiry
                  </span>
                  <h4 className="font-black text-base text-slate-900 mt-1">{inq.school_name}</h4>
                  <div className="text-xs text-slate-700 space-y-1 pt-1">
                    <div>Contact Person: <b className="text-slate-900">{inq.contact_name || 'N/A'}</b></div>
                    <div>Email: <a href={`mailto:${inq.email}`} className="text-indigo-600 font-bold underline">{inq.email}</a></div>
                    <div>Phone: <b className="font-mono text-slate-900">{inq.phone || 'N/A'}</b></div>
                    <div className="text-[10px] text-slate-400 font-mono pt-1">Received: {new Date(inq.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Okul ve Lisans Oluşturma Formu */}
        <div className="p-6 bg-white border rounded-3xl space-y-4 shadow-sm print:hidden">
          <h3 className="font-bold text-sm text-slate-900">Create New Institutional School License &amp; Coordinator Account</h3>
          <form onSubmit={handleCreateSchool} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
              placeholder="Coordinator Temp Password" 
              value={coordinatorPassword} 
              onChange={e => setCoordinatorPassword(e.target.value)} 
              className="px-4 py-2.5 border rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none" 
            />
            <input 
              type="text" 
              placeholder="School Join Code (e.g. BAL-2026)" 
              value={joinCode} 
              onChange={e => setJoinCode(e.target.value)} 
              className="px-4 py-2.5 border rounded-xl text-xs uppercase bg-slate-50 text-slate-900 focus:outline-none" 
            />
            <select 
              value={selectedPackage} 
              onChange={e => setSelectedPackage(e.target.value)}
              className="px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900"
            >
              {PACKAGES.map(p => (
                <option key={p.name} value={p.name}>{p.name} ({p.teachers} Teachers / {p.students} Students)</option>
              ))}
            </select>
            <button type="submit" className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer">
              Create School &amp; Account
            </button>
          </form>
          {msg && <div className="p-3 bg-rose-50 text-xs text-rose-800 rounded-xl border border-rose-200">{msg}</div>}
        </div>

        {/* Okul Listesi (Kutucuklar / Kartlar halinde) */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">All Registered Schools ({schools.length})</h3>
          
          {schools.length === 0 ? (
            <div className="p-12 text-center bg-white border rounded-3xl text-xs text-slate-400">No schools registered yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schools.map(sc => (
                <div key={sc.id} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-md space-y-4 flex flex-col justify-between relative group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold uppercase rounded-lg border border-rose-200">
                        {sc.package_name || 'Standard Tier'}
                      </span>
                      <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs font-bold">{sc.join_code}</span>
                    </div>
                    <h4 className="font-black text-lg text-slate-900">{sc.school_name}</h4>
                    <div className="text-xs text-slate-600 space-y-1 pt-1">
                      <div>Coordinator: <b className="text-slate-900">{sc.coordinator_email}</b></div>
                      <div className="flex gap-4 pt-2 font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                        <span>👩‍🏫 Teachers: {sc.teacher_limit}</span>
                        <span>🎓 Students: {sc.student_limit}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t flex flex-wrap gap-2 print:hidden">
                    <button 
                      onClick={() => { setEditingSchoolPackage(sc); setNewPackageChoice(sc.package_name || PACKAGES[1].name); }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs cursor-pointer transition-all border border-indigo-200 flex-1"
                    >
                      Change Tier
                    </button>
                    <button 
                      onClick={() => handleResetCoordinatorPassword(sc)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs cursor-pointer transition-all border border-amber-200"
                    >
                      Reset Password
                    </button>
                    <button 
                      onClick={() => handleDeleteSchool(sc)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs cursor-pointer transition-all border border-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paket Değiştirme (Upgrade/Downgrade) Modal Penceresi */}
        {editingSchoolPackage && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-black text-base text-slate-900">Change Subscription Tier</h3>
                <button onClick={() => setEditingSchoolPackage(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
              </div>

              <div className="text-xs text-slate-600">
                School: <b className="text-slate-900">{editingSchoolPackage.school_name}</b>
              </div>

              <form onSubmit={handleUpdatePackageSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select New Tier / Package</label>
                  <select 
                    value={newPackageChoice} 
                    onChange={e => setNewPackageChoice(e.target.value)} 
                    className="w-full px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-900"
                  >
                    {PACKAGES.map(p => (
                      <option key={p.name} value={p.name}>{p.name} ({p.teachers} Teachers / {p.students} Students)</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingSchoolPackage(null)} className="px-4 py-2 border text-xs font-bold rounded-xl text-slate-600">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">Save Package</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}