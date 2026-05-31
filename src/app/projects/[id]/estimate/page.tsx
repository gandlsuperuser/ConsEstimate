'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { EstimateLine, Project, RESIDENTIAL_CATEGORIES, COMMERCIAL_DIVISIONS } from '@/types';
import EstimateLineItem from '@/components/EstimateLineItem';
import Link from 'next/link';

export default function EstimatePage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [lines, setLines] = useState<EstimateLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [newLine, setNewLine] = useState({
    description: '',
    category: '',
    quantity: 1,
    unit: 'ea',
    labor_unit_cost: 0,
    material_unit_cost: 0,
    sub_cost: 0,
    notes: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      const [projectRes, linesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/estimate-lines?projectId=${projectId}`),
      ]);
      const projectData = await projectRes.json();
      const linesData = await linesRes.json();
      setProject(projectData.project);
      setLines(linesData.lines || []);
      setLoading(false);
    };
    fetchData();
  }, [projectId]);

  const categories = project?.type === 'commercial'
    ? [...COMMERCIAL_DIVISIONS.map(d => d.code + ' - ' + d.name)]
    : [...RESIDENTIAL_CATEGORIES];

  const handleAddLine = async () => {
    if (!newLine.description || !newLine.category) return;

    setSaving(true);
    const line = {
      project_id: projectId,
      category: newLine.category,
      division_code: project?.type === 'commercial' ? newLine.category.split(' ')[0] : null,
      description: newLine.description,
      quantity: newLine.quantity,
      unit: newLine.unit,
      labor_unit_cost: newLine.labor_unit_cost,
      material_unit_cost: newLine.material_unit_cost,
      sub_cost: newLine.sub_cost,
      estimated_total: (newLine.quantity * newLine.labor_unit_cost) +
        (newLine.quantity * newLine.material_unit_cost) +
        newLine.sub_cost,
      actual_total: 0,
      notes: newLine.notes,
    };

    try {
      const response = await fetch('/api/estimate-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(line),
      });
      const result = await response.json();
      if (response.ok && result.line) {
        setLines([...lines, result.line]);
        setNewLine({
          description: '',
          category: '',
          quantity: 1,
          unit: 'ea',
          labor_unit_cost: 0,
          material_unit_cost: 0,
          sub_cost: 0,
          notes: '',
        });
        setSaveMessage('Line added!');
        setTimeout(() => setSaveMessage(''), 2000);
      } else {
        console.error('Failed to add line:', result.error);
        setSaveMessage('Failed to add line');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLine = async (updatedLine: EstimateLine) => {
    const estimated_total = (updatedLine.quantity * updatedLine.labor_unit_cost) +
      (updatedLine.quantity * updatedLine.material_unit_cost) +
      updatedLine.sub_cost;

    setSaving(true);
    try {
      const response = await fetch(`/api/estimate-lines/${updatedLine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedLine, estimated_total }),
      });

      if (response.ok) {
        const result = await response.json();
        setLines(lines.map(l => l.id === updatedLine.id ? result.line : l));
        setSaveMessage('Line saved!');
        setTimeout(() => setSaveMessage(''), 2000);
      } else {
        const error = await response.json();
        console.error('Failed to update line:', error);
        setSaveMessage('Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLine = async (id: string) => {
    const response = await fetch(`/api/estimate-lines/${id}`, { method: 'DELETE' });
    if (response.ok) {
      setLines(lines.filter(l => l.id !== id));
      setSaveMessage('Line deleted');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };

  const totalEstimated = lines.reduce((sum, l) => sum + l.estimated_total, 0);
  const totalActual = lines.reduce((sum, l) => sum + l.actual_total, 0);
  const overheadAmount = totalEstimated * (project?.overhead_pct || 10) / 100;
  const profitAmount = (totalEstimated + overheadAmount) * (project?.profit_pct || 10) / 100;
  const grandTotal = totalEstimated + overheadAmount + profitAmount;

  if (loading) {
    return <div className="text-center py-8 text-gray-900">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Estimate Builder</h1>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMessage}
            </span>
          )}
          <Link
            href={`/projects/${projectId}/dashboard`}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            View Dashboard
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-2 py-3 text-left font-semibold text-gray-900">Description</th>
                <th className="px-2 py-3 text-left font-semibold text-gray-900">Category</th>
                <th className="px-2 py-3 text-right font-semibold text-gray-900">Qty</th>
                <th className="px-2 py-3 text-left font-semibold text-gray-900">Unit</th>
                <th className="px-2 py-3 text-right font-semibold text-gray-900">Labor $</th>
                <th className="px-2 py-3 text-right font-semibold text-gray-900">Material $</th>
                <th className="px-2 py-3 text-right font-semibold text-gray-900">Sub $</th>
                <th className="px-2 py-3 text-right font-semibold text-gray-900">Est. Total</th>
                <th className="px-2 py-3 text-right font-semibold text-gray-900">Actual</th>
                <th className="px-2 py-3 text-center font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <EstimateLineItem
                  key={line.id}
                  line={line}
                  onUpdate={handleUpdateLine}
                  onDelete={handleDeleteLine}
                />
              ))}
            </tbody>
          </table>
        </div>

        {lines.length === 0 && (
          <div className="text-center py-8 text-gray-600 font-medium">
            No line items yet. Add your first item below.
          </div>
        )}

        <div className="p-4 border-t bg-gray-50">
          <h3 className="font-medium mb-3">Add Line Item</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-700 mb-1">Description</label>
              <input
                type="text"
                placeholder="Item description"
                value={newLine.description}
                onChange={(e) => setNewLine({ ...newLine, description: e.target.value })}
                className="border rounded px-2 py-1.5 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Category</label>
              <select
                value={newLine.category}
                onChange={(e) => setNewLine({ ...newLine, category: e.target.value })}
                className="border rounded px-2 py-1.5 text-sm w-full"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                placeholder="1"
                value={newLine.quantity}
                onChange={(e) => setNewLine({ ...newLine, quantity: parseFloat(e.target.value) || 0 })}
                className="border rounded px-2 py-1.5 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                placeholder="ea, ft, hrs"
                value={newLine.unit}
                onChange={(e) => setNewLine({ ...newLine, unit: e.target.value })}
                className="border rounded px-2 py-1.5 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Labor $/Unit</label>
              <input
                type="number"
                placeholder="0.00"
                value={newLine.labor_unit_cost}
                onChange={(e) => setNewLine({ ...newLine, labor_unit_cost: parseFloat(e.target.value) || 0 })}
                className="border rounded px-2 py-1.5 text-sm w-full"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Material $/Unit</label>
              <input
                type="number"
                placeholder="0.00"
                value={newLine.material_unit_cost}
                onChange={(e) => setNewLine({ ...newLine, material_unit_cost: parseFloat(e.target.value) || 0 })}
                className="border rounded px-2 py-1.5 text-sm w-full"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Subcontractor $</label>
              <input
                type="number"
                placeholder="0.00"
                value={newLine.sub_cost}
                onChange={(e) => setNewLine({ ...newLine, sub_cost: parseFloat(e.target.value) || 0 })}
                className="border rounded px-2 py-1.5 text-sm w-full"
                step="0.01"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddLine}
                disabled={saving || !newLine.description || !newLine.category}
                className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50 w-full"
              >
                {saving ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Estimate Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-700">Subtotal:</span>
            <span className="ml-2 font-semibold text-gray-900">${totalEstimated.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-700">Overhead ({project?.overhead_pct}%):</span>
            <span className="ml-2 font-semibold text-gray-900">${overheadAmount.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-700">Profit ({project?.profit_pct}%):</span>
            <span className="ml-2 font-semibold text-gray-900">${profitAmount.toFixed(2)}</span>
          </div>
          <div className="font-bold text-lg">
            <span className="text-gray-900">Grand Total:</span>
            <span className="ml-2 text-blue-600">${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
