'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChangeOrder, Contract } from '@/types';

export default function ChangeOrdersPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    co_number: '',
    title: '',
    co_type: 'subcontract' as 'prime' | 'subcontract',
    contract_id: '',
    amount: 0,
    time_extension_days: 0,
    description: '',
  });

  const fetchData = async () => {
    try {
      const [ordersRes, contractsRes] = await Promise.all([
        fetch(`/api/change-orders?projectId=${projectId}`),
        fetch(`/api/contracts?projectId=${projectId}`),
      ]);
      const ordersData = await ordersRes.json();
      const contractsData = await contractsRes.json();
      setOrders(ordersData.changeOrders || []);
      setContracts(contractsData.contracts || []);
      if (contractsData.contracts?.length > 0 && !form.contract_id) {
        setForm(f => ({ ...f, contract_id: contractsData.contracts[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/change-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, project_id: projectId, status: 'pending_approval' }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setForm({
          co_number: '',
          title: '',
          co_type: 'subcontract',
          contract_id: contracts[0]?.id || '',
          amount: 0,
          time_extension_days: 0,
          description: '',
        });
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (co: ChangeOrder) => {
    try {
      const res = await fetch('/api/change-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: co.id,
          project_id: projectId,
          contract_id: co.contract_id,
          amount: co.amount,
          status: 'executed',
        }),
      });
      if (res.ok) {
        alert('Change Order Approved & Executed! Subcontract revised amount has been automatically updated.');
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalCOAmount = orders.reduce((acc, o) => acc + (o.amount || 0), 0);
  const approvedCOAmount = orders.filter(o => o.status === 'approved' || o.status === 'executed').reduce((acc, o) => acc + (o.amount || 0), 0);
  const totalDays = orders.reduce((acc, o) => acc + (o.time_extension_days || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Change Orders (PCO / CCO)</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 7: Contract Revisions
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            Formal contractual changes modifying contract values, scope of work, and schedule milestones.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>+</span> Create Change Order
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Change Orders</p>
          <p className="text-2xl font-bold text-procore-text mt-1">{orders.length}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">{orders.filter(o => o.status === 'executed').length} Executed</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Approved Revisions</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">${approvedCOAmount.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Committed to contracts</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">${(totalCOAmount - approvedCOAmount).toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">In workflow routing</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Time Extension</p>
          <p className="text-2xl font-bold text-procore-orange mt-1">+{totalDays} Days</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Added to schedule</p>
        </div>
      </div>

      {/* Change Orders Table */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-procore-border bg-gray-50/50">
          <h2 className="text-sm font-bold text-procore-text">Contract Change Orders ({orders.length})</h2>
        </div>

        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100/80 border-b border-procore-border text-procore-text-muted">
                  <th className="p-3 text-left font-bold">CO #</th>
                  <th className="p-3 text-left font-bold">Title / Description</th>
                  <th className="p-3 text-left font-bold">Type</th>
                  <th className="p-3 text-left font-bold">Associated Contract</th>
                  <th className="p-3 text-right font-bold">Amount</th>
                  <th className="p-3 text-center font-bold">Time Extension</th>
                  <th className="p-3 text-center font-bold">Status</th>
                  <th className="p-3 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-procore-border-light">
                {orders.map((o) => {
                  const linkedContract = contracts.find(c => c.id === o.contract_id);
                  const isApproved = o.status === 'approved' || o.status === 'executed';
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/60">
                      <td className="p-3 font-bold text-procore-orange">{o.co_number}</td>
                      <td className="p-3 max-w-[280px]">
                        <div className="font-bold text-procore-text text-sm">{o.title}</div>
                        {o.description && <div className="text-procore-text-secondary text-[11px] truncate mt-0.5">{o.description}</div>}
                      </td>
                      <td className="p-3 capitalize font-semibold text-procore-text-secondary">{o.co_type}</td>
                      <td className="p-3">
                        {linkedContract ? (
                          <div>
                            <div className="font-bold text-procore-text">{linkedContract.title}</div>
                            <div className="text-[11px] text-procore-text-muted">{linkedContract.vendor_name}</div>
                          </div>
                        ) : (
                          <span className="text-procore-text-muted">Prime / Owner</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-sm text-procore-text">
                        +${o.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-semibold text-procore-text-muted">
                        {o.time_extension_days ? `+${o.time_extension_days} days` : '0 days'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {o.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {!isApproved ? (
                          <button
                            onClick={() => handleApprove(o)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-2xs"
                          >
                            Approve & Apply
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-bold">✓ Executed</span>
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
            No change orders recorded. Create one or convert a Change Event.
          </div>
        )}
      </div>

      {/* Modal: New Change Order */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Create Change Order</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">CO Title</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Added Roof Steel Framing per CE-018"
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">CO Type</label>
                  <select
                    value={form.co_type}
                    onChange={(e) => setForm({ ...form, co_type: e.target.value as 'prime' | 'subcontract' })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  >
                    <option value="subcontract">Subcontract Change Order</option>
                    <option value="prime">Prime Contract Change Order</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Target Contract</label>
                  <select
                    value={form.contract_id}
                    onChange={(e) => setForm({ ...form, contract_id: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  >
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>{c.title} ({c.vendor_name})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Change Amount ($)</label>
                  <input
                    required
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Time Extension (Days)</label>
                  <input
                    type="number"
                    value={form.time_extension_days}
                    onChange={(e) => setForm({ ...form, time_extension_days: parseInt(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Description / Justification</label>
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
                  Create Change Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
