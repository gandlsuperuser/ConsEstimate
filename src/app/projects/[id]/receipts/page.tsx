'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Project, Expense } from '@/types';
import UploadDropzone from '@/components/UploadDropzone';
import ExpenseRow from '@/components/ExpenseRow';

export default function ReceiptsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [projectRes, expensesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/expenses?projectId=${projectId}`),
      ]);
      const projectData = await projectRes.json();
      const expensesData = await expensesRes.json();
      setProject(projectData.project);
      setExpenses(expensesData.expenses || []);
      setLoading(false);
    };
    fetchData();
  }, [projectId, refreshKey]);

  const handleUploadComplete = () => {
    setRefreshKey(k => k + 1);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return <div className="text-center py-8 text-gray-900">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Receipt Scanner</h1>
        <p className="text-sm text-gray-900 mt-1">
          Upload receipt images to automatically scan and categorize expenses
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">Upload Receipt</h2>
          <UploadDropzone projectId={projectId} onUploadComplete={handleUploadComplete} />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">Summary</h2>
          <div className="text-3xl font-bold text-blue-600">${totalExpenses.toFixed(2)}</div>
          <p className="text-sm text-gray-900">{expenses.length} expenses</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-2 py-3 text-left font-medium text-gray-800">Vendor</th>
                <th className="px-2 py-3 text-left font-medium text-gray-800">Date</th>
                <th className="px-2 py-3 text-left font-medium text-gray-800">Category</th>
                <th className="px-2 py-3 text-right font-medium text-gray-800">Amount</th>
                <th className="px-2 py-3 text-center font-medium text-gray-800">Receipt</th>
                <th className="px-2 py-3 text-center font-medium text-gray-800">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
            </tbody>
          </table>
        </div>

        {expenses.length === 0 && (
          <div className="text-center py-8 text-gray-900">
            No expenses recorded yet. Upload a receipt to get started.
          </div>
        )}
      </div>
    </div>
  );
}
