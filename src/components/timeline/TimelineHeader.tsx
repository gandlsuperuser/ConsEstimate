'use client';

import { ProjectHealth, HEALTH_STATUS_CONFIG, ProjectMilestone } from '@/types/timeline';

interface TimelineHeaderProps {
  health: ProjectHealth;
  projectName: string;
}

export default function TimelineHeader({ health, projectName }: TimelineHeaderProps) {
  const statusConfig = HEALTH_STATUS_CONFIG[health.status];
  const budgetPct = health.totalBudget > 0
    ? Math.round((health.spentBudget / health.totalBudget) * 100)
    : 0;

  return (
    <div className="mb-6">
      {/* Top row — Health & Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Project Health */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Project Health</span>
            <span className="text-2xl">{statusConfig.emoji}</span>
          </div>
          <div className={`text-xl font-bold ${statusConfig.color}`}>
            {statusConfig.label}
          </div>
          <div className="text-[12px] text-slate-500 mt-1">
            {health.scheduleVariance >= 0 ? (
              <span className="text-emerald-600">↑ {health.scheduleVariance}% ahead of schedule</span>
            ) : (
              <span className="text-red-600">↓ {Math.abs(health.scheduleVariance)}% behind schedule</span>
            )}
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Completion</span>
            <span className="text-lg font-bold text-indigo-600">{health.overallProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-700 ease-out"
              style={{ width: `${health.overallProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-slate-500">
            <span>{health.completedTasks} of {health.totalTasks} tasks</span>
            <span>{health.daysRemaining} days left</span>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Schedule</span>
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Est. Completion</span>
              <span className="font-semibold text-slate-700">
                {health.estimatedCompletion ? new Date(health.estimatedCompletion + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
              </span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Days Behind</span>
              <span className={`font-semibold ${health.daysBehind > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {health.daysBehind > 0 ? `${health.daysBehind} days` : 'On time'}
              </span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Delayed Tasks</span>
              <span className={`font-semibold ${health.delayedTasks > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {health.delayedTasks}
              </span>
            </div>
          </div>
        </div>

        {/* Budget */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Budget</span>
            <span className="text-[12px] font-bold text-slate-600">{budgetPct}% spent</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                budgetPct > 90 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                budgetPct > 70 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                'bg-gradient-to-r from-emerald-400 to-emerald-500'
              }`}
              style={{ width: `${Math.min(100, budgetPct)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-slate-500">
            <span>${(health.spentBudget / 1000).toFixed(0)}K spent</span>
            <span>${(health.totalBudget / 1000).toFixed(0)}K total</span>
          </div>
        </div>
      </div>

      {/* Milestones row */}
      {health.upcomingMilestones.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" />
            </svg>
            <span className="text-[12px] font-semibold text-slate-700">Upcoming Milestones</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {health.upcomingMilestones.map((m: ProjectMilestone) => {
              const targetDate = new Date(m.target_date + 'T00:00:00');
              const daysUntil = Math.ceil((targetDate.getTime() - Date.now()) / 86400000);
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/60"
                >
                  <span className="text-amber-500 text-sm">◆</span>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-700">{m.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' • '}
                      <span className={daysUntil <= 7 ? 'text-amber-600 font-medium' : ''}>
                        {daysUntil} days
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
