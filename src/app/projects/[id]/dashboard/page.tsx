'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Project, EstimateLine, Expense, RESIDENTIAL_CATEGORIES } from '@/types';
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

export default function DashboardPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [estimateLines, setEstimateLines] = useState<EstimateLine[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [projectRes, linesRes, expensesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/estimate-lines?projectId=${projectId}`),
        fetch(`/api/expenses?projectId=${projectId}`),
      ]);
      const projectData = await projectRes.json();
      const linesData = await linesRes.json();
      const expensesData = await expensesRes.json();
      setProject(projectData.project);
      setEstimateLines(linesData.lines || []);
      setExpenses(expensesData.expenses || []);
      setLoading(false);
    };
    fetchData();
  }, [projectId]);

  if (loading) {
    return <div className="text-center py-8 text-gray-900">Loading...</div>;
  }

  const totalEstimated = estimateLines.reduce((sum, l) => sum + l.estimated_total, 0);
  const totalActual = estimateLines.reduce((sum, l) => sum + l.actual_total, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const overheadAmount = totalEstimated * (project?.overhead_pct || 10) / 100;
  const profitAmount = (totalEstimated + overheadAmount) * (project?.profit_pct || 10) / 100;
  const grandTotal = totalEstimated + overheadAmount + profitAmount;

  // Revenue = estimated total with markup (simplified)
  const revenue = grandTotal;
  const cost = totalEstimated + totalExpenses + overheadAmount;
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  // Budget status
  const budgetUsedPct = totalEstimated > 0 ? (totalExpenses / totalEstimated) * 100 : 0;
  const statusColor = budgetUsedPct < 90 ? 'bg-green-500' : budgetUsedPct <= 100 ? 'bg-yellow-500' : 'bg-red-500';
  const statusText = budgetUsedPct < 90 ? 'Under Budget' : budgetUsedPct <= 100 ? 'At Budget' : 'Over Budget';

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

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1', '#d946ef', '#f43f5e', '#64748b', '#84cc16', '#0ea5e9', '#a855f7', '#f59e0b', '#10b981', '#64748b'];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Profitability Dashboard</h1>
        <p className="text-sm text-gray-900 mt-1">{project?.name}</p>
      </div>

      <div className={`${statusColor} text-white px-4 py-2 rounded-lg mb-6 inline-block`}>
        {statusText} - {budgetUsedPct.toFixed(1)}% of estimated costs used
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-900">Estimated Cost</div>
          <div className="text-2xl font-bold">${totalEstimated.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-900">Actual Spend</div>
          <div className="text-2xl font-bold text-blue-600">${totalExpenses.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-900">Revenue</div>
          <div className="text-2xl font-bold">${revenue.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-900">Gross Profit</div>
          <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${profit.toFixed(2)} ({margin.toFixed(1)}%)
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">Estimated vs. Actual by Category</h2>
          {categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="estimated" name="Estimated" fill="#3b82f6" />
                <Bar dataKey="actual" name="Actual" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-900">No data yet</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">Expenses by Category</h2>
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
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-900">No expenses yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
