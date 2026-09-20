'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Submittal, SubmittalStatus, SubmittalScheduleRisk } from '@/types';
import SubmittalRiskView from '@/components/submittals/SubmittalRiskView';
import SubmittalDetailModal from '@/components/submittals/SubmittalDetailModal';
import SubmittalTimelineGantt from '@/components/submittals/SubmittalTimelineGantt';
import { ScheduleActivityRef } from '@/lib/submittal-schedule-engine';

export default function SubmittalsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [activities, setActivities] = useState<ScheduleActivityRef[]>([]);
  const [, setLoading] = useState(true);

  // Active view tab
  const [viewMode, setViewMode] = useState<'register' | 'risk' | 'timeline'>('register');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTrade, setFilterTrade] = useState<string>('all');
  const [filterParty, setFilterParty] = useState<string>('all');
  const [filterActivity, setFilterActivity] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  // Modal / Drawer state
  const [selectedSubmittal, setSelectedSubmittal] = useState<Submittal | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    spec_division: '23 - HVAC',
    submittal_number: '',
    title: '',
    description: '',
    subcontractor_name: '',
    approver_name: 'Architect / Engineer',
    lead_time_weeks: 3,
    review_duration_days: 14,
    status: 'pending' as SubmittalStatus,
    is_substitution: false,
    substitution_cost_delta: 0,
    schedule_risk_level: 'low' as Submittal['schedule_risk_level'],
    notes: '',
    linked_activity_ids: [] as string[],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [submittalsRes, timelineRes] = await Promise.all([
        fetch(`/api/submittals?projectId=${projectId}`, { cache: 'no-store' }),
        fetch(`/api/timeline/${projectId}`, { cache: 'no-store' }),
      ]);

      const submittalsData = await submittalsRes.json();
      const timelineData = await timelineRes.json();

      if (submittalsRes.ok) {
        setSubmittals(submittalsData.submittals || []);
      } else {
        throw new Error(submittalsData.error || 'Failed to load submittals');
      }

      if (timelineRes.ok && timelineData.tasks) {
        const phasesMap = new Map((timelineData.phases || []).map((p: any) => [p.id, p.name]));
        setActivities(
          timelineData.tasks.map((t: any) => ({
            id: t.id,
            name: t.name,
            start_date: t.start_date,
            end_date: t.end_date,
            material_delivery_date: t.material_delivery_date,
            phase_name: phasesMap.get(t.phase_id) || null,
          }))
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading submittal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [projectId]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    setNotice('');

    try {
      const res = await fetch('/api/submittals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          project_id: projectId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create submittal');

      setSubmittals(prev => [data.submittal, ...prev.filter(s => s.id !== data.submittal.id)]);
      setNotice(`Submittal ${data.submittal.submittal_number} created and linked to schedule.`);
      setIsCreateOpen(false);

      // Reset create form
      setCreateForm({
        spec_division: '23 - HVAC',
        submittal_number: '',
        title: '',
        description: '',
        subcontractor_name: '',
        approver_name: 'Architect / Engineer',
        lead_time_weeks: 3,
        review_duration_days: 14,
        status: 'pending',
        is_substitution: false,
        substitution_cost_delta: 0,
        schedule_risk_level: 'low',
        notes: '',
        linked_activity_ids: [],
      });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Creation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: SubmittalStatus) => {
    try {
      const res = await fetch(`/api/submittals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setSubmittals(prev => prev.map(s => (s.id === id ? data.submittal : s)));
      setNotice('Status updated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleSubmittalSaved = (updated: Submittal) => {
    setSubmittals(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedSubmittal(updated);
  };

  // KPIs
  const totalSubmittals = submittals.length;
  const pendingApprovals = submittals.filter(
    s => s.status === 'pending' || s.status === 'under_review'
  ).length;
  const overdueCount = submittals.filter(
    s => s.schedule_risk_status === 'red'
  ).length;

  const atRiskActivitiesCount = new Set(
    submittals.flatMap(s => (s.linked_activities || []).filter(a => a.float_days < 0).map(a => a.activity_id))
  ).size;

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingDeadlines = submittals.filter(s => {
    if (!s.submit_by_date) return false;
    const diff = (new Date(s.submit_by_date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 14 && s.status !== 'approved' && s.status !== 'approved_as_noted';
  }).length;

  // Filter Unique Lists
  const uniqueTrades = Array.from(new Set(submittals.map(s => s.spec_division).filter(Boolean)));
  const uniqueParties = Array.from(
    new Set(
      submittals
        .flatMap(s => [s.subcontractor_name, s.approver_name])
        .filter((n): n is string => Boolean(n))
    )
  );

  // Filtered Submittals
  const filteredSubmittals = submittals.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterTrade !== 'all' && s.spec_division !== filterTrade) return false;
    if (filterParty !== 'all' && s.subcontractor_name !== filterParty && s.approver_name !== filterParty) return false;
    if (filterActivity !== 'all' && !s.linked_activity_ids?.includes(filterActivity)) return false;
    if (filterRisk !== 'all' && s.schedule_risk_status !== filterRisk) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        s.submittal_number.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.spec_division.toLowerCase().includes(q) ||
        (s.subcontractor_name && s.subcontractor_name.toLowerCase().includes(q)) ||
        (s.controlling_activity_name && s.controlling_activity_name.toLowerCase().includes(q)) ||
        (s.linked_activities && s.linked_activities.some(a => a.activity_name.toLowerCase().includes(q)));
      if (!match) return false;
    }

    return true;
  });

  const getRiskBadge = (risk?: SubmittalScheduleRisk) => {
    switch (risk) {
      case 'red':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-950 text-red-200 border border-red-700 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
            Red: Overdue / Risk
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950 text-amber-200 border border-amber-700 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Yellow: Attention
          </span>
        );
      case 'green':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-200 border border-emerald-700 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Green: On Track
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-900 text-white border border-neutral-700">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
            Gray: Unlinked
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 bg-[#09090b] text-[#f4f4f5] min-h-screen">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121215] p-6 rounded-2xl border border-[#27272a] shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#f4f4f5] tracking-tight">Submittal Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#18181b] text-[#f4f4f5] border border-[#27272a]">
              Schedule-Integrated
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Automated backward calculation from linked timeline tasks, controlling on-site dates, and active schedule risk mitigation.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#f4f4f5] text-[#09090b] hover:bg-zinc-200 shadow-lg transition-all flex items-center gap-2"
          >
            <span>+</span> Create Submittal
          </button>
        </div>
      </div>

      {/* KPI Dashboard Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-[#121215] border border-[#27272a] p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Total Submittals</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#f4f4f5]">{totalSubmittals}</span>
            <span className="text-xs text-zinc-500">records</span>
          </div>
        </div>

        <div className="bg-[#121215] border border-[#27272a] p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block">Pending Approvals</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#f4f4f5]">{pendingApprovals}</span>
            <span className="text-xs text-zinc-500">in review</span>
          </div>
        </div>

        <div className="bg-[#121215] border border-red-900/60 p-4 rounded-xl bg-red-950/20">
          <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider block">Overdue / Delayed</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-400">{overdueCount}</span>
            <span className="text-xs text-red-300">critical</span>
          </div>
        </div>

        <div className="bg-[#121215] border border-purple-900/60 p-4 rounded-xl bg-purple-950/20">
          <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider block">At-Risk Activities</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-300">{atRiskActivitiesCount}</span>
            <span className="text-xs text-purple-300/70">tasks impacted</span>
          </div>
        </div>

        <div className="bg-[#121215] border border-[#27272a] p-4 rounded-xl col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-zinc-300 tracking-wider block">Upcoming Deadlines</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#f4f4f5]">{upcomingDeadlines}</span>
            <span className="text-xs text-zinc-500">next 14 days</span>
          </div>
        </div>
      </div>

      {/* Notices */}
      {notice && (
        <div className="bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between">
          <span className="font-semibold">✓ {notice}</span>
          <button onClick={() => setNotice('')} className="text-[#f4f4f5] hover:text-zinc-300">✕</button>
        </div>
      )}
      {error && (
        <div className="bg-red-950/90 border border-red-700 text-red-200 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between">
          <span className="font-semibold">⚠️ {error}</span>
          <button onClick={() => setError('')} className="text-[#f4f4f5] hover:text-zinc-300">✕</button>
        </div>
      )}

      {/* Controls & Multi-dimensional Filters */}
      <div className="bg-[#121215] border border-[#27272a] p-4 rounded-2xl space-y-3">
        {/* Row 1: View Modes + Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-[#09090b] rounded-xl border border-[#27272a]">
            <button
              onClick={() => setViewMode('register')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'register'
                  ? 'bg-[#f4f4f5] text-[#09090b] font-extrabold shadow-md'
                  : 'text-zinc-400 hover:text-[#f4f4f5]'
              }`}
            >
              📋 Master Register
            </button>
            <button
              onClick={() => setViewMode('risk')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'risk'
                  ? 'bg-red-600 text-white font-extrabold shadow-md'
                  : 'text-zinc-400 hover:text-[#f4f4f5]'
              }`}
            >
              <span>⚠️</span> Submittal Risk View
              {overdueCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-950 text-red-200 border border-red-700">
                  {overdueCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-[#f4f4f5] text-[#09090b] font-extrabold shadow-md'
                  : 'text-zinc-400 hover:text-[#f4f4f5]'
              }`}
            >
              📊 Procurement Timeline
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search by #, title, vendor, spec, activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#09090b] text-[#f4f4f5] text-xs pl-8 pr-3 py-2 rounded-xl border border-[#27272a] focus:outline-none focus:border-[#f4f4f5] placeholder-zinc-500"
            />
            <span className="absolute left-2.5 top-2.5 text-zinc-500 text-xs">🔍</span>
          </div>
        </div>

        {/* Row 2: Deep Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 border-t border-[#27272a]">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg px-2.5 py-1.5 border border-[#27272a] focus:border-[#f4f4f5]"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="approved_as_noted">Approved as Noted</option>
              <option value="revise_resubmit">Revise & Resubmit</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Risk Level</label>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg px-2.5 py-1.5 border border-[#27272a] focus:border-[#f4f4f5]"
            >
              <option value="all">All Risk Levels</option>
              <option value="green">Green (On Track)</option>
              <option value="yellow">Yellow (Attention Needed)</option>
              <option value="red">Red (Overdue / Risk)</option>
              <option value="gray">Gray (Unlinked)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Trade / Spec</label>
            <select
              value={filterTrade}
              onChange={(e) => setFilterTrade(e.target.value)}
              className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg px-2.5 py-1.5 border border-[#27272a] focus:border-[#f4f4f5] truncate"
            >
              <option value="all">All Trades</option>
              {uniqueTrades.map(trade => (
                <option key={trade} value={trade}>{trade}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Responsible Party</label>
            <select
              value={filterParty}
              onChange={(e) => setFilterParty(e.target.value)}
              className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg px-2.5 py-1.5 border border-[#27272a] focus:border-[#f4f4f5] truncate"
            >
              <option value="all">All Parties</option>
              {uniqueParties.map(party => (
                <option key={party} value={party}>{party}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Schedule Activity</label>
            <select
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value)}
              className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg px-2.5 py-1.5 border border-[#27272a] focus:border-[#f4f4f5] truncate"
            >
              <option value="all">All Schedule Activities</option>
              {activities.map(act => (
                <option key={act.id} value={act.id}>{act.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: MASTER REGISTER */}
      {viewMode === 'register' && (
        <div className="bg-[#121215] border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#f4f4f5]">
              <thead className="bg-[#09090b] text-[#f4f4f5] uppercase font-bold text-[10px] border-b border-[#27272a]">
                <tr>
                  <th className="p-4">Submittal #</th>
                  <th className="p-4">Title & Trade</th>
                  <th className="p-4">Linked Schedule Activities</th>
                  <th className="p-4">Lead Time</th>
                  <th className="p-4">Submit-By</th>
                  <th className="p-4">Planned Approval</th>
                  <th className="p-4">Required On-Site</th>
                  <th className="p-4">Schedule Risk</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]">
                {filteredSubmittals.length > 0 ? (
                  filteredSubmittals.map(submittal => {
                    const isRed = submittal.schedule_risk_status === 'red';
                    return (
                      <tr
                        key={submittal.id}
                        className="hover:bg-[#18181b] transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedSubmittal(submittal);
                          setIsDetailOpen(true);
                        }}
                      >
                        <td className="p-4 font-mono font-bold text-[#f4f4f5]">
                          {submittal.submittal_number}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-[#f4f4f5] group-hover:text-white transition-colors">
                            {submittal.title}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {submittal.spec_division} • {submittal.subcontractor_name || 'No Sub'}
                          </div>
                        </td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          {submittal.linked_activities && submittal.linked_activities.length > 0 ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#09090b] text-[#f4f4f5] border border-[#27272a]">
                                🎯 {submittal.controlling_activity_name || submittal.linked_activities[0].activity_name}
                              </span>
                              {submittal.linked_activities.length > 1 && (
                                <span className="text-[10px] text-zinc-400 block font-medium">
                                  +{submittal.linked_activities.length - 1} more linked
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedSubmittal(submittal);
                                setIsDetailOpen(true);
                              }}
                              className="text-xs text-zinc-400 hover:text-[#f4f4f5] font-bold flex items-center gap-1"
                            >
                              <span>+</span> Link Activity
                            </button>
                          )}
                        </td>
                        <td className="p-4 font-bold text-[#f4f4f5]">
                          {submittal.lead_time_weeks ?? 3} wks
                        </td>
                        <td className={`p-4 font-mono font-bold ${isRed && !submittal.submitted_date ? 'text-red-400' : 'text-[#f4f4f5]'}`}>
                          {submittal.submit_by_date || 'N/A'}
                        </td>
                        <td className="p-4 font-mono font-bold text-[#f4f4f5]">
                          {submittal.planned_approval_date || 'N/A'}
                        </td>
                        <td className="p-4 font-mono font-bold text-emerald-400">
                          {submittal.required_on_site_date || 'N/A'}
                        </td>
                        <td className="p-4">
                          {getRiskBadge(submittal.schedule_risk_status)}
                        </td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={submittal.status}
                            onChange={(e) => handleStatusChange(submittal.id, e.target.value as SubmittalStatus)}
                            className="bg-[#09090b] text-[#f4f4f5] text-[11px] font-bold rounded-lg px-2.5 py-1 border border-[#27272a] focus:border-[#f4f4f5]"
                          >
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="approved_as_noted">Approved as Noted</option>
                            <option value="revise_resubmit">Revise & Resubmit</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubmittal(submittal);
                              setIsDetailOpen(true);
                            }}
                            className="text-xs text-[#f4f4f5] hover:text-zinc-300 font-bold underline"
                          >
                            Manage ➔
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-zinc-400 font-medium">
                      No submittals found matching the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: RISK VIEW */}
      {viewMode === 'risk' && (
        <SubmittalRiskView
          submittals={filteredSubmittals}
          onOpenDetail={(s) => {
            setSelectedSubmittal(s);
            setIsDetailOpen(true);
          }}
          onLinkActivity={(s) => {
            setSelectedSubmittal(s);
            setIsDetailOpen(true);
          }}
        />
      )}

      {/* VIEW 3: TIMELINE / GANTT VIEW */}
      {viewMode === 'timeline' && (
        <SubmittalTimelineGantt
          submittals={filteredSubmittals}
          onOpenDetail={(s) => {
            setSelectedSubmittal(s);
            setIsDetailOpen(true);
          }}
        />
      )}

      {/* SUBMITTAL DETAIL & SCHEDULE INTEGRATION MODAL */}
      <SubmittalDetailModal
        submittal={selectedSubmittal}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onSave={handleSubmittalSaved}
        availableActivities={activities}
      />

      {/* CREATE SUBMITTAL MODAL WITH INITIAL ACTIVITY LINKER */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 my-6 text-[#f4f4f5]">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-lg font-bold text-[#f4f4f5]">Create New Submittal</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#f4f4f5] hover:text-zinc-300 font-bold">✕</button>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#f4f4f5] block mb-1">Submittal Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SUB-23-003"
                    value={createForm.submittal_number}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, submittal_number: e.target.value }))}
                    className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg p-2.5 border border-[#27272a] focus:border-[#f4f4f5]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#f4f4f5] block mb-1">Spec Division / Trade *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 23 05 00 - Common Work Results for HVAC"
                    value={createForm.spec_division}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, spec_division: e.target.value }))}
                    className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg p-2.5 border border-[#27272a] focus:border-[#f4f4f5]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#f4f4f5] block mb-1">Submittal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trane Voyager Rooftop Unit & Curbs"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg p-2.5 border border-[#27272a] focus:border-[#f4f4f5]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#f4f4f5] block mb-1">Subcontractor</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Mechanical"
                    value={createForm.subcontractor_name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, subcontractor_name: e.target.value }))}
                    className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg p-2.5 border border-[#27272a] focus:border-[#f4f4f5]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#f4f4f5] block mb-1">Approver / Architect</label>
                  <input
                    type="text"
                    placeholder="e.g. MEP Lead Engineer"
                    value={createForm.approver_name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, approver_name: e.target.value }))}
                    className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg p-2.5 border border-[#27272a] focus:border-[#f4f4f5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#f4f4f5] block mb-1">Lead Time (Weeks)</label>
                  <input
                    type="number"
                    min={0}
                    value={createForm.lead_time_weeks}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, lead_time_weeks: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg p-2.5 border border-[#27272a] focus:border-[#f4f4f5]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#f4f4f5] block mb-1">Initial Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, status: e.target.value as SubmittalStatus }))}
                    className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg p-2.5 border border-[#27272a] focus:border-[#f4f4f5]"
                  >
                    <option value="pending">Pending Review</option>
                    <option value="draft">Draft</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>

              {/* Activity Linker */}
              <div>
                <label className="text-xs font-bold text-[#f4f4f5] block mb-1">
                  Connect to Schedule Activity (Optional)
                </label>
                <select
                  onChange={(e) => {
                    const actId = e.target.value;
                    if (actId && !createForm.linked_activity_ids.includes(actId)) {
                      setCreateForm(prev => ({
                        ...prev,
                        linked_activity_ids: [...prev.linked_activity_ids, actId],
                      }));
                    }
                  }}
                  className="w-full bg-[#09090b] text-[#f4f4f5] text-xs rounded-lg p-2.5 border border-[#27272a] mb-2 focus:border-[#f4f4f5]"
                >
                  <option value="">-- Select a timeline task to establish required dates --</option>
                  {activities.map(act => (
                    <option key={act.id} value={act.id}>
                      {act.name} (Starts: {act.start_date})
                    </option>
                  ))}
                </select>

                {createForm.linked_activity_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {createForm.linked_activity_ids.map(id => {
                      const found = activities.find(a => a.id === id);
                      return (
                        <span key={id} className="px-2 py-0.5 rounded text-xs bg-[#09090b] text-[#f4f4f5] border border-[#27272a] flex items-center gap-1 font-mono">
                          <span>🎯 {found?.name || id}</span>
                          <button
                            type="button"
                            onClick={() => setCreateForm(prev => ({
                              ...prev,
                              linked_activity_ids: prev.linked_activity_ids.filter(i => i !== id),
                            }))}
                            className="text-[#f4f4f5] hover:text-red-400 font-bold ml-1"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-[#f4f4f5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-[#f4f4f5] text-[#09090b] hover:bg-zinc-200 shadow-lg transition-all"
                >
                  {saving ? 'Creating...' : 'Create & Calculate Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
