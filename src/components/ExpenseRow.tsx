'use client';

import { Expense } from '@/types';

interface ExpenseRowProps {
  expense: Expense;
}

export default function ExpenseRow({ expense }: ExpenseRowProps) {
  const confidenceColors = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-red-100 text-red-800',
  };

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-2 py-2 text-sm">{expense.vendor}</td>
      <td className="px-2 py-2 text-sm">{expense.expense_date}</td>
      <td className="px-2 py-2 text-sm">{expense.category}</td>
      <td className="px-2 py-2 text-right font-medium">${expense.amount.toFixed(2)}</td>
      <td className="px-2 py-2 text-center">
        {expense.receipt_url && (
          <a
            href={expense.receipt_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            View
          </a>
        )}
      </td>
      <td className="px-2 py-2">
        <span className={`text-xs px-2 py-1 rounded ${confidenceColors[expense.scan_confidence]}`}>
          {expense.scan_confidence}
        </span>
      </td>
    </tr>
  );
}
