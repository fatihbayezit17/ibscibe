'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface EEOverviewItem {
  id: string;
  student_id: string;
  supervisor_id?: string;
  pathway: 'subject-focused' | 'interdisciplinary';
  subject_or_subjects: string;
  essay_title?: string;
  research_question?: string;
  status: string;
  student_profile?: { full_name: string; email: string };
  supervisor_profile?: { full_name: string; email: string };
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role?: string;
}

export default function SchoolAdminEEPortal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [allEssays, setAllEssays] = useState<EEOverviewItem[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);

  // Yeni EE Eşleştirme / Ekleme State'leri
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [pathwayInput, setPathwayInput] = useState<'subject-focused' | 'interdisciplinary'>('subject-focused');

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    initAdminPortal();
  }, []);

  const initAdminPortal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setUser(user);
    await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    // 1. Mevcut EE kayıtlarını çek
    const { data: eeData } = await supabase
      .from('extended_essays')
      .select('*')
      .order('created_at', { ascending: false });

    if (eeData) {
      const enhanced = await Promise.all(eeData.map(async (ee) => {
        const { data: studentProf } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', ee.student_id)
          .single();

        let supervisorProf = null;
        if (ee.supervisor_id) {
          const { data: supData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', ee.supervisor_id)
            .single();
          supervisorProf = supData;
        }

        return {
          ...ee,
          student_profile: studentProf || { full_name: 'Unknown Student', email: '' },
          supervisor_profile: supervisorProf || { full_name: 'Unassigned', email: '' }
        };
      }));

      setAllEssays(enhanced);
    }

    // 2. Tüm profilleri çek (Öğrenci ve Öğretmen ayrımı için)
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name', { ascending: true });

    if (profs) {
      // Okul üyelik rollerine göre filtreleyebiliriz ya da genel profilleri listeleyebiliriz
      const { data: memberships } = await supabase
        .from('school_memberships')
        .select('user_id, role');

      const roleMap = new Map((memberships || []).map(m => [m.user_id, m.role]));

      const studentList: UserProfile[] = [];
      const teacherList: UserProfile[] = [];

      profs.forEach(p => {
        const role = roleMap.get(p.id);
        if (role === 'student') studentList.push({ ...p, role });
        else if (role === 'teacher' || role === 'coordinator') teacherList.push({ ...p, role });
        else {
          // Rolü henüz atanmamışsa genel listeye ekleyelim
          studentList.push(p);
          teacherList.push(p);
        }
      });

      setStudents(studentList);
      setTeachers(teacherList);
    }
  };

  const handleCreateNewEEAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!selectedStudentId || !subjectInput.trim()) {
      alert('Please select a student and enter at least a subject.');
      return;
    }

    // Bu öğrencinin zaten bir EE kaydı var mı kontrol edelim
    const { data: existing } = await supabase
      .from('extended_essays')
      .select('id')
      .eq('student_id', selectedStudentId)
      .maybeSingle();

    if (existing) {
      // Varsa güncelle
      const { error } = await supabase
        .from('extended_essays')
        .update({
          supervisor_id: selectedSupervisorId || null,
          subject_or_subjects: subjectInput.trim(),
          pathway: pathwayInput
        })
        .eq('id', existing.id);

      if (error) alert('Error updating EE assignment: ' + error.message);
      else {
        alert('EE assignment successfully updated!');
        setSelectedStudentId('');
        setSelectedSupervisorId('');
        setSubjectInput('');
        await loadData();
      }
    } else {
      // Yoksa yeni oluştur
      const { data: newEE, error } = await supabase
        .from('extended_essays')
        .insert([{
          student_id: selectedStudentId,
          supervisor_id: selectedSupervisorId || null,
          subject_or_subjects: subjectInput.trim(),
          pathway: pathwayInput,
          status: 'draft'
        }])
        .select()
        .single();

      if (error) {
        alert('Error creating EE record: ' + error.message);
      } else if (newEE) {
        // 3 varsayılan yansıma oturumunu da oluşturalım
        await supabase.from('ee_reflections').insert([
          { ee_id: newEE.id, session_number: 1 },
          { ee_id: newEE.id, session_number: 2 },
          { ee_id: newEE.id, session_number: 3 }
        ]);

        alert('New student successfully added to EE portal and assigned!');
        setSelectedStudentId('');
        setSelectedSupervisorId('');
        setSubjectInput('');
        await loadData();
      }
    }
  };

  const handleAssignSupervisor = async (eeId: string, supervisorId: string) => {
    const supIdVal = supervisorId === '' ? null : supervisorId;
    const { error } = await supabase
      .from('extended_essays')
      .update({ supervisor_id: supIdVal })
      .eq('id', eeId);

    if (error) {
      alert('Error assigning supervisor: ' + error.message);
    } else {
      alert('Supervisor successfully updated!');
      await loadData();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-600">Loading School Admin EE Command Center...</div>;

  const filteredEssays = allEssays.filter(ee => {
    const matchesStatus = filterStatus === 'all' || ee.status === filterStatus;
    const matchesSearch = 
      ee.student_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ee.subject_or_subjects?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ee.essay_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ee.research_question?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-900 flex items-center justify-center font-black text-white shadow-sm">ADM</div>
            <span className="font-black text-sm tracking-wide">School Admin Extended Essay Command Center</span>
          </div>
          <button onClick={() => router.push('/school-admin')} className="px-3 py-1.5 border text-xs bg-white rounded-lg text-slate-600 shadow-sm cursor-pointer hover:bg-slate-50">← Back to School Admin Portal</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total EE Students</span>
            <div className="text-2xl font-black text-slate-900">{allEssays.length}</div>
          </div>
          <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Approved RQs</span>
            <div className="text-2xl font-black text-emerald-600">{allEssays.filter(e => e.status === 'approved_rq').length}</div>
          </div>
          <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Pending Approval</span>
            <div className="text-2xl font-black text-amber-600">{allEssays.filter(e => e.status === 'submitted_rq').length}</div>
          </div>
          <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Assigned Supervisors</span>
            <div className="text-2xl font-black text-indigo-600">{allEssays.filter(e => e.supervisor_id).length} / {allEssays.length}</div>
          </div>
        </div>

        {/* Yeni Öğrenciyi EE Portalına Ekleme ve Danışman Atama Formu */}
        <div className="p-8 bg-white border rounded-3xl shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Add Student to EE Portal &amp; Assign Supervisor</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select a registered student from your school, choose their subject/pathway, and assign an EE supervisor teacher.</p>
          </div>

          <form onSubmit={handleCreateNewEEAssignment} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Student</label>
              <select 
                value={selectedStudentId} 
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 font-medium"
              >
                <option value="">-- Select Student --</option>
                {students.map(st => (
                  <option key={st.id} value={st.id}>{st.full_name} ({st.email})</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Pathway &amp; Subject</label>
              <input 
                type="text" 
                placeholder="e.g. English B / History" 
                value={subjectInput} 
                onChange={e => setSubjectInput(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 font-medium"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Pathway Type</label>
              <select 
                value={pathwayInput} 
                onChange={e => setPathwayInput(e.target.value as any)}
                className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 font-bold"
              >
                <option value="subject-focused">Subject-focused</option>
                <option value="interdisciplinary">Interdisciplinary</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Supervisor Teacher</label>
              <select 
                value={selectedSupervisorId} 
                onChange={e => setSelectedSupervisorId(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 font-bold text-indigo-900"
              >
                <option value="">-- Assign Supervisor --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer">
                Add / Assign EE ➔
              </button>
            </div>
          </form>
          {msg && <div className="p-3 bg-indigo-50 text-xs text-indigo-800 rounded-xl border border-indigo-200">{msg}</div>}
        </div>

        {/* Filtreleme ve Arama Alanı */}
        <div className="p-6 bg-white border rounded-3xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-96">
            <input 
              type="text" 
              placeholder="Search by student, subject, title, or RQ..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full p-3 border rounded-xl text-xs bg-slate-50 font-medium"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="p-3 border rounded-xl text-xs bg-slate-50 font-bold"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted_rq">Submitted RQ (Pending)</option>
              <option value="approved_rq">Approved RQ</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Öğrenci ve EE Özet Tablosu */}
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-slate-900">Active Extended Essay Working Groups &amp; Assignments</h3>
            <span className="text-xs font-bold text-slate-500">Showing {filteredEssays.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="p-4">Student</th>
                  <th className="p-4">Pathway &amp; Subject</th>
                  <th className="p-4">Essay Title &amp; Research Question</th>
                  <th className="p-4">Assigned Supervisor</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {filteredEssays.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">No extended essays found matching your criteria.</td>
                  </tr>
                ) : (
                  filteredEssays.map(ee => (
                    <tr key={ee.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 align-top">
                        <div className="font-extrabold text-slate-900">{ee.student_profile?.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{ee.student_profile?.email}</div>
                      </td>
                      <td className="p-4 align-top">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-1">
                          {ee.pathway}
                        </span>
                        <div className="font-bold text-slate-800">{ee.subject_or_subjects}</div>
                      </td>
                      <td className="p-4 align-top max-w-xs">
                        <div className="font-bold text-slate-900">{ee.essay_title || 'Untitled Essay'}</div>
                        <div className="text-slate-600 font-serif italic mt-1 bg-slate-50 p-2 rounded-xl border">
                          "{ee.research_question || 'No research question defined yet.'}"
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <select 
                          value={ee.supervisor_id || ''}
                          onChange={(e) => handleAssignSupervisor(ee.id, e.target.value)}
                          className="p-2 border rounded-xl text-xs bg-white font-bold text-indigo-900 shadow-xs"
                        >
                          <option value="">-- Assign Supervisor --</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 align-top">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${ee.status === 'approved_rq' ? 'bg-emerald-100 text-emerald-800' : ee.status === 'submitted_rq' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                          {ee.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}