'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { OwnerBilling, OwnerBillingItem, EstimateLine, ChangeOrder, Project } from '@/types';

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
  (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */
export default function OwnerBillingPage() {
  const params = useParams();
  const projectId = params.id as string;

  /* ---- state ---- */
  const [billings, setBillings] = useState<OwnerBilling[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'form'>('list');
  const [editingBilling, setEditingBilling] = useState<OwnerBilling | null>(null);
  const [printMode, setPrintMode] = useState<'all' | 'g702_only' | 'g703_only'>('all');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  /* G702 header & certificate fields */
  const [header, setHeader] = useState({
    owner_name: '',
    owner_address: '',
    contractor_name: '',
    contractor_address: '',
    project_name: '',
    project_address: '',
    contract_for: '',
    via_architect: '',
    application_number: 1,
    period_to: new Date().toISOString().split('T')[0],
    project_nos: '',
    contract_date: '',
    purchase_order: '',
    distribution_to: ['Const. Mgr'] as string[],
    original_contract_sum: 0,
    retainage_completed_pct: 10,
    retainage_stored_pct: 0,
    less_previous_certificates: 0,
    change_order_additions_prev: 0,
    change_order_deductions_prev: 0,
    change_order_additions_curr: 0,
    change_order_deductions_curr: 0,
    contractor_signature_by: '',
    contractor_signature_date: '',
    state_of: 'FLORIDA',
    county_of: 'BREWARD',
    notary_day: '',
    notary_month_year: '',
    notary_public: '',
    notary_commission_expires: '',
    amount_certified: 0,
    architect_signature_by: '',
    architect_signature_date: '',
  });

  /* G703 continuation sheet rows */
  const [rows, setRows] = useState<OwnerBillingItem[]>([emptyRow(1)]);

  /* Estimate lines for import */
  const [estimateLines, setEstimateLines] = useState<EstimateLine[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());

  /* Change orders for reference */
  const [, setChangeOrders] = useState<ChangeOrder[]>([]);

  /* ---- fetch ---- */
  const fetchData = useCallback(async () => {
    try {
      const [billRes, elRes, coRes, projRes] = await Promise.all([
        fetch(`/api/owner-billing?projectId=${projectId}`),
        fetch(`/api/estimate-lines?projectId=${projectId}`),
        fetch(`/api/change-orders?projectId=${projectId}`),
        fetch(`/api/projects/${projectId}`),
      ]);
      const billData = await billRes.json();
      const elData = await elRes.json();
      const coData = await coRes.json();
      const projData = await projRes.json();

      setBillings(billData.billings || []);
      setEstimateLines(elData.lines || []);
      setChangeOrders(coData.changeOrders || []);
      if (projData.project) {
        setProject(projData.project);
      }
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
  const recalcRow = useCallback((row: OwnerBillingItem): OwnerBillingItem => {
    const total_completed = (Number(row.work_completed_previous) || 0) + (Number(row.work_completed_this_period) || 0) + (Number(row.stored_materials) || 0);
    const scheduled = Number(row.scheduled_value) || 0;
    const pct_complete = scheduled > 0 ? Math.round((total_completed / scheduled) * 100) : 0;
    const balance_to_finish = scheduled - total_completed;
    const retainage = total_completed * ((Number(header.retainage_completed_pct) || 0) / 100);
    return { ...row, total_completed, pct_complete, balance_to_finish, retainage };
  }, [header.retainage_completed_pct]);

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
    const scheduled_total = rows.reduce((s, r) => s + (Number(r.scheduled_value) || 0), 0);
    const prev_total = rows.reduce((s, r) => s + (Number(r.work_completed_previous) || 0), 0);
    const this_period_total = rows.reduce((s, r) => s + (Number(r.work_completed_this_period) || 0), 0);
    const stored_total = rows.reduce((s, r) => s + (Number(r.stored_materials) || 0), 0);
    const completed_total = rows.reduce((s, r) => s + (Number(r.total_completed) || 0), 0);
    const balance_total = rows.reduce((s, r) => s + (Number(r.balance_to_finish) || 0), 0);
    const retainage_total = rows.reduce((s, r) => s + (Number(r.retainage) || 0), 0);

    const total_additions = (Number(header.change_order_additions_prev) || 0) + (Number(header.change_order_additions_curr) || 0);
    const total_deductions = (Number(header.change_order_deductions_prev) || 0) + (Number(header.change_order_deductions_curr) || 0);
    const net_co = total_additions - total_deductions;

    const original_contract_sum = Number(header.original_contract_sum) || 0;
    const contract_sum_to_date = original_contract_sum + net_co;
    const total_completed_and_stored = completed_total;

    // Retainage split
    const work_completed_total = prev_total + this_period_total;
    const retainage_on_completed = work_completed_total * ((Number(header.retainage_completed_pct) || 0) / 100);
    const retainage_on_stored = stored_total * ((Number(header.retainage_stored_pct) || 0) / 100);
    const total_retainage = retainage_total > 0 ? retainage_total : (retainage_on_completed + retainage_on_stored);

    const total_earned_less_retainage = total_completed_and_stored - total_retainage;
    const current_payment_due = total_earned_less_retainage - (Number(header.less_previous_certificates) || 0);
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
      total_additions,
      total_deductions,
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
      id: `imp-${el.id}-${Date.now()}-${idx}`,
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

    // Filter out existing empty placeholder rows
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
      change_order_additions: totals.total_additions,
      change_order_deductions: totals.total_deductions,
      net_change_orders: totals.net_co,
      total_completed_and_stored: totals.total_completed_and_stored,
      amount_certified: header.amount_certified || Math.max(0, totals.current_payment_due),
      status,
      items: rows.map(r => ({
        item_number: r.item_number,
        description: r.description,
        scheduled_value: Number(r.scheduled_value) || 0,
        work_completed_previous: Number(r.work_completed_previous) || 0,
        work_completed_this_period: Number(r.work_completed_this_period) || 0,
        stored_materials: Number(r.stored_materials) || 0,
        total_completed: Number(r.total_completed) || 0,
        pct_complete: Number(r.pct_complete) || 0,
        balance_to_finish: Number(r.balance_to_finish) || 0,
        retainage: Number(r.retainage) || 0,
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
      project_name: b.project_name || project?.name || '',
      project_address: b.project_address || project?.address || '',
      contract_for: b.contract_for || project?.name || '',
      via_architect: b.via_architect || '',
      application_number: b.application_number,
      period_to: b.period_to,
      project_nos: b.project_nos || '',
      contract_date: b.contract_date || '',
      purchase_order: b.purchase_order || '',
      distribution_to: b.distribution_to || ['Const. Mgr'],
      original_contract_sum: b.original_contract_sum || 0,
      retainage_completed_pct: b.retainage_completed_pct ?? 10,
      retainage_stored_pct: b.retainage_stored_pct ?? 0,
      less_previous_certificates: b.less_previous_certificates || 0,
      change_order_additions_prev: b.change_order_additions || 0,
      change_order_deductions_prev: b.change_order_deductions || 0,
      change_order_additions_curr: 0,
      change_order_deductions_curr: 0,
      contractor_signature_by: b.contractor_signature_by || '',
      contractor_signature_date: b.contractor_signature_date || '',
      state_of: b.state_of || 'FLORIDA',
      county_of: b.county_of || 'BREWARD',
      notary_day: b.notary_day || '',
      notary_month_year: b.notary_month_year || '',
      notary_public: b.notary_public || '',
      notary_commission_expires: b.notary_commission_expires || '',
      amount_certified: b.amount_certified ?? b.current_payment_due,
      architect_signature_by: b.architect_signature_by || '',
      architect_signature_date: b.architect_signature_date || '',
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
      owner_name: project?.client_name || '',
      owner_address: '',
      contractor_name: 'BTX CONTRACTORS',
      contractor_address: '712 Main St., Jourdanton, TX 78026',
      project_name: project?.name || 'CONVIVA JOURDANTON',
      project_address: project?.address || '1105 OAK STREET, JOURDANTON, TX 78026',
      contract_for: project?.name || 'CONVIVA JOURDANTON',
      via_architect: '',
      application_number: billings.length + 1,
      period_to: new Date().toISOString().split('T')[0],
      project_nos: '',
      contract_date: '',
      purchase_order: '',
      distribution_to: ['Const. Mgr'],
      original_contract_sum: 0,
      retainage_completed_pct: 10,
      retainage_stored_pct: 0,
      less_previous_certificates: 0,
      change_order_additions_prev: 0,
      change_order_deductions_prev: 0,
      change_order_additions_curr: 0,
      change_order_deductions_curr: 0,
      contractor_signature_by: '',
      contractor_signature_date: '',
      state_of: 'FLORIDA',
      county_of: 'BREWARD',
      notary_day: '',
      notary_month_year: '',
      notary_public: '',
      notary_commission_expires: '',
      amount_certified: 0,
      architect_signature_by: '',
      architect_signature_date: '',
    });
    setRows([emptyRow(1)]);
    setEditingBilling(null);
    setActiveView('form');
  };

  /* ---- direct high-resolution PDF download handler ---- */
  const handleSaveAsPDF = async (mode: 'all' | 'g702_only' | 'g703_only') => {
    setGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const cleanProjectName = (header.project_name || project?.name || 'Project')
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '_');

      const docName = mode === 'g702_only'
        ? `AIA_G702_Application_${header.application_number}_${cleanProjectName}.pdf`
        : mode === 'g703_only'
        ? `AIA_G703_Continuation_Sheet_${header.application_number}_${cleanProjectName}.pdf`
        : `AIA_G702_G703_Application_${header.application_number}_${cleanProjectName}.pdf`;

      // Standard Letter Landscape format: 279.4mm x 215.9mm (11in x 8.5in)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter',
      });

      const pageWidth = 279.4;
      const pageHeight = 215.9;
      const margin = 8;
      const maxContentWidth = pageWidth - (margin * 2);
      const maxContentHeight = pageHeight - (margin * 2);

      if (mode === 'g702_only' || mode === 'all') {
        const el702 = document.getElementById('g702-cover');
        if (el702) {
          const canvas702 = await html2canvas(el702, {
            scale: 2.5, // Crisp high-DPI resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
          });

          const imgData702 = canvas702.toDataURL('image/jpeg', 0.98);
          const imgWidth = maxContentWidth;
          const imgHeight = (canvas702.height * imgWidth) / canvas702.width;

          let renderWidth = imgWidth;
          let renderHeight = imgHeight;
          if (renderHeight > maxContentHeight) {
            renderHeight = maxContentHeight;
            renderWidth = (canvas702.width * renderHeight) / canvas702.height;
          }

          const posX = margin + (maxContentWidth - renderWidth) / 2;
          const posY = margin + (maxContentHeight - renderHeight) / 2;

          pdf.addImage(imgData702, 'JPEG', posX, posY, renderWidth, renderHeight);
        }
      }

      if (mode === 'all') {
        const el703 = document.getElementById('g703-continuation');
        if (el703) {
          pdf.addPage('letter', 'landscape');
          const canvas703 = await html2canvas(el703, {
            scale: 2.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
          });

          const imgData703 = canvas703.toDataURL('image/jpeg', 0.98);
          const imgWidth = maxContentWidth;
          let renderWidth = imgWidth;
          let renderHeight = (canvas703.height * imgWidth) / canvas703.width;
          if (renderHeight > maxContentHeight) {
            renderHeight = maxContentHeight;
            renderWidth = (canvas703.width * renderHeight) / canvas703.height;
          }

          const posX = margin + (maxContentWidth - renderWidth) / 2;
          const posY = margin + (maxContentHeight - renderHeight) / 2;

          pdf.addImage(imgData703, 'JPEG', posX, posY, renderWidth, renderHeight);
        }
      } else if (mode === 'g703_only') {
        const el703 = document.getElementById('g703-continuation');
        if (el703) {
          const canvas703 = await html2canvas(el703, {
            scale: 2.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
          });

          const imgData703 = canvas703.toDataURL('image/jpeg', 0.98);
          const imgWidth = maxContentWidth;
          let renderWidth = imgWidth;
          let renderHeight = (canvas703.height * imgWidth) / canvas703.width;
          if (renderHeight > maxContentHeight) {
            renderHeight = maxContentHeight;
            renderWidth = (canvas703.width * renderHeight) / canvas703.height;
          }

          const posX = margin + (maxContentWidth - renderWidth) / 2;
          const posY = margin + (maxContentHeight - renderHeight) / 2;

          pdf.addImage(imgData703, 'JPEG', posX, posY, renderWidth, renderHeight);
        }
      }

      // Automatically trigger direct file download
      pdf.save(docName);
    } catch (err) {
      console.error('Direct PDF error, falling back to print:', err);
      window.print();
    } finally {
      setGeneratingPdf(false);
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
    const totalBilled = billings.reduce((acc, b) => acc + (b.total_completed_and_stored || 0), 0);
    const totalRetainage = billings.reduce((acc, b) => acc + (b.retainage_amount || 0), 0);
    const totalDue = billings
      .filter(b => b.status === 'submitted' || b.status === 'approved')
      .reduce((acc, b) => acc + (b.current_payment_due || 0), 0);

    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-procore-border shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-procore-text tracking-tight">Application & Certificate for Payment</h1>
              <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-2.5 py-1 rounded-md">
                AIA Document G702™ / G703™
              </span>
            </div>
            <p className="text-xs text-procore-text-muted mt-1">
              Prime contractor billing to owner. Full AIA G702 cover sheet with lines 1-9 & Schedule of Values (G703).
            </p>
          </div>

          <button
            onClick={openNewForm}
            className="bg-gray-900 hover:bg-black text-white text-base font-extrabold px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl flex items-center gap-3 transition-all border-2 border-emerald-400 hover:border-emerald-300 active:scale-95 cursor-pointer"
          >
            <span className="bg-emerald-500 text-white rounded-md w-7 h-7 flex items-center justify-center text-xl font-black shadow-sm">+</span>
            Create Application
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-procore-border shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Contract Sum to Date</p>
            <p className="text-2xl font-black text-procore-text mt-1">${fmt(totalContract)}</p>
            <p className="text-[11px] text-procore-text-muted mt-0.5">Original + Approved COs</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-procore-border shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Completed & Stored</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">${fmt(totalBilled)}</p>
            <p className="text-[11px] text-procore-text-muted mt-0.5">
              {totalContract > 0 ? `${((totalBilled / totalContract) * 100).toFixed(1)}% of prime contract` : '—'}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-procore-border shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Retainage</p>
            <p className="text-2xl font-black text-amber-600 mt-1">${fmt(totalRetainage)}</p>
            <p className="text-[11px] text-procore-text-muted mt-0.5">Withheld reserve</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-procore-border shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Current Payment Due</p>
            <p className="text-2xl font-black text-procore-orange mt-1">${fmt(totalDue)}</p>
            <p className="text-[11px] text-procore-text-muted mt-0.5">Approved & Submitted</p>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-xl border border-procore-border shadow-xs overflow-hidden">
          <div className="p-4 border-b border-procore-border bg-gray-50/50 flex justify-between items-center">
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
                        <td className="p-3 font-bold text-procore-orange cursor-pointer hover:underline" onClick={() => openBilling(b)}>
                          App #{b.application_number}
                        </td>
                        <td className="p-3 text-center font-medium text-gray-600">{b.period_to}</td>
                        <td className="p-3 text-right font-bold text-procore-text">${fmt(b.contract_sum_to_date)}</td>
                        <td className="p-3 text-right font-medium text-emerald-700">${fmt(b.total_completed_and_stored)}</td>
                        <td className="p-3 text-right font-medium text-amber-700">-${fmt(b.retainage_amount)}</td>
                        <td className="p-3 text-right text-procore-text-muted">${fmt(b.less_previous_certificates)}</td>
                        <td className="p-3 text-right font-black text-sm text-procore-text">${fmt(b.current_payment_due)}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[b.status] || ''}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3 text-center space-x-2">
                          <button
                            onClick={() => openBilling(b)}
                            className="bg-gray-900 hover:bg-black text-white font-bold text-[11px] px-3 py-1 rounded shadow-2xs cursor-pointer"
                          >
                            Open Form
                          </button>
                          <button
                            onClick={() => {
                              openBilling(b);
                              setTimeout(() => handleSaveAsPDF('g702_only'), 300);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-2.5 py-1 rounded shadow-2xs cursor-pointer"
                            title="Save G702 Cover as PDF"
                          >
                            📄 PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-procore-text-muted">
              <p className="font-semibold text-base text-gray-700 mb-2">No pay applications created yet</p>
              <p className="text-xs text-gray-500 mb-4">Click below to create your first AIA G702 / G703 Application and Certificate for Payment.</p>
              <button
                onClick={openNewForm}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow cursor-pointer"
              >
                + Create Application Now
              </button>
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
      {/* Top Main Toolbar — UNMISSABLE, PROMINENT SAVE BUTTONS */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white p-4 rounded-xl border border-gray-700 shadow-lg print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setActiveView('list'); setEditingBilling(null); }}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white p-2 rounded-lg transition-colors cursor-pointer border border-gray-700"
              title="Back to List"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  {editingBilling ? `Application #${editingBilling.application_number}` : 'Create New Application for Payment'}
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                  AIA G702 / G703
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Current Payment Due: <span className="text-emerald-400 font-black text-xs">${fmt(Math.max(0, totals.current_payment_due))}</span> · Contract Sum: <span className="text-white font-bold">${fmt(totals.contract_sum_to_date)}</span>
              </p>
            </div>
          </div>

          {/* Action buttons: Import, Save, Print */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-3.5 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-blue-400"
            >
              <span className="text-sm">📥</span> Import from Estimate
            </button>

            <button
              onClick={() => handleSave('draft')}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-black px-4 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-gray-600 active:scale-95"
            >
              <span>💾</span> Save Draft
            </button>

            {/* THE BIG UNMISSABLE SAVE & SUBMIT BUTTON */}
            <button
              onClick={() => handleSave('submitted')}
              className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-sm font-black px-6 py-2.5 rounded-lg shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 cursor-pointer border-2 border-emerald-300 active:scale-95 ring-4 ring-emerald-500/20 animate-pulse hover:animate-none"
            >
              <span className="text-base">✓</span>
              <span>SAVE &amp; SUBMIT APPLICATION</span>
            </button>

            {/* SAVE AS PDF BUTTONS */}
            <div className="flex items-center gap-1.5 bg-blue-950/80 p-1 rounded-lg border border-blue-500/60 shadow-md">
              <button
                onClick={() => handleSaveAsPDF('g702_only')}
                disabled={generatingPdf}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-60 text-white text-xs font-black px-4 py-2 rounded-md shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-blue-300"
                title="Directly downloads the 1-page AIA G702 cover document as a PDF"
              >
                {generatingPdf ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">📄</span>
                    <span>Save as PDF (1 Page G702)</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleSaveAsPDF('all')}
                disabled={generatingPdf}
                className="bg-blue-800/80 hover:bg-blue-700 disabled:opacity-50 text-blue-100 hover:text-white text-[11px] font-bold px-3 py-2 rounded-md transition-colors cursor-pointer"
                title="Directly downloads full application (G702 Cover + G703 Schedule of Values) as PDF"
              >
                Save Full PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  PAGE 1 — AIA G702 APPLICATION AND CERTIFICATE FOR PAYMENT   */}
      {/*  EXACT LAYOUT OF THE USER-UPLOADED PHOTO                     */}
      {/* ============================================================ */}
      <div
        id="g702-cover"
        className={`bg-white text-black border-2 border-black p-4 font-sans print:p-0 print:border-black ${
          printMode === 'g703_only' ? 'print:hidden' : ''
        }`}
        style={{ maxWidth: '100%' }}
      >
        {/* Top title line */}
        <div className="flex justify-between items-baseline border-b-2 border-black pb-1 mb-2">
          <h1 className="text-base sm:text-lg font-black tracking-wider uppercase text-black">
            APPLICATION AND CERTIFICATE FOR PAYMENT
          </h1>
          <div className="text-[10px] font-bold text-black uppercase tracking-wider">
            PAGE ONE OF 1 PAGES
          </div>
        </div>

        {/* 4-column metadata header section matching uploaded photo */}
        <div className="grid grid-cols-12 border border-black text-[10px] leading-tight mb-2">
          {/* Column 1: TO OWNER / FROM CONTRACTOR */}
          <div className="col-span-12 sm:col-span-4 border-b sm:border-b-0 sm:border-r border-black p-2 space-y-2">
            <div>
              <span className="font-extrabold block text-black">TO OWNER:</span>
              <input
                type="text"
                value={header.owner_name}
                onChange={e => setHeader(h => ({ ...h, owner_name: e.target.value }))}
                placeholder="Owner Company Name"
                className="w-full font-bold text-black border-b border-dotted border-gray-400 focus:outline-none bg-transparent"
              />
              <textarea
                value={header.owner_address}
                onChange={e => setHeader(h => ({ ...h, owner_address: e.target.value }))}
                placeholder="Accounts Payable Dept / PO Box, Address"
                rows={2}
                className="w-full text-[9px] text-black border-none resize-none focus:outline-none bg-transparent mt-0.5"
              />
            </div>
            <div className="border-t border-black pt-1.5">
              <span className="font-extrabold block text-black">FROM CONTRACTOR:</span>
              <input
                type="text"
                value={header.contractor_name}
                onChange={e => setHeader(h => ({ ...h, contractor_name: e.target.value }))}
                placeholder="Contractor Company Name"
                className="w-full font-bold text-black border-b border-dotted border-gray-400 focus:outline-none bg-transparent"
              />
              <textarea
                value={header.contractor_address}
                onChange={e => setHeader(h => ({ ...h, contractor_address: e.target.value }))}
                placeholder="Contractor Address"
                rows={2}
                className="w-full text-[9px] text-black border-none resize-none focus:outline-none bg-transparent mt-0.5"
              />
            </div>
          </div>

          {/* Column 2: PROJECT / VIA ARCHITECT */}
          <div className="col-span-12 sm:col-span-3 border-b sm:border-b-0 sm:border-r border-black p-2 space-y-2">
            <div>
              <span className="font-extrabold block text-black">PROJECT:</span>
              <input
                type="text"
                value={header.project_name}
                onChange={e => setHeader(h => ({ ...h, project_name: e.target.value }))}
                placeholder="Project Name"
                className="w-full font-bold text-black border-b border-dotted border-gray-400 focus:outline-none bg-transparent"
              />
              <textarea
                value={header.project_address}
                onChange={e => setHeader(h => ({ ...h, project_address: e.target.value }))}
                placeholder="Project Site Address"
                rows={2}
                className="w-full text-[9px] text-black border-none resize-none focus:outline-none bg-transparent mt-0.5"
              />
            </div>
            <div className="border-t border-black pt-1.5">
              <span className="font-extrabold block text-black">VIA ARCHITECT:</span>
              <input
                type="text"
                value={header.via_architect}
                onChange={e => setHeader(h => ({ ...h, via_architect: e.target.value }))}
                placeholder="Architect Firm / Name"
                className="w-full text-[9px] text-black border-b border-dotted border-gray-400 focus:outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Column 3: APPLICATION #, PERIOD TO, PROJECT NOS, CONTRACT DATE */}
          <div className="col-span-12 sm:col-span-3 border-b sm:border-b-0 sm:border-r border-black p-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-black">APPLICATION #:</span>
              <input
                type="number"
                value={header.application_number}
                onChange={e => setHeader(h => ({ ...h, application_number: parseInt(e.target.value) || 1 }))}
                className="w-20 text-right font-black text-black border-b border-black focus:outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-black">PERIOD TO:</span>
              <input
                type="date"
                value={header.period_to}
                onChange={e => setHeader(h => ({ ...h, period_to: e.target.value }))}
                className="w-28 text-right font-bold text-black border-b border-black focus:outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-black">PROJECT NOS:</span>
              <input
                type="text"
                value={header.project_nos}
                onChange={e => setHeader(h => ({ ...h, project_nos: e.target.value }))}
                placeholder="—"
                className="w-24 text-right text-black border-b border-dotted border-gray-400 focus:outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-black">CONTRACT DATE:</span>
              <input
                type="date"
                value={header.contract_date}
                onChange={e => setHeader(h => ({ ...h, contract_date: e.target.value }))}
                className="w-28 text-right font-bold text-black border-b border-black focus:outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-black">Purchase Order:</span>
              <input
                type="text"
                value={header.purchase_order}
                onChange={e => setHeader(h => ({ ...h, purchase_order: e.target.value }))}
                placeholder="PO #"
                className="w-24 text-right text-black border-b border-dotted border-gray-400 focus:outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Column 4: Distribution to: */}
          <div className="col-span-12 sm:col-span-2 p-2">
            <span className="font-extrabold block text-black mb-1">Distribution to:</span>
            <div className="border border-black p-1.5 space-y-1">
              {['Owner', 'Const. Mgr', 'Architect', 'Contractor'].map(item => (
                <label key={item} className="flex items-center gap-1.5 text-[9px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={header.distribution_to.includes(item)}
                    onChange={() => toggleDistribution(item)}
                    className="w-3 h-3 border border-black rounded-none text-black focus:ring-0 cursor-pointer"
                  />
                  <span className="text-black font-semibold">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Contract For bar */}
        <div className="border border-black px-2 py-1 mb-2 text-[10px] flex items-center gap-2">
          <span className="font-extrabold text-black shrink-0">CONTRACT FOR:</span>
          <input
            type="text"
            value={header.contract_for}
            onChange={e => setHeader(h => ({ ...h, contract_for: e.target.value }))}
            placeholder="Contract description / Project"
            className="flex-1 font-bold text-black border-b border-dotted border-gray-400 focus:outline-none bg-transparent"
          />
        </div>

        {/* ============================================================ */}
        {/*  2-COLUMN SPLIT: LEFT (LINES 1-9 + CO) | RIGHT (SIGNATURES)   */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[9px] leading-tight">
          {/* ---------------- LEFT COLUMN ---------------- */}
          <div className="space-y-2">
            {/* Contractor's Application Header */}
            <div>
              <h2 className="text-[11px] font-black uppercase text-black tracking-wide">
                CONTRACTOR&apos;S APPLICATION FOR PAYMENT
              </h2>
              <p className="text-[8px] text-gray-700 leading-snug">
                Application is made for payment, as shown below, in connection with the Contract. Continuation Sheet is attached.
              </p>
            </div>

            {/* Lines 1 to 9 Table matching uploaded photo */}
            <div className="border border-black">
              <table className="w-full text-[9px] border-collapse">
                <tbody>
                  {/* 1. ORIGINAL CONTRACT SUM */}
                  <tr className="border-b border-black">
                    <td className="p-1 font-black text-black w-4 text-center">1.</td>
                    <td className="p-1 font-bold text-black">
                      ORIGINAL CONTRACT SUM...................................
                    </td>
                    <td className="p-1 text-right font-bold w-4">$</td>
                    <td className="p-1 text-right w-28 border-l border-black bg-white">
                      <input
                        type="number"
                        value={header.original_contract_sum || ''}
                        onChange={e => setHeader(h => ({ ...h, original_contract_sum: parseFloat(e.target.value) || 0 }))}
                        className="w-full text-right font-bold text-black focus:outline-none bg-transparent"
                        placeholder="0.00"
                      />
                    </td>
                  </tr>

                  {/* 2. Net change by Change Orders */}
                  <tr className="border-b border-black">
                    <td className="p-1 font-black text-black text-center">2.</td>
                    <td className="p-1 font-bold text-black">
                      Net change by Change Orders.............................
                    </td>
                    <td className="p-1 text-right font-bold">$</td>
                    <td className="p-1 text-right font-bold border-l border-black bg-white">
                      {totals.net_co !== 0 ? fmt(totals.net_co) : ''}
                    </td>
                  </tr>

                  {/* 3. CONTRACT SUM TO DATE */}
                  <tr className="border-b border-black bg-gray-50/50">
                    <td className="p-1 font-black text-black text-center">3.</td>
                    <td className="p-1 font-black text-black">
                      CONTRACT SUM TO DATE (Line 1 +/- 2)............
                    </td>
                    <td className="p-1 text-right font-bold">$</td>
                    <td className="p-1 text-right font-black border-l border-black bg-white">
                      {fmt(totals.contract_sum_to_date)}
                    </td>
                  </tr>

                  {/* 4. TOTAL COMPLETED & STORED TO DATE */}
                  <tr className="border-b border-black">
                    <td className="p-1 font-black text-black text-center">4.</td>
                    <td className="p-1 font-bold text-black">
                      TOTAL COMPLETED &amp; STORED TO DATE-$
                      <div className="text-[7.5px] text-gray-600 font-normal">(Column G on Continuation Sheet)</div>
                    </td>
                    <td className="p-1 text-right font-bold">$</td>
                    <td className="p-1 text-right font-black border-l border-black bg-white">
                      {fmt(totals.total_completed_and_stored)}
                    </td>
                  </tr>

                  {/* 5. RETAINAGE */}
                  <tr className="border-b border-black">
                    <td className="p-1 font-black text-black text-center" rowSpan={3}>5.</td>
                    <td className="p-1 font-bold text-black" colSpan={3}>
                      RETAINAGE:
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1 pl-4 text-black">
                      a.{' '}
                      <input
                        type="number"
                        value={header.retainage_completed_pct}
                        onChange={e => setHeader(h => ({ ...h, retainage_completed_pct: parseFloat(e.target.value) || 0 }))}
                        className="w-8 text-center font-bold border-b border-black focus:outline-none bg-transparent"
                      />
                      % of Completed Work
                      <div className="text-[7.5px] text-gray-600 font-normal">(Columns D+E on Continuation Sheet)</div>
                    </td>
                    <td className="p-1 text-right font-bold">$</td>
                    <td className="p-1 text-right font-semibold border-l border-black bg-white">
                      {totals.retainage_on_completed > 0 ? fmt(totals.retainage_on_completed) : ''}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1 pl-4 text-black">
                      b.{' '}
                      <input
                        type="number"
                        value={header.retainage_stored_pct}
                        onChange={e => setHeader(h => ({ ...h, retainage_stored_pct: parseFloat(e.target.value) || 0 }))}
                        className="w-8 text-center font-bold border-b border-black focus:outline-none bg-transparent"
                      />
                      % of Stored Material
                      <div className="text-[7.5px] text-gray-600 font-normal">(Column F on Continuation Sheet)</div>
                    </td>
                    <td className="p-1 text-right font-bold">$</td>
                    <td className="p-1 text-right font-semibold border-l border-black bg-white">
                      {totals.retainage_on_stored > 0 ? fmt(totals.retainage_on_stored) : ''}
                    </td>
                  </tr>

                  {/* Total Retainage line */}
                  <tr className="border-b border-black">
                    <td className="p-1 text-center"></td>
                    <td className="p-1 pl-4 text-black font-bold">
                      Total Retainage (Line 5a + 5b or<br />
                      Total in Column I of Continuation Sheet)---
                    </td>
                    <td className="p-1 text-right font-bold">$</td>
                    <td className="p-1 text-right font-black border-l border-black bg-white">
                      {fmt(totals.total_retainage)}
                    </td>
                  </tr>

                  {/* 6. TOTAL EARNED LESS RETAINAGE */}
                  <tr className="border-b border-black bg-gray-50/50">
                    <td className="p-1 font-black text-black text-center">6.</td>
                    <td className="p-1 font-black text-black">
                      TOTAL EARNED LESS RETAINAGE..............
                      <div className="text-[7.5px] text-gray-600 font-normal">(Line 4 less Line 5 Total)</div>
                    </td>
                    <td className="p-1 text-right font-bold">$</td>
                    <td className="p-1 text-right font-black border-l border-black bg-white">
                      {fmt(totals.total_earned_less_retainage)}
                    </td>
                  </tr>

                  {/* 7. LESS PREVIOUS CERTIFICATES FOR PAYMENT */}
                  <tr className="border-b border-black">
                    <td className="p-1 font-black text-black text-center">7.</td>
                    <td className="p-1 font-bold text-black">
                      LESS PREVIOUS CERTIFICATES FOR PAYMENT
                      <div className="text-[7.5px] text-gray-600 font-normal">(Line 6 from prior Certificate)</div>
                    </td>
                    <td className="p-1 text-right font-bold">$</td>
                    <td className="p-1 text-right w-28 border-l border-black bg-white">
                      <input
                        type="number"
                        value={header.less_previous_certificates || ''}
                        onChange={e => setHeader(h => ({ ...h, less_previous_certificates: parseFloat(e.target.value) || 0 }))}
                        className="w-full text-right font-bold text-black focus:outline-none bg-transparent"
                        placeholder="0.00"
                      />
                    </td>
                  </tr>

                  {/* 8. CURRENT PAYMENT DUE */}
                  <tr className="border-b border-black bg-emerald-50/40">
                    <td className="p-1 font-black text-black text-center">8.</td>
                    <td className="p-1 font-black text-black">
                      CURRENT PAYMENT DUE................................
                    </td>
                    <td className="p-1 text-right font-black">$</td>
                    <td className="p-1 text-right font-black text-[10px] border-l border-black bg-white">
                      {fmt(Math.max(0, totals.current_payment_due))}
                    </td>
                  </tr>

                  {/* 9. BALANCE TO FINISH, INCLUDING RETAINAGE */}
                  <tr>
                    <td className="p-1 font-black text-black text-center">9.</td>
                    <td className="p-1 font-bold text-black">
                      BALANCE TO FINISH, INCLUDING RETAINAGE
                      <div className="text-[7.5px] text-gray-600 font-normal">(Line 3 less Line 6)</div>
                    </td>
                    <td className="p-1 text-right font-bold">$</td>
                    <td className="p-1 text-right font-black border-l border-black bg-white">
                      {fmt(Math.max(0, totals.balance_to_finish_incl_retainage))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* CHANGE ORDER SUMMARY TABLE matching uploaded photo */}
            <div className="border border-black">
              <table className="w-full text-[8px] border-collapse">
                <thead>
                  <tr className="border-b border-black bg-gray-100 font-black">
                    <th className="p-1 text-left border-r border-black w-56">CHANGE ORDER SUMMARY</th>
                    <th className="p-1 text-center border-r border-black w-24">ADDITIONS</th>
                    <th className="p-1 text-center w-24">DEDUCTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-1 text-black border-r border-black">
                      Total changes approved in previous months by Owner
                    </td>
                    <td className="p-1 border-r border-black">
                      <input
                        type="number"
                        value={header.change_order_additions_prev || ''}
                        onChange={e => setHeader(h => ({ ...h, change_order_additions_prev: parseFloat(e.target.value) || 0 }))}
                        className="w-full text-right focus:outline-none bg-transparent"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        value={header.change_order_deductions_prev || ''}
                        onChange={e => setHeader(h => ({ ...h, change_order_deductions_prev: parseFloat(e.target.value) || 0 }))}
                        className="w-full text-right focus:outline-none bg-transparent"
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1 text-black border-r border-black">
                      Total approved this Month
                    </td>
                    <td className="p-1 border-r border-black">
                      <input
                        type="number"
                        value={header.change_order_additions_curr || ''}
                        onChange={e => setHeader(h => ({ ...h, change_order_additions_curr: parseFloat(e.target.value) || 0 }))}
                        className="w-full text-right focus:outline-none bg-transparent"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        value={header.change_order_deductions_curr || ''}
                        onChange={e => setHeader(h => ({ ...h, change_order_deductions_curr: parseFloat(e.target.value) || 0 }))}
                        className="w-full text-right focus:outline-none bg-transparent"
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-black bg-gray-50 font-bold">
                    <td className="p-1 text-right font-black text-black border-r border-black">
                      TOTALS
                    </td>
                    <td className="p-1 text-right border-r border-black font-bold">
                      ${fmt(totals.total_additions)}
                    </td>
                    <td className="p-1 text-right font-bold">
                      ${fmt(totals.total_deductions)}
                    </td>
                  </tr>
                  <tr className="font-black bg-gray-100">
                    <td className="p-1 text-black border-r border-black">
                      NET CHANGES by Change Order
                    </td>
                    <td className="p-1 text-right" colSpan={2}>
                      ${fmt(totals.net_co)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ---------------- RIGHT COLUMN ---------------- */}
          {/* CONTRACTOR CERTIFICATION, NOTARY, ARCHITECT CERTIFICATE */}
          <div className="space-y-2 flex flex-col justify-between">
            {/* Contractor Certification */}
            <div className="border border-black p-2 space-y-2">
              <p className="text-[8px] text-gray-800 leading-tight">
                The undersigned Contractor certifies that to the best of the Contractor&apos;s knowledge, information and
                belief the Work covered by this Application for Payment has been completed in accordance with the
                Contract Documents, that all amounts have been paid by the Contractor for Work for which previous
                Certificates for Payment were issued and payments received from the Owner, and that current payment
                shown therein is now due.
              </p>

              <div>
                <span className="font-extrabold block text-black mb-1">CONTRACTOR:</span>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex-1 flex items-baseline gap-1">
                    <span className="font-bold text-black shrink-0">By:</span>
                    <input
                      type="text"
                      value={header.contractor_signature_by}
                      onChange={e => setHeader(h => ({ ...h, contractor_signature_by: e.target.value }))}
                      placeholder="Authorized Signature"
                      className="flex-1 font-script text-xs text-blue-900 border-b border-black focus:outline-none bg-transparent px-1"
                    />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-black shrink-0">Date:</span>
                    <input
                      type="text"
                      value={header.contractor_signature_date}
                      onChange={e => setHeader(h => ({ ...h, contractor_signature_date: e.target.value }))}
                      placeholder="MM/DD/YYYY"
                      className="w-20 font-bold text-black border-b border-black focus:outline-none bg-transparent text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Notary Jurat */}
              <div className="pt-1 text-[8px] space-y-1">
                <div className="flex gap-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold">State of:</span>
                    <input
                      type="text"
                      value={header.state_of}
                      onChange={e => setHeader(h => ({ ...h, state_of: e.target.value }))}
                      className="w-20 font-bold uppercase border-b border-black focus:outline-none bg-transparent"
                    />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold">County of:</span>
                    <input
                      type="text"
                      value={header.county_of}
                      onChange={e => setHeader(h => ({ ...h, county_of: e.target.value }))}
                      className="w-20 font-bold uppercase border-b border-black focus:outline-none bg-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span>Subscribed and sworn to before me this</span>
                  <input
                    type="text"
                    value={header.notary_day}
                    onChange={e => setHeader(h => ({ ...h, notary_day: e.target.value }))}
                    placeholder="29"
                    className="w-8 text-center font-bold border-b border-black focus:outline-none bg-transparent"
                  />
                  <span>day of</span>
                  <input
                    type="text"
                    value={header.notary_month_year}
                    onChange={e => setHeader(h => ({ ...h, notary_month_year: e.target.value }))}
                    placeholder="MAY, 2026"
                    className="w-24 font-bold border-b border-black focus:outline-none bg-transparent"
                  />
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold shrink-0">Notary Public:</span>
                    <input
                      type="text"
                      value={header.notary_public}
                      onChange={e => setHeader(h => ({ ...h, notary_public: e.target.value }))}
                      placeholder="Notary Signature"
                      className="flex-1 font-script text-xs text-blue-900 border-b border-black focus:outline-none bg-transparent"
                    />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold shrink-0">My Commission expires:</span>
                    <input
                      type="text"
                      value={header.notary_commission_expires}
                      onChange={e => setHeader(h => ({ ...h, notary_commission_expires: e.target.value }))}
                      placeholder="MM/DD/YYYY"
                      className="w-36 font-bold border-b border-black focus:outline-none bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ARCHITECT CERTIFICATE FOR PAYMENT */}
            <div className="border border-black p-2 space-y-1.5">
              <h3 className="text-[11px] font-black uppercase text-black tracking-wide">
                CERTIFICATE FOR PAYMENT
              </h3>
              <p className="text-[8px] text-gray-800 leading-tight">
                In accordance with Contract Documents, based on on-site observations and the data comprising
                application, the Architect certifies to the Owner that to the best of the Architect&apos;s knowledge,
                information and belief the Work has progressed as indicated, the quality of the Work is in accordance with
                the Contract Documents, and the Contractor is entitled to payment of the AMOUNT CERTIFIED.
              </p>

              {/* AMOUNT CERTIFIED box */}
              <div className="flex items-baseline justify-between border-t border-b border-black py-1">
                <span className="font-black text-[10px] text-black">
                  AMOUNT CERTIFIED..........................................................
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-black">$</span>
                  <input
                    type="number"
                    value={header.amount_certified || Math.max(0, totals.current_payment_due)}
                    onChange={e => setHeader(h => ({ ...h, amount_certified: parseFloat(e.target.value) || 0 }))}
                    className="w-28 text-right font-black text-[10px] text-black border-b border-black focus:outline-none bg-transparent"
                  />
                </div>
              </div>

              <p className="text-[7px] text-gray-600 italic leading-snug">
                (Attach explanation if amount certified differs from the amount applied for. Initial all figures on this
                application and on the Continuation Sheet that are changed to conform to the amount certified.)
              </p>

              <div>
                <span className="font-extrabold block text-black mb-1">ARCHITECT:</span>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex-1 flex items-baseline gap-1">
                    <span className="font-bold text-black shrink-0">By:</span>
                    <input
                      type="text"
                      value={header.architect_signature_by}
                      onChange={e => setHeader(h => ({ ...h, architect_signature_by: e.target.value }))}
                      placeholder="Architect Signature"
                      className="flex-1 font-script text-xs text-blue-900 border-b border-black focus:outline-none bg-transparent px-1"
                    />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-black shrink-0">Date:</span>
                    <input
                      type="text"
                      value={header.architect_signature_date}
                      onChange={e => setHeader(h => ({ ...h, architect_signature_date: e.target.value }))}
                      placeholder="MM/DD/YYYY"
                      className="w-20 font-bold text-black border-b border-black focus:outline-none bg-transparent text-center"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[7px] text-gray-600 leading-snug">
                This Certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the Contractor named herein.
                Issuance, payment and acceptance of payment are without prejudice to any rights of the Owner or Contractor
                under this Contract.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  PAGE 2 — AIA G703 CONTINUATION SHEET                        */}
      {/* ============================================================ */}
      <div
        id="g703-continuation"
        className={`bg-white rounded-xl border border-procore-border shadow-xs overflow-hidden print:shadow-none print:border-black print:rounded-none ${
          printMode === 'g702_only' ? 'print:hidden' : ''
        }`}
      >
        {/* Title */}
        <div className="bg-gray-900 text-white px-5 py-3 flex items-center justify-between print:bg-white print:text-black print:border-b-2 print:border-black">
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-wide uppercase">
              Continuation Sheet
            </h2>
            <p className="text-[10px] text-gray-400 print:text-gray-600 mt-0.5">
              AIA Document G703™ — Attachment to Application #{header.application_number}
            </p>
          </div>
          <div className="text-right text-[10px] text-gray-400 print:text-gray-600">
            <p>APPLICATION NUMBER: <span className="font-black text-white print:text-black">{header.application_number}</span></p>
            <p>PERIOD TO: <span className="font-bold text-white print:text-black">{header.period_to}</span></p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] min-w-[1050px] border-collapse">
            <thead>
              {/* Column Letter headers */}
              <tr className="bg-gray-100 border-b border-gray-300 print:border-black">
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-12 print:border-black">A</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 print:border-black">B</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-28 print:border-black">C</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-28 print:border-black" colSpan={2}>
                  D &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; E
                </th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-24 print:border-black">F</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-28 print:border-black">G</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-14 print:border-black">%</th>
                <th className="p-1.5 text-center font-bold text-gray-500 border-r border-gray-300 w-24 print:border-black">H</th>
                <th className="p-1.5 text-center font-bold text-gray-500 w-24">I</th>
                <th className="p-1.5 w-8 print:hidden"></th>
              </tr>
              {/* Detailed headers */}
              <tr className="bg-gray-50 border-b-2 border-gray-400 text-[9px] print:border-black">
                <th className="p-1.5 text-center font-bold text-gray-700 border-r border-gray-300 print:border-black">
                  Item<br />No
                </th>
                <th className="p-1.5 text-left font-bold text-gray-700 border-r border-gray-300 print:border-black">
                  Description of Work
                </th>
                <th className="p-1.5 text-center font-bold text-gray-700 border-r border-gray-300 print:border-black">
                  Scheduled<br />Value
                </th>
                <th className="p-1.5 text-center font-bold text-gray-700 border-r border-gray-300 w-28 print:border-black">
                  Work Completed<br />
                  <span className="text-[8px] text-gray-500">From Previous<br />App (D+E)</span>
                </th>
                <th className="p-1.5 text-center font-bold text-gray-700 border-r border-gray-300 w-28 print:border-black">
                  Work Completed<br />
                  <span className="text-[8px] text-gray-500">This Period</span>
                </th>
                <th className="p-1.5 text-center font-bold text-gray-700 border-r border-gray-300 print:border-black">
                  Materials<br />Presently<br />Stored<br />
                  <span className="text-[8px] text-gray-500">(Not in D or E)</span>
                </th>
                <th className="p-1.5 text-center font-bold text-gray-700 border-r border-gray-300 print:border-black">
                  Total<br />Completed<br />&amp; Stored<br />
                  <span className="text-[8px] text-gray-500">(D+E+F)</span>
                </th>
                <th className="p-1.5 text-center font-bold text-gray-700 border-r border-gray-300 print:border-black">
                  G/C<br />
                  <span className="text-[8px] text-gray-500">%</span>
                </th>
                <th className="p-1.5 text-center font-bold text-gray-700 border-r border-gray-300 print:border-black">
                  Balance<br />To Finish<br />
                  <span className="text-[8px] text-gray-500">(C - G)</span>
                </th>
                <th className="p-1.5 text-center font-bold text-gray-700">
                  Retainage<br />
                  <span className="text-[8px] text-gray-500">(If Variable)</span>
                </th>
                <th className="p-1.5 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 print:divide-black">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-blue-50/30 group">
                  {/* A — Item No */}
                  <td className="p-1 text-center font-bold text-gray-500 border-r border-gray-200 bg-gray-50/50 print:border-black">
                    {row.item_number}
                  </td>
                  {/* B — Description */}
                  <td className="p-1 border-r border-gray-200 print:border-black">
                    <input
                      type="text"
                      value={row.description}
                      onChange={e => updateRow(idx, 'description', e.target.value)}
                      className="w-full text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                      placeholder="Description of Work"
                    />
                  </td>
                  {/* C — Scheduled Value */}
                  <td className="p-1 border-r border-gray-200 print:border-black">
                    <input
                      type="number"
                      value={row.scheduled_value || ''}
                      onChange={e => updateRow(idx, 'scheduled_value', parseFloat(e.target.value) || 0)}
                      className="w-full text-right text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                      placeholder="0.00"
                    />
                  </td>
                  {/* D — From Previous */}
                  <td className="p-1 border-r border-gray-200 print:border-black">
                    <input
                      type="number"
                      value={row.work_completed_previous || ''}
                      onChange={e => updateRow(idx, 'work_completed_previous', parseFloat(e.target.value) || 0)}
                      className="w-full text-right text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                      placeholder="0.00"
                    />
                  </td>
                  {/* E — This Period */}
                  <td className="p-1 border-r border-gray-200 print:border-black">
                    <input
                      type="number"
                      value={row.work_completed_this_period || ''}
                      onChange={e => updateRow(idx, 'work_completed_this_period', parseFloat(e.target.value) || 0)}
                      className="w-full text-right text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                      placeholder="0.00"
                    />
                  </td>
                  {/* F — Stored */}
                  <td className="p-1 border-r border-gray-200 print:border-black">
                    <input
                      type="number"
                      value={row.stored_materials || ''}
                      onChange={e => updateRow(idx, 'stored_materials', parseFloat(e.target.value) || 0)}
                      className="w-full text-right text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                      placeholder="0.00"
                    />
                  </td>
                  {/* G — Total (auto) */}
                  <td className="p-1 text-right font-bold text-[11px] text-procore-text border-r border-gray-200 bg-gray-50/30 px-2 print:border-black">
                    {fmt(row.total_completed)}
                  </td>
                  {/* G/C % (auto) */}
                  <td className="p-1 text-center font-bold text-[11px] border-r border-gray-200 bg-gray-50/30 print:border-black">
                    <span className={row.pct_complete >= 100 ? 'text-emerald-700' : row.pct_complete > 0 ? 'text-blue-700' : 'text-gray-400'}>
                      {row.pct_complete}%
                    </span>
                  </td>
                  {/* H — Balance (auto) */}
                  <td className="p-1 text-right text-[11px] font-medium text-procore-text border-r border-gray-200 bg-gray-50/30 px-2 print:border-black">
                    {fmt(row.balance_to_finish)}
                  </td>
                  {/* I — Retainage */}
                  <td className="p-1 text-right text-[11px] font-medium text-amber-700 bg-gray-50/30 px-2">
                    {fmt(row.retainage)}
                  </td>
                  {/* Delete button */}
                  <td className="p-1 text-center print:hidden">
                    <button
                      onClick={() => deleteRow(idx)}
                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm cursor-pointer"
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
              <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold text-[11px] print:border-black">
                <td className="p-2 text-center border-r border-gray-300 print:border-black" colSpan={2}>
                  <span className="uppercase text-gray-700 font-black text-[10px] tracking-wider">TOTALS</span>
                </td>
                <td className="p-2 text-right border-r border-gray-300 text-procore-text print:border-black">{fmt(totals.scheduled_total)}</td>
                <td className="p-2 text-right border-r border-gray-300 text-procore-text print:border-black">{fmt(totals.prev_total)}</td>
                <td className="p-2 text-right border-r border-gray-300 text-procore-text print:border-black">{fmt(totals.this_period_total)}</td>
                <td className="p-2 text-right border-r border-gray-300 text-procore-text print:border-black">{fmt(totals.stored_total)}</td>
                <td className="p-2 text-right border-r border-gray-300 text-emerald-700 font-black print:border-black">{fmt(totals.completed_total)}</td>
                <td className="p-2 text-center border-r border-gray-300 print:border-black">
                  <span className={totals.overall_pct >= 100 ? 'text-emerald-700 font-black' : 'text-blue-700 font-black'}>
                    {totals.overall_pct}%
                  </span>
                </td>
                <td className="p-2 text-right border-r border-gray-300 text-procore-text print:border-black">{fmt(totals.balance_total)}</td>
                <td className="p-2 text-right text-amber-700 font-black">{fmt(totals.retainage_total)}</td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Add row button */}
        <div className="px-4 py-2.5 border-t border-gray-200 print:hidden flex justify-between items-center bg-gray-50/50">
          <button
            onClick={addRow}
            className="text-procore-orange hover:text-procore-orange-hover text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="bg-procore-orange text-white rounded w-4 h-4 flex items-center justify-center text-xs">+</span>
            Add Line Item
          </button>

          <span className="text-[11px] text-gray-500 font-medium">
            {rows.length} item{rows.length !== 1 ? 's' : ''} in Schedule of Values
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  STICKY BOTTOM FLOATING SAVE BAR                             */}
      {/* ============================================================ */}
      <div className="fixed bottom-4 right-4 z-40 print:hidden">
        <div className="bg-gray-900 text-white rounded-2xl shadow-2xl border-2 border-gray-700 p-2.5 flex items-center gap-3 backdrop-blur-md">
          <div className="hidden sm:block pl-2 text-xs">
            <span className="text-gray-400">Payment Due: </span>
            <span className="text-emerald-400 font-black text-sm">${fmt(Math.max(0, totals.current_payment_due))}</span>
          </div>

          <button
            onClick={() => handleSaveAsPDF('g702_only')}
            disabled={generatingPdf}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-black px-3.5 py-2 rounded-xl transition-all border border-blue-400 cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
            title="Save 1-Page G702 as PDF"
          >
            <span>📄</span>
            <span>{generatingPdf ? 'Saving...' : 'Save as PDF'}</span>
          </button>

          <button
            onClick={() => handleSave('draft')}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all border border-gray-600 cursor-pointer"
          >
            Save Draft
          </button>

          <button
            onClick={() => handleSave('submitted')}
            className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-xs sm:text-sm font-black px-5 py-2 rounded-xl shadow-lg transition-all border border-emerald-300 cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <span>✓</span>
            <span>SAVE &amp; SUBMIT</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  IMPORT FROM ESTIMATE MODAL                                   */}
      {/* ============================================================ */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-procore-border max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-procore-border flex items-center justify-between bg-gray-50/70">
              <div>
                <h3 className="font-black text-base text-procore-text">Import from Project Estimate</h3>
                <p className="text-xs text-procore-text-muted mt-0.5">
                  Select estimate line items to populate Continuation Sheet (Schedule of Values) rows.
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {estimateLines.length > 0 ? (
                <div className="space-y-1.5">
                  {/* Select all bar */}
                  <label className="flex items-center gap-2.5 text-xs font-black text-procore-text p-2.5 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200/70 transition-colors">
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
                      className="w-4 h-4 rounded border-gray-400 text-procore-orange focus:ring-procore-orange cursor-pointer"
                    />
                    Select All ({estimateLines.length} estimate lines)
                  </label>

                  {estimateLines.map(el => (
                    <label
                      key={el.id}
                      className={`flex items-center gap-3 text-xs p-2.5 rounded-lg cursor-pointer transition-all ${
                        selectedImportIds.has(el.id)
                          ? 'bg-orange-50/90 border border-procore-orange/40 shadow-xs'
                          : 'hover:bg-gray-50 border border-transparent'
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
                        className="w-4 h-4 rounded border-gray-300 text-procore-orange focus:ring-procore-orange shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-procore-text truncate">
                          {el.division_code ? `${el.division_code} — ` : ''}{el.description || el.category}
                        </div>
                        <div className="text-[10px] text-procore-text-muted mt-0.5">
                          {el.category} · {el.quantity} {el.unit}
                        </div>
                      </div>
                      <span className="font-black text-procore-text text-sm shrink-0">
                        ${fmt(el.estimated_total)}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-procore-text-muted">
                  No estimate lines found for this project. Add items on the Estimate page first.
                </div>
              )}
            </div>

            {/* STICKY UNMISSABLE MODAL FOOTER */}
            <div className="sticky bottom-0 p-4 border-t border-procore-border bg-white flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
              <span className="text-xs text-procore-text-muted font-bold">
                {selectedImportIds.size} item{selectedImportIds.size !== 1 ? 's' : ''} selected
                {selectedImportIds.size > 0 && (
                  <span className="text-emerald-700 font-black ml-1">
                    · ${fmt(estimateLines.filter(el => selectedImportIds.has(el.id)).reduce((s, el) => s + el.estimated_total, 0))}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg text-xs hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedImportIds.size === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-lg shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>SAVE &amp; IMPORT ({selectedImportIds.size})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  PRINT CSS STYLES FOR EXACT 1-PAGE OUTPUT                     */}
      {/* ============================================================ */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter landscape;
            margin: 0.2in;
          }
          html, body {
            background: white !important;
            color: black !important;
            font-size: 8pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          #g702-cover {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: 2px solid black !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-height: 7.9in !important;
            padding: 6px 8px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          #g702-cover table td, #g702-cover table th {
            padding-top: 1.5px !important;
            padding-bottom: 1.5px !important;
          }
          #g703-continuation {
            page-break-before: always !important;
            break-before: page !important;
            box-shadow: none !important;
            border: 2px solid black !important;
            border-radius: 0 !important;
          }
          input[type="number"], input[type="text"], input[type="date"], textarea {
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
