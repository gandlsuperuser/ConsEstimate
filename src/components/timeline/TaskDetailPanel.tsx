'use client';

import { useState } from 'react';
import { ProjectTask, TASK_STATUS_LABELS, TASK_STATUS_COLORS, PRIORITY_COLORS } from '@/types/timeline';

interface TaskDetailPanelProps {
  task: ProjectTask | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<ProjectTask>) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskDetailPanel({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'resources' | 'comments'>('details');

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 bg-slate-900 text-white flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                  {task.phase_name || 'Task Details'}
                </span>
                {task.is_critical && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-900/80 text-red-300 font-semibold">
                    Critical Path
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">{task.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Sub-nav tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-6">
            {(['details', 'resources', 'comments'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`py-3 px-4 text-xs font-semibold border-b-2 capitalize transition-all ${
                  activeTab === t
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Body content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {activeTab === 'details' && (
              <>
                {/* Status & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                      Status
                    </label>
                    <select
                      value={task.status}
                      onChange={(e) => onUpdate(task.id, { status: e.target.value as ProjectTask['status'] })}
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white"
                    >
                      {Object.entries(TASK_STATUS_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                      Priority
                    </label>
                    <select
                      value={task.priority}
                      onChange={(e) => onUpdate(task.id, { priority: e.target.value as ProjectTask['priority'] })}
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Progress slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold uppercase text-slate-500">
                      Progress
                    </label>
                    <span className="text-xs font-bold text-indigo-600">{Math.round(task.progress)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={task.progress}
                    onChange={(e) => onUpdate(task.id, { progress: parseInt(e.target.value) })}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Dates & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={task.start_date}
                      onChange={(e) => onUpdate(task.id, { start_date: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={task.end_date}
                      onChange={(e) => onUpdate(task.id, { end_date: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      value={task.duration}
                      onChange={(e) => onUpdate(task.id, { duration: parseInt(e.target.value) || 1 })}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                      Assigned To
                    </label>
                    <input
                      type="text"
                      value={task.assigned_to || ''}
                      onChange={(e) => onUpdate(task.id, { assigned_to: e.target.value })}
                      placeholder="Assignee name"
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                {/* Budget */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                      Budget ($)
                    </label>
                    <input
                      type="number"
                      value={task.budget}
                      onChange={(e) => onUpdate(task.id, { budget: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                      Actual Cost ($)
                    </label>
                    <input
                      type="number"
                      value={task.actual_cost}
                      onChange={(e) => onUpdate(task.id, { actual_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={task.inspection_required}
                      onChange={(e) => onUpdate(task.id, { inspection_required: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    Inspection Required
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={task.is_milestone}
                      onChange={(e) => onUpdate(task.id, { is_milestone: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    Is Milestone
                  </label>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={task.notes || ''}
                    onChange={(e) => onUpdate(task.id, { notes: e.target.value })}
                    placeholder="Task notes, specs, or special instructions..."
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                  />
                </div>
              </>
            )}

            {activeTab === 'resources' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Assigned resources for this task:
                </p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="font-semibold text-slate-700">Lead Assignee</div>
                  <div className="text-slate-600 mt-0.5">{task.assigned_to || 'Unassigned'}</div>
                </div>
                {task.department && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="font-semibold text-slate-700">Department</div>
                    <div className="text-slate-600 mt-0.5">{task.department}</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Task Activity & Comments:</p>
                <div className="text-xs text-slate-400 italic py-4 text-center">
                  No recent comments on this task.
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              onClick={() => {
                if (confirm('Delete this task?')) {
                  onDelete(task.id);
                  onClose();
                }
              }}
              className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Delete Task
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
