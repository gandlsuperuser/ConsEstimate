'use client';

import { useEffect, useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import Link from 'next/link';
import ProjectCard from '@/components/ProjectCard';
import { supabase } from '@/lib/supabase';

interface Project {
  id: string;
  name: string;
  type: 'commercial' | 'residential';
  client_name: string;
  address: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'planning' | 'bidding' | 'complete' | string;
  overhead_pct: number;
  profit_pct: number;
  budget?: string | number;
  project_code?: string;
}

type ViewMode = 'thumbnail' | 'list';

export default function ProjectsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('thumbnail');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Edit modal state
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
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        setErrorMsg(error.message);
      }
      setProjects(data || []);
      setLoading(false);
    };
    fetchProjects();
  }, []);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      type: project.type as 'commercial' | 'residential',
      client_name: project.client_name,
      address: project.address,
      start_date: project.start_date,
      status: project.status as 'active' | 'bidding' | 'complete',
      overhead_pct: project.overhead_pct,
      profit_pct: project.profit_pct,
    });
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
      setProjects(projects.map(p => p.id === editingProject.id ? { ...formData, id: editingProject.id } : p));
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

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.address?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  useGSAP(() => {
    if (filteredProjects.length > 0) {
      gsap.fromTo('.project-card',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.06 }
      );
    }
  }, [filteredProjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="w-5 h-5 animate-spin text-procore-orange mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-procore-text-secondary text-sm font-medium">Loading projects...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="text-center py-12 text-red-600 bg-red-50 rounded-lg border border-red-200 p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-2">Error Loading Projects</h2>
        <p className="mb-4 text-sm font-mono text-left bg-white p-3 rounded border text-red-800">{errorMsg}</p>
        <p className="text-sm text-gray-700">If you are on Vercel, check that <b>NEXT_PUBLIC_SUPABASE_URL</b> and <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> are correct and that the URL does not end in `/rest/v1/`.</p>
      </div>
    );
  }

  const statusCounts = {
    all: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    bidding: projects.filter(p => p.status === 'bidding').length,
    complete: projects.filter(p => p.status === 'complete').length,
  };

  return (
    <div>
      {/* Portfolio Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold text-procore-text tracking-tight">PORTFOLIO</h1>
          <p className="text-[12px] text-procore-text-muted mt-0.5">
            Showing {filteredProjects.length} of {projects.length} projects
          </p>
        </div>
        <Link
          href="/projects/new"
          className="bg-procore-orange text-white px-4 py-2 rounded-md hover:bg-procore-orange-hover transition-colors text-sm font-bold shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-procore-border p-3 mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full sm:w-auto">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-procore-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-procore-border rounded-md focus:border-procore-orange focus:ring-1 focus:ring-procore-orange transition-colors bg-white"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'active', 'bidding', 'complete'] as const).map((status) => {
            const chipStyles: Record<string, string> = {
              all: statusFilter === 'all' ? 'bg-procore-text text-white' : 'bg-gray-100 text-procore-text-secondary hover:bg-gray-200',
              active: statusFilter === 'active' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100',
              bidding: statusFilter === 'bidding' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
              complete: statusFilter === 'complete' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
            };
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors capitalize ${chipStyles[status]}`}
              >
                {status === 'all' ? 'All' : status} ({statusCounts[status]})
              </button>
            );
          })}
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-[12px] border border-procore-border rounded-md px-2.5 py-1.5 bg-white text-procore-text-secondary focus:border-procore-orange"
        >
          <option value="all">All Types</option>
          <option value="commercial">Commercial</option>
          <option value="residential">Residential</option>
        </select>

        {/* View mode toggle */}
        <div className="flex items-center border border-procore-border rounded-md overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('thumbnail')}
            className={`p-1.5 transition-colors ${viewMode === 'thumbnail' ? 'bg-procore-orange text-white' : 'bg-white text-procore-text-muted hover:bg-gray-50'}`}
            title="Thumbnail View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-procore-orange text-white' : 'bg-white text-procore-text-muted hover:bg-gray-50'}`}
            title="List View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Project Cards / List */}
      {filteredProjects.length > 0 ? (
        viewMode === 'thumbnail' ? (
          <div ref={containerRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((project) => (
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
          /* List View */
          <div className="bg-white rounded-lg border border-procore-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-procore-border">
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-procore-text-muted">Project</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-procore-text-muted hidden md:table-cell">Client</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-procore-text-muted hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-procore-text-muted">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-procore-text-muted hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-procore-text-muted hidden lg:table-cell">Start Date</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project, i) => {
                  const statusBadge: Record<string, string> = {
                    active: 'bg-green-100 text-green-800',
                    bidding: 'bg-amber-100 text-amber-800',
                    complete: 'bg-blue-100 text-blue-800',
                  };
                  return (
                    <tr
                      key={project.id}
                      className={`border-b border-procore-border-light hover:bg-procore-orange-light/50 transition-colors cursor-pointer project-card ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/projects/${project.id}`} className="font-semibold text-procore-text hover:text-procore-orange transition-colors">
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-procore-text-secondary hidden md:table-cell">{project.client_name}</td>
                      <td className="px-4 py-3 text-procore-text-secondary hidden lg:table-cell truncate max-w-[200px]">{project.address}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge[project.status] || 'bg-gray-100 text-gray-700'}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-procore-text-secondary capitalize hidden sm:table-cell">{project.type}</td>
                      <td className="px-4 py-3 text-procore-text-secondary hidden lg:table-cell">
                        {project.start_date ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${project.name}"?`)) handleDelete(project.id); }}
                          className="text-procore-text-muted hover:text-red-500 transition-colors p-1"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-procore-border">
          <svg className="w-12 h-12 text-procore-text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          {search || statusFilter !== 'all' || typeFilter !== 'all' ? (
            <>
              <p className="text-base font-semibold text-procore-text mb-1">No matching projects</p>
              <p className="text-sm text-procore-text-muted">Try adjusting your search or filters</p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-procore-text mb-1">No projects yet</p>
              <p className="text-sm text-procore-text-muted mb-4">Create your first project to get started</p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-1.5 bg-procore-orange text-white px-4 py-2 rounded-md hover:bg-procore-orange-hover transition-colors text-sm font-bold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create Project
              </Link>
            </>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 border border-procore-border">
            <h2 className="text-lg font-bold mb-4 text-procore-text">Edit Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-procore-text-muted mb-1">Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-procore-border rounded-md px-3 py-2 text-sm focus:border-procore-orange focus:ring-1 focus:ring-procore-orange"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-procore-text-muted mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'commercial' | 'residential' })}
                  className="w-full border border-procore-border rounded-md px-3 py-2 text-sm focus:border-procore-orange"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-procore-text-muted mb-1">Client Name</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="w-full border border-procore-border rounded-md px-3 py-2 text-sm focus:border-procore-orange focus:ring-1 focus:ring-procore-orange"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-procore-text-muted mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-procore-border rounded-md px-3 py-2 text-sm focus:border-procore-orange focus:ring-1 focus:ring-procore-orange"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-procore-text-muted mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full border border-procore-border rounded-md px-3 py-2 text-sm focus:border-procore-orange"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-procore-text-muted mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'bidding' | 'complete' })}
                  className="w-full border border-procore-border rounded-md px-3 py-2 text-sm focus:border-procore-orange"
                >
                  <option value="active">Active</option>
                  <option value="bidding">Bidding</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-procore-text-muted mb-1">Overhead %</label>
                  <input
                    type="number"
                    value={formData.overhead_pct}
                    onChange={(e) => setFormData({ ...formData, overhead_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border rounded-md px-3 py-2 text-sm focus:border-procore-orange"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-procore-text-muted mb-1">Profit %</label>
                  <input
                    type="number"
                    value={formData.profit_pct}
                    onChange={(e) => setFormData({ ...formData, profit_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border rounded-md px-3 py-2 text-sm focus:border-procore-orange"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm border border-procore-border rounded-md hover:bg-gray-50 text-procore-text-secondary font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-procore-orange text-white rounded-md hover:bg-procore-orange-hover disabled:opacity-50 font-bold"
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