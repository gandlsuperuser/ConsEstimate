'use client';

import React, { useState, useEffect } from 'react';
import { Submittal, SubmittalStatus, SubmittalRevision, SubmittalComment } from '@/types';
import { ScheduleActivityRef } from '@/lib/submittal-schedule-engine';

interface SubmittalDetailModalProps {
  submittal: Submittal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Submittal) => void;
  availableActivities: ScheduleActivityRef[];
}

export default function SubmittalDetailModal({
  submittal,
  isOpen,
  onClose,
  onSave,
  availableActivities,
}: SubmittalDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'revisions' | 'info' | 'comments' | 'attachments' | 'audit'>('schedule');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Editable fields
  const [status, setStatus] = useState<SubmittalStatus>('pending');
  const [leadTimeWeeks, setLeadTimeWeeks] = useState(3);
  const [reviewDurationDays, setReviewDurationDays] = useState(14);
  const [linkedActivityIds, setLinkedActivityIds] = useState<string[]>([]);
  const [activitySearch, setActivitySearch] = useState('');

  // Revision form state
  const [isAddingRevision, setIsAddingRevision] = useState(false);
  const [newRevTitle, setNewRevTitle] = useState('');
  const [newRevRemarks, setNewRevRemarks] = useState('');
  const [newRevStatus, setNewRevStatus] = useState<SubmittalStatus>('pending');

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('Admin (BTX)');

  useEffect(() => {
    if (submittal) {
      setStatus(submittal.status);
      setLeadTimeWeeks(submittal.lead_time_weeks ?? 3);
      setReviewDurationDays(submittal.review_duration_days ?? 14);
      setLinkedActivityIds(submittal.linked_activity_ids || []);
      setError('');
      setSuccessNotice('');
      setIsAddingRevision(false);
    }
  }, [submittal]);

  if (!isOpen || !submittal) return null;

  const handleStatusChange = async (newStatus: SubmittalStatus) => {
    setStatus(newStatus);
    await handleUpdatePatch({ status: newStatus });
  };

  const handleToggleActivity = async (activityId: string) => {
    let nextIds: string[];
    if (linkedActivityIds.includes(activityId)) {
      nextIds = linkedActivityIds.filter(id => id !== activityId);
    } else {
      nextIds = [...linkedActivityIds, activityId];
    }
    setLinkedActivityIds(nextIds);
    await handleUpdatePatch({ linked_activity_ids: nextIds });
  };

  const handleUpdatePatch = async (updates: Record<string, any>) => {
    setSaving(true);
    setError('');
    setSuccessNotice('');
    try {
      const res = await fetch(`/api/submittals/${submittal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: submittal.project_id,
          ...updates,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update submittal.');
      onSave(data.submittal);
      setSuccessNotice('Saved & recalculated schedule.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRevTitle.trim()) return;

    const nextRevNum = (submittal.revisions?.length || 0);
    const newRev: SubmittalRevision = {
      id: `rev-${nextRevNum}-${Date.now()}`,
      revision_number: nextRevNum,
      title: newRevTitle.trim(),
      submitted_date: new Date().toISOString().slice(0, 10),
      status: newRevStatus,
      reviewer_name: submittal.approver_name || 'Architect/Engineer',
      review_remarks: newRevRemarks.trim() || undefined,
    };

    await handleUpdatePatch({
      new_revision: newRev,
      status: newRevStatus,
    });
    setNewRevTitle('');
    setNewRevRemarks('');
    setIsAddingRevision(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: SubmittalComment = {
      id: `comment-${Date.now()}`,
      author_name: commentAuthor,
      author_role: 'General Contractor',
      comment: commentText.trim(),
      created_at: new Date().toISOString(),
    };

    await handleUpdatePatch({ new_comment: newComment });
    setCommentText('');
  };

  const filteredAvailableActivities = availableActivities.filter(a =>
    a.name.toLowerCase().includes(activitySearch.toLowerCase()) ||
    (a.phase_name && a.phase_name.toLowerCase().includes(activitySearch.toLowerCase()))
  );

  const getRiskBadge = (risk?: string) => {
    switch (risk) {
      case 'red':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-950 text-red-200 border border-red-700">Red: Overdue / Schedule Impact</span>;
      case 'yellow':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-200 border border-amber-700">Yellow: Attention Needed</span>;
      case 'green':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-200 border border-emerald-700">Green: On Track</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-900 text-white border border-neutral-700">Gray: Unlinked</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto text-[#f4f4f5]">
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-6 bg-[#09090b] border-b border-[#27272a] flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <span className="font-mono text-sm font-bold text-[#f4f4f5] bg-[#18181b] border border-[#27272a] px-2.5 py-0.5 rounded">
                {submittal.submittal_number}
              </span>
              <span className="text-xs text-zinc-300 font-medium">{submittal.spec_division}</span>
              {getRiskBadge(submittal.schedule_risk_status)}
              {saving && <span className="text-xs text-[#f4f4f5] animate-pulse">Calculating & Saving...</span>}
            </div>
            <h2 className="text-xl font-black text-[#f4f4f5] tracking-tight">{submittal.title}</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Subcontractor: <strong className="text-[#f4f4f5]">{submittal.subcontractor_name || 'Unassigned'}</strong> • Approver: <strong className="text-[#f4f4f5]">{submittal.approver_name || 'Architect/Engineer'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <label className="text-[10px] text-zinc-400 uppercase block font-bold mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as SubmittalStatus)}
                className="bg-[#09090b] text-[#f4f4f5] text-xs font-bold rounded-lg px-3 py-1.5 border border-[#27272a] focus:border-[#f4f4f5] focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="approved_as_noted">Approved as Noted</option>
                <option value="revise_resubmit">Revise & Resubmit</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#f4f4f5] hover:bg-[#18181b] transition-colors font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Notices */}
        {error && (
          <div className="bg-red-950 border-b border-red-700 text-red-200 text-xs px-6 py-2 flex items-center justify-between font-semibold">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-[#f4f4f5] font-bold">✕</button>
          </div>
        )}
        {successNotice && (
          <div className="bg-emerald-950 border-b border-emerald-700 text-emerald-200 text-xs px-6 py-2 flex items-center justify-between font-semibold">
            <span>{successNotice}</span>
            <button onClick={() => setSuccessNotice('')} className="text-[#f4f4f5] font-bold">✕</button>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 px-6 border-b border-[#27272a] bg-[#09090b] text-xs font-bold">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'schedule'
                ? 'border-[#f4f4f5] text-[#f4f4f5] font-black'
                : 'border-transparent text-zinc-400 hover:text-[#f4f4f5]'
            }`}
          >
            <span>📅</span> Schedule Integration & Dates
          </button>
          <button
            onClick={() => setActiveTab('revisions')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'revisions'
                ? 'border-[#f4f4f5] text-[#f4f4f5] font-black'
                : 'border-transparent text-zinc-400 hover:text-[#f4f4f5]'
            }`}
          >
            <span>🔄</span> Revision History ({submittal.revisions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-[#f4f4f5] text-[#f4f4f5] font-black'
                : 'border-transparent text-zinc-400 hover:text-[#f4f4f5]'
            }`}
          >
            <span>📋</span> Submittal Details
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'comments'
                ? 'border-[#f4f4f5] text-[#f4f4f5] font-black'
                : 'border-transparent text-zinc-400 hover:text-[#f4f4f5]'
            }`}
          >
            <span>💬</span> Comments ({submittal.comments?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'attachments'
                ? 'border-[#f4f4f5] text-[#f4f4f5] font-black'
                : 'border-transparent text-zinc-400 hover:text-[#f4f4f5]'
            }`}
          >
            <span>📎</span> Attachments ({submittal.attachments?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-[#f4f4f5] text-[#f4f4f5] font-black'
                : 'border-transparent text-zinc-400 hover:text-[#f4f4f5]'
            }`}
          >
            <span>📜</span> Audit Trail ({submittal.audit_trail?.length || 0})
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#121215]">
          {/* TAB 1: SCHEDULE INTEGRATION */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {/* Backward Date Calculation Pipeline Banner */}
              <div className="bg-[#09090b] border border-[#27272a] rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#f4f4f5] flex items-center gap-2">
                    <span>⚡</span> Backward Schedule Calculation Pipeline
                  </h4>
                  <span className="text-xs text-zinc-400">
                    Controlling Milestone: <strong className="text-[#f4f4f5]">{submittal.controlling_activity_name || 'Manual / None'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                  {/* Step 1 */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">1. Submit-By Date</span>
                    <span className="text-base font-black text-[#f4f4f5] font-mono block">
                      {submittal.submit_by_date || 'N/A'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-1">
                      Approval date - {reviewDurationDays}d review
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">2. Planned Approval</span>
                    <span className="text-base font-black text-[#f4f4f5] font-mono block">
                      {submittal.planned_approval_date || 'N/A'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-1">
                      On-site date - {leadTimeWeeks * 7}d lead time
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">3. Lead Time Window</span>
                    <span className="text-base font-black text-amber-300 font-mono block">
                      {leadTimeWeeks} Weeks
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-1">
                      Fabrication & transport ({leadTimeWeeks * 7} days)
                    </span>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">4. Required On-Site</span>
                    <span className="text-base font-black text-emerald-400 font-mono block">
                      {submittal.required_on_site_date || 'N/A'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-1">
                      Earliest controlling activity start
                    </span>
                  </div>
                </div>

                {/* Float & Risk Summary Callout */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-[#27272a]">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 font-medium">Total Float:</span>
                    <strong className={`font-mono font-black ${
                      (submittal.float_days ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {submittal.float_days !== null && submittal.float_days !== undefined
                        ? `${submittal.float_days} Days ${submittal.float_days < 0 ? '(Negative Float)' : 'Slack'}`
                        : 'N/A'}
                    </strong>
                  </div>
                  {submittal.risk_reasons && submittal.risk_reasons.length > 0 && (
                    <div className="text-[#f4f4f5] font-medium">
                      {submittal.risk_reasons[0]}
                    </div>
                  )}
                </div>
              </div>

              {/* Parameter Adjusters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#09090b] p-4 rounded-xl border border-[#27272a]">
                <div>
                  <label className="text-xs font-bold text-[#f4f4f5] block mb-1.5">
                    Procurement & Fabrication Lead Time (Weeks)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={52}
                      value={leadTimeWeeks}
                      onChange={(e) => setLeadTimeWeeks(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-[#18181b] text-[#f4f4f5] text-sm font-bold rounded-lg px-3 py-2 border border-[#27272a] w-24 focus:border-[#f4f4f5]"
                    />
                    <button
                      onClick={() => handleUpdatePatch({ lead_time_weeks: leadTimeWeeks })}
                      disabled={saving}
                      className="px-3 py-2 rounded-lg text-xs font-bold bg-[#f4f4f5] text-[#09090b] hover:bg-zinc-200 transition-colors"
                    >
                      Update Lead Time
                    </button>
                    <span className="text-xs text-zinc-400 font-medium">
                      = {leadTimeWeeks * 7} calendar days
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#f4f4f5] block mb-1.5">
                    A/E Review Period (Days)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={reviewDurationDays}
                      onChange={(e) => setReviewDurationDays(Math.max(1, parseInt(e.target.value) || 14))}
                      className="bg-[#18181b] text-[#f4f4f5] text-sm font-bold rounded-lg px-3 py-2 border border-[#27272a] w-24 focus:border-[#f4f4f5]"
                    />
                    <button
                      onClick={() => handleUpdatePatch({ review_duration_days: reviewDurationDays })}
                      disabled={saving}
                      className="px-3 py-2 rounded-lg text-xs font-bold bg-[#f4f4f5] text-[#09090b] hover:bg-zinc-200 transition-colors"
                    >
                      Update Review Period
                    </button>
                    <span className="text-xs text-zinc-400 font-medium">
                      Standard: 14 days
                    </span>
                  </div>
                </div>
              </div>

              {/* Linked Activities Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#f4f4f5]">Linked Schedule Activities</h4>
                    <p className="text-xs text-zinc-400">
                      Connected timeline tasks drive the required on-site date. Earliest date controls procurement.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#f4f4f5] bg-[#18181b] border border-[#27272a] px-3 py-1 rounded-full">
                    {linkedActivityIds.length} Connected
                  </span>
                </div>

                {/* Impact Breakdown Table for Linked Activities */}
                {submittal.linked_activities && submittal.linked_activities.length > 0 ? (
                  <div className="bg-black border border-[#262626] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-white">
                      <thead className="bg-[#111111] text-white uppercase font-bold text-[10px] border-b border-[#262626]">
                        <tr>
                          <th className="p-3">Schedule Activity</th>
                          <th className="p-3">Phase</th>
                          <th className="p-3">Start Date</th>
                          <th className="p-3">Required On-Site</th>
                          <th className="p-3">Controlling</th>
                          <th className="p-3">Float</th>
                          <th className="p-3">Impact Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f1f1f]">
                        {submittal.linked_activities.map(act => (
                          <tr key={act.activity_id} className="hover:bg-[#141414]">
                            <td className="p-3 font-bold text-white">
                              {act.activity_name}
                            </td>
                            <td className="p-3 text-neutral-300">
                              {act.phase_name || 'General'}
                            </td>
                            <td className="p-3 font-mono font-bold text-white">
                              {act.activity_start_date}
                            </td>
                            <td className="p-3 font-mono text-emerald-400 font-bold">
                              {act.required_on_site_date}
                            </td>
                            <td className="p-3">
                              {act.is_controlling ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-black text-white border border-[#444444]">
                                  🎯 Controlling
                                </span>
                              ) : (
                                <span className="text-neutral-500 text-[10px] font-medium">Secondary</span>
                              )}
                            </td>
                            <td className="p-3 font-mono font-bold">
                              <span className={act.float_days < 0 ? 'text-red-400' : 'text-emerald-400'}>
                                {act.float_days > 0 ? `+${act.float_days}` : act.float_days}d
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-xs text-white font-medium">{act.impact_message}</span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleToggleActivity(act.activity_id)}
                                className="text-red-400 hover:text-red-300 text-xs font-bold underline"
                              >
                                Unlink
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center border border-dashed border-[#333333] rounded-xl text-neutral-400 text-xs">
                    No schedule activities currently linked. Select an activity below to connect this submittal to the construction schedule.
                  </div>
                )}

                {/* Activity Linker / Search Bar */}
                <div className="bg-black border border-[#262626] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Link Additional Schedule Activities
                    </span>
                    <input
                      type="text"
                      placeholder="Search activities by name or phase..."
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      className="bg-[#111111] text-white text-xs px-3 py-1.5 rounded-lg border border-[#333333] w-64 focus:outline-none focus:border-white"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-[#1f1f1f] border border-[#262626] rounded-lg">
                    {filteredAvailableActivities.length > 0 ? (
                      filteredAvailableActivities.map(act => {
                        const isLinked = linkedActivityIds.includes(act.id);
                        return (
                          <div
                            key={act.id}
                            className="p-2.5 flex items-center justify-between hover:bg-[#141414] transition-colors text-xs"
                          >
                            <div>
                              <span className="font-bold text-[#f4f4f5] mr-2">{act.name}</span>
                              <span className="text-[#a1a1aa] font-mono">
                                Starts: {act.start_date}
                                {act.material_delivery_date ? ` (Material: ${act.material_delivery_date})` : ''}
                              </span>
                            </div>
                            <button
                              onClick={() => handleToggleActivity(act.id)}
                              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                isLinked
                                  ? 'bg-red-950 text-red-200 border border-red-700 hover:bg-red-900'
                                  : 'bg-[#f4f4f5] text-[#09090b] hover:bg-white'
                              }`}
                            >
                              {isLinked ? 'Remove' : '+ Connect Activity'}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-[#71717a] text-xs font-medium">No matching schedule activities found.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REVISION HISTORY */}
          {activeTab === 'revisions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#f4f4f5]">Submittal Revision History</h4>
                  <p className="text-xs text-[#a1a1aa]">Track all packages, architect stamps, and resubmissions.</p>
                </div>
                {!isAddingRevision && (
                  <button
                    onClick={() => setIsAddingRevision(true)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#f4f4f5] text-[#09090b] hover:bg-white transition-colors"
                  >
                    + Create Revision
                  </button>
                )}
              </div>

              {isAddingRevision && (
                <form onSubmit={handleAddRevision} className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#f4f4f5]">New Revision Package</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingRevision(false)}
                      className="text-xs text-[#a1a1aa] hover:text-[#f4f4f5]"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa] block mb-1">Package Title</label>
                      <input
                        type="text"
                        value={newRevTitle}
                        onChange={(e) => setNewRevTitle(e.target.value)}
                        placeholder="e.g., Rev 1 - Incorporated Structural Engineer Comments"
                        className="w-full bg-[#121215] text-[#f4f4f5] text-xs rounded-lg px-3 py-2 border border-[#27272a] focus:outline-none focus:border-[#f4f4f5]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa] block mb-1">Status Stamp</label>
                      <select
                        value={newRevStatus}
                        onChange={(e) => setNewRevStatus(e.target.value as SubmittalStatus)}
                        className="w-full bg-[#121215] text-[#f4f4f5] text-xs rounded-lg px-3 py-2 border border-[#27272a] focus:outline-none focus:border-[#f4f4f5]"
                      >
                        <option value="pending">Pending</option>
                        <option value="under_review">Under Review</option>
                        <option value="approved">Approved</option>
                        <option value="approved_as_noted">Approved as Noted</option>
                        <option value="revise_resubmit">Revise & Resubmit</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa] block mb-1">Reviewer Remarks / Stamp Notes</label>
                    <textarea
                      rows={2}
                      value={newRevRemarks}
                      onChange={(e) => setNewRevRemarks(e.target.value)}
                      placeholder="Enter review remarks or stamped conditions..."
                      className="w-full bg-[#121215] text-[#f4f4f5] text-xs rounded-lg p-2.5 border border-[#27272a] focus:outline-none focus:border-[#f4f4f5]"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingRevision(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#a1a1aa] hover:text-[#f4f4f5]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#f4f4f5] text-[#09090b] hover:bg-white transition-colors"
                    >
                      Save Revision
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {submittal.revisions && submittal.revisions.length > 0 ? (
                  submittal.revisions.map(rev => (
                    <div
                      key={rev.id}
                      className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#18181b] text-[#f4f4f5] border border-[#27272a]">
                            Rev {rev.revision_number}
                          </span>
                          <span className="text-sm font-bold text-[#f4f4f5]">{rev.title}</span>
                          <span className="text-xs text-[#f4f4f5] capitalize px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a] font-semibold">
                            {rev.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-[#a1a1aa]">
                          Submitted: <strong className="text-[#f4f4f5]">{rev.submitted_date}</strong>
                          {rev.reviewer_name && ` • Reviewer: ${rev.reviewer_name}`}
                        </p>
                        {rev.review_remarks && (
                          <p className="text-xs text-[#f4f4f5] bg-[#121215] p-2.5 rounded border border-[#27272a] mt-1">
                            &quot;{rev.review_remarks}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[#71717a] text-xs border border-dashed border-[#27272a] rounded-xl">
                    No revisions recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SUBMITTAL DETAILS */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#09090b] p-6 rounded-xl border border-[#27272a]">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-[#a1a1aa] uppercase block font-bold">Submittal Number</span>
                    <span className="text-sm font-mono font-bold text-[#f4f4f5]">{submittal.submittal_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#a1a1aa] uppercase block font-bold">Specification Division</span>
                    <span className="text-sm font-bold text-[#f4f4f5]">{submittal.spec_division}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#a1a1aa] uppercase block font-bold">Responsible Subcontractor</span>
                    <span className="text-sm font-bold text-[#f4f4f5]">{submittal.subcontractor_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#a1a1aa] uppercase block font-bold">Approver / Architect</span>
                    <span className="text-sm font-bold text-[#f4f4f5]">{submittal.approver_name || 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-[#a1a1aa] uppercase block font-bold">Substitution Requested</span>
                    <span className={`text-sm font-bold ${submittal.is_substitution ? 'text-amber-300' : 'text-[#a1a1aa]'}`}>
                      {submittal.is_substitution ? `Yes (Cost Delta: $${submittal.substitution_cost_delta || 0})` : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#a1a1aa] uppercase block font-bold">Received Date</span>
                    <span className="text-sm font-mono font-bold text-[#f4f4f5]">{submittal.received_date || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#a1a1aa] uppercase block font-bold">Description / Scope</span>
                    <p className="text-xs text-[#f4f4f5] mt-1 leading-relaxed">{submittal.description || 'No description provided.'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#a1a1aa] uppercase block font-bold">Notes</span>
                    <p className="text-xs text-[#f4f4f5] mt-1 leading-relaxed">{submittal.notes || 'No notes.'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMMENTS */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              <div className="space-y-3">
                {submittal.comments && submittal.comments.length > 0 ? (
                  submittal.comments.map(c => (
                    <div key={c.id} className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#f4f4f5]">{c.author_name} ({c.author_role})</span>
                        <span className="text-[#a1a1aa] font-mono">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-[#d4d4d8] leading-relaxed">{c.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[#71717a] text-xs border border-dashed border-[#27272a] rounded-xl">
                    No comments yet. Start the coordination thread below.
                  </div>
                )}
              </div>

              <form onSubmit={handleAddComment} className="space-y-3 bg-[#09090b] p-4 rounded-xl border border-[#27272a]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#f4f4f5]">Add Coordination Note / Comment</label>
                  <input
                    type="text"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    placeholder="Your Name / Role"
                    className="bg-[#121215] text-[#f4f4f5] text-xs px-2.5 py-1 rounded border border-[#27272a] w-48 focus:border-[#f4f4f5]"
                  />
                </div>
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Type an update, review feedback, or manufacturer notice..."
                  className="w-full bg-[#121215] text-[#f4f4f5] text-xs rounded-lg p-3 border border-[#27272a] focus:outline-none focus:border-[#f4f4f5]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving || !commentText.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#f4f4f5] text-[#09090b] hover:bg-white disabled:opacity-50"
                  >
                    Post Comment
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#f4f4f5]">Submittal Attachments & Cut Sheets</h4>
                <button
                  onClick={() => alert('Attachment dropzone ready.')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#f4f4f5] text-[#09090b] hover:bg-white transition-colors"
                >
                  + Upload Document
                </button>
              </div>

              {submittal.attachments && submittal.attachments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {submittal.attachments.map(att => (
                    <div key={att.id} className="bg-[#09090b] border border-[#27272a] rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📄</span>
                        <div>
                          <p className="text-xs font-bold text-[#f4f4f5]">{att.name}</p>
                          <span className="text-[10px] text-[#a1a1aa] font-medium">{att.file_size} • Uploaded by {att.uploaded_by}</span>
                        </div>
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#f4f4f5] font-bold underline hover:text-white"
                      >
                        View ↗
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-[#71717a] text-xs border border-dashed border-[#27272a] rounded-xl">
                  No attachments uploaded. Attach cut sheets, shop drawings, or engineering specifications.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-[#f4f4f5]">Schedule-Driven Audit Trail</h4>
                <p className="text-xs text-[#a1a1aa]">
                  Verifiable log of every schedule-driven date update, timeline task recalculation, and status transition.
                </p>
              </div>

              <div className="relative border-l-2 border-[#27272a] ml-4 space-y-4">
                {submittal.audit_trail && submittal.audit_trail.length > 0 ? (
                  submittal.audit_trail.map((entry) => (
                    <div key={entry.id} className="relative pl-6">
                      <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-[#09090b] border-2 border-[#f4f4f5] flex items-center justify-center text-[8px] text-[#f4f4f5]">
                        ●
                      </span>
                      <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#f4f4f5]">{entry.summary}</span>
                          <span className="text-[11px] font-mono text-[#a1a1aa]">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-[#d4d4d8] leading-relaxed">{entry.details}</p>
                        <span className="text-[10px] text-[#a1a1aa] font-bold block">Actor: {entry.actor}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pl-6 text-[#71717a] text-xs">No audit events logged yet.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#09090b] border-t border-[#27272a] flex items-center justify-between">
          <span className="text-xs text-[#a1a1aa]">
            All schedule updates immediately sync with the connected construction activities.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#f4f4f5] text-[#09090b] hover:bg-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
