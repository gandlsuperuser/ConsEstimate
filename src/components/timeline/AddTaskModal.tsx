'use client';

import { useState, useEffect } from 'react';
import { ProjectPhase, ProjectTask } from '@/types/timeline';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<ProjectTask>) => void;
  phases: ProjectPhase[];
  projectId: string;
  editTask?: ProjectTask | null;
}

export default function AddTaskModal({
  isOpen,
  onClose,
  onSave,
  phases,
  projectId,
  editTask,
}: AddTaskModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    name: '',
    description: '',
    phase_id: phases[0]?.id || '',
    start_date: today,
    end_date: today,
    duration: 1,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    assigned_to: '',
    department: '',
    budget: 0,
    estimated_cost: 0,
    inspection_required: false,
    is_milestone: false,
    notes: '',
  });

  useEffect(() => {
    if (editTask) {
      setForm({
        name: editTask.name,
        description: editTask.description || '',
        phase_id: editTask.phase_id || phases[0]?.id || '',
        start_date: editTask.start_date,
        end_date: editTask.end_date,
        duration: editTask.duration,
        priority: editTask.priority,
        assigned_to: editTask.assigned_to || '',
        department: editTask.department || '',
        budget: editTask.budget,
        estimated_cost: editTask.estimated_cost,
        inspection_required: editTask.inspection_required,
        is_milestone: editTask.is_milestone,
        notes: editTask.notes || '',
      });
    } else {
      setForm({
        name: '',
        description: '',
        phase_id: phases[0]?.id || '',
        start_date: today,
        end_date: today,
        duration: 1,
        priority: 'medium',
        assigned_to: '',
        department: '',
        budget: 0,
        estimated_cost: 0,
        inspection_required: false,
        is_milestone: false,
        notes: '',
      });
    }
  }, [editTask, isOpen, phases, today]);

  // Auto-calculate end date from start + duration
  const updateDuration = (dur: number) => {
    const start = new Date(form.start_date + 'T00:00:00');
    let current = new Date(start);
    let remaining = dur - 1;
    while (remaining > 0) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      if (day !== 0 && day !== 6) remaining--;
    }
    setForm({ ...form, duration: dur, end_date: current.toISOString().split('T')[0] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      project_id: projectId,
      ...form,
      working_days: form.duration,
      status: editTask?.status || 'not_started',
      progress: editTask?.progress || 0,
      sort_order: 0,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editTask ? 'Edit Task' : 'Add New Task'}
                </h2>
                <p className="text-indigo-200 text-xs mt-0.5">
                  {editTask ? 'Update task details' : 'Create a new task for your project timeline'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Task Name */}
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1.5">
                Task Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Foundation Pour, Electrical Rough-In"
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              />
            </div>

            {/* Phase + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1.5">
                  Phase
                </label>
                <select
                  value={form.phase_id}
                  onChange={(e) => setForm({ ...form, phase_id: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-white"
                >
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1.5">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-white"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>
            </div>

            {/* Dates + Duration */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1.5">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.duration}
                  onChange={(e) => updateDuration(parseInt(e.target.value) || 1)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5"
                />
              </div>
            </div>

            {/* Assigned To + Department */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1.5">
                  Assigned To
                </label>
                <input
                  type="text"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  placeholder="Team member or subcontractor"
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g., Electrical, Plumbing"
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5"
                />
              </div>
            </div>

            {/* Budget + Estimated Cost */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1.5">
                  Budget ($)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1.5">
                  Estimated Cost ($)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.estimated_cost}
                  onChange={(e) => setForm({ ...form, estimated_cost: parseFloat(e.target.value) || 0 })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.inspection_required}
                  onChange={(e) => setForm({ ...form, inspection_required: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300"
                />
                <span className="text-sm text-slate-700 font-medium">Inspection Required</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_milestone}
                  onChange={(e) => setForm({ ...form, is_milestone: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300"
                />
                <span className="text-sm text-slate-700 font-medium">Milestone</span>
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1.5">
                Description / Notes
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional details, specifications, or special instructions..."
                className="w-full text-sm border border-slate-200 rounded-xl p-3"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all hover:shadow-xl"
              >
                {editTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
