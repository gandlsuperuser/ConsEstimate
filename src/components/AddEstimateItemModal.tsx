'use client';

import { useState } from 'react';
import { EstimateCatalogItem, BTXEstimateItem } from '@/types';

interface AddEstimateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: Omit<BTXEstimateItem, 'id' | 'item_number'>) => void;
  catalogItems: EstimateCatalogItem[];
  itemToEdit?: BTXEstimateItem | null;
}

function AddEstimateItemModalInner({
  onClose,
  onAddItem,
  catalogItems,
  itemToEdit,
}: Omit<AddEstimateItemModalProps, 'isOpen'>) {
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [description, setDescription] = useState(itemToEdit?.description || '');
  const [details, setDetails] = useState(itemToEdit?.details || '');
  const [amount, setAmount] = useState<number | ''>(itemToEdit ? itemToEdit.amount : '');
  const [saveToCatalog, setSaveToCatalog] = useState(false);

  const handleCatalogSelect = (catalogId: string) => {
    setSelectedCatalogId(catalogId);
    if (!catalogId) return;

    const found = catalogItems.find((c) => c.id === catalogId);
    if (found) {
      setDescription(found.description);
      setDetails(found.details);
      setAmount(found.default_amount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount === '') return;

    onAddItem({
      description,
      details,
      amount: Number(amount) || 0,
    });

    if (saveToCatalog && !selectedCatalogId) {
      try {
        await fetch('/api/estimate-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description,
            details,
            default_amount: Number(amount),
            category: 'General',
          }),
        });
      } catch (err) {
        console.error('Failed to save custom item to catalog:', err);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center text-base font-black border border-red-500/30">
              BTX
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">
                {itemToEdit ? 'Edit Estimate Line Item' : 'Add Estimate Line Item'}
              </h2>
              <p className="text-sm text-slate-400">
                Choose from standard price catalog or enter custom scope
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-base"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
          {/* Catalog Picker Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Pick From Standard Catalog Line Items</span>
              <span className="text-xs text-slate-400 font-normal">Pre-priced from official specs</span>
            </label>
            <div className="relative">
              <select
                value={selectedCatalogId}
                onChange={(e) => handleCatalogSelect(e.target.value)}
                className="w-full bg-slate-800 border-2 border-red-500/40 hover:border-red-500/70 focus:border-red-500 text-white rounded-xl px-4 py-3 text-base font-medium outline-hidden appearance-none cursor-pointer transition-all shadow-sm"
              >
                <option value="">-- Select Standard Line Item (Auto-Fill) --</option>
                {catalogItems.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.description} — ${cat.default_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                ▼
              </div>
            </div>
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Item Description / Trade <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Concrete, Electrical, Additional Wall..."
              className="w-full bg-slate-800 border border-slate-700 focus:border-indigo-500 text-white rounded-xl px-4 py-3 text-base outline-hidden"
            />
          </div>

          {/* Details Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Scope of Work Details
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide exact details, engineer request specifications, materials included..."
              className="w-full bg-slate-800 border border-slate-700 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-base outline-hidden resize-none"
            />
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Amount ($ USD) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">$</span>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-slate-700 focus:border-indigo-500 text-white rounded-xl pl-9 pr-4 py-3 text-base font-semibold outline-hidden"
              />
            </div>
          </div>

          {!selectedCatalogId && !itemToEdit && (
            <label className="flex items-center gap-2.5 text-sm text-slate-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={saveToCatalog}
                onChange={(e) => setSaveToCatalog(e.target.checked)}
                className="rounded border-slate-700 text-red-600 focus:ring-red-500 w-4 h-4"
              />
              <span>Also save this item to standard catalog for future estimates</span>
            </label>
          )}

          {/* Action buttons */}
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
              className="px-6 py-2.5 text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer active:scale-95"
            >
              {itemToEdit ? 'Update Line Item' : 'Add to Estimate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddEstimateItemModal(props: AddEstimateItemModalProps) {
  if (!props.isOpen) return null;
  return <AddEstimateItemModalInner key={props.itemToEdit ? props.itemToEdit.id : 'new-item'} {...props} />;
}
