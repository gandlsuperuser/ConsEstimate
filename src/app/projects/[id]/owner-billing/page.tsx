'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { OwnerBilling } from '@/types';

export default function OwnerBillingPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [billings, setBillings] = useState<OwnerBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    application_number: 1,
    period_to: new Date().toISOString().split('T')[0],
    original_contract_sum: 250000,
    net_change_orders: 12500,
    total_completed_and_stored: 85000,
    retainage_pct: 10.0,
    less_previous_certificates: 0,
  });

  const fetchBillings = async () => {
    try {
      const res = await fetch(`/api/owner-billing?projectId=${projectId}`);
      const data = await res.json();
      const list = data.billings || [];
      if (list.length === 0) {
        // Initial sample Owner Billing certificate
        const defaultBilling: OwnerBilling = {
          id: 'ob-1',
          project_id: projectId,
          application_number: 1,
          period_to: new Date().toISOString().split('T')[0],
          original_contract_sum: 250000,
          net_change_orders: 12500,
          contract_sum_to_date: 262500,
          total_completed_and_stored: 85000,
          retainage_amount: 8500,
          total_earned_less_retainage: 76500,
          less_previous_certificates: 0,
          current_payment_due: 76500,
          status: 'submitted',
        };
        setBillings([defaultBilling]);
      } else {
        setBillings(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillings();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/owner-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, project_id: projectId }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        await fetchBillings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/owner-billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' }),
      });
      if (res.ok) {
        await fetchBillings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalContract = billings[0]?.contract_sum_to_date || 262500;
  const totalBilled = billings.reduce((acc, b) => acc + b.total_completed_and_stored, 0);
  const totalRetainage = billings.reduce((acc, b) => acc + b.retainage_amount, 0);
  const totalDue = billings.filter(b => b.status === 'submitted' || b.status === 'approved').reduce((acc, b) => acc + b.current_payment_due, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Owner Billing & Prime Applications</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 15: Upstream Billing
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            AIA Document G702 Application and Certificate for Payment to Project Owner per ConsJ.rule section 15.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>+</span> Create Owner Application
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Prime Contract Sum</p>
          <p className="text-2xl font-bold text-procore-text mt-1">${totalContract.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Original + Prime Change Orders</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Billed to Date</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">${totalBilled.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">{((totalBilled / totalContract) * 100).toFixed(1)}% of prime contract</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Owner Retainage (10%)</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">${totalRetainage.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Cumulative reserve</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Current Payment Due</p>
          <p className="text-2xl font-bold text-procore-orange mt-1">${totalDue.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Approved certificate amount</p>
        </div>
      </div>

      {/* AIA G702 Table */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-procore-border bg-gray-50/50">
          <h2 className="text-sm font-bold text-procore-text">AIA G702 Owner Applications & Certificates ({billings.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100/80 border-b border-procore-border text-procore-text-muted">
                <th className="p-3 text-left font-bold">App #</th>
                <th className="p-3 text-center font-bold">Period To</th>
                <th className="p-3 text-right font-bold">Contract Sum to Date</th>
                <th className="p-3 text-right font-bold">Total Work & Stored</th>
                <th className="p-3 text-right font-bold">Retainage (10%)</th>
                <th className="p-3 text-right font-bold">Previous Certs</th>
                <th className="p-3 text-right font-bold">Current Payment Due</th>
                <th className="p-3 text-center font-bold">Status</th>
                <th className="p-3 text-center font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-procore-border-light">
              {billings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/60">
                  <td className="p-3 font-bold text-procore-orange">App #{b.application_number}</td>
                  <td className="p-3 text-center text-procore-text font-medium">{b.period_to}</td>
                  <td className="p-3 text-right font-bold text-procore-text">${b.contract_sum_to_date.toLocaleString()}</td>
                  <td className="p-3 text-right font-medium text-procore-text">${b.total_completed_and_stored.toLocaleString()}</td>
                  <td className="p-3 text-right font-medium text-amber-700">-${b.retainage_amount.toLocaleString()}</td>
                  <td className="p-3 text-right font-medium text-procore-text-muted">${b.less_previous_certificates.toLocaleString()}</td>
                  <td className="p-3 text-right font-bold text-sm text-procore-text">${b.current_payment_due.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      b.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {b.status === 'submitted' ? (
                      <button
                        onClick={() => handleApprove(b.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-2xs"
                      >
                        Approve Cert
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-700">✓ Certified</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Owner Billing */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Create Owner Application (AIA G702)</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Application #</label>
                  <input
                    type="number"
                    value={form.application_number}
                    onChange={(e) => setForm({ ...form, application_number: parseInt(e.target.value) || 1 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Period To</label>
                  <input
                    type="date"
                    value={form.period_to}
                    onChange={(e) => setForm({ ...form, period_to: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Original Prime Sum ($)</label>
                  <input
                    type="number"
                    value={form.original_contract_sum}
                    onChange={(e) => setForm({ ...form, original_contract_sum: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Net Change Orders ($)</label>
                  <input
                    type="number"
                    value={form.net_change_orders}
                    onChange={(e) => setForm({ ...form, net_change_orders: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Total Completed & Stored ($)</label>
                  <input
                    type="number"
                    value={form.total_completed_and_stored}
                    onChange={(e) => setForm({ ...form, total_completed_and_stored: parseFloat(e.target.value) || 0 })}
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
                  />
                </div>
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
                  Generate Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
