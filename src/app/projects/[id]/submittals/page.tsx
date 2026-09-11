'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Submittal } from '@/types';

export default function SubmittalsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const savingRef = useRef(false);
  const updatingRef = useRef(new Set<string>());

  const [form, setForm] = useState({
    spec_division: '23 - Mechanical / HVAC',
    submittal_number: '',
    title: '',
    description: '',
    subcontractor_name: '',
    approver_name: 'Architect / Engineer',
    lead_time_weeks: 3,
    status: 'pending' as Submittal['status'],
    is_substitution: false,
    substitution_cost_delta: 0,
    schedule_risk_level: 'low' as Submittal['schedule_risk_level'],
    notes: '',
  });

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch(`/api/submittals?projectId=${projectId}`, { signal: controller.signal, cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unable to load submittals.');
        setSubmittals(data.submittals);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load submittals.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setFormError('');
    setNotice('');
    try {
      const res = await fetch('/api/submittals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, project_id: projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to create submittal.');
      setSubmittals(current => [data.submittal, ...current.filter(item => item.id !== data.submittal.id)]);
      setFilterStatus('all');
      setError('');
      setNotice(`Submittal ${data.submittal.submittal_number} created.`);
      setIsModalOpen(false);
      setForm({
        spec_division: '23 - Mechanical / HVAC',
        submittal_number: '',
        title: '',
        description: '',
        subcontractor_name: '',
        approver_name: 'Architect / Engineer',
        lead_time_weeks: 3,
        status: 'pending',
        is_substitution: false,
        substitution_cost_delta: 0,
        schedule_risk_level: 'low',
        notes: '',
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create submittal.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Submittal['status']) => {
    if (updatingRef.current.has(id)) return;
    updatingRef.current.add(id);
    setUpdatingIds(current => [...current, id]);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/submittals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, project_id: projectId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to update submittal.');
      setSubmittals(current => current.map(item => item.id === id ? data.submittal : item));
      setNotice('Submittal status updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update submittal.');
    } finally {
      updatingRef.current.delete(id);
      setUpdatingIds(current => current.filter(item => item !== id));
    }
  };

  const filtered = submittals.filter(s => filterStatus === 'all' || s.status === filterStatus);
  const totalSubstitutions = submittals.filter(s => s.is_substitution).length;
  const highRiskCount = submittals.filter(s => s.schedule_risk_level === 'high' || s.schedule_risk_level === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Submittals & Specifications</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 4: Quality & Procurement
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            Track product cut-sheets, shop drawings, lead times, and substitution approval workflows.
          </p>
        </div>

        <button
          onClick={() => { setFormError(''); setIsModalOpen(true); }}
          className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>+</span> Create Submittal
        </button>
      </div>

      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Submittals</p>
          <p className="text-2xl font-bold text-procore-text mt-1">{submittals.length}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">{submittals.filter(s => s.status === 'approved' || s.status === 'approved_as_noted').length} Approved</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Under Review</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {submittals.filter(s => s.status === 'pending' || s.status === 'under_review').length}
          </p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Awaiting Architect/MEP</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Substitutions</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{totalSubstitutions}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Alternate specifications</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Schedule Risk Alerts</p>
          <p className={`text-2xl font-bold mt-1 ${highRiskCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {highRiskCount}
          </p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Long lead times</p>
        </div>
      </div>

      {/* Filter Tabs & Table */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
        <div className="p-3 border-b border-procore-border bg-gray-50/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {['all', 'draft', 'pending', 'under_review', 'approved', 'approved_as_noted', 'revise_resubmit', 'rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`text-xs font-semibold px-2.5 py-1 rounded capitalize transition-colors ${
                  filterStatus === st
                    ? 'bg-procore-orange text-white'
                    : 'text-procore-text-secondary hover:bg-gray-200/70'
                }`}
              >
                {st.replaceAll('_', ' ')}
              </button>
            ))}
          </div>
          <span className="text-xs text-procore-text-muted">
            Showing {filtered.length} of {submittals.length} items
          </span>
        </div>

        {loading ? (
          <div role="status" className="p-8 text-center text-sm text-procore-text-muted">Loading submittals…</div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100/80 border-b border-procore-border text-procore-text-muted">
                  <th className="p-3 text-left font-bold">Submittal #</th>
                  <th className="p-3 text-left font-bold">Spec Division / Title</th>
                  <th className="p-3 text-left font-bold">Subcontractor</th>
                  <th className="p-3 text-center font-bold">Lead Time</th>
                  <th className="p-3 text-center font-bold">Substitution?</th>
                  <th className="p-3 text-center font-bold">Schedule Risk</th>
                  <th className="p-3 text-center font-bold">Status</th>
                  <th className="p-3 text-center font-bold">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-procore-border-light">
                {filtered.map((s) => {
                  const statusPills: Record<string, string> = {
                    approved: 'bg-emerald-100 text-emerald-800',
                    approved_as_noted: 'bg-teal-100 text-teal-800',
                    under_review: 'bg-blue-100 text-blue-800',
                    pending: 'bg-amber-100 text-amber-800',
                    revise_resubmit: 'bg-red-100 text-red-800',
                  };
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/60">
                      <td className="p-3 font-bold text-procore-orange">{s.submittal_number}</td>
                      <td className="p-3 max-w-[280px]">
                        <div className="text-[11px] font-bold text-procore-text-muted">{s.spec_division}</div>
                        <div className="font-bold text-procore-text text-sm">{s.title}</div>
                        {s.description && <div className="text-procore-text-secondary text-[11px] truncate mt-0.5">{s.description}</div>}
                      </td>
                      <td className="p-3 text-procore-text-secondary font-medium">{s.subcontractor_name || '—'}</td>
                      <td className="p-3 text-center font-semibold text-procore-text">{s.lead_time_weeks || 0} wks</td>
                      <td className="p-3 text-center">
                        {s.is_substitution ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                            Yes {s.substitution_cost_delta < 0 ? `(${s.substitution_cost_delta})` : ''}
                          </span>
                        ) : (
                          <span className="text-procore-text-muted">Standard</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          s.schedule_risk_level === 'high' || s.schedule_risk_level === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {s.schedule_risk_level || 'low'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusPills[s.status] || 'bg-gray-100'}`}>
                          {s.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <select
                          aria-label={`Review status for ${s.submittal_number}`}
                          disabled={updatingIds.includes(s.id)}
                          value={s.status}
                          onChange={(e) => handleStatusChange(s.id, e.target.value as Submittal['status'])}
                          className="text-[11px] border border-procore-border rounded p-1 font-semibold text-procore-text focus:border-procore-orange"
                        >
                          <option value="draft">Draft</option>
                          <option value="rejected">Rejected</option>
                          <option value="pending">Pending</option>
                          <option value="under_review">Under Review</option>
                          <option value="approved">Approved</option>
                          <option value="approved_as_noted">Approved as Noted</option>
                          <option value="revise_resubmit">Revise & Resubmit</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-procore-text-muted">
            {error ? 'Submittals could not be loaded. Reload the page to try again.' : 'No submittals found for this filter.'}
          </div>
        )}
      </div>

      {/* Modal: New Submittal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="submittal-dialog-title" className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border max-h-[90vh] overflow-y-auto">
            <h3 id="submittal-dialog-title" className="font-bold text-base text-procore-text mb-4">Create New Submittal Item</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              {formError && <p role="alert" className="text-red-700 bg-red-50 p-2 rounded">{formError}</p>}
              <fieldset disabled={saving} className="space-y-3">
              <div>
                <label htmlFor="submittal-title" className="font-bold text-procore-text-muted block mb-1">Submittal Title</label>
                <input id="submittal-title"
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Trane Voyager 25-Ton RTU Cut Sheets"
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="submittal-spec_division" className="font-bold text-procore-text-muted block mb-1">Spec Division</label>
                  <input id="submittal-spec_division"
                    type="text"
                    value={form.spec_division}
                    onChange={(e) => setForm({ ...form, spec_division: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label htmlFor="submittal-submittal_number" className="font-bold text-procore-text-muted block mb-1">Submittal #</label>
                  <input id="submittal-submittal_number"
                    type="text"
                    value={form.submittal_number}
                    onChange={(e) => setForm({ ...form, submittal_number: e.target.value })}
                    placeholder="Auto if blank"
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="submittal-subcontractor_name" className="font-bold text-procore-text-muted block mb-1">Subcontractor</label>
                  <input id="submittal-subcontractor_name"
                    type="text"
                    value={form.subcontractor_name}
                    onChange={(e) => setForm({ ...form, subcontractor_name: e.target.value })}
                    placeholder="e.g. Apex Mechanical"
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label htmlFor="submittal-lead_time_weeks" className="font-bold text-procore-text-muted block mb-1">Lead Time (Weeks)</label>
                  <input id="submittal-lead_time_weeks"
                    type="number"
                    min="0"
                    step="1"
                    value={form.lead_time_weeks}
                    onChange={(e) => setForm({ ...form, lead_time_weeks: parseInt(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-procore-border-light space-y-2">
                <label className="flex items-center gap-2 font-bold text-procore-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_substitution}
                    onChange={(e) => setForm({ ...form, is_substitution: e.target.checked })}
                    className="rounded text-procore-orange focus:ring-procore-orange"
                  />
                  Proposed Substitution / Alternate Product
                </label>
                {form.is_substitution && (
                  <div>
                    <label htmlFor="submittal-substitution_cost_delta" className="font-bold text-procore-text-muted block mb-1">Price Delta ($ savings = negative)</label>
                    <input id="submittal-substitution_cost_delta"
                      type="number"
                      step="0.01"
                      value={form.substitution_cost_delta}
                      onChange={(e) => setForm({ ...form, substitution_cost_delta: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-procore-border p-1.5 rounded focus:border-procore-orange"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-procore-border-light">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-procore-border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-procore-orange text-white font-bold rounded hover:bg-procore-orange-hover"
                >
                  {saving ? 'Creating…' : 'Create Submittal'}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
