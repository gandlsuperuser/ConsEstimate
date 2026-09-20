'use client';

import React from 'react';
import { Submittal } from '@/types';

interface SubmittalRiskViewProps {
  submittals: Submittal[];
  onOpenDetail: (submittal: Submittal) => void;
  onLinkActivity: (submittal: Submittal) => void;
}

export default function SubmittalRiskView({
  submittals,
  onOpenDetail,
  onLinkActivity,
}: SubmittalRiskViewProps) {
  // Categorize submittals into risk buckets
  const overdueSubmissions = submittals.filter(
    s => s.schedule_risk_status === 'red' && s.risk_reasons?.some(r => r.includes('overdue') || r.includes('Overdue'))
  );

  const approachingSubmitBy = submittals.filter(
    s => s.schedule_risk_status === 'yellow' && s.risk_reasons?.some(r => r.includes('approaching') || r.includes('Submit-by'))
  );

  const reviewDelayed = submittals.filter(
    s => (s.schedule_risk_status === 'red' || s.schedule_risk_status === 'yellow') &&
         s.risk_reasons?.some(r => r.includes('Review delayed') || r.includes('Awaiting review'))
  );

  const negativeFloat = submittals.filter(
    s => s.float_days !== null && s.float_days !== undefined && s.float_days < 0
  );

  const unlinkedItems = submittals.filter(
    s => !s.linked_activity_ids || s.linked_activity_ids.length === 0
  );

  const atRiskActivitiesMap = new Map<string, { activityName: string; submittals: Submittal[]; maxShortfall: number; requiredDate: string }>();

  submittals.forEach(s => {
    (s.linked_activities || []).forEach(act => {
      if (act.float_days < 0 || act.impact_status === 'at_risk' || act.impact_status === 'critical') {
        const existing = atRiskActivitiesMap.get(act.activity_id);
        const shortfall = Math.abs(act.float_days);
        if (existing) {
          existing.submittals.push(s);
          if (shortfall > existing.maxShortfall) {
            existing.maxShortfall = shortfall;
          }
        } else {
          atRiskActivitiesMap.set(act.activity_id, {
            activityName: act.activity_name,
            submittals: [s],
            maxShortfall: shortfall,
            requiredDate: act.required_on_site_date,
          });
        }
      }
    });
  });

  const atRiskActivities = Array.from(atRiskActivitiesMap.entries()).map(([id, info]) => ({
    id,
    ...info,
  }));

  return (
    <div className="space-y-8 bg-[#09090b] text-[#f4f4f5]">
      {/* Overview Alert / Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#121215] border border-red-900/60 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Overdue / Delayed</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#f4f4f5]">{overdueSubmissions.length + reviewDelayed.length}</span>
            <span className="text-xs text-red-400 font-semibold">critical bottlenecks</span>
          </div>
          <p className="mt-1 text-[11px] text-[#a1a1aa]">Past submit-by or approval deadlines</p>
        </div>

        <div className="bg-[#121215] border border-amber-900/60 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">Approaching Deadlines</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#f4f4f5]">{approachingSubmitBy.length}</span>
            <span className="text-xs text-amber-300 font-semibold">due in 7-14 days</span>
          </div>
          <p className="mt-1 text-[11px] text-[#a1a1aa]">Urgent packages needed</p>
        </div>

        <div className="bg-[#121215] border border-rose-900/60 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-rose-400 text-xs font-bold uppercase tracking-wider">Lead Time Deficits</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#f4f4f5]">{negativeFloat.length}</span>
            <span className="text-xs text-rose-400 font-semibold">negative float</span>
          </div>
          <p className="mt-1 text-[11px] text-[#a1a1aa]">Fabrication window exceeds schedule</p>
        </div>

        <div className="bg-[#121215] border border-purple-900/60 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-purple-300 text-xs font-bold uppercase tracking-wider">At-Risk Activities</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#f4f4f5]">{atRiskActivities.length}</span>
            <span className="text-xs text-purple-300 font-semibold">tasks impacted</span>
          </div>
          <p className="mt-1 text-[11px] text-[#a1a1aa]">Start dates threatened</p>
        </div>
      </div>

      {/* Section 1: At-Risk Schedule Activities Matrix */}
      {atRiskActivities.length > 0 && (
        <div className="bg-[#121215] border border-red-900/70 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-[#09090b] border-b border-red-900/50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#f4f4f5] flex items-center gap-2">
                <span>⚠️</span> Schedule Activities at Risk of Delay
              </h3>
              <p className="text-xs text-[#a1a1aa] mt-0.5">
                The following timeline activities have linked submittals with negative float or unapproved packages that will push site start dates.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-950 text-red-200 border border-red-700">
              {atRiskActivities.length} Impacted Tasks
            </span>
          </div>

          <div className="divide-y divide-[#27272a]">
            {atRiskActivities.map(act => (
              <div key={act.id} className="p-4 hover:bg-[#18181b] transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-[#f4f4f5]">{act.activityName}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-950 border border-red-700 text-red-200">
                      -{act.maxShortfall} Days Behind
                    </span>
                    <span className="text-xs text-[#d4d4d8]">
                      Required On-Site: <strong className="text-[#f4f4f5] font-mono">{act.requiredDate}</strong>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#a1a1aa]">
                    <span className="font-semibold text-[#f4f4f5]">Blocking submittals:</span>
                    {act.submittals.map(s => (
                      <button
                        key={s.id}
                        onClick={() => onOpenDetail(s)}
                        className="px-2.5 py-0.5 rounded bg-[#09090b] hover:bg-[#27272a] text-[#f4f4f5] border border-[#27272a] transition-colors inline-flex items-center gap-1 font-mono font-bold"
                      >
                        <span>{s.submittal_number}</span>
                        <span className="text-[#a1a1aa] font-normal">({s.title.slice(0, 25)}...)</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <span className="text-xs text-amber-200 bg-amber-950/70 border border-amber-800 px-3 py-1 rounded-lg font-bold">
                    Action: Expedite review or resequence task
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Detailed Submittal Risk Cards */}
      <div className="space-y-6">
        {/* Overdue Submissions */}
        {overdueSubmissions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Submittals Overdue for Submission ({overdueSubmissions.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overdueSubmissions.map(s => (
                <SubmittalRiskCard key={s.id} submittal={s} onOpenDetail={onOpenDetail} />
              ))}
            </div>
          </div>
        )}

        {/* Review Delayed Beyond Planned Approval */}
        {reviewDelayed.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Awaiting Review Beyond Planned Approval Date ({reviewDelayed.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewDelayed.map(s => (
                <SubmittalRiskCard key={s.id} submittal={s} onOpenDetail={onOpenDetail} />
              ))}
            </div>
          </div>
        )}

        {/* Approaching Submit-By Deadlines */}
        {approachingSubmitBy.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Approaching Submit-By Deadlines ({approachingSubmitBy.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approachingSubmitBy.map(s => (
                <SubmittalRiskCard key={s.id} submittal={s} onOpenDetail={onOpenDetail} />
              ))}
            </div>
          </div>
        )}

        {/* Unlinked Items */}
        {unlinkedItems.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#a1a1aa] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#71717a]"></span>
              Unlinked Submittals ({unlinkedItems.length})
            </h4>
            <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-4 shadow-xl">
              <div className="divide-y divide-[#27272a]">
                {unlinkedItems.map(s => (
                  <div key={s.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#f4f4f5]">{s.submittal_number}</span>
                        <span className="text-sm font-bold text-[#f4f4f5]">{s.title}</span>
                      </div>
                      <p className="text-xs text-[#a1a1aa] font-medium">{s.spec_division} • {s.subcontractor_name || 'No Subcontractor'}</p>
                    </div>
                    <button
                      onClick={() => onLinkActivity(s)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#f4f4f5] text-[#09090b] hover:bg-white transition-colors"
                    >
                      + Link to Schedule
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubmittalRiskCard({
  submittal,
  onOpenDetail,
}: {
  submittal: Submittal;
  onOpenDetail: (s: Submittal) => void;
}) {
  const isRed = submittal.schedule_risk_status === 'red';

  const borderColor = isRed
    ? 'border-red-900/80 hover:border-red-600'
    : 'border-amber-900/80 hover:border-amber-600';

  const bgColor = isRed ? 'bg-red-950/20' : 'bg-amber-950/20';

  return (
    <div
      onClick={() => onOpenDetail(submittal)}
      className={`bg-[#121215] ${bgColor} ${borderColor} border rounded-2xl p-5 transition-all duration-150 cursor-pointer hover:shadow-2xl space-y-3.5 text-[#f4f4f5]`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#f4f4f5] bg-[#09090b] px-2 py-0.5 rounded border border-[#27272a]">
              {submittal.submittal_number}
            </span>
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                isRed
                  ? 'bg-red-950 text-red-200 border border-red-700'
                  : 'bg-amber-950 text-amber-200 border border-amber-700'
              }`}
            >
              {isRed ? 'Critical Schedule Risk' : 'Attention Needed'}
            </span>
          </div>
          <h5 className="text-sm font-extrabold text-[#f4f4f5] mt-1.5">{submittal.title}</h5>
          <p className="text-xs text-[#a1a1aa] font-medium">{submittal.spec_division}</p>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-[#a1a1aa] block">Status</span>
          <span className="text-xs font-bold text-[#f4f4f5] capitalize">{submittal.status.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Key Dates Timeline Bar */}
      <div className="grid grid-cols-3 gap-2 bg-[#09090b] p-3 rounded-xl border border-[#27272a] text-center">
        <div>
          <span className="text-[10px] text-[#a1a1aa] uppercase block font-bold">Submit By</span>
          <span className={`text-xs font-bold font-mono ${isRed && !submittal.submitted_date ? 'text-red-400' : 'text-[#f4f4f5]'}`}>
            {submittal.submit_by_date || 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-[#a1a1aa] uppercase block font-bold">Planned Approval</span>
          <span className="text-xs font-bold text-[#f4f4f5] font-mono">{submittal.planned_approval_date || 'N/A'}</span>
        </div>
        <div>
          <span className="text-[10px] text-[#a1a1aa] uppercase block font-bold">Required On-Site</span>
          <span className="text-xs font-bold text-emerald-400 font-mono">{submittal.required_on_site_date || 'N/A'}</span>
        </div>
      </div>

      {/* Controlling Activity & Reasons */}
      <div className="space-y-2 pt-1">
        {submittal.controlling_activity_name && (
          <div className="flex items-center gap-1.5 text-xs text-[#f4f4f5]">
            <span className="text-[#a1a1aa] font-semibold">🎯 Controlling Activity:</span>
            <strong className="text-[#f4f4f5] font-bold truncate">{submittal.controlling_activity_name}</strong>
          </div>
        )}

        {submittal.risk_reasons && submittal.risk_reasons.length > 0 && (
          <div className="text-xs text-red-200 bg-red-950/50 border border-red-900/60 rounded-xl p-2.5 flex items-start gap-1.5 font-medium">
            <span className="text-red-400 mt-0.5">⚠️</span>
            <span>{submittal.risk_reasons[0]}</span>
          </div>
        )}

        {submittal.recommended_actions && submittal.recommended_actions.length > 0 && (
          <div className="text-xs text-amber-200 bg-amber-950/50 border border-amber-900/60 rounded-xl p-2.5 flex items-start gap-1.5 font-medium">
            <span className="text-amber-400 mt-0.5">💡</span>
            <span>Action: {submittal.recommended_actions[0]}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs pt-2 border-t border-[#27272a]">
        <span className="text-[#d4d4d8] font-medium">
          Lead Time: <strong className="text-[#f4f4f5]">{submittal.lead_time_weeks ?? 3} weeks</strong>
        </span>
        <span className="text-[#f4f4f5] hover:text-[#d4d4d8] font-bold underline flex items-center gap-1">
          Open Details & Manage Links ➔
        </span>
      </div>
    </div>
  );
}
