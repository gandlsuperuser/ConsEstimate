'use client';

import Link from 'next/link';

export interface Project {
  id: string;
  name: string;
  type?: 'commercial' | 'residential' | string;
  client_name?: string;
  address?: string;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'planning' | 'bidding' | 'complete' | string;
  overhead_pct?: number;
  profit_pct?: number;
  budget?: string | number;
  project_code?: string;
}

interface ProjectCardProps {
  project: any;
  onEdit?: (project: any) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  // Generate or format project code (e.g. PRJ-2026-002)
  const projectCode = project.project_code || `PRJ-${new Date().getFullYear()}-${project.id.slice(0, 3).toUpperCase()}`;

  // Map status badges
  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    active: { label: 'active', bg: 'bg-emerald-100/80', text: 'text-emerald-700' },
    planning: { label: 'planning', bg: 'bg-blue-100/80', text: 'text-blue-700' },
    bidding: { label: 'bidding', bg: 'bg-amber-100/80', text: 'text-amber-700' },
    complete: { label: 'complete', bg: 'bg-slate-100', text: 'text-slate-700' },
  };

  const currentStatus = statusConfig[project.status.toLowerCase()] || {
    label: project.status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
      onDelete?.(project.id);
    }
  };

  // Format budget or budget placeholder
  const formattedBudget = typeof project.budget === 'number'
    ? `$${(project.budget / 1000000).toFixed(1)}M`
    : project.budget || '$72.0M';

  // Format dates
  const dateRange = project.start_date
    ? `${new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${
        project.end_date
          ? new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Jun 29, 2028'
      }`
    : 'Jan 14, 2026 – Jun 29, 2028';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between group">
      {/* Top Header: Code, Status Badge, Trash Icon */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-medium text-slate-500 tracking-wide">
              {projectCode}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${currentStatus.bg} ${currentStatus.text}`}
            >
              {currentStatus.label}
            </span>
          </div>

          <button
            onClick={handleDelete}
            className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-slate-50"
            title="Delete Project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
        </div>

        {/* Project Title */}
        <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4 group-hover:text-indigo-600 transition-colors">
          {project.name}
        </h3>

        {/* Info List */}
        <div className="space-y-2 text-[13px] text-slate-500 mb-6">
          {/* Client */}
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h9m-9 0V9a2 2 0 012-2h2a2 2 0 012 2v12" />
            </svg>
            <span className="truncate">{project.client_name || 'HealthFirst Partners'}</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="truncate">{project.address || 'Denver, CO'}</span>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 3h.008v.008H12V18z" />
            </svg>
            <span>{dateRange}</span>
          </div>

          {/* Budget */}
          <div className="flex items-center gap-2.5 font-medium text-slate-600">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-6h6" />
            </svg>
            <span>{formattedBudget}</span>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <Link
        href={`/projects/${project.id}`}
        className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-800 text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 shadow-2xs"
      >
        Open Project
        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </Link>
    </div>
  );
}