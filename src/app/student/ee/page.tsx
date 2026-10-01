'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ExtendedEssay {
  id: string;
  student_id: string;
  pathway: 'subject-focused' | 'interdisciplinary';
  subject_or_subjects: string;
  interdisciplinary_framework?: string;
  research_question?: string;
  essay_title?: string; // Yeni eklenen başlık alanı
  rationale?: string;
  status: string;
}

interface RRSEntry {
  id: string;
  entry_type: 'source_note' | 'reflection' | 'ai_prompt_history' | 'idea';
  content: string;
  source_reference?: string;
  created_at: string;
}

interface ReflectionSession {
  id: string;
  session_number: number;
  session_date?: string;
  student_notes?: string;
  supervisor_comments?: string;
  is_completed: boolean;
}

const INTERDISCIPLINARY_FRAMEWORKS = [
  'Power, equality, justice',
  'Culture, identity, expression',
  'Movement, time, space',
  'Evidence, measurement, innovation',
  'Sustainability, development, change'
];

export default function StudentEEPortal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [ee, setEe] = useState<ExtendedEssay | null>(null);
  const [pathway, setPathway] = useState<'subject-focused' | 'interdisciplinary'>('subject-focused');
  const [subjectInput, setSubjectInput] = useState('');
  const [frameworkInput, setFrameworkInput] = useState(INTERDISCIPLINARY_FRAMEWORKS[0]);
  const [titleInput, setTitleInput] = useState(''); // Başlık state'i
  const [rqInput, setRqInput] = useState('');
  const [rationaleInput, setRationaleInput] = useState('');

  const [rrsEntries, setRrsEntries] = useState<RRSEntry[]>([]);
  const [rrsType, setRrsType] = useState<'source_note' | 'reflection' | 'ai_prompt_history' | 'idea'>('source_note');
  const [rrsContent, setRrsContent] = useState('');
  const [rrsSourceRef, setRrsSourceRef] = useState('');

  const [reflections, setReflections] = useState<ReflectionSession[]>([]);
  const [activeTab, setActiveTab] = useState<'proposal' | 'title_page' | 'rrs' | 'reflections' | 'bibliography' | 'draft'>('proposal');

  const [draftContent, setDraftContent] = useState('');
  const [reflectiveStatement, setReflectiveStatement] = useState('');
  const [evaluationData, setEvaluationData] = useState<any>(null);

  const [sourcesList, setSourcesList] = useState<string[]>([]);
  const [newSourceInput, setNewSourceInput] = useState('');

  useEffect(() => {
    initEEPortal();
  }, []);

  const initEEPortal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setUser(user);
    await loadStudentEEData(user.id);
    setLoading(false);
  };

  const loadStudentEEData = async (studentId: string) => {
    const { data: eeData } = await supabase
      .from('extended_essays')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (eeData) {
      setEe(eeData);
      setPathway(eeData.pathway);
      setSubjectInput(eeData.subject_or_subjects);
      if (eeData.interdisciplinary_framework) setFrameworkInput(eeData.interdisciplinary_framework);
      setTitleInput(eeData.essay_title || '');
      setRqInput(eeData.research_question || '');
      setRationaleInput(eeData.rationale || '');

      const { data: rrsData } = await supabase
        .from('ee_rrs_entries')
        .select('*')
        .eq('ee_id', eeData.id)
        .order('created_at', { ascending: false });
      if (rrsData) setRrsEntries(rrsData);

      const { data: refData } = await supabase
        .from('ee_reflections')
        .select('*')
        .eq('ee_id', eeData.id)
        .order('session_number', { ascending: true });
      if (refData) setReflections(refData);

      const { data: evalData } = await supabase
        .from('ee_evaluations')
        .select('*')
        .eq('ee_id', eeData.id)
        .single();
      if (evalData) {
        setDraftContent(evalData.draft_content || '');
        setReflectiveStatement(evalData.reflective_statement || '');
        setEvaluationData(evalData);
      }
    }
  };

  const handleCreateOrUpdateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectInput.trim() || !rqInput.trim()) {
      alert('Please fill in the subject/subjects and research question.');
      return;
    }

    const payload = {
      student_id: user.id,
      pathway,
      subject_or_subjects: subjectInput.trim(),
      interdisciplinary_framework: pathway === 'interdisciplinary' ? frameworkInput : null,
      essay_title: titleInput.trim(),
      research_question: rqInput.trim(),
      rationale: rationaleInput.trim(),
      status: 'submitted_rq'
    };

    if (ee) {
      const { error } = await supabase.from('extended_essays').update(payload).eq('id', ee.id);
      if (error) alert('Error updating proposal: ' + error.message);
      else alert('EE Proposal successfully updated!');
    } else {
      const { data, error } = await supabase.from('extended_essays').insert([payload]).select().single();
      if (error) {
        alert('Error creating proposal: ' + error.message);
      } else if (data) {
        await supabase.from('ee_reflections').insert([
          { ee_id: data.id, session_number: 1 },
          { ee_id: data.id, session_number: 2 },
          { ee_id: data.id, session_number: 3 }
        ]);
        alert('EE Proposal successfully created!');
      }
    }
    await loadStudentEEData(user.id);
  };

  const handleAddRRSEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ee || !rrsContent.trim()) return;

    const { error } = await supabase.from('ee_rrs_entries').insert([{
      ee_id: ee.id,
      entry_type: rrsType,
      content: rrsContent.trim(),
      source_reference: rrsSourceRef.trim() || null
    }]);

    if (error) {
      alert('Error adding RRS entry: ' + error.message);
    } else {
      setRrsContent('');
      setRrsSourceRef('');
      await loadStudentEEData(user.id);
    }
  };

  const handleSaveDraft = async () => {
    if (!ee) return;
    const wordCount = draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0;

    const { data: existing } = await supabase.from('ee_evaluations').select('id').eq('ee_id', ee.id).single();

    if (existing) {
      await supabase.from('ee_evaluations').update({
        draft_content: draftContent,
        word_count: wordCount,
        reflective_statement: reflectiveStatement
      }).eq('id', existing.id);
    } else {
      await supabase.from('ee_evaluations').insert([{
        ee_id: ee.id,
        draft_content: draftContent,
        word_count: wordCount,
        reflective_statement: reflectiveStatement
      }]);
    }
    alert('EE Draft and Reflective Statement saved successfully! Teacher can now view your latest draft.');
    await loadStudentEEData(user.id);
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceInput.trim()) return;
    setSourcesList(prev => [...prev, newSourceInput.trim()]);
    setNewSourceInput('');
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Extended Essay Portal...</div>;

  const wordCount = draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0;
  const reflectiveWordCount = reflectiveStatement.trim() ? reflectiveStatement.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col print:bg-white print:p-0">
      <header className="border-b bg-white sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">EE</div>
            <span className="font-bold">IBDP Extended Essay (EE) Workspace</span>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => router.push('/student')} className="px-3 py-1.5 border text-xs bg-white rounded-lg text-slate-600 shadow-sm cursor-pointer">← Back to Student Portal</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6 print:p-0 print:max-w-none">
        <div className="flex gap-2 border-b pb-4 overflow-x-auto print:hidden">
          <button onClick={() => setActiveTab('proposal')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${activeTab === 'proposal' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-slate-700'}`}>1. Proposal &amp; RQ</button>
          <button onClick={() => setActiveTab('title_page')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${activeTab === 'title_page' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-slate-700'}`}>2. Title Page &amp; Contents</button>
          <button onClick={() => setActiveTab('rrs')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${activeTab === 'rrs' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-slate-700'}`}>3. RRS &amp; AI Prompt Log</button>
          <button onClick={() => setActiveTab('reflections')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${activeTab === 'reflections' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-slate-700'}`}>4. 3 Reflections &amp; RPF</button>
          <button onClick={() => setActiveTab('bibliography')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${activeTab === 'bibliography' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-slate-700'}`}>5. APA 7 Bibliography</button>
          <button onClick={() => setActiveTab('draft')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${activeTab === 'draft' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-slate-700'}`}>6. Full Draft &amp; PDF Export</button>
        </div>

        {activeTab === 'proposal' && (
          <div className="p-8 bg-white border rounded-3xl shadow-sm space-y-6 max-w-3xl">
            <div>
              <h3 className="font-black text-base text-slate-900">Extended Essay Proposal &amp; Pathway Selection</h3>
              <p className="text-xs text-slate-500 mt-0.5">Select your research pathway and define your essay title and research question.</p>
            </div>

            <form onSubmit={handleCreateOrUpdateProposal} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pathway</label>
                  <select 
                    value={pathway} 
                    onChange={e => setPathway(e.target.value as any)}
                    className="w-full p-3 border rounded-xl text-xs bg-slate-50 font-bold"
                  >
                    <option value="subject-focused">Subject-focused Pathway</option>
                    <option value="interdisciplinary">Interdisciplinary Pathway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject(s)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. English B or Biology / Chemistry" 
                    value={subjectInput} 
                    onChange={e => setSubjectInput(e.target.value)}
                    className="w-full p-3 border rounded-xl text-xs bg-slate-50"
                  />
                </div>
              </div>

              {pathway === 'interdisciplinary' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Interdisciplinary Framework</label>
                  <select 
                    value={frameworkInput} 
                    onChange={e => setFrameworkInput(e.target.value)}
                    className="w-full p-3 border rounded-xl text-xs bg-slate-50 font-bold text-indigo-700"
                  >
                    {INTERDISCIPLINARY_FRAMEWORKS.map(fw => <option key={fw} value={fw}>{fw}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Extended Essay Title</label>
                <input 
                  type="text" 
                  placeholder="Enter a concise and academic title for your essay..." 
                  value={titleInput} 
                  onChange={e => setTitleInput(e.target.value)}
                  className="w-full p-3 border rounded-xl text-xs bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Research Question (Clear, Focused, Arguable)</label>
                <input 
                  type="text" 
                  placeholder="To what extent / How significant..." 
                  value={rqInput} 
                  onChange={e => setRqInput(e.target.value)}
                  className="w-full p-3 border rounded-xl text-xs bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rationale &amp; Approach</label>
                <textarea 
                  rows={4} 
                  placeholder="Explain why this topic is worthy of investigation and your intended research methods..." 
                  value={rationaleInput} 
                  onChange={e => setRationaleInput(e.target.value)}
                  className="w-full p-3 border rounded-xl text-xs bg-slate-50"
                />
              </div>

              <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer">
                Save &amp; Submit EE Proposal ➔
              </button>
            </form>
          </div>
        )}

        {activeTab === 'title_page' && (
          <div className="p-12 bg-white border rounded-3xl shadow-sm space-y-8 max-w-3xl mx-auto text-center font-serif">
            <div className="border-b pb-6 space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400">International Baccalaureate Diploma Programme</h4>
              <h2 className="text-xl font-bold uppercase text-slate-900">Extended Essay Title Page</h2>
            </div>

            <div className="space-y-6 text-sm text-slate-800">
              <div className="p-4 bg-slate-50 rounded-2xl border">
                <span className="block text-[10px] font-mono uppercase text-slate-400">Essay Title</span>
                <p className="font-extrabold text-lg mt-1 text-slate-900">{titleInput || 'No title defined yet.'}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border">
                <span className="block text-[10px] font-mono uppercase text-slate-400">Research Question</span>
                <p className="font-bold text-sm mt-1 text-slate-900">{rqInput || 'No research question defined yet.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border">
                  <span className="block text-[10px] font-mono uppercase text-slate-400">Pathway &amp; Subject(s)</span>
                  <p className="font-semibold mt-1">{pathway.toUpperCase()} — {subjectInput || 'N/A'}</p>
                  {pathway === 'interdisciplinary' && <p className="text-xs text-indigo-700 mt-1">Framework: {frameworkInput}</p>}
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border">
                  <span className="block text-[10px] font-mono uppercase text-slate-400">Word Count</span>
                  <p className="font-semibold mt-1">{wordCount} words (Max 4,000)</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-8 text-left space-y-4">
              <h3 className="font-black text-sm uppercase text-slate-900">Table of Contents</h3>
              <ul className="space-y-2 text-xs font-mono text-slate-700 bg-slate-50 p-6 rounded-2xl border">
                <li className="flex justify-between border-b pb-1"><span>1. Introduction</span> <span>3</span></li>
                <li className="flex justify-between border-b pb-1"><span>2. Body Paragraphs &amp; Analysis</span> <span>5</span></li>
                <li className="flex justify-between border-b pb-1"><span>3. Conclusion</span> <span>14</span></li>
                <li className="flex justify-between"><span>4. References / Bibliography (APA 7)</span> <span>15</span></li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'rrs' && (
          <div className="space-y-6 max-w-3xl">
            <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Researcher's Reflection Space (RRS) &amp; AI Prompt Log</h3>
              <p className="text-xs text-slate-500">Record your source notes, ideas, reflections, and transparent AI prompt history as required by IB academic integrity guidelines.</p>

              <form onSubmit={handleAddRRSEntry} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={rrsType} 
                    onChange={e => setRrsType(e.target.value as any)}
                    className="p-2.5 border rounded-xl text-xs bg-slate-50 font-bold"
                  >
                    <option value="source_note">Source Note / Summary</option>
                    <option value="reflection">Personal Reflection</option>
                    <option value="ai_prompt_history">AI Prompt Log (Ethical Use)</option>
                    <option value="idea">Initial Idea / Mind Map</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Source Reference / URL / Author" 
                    value={rrsSourceRef} 
                    onChange={e => setRrsSourceRef(e.target.value)}
                    className="p-2.5 border rounded-xl text-xs bg-slate-50"
                  />
                </div>
                <textarea 
                  rows={3} 
                  placeholder="Write your note, summary, or record AI prompt here..." 
                  value={rrsContent} 
                  onChange={e => setRrsContent(e.target.value)}
                  className="w-full p-3 border rounded-xl text-xs bg-slate-50"
                />
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer">Add RRS Entry</button>
              </form>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-700 uppercase">My RRS Entries ({rrsEntries.length})</h4>
              {rrsEntries.map(ent => (
                <div key={ent.id} className="p-4 bg-white border rounded-2xl space-y-1 shadow-xs">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">{ent.entry_type}</span>
                    <span className="text-slate-400">{new Date(ent.created_at).toLocaleDateString()}</span>
                  </div>
                  {ent.source_reference && <div className="text-[11px] text-slate-500 font-mono">Source: {ent.source_reference}</div>}
                  <p className="text-xs text-slate-800 whitespace-pre-line pt-1">{ent.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reflections' && (
          <div className="p-8 bg-white border rounded-3xl shadow-sm space-y-6 max-w-3xl">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">3 Mandatory Reflection Sessions &amp; RPF</h3>
              <p className="text-xs text-slate-500 mt-0.5">Record your discussion notes and exact dates for the 3 formal reflection sessions with your supervisor.</p>
            </div>

            <div className="space-y-4">
              {reflections.map((ref, idx) => (
                <div key={ref.id} className="p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg">
                        Session {ref.session_number}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900 mt-1">
                        {idx === 0 ? '1. Initial Reflection (Topic & Research Question)' : idx === 1 ? '2. Interim Reflection (Progress & Hurdles)' : '3. Final Reflection (Viva Voce)'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        value={ref.session_date ? ref.session_date.split('T')[0] : ''} 
                        onChange={async (e) => {
                          const newDate = e.target.value;
                          await supabase.from('ee_reflections').update({ session_date: newDate }).eq('id', ref.id);
                          await loadStudentEEData(user.id);
                        }}
                        className="px-3 py-1.5 border rounded-xl text-xs bg-white font-semibold"
                      />
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${ref.is_completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {ref.is_completed ? 'Completed ✓' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">My Reflection Notes for Session {ref.session_number}:</label>
                    <textarea 
                      rows={3}
                      value={ref.student_notes || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setReflections(reflections.map(r => r.id === ref.id ? { ...r, student_notes: val } : r));
                      }}
                      onBlur={async () => {
                        await supabase.from('ee_reflections').update({ student_notes: ref.student_notes }).eq('id', ref.id);
                      }}
                      placeholder={`Write your preparation and notes for Session ${ref.session_number} here...`}
                      className="w-full p-3 bg-white border rounded-2xl text-xs font-serif focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900">Final Reflective Statement (Max 500 Words)</h4>
              <p className="text-xs text-slate-500">Summarize your overall learning experience, growth, and skill transfer for Criterion E.</p>
              <textarea 
                rows={8}
                value={reflectiveStatement}
                onChange={e => setReflectiveStatement(e.target.value)}
                placeholder="Reflect on your extended essay learning experience..."
                className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-serif leading-relaxed focus:outline-none"
              />
              <div className="flex justify-between items-center text-xs font-bold">
                <span className={`${reflectiveWordCount <= 500 ? 'text-slate-600' : 'text-rose-600'}`}>{reflectiveWordCount} / 500 words</span>
                <button onClick={handleSaveDraft} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer">Save Reflective Statement</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bibliography' && (
          <div className="p-8 bg-white border rounded-3xl shadow-sm space-y-6 max-w-3xl">
            <div>
              <h3 className="font-black text-base text-slate-900">APA 7 Bibliography &amp; References Generator</h3>
              <p className="text-xs text-slate-500 mt-0.5">Paste or add your source entries here. They will automatically be formatted in APA 7 style and appended to the final PDF export.</p>
            </div>

            <form onSubmit={handleAddSource} className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. Author, A. A. (Year). Title of work. Publisher." 
                value={newSourceInput} 
                onChange={e => setNewSourceInput(e.target.value)}
                className="flex-1 p-3 border rounded-xl text-xs bg-slate-50 font-mono"
              />
              <button type="submit" className="px-5 py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer">Add Source</button>
            </form>

            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-xs text-slate-700 uppercase">Formatted References List ({sourcesList.length})</h4>
              {sourcesList.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-xl border">No references added yet.</p>
              ) : (
                <div className="p-5 bg-slate-50 border rounded-2xl space-y-3 font-serif text-xs leading-relaxed">
                  {sourcesList.map((src, idx) => (
                    <div key={idx} className="pl-6 -indent-6">
                      {idx + 1}. {src}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'draft' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
            <div className="lg:col-span-8 p-8 bg-white border rounded-3xl shadow-sm space-y-5 print:border-none print:p-0 print:shadow-none">
              <div className="flex justify-between items-center border-b pb-4 print:hidden">
                <div>
                  <h3 className="font-black text-sm text-slate-900">Extended Essay Full Draft Workspace</h3>
                  <p className="text-xs text-slate-500">Type directly below. Automatically applies 12pt font, 1.5 line spacing, and adds APA bibliography for PDF export.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDownloadPDF} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer">🖨 Download PDF</button>
                  <span className={`text-xs font-bold leading-loose ${wordCount <= 4000 ? 'text-emerald-700' : 'text-rose-600'}`}>{wordCount} words</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase print:hidden">Draft Content Editor:</label>
                <textarea 
                  rows={20}
                  value={draftContent}
                  onChange={e => setDraftContent(e.target.value)}
                  placeholder="Start writing your Extended Essay draft here (Introduction, Body, Conclusion)..."
                  className="w-full p-6 bg-white border-2 border-slate-200 rounded-2xl font-serif text-[12pt] leading-[1.5] text-slate-900 shadow-inner focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="print:hidden">
                <button onClick={handleSaveDraft} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer">
                  Save Essay Draft ➔
                </button>
              </div>

              {sourcesList.length > 0 && (
                <div className="mt-12 pt-8 border-t print:page-break-before">
                  <h3 className="font-bold text-base uppercase font-serif mb-4">References</h3>
                  <div className="font-serif text-[11pt] leading-[1.5] space-y-2">
                    {sourcesList.map((src, idx) => (
                      <div key={idx} className="pl-8 -indent-8">
                        {src}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 p-6 bg-white border rounded-3xl shadow-sm space-y-4 self-start print:hidden">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b pb-3">30-Point Assessment (Criteria A-E)</h4>
              {evaluationData ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-indigo-50 rounded-xl flex justify-between font-bold text-indigo-900">
                    <span>Criterion A (Framework):</span> <span>{evaluationData.criterion_a ?? '-'}/6</span>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl flex justify-between font-bold text-indigo-900">
                    <span>Criterion B (Knowledge):</span> <span>{evaluationData.criterion_b ?? '-'}/6</span>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl flex justify-between font-bold text-indigo-900">
                    <span>Criterion C (Analysis):</span> <span>{evaluationData.criterion_c ?? '-'}/6</span>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl flex justify-between font-bold text-indigo-900">
                    <span>Criterion D (Discussion):</span> <span>{evaluationData.criterion_d ?? '-'}/8</span>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl flex justify-between font-bold text-indigo-900">
                    <span>Criterion E (Reflection):</span> <span>{evaluationData.criterion_e ?? '-'}/4</span>
                  </div>
                  <div className="p-3.5 bg-slate-900 text-white rounded-xl flex justify-between font-black text-sm">
                    <span>Total Score:</span> 
                    <span>
                      {((evaluationData.criterion_a || 0) + (evaluationData.criterion_b || 0) + (evaluationData.criterion_c || 0) + (evaluationData.criterion_d || 0) + (evaluationData.criterion_e || 0))} / 30
                    </span>
                  </div>
                  {evaluationData.supervisor_feedback && (
                    <div className="p-3 bg-slate-50 border rounded-xl text-[11px] whitespace-pre-line text-slate-700 mt-2">
                      <b>Supervisor Guidance / Open-ended Questions:</b>
                      <p className="mt-1">{evaluationData.supervisor_feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Awaiting supervisor evaluation and feedback on your draft.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}