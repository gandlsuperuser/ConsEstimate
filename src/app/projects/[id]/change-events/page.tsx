'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChangeEvent } from '@/types';

export default function ChangeEventsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();

  const [events, setEvents] = useState<ChangeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewModal, setIsNewModal] = useState(false);

  const [form, setForm] = useState({
    event_number: '',
    title: '',
    description: '',
    trade: 'Mechanical & Structural',
    estimated_cost: 0,
    contingency_allocation: 0,
    schedule_delay_days: 0,
    status: 'pricing' as ChangeEvent['status'],
  });

  const fetchEvents = async () => {
    try {
      const res = await fetch(`/api/change-events?projectId=${projectId}`);
      const data = await res.json();
      setEvents(data.changeEvents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/change-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, project_id: projectId }),
      });
      if (res.ok) {
        setIsNewModal(false);
        setForm({
          event_number: '',
          title: '',
          description: '',
          trade: 'Mechanical & Structural',
          estimated_cost: 0,
          contingency_allocation: 0,
          schedule_delay_days: 0,
          status: 'pricing',
        });
        await fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertToChangeOrder = async (ce: ChangeEvent) => {
    try {
      const res = await fetch('/api/change-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_change_order',
          change_event_id: ce.id,
          project_id: projectId,
          title: `PCO: ${ce.title}`,
          amount: ce.estimated_cost,
          time_extension_days: ce.schedule_delay_days,
        }),
      });
      if (res.ok) {
        alert('Change Order generated! Navigating to Change Orders tab...');
        router.push(`/projects/${projectId}/change-orders`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalCost = events.reduce((acc, e) => acc + (e.estimated_cost || 0), 0);
  const totalContingency = events.reduce((acc, e) => acc + (e.contingency_allocation || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Change Events</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 6: Cost Variance & Contingency
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            Capture unbudgeted changes, request trade pricing, allocate contingency funds, and convert to Change Orders.
          </p>
        </div>

        <button
          onClick={() => setIsNewModal(true)}
          className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>+</span> Create Change Event
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Events</p>
          <p className="text-2xl font-bold text-procore-text mt-1">{events.length}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">{events.filter(e => e.status === 'approved').length} Approved into PCOs</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Est. Variance Cost</p>
          <p className="text-2xl font-bold text-procore-orange mt-1">${totalCost.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Potential cost adjustments</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Contingency Draw</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">${totalContingency.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Allocated from project reserve</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">In Pricing Review</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {events.filter(e => e.status === 'pricing' || e.status === 'under_review').length}
          </p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Pending trade quotes</p>
        </div>
      </div>

      {/* Change Events Table */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-procore-border bg-gray-50/50">
          <h2 className="text-sm font-bold text-procore-text">Active Change Events ({events.length})</h2>
        </div>

        {events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100/80 border-b border-procore-border text-procore-text-muted">
                  <th className="p-3 text-left font-bold">Event #</th>
                  <th className="p-3 text-left font-bold">Title / Description</th>
                  <th className="p-3 text-left font-bold">Trade</th>
                  <th className="p-3 text-right font-bold">Estimated Cost</th>
                  <th className="p-3 text-right font-bold">Contingency Draw</th>
                  <th className="p-3 text-center font-bold">Schedule Delay</th>
                  <th className="p-3 text-center font-bold">Status</th>
                  <th className="p-3 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-procore-border-light">
                {events.map((e) => {
                  const statusColors: Record<string, string> = {
                    approved: 'bg-emerald-100 text-emerald-800',
                    pricing: 'bg-amber-100 text-amber-800',
                    under_review: 'bg-blue-100 text-blue-800',
                    rejected: 'bg-red-100 text-red-800',
                  };
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/60">
                      <td className="p-3 font-bold text-procore-orange">{e.event_number}</td>
                      <td className="p-3 max-w-[280px]">
                        <div className="font-bold text-procore-text text-sm">{e.title}</div>
                        <div className="text-procore-text-secondary text-[11px] line-clamp-2 mt-0.5">{e.description}</div>
                      </td>
                      <td className="p-3 text-procore-text-secondary font-medium">{e.trade || 'General'}</td>
                      <td className="p-3 text-right font-bold text-sm text-procore-text">
                        ${e.estimated_cost.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-medium text-indigo-700">
                        ${e.contingency_allocation ? e.contingency_allocation.toLocaleString() : '0'}
                      </td>
                      <td className="p-3 text-center font-semibold text-procore-text-muted">
                        {e.schedule_delay_days ? `+${e.schedule_delay_days} days` : '0 days'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[e.status] || 'bg-gray-100'}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {e.change_order_id ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded inline-block">
                            ✓ PCO Generated
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConvertToChangeOrder(e)}
                            className="bg-procore-orange hover:bg-procore-orange-hover text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-2xs"
                          >
                            + Create Change Order
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
            No change events recorded. Create one or convert an RFI from the RFIs tab.
          </div>
        )}
      </div>

      {/* Modal: New Change Event */}
      {isNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Create New Change Event</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Event Title</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Added roof support steel at RTU penetrations"
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Trade</label>
                  <input
                    type="text"
                    value={form.trade}
                    onChange={(e) => setForm({ ...form, trade: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Estimated Cost ($)</label>
                  <input
                    required
                    type="number"
                    value={form.estimated_cost}
                    onChange={(e) => setForm({ ...form, estimated_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Contingency Allocation ($)</label>
                  <input
                    type="number"
                    value={form.contingency_allocation}
                    onChange={(e) => setForm({ ...form, contingency_allocation: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Schedule Delay (Days)</label>
                  <input
                    type="number"
                    value={form.schedule_delay_days}
                    onChange={(e) => setForm({ ...form, schedule_delay_days: parseInt(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Scope Description</label>
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
                  onClick={() => setIsNewModal(false)}
                  className="px-3 py-1.5 border border-procore-border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-procore-orange text-white font-bold rounded hover:bg-procore-orange-hover"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
