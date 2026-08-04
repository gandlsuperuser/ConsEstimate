'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { EstimateLine, Expense, RESIDENTIAL_CATEGORIES } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

interface Project {
  id: string;
  name: string;
  type: 'commercial' | 'residential';
  client_name: string;
  address: string;
  start_date: string;
  status: 'active' | 'bidding' | 'complete';
  overhead_pct: number;
  profit_pct: number;
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [estimateLines, setEstimateLines] = useState<EstimateLine[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'residential' as 'commercial' | 'residential',
    client_name: '',
    address: '',
    start_date: '',
    status: 'active' as 'active' | 'bidding' | 'complete',
    overhead_pct: 10,
    profit_pct: 10,
  });

  useEffect(() => {
    const fetchData = async () => {
      const [projRes, linesRes, expensesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        fetch(`/api/estimate-lines?projectId=${id}`),
        fetch(`/api/expenses?projectId=${id}`),
      ]);

      if (projRes.data) {
        setProject(projRes.data);
        setFormData(projRes.data);
      }

      try {
        const linesData = await linesRes.json();
        setEstimateLines(linesData.lines || []);
      } catch (e) { console.error(e); }

      try {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData.expenses || []);
      } catch (e) { console.error(e); }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('projects')
      .update(formData)
      .eq('id', id);
    setSaving(false);
    if (!error) {
      setProject({ ...formData, id });
      setEditing(false);
    }
  };

  const handleCancel = () => {
    if (project) {
      setFormData(project);
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 font-medium">
        <svg className="w-5 h-5 animate-spin text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Loading project overview & dashboard...
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-12 text-slate-500 font-medium">Project not found</div>;
  }

  // Financial calculations
  const totalEstimated = estimateLines.reduce((sum, l) => sum + l.estimated_total, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const overheadAmount = totalEstimated * (project.overhead_pct || 10) / 100;
  const profitAmount = (totalEstimated + overheadAmount) * (project.profit_pct || 10) / 100;
  const grandTotal = totalEstimated + overheadAmount + profitAmount;

  const revenue = grandTotal;
  const cost = totalEstimated + totalExpenses + overheadAmount;
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const budgetUsedPct = totalEstimated > 0 ? (totalExpenses / totalEstimated) * 100 : 0;
  const statusBg = budgetUsedPct < 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : budgetUsedPct <= 100 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200';
  const statusLabel = budgetUsedPct < 90 ? 'Under Budget' : budgetUsedPct <= 100 ? 'At Budget' : 'Over Budget';

  // Category breakdown for bar chart
  const categoryBreakdown = RESIDENTIAL_CATEGORIES.map(cat => {
    const estimated = estimateLines
      .filter(l => l.category === cat)
      .reduce((sum, l) => sum + l.estimated_total, 0);
    const actual = expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    return { category: cat, estimated, actual };
  }).filter(d => d.estimated > 0 || d.actual > 0);

  // Pie chart data for expenses by category
  const expensesByCategory = RESIDENTIAL_CATEGORIES.map(cat => ({
    name: cat,
    value: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
  })).filter(d => d.value > 0);

  const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#d946ef'];

  const statusBadgeColors: Record<string, string> = {
    active: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    bidding: 'bg-amber-50 text-amber-700 border-amber-200',
    complete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="space-y-6">
      {/* Back button & Title bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-2xl font-bold border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
              )}
              <p className="text-xs text-slate-500 mt-0.5">Project Overview & Financial Dashboard</p>
            </div>
          </div>

          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Project
              </button>
            )}
          </div>
        </div>

        {/* Project Meta Info */}
        <div className="flex flex-wrap gap-4 text-xs items-center pt-3 border-t border-slate-100">
          {editing ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'commercial' | 'residential' })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Client</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2"
                  placeholder="Client name"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2"
                  placeholder="Address"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2"
                />
              </div>
            </div>
          ) : (
            <>
              <span className="capitalize px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                {project.type}
              </span>
              <span className="text-slate-600 font-medium">👤 {project.client_name || 'No Client'}</span>
              <span className="text-slate-600 font-medium">📍 {project.address || 'No Address'}</span>
              <span className="text-slate-600 font-medium">📅 Start: {project.start_date}</span>
              <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${statusBadgeColors[project.status] || 'bg-slate-100'}`}>
                {project.status.toUpperCase()}
              </span>
              <span className={`ml-auto px-3 py-1 rounded-full border text-[11px] font-bold ${statusBg}`}>
                {statusLabel} ({budgetUsedPct.toFixed(1)}% used)
              </span>
            </>
          )}
        </div>

        {/* Overhead & Profit Settings */}
        {editing && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Overhead %</label>
              <input
                type="number"
                value={formData.overhead_pct}
                onChange={(e) => setFormData({ ...formData, overhead_pct: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Profit %</label>
              <input
                type="number"
                value={formData.profit_pct}
                onChange={(e) => setFormData({ ...formData, profit_pct: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2"
                step="0.1"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estimated Cost</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">${totalEstimated.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">From estimate lines</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Actual Spend</span>
          <div className="text-2xl font-bold text-indigo-600 mt-1">${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">From logged receipts</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Revenue</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">${revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Incl. {project.overhead_pct}% OH + {project.profit_pct}% Profit</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gross Profit</span>
          <div className={`text-2xl font-bold mt-1 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ${profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] font-semibold text-slate-500 mt-1 block">{margin.toFixed(1)}% margin</span>
        </div>
      </div>

      {/* Financial Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bar Chart — Estimated vs Actual */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Estimated vs. Actual Spend by Category</h3>
          {categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748b' }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip formatter={(val: any) => `$${Number(val).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="estimated" name="Estimated" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-xs text-slate-400 italic">
              No category estimate or expense data available yet.
            </div>
          )}
        </div>

        {/* Pie Chart — Expenses Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Expense Distribution by Category</h3>
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => `$${Number(val).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-xs text-slate-400 italic">
              No expenses logged for this project yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}