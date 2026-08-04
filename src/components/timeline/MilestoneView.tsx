'use client';

import { useMemo } from 'react';
import { ProjectMilestone, ProjectTask, ProjectPhase } from '@/types/timeline';

interface MilestoneViewProps {
  milestones: ProjectMilestone[];
  tasks: ProjectTask[];
  phases: ProjectPhase[];
}

export default function MilestoneView({ milestones, tasks, phases }: MilestoneViewProps) {
  const today = new Date().toISOString().split('T')[0];

  // Combine milestones from table + milestone tasks
  const allMilestones = useMemo(() => {
    const combined: Array<{
      id: string;
      name: string;
      date: string;
      status: string;
      phaseName?: string;
      phaseColor?: string;
      isKey: boolean;
    }> = [];

    // From project_milestones table
    for (const m of milestones) {
      combined.push({
        id: m.id,
        name: m.name,
        date: m.target_date,
        status: m.status,
        isKey: m.is_key_milestone || false,
      });
    }

    // From tasks marked as milestones
    for (const t of tasks) {
      if (t.is_milestone) {
        const phase = phases.find((p) => p.id === t.phase_id);
        combined.push({
          id: t.id,
          name: t.name,
          date: t.end_date,
          status: t.status === 'completed' ? 'completed' : t.end_date < today ? 'missed' : 'pending',
          phaseName: phase?.name,
          phaseColor: phase?.color,
          isKey: false,
        });
      }
    }

    // Sort by date
    combined.sort((a, b) => a.date.localeCompare(b.date));
    return combined;
  }, [milestones, tasks, phases, today]);

  const statusConfig: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    completed: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', icon: '✅' },
    pending: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', icon: '⏳' },
    missed: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: '❌' },
    in_progress: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: '🔨' },
  };

  if (allMilestones.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4 text-2xl">
          ◆
        </div>
        <h3 className="text-base font-bold text-slate-700 mb-1">No Milestones Yet</h3>
        <p className="text-sm text-slate-500">Mark tasks as milestones or add them from the milestone API.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">◆</span>
          <h3 className="text-sm font-bold text-slate-700">Project Milestones</h3>
          <span className="ml-auto text-[11px] font-semibold text-slate-500">
            {allMilestones.filter((m) => m.status === 'completed').length}/{allMilestones.length} complete
          </span>
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="p-6">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-slate-200" />

          {allMilestones.map((m, i) => {
            const cfg = statusConfig[m.status] || statusConfig.pending;
            const dateObj = new Date(m.date + 'T00:00:00');
            const daysFromNow = Math.ceil((dateObj.getTime() - Date.now()) / 86400000);
            const isPast = m.date < today;

            return (
              <div key={m.id} className="relative flex items-start mb-6 last:mb-0">
                {/* Diamond marker */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${cfg.bg} ${cfg.border}`}
                  >
                    <span className="text-lg">{cfg.icon}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="ml-4 flex-1 pb-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`text-[13px] font-bold ${cfg.text}`}>
                        {m.name}
                        {m.isKey && (
                          <span className="ml-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">
                            Key Milestone
                          </span>
                        )}
                      </h4>
                      {m.phaseName && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: m.phaseColor || '#6366f1' }}
                          />
                          <span className="text-[10px] text-slate-400 font-medium">{m.phaseName}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-slate-600">
                        {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className={`text-[10px] font-medium ${
                        m.status === 'completed' ? 'text-emerald-500' :
                        isPast ? 'text-red-500' :
                        daysFromNow <= 7 ? 'text-amber-600' :
                        'text-slate-400'
                      }`}>
                        {m.status === 'completed'
                          ? 'Achieved'
                          : isPast
                          ? `${Math.abs(daysFromNow)} days overdue`
                          : daysFromNow === 0
                          ? 'Today!'
                          : `${daysFromNow} days away`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
