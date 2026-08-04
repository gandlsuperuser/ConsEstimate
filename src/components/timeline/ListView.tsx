'use client';

import { useState, useMemo } from 'react';
import { ProjectTask, ProjectPhase, TASK_STATUS_COLORS, PRIORITY_COLORS } from '@/types/timeline';

interface ListViewProps {
  tasks: ProjectTask[];
  phases: ProjectPhase[];
  onTaskClick: (task: ProjectTask) => void;
  onTaskUpdate: (taskId: string, updates: Partial<ProjectTask>) => void;
}

type SortKey = 'name' | 'status' | 'priority' | 'start_date' | 'end_date' | 'progress' | 'assigned_to' | 'budget';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const STATUS_ORDER: Record<string, number> = { delayed: 5, in_progress: 4, on_hold: 3, not_started: 2, completed: 1 };

export default function ListView({ tasks, phases, onTaskClick, onTaskUpdate }: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('start_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');

  const phaseMap = useMemo(() => {
    const m = new Map<string, ProjectPhase>();
    phases.forEach((p) => m.set(p.id, p));
    return m;
  }, [phases]);

  const sortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Text filter
    if (filter) {
      const q = filter.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.assigned_to || '').toLowerCase().includes(q) ||
          (t.department || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // Phase filter
    if (phaseFilter !== 'all') {
      filtered = filtered.filter((t) => t.phase_id === phaseFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'status':
          cmp = (STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0);
          break;
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0);
          break;
        case 'start_date':
          cmp = a.start_date.localeCompare(b.start_date);
          break;
        case 'end_date':
          cmp = a.end_date.localeCompare(b.end_date);
          break;
        case 'progress':
          cmp = a.progress - b.progress;
          break;
        case 'assigned_to':
          cmp = (a.assigned_to || '').localeCompare(b.assigned_to || '');
          break;
        case 'budget':
          cmp = a.budget - b.budget;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [tasks, filter, statusFilter, phaseFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="text-slate-300 ml-0.5">↕</span>;
    return <span className="text-indigo-600 ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-slate-50/80 border-b border-slate-200">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search tasks, assignees, departments..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="delayed">Delayed</option>
          <option value="on_hold">On Hold</option>
        </select>

        {/* Phase filter */}
        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="all">All Phases</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Count */}
        <span className="text-[11px] font-medium text-slate-500">
          {sortedTasks.length} of {tasks.length} tasks
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              {[
                { key: 'name' as SortKey, label: 'Task Name', w: '' },
                { key: 'status' as SortKey, label: 'Status', w: 'w-24' },
                { key: 'priority' as SortKey, label: 'Priority', w: 'w-24' },
                { key: 'start_date' as SortKey, label: 'Start', w: 'w-28' },
                { key: 'end_date' as SortKey, label: 'End', w: 'w-28' },
                { key: 'progress' as SortKey, label: 'Progress', w: 'w-28' },
                { key: 'assigned_to' as SortKey, label: 'Assigned', w: 'w-36' },
                { key: 'budget' as SortKey, label: 'Budget', w: 'w-24' },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-800 select-none ${col.w}`}
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => {
              const phase = task.phase_id ? phaseMap.get(task.phase_id) : null;
              const statusCfg = TASK_STATUS_COLORS[task.status];
              const priorityCfg = PRIORITY_COLORS[task.priority];

              return (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="border-b border-slate-100 hover:bg-indigo-50/30 cursor-pointer transition-colors"
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {phase && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: phase.color }}
                        />
                      )}
                      <div>
                        <div className="text-[13px] font-semibold text-slate-800">{task.name}</div>
                        {phase && (
                          <div className="text-[10px] text-slate-400 font-medium">{phase.name}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${statusCfg?.bg || ''} ${statusCfg?.text || ''} ${statusCfg?.ring || ''}`}
                    >
                      {task.status === 'in_progress'
                        ? 'Active'
                        : task.status === 'not_started'
                        ? 'New'
                        : task.status === 'completed'
                        ? 'Done'
                        : task.status === 'delayed'
                        ? 'Late'
                        : task.status.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center text-[10px] font-bold uppercase ${priorityCfg?.text || 'text-slate-500'}`}>
                      <span
                        className="w-1.5 h-1.5 rounded-full mr-1.5"
                        style={{ backgroundColor: priorityCfg?.dot || '#94a3b8' }}
                      />
                      {task.priority}
                    </span>
                  </td>

                  {/* Start */}
                  <td className="px-4 py-3 text-xs text-slate-600 font-medium tabular-nums">
                    {new Date(task.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>

                  {/* End */}
                  <td className="px-4 py-3 text-xs text-slate-600 font-medium tabular-nums">
                    {new Date(task.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>

                  {/* Progress */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${task.progress}%`,
                            backgroundColor: statusCfg?.bar || '#94a3b8',
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{Math.round(task.progress)}%</span>
                    </div>
                  </td>

                  {/* Assigned */}
                  <td className="px-4 py-3">
                    {task.assigned_to ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[8px] font-bold">
                          {task.assigned_to.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-xs text-slate-700 font-medium truncate max-w-[100px]">
                          {task.assigned_to}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Budget */}
                  <td className="px-4 py-3 text-xs font-semibold text-slate-600 tabular-nums">
                    {task.budget > 0 ? `$${(task.budget / 1000).toFixed(0)}K` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sortedTasks.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            No tasks match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
