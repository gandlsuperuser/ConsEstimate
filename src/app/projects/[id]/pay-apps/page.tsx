'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PayApplication, Contract, Payment } from '@/types';

export default function PayAppsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [payApps, setPayApps] = useState<PayApplication[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewPayAppModal, setIsNewPayAppModal] = useState(false);
  const [isDisburseModal, setIsDisburseModal] = useState(false);
  const [selectedPayApp, setSelectedPayApp] = useState<PayApplication | null>(null);

  const [form, setForm] = useState({
    contract_id: '',
    application_number: 1,
    period_to: new Date().toISOString().split('T')[0],
    total_completed_to_date: 0,
    retainage_pct: 10.0,
    previous_payments: 0,
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    recipient_name: '',
    amount: 0,
    payment_method: 'ACH' as Payment['payment_method'],
    funding_account: 'Construction Draw Account #4012',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [paRes, contractsRes, paymentsRes] = await Promise.all([
        fetch(`/api/pay-apps?projectId=${projectId}`),
        fetch(`/api/contracts?projectId=${projectId}`),
        fetch(`/api/payments?projectId=${projectId}`),
      ]);
      const paData = await paRes.json();
      const contractsData = await contractsRes.json();
      const paymentsData = await paymentsRes.json();
      setPayApps(paData.payApplications || []);
      setContracts(contractsData.contracts || []);
      setPayments(paymentsData.payments || []);
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

  const handleCreatePayApp = async (e: React.FormEvent) => {
    e.preventDefault();
    const contract = contracts.find(c => c.id === form.contract_id);
    if (!contract) return;

    try {
      const res = await fetch('/api/pay-apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          project_id: projectId,
          contract_amount: contract.original_amount,
          change_order_amount: (contract.revised_amount || contract.original_amount) - contract.original_amount,
          items: [
            {
              description: `${contract.title} - Scope Work`,
              scheduled_value: contract.revised_amount || contract.original_amount,
              work_completed_previous: form.previous_payments,
              work_completed_this_period: form.total_completed_to_date - form.previous_payments,
              total_completed: form.total_completed_to_date,
              pct_complete: Math.round((form.total_completed_to_date / (contract.revised_amount || contract.original_amount)) * 100),
              balance_to_finish: (contract.revised_amount || contract.original_amount) - form.total_completed_to_date,
            }
          ]
        }),
      });
      if (res.ok) {
        setIsNewPayAppModal(false);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprovePayApp = async (pa: PayApplication) => {
    try {
      const res = await fetch('/api/pay-apps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pa.id, status: 'approved' }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisbursePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayApp) return;

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          pay_application_id: selectedPayApp.id,
          recipient_name: paymentForm.recipient_name,
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          funding_account: paymentForm.funding_account,
          status: 'completed',
          notes: `Disbursed for Pay Application #${selectedPayApp.application_number}`,
        }),
      });
      if (res.ok) {
        // Also update Pay App status to paid
        await fetch('/api/pay-apps', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedPayApp.id, status: 'paid' }),
        });
        setIsDisburseModal(false);
        alert('Payment disbursed successfully and marked completed!');
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalBilled = payApps.reduce((acc, p) => acc + (p.total_completed_to_date || 0), 0);
  const totalRetainage = payApps.reduce((acc, p) => acc + (p.retainage_amount || 0), 0);
  const totalDisbursed = payments.filter(p => p.status === 'completed').reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Pay Applications & Disbursements</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 9: Billing & Payment
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            AIA G702/G703 Schedule of Values billing against contracts, 10% retainage withholding, and funding disbursements.
          </p>
        </div>

        <button
          onClick={() => setIsNewPayAppModal(true)}
          className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>+</span> Submit Pay Application
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Billed to Date</p>
          <p className="text-2xl font-bold text-procore-text mt-1">${totalBilled.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">{payApps.length} Pay Applications</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Retainage Withheld</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">${totalRetainage.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">10% standard reserve</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Disbursed</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">${totalDisbursed.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Cleared ACH / Wires</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Approved Due</p>
          <p className="text-2xl font-bold text-procore-orange mt-1">
            ${payApps.filter(p => p.status === 'approved').reduce((acc, p) => acc + p.current_payment_due, 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Ready for disbursement</p>
        </div>
      </div>

      {/* Pay Applications Table */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-procore-border bg-gray-50/50">
          <h2 className="text-sm font-bold text-procore-text">Subcontractor Pay Applications ({payApps.length})</h2>
        </div>

        {payApps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100/80 border-b border-procore-border text-procore-text-muted">
                  <th className="p-3 text-left font-bold">App #</th>
                  <th className="p-3 text-left font-bold">Contract / Vendor</th>
                  <th className="p-3 text-center font-bold">Period To</th>
                  <th className="p-3 text-right font-bold">Total Work Completed</th>
                  <th className="p-3 text-right font-bold">Retainage (10%)</th>
                  <th className="p-3 text-right font-bold">Previous Payments</th>
                  <th className="p-3 text-right font-bold">Current Due</th>
                  <th className="p-3 text-center font-bold">Status</th>
                  <th className="p-3 text-center font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-procore-border-light">
                {payApps.map((pa) => {
                  const linkedContract = contracts.find(c => c.id === pa.contract_id);
                  const statusColors: Record<string, string> = {
                    paid: 'bg-emerald-100 text-emerald-800',
                    approved: 'bg-blue-100 text-blue-800',
                    submitted: 'bg-amber-100 text-amber-800',
                    rejected: 'bg-red-100 text-red-800',
                  };
                  return (
                    <tr key={pa.id} className="hover:bg-gray-50/60">
                      <td className="p-3 font-bold text-procore-orange">#{pa.application_number}</td>
                      <td className="p-3">
                        <div className="font-bold text-procore-text text-sm">{linkedContract?.title || 'Subcontract'}</div>
                        <div className="text-procore-text-muted">{linkedContract?.vendor_name || 'Vendor'}</div>
                      </td>
                      <td className="p-3 text-center font-medium text-procore-text-secondary">{pa.period_to}</td>
                      <td className="p-3 text-right font-medium text-procore-text">
                        ${pa.total_completed_to_date.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-medium text-amber-700">
                        -${pa.retainage_amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-medium text-procore-text-muted">
                        ${pa.previous_payments.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-bold text-sm text-procore-text">
                        ${pa.current_payment_due.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[pa.status] || 'bg-gray-100'}`}>
                          {pa.status}
                        </span>
                      </td>
                      <td className="p-3 text-center space-x-1">
                        {pa.status === 'submitted' && (
                          <button
                            onClick={() => handleApprovePayApp(pa)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-2xs"
                          >
                            Approve
                          </button>
                        )}
                        {pa.status === 'approved' && (
                          <button
                            onClick={() => {
                              setSelectedPayApp(pa);
                              setPaymentForm({
                                recipient_name: linkedContract?.vendor_name || 'Subcontractor',
                                amount: pa.current_payment_due,
                                payment_method: 'ACH',
                                funding_account: 'Construction Draw Account #4012',
                                notes: `Payment for Application #${pa.application_number}`,
                              });
                              setIsDisburseModal(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-2xs"
                          >
                            Disburse Funds
                          </button>
                        )}
                        {pa.status === 'paid' && (
                          <span className="text-[11px] font-bold text-emerald-700">✓ Disbursed</span>
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
            No pay applications submitted yet. Click "+ Submit Pay Application".
          </div>
        )}
      </div>

      {/* Disbursements Table */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-procore-border bg-gray-50/50">
          <h2 className="text-sm font-bold text-procore-text">Disbursement History & Funding Records ({payments.length})</h2>
        </div>
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100/80 border-b border-procore-border text-procore-text-muted">
                  <th className="p-3 text-left font-bold">Transaction / Ref</th>
                  <th className="p-3 text-left font-bold">Recipient</th>
                  <th className="p-3 text-left font-bold">Funding Account</th>
                  <th className="p-3 text-center font-bold">Method</th>
                  <th className="p-3 text-center font-bold">Date</th>
                  <th className="p-3 text-right font-bold">Amount</th>
                  <th className="p-3 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-procore-border-light">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="p-3 font-bold text-procore-orange">{p.check_or_tx_number || 'TX-8921'}</td>
                    <td className="p-3 font-bold text-procore-text">{p.recipient_name}</td>
                    <td className="p-3 text-procore-text-secondary">{p.funding_account}</td>
                    <td className="p-3 text-center font-semibold text-procore-text">{p.payment_method}</td>
                    <td className="p-3 text-center text-procore-text-muted">{p.payment_date}</td>
                    <td className="p-3 text-right font-bold text-sm text-emerald-700">
                      ${p.amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-procore-text-muted">
            No disbursements recorded yet.
          </div>
        )}
      </div>

      {/* Modal: New Pay Application */}
      {isNewPayAppModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Submit Pay Application</h3>
            <form onSubmit={handleCreatePayApp} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Subcontract</label>
                <select
                  value={form.contract_id}
                  onChange={(e) => setForm({ ...form, contract_id: e.target.value })}
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                >
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>{c.title} (${(c.revised_amount || c.original_amount).toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Application #</label>
                  <input
                    required
                    type="number"
                    value={form.application_number}
                    onChange={(e) => setForm({ ...form, application_number: parseInt(e.target.value) || 1 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Period To</label>
                  <input
                    required
                    type="date"
                    value={form.period_to}
                    onChange={(e) => setForm({ ...form, period_to: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Total Work Completed ($)</label>
                  <input
                    required
                    type="number"
                    value={form.total_completed_to_date}
                    onChange={(e) => setForm({ ...form, total_completed_to_date: parseFloat(e.target.value) || 0 })}
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
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Previous Payments Received ($)</label>
                <input
                  type="number"
                  value={form.previous_payments}
                  onChange={(e) => setForm({ ...form, previous_payments: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-procore-border-light">
                <button
                  type="button"
                  onClick={() => setIsNewPayAppModal(false)}
                  className="px-3 py-1.5 border border-procore-border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-procore-orange text-white font-bold rounded hover:bg-procore-orange-hover"
                >
                  Submit Pay App
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Disburse Payment */}
      {isDisburseModal && selectedPayApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-2">Disburse Subcontractor Funds</h3>
            <p className="text-xs text-procore-text-muted mb-4">
              Pay Application #{selectedPayApp.application_number} · Net Due: ${selectedPayApp.current_payment_due.toLocaleString()}
            </p>
            <form onSubmit={handleDisbursePayment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Recipient</label>
                <input
                  required
                  type="text"
                  value={paymentForm.recipient_name}
                  onChange={(e) => setPaymentForm({ ...paymentForm, recipient_name: e.target.value })}
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Disbursement Amount ($)</label>
                  <input
                    required
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as Payment['payment_method'] })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  >
                    <option value="ACH">ACH Direct Deposit</option>
                    <option value="Wire">Bank Wire</option>
                    <option value="Check">Check</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Funding Account</label>
                <input
                  type="text"
                  value={paymentForm.funding_account}
                  onChange={(e) => setPaymentForm({ ...paymentForm, funding_account: e.target.value })}
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-procore-border-light">
                <button
                  type="button"
                  onClick={() => setIsDisburseModal(false)}
                  className="px-3 py-1.5 border border-procore-border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700"
                >
                  Execute Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
