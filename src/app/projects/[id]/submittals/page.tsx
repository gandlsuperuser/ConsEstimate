'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Submittal } from '@/types';

export default function SubmittalsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const fetchSubmittals = async () => {
    try {
      const res = await fetch(`/api/submittals?projectId=${projectId}`);
      const data = await res.json();
      setSubmittals(data.submittals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmittals();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/submittals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, project_id: projectId }),
      });
      if (res.ok) {
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
        await fetchSubmittals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Submittal['status']) => {
    try {
      const res = await fetch('/api/submittals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        await fetchSubmittals();
      }
    } catch (err) {
      console.error(err);
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
          onClick={() => setIsModalOpen(true)}
          className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>+</span> Create Submittal
        </button>
      </div>

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
          <div className="flex items-center gap-1.5">
            {['all', 'pending', 'under_review', 'approved', 'revise_resubmit'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`text-xs font-semibold px-2.5 py-1 rounded capitalize transition-colors ${
                  filterStatus === st
                    ? 'bg-procore-orange text-white'
                    : 'text-procore-text-secondary hover:bg-gray-200/70'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
          <span className="text-xs text-procore-text-muted">
            Showing {filtered.length} of {submittals.length} items
          </span>
        </div>

        {filtered.length > 0 ? (
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
                          {s.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <select
                          value={s.status}
                          onChange={(e) => handleStatusChange(s.id, e.target.value as Submittal['status'])}
                          className="text-[11px] border border-procore-border rounded p-1 font-semibold text-procore-text focus:border-procore-orange"
                        >
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
            No submittals found for this filter.
          </div>
        )}
      </div>

      {/* Modal: New Submittal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Create New Submittal Item</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Submittal Title</label>
                <input
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
                  <label className="font-bold text-procore-text-muted block mb-1">Spec Division</label>
                  <input
                    type="text"
                    value={form.spec_division}
                    onChange={(e) => setForm({ ...form, spec_division: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Submittal #</label>
                  <input
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
                  <label className="font-bold text-procore-text-muted block mb-1">Subcontractor</label>
                  <input
                    type="text"
                    value={form.subcontractor_name}
                    onChange={(e) => setForm({ ...form, subcontractor_name: e.target.value })}
                    placeholder="e.g. Apex Mechanical"
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Lead Time (Weeks)</label>
                  <input
                    type="number"
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
                    <label className="font-bold text-procore-text-muted block mb-1">Price Delta ($ savings = negative)</label>
                    <input
                      type="number"
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
                  Create Submittal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
