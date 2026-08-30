'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { OwnerBilling, OwnerBillingItem, EstimateLine, ChangeOrder } from '@/types';

/* ------------------------------------------------------------------ */
/*  Default empty continuation sheet row                               */
/* ------------------------------------------------------------------ */
function emptyRow(itemNumber: number): OwnerBillingItem {
  return {
    id: `new-${Date.now()}-${itemNumber}`,
    billing_id: '',
    item_number: itemNumber,
    description: '',
    scheduled_value: 0,
    work_completed_previous: 0,
    work_completed_this_period: 0,
    stored_materials: 0,
    total_completed: 0,
    pct_complete: 0,
    balance_to_finish: 0,
    retainage: 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Currency formatter                                                 */
/* ------------------------------------------------------------------ */
const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ */
/*  MAIN PAGE COMPONENT                                                */
/* ------------------------------------------------------------------ */
export default function OwnerBillingPage() {
  const params = useParams();
  const projectId = params.id as string;

  /* ---- state ---- */
  const [billings, setBillings] = useState<OwnerBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'form'>('list');
  const [editingBilling, setEditingBilling] = useState<OwnerBilling | null>(null);

  /* G702 header fields */
  const [header, setHeader] = useState({
    owner_name: '',
    owner_address: '',
    contractor_name: '',
    contractor_address: '',
    contract_for: '',
    via_architect: '',
    application_number: 1,
    period_to: new Date().toISOString().split('T')[0],
    project_nos: '',
    contract_date: '',
    distribution_to: [] as string[],
    original_contract_sum: 0,
    retainage_completed_pct: 10,
    retainage_stored_pct: 10,
    less_previous_certificates: 0,
    change_order_additions: 0,
    change_order_deductions: 0,
  });

  /* G703 continuation sheet rows */
  const [rows, setRows] = useState<OwnerBillingItem[]>([emptyRow(1)]);

  /* Estimate lines for import */
  const [estimateLines, setEstimateLines] = useState<EstimateLine[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());

  /* Change orders for summary */
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);

  /* ---- fetch ---- */
  const fetchData = useCallback(async () => {
    try {
      const [billRes, elRes, coRes] = await Promise.all([
        fetch(`/api/owner-billing?projectId=${projectId}`),
        fetch(`/api/estimate-lines?projectId=${projectId}`),
        fetch(`/api/change-orders?projectId=${projectId}`),
      ]);
      const billData = await billRes.json();
      const elData = await elRes.json();
      const coData = await coRes.json();
      setBillings(billData.billings || []);
      setEstimateLines(elData.lines || []);
      setChangeOrders(coData.changeOrders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- auto-calculate row fields ---- */
  const recalcRow = (row: OwnerBillingItem): OwnerBillingItem => {
    const total_completed = row.work_completed_previous + row.work_completed_this_period + row.stored_materials;
    const pct_complete = row.scheduled_value > 0 ? Math.round((total_completed / row.scheduled_value) * 100) : 0;
    const balance_to_finish = row.scheduled_value - total_completed;
    const retainage = total_completed * (header.retainage_completed_pct / 100);
    return { ...row, total_completed, pct_complete, balance_to_finish, retainage };
  };

  const updateRow = (idx: number, field: keyof OwnerBillingItem, value: number | string) => {
    setRows(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      updated[idx] = recalcRow(updated[idx]);
      return updated;
    });
  };

  const addRow = () => {
    setRows(prev => [...prev, emptyRow(prev.length + 1)]);
  };

  const deleteRow = (idx: number) => {
    setRows(prev => {
      if (prev.length <= 1) return prev;
      const updated = prev.filter((_, i) => i !== idx);
      return updated.map((r, i) => ({ ...r, item_number: i + 1 }));
    });
  };

  /* ---- auto-calculated G702 totals from G703 rows ---- */
  const totals = useMemo(() => {
    const scheduled_total = rows.reduce((s, r) => s + r.scheduled_value, 0);
    const prev_total = rows.reduce((s, r) => s + r.work_completed_previous, 0);
    const this_period_total = rows.reduce((s, r) => s + r.work_completed_this_period, 0);
    const stored_total = rows.reduce((s, r) => s + r.stored_materials, 0);
    const completed_total = rows.reduce((s, r) => s + r.total_completed, 0);
    const balance_total = rows.reduce((s, r) => s + r.balance_to_finish, 0);
    const retainage_total = rows.reduce((s, r) => s + r.retainage, 0);

    const net_co = header.change_order_additions - header.change_order_deductions;
    const contract_sum_to_date = header.original_contract_sum + net_co;
    const total_completed_and_stored = completed_total;

    // Retainage split
    const work_completed_total = prev_total + this_period_total;
    const retainage_on_completed = work_completed_total * (header.retainage_completed_pct / 100);
    const retainage_on_stored = stored_total * (header.retainage_stored_pct / 100);
    const total_retainage = retainage_on_completed + retainage_on_stored;

    const total_earned_less_retainage = total_completed_and_stored - total_retainage;
    const current_payment_due = total_earned_less_retainage - header.less_previous_certificates;
    const balance_to_finish_incl_retainage = contract_sum_to_date - total_earned_less_retainage;

    const overall_pct = scheduled_total > 0 ? Math.round((completed_total / scheduled_total) * 100) : 0;

    return {
      scheduled_total,
      prev_total,
      this_period_total,
      stored_total,
      completed_total,
      balance_total,
      retainage_total,
      net_co,
      contract_sum_to_date,
      total_completed_and_stored,
      retainage_on_completed,
      retainage_on_stored,
      total_retainage,
      total_earned_less_retainage,
      current_payment_due,
      balance_to_finish_incl_retainage,
      overall_pct,
    };
  }, [rows, header]);

  /* ---- import from estimate ---- */
  const handleImport = () => {
    const selected = estimateLines.filter(el => selectedImportIds.has(el.id));
    const newRows: OwnerBillingItem[] = selected.map((el, idx) => ({
      id: `imp-${el.id}`,
      billing_id: '',
      item_number: rows.length + idx + 1,
      description: el.description || el.category,
      scheduled_value: el.estimated_total || 0,
      work_completed_previous: 0,
      work_completed_this_period: 0,
      stored_materials: 0,
      total_completed: 0,
      pct_complete: 0,
      balance_to_finish: el.estimated_total || 0,
      retainage: 0,
    }));

    // Filter out any existing empty placeholder rows
    const existingNonEmpty = rows.filter(r => r.description.trim() !== '' || r.scheduled_value > 0);
    const combined = [...existingNonEmpty, ...newRows].map((r, i) => ({ ...r, item_number: i + 1 }));
    setRows(combined.length > 0 ? combined : [emptyRow(1)]);
    setShowImportModal(false);
    setSelectedImportIds(new Set());
  };

  /* ---- save / submit ---- */
  const handleSave = async (status: 'draft' | 'submitted') => {
    const payload = {
      project_id: projectId,
      ...header,
      net_change_orders: totals.net_co,
      total_completed_and_stored: totals.total_completed_and_stored,
      status,
      items: rows.map(r => ({
        item_number: r.item_number,
        description: r.description,
        scheduled_value: r.scheduled_value,
        work_completed_previous: r.work_completed_previous,
        work_completed_this_period: r.work_completed_this_period,
        stored_materials: r.stored_materials,
        total_completed: r.total_completed,
        pct_complete: r.pct_complete,
        balance_to_finish: r.balance_to_finish,
        retainage: r.retainage,
      })),
    };

    try {
      const isEditing = editingBilling !== null;
      const res = await fetch('/api/owner-billing', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { id: editingBilling.id, ...payload } : payload),
      });
      if (res.ok) {
        setActiveView('list');
        setEditingBilling(null);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* ---- open existing billing for edit ---- */
  const openBilling = (b: OwnerBilling) => {
    setHeader({
      owner_name: b.owner_name || '',
      owner_address: b.owner_address || '',
      contractor_name: b.contractor_name || '',
      contractor_address: b.contractor_address || '',
      contract_for: b.contract_for || '',
      via_architect: b.via_architect || '',
      application_number: b.application_number,
      period_to: b.period_to,
      project_nos: b.project_nos || '',
      contract_date: b.contract_date || '',
      distribution_to: b.distribution_to || [],
      original_contract_sum: b.original_contract_sum,
      retainage_completed_pct: b.retainage_completed_pct ?? 10,
      retainage_stored_pct: b.retainage_stored_pct ?? 10,
      less_previous_certificates: b.less_previous_certificates,
      change_order_additions: b.change_order_additions ?? 0,
      change_order_deductions: b.change_order_deductions ?? 0,
    });
    setRows(
      b.items && b.items.length > 0
        ? b.items.map(item => recalcRow(item))
        : [emptyRow(1)]
    );
    setEditingBilling(b);
    setActiveView('form');
  };

  /* ---- new blank form ---- */
  const openNewForm = () => {
    setHeader({
      owner_name: '',
      owner_address: '',
      contractor_name: '',
      contractor_address: '',
      contract_for: '',
      via_architect: '',
      application_number: billings.length + 1,
      period_to: new Date().toISOString().split('T')[0],
      project_nos: '',
      contract_date: '',
      distribution_to: [],
      original_contract_sum: 0,
      retainage_completed_pct: 10,
      retainage_stored_pct: 10,
      less_previous_certificates: 0,
      change_order_additions: 0,
      change_order_deductions: 0,
    });
    setRows([emptyRow(1)]);
    setEditingBilling(null);
    setActiveView('form');
  };

  /* ---- approve ---- */
  const handleApprove = async (id: string) => {
    try {
      await fetch('/api/owner-billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  /* ---- delete ---- */
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this application?')) return;
    try {
      await fetch(`/api/owner-billing?id=${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  /* ---- toggle distribution checkbox ---- */
  const toggleDistribution = (val: string) => {
    setHeader(prev => {
      const arr = [...prev.distribution_to];
      const idx = arr.indexOf(val);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(val);
      return { ...prev, distribution_to: arr };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-procore-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ================================================================ */
  /*  LIST VIEW                                                        */
  /* ================================================================ */
  if (activeView === 'list') {
    const totalContract = billings[0]?.contract_sum_to_date || 0;
    const totalBilled = billings.reduce((acc, b) => acc + b.total_completed_and_stored, 0);
    const totalRetainage = billings.reduce((acc, b) => acc + b.retainage_amount, 0);
    const totalDue = billings
      .filter(b => b.status === 'submitted' || b.status === 'approved')
      .reduce((acc, b) => acc + b.current_payment_due, 0);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-procore-text tracking-tight">Application & Certificate for Payment</h1>
              <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
                AIA G702 / G703
              </span>
            </div>
            <p className="text-xs text-procore-text-muted mt-0.5">
              Owner billing with Continuation Sheet (Schedule of Values). Line items pull from your project estimate.
            </p>
          </div>

          <button
            onClick={openNewForm}
            className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <span>+</span> Create Application
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Contract Sum to Date</p>
            <p className="text-2xl font-bold text-procore-text mt-1">${fmt(totalContract)}</p>
            <p className="text-[11px] text-procore-text-muted mt-0.5">Original + Change Orders</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Billed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">${fmt(totalBilled)}</p>
            <p className="text-[11px] text-procore-text-muted mt-0.5">
              {totalContract > 0 ? `${((totalBilled / totalContract) * 100).toFixed(1)}% complete` : '—'}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Retainage Withheld</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">${fmt(totalRetainage)}</p>
            <p className="text-[11px] text-procore-text-muted mt-0.5">Cumulative reserve</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Current Payment Due</p>
            <p className="text-2xl font-bold text-procore-orange mt-1">${fmt(totalDue)}</p>
            <p className="text-[11px] text-procore-text-muted mt-0.5">Submitted / Approved</p>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
          <div className="p-4 border-b border-procore-border bg-gray-50/50">
            <h2 className="text-sm font-bold text-procore-text">
              Applications & Certificates ({billings.length})
            </h2>
          </div>

          {billings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100/80 border-b border-procore-border text-procore-text-muted">
                    <th className="p-3 text-left font-bold">App #</th>
                    <th className="p-3 text-center font-bold">Period To</th>
                    <th className="p-3 text-right font-bold">Contract Sum</th>
                    <th className="p-3 text-right font-bold">Completed & Stored</th>
                    <th className="p-3 text-right font-bold">Retainage</th>
                    <th className="p-3 text-right font-bold">Previous Certs</th>
                    <th className="p-3 text-right font-bold">Current Due</th>
                    <th className="p-3 text-center font-bold">Status</th>
                    <th className="p-3 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-procore-border-light">
                  {billings.map((b) => {
                    const statusColors: Record<string, string> = {
                      draft: 'bg-gray-100 text-gray-700',
                      submitted: 'bg-amber-100 text-amber-800',
                      approved: 'bg-emerald-100 text-emerald-800',
                      paid: 'bg-blue-100 text-blue-800',
                    };
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/60">
                        <td className="p-3 font-bold text-procore-orange cursor-pointer" onClick={() => openBilling(b)}>
                          App #{b.application_number}
                        </td>
                        <td className="p-3 text-center">{b.period_to}</td>
                        <td className="p-3 text-right font-bold">${fmt(b.contract_sum_to_date)}</td>
                        <td className="p-3 text-right">${fmt(b.total_completed_and_stored)}</td>
                        <td className="p-3 text-right text-amber-700">-${fmt(b.retainage_amount)}</td>
                        <td className="p-3 text-right text-procore-text-muted">${fmt(b.less_previous_certificates)}</td>
                        <td className="p-3 text-right font-bold text-sm">${fmt(b.current_payment_due)}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[b.status] || ''}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3 text-center space-x-1">
                          <button
                            onClick={() => openBilling(b)}
                            className="text-procore-orange hover:underline font-bold text-[10px]"
                          >
                            View
                          </button>
                          {b.status === 'submitted' && (
                            <button
                              onClick={() => handleApprove(b.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 rounded"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="text-red-500 hover:text-red-700 font-bold text-[10px]"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-procore-text-muted">
              No applications created yet. Click &quot;+ Create Application&quot; to generate your first AIA G702/G703 form.
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  FORM VIEW — Combined G702 + G703                                 */
  /* ================================================================ */
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-lg border border-procore-border shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setActiveView('list'); setEditingBilling(null); }}
            className="text-procore-text-muted hover:text-procore-orange transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h2 className="text-sm font-bold text-procore-text">
            {editingBilling ? `Application #${editingBilling.application_number}` : 'New Application & Certificate for Payment'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded shadow-xs transition-colors"
          >
            + Import from Estimate
          </button>
          <button
            onClick={() => handleSave('draft')}
            className="border border-procore-border text-procore-text text-[11px] font-bold px-3 py-1.5 rounded hover:bg-gray-50 transition-colors"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave('submitted')}
            className="bg-procore-orange hover:bg-procore-orange-hover text-white text-[11px] font-bold px-3 py-1.5 rounded shadow-xs transition-colors"
          >
            Submit Application
          </button>
          <button
            onClick={() => window.print()}
            className="border border-procore-border text-procore-text-muted text-[11px] font-bold px-3 py-1.5 rounded hover:bg-gray-50 transition-colors"
          >
            🖨 Print
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  PAGE 1 — AIA G702 COVER SHEET                               */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden print:shadow-none print:border-black print:rounded-none" id="g702-cover">
        {/* Title */}
        <div className="bg-gray-900 text-white px-5 py-3 text-center print:bg-white print:text-black print:border-b-2 print:border-black">
          <h2 className="text-base font-extrabold tracking-wide uppercase">
            Application and Certificate for Payment
          </h2>
          <p className="text-[10px] text-gray-400 print:text-gray-600 mt-0.5">AIA Document G702™</p>
        </div>

        <div className="p-5 print:p-4">
          {/* Header grid: Left info + Right info */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
            {/* Left column — TO / FROM / CONTRACT FOR / VIA */}
            <div className="lg:col-span-7 space-y-3">
              {/* TO OWNER */}
              <div className="border border-gray-300 rounded p-2.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">To Owner:</label>
                <input
                  type="text"
                  value={header.owner_name}
                  onChange={e => setHeader(h => ({ ...h, owner_name: e.target.value }))}
                  placeholder="Owner company name"
                  className="w-full border-b border-gray-300 pb-1 mb-1 text-sm font-semibold text-procore-text focus:outline-none focus:border-procore-orange bg-transparent"
                />
                <textarea
                  value={header.owner_address}
                  onChange={e => setHeader(h => ({ ...h, owner_address: e.target.value }))}
                  placeholder="Owner address"
                  rows={2}
                  className="w-full text-xs text-procore-text-secondary focus:outline-none resize-none bg-transparent"
                />
              </div>

              {/* FROM CONTRACTOR */}
              <div className="border border-gray-300 rounded p-2.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">From Contractor:</label>
                <input
                  type="text"
                  value={header.contractor_name}
                  onChange={e => setHeader(h => ({ ...h, contractor_name: e.target.value }))}
                  placeholder="Contractor company name"
                  className="w-full border-b border-gray-300 pb-1 mb-1 text-sm font-semibold text-procore-text focus:outline-none focus:border-procore-orange bg-transparent"
                />
                <textarea
                  value={header.contractor_address}
                  onChange={e => setHeader(h => ({ ...h, contractor_address: e.target.value }))}
                  placeholder="Contractor address"
                  rows={2}
                  className="w-full text-xs text-procore-text-secondary focus:outline-none resize-none bg-transparent"
                />
              </div>

              {/* CONTRACT FOR / VIA ARCHITECT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-gray-300 rounded p-2.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Contract For:</label>
                  <input
                    type="text"
                    value={header.contract_for}
                    onChange={e => setHeader(h => ({ ...h, contract_for: e.target.value }))}
                    placeholder="Project name or description"
                    className="w-full text-sm text-procore-text focus:outline-none bg-transparent border-b border-gray-300 pb-1"
                  />
                </div>
                <div className="border border-gray-300 rounded p-2.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Via Architect:</label>
                  <input
                    type="text"
                    value={header.via_architect}
                    onChange={e => setHeader(h => ({ ...h, via_architect: e.target.value }))}
                    placeholder="Architect firm name"
                    className="w-full text-sm text-procore-text focus:outline-none bg-transparent border-b border-gray-300 pb-1"
                  />
                </div>
              </div>
            </div>

            {/* Right column — Application details */}
            <div className="lg:col-span-5 space-y-3">
              <div className="border border-gray-300 rounded p-2.5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Application #:</label>
                    <input
                      type="number"
                      value={header.application_number}
                      onChange={e => setHeader(h => ({ ...h, application_number: parseInt(e.target.value) || 1 }))}
                      className="w-full text-sm font-bold text-procore-text focus:outline-none bg-transparent border-b border-gray-300 pb-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Period To:</label>
                    <input
                      type="date"
                      value={header.period_to}
                      onChange={e => setHeader(h => ({ ...h, period_to: e.target.value }))}
                      className="w-full text-sm text-procore-text focus:outline-none bg-transparent border-b border-gray-300 pb-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Project Nos:</label>
                    <input
                      type="text"
                      value={header.project_nos}
                      onChange={e => setHeader(h => ({ ...h, project_nos: e.target.value }))}
                      className="w-full text-sm text-procore-text focus:outline-none bg-transparent border-b border-gray-300 pb-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Contract Date:</label>
                    <input
                      type="date"
                      value={header.contract_date}
                      onChange={e => setHeader(h => ({ ...h, contract_date: e.target.value }))}
                      className="w-full text-sm text-procore-text focus:outline-none bg-transparent border-b border-gray-300 pb-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Distribution checkboxes */}
              <div className="border border-gray-300 rounded p-2.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Distribution to:</label>
                <div className="grid grid-cols-2 gap-1">
                  {['Owner', 'Const. Mgr', 'Architect', 'Contractor'].map(val => (
                    <label key={val} className="flex items-center gap-1.5 text-[11px] text-procore-text cursor-pointer">
                      <input
                        type="checkbox"
                        checked={header.distribution_to.includes(val)}
                        onChange={() => toggleDistribution(val)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-procore-orange focus:ring-procore-orange"
                      />
                      {val}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/*  CONTRACTOR'S APPLICATION FOR PAYMENT — Lines 1–9         */}
          {/* -------------------------------------------------------- */}
          <div className="mt-5">
            <div className="bg-gray-100 rounded-t px-3 py-2 border border-gray-300 border-b-0">
              <h3 className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                Contractor&apos;s Application for Payment
              </h3>
              <p className="text-[9px] text-gray-500 mt-0.5">
                Application is made for payment, as shown below, in connection with the Contract. Continuation Sheet is attached.
              </p>
            </div>

            <div className="border border-gray-300 rounded-b overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  {/* Line 1 */}
                  <tr className="border-b border-gray-200">
                    <td className="p-2 font-bold text-procore-text w-8 text-center bg-gray-50">1.</td>
                    <td className="p-2 text-procore-text">ORIGINAL CONTRACT SUM</td>
                    <td className="p-2 text-right w-8 text-gray-400">$</td>
                    <td className="p-2 text-right w-36">
                      <input
                        type="number"
                        value={header.original_contract_sum || ''}
                        onChange={e => setHeader(h => ({ ...h, original_contract_sum: parseFloat(e.target.value) || 0 }))}
                        className="w-full text-right text-sm font-bold text-procore-text focus:outline-none bg-transparent"
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                  {/* Line 2 */}
                  <tr className="border-b border-gray-200">
                    <td className="p-2 font-bold text-procore-text text-center bg-gray-50">2.</td>
                    <td className="p-2 text-procore-text">Net change by Change Orders</td>
                    <td className="p-2 text-right text-gray-400">$</td>
                    <td className="p-2 text-right font-bold text-sm text-procore-text">{fmt(totals.net_co)}</td>
                  </tr>
                  {/* Line 3 */}
                  <tr className="border-b border-gray-200 bg-blue-50/50">
                    <td className="p-2 font-bold text-procore-text text-center bg-gray-50">3.</td>
                    <td className="p-2 font-bold text-procore-text">CONTRACT SUM TO DATE (Line 1 ± 2)</td>
                    <td className="p-2 text-right text-gray-400">$</td>
                    <td className="p-2 text-right font-bold text-sm text-procore-text">{fmt(totals.contract_sum_to_date)}</td>
                  </tr>
                  {/* Line 4 */}
                  <tr className="border-b border-gray-200">
                    <td className="p-2 font-bold text-procore-text text-center bg-gray-50">4.</td>
                    <td className="p-2 text-procore-text">
                      TOTAL COMPLETED &amp; STORED TO DATE
                      <span className="text-[9px] text-gray-500 ml-1">(Column G on Continuation Sheet)</span>
                    </td>
                    <td className="p-2 text-right text-gray-400">$</td>
                    <td className="p-2 text-right font-bold text-sm text-emerald-700">{fmt(totals.total_completed_and_stored)}</td>
                  </tr>
                  {/* Line 5 — Retainage */}
                  <tr className="border-b border-gray-200">
                    <td className="p-2 font-bold text-procore-text text-center bg-gray-50" rowSpan={3}>5.</td>
                    <td className="p-2 text-procore-text font-semibold" colSpan={3}>RETAINAGE:</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="p-2 pl-6 text-procore-text-secondary">
                      <span className="font-semibold">a.</span>{' '}
                      <input
                        type="number"
                        value={header.retainage_completed_pct}
                        onChange={e => setHeader(h => ({ ...h, retainage_completed_pct: parseFloat(e.target.value) || 0 }))}
                        className="w-12 text-center text-xs font-bold border-b border-gray-300 focus:outline-none bg-transparent"
                      />
                      % of Completed Work
                    </td>
                    <td className="p-2 text-right text-gray-400">$</td>
                    <td className="p-2 text-right text-amber-700 font-medium">{fmt(totals.retainage_on_completed)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-2 pl-6 text-procore-text-secondary">
                      <span className="font-semibold">b.</span>{' '}
                      <input
                        type="number"
                        value={header.retainage_stored_pct}
                        onChange={e => setHeader(h => ({ ...h, retainage_stored_pct: parseFloat(e.target.value) || 0 }))}
                        className="w-12 text-center text-xs font-bold border-b border-gray-300 focus:outline-none bg-transparent"
                      />
                      % of Stored Material
                    </td>
                    <td className="p-2 text-right text-gray-400">$</td>
                    <td className="p-2 text-right text-amber-700 font-medium">{fmt(totals.retainage_on_stored)}</td>
                  </tr>
                  {/* Total Retainage row */}
                  <tr className="border-b border-gray-200 bg-amber-50/40">
                    <td className="p-2 bg-gray-50"></td>
                    <td className="p-2 pl-6 font-bold text-procore-text">Total Retainage (Lines 5a + 5b or Total in Column I of G703)</td>
                    <td className="p-2 text-right text-gray-400">$</td>
                    <td className="p-2 text-right font-bold text-amber-700">{fmt(totals.total_retainage)}</td>
                  </tr>
                  {/* Line 6 */}
                  <tr className="border-b border-gray-200 bg-blue-50/50">
                    <td className="p-2 font-bold text-procore-text text-center bg-gray-50">6.</td>
                    <td className="p-2 font-bold text-procore-text">
                      TOTAL EARNED LESS RETAINAGE
                      <span className="text-[9px] text-gray-500 ml-1">(Line 4 less Line 5 Total)</span>
                    </td>
                    <td className="p-2 text-right text-gray-400">$</td>
                    <td className="p-2 text-right font-bold text-sm text-procore-text">{fmt(totals.total_earned_less_retainage)}</td>
                  </tr>
                  {/* Line 7 */}
                  <tr className="border-b border-gray-200">
                    <td className="p-2 font-bold text-procore-text text-center bg-gray-50">7.</td>
                    <td className="p-2 text-procore-text">
                      LESS PREVIOUS CERTIFICATES FOR PAYMENT
                      <span className="text-[9px] text-gray-500 ml-1">(Line 6 from prior Certificate)</span>
                    </td>
                    <td className="p-2 text-right text-gray-400">$</td>
                    <td className="p-2 text-right w-36">
                      <input
                        type="number"
                        value={header.less_previous_certificates || ''}
                        onChange={e => setHeader(h => ({ ...h, less_previous_certificates: parseFloat(e.target.value) || 0 }))}
                        className="w-full text-right text-sm font-bold text-procore-text focus:outline-none bg-transparent"
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                  {/* Line 8 */}
                  <tr className="border-b border-gray-200 bg-emerald-50/60">
                    <td className="p-2 font-bold text-procore-text text-center bg-gray-50">8.</td>
                    <td className="p-2 font-bold text-procore-text">
                      CURRENT PAYMENT DUE
                    </td>
                    <td className="p-2 text-right text-gray-400">$</td>
                    <td className="p-2 text-right font-extrabold text-base text-emerald-700">{fmt(Math.max(0, totals.current_payment_due))}</td>
                  </tr>
                  {/* Line 9 */}
                  <tr>
                    <td className="p-2 font-bold text-procore-text text-center bg-gray-50">9.</td>
                    <td className="p-2 font-bold text-procore-text">
                      BALANCE TO FINISH, INCLUDING RETAINAGE
                      <span className="text-[9px] text-gray-500 ml-1">(Line 3 less Line 6)</span>
                    </td>
                    <td className="p-2 text-right text-gray-400">$</td>
                    <td className="p-2 text-right font-bold text-sm text-procore-text">{fmt(Math.max(0, totals.balance_to_finish_incl_retainage))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/*  CHANGE ORDER SUMMARY                                     */}
          {/* -------------------------------------------------------- */}
          <div className="mt-5">
            <div className="bg-gray-100 rounded-t px-3 py-2 border border-gray-300 border-b-0">
              <h3 className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                Change Order Summary
              </h3>
            </div>
            <div className="border border-gray-300 rounded-b overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-2 text-left font-bold text-gray-600"></th>
                    <th className="p-2 text-right font-bold text-gray-600">ADDITIONS</th>
                    <th className="p-2 text-right font-bold text-gray-600">DEDUCTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-2 text-procore-text">Total changes approved in previous months by Owner</td>
                    <td className="p-2 text-right w-36">
                      <input
                        type="number"
                        value={header.change_order_additions || ''}
                        onChange={e => setHeader(h => ({ ...h, change_order_additions: parseFloat(e.target.value) || 0 }))}
                        className="w-full text-right text-xs font-medium text-procore-text focus:outline-none bg-transparent"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2 text-right w-36">
                      <input
                        type="number"
                        value={header.change_order_deductions || ''}
                        onChange={e => setHeader(h => ({ ...h, change_order_deductions: parseFloat(e.target.value) || 0 }))}
                        className="w-full text-right text-xs font-medium text-procore-text focus:outline-none bg-transparent"
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                  <tr className="bg-gray-50 font-bold">
                    <td className="p-2 text-procore-text">NET CHANGES by Change Order</td>
                    <td className="p-2 text-right" colSpan={2}>
                      <span className={totals.net_co >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                        ${fmt(totals.net_co)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/*  SIGNATURE BLOCKS                                         */}
          {/* -------------------------------------------------------- */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contractor signature */}
            <div className="border border-gray-300 rounded p-3">
              <p className="text-[9px] text-gray-500 leading-relaxed mb-4">
                The undersigned Contractor certifies that to the best of the Contractor&apos;s knowledge, information and
                belief the Work covered by this Application for Payment has been completed in accordance with the
                Contract Documents, that all amounts have been paid by the Contractor for Work for which previous
                Certificates for Payment were issued and payments received from the Owner, and that current payment
                shown herein is now due.
              </p>
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-[10px] font-bold text-gray-600 shrink-0">By:</span>
                  <span className="text-[10px] text-gray-500 shrink-0">CONTRACTOR:</span>
                  <div className="flex-1 border-b border-gray-400 min-h-[20px]"></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-end gap-1">
                    <span className="text-[10px] text-gray-500 shrink-0">State of:</span>
                    <div className="flex-1 border-b border-gray-400 min-h-[16px]"></div>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-[10px] text-gray-500 shrink-0">Date:</span>
                    <div className="flex-1 border-b border-gray-400 min-h-[16px]"></div>
                  </div>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-[10px] text-gray-500 shrink-0">County of:</span>
                  <div className="flex-1 border-b border-gray-400 min-h-[16px]"></div>
                </div>
                <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
                  <p className="text-[9px] text-gray-500 italic">
                    Subscribed and sworn to before me this _____ day of _____________
                  </p>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-[10px] text-gray-500 shrink-0">Notary Public:</span>
                    <div className="flex-1 border-b border-gray-400 min-h-[16px]"></div>
                  </div>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-[10px] text-gray-500 shrink-0">My Commission expires:</span>
                    <div className="flex-1 border-b border-gray-400 min-h-[16px]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Architect Certificate */}
            <div className="border border-gray-300 rounded p-3">
              <h4 className="text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-2">
                Certificate for Payment
              </h4>
              <p className="text-[9px] text-gray-500 leading-relaxed mb-4">
                In accordance with Contract Documents, based on on-site observations and the data comprising
                the application, the Architect certifies to the Owner that to the best of the Architect&apos;s knowledge,
                information and belief, the Work has progressed as indicated, the quality of the Work is in accordance with
                the Contract Documents, and the Contractor is entitled to payment of the AMOUNT CERTIFIED.
              </p>
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-blue-800 uppercase">Amount Certified</span>
                    <span className="text-sm font-extrabold text-blue-800">$ {fmt(Math.max(0, totals.current_payment_due))}</span>
                  </div>
                  <p className="text-[8px] text-blue-600 mt-0.5 italic">
                    (Attach explanation if Amount Certified differs from the amount applied for. Initial all figures on this
                    application and on the Continuation Sheet that are changed to conform to the amount certified.)
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-[10px] font-bold text-gray-600 shrink-0">ARCHITECT:</span>
                  <div className="flex-1 border-b border-gray-400 min-h-[20px]"></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-end gap-1">
                    <span className="text-[10px] text-gray-500 shrink-0">By:</span>
                    <div className="flex-1 border-b border-gray-400 min-h-[16px]"></div>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-[10px] text-gray-500 shrink-0">Date:</span>
                    <div className="flex-1 border-b border-gray-400 min-h-[16px]"></div>
                  </div>
                </div>
                <p className="text-[8px] text-gray-500 italic mt-1">
                  This Certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the Contractor named
                  herein. Issuance, payment and acceptance of payment are without prejudice to any rights of the Owner
                  or Contractor under this Contract.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  PAGE 2 — AIA G703 CONTINUATION SHEET                        */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden print:shadow-none print:border-black print:rounded-none print:break-before-page" id="g703-continuation">
        {/* Title */}
        <div className="bg-gray-900 text-white px-5 py-3 print:bg-white print:text-black print:border-b-2 print:border-black">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold tracking-wide uppercase">
                Continuation Sheet
              </h2>
              <p className="text-[10px] text-gray-400 print:text-gray-600 mt-0.5">AIA Document G703™ — Attachment to G702, Application No. {header.application_number}</p>
            </div>
            <div className="text-right text-[10px] text-gray-400 print:text-gray-600">
              <p>APPLICATION NUMBER: <span className="font-bold text-white print:text-black">{header.application_number}</span></p>
              <p>PERIOD TO: <span className="font-bold text-white print:text-black">{header.period_to}</span></p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] min-w-[1100px]">
            <thead>
              {/* Column group headers */}
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-12">A</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300">B</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-28">C</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-28" colSpan={2}>D &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; E</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-24">F</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-28">G</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-14">%</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-24">H</th>
                <th className="p-1.5 text-center font-bold text-gray-500 w-24">I</th>
                <th className="p-1.5 w-8 print:hidden"></th>
              </tr>
              {/* Column detail headers */}
              <tr className="bg-gray-50 border-b-2 border-gray-400 text-[9px]">
                <th className="p-1.5 text-center font-bold text-gray-600 border-r border-gray-300">
                  Item<br />No
                </th>
                <th className="p-1.5 text-left font-bold text-gray-600 border-r border-gray-300">
                  Description of Work
                </th>
                <th className="p-1.5 text-center font-bold text-gray-600 border-r border-gray-300">
                  Scheduled<br />Value
                </th>
                <th className="p-1.5 text-center font-bold text-gray-600 border-r border-gray-300 w-28">
                  Work Completed<br />
                  <span className="text-[8px] text-gray-500">From Previous<br />Application (D+E)</span>
                </th>
                <th className="p-1.5 text-center font-bold text-gray-600 border-r border-gray-300 w-28">
                  Work Completed<br />
                  <span className="text-[8px] text-gray-500">This Period</span>
                </th>
                <th className="p-1.5 text-center font-bold text-gray-600 border-r border-gray-300">
                  Materials<br />Presently<br />Stored<br />
                  <span className="text-[8px] text-gray-500">(Not in<br />D or E)</span>
                </th>
                <th className="p-1.5 text-center font-bold text-gray-600 border-r border-gray-300">
                  Total<br />Completed<br />And Stored<br />To Date<br />
                  <span className="text-[8px] text-gray-500">(D+E+F)</span>
                </th>
                <th className="p-1.5 text-center font-bold text-gray-600 border-r border-gray-300">
                  G/C<br />
                  <span className="text-[8px] text-gray-500">%</span>
                </th>
                <th className="p-1.5 text-center font-bold text-gray-600 border-r border-gray-300">
                  Balance<br />To Finish<br />
                  <span className="text-[8px] text-gray-500">(C - G)</span>
                </th>
                <th className="p-1.5 text-center font-bold text-gray-600">
                  Retainage<br />
                  <span className="text-[8px] text-gray-500">(If Variable<br />Rate)</span>
                </th>
                <th className="p-1.5 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-blue-50/30 group">
                  {/* A — Item No */}
                  <td className="p-1 text-center font-bold text-gray-500 border-r border-gray-200 bg-gray-50/50">
                    {row.item_number}
                  </td>
                  {/* B — Description */}
                  <td className="p-1 border-r border-gray-200">
                    <input
                      type="text"
                      value={row.description}
                      onChange={e => updateRow(idx, 'description', e.target.value)}
                      className="w-full text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                      placeholder="Description of Work"
                    />
                  </td>
                  {/* C — Scheduled Value */}
                  <td className="p-1 border-r border-gray-200">
                    <input
                      type="number"
                      value={row.scheduled_value || ''}
                      onChange={e => updateRow(idx, 'scheduled_value', parseFloat(e.target.value) || 0)}
                      className="w-full text-right text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                      placeholder="0.00"
                    />
                  </td>
                  {/* D — From Previous */}
                  <td className="p-1 border-r border-gray-200">
                    <input
                      type="number"
                      value={row.work_completed_previous || ''}
                      onChange={e => updateRow(idx, 'work_completed_previous', parseFloat(e.target.value) || 0)}
                      className="w-full text-right text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                      placeholder="0.00"
                    />
                  </td>
                  {/* E — This Period */}
                  <td className="p-1 border-r border-gray-200">
                    <input
                      type="number"
                      value={row.work_completed_this_period || ''}
                      onChange={e => updateRow(idx, 'work_completed_this_period', parseFloat(e.target.value) || 0)}
                      className="w-full text-right text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                      placeholder="0.00"
                    />
                  </td>
                  {/* F — Stored */}
                  <td className="p-1 border-r border-gray-200">
                    <input
                      type="number"
                      value={row.stored_materials || ''}
                      onChange={e => updateRow(idx, 'stored_materials', parseFloat(e.target.value) || 0)}
                      className="w-full text-right text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                      placeholder="0.00"
                    />
                  </td>
                  {/* G — Total (auto) */}
                  <td className="p-1 text-right font-bold text-[11px] text-procore-text border-r border-gray-200 bg-gray-50/30 px-2">
                    {fmt(row.total_completed)}
                  </td>
                  {/* G/C % (auto) */}
                  <td className="p-1 text-center font-bold text-[11px] border-r border-gray-200 bg-gray-50/30">
                    <span className={row.pct_complete >= 100 ? 'text-emerald-700' : row.pct_complete > 0 ? 'text-blue-700' : 'text-gray-400'}>
                      {row.pct_complete}%
                    </span>
                  </td>
                  {/* H — Balance (auto) */}
                  <td className="p-1 text-right text-[11px] font-medium text-procore-text border-r border-gray-200 bg-gray-50/30 px-2">
                    {fmt(row.balance_to_finish)}
                  </td>
                  {/* I — Retainage */}
                  <td className="p-1 text-right text-[11px] font-medium text-amber-700 bg-gray-50/30 px-2">
                    {fmt(row.retainage)}
                  </td>
                  {/* Delete */}
                  <td className="p-1 text-center print:hidden">
                    <button
                      onClick={() => deleteRow(idx)}
                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold text-[11px]">
                <td className="p-2 text-center border-r border-gray-300" colSpan={2}>
                  <span className="uppercase text-gray-600 text-[10px] tracking-wider">Totals</span>
                </td>
                <td className="p-2 text-right border-r border-gray-300 text-procore-text">{fmt(totals.scheduled_total)}</td>
                <td className="p-2 text-right border-r border-gray-300 text-procore-text">{fmt(totals.prev_total)}</td>
                <td className="p-2 text-right border-r border-gray-300 text-procore-text">{fmt(totals.this_period_total)}</td>
                <td className="p-2 text-right border-r border-gray-300 text-procore-text">{fmt(totals.stored_total)}</td>
                <td className="p-2 text-right border-r border-gray-300 text-emerald-700">{fmt(totals.completed_total)}</td>
                <td className="p-2 text-center border-r border-gray-300">
                  <span className={totals.overall_pct >= 100 ? 'text-emerald-700' : 'text-blue-700'}>{totals.overall_pct}%</span>
                </td>
                <td className="p-2 text-right border-r border-gray-300 text-procore-text">{fmt(totals.balance_total)}</td>
                <td className="p-2 text-right text-amber-700">{fmt(totals.retainage_total)}</td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Add row button */}
        <div className="px-4 py-2 border-t border-gray-200 print:hidden">
          <button
            onClick={addRow}
            className="text-procore-orange hover:text-procore-orange-hover text-[11px] font-bold flex items-center gap-1 transition-colors"
          >
            <span className="text-base">+</span> Add Line Item
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  IMPORT FROM ESTIMATE MODAL                                   */}
      {/* ============================================================ */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full border border-procore-border max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-procore-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-procore-text">Import from Project Estimate</h3>
                <p className="text-[11px] text-procore-text-muted mt-0.5">
                  Select estimate line items to add as Continuation Sheet rows.
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {estimateLines.length > 0 ? (
                <div className="space-y-1">
                  {/* Select all */}
                  <label className="flex items-center gap-2 text-xs font-bold text-procore-text-muted p-2 border-b border-gray-200 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedImportIds.size === estimateLines.length && estimateLines.length > 0}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedImportIds(new Set(estimateLines.map(el => el.id)));
                        } else {
                          setSelectedImportIds(new Set());
                        }
                      }}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-procore-orange focus:ring-procore-orange"
                    />
                    Select All ({estimateLines.length} items)
                  </label>
                  {estimateLines.map(el => (
                    <label
                      key={el.id}
                      className={`flex items-center gap-3 text-xs p-2 rounded cursor-pointer transition-colors ${
                        selectedImportIds.has(el.id) ? 'bg-orange-50 border border-procore-orange/30' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedImportIds.has(el.id)}
                        onChange={e => {
                          const next = new Set(selectedImportIds);
                          if (e.target.checked) next.add(el.id);
                          else next.delete(el.id);
                          setSelectedImportIds(next);
                        }}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-procore-orange focus:ring-procore-orange shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-procore-text truncate">
                          {el.division_code ? `${el.division_code} — ` : ''}{el.description || el.category}
                        </div>
                        <div className="text-[10px] text-procore-text-muted">
                          {el.category} · {el.quantity} {el.unit}
                        </div>
                      </div>
                      <span className="font-bold text-procore-text shrink-0">
                        ${fmt(el.estimated_total)}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-procore-text-muted">
                  No estimate lines found for this project. Add line items on the Estimate page first.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-procore-border flex items-center justify-between">
              <span className="text-xs text-procore-text-muted">
                {selectedImportIds.size} item{selectedImportIds.size !== 1 ? 's' : ''} selected
                {selectedImportIds.size > 0 && (
                  <> · Total: ${fmt(estimateLines.filter(el => selectedImportIds.has(el.id)).reduce((s, el) => s + el.estimated_total, 0))}</>
                )}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 border border-procore-border rounded text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedImportIds.size === 0}
                  className="px-4 py-1.5 bg-procore-orange text-white font-bold text-xs rounded hover:bg-procore-orange-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import {selectedImportIds.size} Item{selectedImportIds.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-black { border-color: black !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:text-black { color: black !important; }
          .print\\:border-b-2 { border-bottom-width: 2px !important; }
          .print\\:break-before-page { break-before: page !important; }
          .print\\:p-4 { padding: 1rem !important; }
          input[type="number"], input[type="text"], input[type="date"], textarea {
            border: none !important;
            padding: 0 !important;
          }
          table { font-size: 9px !important; }
        }
      `}</style>
    </div>
  );
}
