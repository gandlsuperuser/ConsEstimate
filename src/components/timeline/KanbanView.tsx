'use client';

import { useMemo } from 'react';
import { ProjectTask, ProjectPhase, TASK_STATUS_COLORS, PRIORITY_COLORS } from '@/types/timeline';

interface KanbanViewProps {
  tasks: ProjectTask[];
  phases: ProjectPhase[];
  onTaskClick: (task: ProjectTask) => void;
  onTaskUpdate: (taskId: string, updates: Partial<ProjectTask>) => void;
}

const COLUMNS = [
  { key: 'not_started', label: 'Not Started', emoji: '📋', color: '#94a3b8' },
  { key: 'in_progress', label: 'In Progress', emoji: '🔨', color: '#3b82f6' },
  { key: 'delayed', label: 'Delayed', emoji: '⚠️', color: '#ef4444' },
  { key: 'on_hold', label: 'On Hold', emoji: '⏸️', color: '#f59e0b' },
  { key: 'completed', label: 'Completed', emoji: '✅', color: '#10b981' },
];

export default function KanbanView({ tasks, phases, onTaskClick, onTaskUpdate }: KanbanViewProps) {
  const phaseMap = useMemo(() => {
    const m = new Map<string, ProjectPhase>();
    phases.forEach((p) => m.set(p.id, p));
    return m;
  }, [phases]);

  const columnTasks = useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    COLUMNS.forEach((col) => map.set(col.key, []));
    tasks.forEach((t) => {
      const list = map.get(t.status) || map.get('not_started')!;
      list.push(t);
    });
    return map;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      const updates: Partial<ProjectTask> = { status: status as ProjectTask['status'] };
      if (status === 'completed') updates.progress = 100;
      if (status === 'not_started') updates.progress = 0;
      onTaskUpdate(taskId, updates);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const colTasks = columnTasks.get(col.key) || [];
        return (
          <div
            key={col.key}
            className="flex-shrink-0 w-72 bg-slate-50/80 rounded-xl border border-slate-200 overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            {/* Column header */}
            <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{col.emoji}</span>
                <span className="text-[12px] font-bold text-slate-700">{col.label}</span>
              </div>
              <span
                className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: col.color + '15', color: col.color }}
              >
                {colTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
              {colTasks.map((task) => {
                const phase = task.phase_id ? phaseMap.get(task.phase_id) : null;
                const priorityCfg = PRIORITY_COLORS[task.priority];

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onTaskClick(task)}
                    className="bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group"
                  >
                    {/* Phase tag */}
                    {phase && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: phase.color }}
                        />
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                          {phase.name}
                        </span>
                      </div>
                    )}

                    {/* Task name */}
                    <h4 className="text-[12px] font-semibold text-slate-800 leading-snug mb-2 group-hover:text-indigo-700 transition-colors">
                      {task.name}
                    </h4>

                    {/* Progress bar */}
                    {task.status !== 'not_started' && (
                      <div className="mb-2">
                        <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                          <span>Progress</span>
                          <span className="font-bold">{Math.round(task.progress)}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${task.progress}%`,
                              backgroundColor: col.color,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                      {/* Priority */}
                      <span className={`text-[9px] font-bold uppercase ${priorityCfg?.text || 'text-slate-400'}`}>
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                          style={{ backgroundColor: priorityCfg?.dot || '#94a3b8' }}
                        />
                        {task.priority}
                      </span>

                      {/* Assignee avatar */}
                      {task.assigned_to ? (
                        <div
                          className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[7px] font-bold"
                          title={task.assigned_to}
                        >
                          {task.assigned_to.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-300 italic">—</span>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="mt-1.5 text-[9px] text-slate-400 font-medium">
                      {new Date(task.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' → '}
                      {new Date(task.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <span className="ml-1.5 text-slate-300">({task.duration}d)</span>
                    </div>
                  </div>
                );
              })}

              {colTasks.length === 0 && (
                <div className="flex items-center justify-center py-8 text-[11px] text-slate-400 italic">
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
