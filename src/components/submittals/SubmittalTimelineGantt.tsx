'use client';

import React from 'react';
import { Submittal } from '@/types';
import { parseDate } from '@/lib/submittal-schedule-engine';

interface SubmittalTimelineGanttProps {
  submittals: Submittal[];
  onOpenDetail: (s: Submittal) => void;
}

export default function SubmittalTimelineGantt({
  submittals,
  onOpenDetail,
}: SubmittalTimelineGanttProps) {
  const linkedItems = submittals.filter(s => s.required_on_site_date && s.submit_by_date);

  if (linkedItems.length === 0) {
    return (
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-12 text-center text-[#a1a1aa] space-y-2">
        <span className="text-3xl">📅</span>
        <p className="text-sm font-bold text-[#f4f4f5]">No Schedule-Driven Submittals to Display</p>
        <p className="text-xs">Link submittals to schedule activities to visualize their procurement and approval timeline windows.</p>
      </div>
    );
  }

  // Find date boundaries for the gantt range
  const dates: number[] = [];
  const todayStr = new Date().toISOString().slice(0, 10);
  dates.push(parseDate(todayStr).getTime());

  linkedItems.forEach(s => {
    if (s.submit_by_date) dates.push(parseDate(s.submit_by_date).getTime());
    if (s.planned_approval_date) dates.push(parseDate(s.planned_approval_date).getTime());
    if (s.required_on_site_date) dates.push(parseDate(s.required_on_site_date).getTime());
  });

  const minDate = Math.min(...dates) - (7 * 24 * 60 * 60 * 1000); // 1 week buffer before
  const maxDate = Math.max(...dates) + (14 * 24 * 60 * 60 * 1000); // 2 weeks buffer after
  const totalDuration = maxDate - minDate;

  const getPercent = (dateStr: string) => {
    const time = parseDate(dateStr).getTime();
    const pct = ((time - minDate) / totalDuration) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  const todayPercent = getPercent(todayStr);

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6 text-[#f4f4f5]">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-[#27272a] pb-4">
        <div>
          <h3 className="text-base font-extrabold text-[#f4f4f5] flex items-center gap-2">
            <span>📊</span> Submittal Procurement & Schedule Pipeline (Gantt View)
          </h3>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Chronological visualization from Submit-By deadline through A/E Review, Fabrication Lead Time, to On-Site Delivery.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#f4f4f5]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded bg-blue-600"></span>
            <span className="font-semibold">A/E Review</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded bg-amber-600"></span>
            <span className="font-semibold">Lead Time Window</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="font-semibold">Required On-Site</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-0.5 h-3 bg-red-400"></span>
            <span className="font-semibold">Today</span>
          </div>
        </div>
      </div>

      {/* Timeline Chart Container */}
      <div className="space-y-4 pt-2">
        {linkedItems.map(s => {
          const submitPct = getPercent(s.submit_by_date!);
          const approvalPct = getPercent(s.planned_approval_date || s.submit_by_date!);
          const onSitePct = getPercent(s.required_on_site_date!);

          const reviewWidth = Math.max(1, approvalPct - submitPct);
          const leadWidth = Math.max(1, onSitePct - approvalPct);

          const isRed = s.schedule_risk_status === 'red';
          const isYellow = s.schedule_risk_status === 'yellow';

          return (
            <div
              key={s.id}
              onClick={() => onOpenDetail(s)}
              className="p-4 bg-[#09090b] hover:bg-[#18181b] border border-[#27272a] rounded-xl transition-all cursor-pointer space-y-2.5 group shadow-lg"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#f4f4f5] bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded">
                    {s.submittal_number}
                  </span>
                  <span className="font-bold text-[#f4f4f5] group-hover:text-white">{s.title}</span>
                  <span className="text-[#a1a1aa] text-[11px]">({s.spec_division})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#a1a1aa]">
                    Lead: <strong className="text-[#f4f4f5]">{s.lead_time_weeks} wks</strong>
                  </span>
                  <span className="text-[11px] text-[#a1a1aa]">
                    Required: <strong className="text-emerald-400 font-mono">{s.required_on_site_date}</strong>
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                    isRed ? 'bg-red-950 text-red-200 border border-red-700' :
                    isYellow ? 'bg-amber-950 text-amber-200 border border-amber-700' :
                    'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  }`}>
                    {s.schedule_risk_status}
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="relative h-6 bg-[#121215] rounded-lg overflow-hidden border border-[#27272a] flex items-center">
                {/* Today Marker Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-20"
                  style={{ left: `${todayPercent}%` }}
                  title={`Today: ${todayStr}`}
                />

                {/* Review Period Bar */}
                <div
                  className="absolute top-1 bottom-1 bg-blue-600 rounded-l text-[10px] text-white flex items-center justify-center font-bold overflow-hidden px-1"
                  style={{ left: `${submitPct}%`, width: `${reviewWidth}%` }}
                  title={`A/E Review: ${s.submit_by_date} to ${s.planned_approval_date}`}
                >
                  {reviewWidth > 8 && 'Review'}
                </div>

                {/* Lead Time Window Bar */}
                <div
                  className="absolute top-1 bottom-1 bg-amber-600 rounded-r text-[10px] text-white flex items-center justify-center font-bold overflow-hidden px-1 border-l border-[#09090b]"
                  style={{ left: `${approvalPct}%`, width: `${leadWidth}%` }}
                  title={`Fabrication & Shipping Lead Time: ${s.lead_time_weeks} weeks`}
                >
                  {leadWidth > 12 && `${s.lead_time_weeks}w Lead Time`}
                </div>

                {/* Required On-Site Milestone Dot */}
                <div
                  className="absolute top-1 bottom-1 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-500/50 z-10 -ml-1.5 my-auto"
                  style={{ left: `${onSitePct}%` }}
                  title={`Required On-Site: ${s.required_on_site_date}`}
                />
              </div>

              {/* Sub-label for Controlling Activity */}
              <div className="flex items-center justify-between text-[11px] text-[#a1a1aa] pt-0.5">
                <span>
                  Submit by: <strong className="text-[#f4f4f5] font-mono">{s.submit_by_date}</strong> ➔ Approval target: <strong className="text-[#f4f4f5] font-mono">{s.planned_approval_date}</strong>
                </span>
                {s.controlling_activity_name && (
                  <span>
                    Controlling: <strong className="text-[#f4f4f5]">{s.controlling_activity_name}</strong>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
