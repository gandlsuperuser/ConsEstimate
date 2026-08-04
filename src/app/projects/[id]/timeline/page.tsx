'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  TimelineData,
  ZoomLevel,
  ProjectTask,
  ProjectPhase,
} from '@/types/timeline';
import { calculateProjectHealth } from '@/lib/timeline-engine';
import GanttChart from '@/components/timeline/GanttChart';
import GanttToolbar from '@/components/timeline/GanttToolbar';
import TimelineHeader from '@/components/timeline/TimelineHeader';
import TaskDetailPanel from '@/components/timeline/TaskDetailPanel';
import AddTaskModal from '@/components/timeline/AddTaskModal';
import CalendarView from '@/components/timeline/CalendarView';
import ListView from '@/components/timeline/ListView';
import KanbanView from '@/components/timeline/KanbanView';
import MilestoneView from '@/components/timeline/MilestoneView';

type ViewMode = 'gantt' | 'calendar' | 'list' | 'kanban' | 'milestones';

const VIEW_OPTIONS: { key: ViewMode; label: string; icon: string }[] = [
  { key: 'gantt', label: 'Gantt', icon: '📊' },
  { key: 'list', label: 'List', icon: '📋' },
  { key: 'kanban', label: 'Board', icon: '📌' },
  { key: 'calendar', label: 'Calendar', icon: '📅' },
  { key: 'milestones', label: 'Milestones', icon: '◆' },
];

export default function TimelinePage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [data, setData] = useState<TimelineData>({
    phases: [],
    tasks: [],
    dependencies: [],
    milestones: [],
    calendar: null,
    holidays: [],
  });
  const [projectStartDate, setProjectStartDate] = useState<string>('2026-08-01');
  const [projectName, setProjectName] = useState<string>('Project Timeline');

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('gantt');

  // Gantt controls
  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [showBaseline, setShowBaseline] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(true);

  // Selected task panel
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);

  // Add task modal
  const [showAddTask, setShowAddTask] = useState(false);

  // Fetch timeline data
  const fetchTimeline = useCallback(async () => {
    try {
      const [timelineRes, projectRes] = await Promise.all([
        fetch(`/api/timeline/${projectId}`),
        fetch(`/api/projects/${projectId}`),
      ]);

      const timeline = await timelineRes.json();
      const proj = await projectRes.json();

      if (timeline.phases || timeline.tasks) {
        setData(timeline);
      }
      if (proj.project) {
        setProjectStartDate(proj.project.start_date);
        setProjectName(proj.project.name);
      }
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Seed demo data
  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/timeline/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) {
        await fetchTimeline();
      }
    } finally {
      setIsSeeding(false);
    }
  };

  // Generate from estimate lines
  const handleGenerateFromEstimate = async () => {
    await handleSeedDemo();
  };

  // Add task handler
  const handleAddTask = async (taskData: Partial<ProjectTask>) => {
    try {
      const res = await fetch('/api/timeline/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (res.ok) {
        const { task } = await res.json();
        setData((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  // Quick add task (from toolbar)
  const handleQuickAddTask = () => {
    setShowAddTask(true);
  };

  // Task update handler
  const handleTaskUpdate = async (taskId: string, updates: Partial<ProjectTask>) => {
    // Optimistic update
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
    }));

    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null));
    }

    try {
      await fetch(`/api/timeline/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Task delete handler
  const handleTaskDelete = async (taskId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));

    try {
      await fetch(`/api/timeline/tasks/${taskId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Phase collapse/expand toggle
  const handlePhaseToggle = async (phaseId: string) => {
    const phase = data.phases.find((p) => p.id === phaseId);
    if (!phase) return;

    const newCollapsed = !phase.is_collapsed;
    setData((prev) => ({
      ...prev,
      phases: prev.phases.map((p) =>
        p.id === phaseId ? { ...p, is_collapsed: newCollapsed } : p
      ),
    }));

    try {
      await fetch('/api/timeline/phases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: phaseId, is_collapsed: newCollapsed }),
      });
    } catch (err) {
      console.error('Failed to toggle phase:', err);
    }
  };

  // Compute overall project health
  const health = useMemo(
    () => calculateProjectHealth(data.tasks, data.milestones, projectStartDate),
    [data.tasks, data.milestones, projectStartDate]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <svg className="w-5 h-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading project timeline & Gantt chart...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header metrics */}
      <TimelineHeader health={health} projectName={projectName} />

      {/* View switcher + Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* View mode tabs */}
        <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setViewMode(opt.key)}
              className={`px-3 py-2 text-[12px] font-medium transition-all duration-150 ${
                viewMode === opt.key
                  ? 'bg-indigo-600 text-white shadow-inner'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className="mr-1">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="w-px h-7 bg-slate-200" />

        {/* Gantt-specific controls (only show in gantt mode) */}
        {viewMode === 'gantt' && (
          <GanttToolbar
            zoom={zoom}
            onZoomChange={setZoom}
            showBaseline={showBaseline}
            onBaselineToggle={() => setShowBaseline(!showBaseline)}
            showCriticalPath={showCriticalPath}
            onCriticalPathToggle={() => setShowCriticalPath(!showCriticalPath)}
            onAddTask={handleQuickAddTask}
            onGenerateTimeline={handleGenerateFromEstimate}
            onSeedDemo={handleSeedDemo}
            isSeeding={isSeeding}
            taskCount={data.tasks.length}
          />
        )}

        {/* Non-gantt toolbar: just add task + count */}
        {viewMode !== 'gantt' && (
          <>
            <div className="flex-1" />
            {data.tasks.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                {data.tasks.length} tasks
              </span>
            )}
            <button
              onClick={handleQuickAddTask}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all duration-150 hover:shadow-md"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
          </>
        )}
      </div>

      {/* View Content */}
      {data.tasks.length > 0 ? (
        <>
          {viewMode === 'gantt' && (
            <GanttChart
              data={data}
              zoom={zoom}
              showBaseline={showBaseline}
              showCriticalPath={showCriticalPath}
              onTaskClick={(task) => setSelectedTask(task)}
              onTaskUpdate={handleTaskUpdate}
              onPhaseToggle={handlePhaseToggle}
            />
          )}

          {viewMode === 'calendar' && (
            <CalendarView
              tasks={data.tasks}
              phases={data.phases}
              onTaskClick={(task) => setSelectedTask(task)}
            />
          )}

          {viewMode === 'list' && (
            <ListView
              tasks={data.tasks}
              phases={data.phases}
              onTaskClick={(task) => setSelectedTask(task)}
              onTaskUpdate={handleTaskUpdate}
            />
          )}

          {viewMode === 'kanban' && (
            <KanbanView
              tasks={data.tasks}
              phases={data.phases}
              onTaskClick={(task) => setSelectedTask(task)}
              onTaskUpdate={handleTaskUpdate}
            />
          )}

          {viewMode === 'milestones' && (
            <MilestoneView
              milestones={data.milestones}
              tasks={data.tasks}
              phases={data.phases}
            />
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 3h.008v.008H12V18z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-1">No Timeline Tasks Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Generate a full construction schedule from your estimate or populate sample commercial demo data with 15 phases and 80+ tasks.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {isSeeding ? 'Generating Schedule...' : '⚡ Populate Commercial Demo Data'}
            </button>
            <button
              onClick={handleQuickAddTask}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm transition-all"
            >
              + Add First Task
            </button>
          </div>
        </div>
      )}

      {/* Task Detail Slide-Out */}
      <TaskDetailPanel
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
      />

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        onSave={handleAddTask}
        phases={data.phases}
        projectId={projectId}
      />
    </div>
  );
}
