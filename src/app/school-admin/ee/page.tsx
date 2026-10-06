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
  rationale?: string;
  status: string;
  student_profile?: { full_name: string; email: string; class_name?: string };
  supervisor_profile?: { full_name: string; email: string };
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  class_name?: string;
  role?: string;
}

export default function SchoolAdminEEPortal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [allEssays, setAllEssays] = useState<EEOverviewItem[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);

  const [activeTab, setActiveTab] = useState<'assignments' | 'groups'>('assignments');

  // Toplu Atama Formu State'leri
  const [selectedClassFilter, setSelectedClassFilter] = useState('IBDP-1A');
  const [checkedStudentIds, setCheckedStudentIds] = useState<string[]>([]);
  const [batchSupervisorId, setBatchSupervisorId] = useState('');
  const [batchSubjectInput, setBatchSubjectInput] = useState('');
  const [batchPathwayInput, setBatchPathwayInput] = useState<'subject-focused' | 'interdisciplinary'>('subject-focused');
  const [msg, setMsg] = useState('');

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // İnceleme Modalı
  const [inspectingEE, setInspectingEE] = useState<EEOverviewItem | null>(null);
  const [rrsEntries, setRrsEntries] = useState<any[]>([]);
  const [reflections, setReflections] = useState<any[]>([]);
  const [evaluationData, setEvaluationData] = useState<any>(null);

  const classesList = ['IBDP-1A', 'IBDP-1B', 'IBDP-2A', 'IBDP-2B'];

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
    const { data: eeData } = await supabase
      .from('extended_essays')
      .select('*')
      .order('created_at', { ascending: false });

    if (eeData) {
      const enhanced = await Promise.all(eeData.map(async (ee) => {
        const { data: studentProf } = await supabase
          .from('profiles')
          .select('full_name, email, class_name')
          .eq('id', ee.student_id)
          .maybeSingle();

        let supervisorProf = null;
        if (ee.supervisor_id) {
          const { data: supData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', ee.supervisor_id)
            .maybeSingle();
          supervisorProf = supData;
        }

        return {
          ...ee,
          student_profile: studentProf || { full_name: 'Unknown Student', email: '', class_name: 'IBDP-1A' },
          supervisor_profile: supervisorProf || { full_name: 'Unassigned', email: '' }
        };
      }));

      setAllEssays(enhanced);
    }

    const { data: memberships } = await supabase
      .from('school_memberships')
      .select('user_id, role');

    const roleMap = new Map((memberships || []).map(m => [m.user_id, m.role]));

    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email, class_name')
      .order('full_name', { ascending: true });

    if (profs) {
      const studentList: UserProfile[] = [];
      const teacherList: UserProfile[] = [];

      profs.forEach(p => {
        const role = roleMap.get(p.id);
        if (role === 'teacher' || role === 'coordinator') {
          teacherList.push({ ...p, role });
        } else {
          studentList.push({ ...p, role: role || 'student' });
        }
      });

      setStudents(studentList);
      setTeachers(teacherList);
    }
  };

  const handleInspectStudent = async (ee: EEOverviewItem) => {
    setInspectingEE(ee);
    const { data: rrs } = await supabase.from('ee_rrs_entries').select('*').eq('ee_id', ee.id).order('created_at', { ascending: false });
    setRrsEntries(rrs || []);

    const { data: refs } = await supabase.from('ee_reflections').select('*').eq('ee_id', ee.id).order('session_number', { ascending: true });
    setReflections(refs || []);

    const { data: evalData } = await supabase.from('ee_evaluations').select('*').eq('ee_id', ee.id).maybeSingle();
    setEvaluationData(evalData || null);
  };

  // 🎯 TOPLU ÖĞRENCİ ATAMA (BATCH ASSIGNMENT) İŞLEMİ
  const handleBatchAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');

    if (checkedStudentIds.length === 0) {
      alert('Please select at least one student by checking the box.');
      return;
    }
    if (!batchSubjectInput.trim()) {
      alert('Please enter a subject or disciplines.');
      return;
    }

    try {
      for (const studentId of checkedStudentIds) {
        // Öğrencinin daha önce EE kaydı var mı kontrol edelim
        const { data: existing } = await supabase
          .from('extended_essays')
          .select('id')
          .eq('student_id', studentId)
          .maybeSingle();

        if (existing) {
          // Güncelle
          await supabase
            .from('extended_essays')
            .update({
              supervisor_id: batchSupervisorId || null,
              subject_or_subjects: batchSubjectInput.trim(),
              pathway: batchPathwayInput
            })
            .eq('id', existing.id);
        } else {
          // Yeni ekle
          const { data: newEE, error: insErr } = await supabase
            .from('extended_essays')
            .insert([{
              student_id: studentId,
              supervisor_id: batchSupervisorId || null,
              subject_or_subjects: batchSubjectInput.trim(),
              pathway: batchPathwayInput,
              status: 'draft'
            }])
            .select()
            .single();

          if (!insErr && newEE) {
            await supabase.from('ee_reflections').insert([
              { ee_id: newEE.id, session_number: 1 },
              { ee_id: newEE.id, session_number: 2 },
              { ee_id: newEE.id, session_number: 3 }
            ]);
          }
        }
      }

      alert(`Successfully assigned ${checkedStudentIds.length} students to supervisor & subject!`);
      setCheckedStudentIds([]);
      setBatchSubjectInput('');
      setBatchSupervisorId('');
      await loadData();
    } catch (err: any) {
      alert('Error during batch assignment: ' + err.message);
    }
  };

  const handleToggleCheckAll = (classStudents: UserProfile[]) => {
    const classStudentIds = classStudents.map(s => s.id);
    const allChecked = classStudentIds.every(id => checkedStudentIds.includes(id));
    if (allChecked) {
      setCheckedStudentIds(checkedStudentIds.filter(id => !classStudentIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...checkedStudentIds, ...classStudentIds]));
      setCheckedStudentIds(merged);
    }
  };

  const handleToggleCheckStudent = (studentId: string) => {
    if (checkedStudentIds.includes(studentId)) {
      setCheckedStudentIds(checkedStudentIds.filter(id => id !== studentId));
    } else {
      setCheckedStudentIds([...checkedStudentIds, studentId]);
    }
  };

  const handleAssignSupervisor = async (eeId: string, supervisorId: string) => {
    const supIdVal = supervisorId === '' ? null : supervisorId;
    const { error } = await supabase
      .from('extended_essays')
      .update({ supervisor_id: supIdVal })
      .eq('id', eeId);

    if (error) alert('Error assigning supervisor: ' + error.message);
    else await loadData();
  };

  const handleEditEE = async (ee: EEOverviewItem) => {
    const newSubject = prompt('Edit Subject or Disciplines:', ee.subject_or_subjects);
    if (newSubject === null) return;

    const newPathway = prompt('Edit Pathway ("subject-focused" or "interdisciplinary"):', ee.pathway);
    if (newPathway === null) return;

    const { error } = await supabase
      .from('extended_essays')
      .update({ subject_or_subjects: newSubject.trim() || ee.subject_or_subjects, pathway: newPathway })
      .eq('id', ee.id);

    if (error) alert('Error: ' + error.message);
    else await loadData();
  };

  const handleDeleteEE = async (eeId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from the EE portal?`)) return;
    await supabase.from('ee_reflections').delete().eq('ee_id', eeId);
    await supabase.from('ee_rrs_entries').delete().eq('ee_id', eeId);
    await supabase.from('ee_evaluations').delete().eq('ee_id', eeId);
    await supabase.from('extended_essays').delete().eq('id', eeId);
    await loadData();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-600">Loading School Admin EE Command Center...</div>;

  const filteredEssays = allEssays.filter(ee => {
    const matchesStatus = filterStatus === 'all' || ee.status === filterStatus;
    const matchesSearch = 
      ee.student_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ee.subject_or_subjects?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ee.research_question?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const studentsInSelectedClass = students.filter(st => (st.class_name || 'IBDP-1A') === selectedClassFilter);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col relative">
      {/* İnceleme Modalı */}
      {inspectingEE && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold border border-indigo-200">Coordinator Inspection Mode</span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{inspectingEE.student_profile?.full_name}'s Extended Essay</h3>
              </div>
              <button onClick={() => setInspectingEE(null)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer">Close ✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border space-y-1">
                <span className="font-bold text-slate-400 block text-[10px] uppercase">Subject &amp; Pathway</span>
                <div className="font-bold text-slate-800">{inspectingEE.subject_or_subjects} ({inspectingEE.pathway})</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border space-y-1">
                <span className="font-bold text-slate-400 block text-[10px] uppercase">Research Question</span>
                <p className="font-serif text-slate-900 font-semibold mt-1">"{inspectingEE.research_question || 'No research question defined.'}"</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border space-y-2">
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">RRS Entries ({rrsEntries.length})</span>
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {rrsEntries.map(e => (
                      <div key={e.id} className="p-2 bg-white rounded border text-[11px]">
                        <span className="font-bold text-indigo-700 uppercase">{e.entry_type}</span>: {e.content}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border space-y-2">
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Reflections ({reflections.length})</span>
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {reflections.map(r => (
                      <div key={r.id} className="p-2 bg-white rounded border text-[11px]">
                        <div className="font-bold text-slate-800">Session {r.session_number}</div>
                        <p className="text-slate-600">{r.student_notes || 'Pending.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button onClick={() => setInspectingEE(null)} className="px-6 py-2.5 bg-indigo-900 text-white font-bold text-xs rounded-xl cursor-pointer">Close Inspection</button>
            </div>
          </div>
        </div>
      )}

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
        
        {/* İstatistikler */}
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

        {/* Sekmeler */}
        <div className="flex items-center gap-3 border-b pb-4">
          <button 
            onClick={() => setActiveTab('assignments')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'assignments' ? 'bg-indigo-900 text-white shadow-md' : 'bg-white text-slate-600 border'}`}
          >
            🎯 Sınıf Bazlı Toplu Atama &amp; Yönetim
          </button>
          <button 
            onClick={() => setActiveTab('groups')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'groups' ? 'bg-indigo-900 text-white shadow-md' : 'bg-white text-slate-600 border'}`}
          >
            👥 Öğretmen Grupları (Supervisors)
          </button>
        </div>

        {/* 🎯 SINIF SEÇMELİ TOPLU ÖĞRENCİ ATAMA PANELİ */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="p-8 bg-white border rounded-3xl shadow-sm space-y-6">
              <div className="border-b pb-4">
                <span className="text-[10px] font-mono uppercase bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold border border-indigo-200">Batch Assignment Wizard</span>
                <h3 className="font-extrabold text-base text-slate-900 mt-2">Class-Based Multi-Student Assignment</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select a class, check multiple students, and assign them simultaneously to a supervisor and subject.</p>
              </div>

              <form onSubmit={handleBatchAssign} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">1. Select Class</label>
                    <select 
                      value={selectedClassFilter} 
                      onChange={e => { setSelectedClassFilter(e.target.value); setCheckedStudentIds([]); }}
                      className="w-full p-3 border rounded-xl text-xs bg-slate-50 font-bold"
                    >
                      {classesList.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">2. Subject or Disciplines</label>
                    <input 
                      type="text" 
                      placeholder="e.g. English B / History" 
                      value={batchSubjectInput} 
                      onChange={e => setBatchSubjectInput(e.target.value)}
                      className="w-full p-3 border rounded-xl text-xs bg-slate-50 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">3. Pathway Type</label>
                    <select 
                      value={batchPathwayInput} 
                      onChange={e => setBatchPathwayInput(e.target.value as any)}
                      className="w-full p-3 border rounded-xl text-xs bg-slate-50 font-bold"
                    >
                      <option value="subject-focused">Subject-focused</option>
                      <option value="interdisciplinary">Interdisciplinary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">4. Supervisor Teacher</label>
                    <select 
                      value={batchSupervisorId} 
                      onChange={e => setBatchSupervisorId(e.target.value)}
                      className="w-full p-3 border rounded-xl text-xs bg-slate-50 font-bold text-indigo-900"
                    >
                      <option value="">-- Select Supervisor --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sınıftaki Öğrenciler Listesi ve Tik Kutuları */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Students in {selectedClassFilter} ({studentsInSelectedClass.length} available)
                    </span>
                    <button 
                      type="button" 
                      onClick={() => handleToggleCheckAll(studentsInSelectedClass)}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Select All / Deselect All in {selectedClassFilter}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-2xl border">
                    {studentsInSelectedClass.length === 0 ? (
                      <p className="col-span-3 text-xs text-slate-400 italic py-6 text-center">No students found registered in {selectedClassFilter}.</p>
                    ) : (
                      studentsInSelectedClass.map(st => {
                        const isChecked = checkedStudentIds.includes(st.id);
                        return (
                          <div 
                            key={st.id} 
                            onClick={() => handleToggleCheckStudent(st.id)}
                            className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${isChecked ? 'bg-indigo-50 border-indigo-300 shadow-xs' : 'bg-white border-slate-200'}`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => {}} 
                              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                            />
                            <div className="overflow-hidden">
                              <div className="font-bold text-xs text-slate-900 truncate">{st.full_name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{st.email}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-indigo-700">
                    ✓ {checkedStudentIds.length} student(s) selected for assignment.
                  </span>
                  <button type="submit" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer">
                    Apply Batch Assignment ➔
                  </button>
                </div>
              </form>

              {msg && <div className="p-3 bg-indigo-50 text-xs text-indigo-800 rounded-xl border border-indigo-200">{msg}</div>}
            </div>

            {/* Kayıtlı EE Listesi ve Tablo */}
            <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b pb-4">
                <input 
                  type="text" 
                  placeholder="Search students, subjects, research questions..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full md:w-80 p-3 border rounded-xl text-xs bg-slate-50"
                />
                <select 
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full md:w-auto p-3 border rounded-xl text-xs bg-slate-50 font-bold"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted_rq">Submitted RQ</option>
                  <option value="approved_rq">Approved RQ</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="p-4">Student</th>
                      <th className="p-4">Class</th>
                      <th className="p-4">Subject &amp; Pathway</th>
                      <th className="p-4">Research Question</th>
                      <th className="p-4">Supervisor</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {filteredEssays.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400 italic">No extended essays found.</td>
                      </tr>
                    ) : (
                      filteredEssays.map(ee => (
                        <tr key={ee.id} className="hover:bg-slate-50">
                          <td className="p-4 align-top font-bold text-slate-900">
                            {ee.student_profile?.full_name}
                            <div className="text-[10px] text-slate-400 font-mono">{ee.student_profile?.email}</div>
                          </td>
                          <td className="p-4 align-top">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border">
                              {ee.student_profile?.class_name || 'IBDP-1A'}
                            </span>
                          </td>
                          <td className="p-4 align-top">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border">{ee.pathway}</span>
                            <div className="font-semibold text-slate-800 mt-1">{ee.subject_or_subjects}</div>
                          </td>
                          <td className="p-4 align-top max-w-xs font-serif italic text-slate-700">
                            "{ee.research_question || 'Pending RQ'}"
                          </td>
                          <td className="p-4 align-top">
                            <select 
                              value={ee.supervisor_id || ''}
                              onChange={(e) => handleAssignSupervisor(ee.id, e.target.value)}
                              className="p-2 border rounded-xl text-xs bg-white font-bold text-indigo-900 shadow-xs"
                            >
                              <option value="">-- Assign --</option>
                              {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.full_name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-4 align-top">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                              {ee.status}
                            </span>
                          </td>
                          <td className="p-4 align-top text-right space-x-1.5">
                            <button onClick={() => handleInspectStudent(ee)} className="px-2.5 py-1 bg-slate-900 text-white rounded-lg font-bold text-[11px] cursor-pointer">Inspect</button>
                            <button onClick={() => handleEditEE(ee)} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-[11px] border cursor-pointer">Edit</button>
                            <button onClick={() => handleDeleteEE(ee.id, ee.student_profile?.full_name || 'Student')} className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold text-[11px] border cursor-pointer">Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Öğretmen Grupları Sekmesi */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="p-6 bg-white border rounded-3xl shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-900">Teacher Supervisory Groups</h3>
              <p className="text-xs text-slate-500 mt-0.5">Hierarchical view of supervisors and their supervised students across classes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teachers.map(t => {
                const supervised = allEssays.filter(ee => ee.supervisor_id === t.id);
                return (
                  <div key={t.id} className="p-6 bg-white border rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900">{t.full_name}</h4>
                        <p className="text-[11px] text-slate-500">{t.email}</p>
                      </div>
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border">
                        {supervised.length} Students
                      </span>
                    </div>

                    <div className="space-y-2">
                      {supervised.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No students assigned yet.</p>
                      ) : (
                        supervised.map(st => (
                          <div key={st.id} className="p-3 bg-slate-50 border rounded-2xl flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-slate-900">{st.student_profile?.full_name} ({st.student_profile?.class_name || 'IBDP-1A'})</div>
                              <div className="text-[11px] text-slate-500">{st.subject_or_subjects}</div>
                            </div>
                            <button onClick={() => handleInspectStudent(st)} className="text-indigo-600 font-bold hover:underline cursor-pointer">Inspect ➔</button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}