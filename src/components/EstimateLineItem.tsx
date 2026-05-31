'use client';

import { EstimateLine } from '@/types';
import { useState } from 'react';

interface EstimateLineItemProps {
  line: EstimateLine;
  onUpdate: (line: EstimateLine) => void;
  onDelete: (id: string) => void;
}

export default function EstimateLineItem({ line, onUpdate, onDelete }: EstimateLineItemProps) {
  const [editing, setEditing] = useState(false);

  const estimatedTotal = (line.quantity * line.labor_unit_cost) +
    (line.quantity * line.material_unit_cost) +
    line.sub_cost;

  const handleChange = (field: keyof EstimateLine, value: string | number) => {
    onUpdate({ ...line, [field]: value });
  };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-2 py-3">
        {editing ? (
          <input
            type="text"
            value={line.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm text-gray-900"
          />
        ) : (
          <span className="text-sm font-medium text-gray-900">{line.description}</span>
        )}
      </td>
      <td className="px-2 py-3">
        {editing ? (
          <input
            type="text"
            value={line.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm text-gray-900"
          />
        ) : (
          <span className="text-sm text-gray-900">{line.category}</span>
        )}
      </td>
      <td className="px-2 py-3 text-right">
        {editing ? (
          <input
            type="number"
            value={line.quantity}
            onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
            className="w-full border rounded px-2 py-1 text-sm text-gray-900"
          />
        ) : (
          <span className="text-sm text-gray-900">{line.quantity}</span>
        )}
      </td>
      <td className="px-2 py-3">
        {editing ? (
          <input
            type="text"
            value={line.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm text-gray-900"
          />
        ) : (
          <span className="text-sm text-gray-900">{line.unit}</span>
        )}
      </td>
      <td className="px-2 py-3 text-right">
        {editing ? (
          <input
            type="number"
            value={line.labor_unit_cost}
            onChange={(e) => handleChange('labor_unit_cost', parseFloat(e.target.value) || 0)}
            className="w-full border rounded px-2 py-1 text-sm text-gray-900"
            step="0.01"
          />
        ) : (
          <span className="text-sm text-gray-900">${line.labor_unit_cost.toFixed(2)}</span>
        )}
      </td>
      <td className="px-2 py-3 text-right">
        {editing ? (
          <input
            type="number"
            value={line.material_unit_cost}
            onChange={(e) => handleChange('material_unit_cost', parseFloat(e.target.value) || 0)}
            className="w-full border rounded px-2 py-1 text-sm text-gray-900"
            step="0.01"
          />
        ) : (
          <span className="text-sm text-gray-900">${line.material_unit_cost.toFixed(2)}</span>
        )}
      </td>
      <td className="px-2 py-3 text-right">
        {editing ? (
          <input
            type="number"
            value={line.sub_cost}
            onChange={(e) => handleChange('sub_cost', parseFloat(e.target.value) || 0)}
            className="w-full border rounded px-2 py-1 text-sm text-gray-900"
            step="0.01"
          />
        ) : (
          <span className="text-sm text-gray-900">${line.sub_cost.toFixed(2)}</span>
        )}
      </td>
      <td className="px-2 py-3 text-right font-semibold text-gray-900">
        ${estimatedTotal.toFixed(2)}
      </td>
      <td className="px-2 py-3 text-right">
        <span className="text-sm font-medium text-gray-900">${line.actual_total.toFixed(2)}</span>
      </td>
      <td className="px-2 py-3">
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {editing ? 'Save' : 'Edit'}
          </button>
          <button
            onClick={() => onDelete(line.id)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
