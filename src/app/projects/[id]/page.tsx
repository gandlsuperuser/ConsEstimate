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
import ProjectPhotoModal from '@/components/ProjectPhotoModal';

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
  const [photosCount, setPhotosCount] = useState(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
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

  const fetchData = async () => {
    const [projRes, linesRes, expensesRes, photosRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      fetch(`/api/estimate-lines?projectId=${id}`),
      fetch(`/api/expenses?projectId=${id}`),
      fetch(`/api/projects/photos?projectId=${id}`),
    ]);

    if (projRes.data) {
      setProject(projRes.data);
      setFormData({
        name: projRes.data.name,
        type: projRes.data.type,
        client_name: projRes.data.client_name,
        address: projRes.data.address,
        start_date: projRes.data.start_date,
        status: projRes.data.status,
        overhead_pct: projRes.data.overhead_pct,
        profit_pct: projRes.data.profit_pct,
      });
    }

    if (linesRes.ok) {
      const linesData = await linesRes.json();
      setEstimateLines(linesData.lines || []);
    }

    if (expensesRes.ok) {
      const expensesData = await expensesRes.json();
      setExpenses(expensesData.expenses || []);
    }

    if (photosRes.ok) {
      const photosData = await photosRes.json();
      setPhotosCount(photosData.photos?.length || 0);
    }

    setLoading(false);
  };

  useEffect(() => {
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
      <div className="flex items-center justify-center py-16">
        <svg className="w-5 h-5 animate-spin text-procore-orange mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-procore-text-secondary text-sm font-medium">Loading project overview...</span>
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-12 text-procore-text-secondary font-medium">Project not found</div>;
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

  const CHART_COLORS = ['#fb923c', '#4ade80', '#60a5fa', '#f87171', '#facc15', '#c084fc', '#22d3ee', '#fda4af', '#a3e635', '#a5b4fc'];

  const recentExpenses = [...expenses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">

      {/* Header Bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-procore-text">Project Overview & Control Center</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPhotoModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-procore-text-secondary bg-[#18181b] hover:bg-zinc-800 border border-zinc-600 rounded-md transition-colors"
          >
            <span>📸</span>
            Photos
            {photosCount > 0 && (
              <span className="px-1.5 py-0.5 bg-procore-orange text-white rounded-full text-[9px] font-bold leading-none">{photosCount}</span>
            )}
          </button>
          {editing ? (
            <>
              <button onClick={handleCancel} className="px-3 py-1.5 text-sm font-medium text-procore-text-secondary border border-zinc-600 rounded-md hover:bg-zinc-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-sm font-bold bg-procore-orange text-white rounded-md hover:bg-procore-orange-hover disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-procore-text-secondary bg-[#18181b] hover:bg-zinc-800 border border-zinc-600 rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Details
            </button>
          )}
        </div>
      </div>

      {/* Top Row: KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Estimated Cost"
          value={`$${totalEstimated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="From estimate lines"
          color="text-procore-text"
        />
        <KPICard
          label="Actual Spend"
          value={`$${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${budgetUsedPct.toFixed(1)}% of budget`}
          color="text-procore-orange"
        />
        <KPICard
          label="Total Revenue"
          value={`$${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${project.overhead_pct}% OH + ${project.profit_pct}% Profit`}
          color="text-procore-text"
        />
        <KPICard
          label="Gross Profit"
          value={`$${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${margin.toFixed(1)}% margin`}
          color={profit >= 0 ? 'text-procore-success' : 'text-procore-danger'}
        />
      </div>

      {/* Middle: Project Details + Quick Create Cards */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Project Details Card */}
        <DashboardCard title="Project Details" className="lg:col-span-1">
          {editing ? (
            <div className="space-y-3">
              <EditField label="Type" value={formData.type} type="select" options={[{ value: 'residential', label: 'Residential' }, { value: 'commercial', label: 'Commercial' }]} onChange={(v) => setFormData({ ...formData, type: v as 'commercial' | 'residential' })} />
              <EditField label="Client" value={formData.client_name} onChange={(v) => setFormData({ ...formData, client_name: v })} />
              <EditField label="Address" value={formData.address} onChange={(v) => setFormData({ ...formData, address: v })} />
              <EditField label="Start Date" value={formData.start_date} type="date" onChange={(v) => setFormData({ ...formData, start_date: v })} />
              <div className="grid grid-cols-2 gap-3">
                <EditField label="Overhead %" value={String(formData.overhead_pct)} type="number" onChange={(v) => setFormData({ ...formData, overhead_pct: parseFloat(v) || 0 })} />
                <EditField label="Profit %" value={String(formData.profit_pct)} type="number" onChange={(v) => setFormData({ ...formData, profit_pct: parseFloat(v) || 0 })} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <DetailRow icon="👤" label="Client" value={project.client_name} />
              <DetailRow icon="📍" label="Location" value={project.address} />
              <DetailRow icon="📅" label="Start Date" value={project.start_date} />
              <DetailRow icon="🏗️" label="Type" value={project.type === 'commercial' ? 'Commercial' : 'Residential'} />
              <DetailRow icon="📊" label="Overhead" value={`${project.overhead_pct}%`} />
              <DetailRow icon="💰" label="Profit" value={`${project.profit_pct}%`} />
            </div>
          )}
        </DashboardCard>

        {/* Quick Tools & Workflow Navigation */}
        <DashboardCard title="Workflow Modules" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/projects/${id}/bidding`}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-600 hover:border-procore-orange hover:bg-procore-orange-light transition-all group text-left"
            >
              <span className="w-7 h-7 rounded bg-amber-950 text-amber-300 flex items-center justify-center text-xs font-bold">
                📋
              </span>
              <div>
                <p className="text-[13px] font-bold text-procore-text group-hover:text-procore-orange">Bidding</p>
                <p className="text-xs text-procore-text-muted">Bid Leveling</p>
              </div>
            </Link>

            <Link
              href={`/projects/${id}/contracts`}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-600 hover:border-procore-orange hover:bg-procore-orange-light transition-all group text-left"
            >
              <span className="w-7 h-7 rounded bg-blue-950 text-blue-300 flex items-center justify-center text-xs font-bold">
                📝
              </span>
              <div>
                <p className="text-[13px] font-bold text-procore-text group-hover:text-procore-orange">Contracts</p>
                <p className="text-xs text-procore-text-muted">Commitments</p>
              </div>
            </Link>

            <Link
              href={`/projects/${id}/rfis`}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-600 hover:border-procore-orange hover:bg-procore-orange-light transition-all group text-left"
            >
              <span className="w-7 h-7 rounded bg-indigo-950 text-indigo-300 flex items-center justify-center text-xs font-bold">
                ❓
              </span>
              <div>
                <p className="text-[13px] font-bold text-procore-text group-hover:text-procore-orange">RFIs</p>
                <p className="text-xs text-procore-text-muted">→ Change Events</p>
              </div>
            </Link>

            <Link
              href={`/projects/${id}/change-orders`}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-600 hover:border-procore-orange hover:bg-procore-orange-light transition-all group text-left"
            >
              <span className="w-7 h-7 rounded bg-orange-950 text-procore-orange flex items-center justify-center text-xs font-bold">
                🔄
              </span>
              <div>
                <p className="text-[13px] font-bold text-procore-text group-hover:text-procore-orange">Change Orders</p>
                <p className="text-xs text-procore-text-muted">PCOs / CCOs</p>
              </div>
            </Link>

            <Link
              href={`/projects/${id}/observations`}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-600 hover:border-procore-orange hover:bg-procore-orange-light transition-all group text-left"
            >
              <span className="w-7 h-7 rounded bg-emerald-950 text-emerald-300 flex items-center justify-center text-xs font-bold">
                🔍
              </span>
              <div>
                <p className="text-[13px] font-bold text-procore-text group-hover:text-procore-orange">Observations</p>
                <p className="text-xs text-procore-text-muted">Quality & Safety</p>
              </div>
            </Link>

            <Link
              href={`/projects/${id}/pay-apps`}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-600 hover:border-procore-orange hover:bg-procore-orange-light transition-all group text-left"
            >
              <span className="w-7 h-7 rounded bg-teal-950 text-teal-300 flex items-center justify-center text-xs font-bold">
                💵
              </span>
              <div>
                <p className="text-[13px] font-bold text-procore-text group-hover:text-procore-orange">Pay Apps</p>
                <p className="text-xs text-procore-text-muted">SOV Billing</p>
              </div>
            </Link>
          </div>
        </DashboardCard>

        {/* Recent Activity Card */}
        <DashboardCard title="Recent Expenses & Spend" className="lg:col-span-1">
          {recentExpenses.length > 0 ? (
            <div className="space-y-2">
              {recentExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between py-1.5 border-b border-zinc-700 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-procore-text truncate">{exp.vendor}</p>
                    <p className="text-[13px] text-procore-text-muted truncate">{exp.category} · {exp.expense_date}</p>
                  </div>
                  <span className="text-sm font-bold text-procore-text ml-2 flex-shrink-0">
                    ${exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              <Link
                href={`/projects/${id}/receipts`}
                className="block text-center text-[13px] font-semibold text-procore-orange hover:text-procore-orange-hover mt-1"
              >
                View Full Budget & Receipts →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-procore-text-muted italic text-center py-6">No expenses recorded yet</p>
          )}
        </DashboardCard>
      </div>

      {/* Financial Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Bar Chart — Estimated vs Actual */}
        <DashboardCard title="Estimated vs. Actual Spend by Category">
          {categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#d4d4d8' }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12, fill: '#d4d4d8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #71717a', borderRadius: 8, color: '#f4f4f5' }} labelStyle={{ color: '#f4f4f5' }} itemStyle={{ color: '#f4f4f5' }} cursor={{ fill: '#ffffff0a' }} formatter={(val: any) => `$${Number(val).toLocaleString()}`} />
                <Legend formatter={(value) => <span style={{ color: '#f4f4f5' }}>{value}</span>} />
                <Bar dataKey="estimated" name="Estimated" fill="#F47E20" radius={[3, 3, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#60a5fa" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-procore-text-muted italic">
              No category data available yet
            </div>
          )}
        </DashboardCard>

        {/* Pie Chart — Expenses Breakdown */}
        <DashboardCard title="Expense Distribution by Category">
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  stroke="#18181b"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #71717a', borderRadius: 8, color: '#f4f4f5' }} labelStyle={{ color: '#f4f4f5' }} itemStyle={{ color: '#f4f4f5' }} cursor={{ fill: '#ffffff0a' }} formatter={(val: any) => `$${Number(val).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-procore-text-muted italic">
              No expenses logged yet
            </div>
          )}
        </DashboardCard>
      </div>

      {/* Project Photo Modal */}
      <ProjectPhotoModal
        projectId={id}
        projectName={project.name}
        isOpen={isPhotoModalOpen}
        onClose={() => {
          setIsPhotoModalOpen(false);
          fetch(`/api/projects/photos?projectId=${id}`)
            .then((r) => r.json())
            .then((data) => setPhotosCount(data.photos?.length || 0))
            .catch(console.error);
        }}
        onPhotoCountChange={(count) => setPhotosCount(count)}
      />
    </div>
  );
}

