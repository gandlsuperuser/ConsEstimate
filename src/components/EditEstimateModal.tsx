'use client';

import { useState } from 'react';
import { BTXEstimate } from '@/types';

interface EditEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: BTXEstimate | null;
  onSave: (updated: Partial<BTXEstimate>) => void;
}

function EditEstimateModalInner({
  onClose,
  estimate,
  onSave,
}: Omit<EditEstimateModalProps, 'isOpen'>) {
  const [formData, setFormData] = useState({
    title: estimate?.title || '',
    bid_number: estimate?.bid_number || '',
    estimate_date: estimate?.estimate_date || '',
    client_name: estimate?.client_name || '',
    project_name: estimate?.project_name || '',
    location: estimate?.location || '',
    scope: estimate?.scope || '',
    intro_text: estimate?.intro_text || '',
    submitted_by_name: estimate?.submitted_by_name || 'Raul Ayala',
    accepted_by_name: estimate?.accepted_by_name || 'Humana – Conviva',
    status: (estimate?.status || 'draft') as BTXEstimate['status'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Edit Proposal / Estimate Header</h2>
            <p className="text-sm text-slate-400">Update client, bid number, dates and project scope</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-base"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Proposal Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-base outline-hidden"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Bid Number</label>
              <input
                type="text"
                value={formData.bid_number}
                onChange={(e) => setFormData({ ...formData, bid_number: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-base outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Estimate Date</label>
              <input
                type="text"
                value={formData.estimate_date}
                onChange={(e) => setFormData({ ...formData, estimate_date: e.target.value })}
                placeholder="e.g. September 12, 2026"
                className="w-full bg-slate-800 border border-slate-700 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-base outline-hidden"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Client Name</label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-base outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Project Name</label>
              <input
                type="text"
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-base outline-hidden"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-base outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Scope</label>
            <input
              type="text"
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
              placeholder="e.g. Phase 1 – Additional Work / Change Order"
              className="w-full bg-slate-800 border border-slate-700 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-base outline-hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Introduction Statement</label>
            <textarea
              rows={2}
              value={formData.intro_text}
              onChange={(e) => setFormData({ ...formData, intro_text: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-base outline-hidden resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Submitted By</label>
              <input
                type="text"
                value={formData.submitted_by_name}
                onChange={(e) => setFormData({ ...formData, submitted_by_name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-base outline-hidden"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Accepted By</label>
              <input
                type="text"
                value={formData.accepted_by_name}
                onChange={(e) => setFormData({ ...formData, accepted_by_name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-base outline-hidden"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as BTXEstimate['status'] })}
                className="w-full bg-slate-800 border border-slate-700 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-base outline-hidden cursor-pointer"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-bold bg-[#0B2545] hover:bg-[#133863] border border-blue-400/30 text-white rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Save Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditEstimateModal(props: EditEstimateModalProps) {
  if (!props.isOpen) return null;
  return <EditEstimateModalInner key={props.estimate?.id || 'new'} {...props} />;
}
