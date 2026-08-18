'use client';

import { useState } from 'react';
import { Expense } from '@/types';

interface ExpenseRowProps {
  expense: Expense;
  onPreviewReceipt?: (expense: Expense) => void;
  onExpenseUpdated?: () => void;
  onExpenseDeleted?: (id: string) => void;
}

export default function ExpenseRow({
  expense,
  onPreviewReceipt,
  onExpenseUpdated,
  onExpenseDeleted,
}: ExpenseRowProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confidenceColors = {
    high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', expense.project_id);
    formData.append('expenseId', expense.id);

    try {
      const res = await fetch('/api/expenses/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        onExpenseUpdated?.();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to upload receipt');
      }
    } catch (err) {
      console.error('Error uploading receipt:', err);
      alert('Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete expense for ${expense.vendor} ($${expense.amount.toFixed(2)})?`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses?id=${expense.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onExpenseDeleted?.(expense.id);
      } else {
        alert('Failed to delete expense');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting expense');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group">
      <td className="px-4 py-3.5 text-sm font-medium text-slate-800">
        <div className="flex items-center gap-2">
          <span>{expense.vendor}</span>
        </div>
        {expense.notes && (
          <p className="text-xs text-slate-400 font-normal mt-0.5 truncate max-w-xs" title={expense.notes}>
            {expense.notes}
          </p>
        )}
      </td>
      <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
        {expense.expense_date}
      </td>
      <td className="px-4 py-3.5 text-sm text-slate-600">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {expense.category}
        </span>
      </td>
      <td className="px-4 py-3.5 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
        ${expense.amount.toFixed(2)}
      </td>
      <td className="px-4 py-3.5 text-center">
        {expense.receipt_url ? (
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => onPreviewReceipt?.(expense)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition-colors"
              title="View receipt preview"
            >
              <span>🧾</span>
              <span>View</span>
            </button>
            <a
              href={expense.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
              title="Open file in new tab"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        ) : (
          <label className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg cursor-pointer transition-colors">
            {uploading ? (
              <span className="flex items-center gap-1 text-blue-600">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </span>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Attach File</span>
              </>
            )}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>
        )}
      </td>
      <td className="px-4 py-3.5 text-center">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${confidenceColors[expense.scan_confidence || 'high']}`}>
          {expense.scan_confidence || 'high'}
        </span>
      </td>
      <td className="px-3 py-3.5 text-right">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
          title="Delete expense"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
