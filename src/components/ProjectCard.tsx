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
  onDelete?: (project: any) => void;
}

export default function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  // Generate or format project code
  const projectCode = project.project_code || `B-${project.id.slice(0, 4).toUpperCase()}`;

  // Map status badges — Procore-style
  const statusConfig: Record<string, { label: string; bg: string }> = {
    active: { label: 'Active', bg: 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' },
    planning: { label: 'Planning', bg: 'bg-blue-950 text-blue-300 border border-blue-800/60' },
    bidding: { label: 'Bidding', bg: 'bg-amber-950 text-amber-300 border border-amber-800/60' },
    complete: { label: 'Complete', bg: 'bg-zinc-800 text-zinc-300' },
  };

  const currentStatus = statusConfig[project.status?.toLowerCase()] || {
    label: project.status,
    bg: 'bg-zinc-800 text-zinc-300',
  };

  // Type badge
  const typeLabel = project.type === 'commercial' ? 'Commercial' : 'Residential';

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block bg-[#09090b] rounded-xl border border-[#52525b] hover:border-zinc-500 hover:shadow-lg transition-all duration-200 overflow-hidden group relative"
    >
      {/* Thumbnail area */}
      <div className="h-32 bg-[#18181b] border-b border-zinc-800 relative">
        {/* Project icon watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
        </div>

        {/* Status badge — top right */}
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide shadow-sm ${currentStatus.bg}`}>
            {currentStatus.label}
          </span>
        </div>

        {/* Project code — bottom left */}
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/70 backdrop-blur-sm text-[#f4f4f5] text-[13px] font-bold px-2 py-0.5 rounded border border-white/10">
            {projectCode}
          </span>
        </div>


      </div>

      {/* Info section */}
      <div className="p-5 bg-[#18181b]">
        <h3 className="text-base font-bold text-[#f4f4f5] tracking-tight mb-1.5 group-hover:text-white transition-colors line-clamp-1">
          {project.name}
        </h3>

        <div className="space-y-2 text-[13px] text-zinc-300">
          {/* Client */}
          {project.client_name && (
            <div className="flex items-center gap-1.5 truncate">
              <svg className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
              </svg>
              <span className="truncate text-[#f4f4f5] font-medium">{project.client_name}</span>
            </div>
          )}

          {/* Location */}
          {project.address && (
            <div className="flex items-center gap-1.5 truncate">
              <svg className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="truncate text-zinc-200">{project.address}</span>
            </div>
          )}
        </div>

        {/* Footer: type and action buttons */}
        <div className="mt-5 pt-4 border-t border-[#52525b] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            {typeLabel}
          </span>
          <div className="flex items-center gap-1.5">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(project);
                }}
                className="p-2 rounded text-zinc-200 hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
                title="Edit Project"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(project);
                }}
                className="p-2 rounded text-zinc-200 hover:text-red-400 hover:bg-[#18181b] transition-colors"
                title="Delete Project (Admin)"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            )}
            <svg className="w-4 h-4 text-zinc-300 group-hover:text-[#f4f4f5] transition-colors group-hover:translate-x-0.5 transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}