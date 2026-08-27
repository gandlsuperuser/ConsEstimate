'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AuditActivity } from '@/types';

export default function ActivityPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [activities, setActivities] = useState<AuditActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch(`/api/activity?projectId=${projectId}`);
        const data = await res.json();
        setActivities(data.activities || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [projectId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-procore-text tracking-tight">Project Activity & Complete Audit Trail</h1>
          <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
            Phase 25: Transparency & Audit
          </span>
        </div>
        <p className="text-xs text-procore-text-muted mt-0.5">
          Immutable chronological record of decisions, approvals, commitments, disbursements, and field actions per ConsJ.rule section 25.
        </p>
      </div>

      {/* Activity Timeline Ledger */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs p-5">
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
          {activities.map((act) => {
            const actionColors: Record<string, string> = {
              execute: 'bg-emerald-500 ring-emerald-100',
              approve: 'bg-blue-500 ring-blue-100',
              disburse: 'bg-teal-500 ring-teal-100',
              update: 'bg-procore-orange ring-amber-100',
              create: 'bg-indigo-500 ring-indigo-100',
            };
            const dotColor = actionColors[act.action_type] || 'bg-gray-400 ring-gray-100';

            return (
              <div key={act.id} className="relative group">
                {/* Timeline Dot */}
                <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ${dotColor} ring-4 ring-offset-1`} />

                <div className="bg-gray-50/70 p-3.5 rounded-lg border border-procore-border-light hover:border-procore-orange/40 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-procore-text">{act.actor_name}</span>
                      <span className="text-[10px] font-bold uppercase bg-white border border-procore-border text-procore-text-secondary px-2 py-0.5 rounded">
                        {act.module}
                      </span>
                    </div>
                    <span className="text-[11px] text-procore-text-muted">
                      {new Date(act.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-procore-text font-medium mt-1">{act.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
