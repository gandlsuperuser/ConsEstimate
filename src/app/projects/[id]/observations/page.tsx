'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FieldObservation } from '@/types';

export default function ObservationsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [observations, setObservations] = useState<FieldObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    observation_number: '',
    category: 'quality' as FieldObservation['category'],
    title: '',
    description: '',
    trade_partner: '',
    assignee: 'Robert Mason (Superintendent)',
    location: 'Main Building / Roof',
    urgency: 'medium' as FieldObservation['urgency'],
    due_date: new Date().toISOString().split('T')[0],
  });

  const fetchObservations = async () => {
    try {
      const res = await fetch(`/api/observations?projectId=${projectId}`);
      const data = await res.json();
      setObservations(data.observations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, project_id: projectId }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setForm({
          observation_number: '',
          category: 'quality',
          title: '',
          description: '',
          trade_partner: '',
          assignee: 'Robert Mason (Superintendent)',
          location: 'Main Building / Roof',
          urgency: 'medium',
          due_date: new Date().toISOString().split('T')[0],
        });
        await fetchObservations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: FieldObservation['status']) => {
    try {
      const res = await fetch('/api/observations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        await fetchObservations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = observations.filter(o => filterCategory === 'all' || o.category === filterCategory);
  const openCount = observations.filter(o => o.status === 'open' || o.status === 'ready_for_review').length;
  const criticalCount = observations.filter(o => o.urgency === 'critical' || o.urgency === 'high').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Field Observations & Quality</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 8: Field Execution
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            Log quality inspections, safety hazards, punch list items, and assign responsible trade partners.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>+</span> Create Observation
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Observations</p>
          <p className="text-2xl font-bold text-procore-text mt-1">{observations.length}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Quality & Safety logged</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Open Items</p>
          <p className={`text-2xl font-bold mt-1 ${openCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {openCount}
          </p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Requiring trade action</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">High / Critical Urgency</p>
          <p className={`text-2xl font-bold mt-1 ${criticalCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {criticalCount}
          </p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Priority field items</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Resolved & Closed</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {observations.filter(o => o.status === 'resolved' || o.status === 'closed').length}
          </p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Verified in field</p>
        </div>
      </div>

      {/* Filter Tabs & Cards Grid */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs p-4 space-y-4">
        <div className="flex items-center gap-1.5 border-b border-procore-border-light pb-3">
          {['all', 'quality', 'safety', 'punch_list', 'progress'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`text-xs font-semibold px-2.5 py-1 rounded capitalize transition-colors ${
                filterCategory === cat
                  ? 'bg-procore-orange text-white'
                  : 'text-procore-text-secondary hover:bg-gray-200/70'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((obs) => {
              const urgencyColors: Record<string, string> = {
                critical: 'bg-red-100 text-red-800 border-red-200',
                high: 'bg-orange-100 text-orange-800 border-orange-200',
                medium: 'bg-amber-100 text-amber-800 border-amber-200',
                low: 'bg-gray-100 text-gray-800 border-gray-200',
              };
              const isClosed = obs.status === 'closed' || obs.status === 'resolved';

              return (
                <div key={obs.id} className="p-4 rounded-lg border border-procore-border hover:shadow-sm transition-all bg-gray-50/40 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-bold text-procore-orange text-xs">{obs.observation_number}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${urgencyColors[obs.urgency]}`}>
                          {obs.urgency}
                        </span>
                        <span className="text-[10px] font-bold uppercase bg-gray-200 text-gray-800 px-2 py-0.5 rounded">
                          {obs.category.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-procore-text">{obs.title}</h3>
                    <p className="text-xs text-procore-text-secondary mt-1 line-clamp-3">{obs.description}</p>

                    <div className="space-y-1 mt-3 pt-3 border-t border-procore-border-light text-[11px] text-procore-text-muted">
                      <div><span className="font-bold text-procore-text">Trade: </span>{obs.trade_partner || 'Unassigned'}</div>
                      <div><span className="font-bold text-procore-text">Assignee: </span>{obs.assignee}</div>
                      <div><span className="font-bold text-procore-text">Location: </span>{obs.location || 'Jobsite'}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-procore-border-light flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isClosed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {obs.status.replace('_', ' ')}
                    </span>

                    <select
                      value={obs.status}
                      onChange={(e) => handleStatusChange(obs.id, e.target.value as FieldObservation['status'])}
                      className="text-[11px] border border-procore-border rounded p-1 font-semibold text-procore-text bg-white"
                    >
                      <option value="open">Open</option>
                      <option value="ready_for_review">Ready for Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-procore-text-muted">
            No field observations logged for this category.
          </div>
        )}
      </div>

      {/* Modal: New Observation */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Create Field Observation</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Title</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Roof curb gasket inspection required"
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as FieldObservation['category'] })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  >
                    <option value="quality">Quality</option>
                    <option value="safety">Safety</option>
                    <option value="punch_list">Punch List</option>
                    <option value="progress">Progress</option>
                    <option value="environmental">Environmental</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Urgency</label>
                  <select
                    value={form.urgency}
                    onChange={(e) => setForm({ ...form, urgency: e.target.value as FieldObservation['urgency'] })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Trade Partner</label>
                  <input
                    type="text"
                    value={form.trade_partner}
                    onChange={(e) => setForm({ ...form, trade_partner: e.target.value })}
                    placeholder="e.g. Apex Mechanical"
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Description / Action Required</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
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
                  Save Observation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
