'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Project {
  id: string;
  name: string;
  type: 'commercial' | 'residential';
  client_name: string;
  address: string;
  start_date: string;
  status: 'active' | 'bidding' | 'complete';
  overhead_pct: number;
  profit_pct: number;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'residential' as 'commercial' | 'residential',
    client_name: '',
    address: '',
    start_date: '',
    status: 'active' as 'active' | 'bidding' | 'complete',
    overhead_pct: 10,
    profit_pct: 10,
  });

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      if (data) {
        setProject(data);
        setFormData(data);
      }
      setLoading(false);
    };
    fetchProject();
  }, [id]);

  useEffect(() => {
    const editParam = new URLSearchParams(window.location.search).get('edit');
    if (editParam === 'true') {
      setEditing(true);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('projects')
      .update(formData)
      .eq('id', id);
    setSaving(false);
    if (!error) {
      setProject(formData);
      setEditing(false);
    }
  };

  const handleCancel = () => {
    if (project) {
      setFormData(project);
    }
    setEditing(false);
  };

  const statusColors: Record<string, string> = {
    active: 'bg-blue-100 text-blue-800',
    bidding: 'bg-yellow-100 text-yellow-800',
    complete: 'bg-green-100 text-green-800',
  };

  const navItems = [
    { href: `/projects/${id}`, label: 'Overview' },
    { href: `/projects/${id}/estimate`, label: 'Estimate' },
    { href: `/projects/${id}/receipts`, label: 'Receipts' },
    { href: `/projects/${id}/dashboard`, label: 'Dashboard' },
  ];

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!project) {
    return <div className="text-center py-8">Project not found</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/projects" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
          &larr; Back to Projects
        </Link>
        <div className="flex justify-between items-start">
          {editing ? (
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="text-2xl font-bold border rounded px-2 py-1 w-full max-w-md"
            />
          ) : (
            <h1 className="text-2xl font-bold">{project.name}</h1>
          )}
          <div className="flex gap-2 ml-4">
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
              >
                Edit
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-800 items-center">
          {editing ? (
            <>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'commercial' | 'residential' })}
                className="border rounded px-2 py-1"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="border rounded px-2 py-1"
                placeholder="Client name"
              />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="border rounded px-2 py-1"
                placeholder="Address"
              />
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="border rounded px-2 py-1"
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'bidding' | 'complete' })}
                className="border rounded px-2 py-1"
              >
                <option value="active">Active</option>
                <option value="bidding">Bidding</option>
                <option value="complete">Complete</option>
              </select>
            </>
          ) : (
            <>
              <span className="capitalize px-2 py-0.5 rounded bg-gray-100">{project.type}</span>
              <span>{project.client_name}</span>
              <span>{project.address}</span>
              <span>{project.start_date}</span>
              <span className={`px-2 py-0.5 rounded ${statusColors[project.status]}`}>
                {project.status}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="border-b mb-6">
        <nav className="flex gap-6 -mb-px">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 hover:border-gray-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Project Details</h2>
        {editing ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-gray-700 mb-1">Overhead %</label>
              <input
                type="number"
                value={formData.overhead_pct}
                onChange={(e) => setFormData({ ...formData, overhead_pct: parseFloat(e.target.value) || 0 })}
                className="border rounded px-2 py-1 w-full"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Profit %</label>
              <input
                type="number"
                value={formData.profit_pct}
                onChange={(e) => setFormData({ ...formData, profit_pct: parseFloat(e.target.value) || 0 })}
                className="border rounded px-2 py-1 w-full"
                step="0.1"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-700">Overhead:</span>
              <span className="ml-2 font-medium">{project.overhead_pct}%</span>
            </div>
            <div>
              <span className="text-gray-700">Profit Margin:</span>
              <span className="ml-2 font-medium">{project.profit_pct}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}