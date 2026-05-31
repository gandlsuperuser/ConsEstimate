'use client';

import { useEffect, useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import Link from 'next/link';
import ProjectCard from '@/components/ProjectCard';
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

export default function ProjectsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      setProjects(data || []);
      setLoading(false);
    };
    fetchProjects();
  }, []);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData(project);
  };

  const handleSave = async () => {
    if (!editingProject) return;
    setSaving(true);
    const { error } = await supabase
      .from('projects')
      .update(formData)
      .eq('id', editingProject.id);
    setSaving(false);
    if (!error) {
      setProjects(projects.map(p => p.id === editingProject.id ? formData : p));
      setEditingProject(null);
    }
  };

  const handleCancel = () => {
    setEditingProject(null);
  };

  const handleDuplicate = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        name: `${project.name} (Copy)`,
        type: project.type,
        client_name: project.client_name,
        address: project.address,
        start_date: project.start_date,
        status: project.status,
        overhead_pct: project.overhead_pct,
        profit_pct: project.profit_pct,
      })
      .select()
      .single();

    if (!error && newProject) {
      setProjects([newProject, ...projects]);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('projects').delete().eq('id', id);
    setProjects(projects.filter(p => p.id !== id));
  };

  useGSAP(() => {
    if (projects.length > 0) {
      gsap.fromTo('.project-card',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.1 }
      );
    }
  }, [projects]);

  if (loading) {
    return <div className="text-center py-8">Loading projects...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link
          href="/projects/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          New Project
        </Link>
      </div>

      {projects.length > 0 ? (
        <div ref={containerRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="project-card">
              <ProjectCard
                project={project}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-900">
          <p className="text-lg mb-2">No projects yet</p>
          <p className="text-sm">Create your first project to get started</p>
        </div>
      )}

      {/* Edit Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Edit Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'commercial' | 'residential' })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'bidding' | 'complete' })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="active">Active</option>
                  <option value="bidding">Bidding</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Overhead %</label>
                  <input
                    type="number"
                    value={formData.overhead_pct}
                    onChange={(e) => setFormData({ ...formData, overhead_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded px-3 py-2"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Profit %</label>
                  <input
                    type="number"
                    value={formData.profit_pct}
                    onChange={(e) => setFormData({ ...formData, profit_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded px-3 py-2"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}