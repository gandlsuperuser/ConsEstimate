'use client';

import { useState, useMemo } from 'react';
import { ProjectTask, ProjectPhase, TASK_STATUS_COLORS } from '@/types/timeline';

interface CalendarViewProps {
  tasks: ProjectTask[];
  phases: ProjectPhase[];
  onTaskClick: (task: ProjectTask) => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ tasks, phases, onTaskClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const phaseMap = useMemo(() => {
    const m = new Map<string, ProjectPhase>();
    phases.forEach((p) => m.set(p.id, p));
    return m;
  }, [phases]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days: Array<{ date: Date | null; tasks: ProjectTask[] }> = [];

    // Pad beginning
    for (let i = 0; i < startPad; i++) {
      days.push({ date: null, tasks: [] });
    }

    // Fill days
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const dateStr = date.toISOString().split('T')[0];

      const dayTasks = tasks.filter((t) => {
        const start = t.start_date;
        const end = t.end_date;
        return dateStr >= start && dateStr <= end;
      });

      days.push({ date, tasks: dayTasks });
    }

    // Pad end to fill grid
    while (days.length % 7 !== 0) {
      days.push({ date: null, tasks: [] });
    }

    return days;
  }, [currentMonth, currentYear, tasks]);

  const today = new Date().toISOString().split('T')[0];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all border border-transparent hover:border-slate-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-base font-bold text-slate-800 min-w-[180px] text-center">
            {MONTHS[currentMonth]} {currentYear}
          </h3>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all border border-transparent hover:border-slate-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          if (!day.date) {
            return (
              <div key={`pad-${i}`} className="min-h-[100px] bg-slate-50/40 border-b border-r border-slate-100" />
            );
          }

          const dateStr = day.date.toISOString().split('T')[0];
          const isToday = dateStr === today;
          const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

          return (
            <div
              key={dateStr}
              className={`min-h-[100px] border-b border-r border-slate-100 p-1.5 transition-colors ${
                isToday ? 'bg-indigo-50/50' : isWeekend ? 'bg-slate-50/30' : 'bg-white'
              } hover:bg-slate-50`}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-indigo-600 text-white'
                      : isWeekend
                      ? 'text-slate-400'
                      : 'text-slate-600'
                  }`}
                >
                  {day.date.getDate()}
                </span>
                {day.tasks.length > 3 && (
                  <span className="text-[9px] font-medium text-slate-400">
                    +{day.tasks.length - 3} more
                  </span>
                )}
              </div>

              {/* Task pills */}
              <div className="space-y-0.5">
                {day.tasks.slice(0, 3).map((task) => {
                  const phase = task.phase_id ? phaseMap.get(task.phase_id) : null;
                  const color = task.color || phase?.color || '#6366f1';
                  return (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-all hover:ring-1 hover:ring-indigo-300"
                      style={{
                        backgroundColor: color + '18',
                        color: color,
                        borderLeft: `2px solid ${color}`,
                      }}
                    >
                      {task.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
