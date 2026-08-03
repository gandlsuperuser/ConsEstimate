'use client';

import { ZoomLevel } from '@/types/timeline';

interface GanttToolbarProps {
  zoom: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
  showBaseline: boolean;
  onBaselineToggle: () => void;
  showCriticalPath: boolean;
  onCriticalPathToggle: () => void;
  onAddTask: () => void;
  onGenerateTimeline: () => void;
  onSeedDemo: () => void;
  isSeeding: boolean;
  taskCount: number;
}

export default function GanttToolbar({
  zoom,
  onZoomChange,
  showBaseline,
  onBaselineToggle,
  showCriticalPath,
  onCriticalPathToggle,
  onAddTask,
  onGenerateTimeline,
  onSeedDemo,
  isSeeding,
  taskCount,
}: GanttToolbarProps) {
  const zoomOptions: { value: ZoomLevel; label: string; icon: string }[] = [
    { value: 'day', label: 'Daily', icon: '📅' },
    { value: 'week', label: 'Weekly', icon: '📆' },
    { value: 'month', label: 'Monthly', icon: '🗓️' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Zoom selector */}
      <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {zoomOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onZoomChange(opt.value)}
            className={`px-3 py-2 text-[12px] font-medium transition-all duration-150 ${
              zoom === opt.value
                ? 'bg-indigo-600 text-white shadow-inner'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <span className="mr-1">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-7 bg-slate-200" />

      {/* Toggle buttons */}
      <button
        onClick={onCriticalPathToggle}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all duration-150 ${
          showCriticalPath
            ? 'bg-red-50 text-red-700 border-red-200 shadow-sm'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Critical Path
      </button>

      <button
        onClick={onBaselineToggle}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all duration-150 ${
          showBaseline
            ? 'bg-violet-50 text-violet-700 border-violet-200 shadow-sm'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Baseline
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Task count badge */}
      {taskCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {taskCount} tasks
        </span>
      )}

      {/* Action buttons */}
      <button
        onClick={onAddTask}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all duration-150 hover:shadow-md"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Task
      </button>

      {taskCount === 0 && (
        <>
          <button
            onClick={onGenerateTimeline}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Generate from Estimate
          </button>

          <button
            onClick={onSeedDemo}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all duration-150 disabled:opacity-50"
          >
            {isSeeding ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Load Demo Data
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
