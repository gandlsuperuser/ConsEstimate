'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RFI } from '@/types';

export default function RFIsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();

  const [rfis, setRfis] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRFI, setSelectedRFI] = useState<RFI | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);
  const [responseInput, setResponseInput] = useState('');

  const [form, setForm] = useState({
    rfi_number: '',
    subject: '',
    question: '',
    assigned_to: 'Apex Engineering Group (Structural)',
    drawing_number: '',
    spec_section: '',
    schedule_impact_days: 0,
    cost_impact_estimate: 0,
  });

  const fetchRFIs = async () => {
    try {
      const res = await fetch(`/api/rfis?projectId=${projectId}`);
      const data = await res.json();
      setRfis(data.rfis || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFIs();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/rfis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, project_id: projectId }),
      });
      if (res.ok) {
        setIsNewModal(false);
        setForm({
          rfi_number: '',
          subject: '',
          question: '',
          assigned_to: 'Apex Engineering Group (Structural)',
          drawing_number: '',
          spec_section: '',
          schedule_impact_days: 0,
          cost_impact_estimate: 0,
        });
        await fetchRFIs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveResponse = async () => {
    if (!selectedRFI || !responseInput.trim()) return;
    try {
      const res = await fetch('/api/rfis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRFI.id,
          official_response: responseInput,
          status: 'responded',
        }),
      });
      if (res.ok) {
        setResponseInput('');
        setSelectedRFI(null);
        await fetchRFIs();
      }
    } catch (err) {
      console.error(err);
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
          estimated_cost: rfi.cost_impact_estimate || 2500,
          schedule_delay_days: rfi.schedule_impact_days || 2,
        }),
      });
      if (res.ok) {
        alert('RFI converted to Change Event! Navigating to Change Events tab...');
        router.push(`/projects/${projectId}/change-events`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openCount = rfis.filter(r => r.status === 'open').length;
  const respondedCount = rfis.filter(r => r.status === 'responded').length;
  const totalCostImpact = rfis.reduce((acc, r) => acc + (r.cost_impact_estimate || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">RFI Management (Request for Information)</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 5: Field Communications
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            Document clarifications, architect/engineer responses, and convert scope variances directly to Change Events.
          </p>
        </div>

        <button
          onClick={() => setIsNewModal(true)}
          className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>+</span> Create RFI
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total RFIs</p>
          <p className="text-2xl font-bold text-procore-text mt-1">{rfis.length}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">{rfis.filter(r => r.has_change_event).length} Linked to Change Events</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Open / Awaiting Response</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{openCount}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">In design review</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Responded & Closed</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{respondedCount}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Direction received</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Est. Cost Impact</p>
          <p className="text-2xl font-bold text-procore-orange mt-1">${totalCostImpact.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Potential change scope</p>
        </div>
      </div>

      {/* RFIs Table */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-procore-border bg-gray-50/50">
          <h2 className="text-sm font-bold text-procore-text">RFI Register ({rfis.length})</h2>
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
                  <th className="p-3 text-center font-bold">Cross-Module Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-procore-border-light">
                {rfis.map((r) => {
                  const isResponded = r.status === 'responded' || r.status === 'closed';
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60">
                      <td className="p-3 font-bold text-procore-orange">{r.rfi_number}</td>
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
                      <td className="p-3 text-center text-procore-text-muted font-medium">{r.drawing_number || r.spec_section || '—'}</td>
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
                      <td className="p-3 text-center space-y-1">
                        {!r.official_response ? (
                          <button
                            onClick={() => {
                              setSelectedRFI(r);
                              setResponseInput('');
                            }}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1 rounded block w-full"
                          >
                            Add Response
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-bold block">✓ Responded</span>
                        )}

                        {r.has_change_event ? (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded block">
                            Linked to CE
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConvertToChangeEvent(r)}
                            className="bg-procore-orange hover:bg-procore-orange-hover text-white font-bold text-[10px] px-2.5 py-1 rounded block w-full shadow-2xs"
                          >
                            + Create Change Event
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-procore-text-muted">
            No RFIs logged for this project.
          </div>
        )}
      </div>

      {/* Modal: Add Response */}
      {selectedRFI && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-2">Record Official RFI Response</h3>
            <p className="text-xs text-procore-text-muted mb-3 font-medium">
              RFI: {selectedRFI.rfi_number} - {selectedRFI.subject}
            </p>
            <div className="p-3 bg-gray-50 border border-procore-border rounded text-xs mb-3 text-procore-text-secondary">
              <span className="font-bold text-procore-text">Question: </span>
              {selectedRFI.question}
            </div>
            <div className="space-y-2 text-xs">
              <label className="font-bold text-procore-text-muted block">Official Architect / Engineer Response</label>
              <textarea
                rows={4}
                value={responseInput}
                onChange={(e) => setResponseInput(e.target.value)}
                placeholder="Enter engineering instructions, specification updates, or structural directives..."
                className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-procore-border-light text-xs">
              <button
                type="button"
                onClick={() => setSelectedRFI(null)}
                className="px-3 py-1.5 border border-procore-border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveResponse}
                className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700"
              >
                Submit Response
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New RFI */}
      {isNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Create Request for Information (RFI)</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Subject</label>
                <input
                  required
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Curb opening dimensions vs M-201 duct penetration"
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Assigned To</label>
                  <input
                    type="text"
                    value={form.assigned_to}
                    onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Drawing Ref</label>
                  <input
                    type="text"
                    value={form.drawing_number}
                    onChange={(e) => setForm({ ...form, drawing_number: e.target.value })}
                    placeholder="e.g. S-102 / M-201"
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Question / Clarification Needed</label>
                <textarea
                  required
                  rows={3}
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Estimated Cost Impact ($)</label>
                  <input
                    type="number"
                    value={form.cost_impact_estimate}
                    onChange={(e) => setForm({ ...form, cost_impact_estimate: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Schedule Delay (Days)</label>
                  <input
                    type="number"
                    value={form.schedule_impact_days}
                    onChange={(e) => setForm({ ...form, schedule_impact_days: parseInt(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-procore-border-light">
                <button
                  type="button"
                  onClick={() => setIsNewModal(false)}
                  className="px-3 py-1.5 border border-procore-border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-procore-orange text-white font-bold rounded hover:bg-procore-orange-hover"
                >
                  Create RFI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
