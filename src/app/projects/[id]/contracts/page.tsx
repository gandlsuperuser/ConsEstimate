'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Contract } from '@/types';

export default function ContractsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    contract_number: '',
    title: '',
    vendor_name: '',
    contract_type: 'subcontract' as 'subcontract' | 'prime_contract' | 'purchase_order',
    original_amount: 0,
    retainage_pct: 10.0,
    start_date: new Date().toISOString().split('T')[0],
    completion_date: '',
    notes: '',
  });

  const fetchContracts = async () => {
    try {
      const res = await fetch(`/api/contracts?projectId=${projectId}`);
      const data = await res.json();
      setContracts(data.contracts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, project_id: projectId }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setForm({
          contract_number: '',
          title: '',
          vendor_name: '',
          contract_type: 'subcontract',
          original_amount: 0,
          retainage_pct: 10.0,
          start_date: new Date().toISOString().split('T')[0],
          completion_date: '',
          notes: '',
        });
        await fetchContracts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecute = async (contract: Contract) => {
    try {
      const res = await fetch('/api/contracts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contract.id,
          status: 'executed',
          approval_step: 'Fully Executed',
        }),
      });
      if (res.ok) {
        await fetchContracts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalCommitted = contracts.reduce((acc, c) => acc + (c.revised_amount || c.original_amount), 0);
  const totalOriginal = contracts.reduce((acc, c) => acc + c.original_amount, 0);
  const approvedCODelta = totalCommitted - totalOriginal;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Contracts & Commitments</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 3: Commitments
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            Manage subcontractor commitments, electronic execution status, and contract modifications.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>+</span> Create Contract
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Commitments</p>
          <p className="text-2xl font-bold text-procore-text mt-1">${totalCommitted.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">{contracts.length} Trade Contracts</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Original Award Value</p>
          <p className="text-2xl font-bold text-procore-text mt-1">${totalOriginal.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Initial base value</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Approved Change Orders</p>
          <p className={`text-2xl font-bold mt-1 ${approvedCODelta > 0 ? 'text-procore-orange' : 'text-procore-text'}`}>
            +${approvedCODelta.toLocaleString()}
          </p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Contract revisions</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Execution Rate</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {contracts.length > 0 ? `${Math.round((contracts.filter(c => c.status === 'executed').length / contracts.length) * 100)}%` : '0%'}
          </p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Fully Executed</p>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-procore-border bg-gray-50/50">
          <h2 className="text-sm font-bold text-procore-text">Committed Contracts ({contracts.length})</h2>
        </div>

        {contracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100/80 border-b border-procore-border text-procore-text-muted">
                  <th className="p-3 text-left font-bold">Contract #</th>
                  <th className="p-3 text-left font-bold">Title / Vendor</th>
                  <th className="p-3 text-left font-bold">Type</th>
                  <th className="p-3 text-right font-bold">Original Amount</th>
                  <th className="p-3 text-right font-bold">Revised Amount</th>
                  <th className="p-3 text-center font-bold">Retainage</th>
                  <th className="p-3 text-center font-bold">Status</th>
                  <th className="p-3 text-center font-bold">Workflow Step</th>
                  <th className="p-3 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-procore-border-light">
                {contracts.map((c) => {
                  const statusColors: Record<string, string> = {
                    executed: 'bg-emerald-100 text-emerald-800',
                    approved: 'bg-blue-100 text-blue-800',
                    out_for_signature: 'bg-amber-100 text-amber-800',
                    draft: 'bg-gray-100 text-gray-800',
                  };
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/60">
                      <td className="p-3 font-bold text-procore-orange">{c.contract_number}</td>
                      <td className="p-3">
                        <div className="font-bold text-procore-text text-sm">{c.title}</div>
                        <div className="text-procore-text-muted">{c.vendor_name}</div>
                      </td>
                      <td className="p-3 capitalize text-procore-text-secondary">{c.contract_type.replace('_', ' ')}</td>
                      <td className="p-3 text-right font-medium text-procore-text">
                        ${c.original_amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-bold text-sm text-procore-text">
                        ${(c.revised_amount || c.original_amount).toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-semibold text-procore-text-muted">{c.retainage_pct}%</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[c.status] || 'bg-gray-100 text-gray-700'}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-center text-procore-text-secondary font-medium">{c.approval_step || 'PM Review'}</td>
                      <td className="p-3 text-center">
                        {c.status !== 'executed' ? (
                          <button
                            onClick={() => handleExecute(c)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-2xs"
                          >
                            Execute (E-Sign)
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-bold">✓ Signed</span>
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
            No contracts created yet. Award a bid package in the Bidding tab or click "+ Create Contract".
          </div>
        )}
      </div>

      {/* Modal: New Contract */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Create New Contract</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Contract Title</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Subcontract - HVAC Installation"
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Vendor / Subcontractor</label>
                  <input
                    required
                    type="text"
                    value={form.vendor_name}
                    onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                    placeholder="e.g. Apex Mechanical"
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Contract #</label>
                  <input
                    type="text"
                    value={form.contract_number}
                    onChange={(e) => setForm({ ...form, contract_number: e.target.value })}
                    placeholder="Auto-generated if blank"
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Contract Amount ($)</label>
                  <input
                    required
                    type="number"
                    value={form.original_amount}
                    onChange={(e) => setForm({ ...form, original_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Retainage %</label>
                  <input
                    type="number"
                    value={form.retainage_pct}
                    onChange={(e) => setForm({ ...form, retainage_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                    step="0.1"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
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
                  Create Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
