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
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);

  // Blank Form State - NO pre-filled sample text
  const [transmittalForm, setTransmittalForm] = useState({
    rfi_number: '',
    transmittal_id: '',
    date: new Date().toISOString().split('T')[0],
    subject: '',
    rfi_type: 'Design Clarification',
    purpose: 'For Directive',
    via: 'Email / Portal',
    question: '',
    suggestion: '',
    official_response: '',
    cost_impact_choice: '' as 'Yes' | 'No' | 'TBD' | '',
    cost_impact_estimate: 0,
    schedule_impact_choice: '' as 'Yes' | 'No' | 'TBD' | '',
    schedule_impact_days: 0,
    drawing_spec_ref: '',
    attachments: '',
    assigned_to: 'Architect / Engineer',
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
      setRfis(list);
      if (list.length > 0) {
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

  // Open brand new, completely blank RFI Transmittal form
  const openNewTransmittal = () => {
    setIsCreatingNew(true);
    setSelectedRFI(null);
    setShowQuickModal(false);
    setTransmittalForm({
      rfi_number: `RFI-0${rfis.length + 1}`,
      transmittal_id: `TR-0${rfis.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      subject: '',
      rfi_type: 'Design Clarification',
      purpose: 'For Directive',
      via: 'Email / Portal',
      question: '',
      suggestion: '',
      official_response: '',
      cost_impact_choice: '',
      cost_impact_estimate: 0,
      schedule_impact_choice: '',
      schedule_impact_days: 0,
      drawing_spec_ref: '',
      attachments: '',
      assigned_to: 'Architect / Engineer',
    });
    setViewMode('transmittal');
  };

  const openQuickModal = () => {
    setIsCreatingNew(true);
    setSelectedRFI(null);
    setTransmittalForm({
      rfi_number: `RFI-0${rfis.length + 1}`,
      transmittal_id: `TR-0${rfis.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      subject: '',
      rfi_type: 'Design Clarification',
      purpose: 'For Directive',
      via: 'Email / Portal',
      question: '',
      suggestion: '',
      official_response: '',
      cost_impact_choice: '',
      cost_impact_estimate: 0,
      schedule_impact_choice: '',
      schedule_impact_days: 0,
      drawing_spec_ref: '',
      attachments: '',
      assigned_to: 'Architect / Engineer',
    });
    setShowQuickModal(true);
  };

  // View an existing RFI in the official Transmittal letterhead
  const viewRfiTransmittal = (rfi: RFI) => {
    setSelectedRFI(rfi);
    setIsCreatingNew(false);
    setShowQuickModal(false);
    setTransmittalForm({
      rfi_number: rfi.rfi_number || '',
      transmittal_id: rfi.transmittal_id || '',
      date: rfi.created_at ? rfi.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      subject: rfi.subject || '',
      rfi_type: rfi.rfi_type || 'Design Clarification',
      purpose: rfi.purpose || 'For Directive',
      via: rfi.via || 'Email / Portal',
      question: rfi.question || '',
      suggestion: rfi.suggestion || '',
      official_response: rfi.official_response || '',
      cost_impact_choice: rfi.cost_impact_choice || '',
      cost_impact_estimate: rfi.cost_impact_estimate || 0,
      schedule_impact_choice: rfi.schedule_impact_choice || '',
      schedule_impact_days: rfi.schedule_impact_days || 0,
      drawing_spec_ref: rfi.drawing_spec_ref || rfi.drawing_number || rfi.spec_section || '',
      attachments: rfi.attachments || '',
      assigned_to: rfi.assigned_to || 'Architect / Engineer',
    });
    setViewMode('transmittal');
  };

  const handleSaveTransmittal = async (e?: React.FormEvent, forceCreateNew = false) => {
    if (e) e.preventDefault();
    if (!transmittalForm.subject.trim()) {
      alert('Please enter an RFI Subject / Title.');
      return;
    }

    setIsSaving(true);
    try {
      const isNew = forceCreateNew || isCreatingNew || !selectedRFI;
      const url = '/api/rfis';
      const method = isNew ? 'POST' : 'PATCH';
      const payload = isNew
        ? {
            ...transmittalForm,
            project_id: projectId,
            status: transmittalForm.official_response ? 'responded' : 'open',
          }
        : {
            id: selectedRFI?.id,
            ...transmittalForm,
            status: transmittalForm.official_response ? 'responded' : 'open',
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save RFI');
      }

      setIsCreatingNew(false);
      setShowQuickModal(false);
      await fetchProjectAndRFIs();
      if (data.rfi) {
        setSelectedRFI(data.rfi);
      }
      setViewMode('register');
      alert(isNew ? 'RFI created successfully and added to the register!' : 'RFI updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Error saving RFI: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRFI = async (rfiId: string) => {
    if (!confirm('Are you sure you want to delete this RFI?')) return;
    try {
      const res = await fetch(`/api/rfis?id=${rfiId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchProjectAndRFIs();
        if (selectedRFI?.id === rfiId) {
          setSelectedRFI(null);
        }
        setViewMode('register');
      } else {
        alert('Failed to delete RFI.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting RFI.');
    }
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
          estimated_cost: rfi.cost_impact_estimate || 0,
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

  const handleExportPDF = async (overrideRfi?: RFI) => {
    setIsGeneratingPdf(true);
    try {
      const { toJpeg } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      // Allow React state to flush
      await new Promise((resolve) => setTimeout(resolve, 80));

      const el = document.getElementById('rfi-transmittal-doc');
      if (!el) {
        alert('Transmittal document not found.');
        return;
      }

      const imgData = await toJpeg(el, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
      });

      // Standard Letter Portrait: 215.9mm x 279.4mm (8.5in x 11in)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
      });

      const pageWidth = 215.9;
      const pageHeight = 279.4;
      const margin = 8; // 8mm margin all around
      const maxContentWidth = pageWidth - margin * 2; // 199.9mm
      const maxContentHeight = pageHeight - margin * 2; // 263.4mm

      const rect = el.getBoundingClientRect();
      let renderWidth = maxContentWidth;
      let renderHeight = (rect.height * renderWidth) / rect.width;

      // Strictly enforce 1-page fit: scale down proportionally if height exceeds printable height
      if (renderHeight > maxContentHeight) {
        renderHeight = maxContentHeight;
        renderWidth = (rect.width * renderHeight) / rect.height;
      }

      const posX = margin + (maxContentWidth - renderWidth) / 2;
      const posY = margin + (maxContentHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'JPEG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');

      const rawSubject = transmittalForm.subject || overrideRfi?.subject || 'Transmittal';
      const cleanSubject = rawSubject.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      const rfiNum = (transmittalForm.rfi_number || overrideRfi?.rfi_number || 'RFI').replace(/[^a-zA-Z0-9_-]/g, '_');

      pdf.save(`${rfiNum}_${cleanSubject}.pdf`);
    } catch (err) {
      console.error('Direct PDF export error, falling back to browser print:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
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

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1 border border-procore-border-light text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setViewMode('register')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded transition-all text-center ${
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
                else openNewTransmittal();
              }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded transition-all text-center ${
                viewMode === 'transmittal'
                  ? 'bg-white text-procore-orange shadow-2xs font-bold'
                  : 'text-procore-text-muted hover:text-procore-text'
              }`}
            >
              📄 RFI Transmittal Letterhead
            </button>
          </div>

          <button
            type="button"
            onClick={openQuickModal}
            className="w-full sm:w-auto bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Create an RFI immediately"
          >
            <span>+</span> Quick Create RFI
          </button>
          <button
            type="button"
            onClick={openNewTransmittal}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Open official letterhead document format"
          >
            <span>📝</span> New Transmittal Form
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
              <p className="text-2xl font-bold text-amber-600 mt-1">{rfis.filter(r => r.status === 'open' || !r.status).length}</p>
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
            <div className="p-4 border-b border-procore-border bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-procore-text">RFI Register ({rfis.length})</h2>
                <span className="text-xs text-procore-text-muted">Click any row to view full transmittal</span>
              </div>
              <button
                type="button"
                onClick={openQuickModal}
                className="bg-procore-orange hover:bg-procore-orange-hover text-white font-bold text-xs px-3 py-1.5 rounded shadow-xs cursor-pointer flex items-center gap-1"
              >
                <span>+</span> Add RFI
              </button>
            </div>

            {rfis.length > 0 ? (
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
                      <th className="p-3 text-center font-bold w-40">Actions</th>
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
                            <div className="font-bold text-procore-text text-sm">{r.subject || 'Untitled RFI'}</div>
                            <div className="text-procore-text-secondary text-[11px] line-clamp-2 mt-0.5">{r.question || '—'}</div>
                            {r.official_response && (
                              <div className="mt-1.5 p-2 bg-emerald-50/80 border border-emerald-200 rounded text-emerald-900 text-[11px]">
                                <span className="font-bold">Official Response: </span>
                                {r.official_response}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-procore-text-secondary font-medium">{r.assigned_to || '—'}</td>
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
                              {r.status || 'open'}
                            </span>
                          </td>
                          <td className="p-3 text-center space-y-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => viewRfiTransmittal(r)}
                              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1 rounded block w-full shadow-2xs cursor-pointer"
                            >
                              ✏️ Edit Transmittal
                            </button>
                            <button
                              onClick={() => {
                                viewRfiTransmittal(r);
                                setTimeout(() => handleExportPDF(r), 120);
                              }}
                              className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[10px] px-2 py-1 rounded block w-full shadow-2xs cursor-pointer"
                              title="Convert this RFI to an official 1-page PDF"
                            >
                              📄 Convert to PDF
                            </button>
                            {r.has_change_event ? (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded block">
                                ✓ Linked to CE
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConvertToChangeEvent(r)}
                                className="bg-procore-orange hover:bg-procore-orange-hover text-white font-bold text-[10px] px-2.5 py-1 rounded block w-full shadow-2xs cursor-pointer"
                              >
                                + Convert to CE
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteRFI(r.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold text-[10px] px-2 py-0.5 rounded border border-red-200 block w-full transition-colors cursor-pointer"
                              title="Delete RFI"
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-sm text-procore-text-muted">
                <p className="font-semibold text-base text-procore-text">No RFIs created yet</p>
                <p className="mt-1 mb-4">Click &quot;+ Quick Create RFI&quot; above to log your first official RFI.</p>
                <button
                  type="button"
                  onClick={openQuickModal}
                  className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-4 py-2 rounded-md shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>+</span> Create First RFI
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: EXACT BTX RFI TRANSMITTAL DOCUMENT FORM (GUARANTEED 1-PAGE PDF / PRINT) */}
      {viewMode === 'transmittal' && (
        <div className="space-y-4">
          {/* Top Bar for Transmittal */}
          <div className="flex flex-wrap justify-between items-center gap-2 bg-gray-100 p-3 rounded-lg border border-procore-border print:hidden">
            <button
              type="button"
              onClick={() => setViewMode('register')}
              className="text-xs font-bold text-procore-text hover:text-procore-orange flex items-center gap-1.5 cursor-pointer"
            >
              ← Back to RFI Register
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => handleExportPDF()}
                className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-3.5 py-1.5 sm:px-4 sm:py-2 rounded shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-colors"
                title="Convert this RFI to an official 1-page PDF file"
              >
                <span>📄</span>
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Convert to PDF'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Print or Save as PDF via browser"
              >
                <span>🖨️</span>
                <span>Print</span>
              </button>
              {selectedRFI && !isCreatingNew && (
                <>
                  <button
                    type="button"
                    onClick={() => handleConvertToChangeEvent(selectedRFI)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded shadow-xs cursor-pointer"
                    title="Convert RFI into a Change Event"
                  >
                    Convert to CE →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRFI(selectedRFI.id)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded shadow-xs cursor-pointer"
                    title="Delete this RFI"
                  >
                    🗑️ Delete
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={isSaving}
                onClick={(e) => handleSaveTransmittal(e)}
                className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-4 py-1.5 sm:px-4 sm:py-2 rounded shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Save RFI to database and return to register"
              >
                <span>💾</span>
                <span>{isSaving ? 'Saving...' : (isCreatingNew || !selectedRFI ? 'Save & Issue RFI' : 'Save Changes')}</span>
              </button>
            </div>
          </div>

          {/* EXACT RFI TRANSMITTAL DOCUMENT LAYOUT (100% 1-PAGE FIT) */}
          <form onSubmit={handleSaveTransmittal}>
            <div
              id="rfi-transmittal-doc"
              className="bg-white w-full max-w-[800px] mx-auto p-6 sm:p-8 border border-gray-300 shadow-xl rounded-sm print:shadow-none print:border-none print:p-0 print:m-0 font-sans text-gray-900"
            >
              {/* Document Header */}
              <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b-2 border-gray-900">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 tracking-tight">
                    RFI Transmittal
                  </h1>
                </div>

                {/* BTX CONTRACTORS LOGO */}
                <div className="text-right">
                  <img
                    src="/btx-logo.png"
                    alt="BTX CONTRACTORS"
                    className="h-10 sm:h-12 w-auto object-contain ml-auto"
                  />
                </div>
              </div>

              {/* Information Grid: Permanent 2-Column Table That NEVER Collapses */}
              <div className="text-[12px] divide-y divide-gray-800 border-t border-b border-gray-800">
                
                {/* Row 1: Project Name & Date */}
                <div className="grid grid-cols-12 py-1.5 gap-2 items-center">
                  <div className="col-span-8 flex items-baseline gap-2 min-w-0">
                    <span className="font-serif text-gray-900 font-bold whitespace-nowrap shrink-0">Project Name:</span>
                    <span className="font-sans text-gray-900 font-medium truncate flex-1">{project?.name || 'Project'}</span>
                  </div>
                  <div className="col-span-4 flex items-baseline gap-2 min-w-0">
                    <span className="font-serif text-gray-900 font-bold whitespace-nowrap shrink-0">Date:</span>
                    {isGeneratingPdf ? (
                      <span className="font-sans text-gray-900 font-medium">{transmittalForm.date}</span>
                    ) : (
                      <>
                        <input
                          type="date"
                          value={transmittalForm.date}
                          onChange={(e) => setTransmittalForm({ ...transmittalForm, date: e.target.value })}
                          className="print:hidden w-full min-w-0 flex-1 font-sans text-gray-900 bg-transparent focus:outline-none"
                        />
                        <span className="hidden print:inline font-sans text-gray-900 font-medium">
                          {transmittalForm.date}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Row 2: Project No */}
                <div className="grid grid-cols-12 py-1.5 gap-2 items-center">
                  <div className="col-span-12 flex items-baseline gap-2 min-w-0">
                    <span className="font-serif text-gray-900 font-bold whitespace-nowrap shrink-0">Project No:</span>
                    <span className="font-sans text-gray-900 font-medium truncate flex-1">{project?.id || '—'}</span>
                  </div>
                </div>

                {/* Row 3: Subject & RFI ID */}
                <div className="grid grid-cols-12 py-1.5 gap-2 items-center">
                  <div className="col-span-8 flex items-baseline gap-2 min-w-0">
                    <span className="font-serif text-gray-900 font-bold whitespace-nowrap shrink-0">Subject:</span>
                    {isGeneratingPdf ? (
                      <span className="font-sans font-semibold text-gray-900 truncate flex-1">{transmittalForm.subject || '—'}</span>
                    ) : (
                      <>
                        <input
                          type="text"
                          required
                          value={transmittalForm.subject}
                          onChange={(e) => setTransmittalForm({ ...transmittalForm, subject: e.target.value })}
                          placeholder="Enter RFI subject"
                          className="print:hidden w-full min-w-0 flex-1 font-sans font-semibold text-gray-900 bg-transparent focus:outline-none border-b border-transparent focus:border-procore-orange"
                        />
                        <span className="hidden print:inline font-sans font-semibold text-gray-900 truncate flex-1">
                          {transmittalForm.subject || '—'}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="col-span-4 flex items-baseline gap-2 min-w-0">
                    <span className="font-serif text-gray-900 font-bold whitespace-nowrap shrink-0">RFI ID:</span>
                    {isGeneratingPdf ? (
                      <span className="font-sans font-bold text-gray-900">{transmittalForm.rfi_number || '—'}</span>
                    ) : (
                      <>
                        <input
                          type="text"
                          required
                          value={transmittalForm.rfi_number}
                          onChange={(e) => setTransmittalForm({ ...transmittalForm, rfi_number: e.target.value })}
                          placeholder="e.g. RFI-001"
                          className="print:hidden w-full min-w-0 flex-1 font-sans font-bold text-gray-900 bg-transparent focus:outline-none"
                        />
                        <span className="hidden print:inline font-sans font-bold text-gray-900">
                          {transmittalForm.rfi_number || '—'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Row 4: Type & Transmittal ID */}
                <div className="grid grid-cols-12 py-1.5 gap-2 items-center">
                  <div className="col-span-8 flex items-baseline gap-2 min-w-0">
                    <span className="font-serif text-gray-900 font-bold whitespace-nowrap shrink-0">Type:</span>
                    {isGeneratingPdf ? (
                      <span className="font-sans text-gray-900 truncate flex-1">{transmittalForm.rfi_type || '—'}</span>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={transmittalForm.rfi_type}
                          onChange={(e) => setTransmittalForm({ ...transmittalForm, rfi_type: e.target.value })}
                          placeholder="e.g. Design Clarification / Field Scope"
                          className="print:hidden w-full min-w-0 flex-1 font-sans text-gray-900 bg-transparent focus:outline-none"
                        />
                        <span className="hidden print:inline font-sans text-gray-900 truncate flex-1">
                          {transmittalForm.rfi_type || '—'}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="col-span-4 flex items-baseline gap-2 min-w-0">
                    <span className="font-serif text-gray-900 font-bold whitespace-nowrap shrink-0">Transmittal ID:</span>
                    {isGeneratingPdf ? (
                      <span className="font-sans text-gray-900">{transmittalForm.transmittal_id || '—'}</span>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={transmittalForm.transmittal_id}
                          onChange={(e) => setTransmittalForm({ ...transmittalForm, transmittal_id: e.target.value })}
                          placeholder="e.g. TR-2024-001"
                          className="print:hidden w-full min-w-0 flex-1 font-sans text-gray-900 bg-transparent focus:outline-none"
                        />
                        <span className="hidden print:inline font-sans text-gray-900">
                          {transmittalForm.transmittal_id || '—'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Row 5: Purpose & Via */}
                <div className="grid grid-cols-12 py-1.5 gap-2 items-center">
                  <div className="col-span-8 flex items-baseline gap-2 min-w-0">
                    <span className="font-serif text-gray-900 font-bold whitespace-nowrap shrink-0">Purpose:</span>
                    {isGeneratingPdf ? (
                      <span className="font-sans text-gray-900 truncate flex-1">{transmittalForm.purpose || '—'}</span>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={transmittalForm.purpose}
                          onChange={(e) => setTransmittalForm({ ...transmittalForm, purpose: e.target.value })}
                          placeholder="e.g. For Review / For Directive"
                          className="print:hidden w-full min-w-0 flex-1 font-sans text-gray-900 bg-transparent focus:outline-none"
                        />
                        <span className="hidden print:inline font-sans text-gray-900 truncate flex-1">
                          {transmittalForm.purpose || '—'}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="col-span-4 flex items-baseline gap-2 min-w-0">
                    <span className="font-serif text-gray-900 font-bold whitespace-nowrap shrink-0">Via:</span>
                    {isGeneratingPdf ? (
                      <span className="font-sans text-gray-900">{transmittalForm.via || '—'}</span>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={transmittalForm.via}
                          onChange={(e) => setTransmittalForm({ ...transmittalForm, via: e.target.value })}
                          placeholder="e.g. Email / Portal"
                          className="print:hidden w-full min-w-0 flex-1 font-sans text-gray-900 bg-transparent focus:outline-none"
                        />
                        <span className="hidden print:inline font-sans text-gray-900">
                          {transmittalForm.via || '—'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 1: QUESTION */}
              <div className="mt-3.5">
                <h3 className="font-serif font-bold text-[12px] tracking-wide text-gray-900 uppercase mb-1">
                  QUESTION:
                </h3>
                {isGeneratingPdf ? (
                  <div className="w-full text-xs font-sans leading-relaxed text-gray-900 p-2.5 bg-gray-50/70 border border-gray-300 rounded min-h-[64px] whitespace-pre-wrap">
                    {transmittalForm.question || '—'}
                  </div>
                ) : (
                  <>
                    <textarea
                      rows={3}
                      required
                      value={transmittalForm.question}
                      onChange={(e) => setTransmittalForm({ ...transmittalForm, question: e.target.value })}
                      placeholder="Enter detailed RFI question, discrepancy, or clarification needed..."
                      className="print:hidden w-full text-xs font-sans leading-relaxed text-gray-900 p-2.5 bg-gray-50/70 border border-gray-300 rounded focus:border-procore-orange focus:bg-white resize-none"
                    />
                    <div className="hidden print:block w-full text-xs font-sans leading-relaxed text-gray-900 p-2.5 bg-gray-50/70 border border-gray-300 rounded min-h-[60px] whitespace-pre-wrap">
                      {transmittalForm.question || '—'}
                    </div>
                  </>
                )}
              </div>

              {/* Section 2: SUGGESTION */}
              <div className="mt-2.5">
                <h3 className="font-serif font-bold text-[12px] tracking-wide text-gray-900 uppercase mb-1">
                  SUGGESTION:
                </h3>
                {isGeneratingPdf ? (
                  <div className="w-full text-xs font-sans leading-relaxed text-gray-900 p-2 bg-gray-50/70 border border-gray-300 rounded min-h-[48px] whitespace-pre-wrap">
                    {transmittalForm.suggestion || '—'}
                  </div>
                ) : (
                  <>
                    <textarea
                      rows={2}
                      value={transmittalForm.suggestion}
                      onChange={(e) => setTransmittalForm({ ...transmittalForm, suggestion: e.target.value })}
                      placeholder="Proposed resolution or contractor recommended solution..."
                      className="print:hidden w-full text-xs font-sans leading-relaxed text-gray-900 p-2 bg-gray-50/70 border border-gray-300 rounded focus:border-procore-orange focus:bg-white resize-none"
                    />
                    <div className="hidden print:block w-full text-xs font-sans leading-relaxed text-gray-900 p-2 bg-gray-50/70 border border-gray-300 rounded min-h-[45px] whitespace-pre-wrap">
                      {transmittalForm.suggestion || '—'}
                    </div>
                  </>
                )}
              </div>

              {/* Section 3: ANSWER */}
              <div className="mt-2.5 pt-2 border-t border-gray-300">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h3 className="font-serif font-bold text-[12px] tracking-wide text-gray-900 uppercase">
                    ANSWER:
                  </h3>
                  <span className="text-[10px] text-gray-500 font-sans italic">
                    (Architect / Engineer Official Response)
                  </span>
                </div>
                {isGeneratingPdf ? (
                  <div className="w-full text-xs font-sans leading-relaxed text-gray-900 font-medium p-2.5 bg-emerald-50/40 border border-emerald-300 rounded min-h-[64px] whitespace-pre-wrap">
                    {transmittalForm.official_response || 'Pending Architect / Engineer directive.'}
                  </div>
                ) : (
                  <>
                    <textarea
                      rows={3}
                      value={transmittalForm.official_response}
                      onChange={(e) => setTransmittalForm({ ...transmittalForm, official_response: e.target.value })}
                      placeholder="Official engineering directive, approved alterations, or instructions..."
                      className="print:hidden w-full text-xs font-sans leading-relaxed text-gray-900 font-medium p-2.5 bg-emerald-50/40 border border-emerald-300 rounded focus:border-emerald-600 focus:bg-white resize-none"
                    />
                    <div className="hidden print:block w-full text-xs font-sans leading-relaxed text-gray-900 font-medium p-2.5 bg-emerald-50/40 border border-emerald-300 rounded min-h-[60px] whitespace-pre-wrap">
                      {transmittalForm.official_response || 'Pending Architect / Engineer directive.'}
                    </div>
                  </>
                )}
              </div>

              {/* Bottom Impacts & References: Structured, clean, never overflowing */}
              <div className="mt-3 pt-2.5 border-t border-gray-300 text-xs space-y-2 font-sans">
                
                {/* Cost & Schedule Impact Selectors */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Cost Impact */}
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-gray-900 font-bold shrink-0">Cost Impact:</span>
                    {(['Yes', 'No', 'TBD'] as const).map((opt) => (
                      <label key={opt} className="flex items-center gap-1 cursor-pointer font-medium text-xs">
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
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-700">$</span>
                        <input
                          type="number"
                          value={transmittalForm.cost_impact_estimate || ''}
                          onChange={(e) => setTransmittalForm({ ...transmittalForm, cost_impact_estimate: parseFloat(e.target.value) || 0 })}
                          placeholder="Amount"
                          className="w-20 border border-gray-300 px-1.5 py-0.5 text-xs rounded bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Schedule Impact */}
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-gray-900 font-bold shrink-0">Schedule Impact:</span>
                    {(['Yes', 'No', 'TBD'] as const).map((opt) => (
                      <label key={opt} className="flex items-center gap-1 cursor-pointer font-medium text-xs">
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
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={transmittalForm.schedule_impact_days || ''}
                          onChange={(e) => setTransmittalForm({ ...transmittalForm, schedule_impact_days: parseInt(e.target.value) || 0 })}
                          placeholder="Days"
                          className="w-16 border border-gray-300 px-1.5 py-0.5 text-xs rounded bg-white"
                        />
                        <span className="text-gray-700 font-medium">Days</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Drawing / Spec Reference */}
                <div className="flex items-baseline gap-2 pt-0.5">
                  <span className="font-serif text-gray-900 font-bold whitespace-nowrap shrink-0">Drawing / Spec Reference:</span>
                  {isGeneratingPdf ? (
                    <span className="font-sans text-gray-900 flex-1">{transmittalForm.drawing_spec_ref || '—'}</span>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={transmittalForm.drawing_spec_ref}
                        onChange={(e) => setTransmittalForm({ ...transmittalForm, drawing_spec_ref: e.target.value })}
                        placeholder="e.g. M-201, S-102 (Detail 4/S-501)"
                        className="print:hidden w-full min-w-0 flex-1 text-xs font-sans text-gray-900 bg-transparent border-b border-gray-300 focus:outline-none focus:border-procore-orange"
                      />
                      <span className="hidden print:inline font-sans text-gray-900 flex-1">
                        {transmittalForm.drawing_spec_ref || '—'}
                      </span>
                    </>
                  )}
                </div>

                {/* Attachments */}
                <div className="flex items-baseline gap-2 pt-0.5">
                  <span className="font-serif text-gray-900 font-bold whitespace-nowrap shrink-0">Attachments:</span>
                  {isGeneratingPdf ? (
                    <span className="font-sans text-gray-900 flex-1">{transmittalForm.attachments || '—'}</span>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={transmittalForm.attachments}
                        onChange={(e) => setTransmittalForm({ ...transmittalForm, attachments: e.target.value })}
                        placeholder="e.g. Cut sheets, 2D plan markup, photo attachments"
                        className="print:hidden w-full min-w-0 flex-1 text-xs font-sans text-gray-900 bg-transparent border-b border-gray-300 focus:outline-none focus:border-procore-orange"
                      />
                      <span className="hidden print:inline font-sans text-gray-900 flex-1">
                        {transmittalForm.attachments || '—'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Exact Footer with Line Border */}
              <div className="mt-4 pt-2 border-t-2 border-gray-900 flex justify-between items-center text-left text-[11px] font-sans font-bold text-gray-900">
                <div>BTX CONTRACTORS</div>
                <div className="text-gray-700 font-medium">712 Main St. | Jourdanton, TX 78026</div>
                <div>830-879-5474</div>
              </div>

              {/* Action Buttons in Web Mode */}
              <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('register')}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded text-xs font-bold hover:bg-gray-50 text-center cursor-pointer"
                >
                  Cancel
                </button>
                {selectedRFI && !isCreatingNew && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={(e) => handleSaveTransmittal(e, true)}
                    className="w-full sm:w-auto px-4 py-2 border border-procore-orange text-procore-orange hover:bg-orange-50 text-xs font-bold rounded text-center transition-colors cursor-pointer"
                    title="Save this content as a brand new RFI instead of modifying the existing one"
                  >
                    Save as New RFI
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-2 bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold rounded shadow-sm transition-colors text-center disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : (isCreatingNew || !selectedRFI ? 'Submit RFI Transmittal' : 'Save Changes')}
                </button>
              </div>
            </div>
          </form>

          {/* Strict 1-Page Letter Portrait Print Styles */}
          <style jsx global>{`
            @media print {
              @page {
                size: letter portrait;
                margin: 0.3in 0.35in;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                height: 100% !important;
                overflow: hidden !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              #rfi-transmittal-doc {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-after: avoid !important;
                break-after: avoid !important;
                page-break-before: avoid !important;
                break-before: avoid !important;
                overflow: hidden !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* QUICK CREATE RFI MODAL */}
      {showQuickModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Quick Create RFI</h3>
                <p className="text-[11px] text-gray-400">Request for Information — Phase 5 Field Communications</p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleSaveTransmittal(e, true)} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">RFI Number *</label>
                  <input
                    type="text"
                    required
                    value={transmittalForm.rfi_number}
                    onChange={(e) => setTransmittalForm({ ...transmittalForm, rfi_number: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-procore-orange font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned To</label>
                  <input
                    type="text"
                    value={transmittalForm.assigned_to}
                    onChange={(e) => setTransmittalForm({ ...transmittalForm, assigned_to: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-procore-orange text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Subject / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sanitary Sewer Invert Elevation Discrepancy"
                  value={transmittalForm.subject}
                  onChange={(e) => setTransmittalForm({ ...transmittalForm, subject: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-procore-orange font-semibold text-gray-900"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Question / Details *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the clarification needed or plan discrepancy..."
                  value={transmittalForm.question}
                  onChange={(e) => setTransmittalForm({ ...transmittalForm, question: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2.5 focus:outline-none focus:border-procore-orange text-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Drawing / Spec Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. C-102, Detail 3/S-501"
                    value={transmittalForm.drawing_spec_ref}
                    onChange={(e) => setTransmittalForm({ ...transmittalForm, drawing_spec_ref: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-procore-orange text-gray-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Estimated Cost Impact ($)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={transmittalForm.cost_impact_estimate || ''}
                    onChange={(e) => setTransmittalForm({ ...transmittalForm, cost_impact_estimate: parseFloat(e.target.value) || 0, cost_impact_choice: parseFloat(e.target.value) > 0 ? 'Yes' : 'No' })}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-procore-orange text-gray-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={openNewTransmittal}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                >
                  Open in Full Letterhead Form →
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickModal(false)}
                    className="px-3 py-1.5 border border-gray-300 rounded font-bold hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-procore-orange hover:bg-procore-orange-hover text-white rounded font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? 'Creating...' : 'Save & Issue RFI'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
