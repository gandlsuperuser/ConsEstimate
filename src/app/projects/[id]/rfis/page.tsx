'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RFI, Project } from '@/types';
import Image from 'next/image';

export default function RFIsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();

  const [rfis, setRfis] = useState<RFI[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRFI, setSelectedRFI] = useState<RFI | null>(null);
  const [viewMode, setViewMode] = useState<'register' | 'transmittal'>('register');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form State for RFI Transmittal (Matches uploaded PDF document exactly)
  const [transmittalForm, setTransmittalForm] = useState({
    rfi_number: 'RFI-042',
    transmittal_id: 'TR-2024-042',
    date: new Date().toISOString().split('T')[0],
    subject: 'RTU-1 Curb Opening Dimension vs Mechanical Supply Duct Penetration',
    rfi_type: 'Design Clarification / Structural Coordination',
    purpose: 'For Engineering Review & Directive',
    via: 'Submittal Portal / Email',
    question:
      'Per Mechanical drawing M-201, the Trane Voyager 25-ton RTU-1 requires a 54" x 72" structural roof opening. However, Architectural drawing A-101 and Structural S-102 currently show a 48" x 60" opening between structural beams Grid B-2. Please clarify if the structural header angles can be widened by 6" on the north side without reinforcing adjacent joists.',
    suggestion:
      'Weld two (2) additional L4x4x3/8 structural steel angles across joists J-4 and J-5 per detail 4/S-501 to support the 54"x72" curb without altering main roof pitch.',
    official_response:
      'Approved as suggested. Contractor is authorized to install L4x4x3/8 cross angles per detail 4/S-501. Maintain 1/2" pitch for positive drainage. Proceed with submittal SUB-23-001.',
    cost_impact_choice: 'Yes' as 'Yes' | 'No' | 'TBD',
    cost_impact_estimate: 2500,
    schedule_impact_choice: 'No' as 'Yes' | 'No' | 'TBD',
    schedule_impact_days: 0,
    drawing_spec_ref: 'M-201, S-102 (Detail 4/S-501), Spec Section 23 00 00',
    attachments: 'Trane Voyager Curb Dimension Sheet (SUB-23-001) & Structural Photo',
    assigned_to: 'Apex Engineering Group (Structural & MEP)',
  });

  const fetchProjectAndRFIs = async () => {
    try {
      const [projRes, rfiRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/rfis?projectId=${projectId}`),
      ]);
      const projData = await projRes.json();
      const rfiData = await rfiRes.json();

      setProject(projData.project || null);
      const list: RFI[] = rfiData.rfis || [];

      if (list.length === 0) {
        // Initialize default sample RFI matching the BTX Transmittal standard
        const defaultRfi: RFI = {
          id: 'rfi-42',
          project_id: projectId,
          rfi_number: 'RFI-042',
          transmittal_id: 'TR-2024-042',
          subject: 'RTU-1 Curb Opening Dimension vs Mechanical Supply Duct Penetration',
          question:
            'Per Mechanical drawing M-201, the Trane Voyager 25-ton RTU-1 requires a 54" x 72" structural roof opening. However, Architectural drawing A-101 and Structural S-102 currently show a 48" x 60" opening between structural beams Grid B-2. Please clarify if the structural header angles can be widened by 6" on the north side without reinforcing adjacent joists.',
          suggestion:
            'Weld two (2) additional L4x4x3/8 structural steel angles across joists J-4 and J-5 per detail 4/S-501 to support the 54"x72" curb without altering main roof pitch.',
          official_response:
            'Approved as suggested. Contractor is authorized to install L4x4x3/8 cross angles per detail 4/S-501. Maintain 1/2" pitch for positive drainage. Proceed with submittal SUB-23-001.',
          rfi_type: 'Design Clarification / Structural Coordination',
          purpose: 'For Engineering Review & Directive',
          via: 'Submittal Portal / Email',
          cost_impact_choice: 'Yes',
          cost_impact_estimate: 2500,
          schedule_impact_choice: 'No',
          schedule_impact_days: 0,
          drawing_spec_ref: 'M-201, S-102 (Detail 4/S-501), Spec Section 23 00 00',
          attachments: 'Trane Voyager Curb Dimension Sheet (SUB-23-001) & Structural Photo',
          assigned_to: 'Apex Engineering Group (Structural & MEP)',
          status: 'responded',
          has_change_event: true,
          created_at: new Date().toISOString(),
        };
        setRfis([defaultRfi]);
        setSelectedRFI(defaultRfi);
      } else {
        setRfis(list);
        setSelectedRFI(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAndRFIs();
  }, [projectId]);

  const handleSaveTransmittal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isCreatingNew) {
        const res = await fetch('/api/rfis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...transmittalForm,
            project_id: projectId,
          }),
        });
        if (res.ok) {
          setIsCreatingNew(false);
          await fetchProjectAndRFIs();
          setViewMode('register');
        }
      } else if (selectedRFI) {
        const res = await fetch('/api/rfis', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedRFI.id,
            ...transmittalForm,
            status: transmittalForm.official_response ? 'responded' : 'open',
          }),
        });
        if (res.ok) {
          await fetchProjectAndRFIs();
          alert('RFI Transmittal updated successfully!');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openNewTransmittal = () => {
    setIsCreatingNew(true);
    setTransmittalForm({
      rfi_number: `RFI-0${rfis.length + 43}`,
      transmittal_id: `TR-2024-0${rfis.length + 43}`,
      date: new Date().toISOString().split('T')[0],
      subject: '',
      rfi_type: 'Design Clarification',
      purpose: 'For Review & Approval',
      via: 'Email / Portal',
      question: '',
      suggestion: '',
      official_response: '',
      cost_impact_choice: 'TBD',
      cost_impact_estimate: 0,
      schedule_impact_choice: 'TBD',
      schedule_impact_days: 0,
      drawing_spec_ref: '',
      attachments: '',
      assigned_to: 'Apex Engineering Group',
    });
    setViewMode('transmittal');
  };

  const viewRfiTransmittal = (rfi: RFI) => {
    setSelectedRFI(rfi);
    setIsCreatingNew(false);
    setTransmittalForm({
      rfi_number: rfi.rfi_number,
      transmittal_id: rfi.transmittal_id || `TR-${rfi.rfi_number.replace('RFI-', '')}`,
      date: rfi.created_at ? rfi.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      subject: rfi.subject,
      rfi_type: rfi.rfi_type || 'Design Clarification',
      purpose: rfi.purpose || 'For Review & Directive',
      via: rfi.via || 'Submittal Portal / Email',
      question: rfi.question,
      suggestion: rfi.suggestion || '',
      official_response: rfi.official_response || '',
      cost_impact_choice: rfi.cost_impact_choice || (rfi.cost_impact_estimate ? 'Yes' : 'No'),
      cost_impact_estimate: rfi.cost_impact_estimate || 0,
      schedule_impact_choice: rfi.schedule_impact_choice || (rfi.schedule_impact_days ? 'Yes' : 'No'),
      schedule_impact_days: rfi.schedule_impact_days || 0,
      drawing_spec_ref: rfi.drawing_spec_ref || rfi.drawing_number || rfi.spec_section || '',
      attachments: rfi.attachments || 'Submittal cut sheets & CAD details',
      assigned_to: rfi.assigned_to || 'Apex Engineering Group',
    });
    setViewMode('transmittal');
  };

  const handleConvertToChangeEvent = async (rfi: RFI) => {
    try {
      const res = await fetch('/api/rfis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'convert_to_change_event',
          rfi_id: rfi.id,
          project_id: projectId,
          title: `Change Event: ${rfi.subject}`,
          estimated_cost: rfi.cost_impact_estimate || 2500,
          schedule_delay_days: rfi.schedule_impact_days || 0,
        }),
      });
      if (res.ok) {
        alert('RFI successfully converted to Change Event! Redirecting...');
        router.push(`/projects/${projectId}/change-events`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & View Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">RFI Management & Transmittals</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 5: Field Communications
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            BTX Contractors official RFI Transmittal document format, engineering responses, and 1-click Change Event conversion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1 border border-procore-border-light text-xs font-bold">
            <button
              onClick={() => setViewMode('register')}
              className={`px-3 py-1.5 rounded transition-all ${
                viewMode === 'register'
                  ? 'bg-white text-procore-text shadow-2xs font-bold'
                  : 'text-procore-text-muted hover:text-procore-text'
              }`}
            >
              📋 RFI Register
            </button>
            <button
              onClick={() => {
                if (selectedRFI) viewRfiTransmittal(selectedRFI);
                else setViewMode('transmittal');
              }}
              className={`px-3 py-1.5 rounded transition-all ${
                viewMode === 'transmittal'
                  ? 'bg-white text-procore-orange shadow-2xs font-bold'
                  : 'text-procore-text-muted hover:text-procore-text'
              }`}
            >
              📄 RFI Transmittal Letterhead
            </button>
          </div>

          <button
            onClick={openNewTransmittal}
            className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <span>+</span> Create RFI Transmittal
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: RFI REGISTER (PROCORE TABLE) */}
      {viewMode === 'register' && (
        <div className="space-y-6 print:hidden">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total RFIs</p>
              <p className="text-2xl font-bold text-procore-text mt-1">{rfis.length}</p>
              <p className="text-[11px] text-procore-text-muted mt-0.5">{rfis.filter(r => r.has_change_event).length} Linked to Change Events</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Open / Awaiting Response</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{rfis.filter(r => r.status === 'open').length}</p>
              <p className="text-[11px] text-procore-text-muted mt-0.5">In design review</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Responded & Closed</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{rfis.filter(r => r.status === 'responded' || r.status === 'closed').length}</p>
              <p className="text-[11px] text-procore-text-muted mt-0.5">Directive received</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Est. Cost Impact</p>
              <p className="text-2xl font-bold text-procore-orange mt-1">
                ${rfis.reduce((acc, r) => acc + (r.cost_impact_estimate || 0), 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-procore-text-muted mt-0.5">Potential change scope</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
            <div className="p-4 border-b border-procore-border bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-sm font-bold text-procore-text">RFI Register ({rfis.length})</h2>
              <span className="text-xs text-procore-text-muted">Click any row to open the full BTX RFI Transmittal document</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100/80 border-b border-procore-border text-procore-text-muted">
                    <th className="p-3 text-left font-bold">RFI #</th>
                    <th className="p-3 text-left font-bold">Subject / Question</th>
                    <th className="p-3 text-left font-bold">Assigned To</th>
                    <th className="p-3 text-center font-bold">Drawing / Spec</th>
                    <th className="p-3 text-right font-bold">Cost Impact</th>
                    <th className="p-3 text-center font-bold">Sched. Impact</th>
                    <th className="p-3 text-center font-bold">Status</th>
                    <th className="p-3 text-center font-bold">Transmittal Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-procore-border-light">
                  {rfis.map((r) => {
                    const isResponded = r.status === 'responded' || r.status === 'closed';
                    return (
                      <tr
                        key={r.id}
                        onClick={() => viewRfiTransmittal(r)}
                        className="hover:bg-gray-50/70 cursor-pointer transition-colors"
                      >
                        <td className="p-3 font-bold text-procore-orange whitespace-nowrap">{r.rfi_number}</td>
                        <td className="p-3 max-w-[320px]">
                          <div className="font-bold text-procore-text text-sm">{r.subject}</div>
                          <div className="text-procore-text-secondary text-[11px] line-clamp-2 mt-0.5">{r.question}</div>
                          {r.official_response && (
                            <div className="mt-1.5 p-2 bg-emerald-50/80 border border-emerald-200 rounded text-emerald-900 text-[11px]">
                              <span className="font-bold">Official Response: </span>
                              {r.official_response}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-procore-text-secondary font-medium">{r.assigned_to}</td>
                        <td className="p-3 text-center text-procore-text-muted font-medium">{r.drawing_spec_ref || r.drawing_number || '—'}</td>
                        <td className="p-3 text-right font-bold text-procore-text">
                          {r.cost_impact_estimate ? `$${r.cost_impact_estimate.toLocaleString()}` : '$0'}
                        </td>
                        <td className="p-3 text-center font-semibold text-procore-text-muted">
                          {r.schedule_impact_days ? `+${r.schedule_impact_days} days` : '0 days'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isResponded ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-center space-y-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => viewRfiTransmittal(r)}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1 rounded block w-full shadow-2xs"
                          >
                            📄 View Transmittal
                          </button>
                          {r.has_change_event ? (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded block">
                              ✓ Linked to CE
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConvertToChangeEvent(r)}
                              className="bg-procore-orange hover:bg-procore-orange-hover text-white font-bold text-[10px] px-2.5 py-1 rounded block w-full shadow-2xs"
                            >
                              + Convert to CE
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: EXACT BTX RFI TRANSMITTAL DOCUMENT FORM */}
      {viewMode === 'transmittal' && (
        <div className="space-y-4">
          {/* Top Bar for Transmittal */}
          <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg border border-procore-border print:hidden">
            <button
              onClick={() => setViewMode('register')}
              className="text-xs font-bold text-procore-text hover:text-procore-orange flex items-center gap-1.5"
            >
              ← Back to RFI Register
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded shadow-xs flex items-center gap-1.5"
              >
                🖨️ Print / Save as PDF
              </button>
              {selectedRFI && !isCreatingNew && (
                <button
                  onClick={() => handleConvertToChangeEvent(selectedRFI)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded shadow-xs"
                >
                  Convert to Change Event →
                </button>
              )}
            </div>
          </div>

          {/* EXACT RFI TRANSMITTAL DOCUMENT LAYOUT */}
          <form onSubmit={handleSaveTransmittal}>
            <div className="bg-white max-w-[850px] mx-auto p-10 sm:p-14 border border-gray-300 shadow-2xl rounded-sm print:shadow-none print:border-none print:p-0 print:m-0 font-sans text-gray-900">
              
              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-transparent pb-4">
                <div>
                  <h1 className="text-3xl font-serif font-normal text-gray-900 tracking-tight">
                    RFI Transmittal
                  </h1>
                </div>

                {/* BTX CONTRACTORS LOGO */}
                <div className="w-48 text-right">
                  <div className="relative h-14 w-44 ml-auto">
                    <Image
                      src="/btx-logo.png"
                      alt="BTX CONTRACTORS"
                      fill
                      className="object-contain object-right"
                      priority
                    />
                  </div>
                </div>
              </div>

              {/* Information Grid with clean horizontal underline rules */}
              <div className="mt-4 text-[13px] divide-y divide-gray-800/80 border-t border-b border-gray-800/80">
                {/* Row 1: Project Name & Date */}
                <div className="grid grid-cols-12 py-2 gap-2">
                  <div className="col-span-8 flex items-baseline gap-2">
                    <span className="font-serif text-gray-900 font-medium whitespace-nowrap">Project Name:</span>
                    <input
                      type="text"
                      value={project?.name || 'Conviva Jourdanton Building Remodel'}
                      readOnly
                      className="flex-1 font-sans text-gray-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="col-span-4 flex items-baseline gap-2">
                    <span className="font-serif text-gray-900 font-medium whitespace-nowrap">Date:</span>
                    <input
                      type="date"
                      value={transmittalForm.date}
                      onChange={(e) => setTransmittalForm({ ...transmittalForm, date: e.target.value })}
                      className="flex-1 font-sans text-gray-800 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 2: Project No */}
                <div className="grid grid-cols-12 py-2 gap-2">
                  <div className="col-span-12 flex items-baseline gap-2">
                    <span className="font-serif text-gray-900 font-medium whitespace-nowrap">Project No:</span>
                    <input
                      type="text"
                      value={project?.id || 'PRJ-2024-001'}
                      readOnly
                      className="flex-1 font-sans text-gray-800 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 3: Subject & RFI ID */}
                <div className="grid grid-cols-12 py-2 gap-2">
                  <div className="col-span-8 flex items-baseline gap-2">
                    <span className="font-serif text-gray-900 font-medium whitespace-nowrap">Subject:</span>
                    <input
                      type="text"
                      required
                      value={transmittalForm.subject}
                      onChange={(e) => setTransmittalForm({ ...transmittalForm, subject: e.target.value })}
                      placeholder="e.g. RTU-1 Curb Opening Dimension vs Mechanical Duct"
                      className="flex-1 font-sans font-semibold text-gray-900 bg-transparent focus:outline-none border-b border-transparent focus:border-procore-orange"
                    />
                  </div>
                  <div className="col-span-4 flex items-baseline gap-2">
                    <span className="font-serif text-gray-900 font-medium whitespace-nowrap">RFI ID:</span>
                    <input
                      type="text"
                      required
                      value={transmittalForm.rfi_number}
                      onChange={(e) => setTransmittalForm({ ...transmittalForm, rfi_number: e.target.value })}
                      className="flex-1 font-sans font-bold text-gray-900 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 4: Type & Transmittal ID */}
                <div className="grid grid-cols-12 py-2 gap-2">
                  <div className="col-span-8 flex items-baseline gap-2">
                    <span className="font-serif text-gray-900 font-medium whitespace-nowrap">Type:</span>
                    <input
                      type="text"
                      value={transmittalForm.rfi_type}
                      onChange={(e) => setTransmittalForm({ ...transmittalForm, rfi_type: e.target.value })}
                      placeholder="e.g. Design Clarification"
                      className="flex-1 font-sans text-gray-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="col-span-4 flex items-baseline gap-2">
                    <span className="font-serif text-gray-900 font-medium whitespace-nowrap">Transmittal ID:</span>
                    <input
                      type="text"
                      value={transmittalForm.transmittal_id}
                      onChange={(e) => setTransmittalForm({ ...transmittalForm, transmittal_id: e.target.value })}
                      className="flex-1 font-sans text-gray-800 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 5: Purpose & Via */}
                <div className="grid grid-cols-12 py-2 gap-2">
                  <div className="col-span-8 flex items-baseline gap-2">
                    <span className="font-serif text-gray-900 font-medium whitespace-nowrap">Purpose:</span>
                    <input
                      type="text"
                      value={transmittalForm.purpose}
                      onChange={(e) => setTransmittalForm({ ...transmittalForm, purpose: e.target.value })}
                      placeholder="e.g. For Engineering Directive"
                      className="flex-1 font-sans text-gray-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="col-span-4 flex items-baseline gap-2">
                    <span className="font-serif text-gray-900 font-medium whitespace-nowrap">Via:</span>
                    <input
                      type="text"
                      value={transmittalForm.via}
                      onChange={(e) => setTransmittalForm({ ...transmittalForm, via: e.target.value })}
                      placeholder="e.g. Email / Portal"
                      className="flex-1 font-sans text-gray-800 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 1: QUESTION */}
              <div className="mt-8">
                <h3 className="font-serif font-semibold text-[13px] tracking-wide text-gray-900 uppercase mb-2">
                  QUESTION:
                </h3>
                <textarea
                  rows={4}
                  required
                  value={transmittalForm.question}
                  onChange={(e) => setTransmittalForm({ ...transmittalForm, question: e.target.value })}
                  placeholder="Enter detailed RFI question, discrepancy, or clarification needed..."
                  className="w-full text-xs font-sans leading-relaxed text-gray-800 p-3 bg-gray-50/50 border border-gray-300 rounded focus:border-procore-orange focus:bg-white print:border-none print:p-0 print:bg-transparent"
                />
              </div>

              {/* Section 2: SUGGESTION */}
              <div className="mt-6">
                <h3 className="font-serif font-semibold text-[13px] tracking-wide text-gray-900 uppercase mb-2">
                  SUGGESTION:
                </h3>
                <textarea
                  rows={3}
                  value={transmittalForm.suggestion}
                  onChange={(e) => setTransmittalForm({ ...transmittalForm, suggestion: e.target.value })}
                  placeholder="Proposed resolution or contractor recommended solution..."
                  className="w-full text-xs font-sans leading-relaxed text-gray-800 p-3 bg-gray-50/50 border border-gray-300 rounded focus:border-procore-orange focus:bg-white print:border-none print:p-0 print:bg-transparent"
                />
              </div>

              {/* Section 3: ANSWER */}
              <div className="mt-6 border-t border-gray-300 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif font-semibold text-[13px] tracking-wide text-gray-900 uppercase">
                    ANSWER:
                  </h3>
                  <span className="text-[10px] text-gray-500 font-sans italic print:hidden">
                    (Architect / Engineer Official Response)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={transmittalForm.official_response}
                  onChange={(e) => setTransmittalForm({ ...transmittalForm, official_response: e.target.value })}
                  placeholder="Official engineering directive, approved alterations, or instructions..."
                  className="w-full text-xs font-sans leading-relaxed text-gray-900 font-medium p-3 bg-emerald-50/30 border border-emerald-300 rounded focus:border-emerald-600 focus:bg-white print:border-none print:p-0 print:bg-transparent"
                />
              </div>

              {/* Bottom Impacts & References */}
              <div className="mt-8 pt-4 border-t border-gray-300 text-xs space-y-3 font-sans">
                {/* Cost & Schedule Impact Checkers */}
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-6 flex items-center gap-3">
                    <span className="font-serif text-gray-900 font-medium">Cost Impact:</span>
                    {(['Yes', 'No', 'TBD'] as const).map((opt) => (
                      <label key={opt} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="cost_impact"
                          checked={transmittalForm.cost_impact_choice === opt}
                          onChange={() => setTransmittalForm({ ...transmittalForm, cost_impact_choice: opt })}
                          className="accent-procore-orange"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                    {transmittalForm.cost_impact_choice === 'Yes' && (
                      <input
                        type="number"
                        value={transmittalForm.cost_impact_estimate}
                        onChange={(e) => setTransmittalForm({ ...transmittalForm, cost_impact_estimate: parseFloat(e.target.value) || 0 })}
                        placeholder="$ Impact"
                        className="w-24 border border-gray-300 p-1 text-xs rounded"
                      />
                    )}
                  </div>

                  <div className="col-span-6 flex items-center gap-3">
                    <span className="font-serif text-gray-900 font-medium">Schedule Impact:</span>
                    {(['Yes', 'No', 'TBD'] as const).map((opt) => (
                      <label key={opt} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="schedule_impact"
                          checked={transmittalForm.schedule_impact_choice === opt}
                          onChange={() => setTransmittalForm({ ...transmittalForm, schedule_impact_choice: opt })}
                          className="accent-procore-orange"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                    {transmittalForm.schedule_impact_choice === 'Yes' && (
                      <input
                        type="number"
                        value={transmittalForm.schedule_impact_days}
                        onChange={(e) => setTransmittalForm({ ...transmittalForm, schedule_impact_days: parseInt(e.target.value) || 0 })}
                        placeholder="Days"
                        className="w-20 border border-gray-300 p-1 text-xs rounded"
                      />
                    )}
                  </div>
                </div>

                {/* Drawing / Spec Reference */}
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="font-serif text-gray-900 font-medium whitespace-nowrap">Drawing / Spec Reference:</span>
                  <input
                    type="text"
                    value={transmittalForm.drawing_spec_ref}
                    onChange={(e) => setTransmittalForm({ ...transmittalForm, drawing_spec_ref: e.target.value })}
                    placeholder="e.g. M-201, S-102 (Detail 4/S-501)"
                    className="flex-1 text-xs font-sans text-gray-800 bg-transparent border-b border-gray-300 focus:outline-none focus:border-procore-orange"
                  />
                </div>

                {/* Attachments */}
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="font-serif text-gray-900 font-medium whitespace-nowrap">Attachments:</span>
                  <input
                    type="text"
                    value={transmittalForm.attachments}
                    onChange={(e) => setTransmittalForm({ ...transmittalForm, attachments: e.target.value })}
                    placeholder="e.g. Trane Voyager Cut Sheet, 2D Markup PDF"
                    className="flex-1 text-xs font-sans text-gray-800 bg-transparent border-b border-gray-300 focus:outline-none focus:border-procore-orange"
                  />
                </div>
              </div>

              {/* Exact Footer with Line Border */}
              <div className="mt-14 pt-3 border-t-2 border-gray-900 flex justify-between items-center text-[11px] font-sans font-bold text-gray-900">
                <div>BTX CONTRACTORS</div>
                <div className="text-gray-700 font-medium">712 Main St. | Jourdanton, TX 78026</div>
                <div>830-879-5474</div>
              </div>

              {/* Action Buttons in Web Mode */}
              <div className="mt-8 flex justify-end gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('register')}
                  className="px-4 py-2 border border-gray-300 rounded text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold rounded shadow-sm transition-colors"
                >
                  {isCreatingNew ? 'Submit RFI Transmittal' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
