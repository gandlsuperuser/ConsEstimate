'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { OwnerBilling, OwnerBillingItem, EstimateLine, ChangeOrder, Project } from '@/types';

import CurrencyInput, { formatCurrencyUSD } from '@/components/CurrencyInput';
import {
  parseAndEvaluateFormula,
  recalculateAllFormulas,
  getFormulaSuggestions,
} from '@/lib/continuation-formulas';

const DEFAULT_G703_ROWS = 28;

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
    scheduled_value_formula: undefined,
    work_completed_previous_formula: undefined,
    work_completed_this_period_formula: undefined,
    stored_materials_formula: undefined,
  };
}

function createInitialRows(count = DEFAULT_G703_ROWS): OwnerBillingItem[] {
  return Array.from({ length: count }, (_, i) => emptyRow(i + 1));
}

const fmt = (n: number) =>
  (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ */
/*  Division Number Extractor for Sorting (Div 01 -> Div 28 -> Alts)  */
/* ------------------------------------------------------------------ */
function extractDivisionNumber(desc: string): number {
  if (!desc) return 9999;
  const d = desc.trim();
  if (/alternate|alt\b/i.test(d)) {
    const altMatch = d.match(/(?:alternate|alt)\s*#?\s*(\d+(?:\.\d+)?)/i);
    return altMatch ? 1000 + parseFloat(altMatch[1]) : 1000;
  }
  const match = d.match(/(?:Division|Div|Section)?\s*(\d+(?:\.\d+)?)/i);
  if (match) {
    return parseFloat(match[1]);
  }
  return 9999;
}

function extractEstimateDivisionNumber(el: EstimateLine): number {
  if (el.division_code) {
    const cleaned = el.division_code.trim().replace(/^div(?:ision)?\.?\s*/i, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) return num;
  }
  const text = `${el.description || ''} ${el.category || ''}`.trim();
  return extractDivisionNumber(text);
}

/* Standard CSI MasterFormat divisions used on the Proposal & Estimate Form */
const STANDARD_DIVISIONS = [
  { code: '01', name: 'General Requirements' },
  { code: '02', name: 'Existing Conditions / Demolition' },
  { code: '03', name: 'Concrete' },
  { code: '04', name: 'Masonry' },
  { code: '05', name: 'Metals' },
  { code: '06', name: 'Wood, Plastics & Composites' },
  { code: '07', name: 'Thermal & Moisture Protection' },
  { code: '08', name: 'Openings' },
  { code: '09', name: 'Finishes' },
  { code: '10', name: 'Specialties' },
  { code: '11', name: 'Equipment' },
  { code: '12', name: 'Furnishings' },
  { code: '13', name: 'Special Construction' },
  { code: '14', name: 'Conveying Equipment' },
  { code: '21', name: 'Fire Suppression' },
  { code: '22', name: 'Plumbing' },
  { code: '23', name: 'HVAC' },
  { code: '25', name: 'Integrated Automation' },
  { code: '26', name: 'Electrical' },
  { code: '27', name: 'Communications' },
  { code: '28', name: 'Electronic Safety & Security' },
];

interface DivisionGroup {
  code: string;
  name: string;
  lines: EstimateLine[];
  subtotal: number;
}

export interface EstimateAlternate {
  id: string | number;
  number: number;
  desc: string;
  total: number;
}

export const DEFAULT_ESTIMATE_ALTERNATES: EstimateAlternate[] = [
  { id: 1, number: 1, desc: 'Additional plumbing allowances for the service hook up from city', total: 16500.00 },
  { id: 2, number: 2, desc: 'fire alarm system allowances', total: 7000.00 },
  { id: 3, number: 3, desc: 'Temporary power generator 3-phase 300kw allowances', total: 12000.00 },
  { id: 4, number: 4, desc: 'Project Supervision', total: 78000.00 },
];

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
  const [isEditingOrigSum, setIsEditingOrigSum] = useState(false);

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
    original_contract_sum: 1044266.65,
    retainage_completed_pct: 0,
    retainage_stored_pct: 0,
    less_previous_certificates: 0,
    change_order_additions_prev: 0,
    change_order_deductions_prev: 0,
    change_order_additions_curr: 0,
    change_order_deductions_curr: 0,
    contractor_signature_by: '',
    contractor_signature_date: '',
    state_of: '',
    county_of: '',
    notary_day: '',
    notary_month_year: '',
    notary_public: '',
    notary_commission_expires: '',
    amount_certified: 0,
    architect_signature_by: '',
    architect_signature_date: '',
  });

  /* G703 continuation sheet rows — initialized with 28 lines by default */
  const [rows, setRows] = useState<OwnerBillingItem[]>(() => createInitialRows(DEFAULT_G703_ROWS));

  /* Estimate lines for import & division aggregation */
  const [estimateLines, setEstimateLines] = useState<EstimateLine[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  const [aggregateByDivision, setAggregateByDivision] = useState(true);
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());

  /* Alternates state (Exact match to Humana proposal & synced from Estimate tab) */
  const [alternatesData] = useState<EstimateAlternate[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`project_alternates_${projectId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item, idx) => ({
              id: item.id || idx + 1,
              number: item.number || item.id || idx + 1,
              desc: item.desc || item.description || '',
              total: Number(item.total) || 0,
            }));
          }
        }
      } catch (e) {
        console.error('Failed to parse project alternates from localStorage:', e);
      }
    }
    return DEFAULT_ESTIMATE_ALTERNATES;
  });

  const alternateLines = useMemo((): EstimateLine[] => {
    return alternatesData.map((alt) => ({
      id: `alt-${alt.id || alt.number}`,
      project_id: projectId,
      category: 'Alternates & Allowances',
      division_code: 'ALT',
      description: `Alternate #${alt.number || alt.id}: ${alt.desc}`,
      quantity: 1,
      unit: 'LS',
      labor_unit_cost: alt.total,
      material_unit_cost: 0,
      sub_cost: 0,
      estimated_total: alt.total,
      actual_total: 0,
      notes: `Alternate #${alt.number || alt.id}`,
    }));
  }, [alternatesData, projectId]);

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
      const sortedLines = (elData.lines || []).sort((a: EstimateLine, b: EstimateLine) => {
        const divA = extractEstimateDivisionNumber(a);
        const divB = extractEstimateDivisionNumber(b);
        if (divA !== divB) return divA - divB;
        return (a.description || a.category || '').localeCompare(b.description || b.category || '');
      });
      setEstimateLines(sortedLines);
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
      let updated = [...prev];
      // If setting a direct value, clear any existing formula for this field
      const formulaKey = `${String(field)}_formula` as keyof OwnerBillingItem;
      updated[idx] = {
        ...updated[idx],
        [field]: value,
        [formulaKey]: undefined,
      };
      updated[idx] = recalcRow(updated[idx]);
      // Re-evaluate all other formulas (e.g. cascading sums / subtotals)
      updated = recalculateAllFormulas(updated);
      return updated;
    });
  };

  const updateRowWithFormula = (
    idx: number,
    field: keyof OwnerBillingItem,
    value: number,
    formula?: string
  ) => {
    setRows(prev => {
      let updated = [...prev];
      const formulaKey = `${String(field)}_formula` as keyof OwnerBillingItem;
      updated[idx] = {
        ...updated[idx],
        [field]: value,
        [formulaKey]: formula || undefined,
      };
      updated[idx] = recalcRow(updated[idx]);
      // Cascading formula recalculation
      updated = recalculateAllFormulas(updated);
      return updated;
    });
  };

  const insertEmptyRow = (atIndex?: number) => {
    setRows(prev => {
      const targetIdx = atIndex !== undefined ? atIndex : prev.length;
      const updated = [...prev];
      const newRow = emptyRow(targetIdx + 1);
      updated.splice(targetIdx, 0, newRow);
      const renumbered = updated.map((r, i) => ({ ...r, item_number: i + 1 }));
      return recalculateAllFormulas(renumbered);
    });
  };

  const addRow = () => {
    insertEmptyRow();
  };

  const deleteRow = (idx: number) => {
    setRows(prev => {
      if (prev.length <= 1) {
        return [emptyRow(1)];
      }
      const updated = prev.filter((_, i) => i !== idx);
      const renumbered = updated.map((r, i) => ({ ...r, item_number: i + 1 }));
      return recalculateAllFormulas(renumbered);
    });
  };

  /* ---- sort rows by division 1 to large numbers ---- */
  const sortRowsByDivision = () => {
    setRows(prev => {
      const nonEmpty = prev.filter(r => r.description.trim() !== '' || r.scheduled_value > 0);
      nonEmpty.sort((a, b) => {
        const divA = extractDivisionNumber(a.description);
        const divB = extractDivisionNumber(b.description);
        if (divA !== divB) return divA - divB;
        return a.description.localeCompare(b.description);
      });
      const finalCount = Math.max(DEFAULT_G703_ROWS, nonEmpty.length);
      const res: OwnerBillingItem[] = [];
      for (let i = 0; i < finalCount; i++) {
        if (i < nonEmpty.length) {
          res.push({ ...nonEmpty[i], item_number: i + 1 });
        } else {
          res.push(emptyRow(i + 1));
        }
      }
      return res;
    });
  };

  /* ---- row reordering (drag & drop and nudge) ---- */
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const moveRow = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= rows.length || toIdx >= rows.length) return;
    setRows(prev => {
      const updated = [...prev];
      const [movedItem] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, movedItem);
      return updated.map((r, i) => ({ ...r, item_number: i + 1 }));
    });
  };

  const moveRowUp = (idx: number) => {
    if (idx <= 0) return;
    moveRow(idx, idx - 1);
  };

  const moveRowDown = (idx: number) => {
    if (idx >= rows.length - 1) return;
    moveRow(idx, idx + 1);
  };

  /* ---- auto-calculated G702 totals from G703 rows ---- */
  const totals = useMemo(() => {
    // Helper to identify custom subtotal/summary rows (never double count in division totals)
    const isSummaryRow = (desc: string) => {
      const d = (desc || '').trim().toLowerCase();
      return /^(lump sum|overhead|profit|subtotal|total\b|markup|taxes|tax\b|permit fee|the draw|draw\b|the balance|balance:)/i.test(d);
    };

    // Find any explicit Draw row if entered on the continuation sheet
    const drawRow = rows.find(r => /^\s*(the\s+)?draw\b/i.test(r.description));
    const drawRowAmount = drawRow
      ? (Number(drawRow.work_completed_this_period) || Number(drawRow.scheduled_value) || Number(drawRow.total_completed) || 0)
      : 0;

    // Items excluding summary rows (only genuine scope/division items)
    const divisionRows = rows.filter(r => !isSummaryRow(r.description));

    const scheduled_total = Math.round(divisionRows.reduce((s, r) => s + (Number(r.scheduled_value) || 0), 0) * 100) / 100;
    const prev_total = Math.round(divisionRows.reduce((s, r) => s + (Number(r.work_completed_previous) || 0), 0) * 100) / 100;
    let this_period_total = Math.round(divisionRows.reduce((s, r) => s + (Number(r.work_completed_this_period) || 0), 0) * 100) / 100;
    const stored_total = Math.round(divisionRows.reduce((s, r) => s + (Number(r.stored_materials) || 0), 0) * 100) / 100;
    const divisionCompletedTotal = Math.round(divisionRows.reduce((s, r) => s + (Number(r.total_completed) || 0), 0) * 100) / 100;
    const balance_total = Math.round(divisionRows.reduce((s, r) => s + (Number(r.balance_to_finish) || 0), 0) * 100) / 100;
    const retainage_total = Math.round(divisionRows.reduce((s, r) => s + (Number(r.retainage) || 0), 0) * 100) / 100;

    const total_additions = (Number(header.change_order_additions_prev) || 0) + (Number(header.change_order_additions_curr) || 0);
    const total_deductions = (Number(header.change_order_deductions_prev) || 0) + (Number(header.change_order_deductions_curr) || 0);
    const net_co = total_additions - total_deductions;

    const original_contract_sum = Number(header.original_contract_sum) || 1044266.65;
    const contract_sum_to_date = original_contract_sum + net_co;

    // Calculate completed_total (The Draw to date) without double counting
    let completed_total = divisionCompletedTotal;
    if (completed_total === 0 && drawRowAmount > 0) {
      completed_total = drawRowAmount;
    } else if (drawRowAmount > 0 && Math.abs(divisionCompletedTotal - drawRowAmount) < 1) {
      completed_total = drawRowAmount;
    }
    completed_total = Math.round(completed_total * 100) / 100;

    if (this_period_total === 0 && drawRowAmount > 0) {
      this_period_total = Math.round(drawRowAmount * 100) / 100;
    }

    const total_completed_and_stored = completed_total;

    // Retainage split
    const work_completed_total = (prev_total > 0 || this_period_total > 0) ? (prev_total + this_period_total) : completed_total;
    const retainage_on_completed = work_completed_total * ((Number(header.retainage_completed_pct) || 0) / 100);
    const retainage_on_stored = stored_total * ((Number(header.retainage_stored_pct) || 0) / 100);
    const total_retainage = retainage_total > 0 ? retainage_total : (retainage_on_completed + retainage_on_stored);

    const total_earned_less_retainage = Math.round((total_completed_and_stored - total_retainage) * 100) / 100;
    const current_payment_due = Math.round((total_earned_less_retainage - (Number(header.less_previous_certificates) || 0)) * 100) / 100;
    const balance_to_finish_incl_retainage = Math.round((contract_sum_to_date - total_earned_less_retainage) * 100) / 100;

    const overall_pct = original_contract_sum > 0 ? Math.round((completed_total / original_contract_sum) * 100) : 0;

    return {
      scheduled_total,
      prev_total,
      this_period_total: this_period_total > 0 ? this_period_total : completed_total,
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

  /* Sorted estimate lines for import modal (guaranteed division order + alternates) */
  const sortedEstimateLines = useMemo(() => {
    const baseLines = [...estimateLines].sort((a, b) => {
      const divA = extractEstimateDivisionNumber(a);
      const divB = extractEstimateDivisionNumber(b);
      if (divA !== divB) return divA - divB;
      return (a.description || a.category || '').localeCompare(b.description || b.category || '');
    });
    return [...baseLines, ...alternateLines];
  }, [estimateLines, alternateLines]);

  /* Group estimate lines by division (identical to estimate tab) */
  const groupedEstimateDivisions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; lines: EstimateLine[] }>();

    // Pre-seed standard divisions in order
    STANDARD_DIVISIONS.forEach((d) => {
      map.set(d.code, { code: d.code, name: d.name, lines: [] });
    });

    sortedEstimateLines.forEach((line) => {
      if (line.division_code === 'ALT') return;
      let divCode = (line.division_code || '').trim().replace(/^div(?:ision)?\.?\s*/i, '');
      if (!divCode && line.category) {
        const match = line.category.match(/^(\d{2})/);
        if (match) divCode = match[1];
      }
      if (!divCode) {
        const match = (line.description || '').match(/(?:Division|Div|Section)?\s*(\d{2})/i);
        if (match) divCode = match[1];
      }
      if (!divCode) divCode = '01';

      if (!map.has(divCode)) {
        const std = STANDARD_DIVISIONS.find((d) => d.code === divCode);
        const name = std?.name || line.category || `Division ${divCode}`;
        map.set(divCode, { code: divCode, name, lines: [] });
      }

      map.get(divCode)!.lines.push(line);
    });

    const result: DivisionGroup[] = [];
    map.forEach((grp) => {
      if (grp.lines.length > 0) {
        const subtotal = grp.lines.reduce((s, l) => s + (Number(l.estimated_total) || 0), 0);
        result.push({
          code: grp.code,
          name: grp.name,
          lines: grp.lines,
          subtotal,
        });
      }
    });

    result.sort((a, b) => {
      const numA = extractDivisionNumber(a.code);
      const numB = extractDivisionNumber(b.code);
      if (numA !== numB) return numA - numB;
      return a.code.localeCompare(b.code);
    });

    // Add Alternates & Allowances as a distinct, dedicated group
    if (alternateLines.length > 0) {
      const altSubtotal = alternateLines.reduce((s, l) => s + (Number(l.estimated_total) || 0), 0);
      result.push({
        code: 'ALT',
        name: 'Alternates & Allowances',
        lines: alternateLines,
        subtotal: altSubtotal,
      });
    }

    return result;
  }, [sortedEstimateLines, alternateLines]);

  /* Toggle whole division selection */
  const toggleDivision = (divCode: string) => {
    const group = groupedEstimateDivisions.find(g => g.code === divCode);
    if (!group) return;
    const groupLineIds = group.lines.map(l => l.id);
    const allSelected = groupLineIds.every(id => selectedImportIds.has(id));

    setSelectedImportIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        groupLineIds.forEach(id => next.delete(id));
      } else {
        groupLineIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleExpandDivision = (divCode: string) => {
    setExpandedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(divCode)) next.delete(divCode);
      else next.add(divCode);
      return next;
    });
  };

  const expandAllDivisions = () => {
    setExpandedDivisions(new Set(groupedEstimateDivisions.map(g => g.code)));
  };

  const collapseAllDivisions = () => {
    setExpandedDivisions(new Set());
  };

  /* ---- import from estimate ---- */
  const handleImport = () => {
    let newRows: OwnerBillingItem[] = [];

    if (aggregateByDivision) {
      // 1 aggregated row per selected division (Standard G703 SOV)
      newRows = groupedEstimateDivisions
        .filter(grp => grp.lines.some(l => selectedImportIds.has(l.id)))
        .map((grp, idx) => {
          const selectedLines = grp.lines.filter(l => selectedImportIds.has(l.id));
          const totalVal = selectedLines.reduce((s, l) => s + (Number(l.estimated_total) || 0), 0);

          let desc = `Division ${grp.code}: ${grp.name}`;
          if (grp.code === 'ALT') {
            if (selectedLines.length === 1) {
              desc = selectedLines[0].description;
            } else {
              desc = `Alternates & Allowances (Subtotal of ${selectedLines.length} Alternates)`;
            }
          }

          return {
            id: `imp-div-${grp.code}-${Date.now()}-${idx}`,
            billing_id: '',
            item_number: idx + 1,
            description: desc,
            scheduled_value: totalVal,
            work_completed_previous: 0,
            work_completed_this_period: 0,
            stored_materials: 0,
            total_completed: 0,
            pct_complete: 0,
            balance_to_finish: totalVal,
            retainage: 0,
          };
        });
    } else {
      // Detailed items
      const selected = sortedEstimateLines.filter(el => selectedImportIds.has(el.id));
      newRows = selected.map((el, idx) => {
        let desc = el.description || el.category;
        if (el.division_code === 'ALT') {
          desc = el.description.startsWith('Alternate') ? el.description : `Alternate: ${el.description}`;
        } else if (el.division_code && !desc.toLowerCase().includes('div')) {
          desc = `Division ${el.division_code}: ${desc}`;
        }

        return {
          id: `imp-${el.id}-${Date.now()}-${idx}`,
          billing_id: '',
          item_number: idx + 1,
          description: desc,
          scheduled_value: el.estimated_total || 0,
          work_completed_previous: 0,
          work_completed_this_period: 0,
          stored_materials: 0,
          total_completed: 0,
          pct_complete: 0,
          balance_to_finish: el.estimated_total || 0,
          retainage: 0,
        };
      });
    }

    const existingNonEmpty = rows.filter(r => r.description.trim() !== '' || r.scheduled_value > 0);
    const combined = [...existingNonEmpty, ...newRows];
    combined.sort((a, b) => {
      const divA = extractDivisionNumber(a.description);
      const divB = extractDivisionNumber(b.description);
      if (divA !== divB) return divA - divB;
      return a.description.localeCompare(b.description);
    });

    const renumbered = combined.map((r, i) => ({ ...r, item_number: i + 1 }));
    while (renumbered.length < DEFAULT_G703_ROWS) {
      renumbered.push(emptyRow(renumbered.length + 1));
    }
    setRows(renumbered);
    setShowImportModal(false);
    setSelectedImportIds(new Set());
  };

  /* ---- save / submit ---- */
  const handleSave = async (status: 'draft' | 'submitted') => {
    // Preserve all rows in their exact position and order without stripping empty rows
    let lastActiveIdx = rows.length - 1;
    while (
      lastActiveIdx >= DEFAULT_G703_ROWS &&
      lastActiveIdx >= 0 &&
      !rows[lastActiveIdx].description.trim() &&
      !rows[lastActiveIdx].scheduled_value &&
      !rows[lastActiveIdx].work_completed_this_period &&
      !rows[lastActiveIdx].work_completed_previous &&
      !rows[lastActiveIdx].stored_materials
    ) {
      lastActiveIdx--;
    }
    const rowsToSave = rows.slice(0, lastActiveIdx + 1);

    const payload = {
      project_id: projectId,
      ...header,
      change_order_additions: totals.total_additions,
      change_order_deductions: totals.total_deductions,
      net_change_orders: totals.net_co,
      total_completed_and_stored: totals.total_completed_and_stored,
      amount_certified: header.amount_certified || Math.max(0, totals.current_payment_due),
      status,
      items: rowsToSave.map((r, idx) => ({
        item_number: idx + 1,
        description: r.description || '',
        scheduled_value: Number(r.scheduled_value) || 0,
        work_completed_previous: Number(r.work_completed_previous) || 0,
        work_completed_this_period: Number(r.work_completed_this_period) || 0,
        stored_materials: Number(r.stored_materials) || 0,
        total_completed: Number(r.total_completed) || 0,
        pct_complete: Number(r.pct_complete) || 0,
        balance_to_finish: Number(r.balance_to_finish) || 0,
        retainage: Number(r.retainage) || 0,
        scheduled_value_formula: r.scheduled_value_formula,
        work_completed_previous_formula: r.work_completed_previous_formula,
        work_completed_this_period_formula: r.work_completed_this_period_formula,
        stored_materials_formula: r.stored_materials_formula,
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
      via_architect: b.via_architect === 'A&E Design Partners' ? '' : (b.via_architect || ''),
      application_number: b.application_number,
      period_to: b.period_to,
      project_nos: b.project_nos || '',
      contract_date: b.contract_date || '',
      purchase_order: b.purchase_order || '',
      distribution_to: b.distribution_to || ['Const. Mgr'],
      original_contract_sum: b.original_contract_sum || 1044266.65,
      retainage_completed_pct: b.retainage_completed_pct ?? 0,
      retainage_stored_pct: b.retainage_stored_pct ?? 0,
      less_previous_certificates: b.less_previous_certificates || 0,
      change_order_additions_prev: b.change_order_additions || 0,
      change_order_deductions_prev: b.change_order_deductions || 0,
      change_order_additions_curr: 0,
      change_order_deductions_curr: 0,
      contractor_signature_by: b.contractor_signature_by || '',
      contractor_signature_date: b.contractor_signature_date || '',
      state_of: b.state_of || '',
      county_of: b.county_of || '',
      notary_day: b.notary_day || '',
      notary_month_year: b.notary_month_year || '',
      notary_public: b.notary_public || '',
      notary_commission_expires: b.notary_commission_expires || '',
      amount_certified: b.amount_certified ?? b.current_payment_due,
      architect_signature_by: b.architect_signature_by || '',
      architect_signature_date: b.architect_signature_date || '',
    });

    // Load rows strictly in saved order without changing positions or auto-sorting
    const loadedRows = (b.items && b.items.length > 0)
      ? [...b.items]
          .sort((a, b) => (Number(a.item_number) || 0) - (Number(b.item_number) || 0))
          .map(item => recalcRow(item))
      : [];

    const finalRows = loadedRows.map((r, i) => ({ ...r, item_number: i + 1 }));
    while (finalRows.length < DEFAULT_G703_ROWS) {
      finalRows.push(emptyRow(finalRows.length + 1));
    }
    const evaluatedRows = recalculateAllFormulas(finalRows);
    setRows(evaluatedRows);
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
      original_contract_sum: 1044266.65,
      retainage_completed_pct: 0,
      retainage_stored_pct: 0,
      less_previous_certificates: 0,
      change_order_additions_prev: 0,
      change_order_deductions_prev: 0,
      change_order_additions_curr: 0,
      change_order_deductions_curr: 0,
      contractor_signature_by: '',
      contractor_signature_date: '',
      state_of: '',
      county_of: '',
      notary_day: '',
      notary_month_year: '',
      notary_public: '',
      notary_commission_expires: '',
      amount_certified: 0,
      architect_signature_by: '',
      architect_signature_date: '',
    });
    setRows(createInitialRows(DEFAULT_G703_ROWS));
    setEditingBilling(null);
    setActiveView('form');
  };

  /* ---- direct high-resolution PDF download handler ---- */
  const handleSaveAsPDF = async (mode: 'all' | 'g702_only' | 'g703_only') => {
    setGeneratingPdf(true);
    try {
      const { toJpeg } = await import('html-to-image');
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
          const imgData702 = await toJpeg(el702, {
            quality: 0.98,
            pixelRatio: 2.5,
            backgroundColor: '#ffffff',
          });

          const rect = el702.getBoundingClientRect();
          const imgWidth = maxContentWidth;
          const imgHeight = (rect.height * imgWidth) / rect.width;

          let renderWidth = imgWidth;
          let renderHeight = imgHeight;
          if (renderHeight > maxContentHeight) {
            renderHeight = maxContentHeight;
            renderWidth = (rect.width * renderHeight) / rect.height;
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
          const imgData703 = await toJpeg(el703, {
            quality: 0.98,
            pixelRatio: 2.5,
            backgroundColor: '#ffffff',
          });

          const rect = el703.getBoundingClientRect();
          const imgWidth = maxContentWidth;
          let renderWidth = imgWidth;
          let renderHeight = (rect.height * imgWidth) / rect.width;
          if (renderHeight > maxContentHeight) {
            renderHeight = maxContentHeight;
            renderWidth = (rect.width * renderHeight) / rect.height;
          }

          const posX = margin + (maxContentWidth - renderWidth) / 2;
          const posY = margin + (maxContentHeight - renderHeight) / 2;

          pdf.addImage(imgData703, 'JPEG', posX, posY, renderWidth, renderHeight);
        }
      } else if (mode === 'g703_only') {
        const el703 = document.getElementById('g703-continuation');
        if (el703) {
          const imgData703 = await toJpeg(el703, {
            quality: 0.98,
            pixelRatio: 2.5,
            backgroundColor: '#ffffff',
          });

          const rect = el703.getBoundingClientRect();
          const imgWidth = maxContentWidth;
          let renderWidth = imgWidth;
          let renderHeight = (rect.height * imgWidth) / rect.width;
          if (renderHeight > maxContentHeight) {
            renderHeight = maxContentHeight;
            renderWidth = (rect.width * renderHeight) / rect.height;
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
              <h1 className="text-2xl font-black text-procore-text tracking-tight">Application &amp; Certificate for Payment</h1>
              <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-2.5 py-1 rounded-md">
                AIA Document G702™ / G703™
              </span>
            </div>
            <p className="text-xs text-procore-text-muted mt-1">
              Prime contractor billing to owner. Full AIA G702 cover sheet with lines 1-9 &amp; Schedule of Values (G703).
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Completed &amp; Stored</p>
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
            <p className="text-[11px] text-procore-text-muted mt-0.5">Approved &amp; Submitted</p>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-xl border border-procore-border shadow-xs overflow-hidden">
          <div className="p-4 border-b border-procore-border bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-procore-text">
              Applications &amp; Certificates ({billings.length})
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
                    <th className="p-3 text-right font-bold">Completed &amp; Stored</th>
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
                              setTimeout(() => handleSaveAsPDF('all'), 300);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-2.5 py-1 rounded shadow-2xs cursor-pointer"
                            title="Save 2-Page Application as PDF"
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
  /* Executive financial metrics for Budget, Draw, and Balance */
  const contractBudget = totals.contract_sum_to_date || Number(header.original_contract_sum) || 0;
  const currentDraw = Math.max(0, totals.current_payment_due);
  const remainingBalance = Math.max(0, totals.balance_to_finish_incl_retainage);
  const previousDraws = Number(header.less_previous_certificates) || 0;

  const pctDrawn = contractBudget > 0 ? (currentDraw / contractBudget) * 100 : 0;
  const pctPrevious = contractBudget > 0 ? (previousDraws / contractBudget) * 100 : 0;
  const pctBalance = contractBudget > 0 ? (remainingBalance / contractBudget) * 100 : 0;
  const pctTotalEarned = contractBudget > 0 ? ((totals.total_earned_less_retainage / contractBudget) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Top Main Toolbar */}
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
                Current Draw: <span className="text-emerald-400 font-black text-xs">${fmt(currentDraw)}</span> · Total Budget: <span className="text-white font-bold">${fmt(contractBudget)}</span> · Balance: <span className="text-amber-400 font-bold">${fmt(remainingBalance)}</span>
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

            {/* SAVE AS PDF BUTTON (Saves 2 Pages Together) */}
            <button
              onClick={() => handleSaveAsPDF('all')}
              disabled={generatingPdf}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-60 text-white text-xs font-black px-4 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-blue-300"
              title="Saves 2 pages together as PDF (Page 1: G702 Cover + Page 2: G703 Continuation Sheet)"
            >
              {generatingPdf ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <span className="text-sm">📄</span>
                  <span>Save as PDF (2 Pages)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  FINANCIAL SUMMARY BAR: THE BUDGET · THE DRAW · THE BALANCE  */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 print:hidden space-y-4">
        {/* Top title and badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-900">
              Draw Request #{header.application_number} — Financial Summary
            </h3>
            <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              Live G702 / G703 Sync
            </span>
          </div>
          <div className="text-[11px] font-bold text-gray-500">
            Billing Period: <span className="text-gray-900 font-black">{header.period_to || 'Current Period'}</span>
          </div>
        </div>

        {/* 3 Executive Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* 1. THE BUDGET */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-4 sm:p-5 rounded-xl shadow-md border border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <span className="text-sm">🏛️</span> 1. The Budget
              </span>
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full uppercase">
                Contract Sum
              </span>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
              ${fmt(contractBudget)}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-700 flex items-center justify-between text-[11px] text-slate-300">
              <span>Orig Contract: <strong className="text-white">${fmt(header.original_contract_sum)}</strong></span>
              <span>Net COs: <strong className={totals.net_co >= 0 ? "text-emerald-300" : "text-rose-300"}>{totals.net_co >= 0 ? '+' : ''}${fmt(totals.net_co)}</strong></span>
            </div>
          </div>

          {/* 2. THE DRAW */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white p-4 sm:p-5 rounded-xl shadow-md border-2 border-emerald-500/50 ring-2 ring-emerald-500/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <span className="text-sm">💵</span> 2. The Draw
              </span>
              <span className="text-[10px] font-black bg-emerald-400 text-gray-950 px-2.5 py-0.5 rounded-full uppercase shadow-xs">
                Draw #{header.application_number}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                ${fmt(currentDraw)}
              </span>
              <span className="text-xs font-black text-emerald-200 bg-emerald-800/80 border border-emerald-400/40 px-2 py-0.5 rounded-md">
                {pctDrawn.toFixed(1)}% of Budget
              </span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-emerald-800 flex items-center justify-between text-[11px] text-emerald-200">
              <span>Period Work: <strong className="text-white">${fmt(totals.this_period_total)}</strong></span>
              <span>Retainage: <strong className="text-amber-300">-${fmt(totals.total_retainage)}</strong></span>
            </div>
          </div>

          {/* 3. THE BALANCE */}
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-950 via-stone-900 to-slate-900 text-white p-4 sm:p-5 rounded-xl shadow-md border border-amber-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span className="text-sm">⚖️</span> 3. The Balance
              </span>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full uppercase">
                To Finish
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                ${fmt(remainingBalance)}
              </span>
              <span className="text-xs font-black text-amber-200 bg-amber-900/80 border border-amber-400/40 px-2 py-0.5 rounded-md">
                {pctBalance.toFixed(1)}% Left
              </span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-stone-700 flex items-center justify-between text-[11px] text-amber-200/90">
              <span>Earned to Date: <strong className="text-white">${fmt(totals.total_earned_less_retainage)}</strong></span>
              <span>Overall: <strong className="text-white">{totals.overall_pct}% Billed</strong></span>
            </div>
          </div>
        </div>

        {/* Visual Allocation Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] font-bold text-gray-500">
            <span>Budget Allocation Progress</span>
            <span>{pctTotalEarned.toFixed(1)}% Earned to Date · {pctBalance.toFixed(1)}% Remaining</span>
          </div>
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex border border-gray-200 p-0.5 gap-0.5">
            {pctPrevious > 0 && (
              <div
                style={{ width: `${Math.min(100, pctPrevious)}%` }}
                className="bg-blue-600 rounded-full h-full transition-all"
                title={`Previous Draws: $${fmt(previousDraws)} (${pctPrevious.toFixed(1)}%)`}
              />
            )}
            {pctDrawn > 0 && (
              <div
                style={{ width: `${Math.min(100, pctDrawn)}%` }}
                className="bg-emerald-500 rounded-full h-full transition-all"
                title={`Current Draw: $${fmt(currentDraw)} (${pctDrawn.toFixed(1)}%)`}
              />
            )}
            {pctBalance > 0 && (
              <div
                style={{ width: `${Math.min(100, pctBalance)}%` }}
                className="bg-amber-400 rounded-full h-full transition-all"
                title={`Balance to Finish: $${fmt(remainingBalance)} (${pctBalance.toFixed(1)}%)`}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-600 font-semibold pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
              Previous Draws: ${fmt(previousDraws)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
              Current Draw: ${fmt(currentDraw)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" />
              Remaining Balance: ${fmt(remainingBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  PAGE 1 — AIA G702 APPLICATION AND CERTIFICATE FOR PAYMENT   */}
      {/*  NO PLACEHOLDERS / ZERO SHADOWED WORDS IN BLANKS             */}
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

        {/* 4-column metadata header section */}
        <div className="grid grid-cols-12 border border-black text-[10px] leading-tight mb-2">
          {/* Column 1: TO OWNER / FROM CONTRACTOR */}
          <div className="col-span-12 sm:col-span-4 border-b sm:border-b-0 sm:border-r border-black p-2 space-y-2">
            <div>
              <span className="font-extrabold block text-black">TO OWNER:</span>
              <input
                type="text"
                value={header.owner_name}
                onChange={e => setHeader(h => ({ ...h, owner_name: e.target.value }))}
                className="w-full font-bold text-black border-b border-dotted border-gray-400 focus:outline-none bg-transparent"
              />
              <textarea
                value={header.owner_address}
                onChange={e => setHeader(h => ({ ...h, owner_address: e.target.value }))}
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
                className="w-full font-bold text-black border-b border-dotted border-gray-400 focus:outline-none bg-transparent"
              />
              <textarea
                value={header.contractor_address}
                onChange={e => setHeader(h => ({ ...h, contractor_address: e.target.value }))}
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
                className="w-full font-bold text-black border-b border-dotted border-gray-400 focus:outline-none bg-transparent"
              />
              <textarea
                value={header.project_address}
                onChange={e => setHeader(h => ({ ...h, project_address: e.target.value }))}
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

            {/* Lines 1 to 9 Table */}
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
                      <span className="hidden print:inline font-black text-black">
                        {header.original_contract_sum > 0 ? fmt(header.original_contract_sum) : ''}
                      </span>
                      <input
                        type="text"
                        value={
                          isEditingOrigSum
                            ? (header.original_contract_sum || '')
                            : (header.original_contract_sum > 0 ? fmt(header.original_contract_sum) : '')
                        }
                        onFocus={() => setIsEditingOrigSum(true)}
                        onBlur={() => setIsEditingOrigSum(false)}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9.-]+/g, '');
                          setHeader(h => ({ ...h, original_contract_sum: parseFloat(raw) || 0 }));
                        }}
                        className="w-full text-right font-black text-black focus:outline-none bg-transparent print:hidden"
                        title="Original Contract Sum (Total Budget: $1,044,266.65)"
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
                      {totals.contract_sum_to_date > 0 ? fmt(totals.contract_sum_to_date) : ''}
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
                      {totals.total_completed_and_stored > 0 ? fmt(totals.total_completed_and_stored) : ''}
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
                        value={header.retainage_completed_pct || ''}
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
                        value={header.retainage_stored_pct || ''}
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
                      {totals.total_retainage > 0 ? fmt(totals.total_retainage) : ''}
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
                      {totals.total_earned_less_retainage > 0 ? fmt(totals.total_earned_less_retainage) : ''}
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
                      <CurrencyInput
                        value={header.less_previous_certificates}
                        onChange={val => setHeader(h => ({ ...h, less_previous_certificates: val }))}
                        className="w-full text-right font-bold text-black focus:outline-none bg-transparent"
                        allowEmpty={true}
                        showDollarSign={false}
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
                      {totals.current_payment_due > 0 ? fmt(totals.current_payment_due) : ''}
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
                      {totals.balance_to_finish_incl_retainage > 0 ? fmt(totals.balance_to_finish_incl_retainage) : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* CHANGE ORDER SUMMARY TABLE */}
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
                      <CurrencyInput
                        value={header.change_order_additions_prev}
                        onChange={val => setHeader(h => ({ ...h, change_order_additions_prev: val }))}
                        className="w-full text-right focus:outline-none bg-transparent text-[8px]"
                        allowEmpty={true}
                        showDollarSign={true}
                      />
                    </td>
                    <td className="p-1">
                      <CurrencyInput
                        value={header.change_order_deductions_prev}
                        onChange={val => setHeader(h => ({ ...h, change_order_deductions_prev: val }))}
                        className="w-full text-right focus:outline-none bg-transparent text-[8px]"
                        allowEmpty={true}
                        showDollarSign={true}
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1 text-black border-r border-black">
                      Total approved this Month
                    </td>
                    <td className="p-1 border-r border-black">
                      <CurrencyInput
                        value={header.change_order_additions_curr}
                        onChange={val => setHeader(h => ({ ...h, change_order_additions_curr: val }))}
                        className="w-full text-right focus:outline-none bg-transparent text-[8px]"
                        allowEmpty={true}
                        showDollarSign={true}
                      />
                    </td>
                    <td className="p-1">
                      <CurrencyInput
                        value={header.change_order_deductions_curr}
                        onChange={val => setHeader(h => ({ ...h, change_order_deductions_curr: val }))}
                        className="w-full text-right focus:outline-none bg-transparent text-[8px]"
                        allowEmpty={true}
                        showDollarSign={true}
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-black bg-gray-50 font-bold">
                    <td className="p-1 text-right font-black text-black border-r border-black">
                      TOTALS
                    </td>
                    <td className="p-1 text-right border-r border-black font-bold">
                      {totals.total_additions > 0 ? `$${fmt(totals.total_additions)}` : ''}
                    </td>
                    <td className="p-1 text-right font-bold">
                      {totals.total_deductions > 0 ? `$${fmt(totals.total_deductions)}` : ''}
                    </td>
                  </tr>
                  <tr className="font-black bg-gray-100">
                    <td className="p-1 text-black border-r border-black">
                      NET CHANGES by Change Order
                    </td>
                    <td className="p-1 text-right" colSpan={2}>
                      {totals.net_co !== 0 ? `$${fmt(totals.net_co)}` : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ---------------- RIGHT COLUMN ---------------- */}
          {/* CONTRACTOR CERTIFICATION, NOTARY, ARCHITECT CERTIFICATE */}
          {/* ALL BLANKS ARE COMPLETELY EMPTY LINES — NO SHADOWED WORDS */}
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
                      className="flex-1 font-script text-xs text-blue-900 border-b border-black focus:outline-none bg-transparent px-1"
                    />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-black shrink-0">Date:</span>
                    <input
                      type="text"
                      value={header.contractor_signature_date}
                      onChange={e => setHeader(h => ({ ...h, contractor_signature_date: e.target.value }))}
                      className="w-24 font-bold text-black border-b border-black focus:outline-none bg-transparent text-center"
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
                      className="w-24 font-bold uppercase border-b border-black focus:outline-none bg-transparent"
                    />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold">County of:</span>
                    <input
                      type="text"
                      value={header.county_of}
                      onChange={e => setHeader(h => ({ ...h, county_of: e.target.value }))}
                      className="w-24 font-bold uppercase border-b border-black focus:outline-none bg-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span>Subscribed and sworn to before me this</span>
                  <input
                    type="text"
                    value={header.notary_day}
                    onChange={e => setHeader(h => ({ ...h, notary_day: e.target.value }))}
                    className="w-10 text-center font-bold border-b border-black focus:outline-none bg-transparent"
                  />
                  <span>day of</span>
                  <input
                    type="text"
                    value={header.notary_month_year}
                    onChange={e => setHeader(h => ({ ...h, notary_month_year: e.target.value }))}
                    className="w-28 font-bold border-b border-black focus:outline-none bg-transparent"
                  />
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold shrink-0">Notary Public:</span>
                    <input
                      type="text"
                      value={header.notary_public}
                      onChange={e => setHeader(h => ({ ...h, notary_public: e.target.value }))}
                      className="flex-1 font-script text-xs text-blue-900 border-b border-black focus:outline-none bg-transparent"
                    />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold shrink-0">My Commission expires:</span>
                    <input
                      type="text"
                      value={header.notary_commission_expires}
                      onChange={e => setHeader(h => ({ ...h, notary_commission_expires: e.target.value }))}
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
                  <CurrencyInput
                    value={header.amount_certified || (totals.current_payment_due > 0 ? totals.current_payment_due : 0)}
                    onChange={val => setHeader(h => ({ ...h, amount_certified: val }))}
                    className="w-28 text-right font-black text-[10px] text-black border-b border-black focus:outline-none bg-transparent"
                    allowEmpty={false}
                    showDollarSign={false}
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
                      className="flex-1 font-script text-xs text-blue-900 border-b border-black focus:outline-none bg-transparent px-1"
                    />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-black shrink-0">Date:</span>
                    <input
                      type="text"
                      value={header.architect_signature_date}
                      onChange={e => setHeader(h => ({ ...h, architect_signature_date: e.target.value }))}
                      className="w-24 font-bold text-black border-b border-black focus:outline-none bg-transparent text-center"
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
      {/*  28 ROWS BY DEFAULT — NO PLACEHOLDERS / CLEAN EMPTY CELLS    */}
      {/* ============================================================ */}
      <div
        id="g703-continuation"
        className={`bg-white rounded-xl border border-procore-border shadow-xs overflow-hidden print:shadow-none print:border-black print:rounded-none ${
          printMode === 'g702_only' ? 'print:hidden' : ''
        }`}
      >
        {/* Title & Actions */}
        <div className="bg-gray-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 print:bg-white print:text-black print:border-b-2 print:border-black">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-wide uppercase flex items-center gap-2">
                <span>Continuation Sheet</span>
                <span className="text-[10px] font-bold bg-gray-800 text-gray-300 px-2 py-0.5 rounded print:hidden">G703</span>
              </h2>
              <p className="text-[10px] text-gray-400 print:text-gray-600 mt-0.5">
                AIA Document G703™ — Attachment to Application #{header.application_number}
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 print:hidden ml-2">
              <button
                type="button"
                onClick={sortRowsByDivision}
                className="text-[11px] font-bold px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded border border-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sort all items by CSI Division (01-28) and Alternates"
              >
                <span>⇅</span>
                <span>Sort by Division</span>
              </button>

              <span
                className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded font-mono hidden lg:inline-flex items-center gap-1 cursor-help"
                title="Type /sum in any numeric cell to sum the column above. Also supports ranges like /sum(1..18) or =C19-C24"
              >
                <span className="font-bold text-emerald-300">fx</span>
                <span>Type /sum to sum column</span>
              </span>
            </div>
          </div>

          <div className="text-right text-[10px] text-gray-400 print:text-gray-600">
            <p>APPLICATION NUMBER: <span className="font-black text-white print:text-black">{header.application_number}</span></p>
            <p>PERIOD TO: <span className="font-bold text-white print:text-black">{header.period_to}</span></p>
          </div>
        </div>

        {/* CONTINUATION SHEET FINANCIAL STRIP: BUDGET · DRAW · BALANCE */}
        <div className="bg-gray-950 text-white px-5 py-2.5 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-400">The Budget:</span>
              <span className="font-black text-white text-sm">${fmt(contractBudget)}</span>
            </div>
            <div className="h-4 w-px bg-gray-800" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">The Draw:</span>
              <span className="font-black text-emerald-400 text-sm bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                ${fmt(currentDraw)}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-800" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400">The Balance:</span>
              <span className="font-black text-amber-400 text-sm bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                ${fmt(remainingBalance)}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-gray-400 flex items-center gap-3">
            <span>Completed &amp; Stored: <strong className="text-white">${fmt(totals.total_completed_and_stored)}</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] min-w-[1050px] border-collapse">
            <thead>
              {/* Column Letter headers */}
              <tr className="bg-gray-100 border-b border-gray-300 print:border-black">
                <th className="p-1 text-center font-bold text-gray-500 border-r border-gray-300 w-14 print:w-10 print:border-black">A</th>
                <th className="p-1 text-center font-bold text-gray-500 border-r border-gray-300 print:border-black">B</th>
                <th className="p-1 text-center font-bold text-gray-500 border-r border-gray-300 w-28 print:border-black">C</th>
                <th className="p-1 text-center font-bold text-gray-500 border-r border-gray-300 w-28 print:border-black" colSpan={2}>
                  D &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; E
                </th>
                <th className="p-1 text-center font-bold text-gray-500 border-r border-gray-300 w-24 print:border-black">F</th>
                <th className="p-1 text-center font-bold text-gray-500 border-r border-gray-300 w-28 print:border-black">G</th>
                <th className="p-1 text-center font-bold text-gray-500 border-r border-gray-300 w-14 print:border-black">%</th>
                <th className="p-1 text-center font-bold text-gray-500 border-r border-gray-300 w-24 print:border-black">H</th>
                <th className="p-1 text-center font-bold text-gray-500 w-24">I</th>
                <th className="p-1 w-6 print:hidden"></th>
              </tr>
              {/* Detailed headers */}
              <tr className="bg-gray-50 border-b-2 border-gray-400 text-[9px] print:border-black">
                <th className="p-1.5 text-center font-bold text-gray-700 border-r border-gray-300 w-14 print:w-10 print:border-black">
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
              {rows.map((row, idx) => {
                const hasData = Boolean(
                  row.description.trim() ||
                  row.scheduled_value > 0 ||
                  row.work_completed_previous > 0 ||
                  row.work_completed_this_period > 0 ||
                  row.stored_materials > 0
                );

                const isDragging = draggedIdx === idx;
                const isDragOver = dragOverIdx === idx && draggedIdx !== idx;

                return (
                  <tr
                    key={row.id || idx}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverIdx !== idx) setDragOverIdx(idx);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIdx !== null && draggedIdx !== idx) {
                        moveRow(draggedIdx, idx);
                      }
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    className={`hover:bg-blue-50/30 group h-6 transition-colors ${
                      isDragging ? 'opacity-35 bg-blue-50' : ''
                    } ${
                      isDragOver ? 'border-t-2 border-blue-500 bg-blue-50/60' : ''
                    }`}
                  >
                    {/* A — Item No & Reorder Controls */}
                    <td className="p-0.5 border-r border-gray-200 bg-gray-50/50 print:border-black text-[10px]">
                      <div className="flex items-center justify-between gap-0.5 px-1">
                        {/* Drag handle */}
                        <span
                          draggable
                          onDragStart={(e) => {
                            setDraggedIdx(idx);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', String(idx));
                          }}
                          onDragEnd={() => {
                            setDraggedIdx(null);
                            setDragOverIdx(null);
                          }}
                          title="Drag to reorder row"
                          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-800 print:hidden text-xs select-none px-0.5"
                        >
                          ⋮⋮
                        </span>

                        {/* Item number */}
                        <span className="font-bold text-gray-600 flex-1 text-center select-none">
                          {row.item_number}
                        </span>

                        {/* Up / Down nudge buttons */}
                        <div className="flex flex-col gap-0.5 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveRowUp(idx);
                            }}
                            className={`text-[8px] leading-none px-0.5 py-0.2 rounded hover:bg-gray-200 transition-colors ${
                              idx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-black cursor-pointer'
                            }`}
                            title="Move row up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === rows.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveRowDown(idx);
                            }}
                            className={`text-[8px] leading-none px-0.5 py-0.2 rounded hover:bg-gray-200 transition-colors ${
                              idx === rows.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-black cursor-pointer'
                            }`}
                            title="Move row down"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </td>
                    {/* B — Description — NO PLACEHOLDER */}
                    <td className="p-1 border-r border-gray-200 print:border-black">
                      <input
                        type="text"
                        draggable={false}
                        onDragStart={e => e.stopPropagation()}
                        value={row.description}
                        onChange={e => updateRow(idx, 'description', e.target.value)}
                        className="w-full text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                      />
                    </td>
                    {/* C — Scheduled Value — NO PLACEHOLDER */}
                    <td className="p-1 border-r border-gray-200 print:border-black">
                      <CurrencyInput
                        value={row.scheduled_value}
                        formula={row.scheduled_value_formula}
                        cellReference={`C${row.item_number}`}
                        onChange={v => updateRow(idx, 'scheduled_value', v)}
                        onFormulaChange={(f, v) => updateRowWithFormula(idx, 'scheduled_value', v, f)}
                        onEvaluateFormula={text => parseAndEvaluateFormula(text, 'scheduled_value', idx, rows)}
                        getSuggestions={query => getFormulaSuggestions(query, 'scheduled_value', idx, rows)}
                        className="w-full text-right text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                        allowEmpty={true}
                        showDollarSign={true}
                      />
                    </td>
                    {/* D — From Previous — NO PLACEHOLDER */}
                    <td className="p-1 border-r border-gray-200 print:border-black">
                      <CurrencyInput
                        value={row.work_completed_previous}
                        formula={row.work_completed_previous_formula}
                        cellReference={`D${row.item_number}`}
                        onChange={v => updateRow(idx, 'work_completed_previous', v)}
                        onFormulaChange={(f, v) => updateRowWithFormula(idx, 'work_completed_previous', v, f)}
                        onEvaluateFormula={text => parseAndEvaluateFormula(text, 'work_completed_previous', idx, rows)}
                        getSuggestions={query => getFormulaSuggestions(query, 'work_completed_previous', idx, rows)}
                        className="w-full text-right text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                        allowEmpty={true}
                        showDollarSign={true}
                      />
                    </td>
                    {/* E — This Period — NO PLACEHOLDER */}
                    <td className="p-1 border-r border-gray-200 print:border-black">
                      <CurrencyInput
                        value={row.work_completed_this_period}
                        formula={row.work_completed_this_period_formula}
                        cellReference={`E${row.item_number}`}
                        onChange={v => updateRow(idx, 'work_completed_this_period', v)}
                        onFormulaChange={(f, v) => updateRowWithFormula(idx, 'work_completed_this_period', v, f)}
                        onEvaluateFormula={text => parseAndEvaluateFormula(text, 'work_completed_this_period', idx, rows)}
                        getSuggestions={query => getFormulaSuggestions(query, 'work_completed_this_period', idx, rows)}
                        className="w-full text-right text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                        allowEmpty={true}
                        showDollarSign={true}
                      />
                    </td>
                    {/* F — Stored — NO PLACEHOLDER */}
                    <td className="p-1 border-r border-gray-200 print:border-black">
                      <CurrencyInput
                        value={row.stored_materials}
                        formula={row.stored_materials_formula}
                        cellReference={`F${row.item_number}`}
                        onChange={v => updateRow(idx, 'stored_materials', v)}
                        onFormulaChange={(f, v) => updateRowWithFormula(idx, 'stored_materials', v, f)}
                        onEvaluateFormula={text => parseAndEvaluateFormula(text, 'stored_materials', idx, rows)}
                        getSuggestions={query => getFormulaSuggestions(query, 'stored_materials', idx, rows)}
                        className="w-full text-right text-[11px] font-medium text-procore-text focus:outline-none bg-transparent px-1"
                        allowEmpty={true}
                        showDollarSign={true}
                      />
                    </td>
                    {/* G — Total — EMPTY IF NO DATA */}
                    <td className="p-1 text-right font-bold text-[11px] text-procore-text border-r border-gray-200 bg-gray-50/30 px-2 print:border-black">
                      {hasData && row.total_completed > 0 ? formatCurrencyUSD(row.total_completed) : ''}
                    </td>
                    {/* G/C % — EMPTY IF NO DATA */}
                    <td className="p-1 text-center font-bold text-[11px] border-r border-gray-200 bg-gray-50/30 print:border-black">
                      {hasData && row.pct_complete > 0 ? (
                        <span className={row.pct_complete >= 100 ? 'text-emerald-700' : 'text-blue-700'}>
                          {row.pct_complete}%
                        </span>
                      ) : ''}
                    </td>
                    {/* H — Balance — EMPTY IF NO DATA */}
                    <td className="p-1 text-right text-[11px] font-medium text-procore-text border-r border-gray-200 bg-gray-50/30 px-2 print:border-black">
                      {hasData && row.scheduled_value > 0 ? formatCurrencyUSD(row.balance_to_finish) : ''}
                    </td>
                    {/* I — Retainage — EMPTY IF NO DATA */}
                    <td className="p-1 text-right text-[11px] font-medium text-amber-700 bg-gray-50/30 px-2">
                      {hasData && row.retainage > 0 ? formatCurrencyUSD(row.retainage) : ''}
                    </td>
                    {/* Row action buttons: Insert empty row & Delete */}
                    <td className="p-0.5 text-center print:hidden whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => insertEmptyRow(idx + 1)}
                          className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/80 px-1 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors leading-none"
                          title="Insert empty row below this line"
                        >
                          + Row
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRow(idx)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-100/80 px-1 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors leading-none"
                          title="Delete this row"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals row - Only sum Column E at the bottom as requested ($290,292.89) */}
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold text-[11px] print:border-black">
                <td className="p-2 text-center border-r border-gray-300 print:border-black" colSpan={2}>
                  <span className="uppercase text-gray-700 font-black text-[10px] tracking-wider">TOTALS</span>
                </td>
                {/* Column C: Scheduled Value - empty (no bottom total price info) */}
                <td className="p-2 text-right border-r border-gray-300 print:border-black"></td>
                {/* Column D: Work Completed From Previous - empty */}
                <td className="p-2 text-right border-r border-gray-300 print:border-black"></td>
                {/* Column E: Work Completed This Period - ONLY sum column E */}
                <td className="p-2 text-right border-r border-gray-300 text-emerald-700 font-black print:border-black">
                  {totals.this_period_total > 0 ? formatCurrencyUSD(totals.this_period_total) : '$0.00'}
                </td>
                {/* Column F: Materials Stored - empty */}
                <td className="p-2 text-right border-r border-gray-300 print:border-black"></td>
                {/* Column G: Total Completed & Stored - empty */}
                <td className="p-2 text-right border-r border-gray-300 print:border-black"></td>
                {/* Column G/C%: Complete - empty */}
                <td className="p-2 text-center border-r border-gray-300 print:border-black"></td>
                {/* Column H: Balance to Finish - empty */}
                <td className="p-2 text-right border-r border-gray-300 print:border-black"></td>
                {/* Column I: Retainage - empty */}
                <td className="p-2 text-right print:border-black"></td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Add row button & Sort */}
        <div className="px-4 py-2.5 border-t border-gray-200 print:hidden flex flex-wrap justify-between items-center gap-3 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => insertEmptyRow()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
              title="Add a new empty row to the continuation sheet"
            >
              <span className="text-sm leading-none font-bold">+</span>
              Add Empty Row
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={sortRowsByDivision}
              className="text-gray-600 hover:text-gray-900 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Sort lines by CSI Division (01-28) and Alternates"
            >
              <span>⇅</span>
              Sort by Division
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="text-[10px] text-gray-400">
              Drag <strong className="text-gray-600">⋮⋮</strong> handle or click <strong className="text-gray-600">▲▼</strong> to reorder lines
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-[11px] text-gray-500 font-medium">
              {rows.length} lines on Continuation Sheet
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  STICKY BOTTOM FLOATING SAVE BAR                             */}
      {/* ============================================================ */}
      <div className="fixed bottom-4 right-4 z-40 print:hidden">
        <div className="bg-gray-900 text-white rounded-2xl shadow-2xl border-2 border-gray-700 p-2.5 flex items-center gap-3 backdrop-blur-md">
          <div className="hidden sm:flex items-center gap-3 pl-2 pr-2 text-xs border-r border-gray-700">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-blue-400 block font-black">Budget</span>
              <span className="text-white font-black text-xs sm:text-sm">${fmt(contractBudget)}</span>
            </div>
            <div className="h-5 w-px bg-gray-700" />
            <div>
              <span className="text-[9px] uppercase tracking-wider text-emerald-400 block font-black">Draw</span>
              <span className="text-emerald-400 font-black text-xs sm:text-sm">${fmt(currentDraw)}</span>
            </div>
            <div className="h-5 w-px bg-gray-700" />
            <div>
              <span className="text-[9px] uppercase tracking-wider text-amber-400 block font-black">Balance</span>
              <span className="text-amber-400 font-black text-xs sm:text-sm">${fmt(remainingBalance)}</span>
            </div>
          </div>

          <button
            onClick={() => handleSaveAsPDF('all')}
            disabled={generatingPdf}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-black px-3.5 py-2 rounded-xl transition-all border border-blue-400 cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
            title="Save 2-Page Application as PDF (G702 Cover + G703 Continuation Sheet)"
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
                  Choose whole divisions or individual lines to populate Continuation Sheet (Schedule of Values).
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Controls: Select All, Aggregation Mode, Expand/Collapse */}
            <div className="p-3 bg-gray-50/90 border-b border-procore-border space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-2.5 text-xs font-black text-procore-text cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedImportIds.size === sortedEstimateLines.length && sortedEstimateLines.length > 0}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedImportIds(new Set(sortedEstimateLines.map(el => el.id)));
                      } else {
                        setSelectedImportIds(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-400 text-procore-orange focus:ring-procore-orange cursor-pointer"
                  />
                  Select All ({sortedEstimateLines.length} items across {groupedEstimateDivisions.length} divisions &amp; alternates)
                </label>

                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={expandAllDivisions}
                    className="text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                  >
                    Expand All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={collapseAllDivisions}
                    className="text-gray-600 hover:text-gray-900 font-bold hover:underline cursor-pointer"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Aggregation Mode Selector */}
              <div className="flex items-center justify-between bg-blue-50/90 border border-blue-200 p-2.5 rounded-xl text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-blue-950 select-none">
                  <input
                    type="checkbox"
                    checked={aggregateByDivision}
                    onChange={e => setAggregateByDivision(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Aggregate by Division (1 row per division on Continuation Sheet)</span>
                </label>
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-full shrink-0">
                  {aggregateByDivision ? 'Summary SOV' : 'Detailed Lines'}
                </span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {groupedEstimateDivisions.length > 0 ? (
                groupedEstimateDivisions.map(group => {
                  const selectedCount = group.lines.filter(l => selectedImportIds.has(l.id)).length;
                  const allSelected = group.lines.length > 0 && selectedCount === group.lines.length;
                  const someSelected = selectedCount > 0 && !allSelected;
                  const isExpanded = expandedDivisions.has(group.code);
                  const selectedSubtotal = group.lines
                    .filter(l => selectedImportIds.has(l.id))
                    .reduce((s, l) => s + (Number(l.estimated_total) || 0), 0);

                  return (
                    <div
                      key={`div-card-${group.code}`}
                      className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs bg-white transition-all"
                    >
                      {/* Division Sub-Total Header Row (Matching Estimate Tab) */}
                      <div
                        className={`p-3 flex items-center justify-between transition-colors ${
                          allSelected
                            ? 'bg-blue-100/90 border-b border-blue-300'
                            : someSelected
                            ? 'bg-blue-50/70 border-b border-blue-200'
                            : 'bg-gray-100/90 hover:bg-gray-200/60 border-b border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={el => {
                              if (el) el.indeterminate = someSelected;
                            }}
                            onChange={() => toggleDivision(group.code)}
                            className="w-4 h-4 rounded border-gray-400 text-blue-700 focus:ring-blue-600 cursor-pointer shrink-0"
                            title={`Select whole ${group.code === 'ALT' ? 'Alternates' : 'Division ' + group.code}`}
                          />
                          <div
                            onClick={() => toggleExpandDivision(group.code)}
                            className="cursor-pointer flex items-center gap-2 truncate select-none"
                          >
                            <span className={`${group.code === 'ALT' ? 'bg-purple-700' : 'bg-[#203764]'} text-white text-[10px] font-black px-2 py-0.5 rounded shrink-0`}>
                              {group.code === 'ALT' ? 'Alternates' : `Div ${group.code}`}
                            </span>
                            <span className="font-black text-gray-900 text-xs sm:text-sm truncate">
                              {group.name}
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 shrink-0">
                              ({selectedCount > 0 ? `${selectedCount}/${group.lines.length}` : `${group.lines.length}`} {group.code === 'ALT' ? 'alternates' : 'items'})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-black text-xs sm:text-sm text-[#203764] font-mono">
                            ${fmt(selectedCount > 0 ? selectedSubtotal : group.subtotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleExpandDivision(group.code)}
                            className="text-gray-500 hover:text-gray-900 p-1 text-xs cursor-pointer font-bold"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Individual Line Items in Division */}
                      {isExpanded && (
                        <div className="p-2 space-y-1 bg-gray-50/60 divide-y divide-gray-100">
                          {group.lines.map(el => (
                            <label
                              key={el.id}
                              className={`flex items-center gap-3 text-xs p-2 rounded-lg cursor-pointer transition-all ${
                                selectedImportIds.has(el.id)
                                  ? 'bg-orange-50/90 border border-procore-orange/40 shadow-xs'
                                  : 'hover:bg-gray-100/80 border border-transparent'
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
                                  {el.description || el.category}
                                </div>
                                <div className="text-[10px] text-procore-text-muted mt-0.5">
                                  {el.category} · {el.division_code === 'ALT' ? 'Proposal Alternate' : `${el.quantity} ${el.unit || 'LS'}`}
                                </div>
                              </div>
                              <span className="font-black text-procore-text text-xs shrink-0 font-mono">
                                ${fmt(el.estimated_total)}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-sm text-procore-text-muted">
                  No estimate lines found for this project. Add items on the Estimate page first.
                </div>
              )}
            </div>

            {/* STICKY UNMISSABLE MODAL FOOTER */}
            <div className="sticky bottom-0 p-4 border-t border-procore-border bg-white flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
              <span className="text-xs text-procore-text-muted font-bold">
                {selectedImportIds.size} item{selectedImportIds.size !== 1 ? 's' : ''} selected across{' '}
                <strong className="text-gray-800">
                  {groupedEstimateDivisions.filter(g => g.lines.some(l => selectedImportIds.has(l.id))).length}
                </strong>{' '}
                division(s) &amp; alternates
                {selectedImportIds.size > 0 && (
                  <span className="text-emerald-700 font-black ml-1">
                    · ${fmt(sortedEstimateLines.filter(el => selectedImportIds.has(el.id)).reduce((s, el) => s + (Number(el.estimated_total) || 0), 0))}
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
                  <span>
                    SAVE &amp; IMPORT{' '}
                    {aggregateByDivision
                      ? `(${groupedEstimateDivisions.filter(g => g.lines.some(l => selectedImportIds.has(l.id))).length} GROUPS)`
                      : `(${selectedImportIds.size} ITEMS)`}
                  </span>
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
        /* Remove spin buttons and placeholders completely */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        input[type=number] {
          -moz-appearance: textfield !important;
        }
        input::placeholder,
        textarea::placeholder {
          color: transparent !important;
          opacity: 0 !important;
        }

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
