'use client';

import { useState } from 'react';
import { Expense } from '@/types';

interface ReceiptPreviewModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onReceiptUpdated?: () => void;
}

export default function ReceiptPreviewModal({
  expense,
  isOpen,
  onClose,
  onReceiptUpdated,
}: ReceiptPreviewModalProps) {
  const [replacing, setReplacing] = useState(false);

  if (!isOpen || !expense) return null;

  const isPdf = expense.receipt_url?.toLowerCase().includes('.pdf');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReplacing(true);
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
        onReceiptUpdated?.();
        onClose();
      } else {
        alert('Failed to upload replacement receipt');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading receipt');
    } finally {
      setReplacing(false);
    }
  };

  const handleDetach = async () => {
    if (!confirm('Are you sure you want to detach this receipt file?')) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expense.id, receipt_url: null }),
      });
      if (res.ok) {
        onReceiptUpdated?.();
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>🧾</span> {expense.vendor}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ${expense.amount.toFixed(2)} • {expense.expense_date} • {expense.category}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {expense.receipt_url && (
              <a
                href={expense.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1"
              >
                <span>↗</span> Open original
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-auto p-4 bg-slate-900/5 flex items-center justify-center min-h-[360px]">
          {expense.receipt_url ? (
            isPdf ? (
              <iframe
                src={`${expense.receipt_url}#toolbar=0`}
                className="w-full h-[500px] rounded-lg border border-slate-200 bg-white"
                title="Receipt PDF Preview"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={expense.receipt_url}
                alt={`Receipt for ${expense.vendor}`}
                className="max-h-[550px] max-w-full object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
              />
            )
          ) : (
            <div className="text-center text-slate-400 py-12">
              <p className="text-sm">No receipt file uploaded for this expense.</p>
            </div>
          )}
        </div>

        {/* Notes & Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 max-w-md truncate">
            {expense.notes ? (
              <span><strong>Notes:</strong> {expense.notes}</span>
            ) : (
              <span className="text-slate-400 italic">No notes attached</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5">
              <span>{replacing ? 'Uploading...' : '📁 Replace File'}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={replacing}
                onChange={handleFileChange}
              />
            </label>

            {expense.receipt_url && (
              <button
                onClick={handleDetach}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Detach
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
