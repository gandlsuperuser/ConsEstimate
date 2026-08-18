'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Project, Expense } from '@/types';
import UploadDropzone from '@/components/UploadDropzone';
import ExpenseRow from '@/components/ExpenseRow';
import ReceiptPreviewModal from '@/components/ReceiptPreviewModal';
import AddExpenseModal from '@/components/AddExpenseModal';
import VoiceExpenseModal from '@/components/VoiceExpenseModal';

export default function ReceiptsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [, setProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'table' | 'vault'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpenseForPreview, setSelectedExpenseForPreview] = useState<Expense | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isVoiceExpenseOpen, setIsVoiceExpenseOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectRes, expensesRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/expenses?projectId=${projectId}`),
        ]);
        const projectData = await projectRes.json();
        const expensesData = await expensesRes.json();
        setProject(projectData.project);
        setExpenses(expensesData.expenses || []);
      } catch (err) {
        console.error('Error fetching receipts/expenses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expensesWithFiles = expenses.filter((e) => Boolean(e.receipt_url));

  const filteredExpenses = expenses.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.vendor.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.notes && e.notes.toLowerCase().includes(q))
    );
  });

  const filteredVault = expensesWithFiles.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.vendor.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.notes && e.notes.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Loading expenses and receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🧾</span> Receipts & Expense Storage
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Store receipt files, scan with AI, and track project expenses in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsVoiceExpenseOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200/80 rounded-xl transition-all shadow-sm shadow-indigo-500/10"
          >
            <span className="text-base">🎙️</span>
            <span>Voice Expense</span>
          </button>

          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm shadow-blue-500/25 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Expenses</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-500 mt-0.5">{expenses.length} total entries recorded</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
            $
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stored Files</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{expensesWithFiles.length} / {expenses.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Receipts stored in cloud storage</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
            📁
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Missing Receipts</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{expenses.length - expensesWithFiles.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Entries pending receipt upload</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
            ⚠️
          </div>
        </div>
      </div>

      {/* AI Receipt Scanner & Quick Upload Dropzone */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>⚡</span> Upload & Scan Receipt
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Drag & drop any receipt image or PDF to extract vendor, amounts, and store the file
            </p>
          </div>
        </div>
        <UploadDropzone projectId={projectId} onUploadComplete={handleRefresh} />
      </div>

      {/* Main Expenses & Document Vault Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-200/70 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('table')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'table'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 All Expenses ({expenses.length})
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'vault'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📁 Receipt Document Vault</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
                {expensesWithFiles.length}
              </span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search vendor, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Tab 1: Expenses Table */}
        {activeTab === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Vendor / Payee</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Receipt File</th>
                  <th className="px-4 py-3 text-center">Scan Status</th>
                  <th className="px-3 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onPreviewReceipt={(exp) => setSelectedExpenseForPreview(exp)}
                    onExpenseUpdated={handleRefresh}
                    onExpenseDeleted={handleRefresh}
                  />
                ))}
              </tbody>
            </table>

            {filteredExpenses.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-xl">
                  🔍
                </div>
                <p className="text-sm font-medium">No expenses found matching your query.</p>
                <p className="text-xs text-slate-400 mt-1">Upload a receipt or click &ldquo;Add Expense&rdquo; to record one.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Stored Receipt Documents Vault */}
        {activeTab === 'vault' && (
          <div className="p-6">
            {filteredVault.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredVault.map((expense) => {
                  const isPdf = expense.receipt_url?.toLowerCase().includes('.pdf');
                  return (
                    <div
                      key={expense.id}
                      className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col"
                    >
                      {/* Preview / Thumbnail container */}
                      <div
                        onClick={() => setSelectedExpenseForPreview(expense)}
                        className="h-44 bg-slate-100 cursor-pointer overflow-hidden relative flex items-center justify-center border-b border-slate-100"
                      >
                        {isPdf ? (
                          <div className="flex flex-col items-center gap-2 text-slate-500">
                            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg">
                              PDF
                            </div>
                            <span className="text-[11px] font-medium">Click to view document</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={expense.receipt_url!}
                            alt={`Receipt for ${expense.vendor}`}
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                          />
                        )}

                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900/80 rounded-lg backdrop-blur-sm">
                            🔍 Quick Preview
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-bold text-slate-800 truncate" title={expense.vendor}>
                              {expense.vendor}
                            </h4>
                            <span className="text-xs font-bold text-slate-900 whitespace-nowrap">
                              ${expense.amount.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                            <span>{expense.category}</span>
                            <span>{expense.expense_date}</span>
                          </div>

                          {expense.notes && (
                            <p className="text-[11px] text-slate-400 mt-2 line-clamp-2" title={expense.notes}>
                              {expense.notes}
                            </p>
                          )}
                        </div>

                        {/* Card footer actions */}
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                          <a
                            href={expense.receipt_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <span>↗</span> Open
                          </a>
                          <button
                            onClick={() => setSelectedExpenseForPreview(expense)}
                            className="font-medium text-slate-600 hover:text-slate-900"
                          >
                            View & Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-2xl">
                  📂
                </div>
                <h3 className="text-base font-bold text-slate-800">No Receipt Files Stored Yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Upload a receipt image or PDF using the dropzone above or click &ldquo;Attach File&rdquo; on any expense in the table.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <ReceiptPreviewModal
        expense={selectedExpenseForPreview}
        isOpen={Boolean(selectedExpenseForPreview)}
        onClose={() => setSelectedExpenseForPreview(null)}
        onReceiptUpdated={handleRefresh}
      />

      {/* Add Expense Modal */}
      <AddExpenseModal
        projectId={projectId}
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onExpenseAdded={handleRefresh}
      />

      {/* Voice Expense Modal */}
      <VoiceExpenseModal
        defaultProjectId={projectId}
        isOpen={isVoiceExpenseOpen}
        onClose={() => setIsVoiceExpenseOpen(false)}
        onExpenseSaved={handleRefresh}
      />
    </div>
  );
}