// Subcomponents
function DashboardCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#18181b] rounded-lg border border-zinc-600 shadow-xs ${className}`}>
      <div className="px-4 py-3 border-b border-zinc-700">
        <h3 className="text-[13px] font-bold text-procore-text">{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

function KPICard({ label, value, subtitle, color }: { label: string; value: string; subtitle: string; color: string }) {
  return (
    <div className="bg-[#18181b] rounded-lg border border-zinc-600 shadow-xs p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-procore-text-muted mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[13px] text-procore-text-muted mt-0.5">{subtitle}</p>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <span className="font-semibold text-procore-text-muted">{label}</span>
        <p className="text-procore-text">{value}</p>
      </div>
    </div>
  );
}

function EditField({
  label, value, type = 'text', options, onChange
}: {
  label: string;
  value: string;
  type?: 'text' | 'select' | 'date' | 'number';
  options?: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-procore-text-muted mb-1">{label}</label>
      {type === 'select' && options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#09090b] text-[#f4f4f5] text-sm border border-zinc-600 rounded-md p-2 focus:border-procore-orange"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#09090b] text-[#f4f4f5] text-sm border border-zinc-600 rounded-md p-2 focus:border-procore-orange"
          step={type === 'number' ? '0.1' : undefined}
        />
      )}
    </div>
  );
}