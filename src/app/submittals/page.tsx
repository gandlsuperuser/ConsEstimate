'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Submittal, Project } from '@/types';
import SubmittalRiskView from '@/components/submittals/SubmittalRiskView';
import SubmittalDetailModal from '@/components/submittals/SubmittalDetailModal';
import SubmittalTimelineGantt from '@/components/submittals/SubmittalTimelineGantt';
import { ScheduleActivityRef } from '@/lib/submittal-schedule-engine';

export default function CentralizedSubmittalsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [activities, setActivities] = useState<ScheduleActivityRef[]>([]);
  const [, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'register' | 'risk' | 'timeline'>('register');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  const [selectedSubmittal, setSelectedSubmittal] = useState<Submittal | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        setProjects(data.projects || []);
      } catch (err) {
        console.error('Failed to load projects', err);
      }
    }
    void loadProjects();
  }, []);

  useEffect(() => {
    async function loadSubmittals() {
      setLoading(true);
      try {
        const url = selectedProjectId === 'all' ? '/api/submittals' : `/api/submittals?projectId=${selectedProjectId}`;
        const res = await fetch(url);
        const data = await res.json();
        setSubmittals(data.submittals || []);

        if (selectedProjectId !== 'all') {
          const tRes = await fetch(`/api/timeline/${selectedProjectId}`);
          const tData = await tRes.json();
          if (tData.tasks) {
            setActivities(
              tData.tasks.map((t: any) => ({
                id: t.id,
                name: t.name,
                start_date: t.start_date,
                end_date: t.end_date,
                material_delivery_date: t.material_delivery_date,
              }))
            );
          }
        }
      } catch (err) {
        console.error('Failed to load submittals', err);
      } finally {
        setLoading(false);
      }
    }
    void loadSubmittals();
  }, [selectedProjectId]);

  const handleSubmittalSaved = (updated: Submittal) => {
    setSubmittals(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedSubmittal(updated);
  };

  const filtered = submittals.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterRisk !== 'all' && s.schedule_risk_status !== filterRisk) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.submittal_number.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.spec_division.toLowerCase().includes(q) ||
        (s.controlling_activity_name && s.controlling_activity_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const overdueCount = submittals.filter(s => s.schedule_risk_status === 'red').length;
  const pendingCount = submittals.filter(s => s.status === 'pending' || s.status === 'under_review').length;

  return (
    <div className="space-y-6 pb-12 bg-[#09090b] text-[#f4f4f5] min-h-screen">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121215] p-6 rounded-2xl border border-[#27272a] shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#f4f4f5] tracking-tight">Centralized Submittals</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#18181b] text-[#f4f4f5] border border-[#27272a]">
              Enterprise Hub
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Global register and active schedule risk tracking across all active projects.
          </p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-[#f4f4f5] font-bold">Filter Project:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-[#09090b] text-[#f4f4f5] text-xs font-semibold rounded-xl px-3 py-2 border border-[#27272a] focus:border-[#f4f4f5] focus:outline-none"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121215] border border-[#27272a] p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Total Submittals</span>
          <p className="text-2xl font-bold text-[#f4f4f5] mt-1">{submittals.length}</p>
        </div>
        <div className="bg-[#121215] border border-[#27272a] p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-amber-300">Pending Review</span>
          <p className="text-2xl font-bold text-[#f4f4f5] mt-1">{pendingCount}</p>
        </div>
        <div className="bg-[#121215] border border-red-900/60 p-4 rounded-xl bg-red-950/20">
          <span className="text-[10px] uppercase font-bold text-red-400">Overdue / Bottlenecks</span>
          <p className="text-2xl font-bold text-red-400 mt-1">{overdueCount}</p>
        </div>
        <div className="bg-[#121215] border border-[#27272a] p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-emerald-400">On Track</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {submittals.filter(s => s.schedule_risk_status === 'green').length}
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-[#121215] border border-[#27272a] p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 bg-[#09090b] rounded-xl border border-[#27272a]">
          <button
            onClick={() => setViewMode('register')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'register' ? 'bg-[#f4f4f5] text-[#09090b] font-extrabold shadow-md' : 'text-zinc-400 hover:text-[#f4f4f5]'
            }`}
          >
            📋 Master Register
          </button>
          <button
            onClick={() => setViewMode('risk')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'risk' ? 'bg-red-600 text-white font-extrabold shadow-md' : 'text-zinc-400 hover:text-[#f4f4f5]'
            }`}
          >
            <span>⚠️</span> Submittal Risk View
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'timeline' ? 'bg-[#f4f4f5] text-[#09090b] font-extrabold shadow-md' : 'text-zinc-400 hover:text-[#f4f4f5]'
            }`}
          >
            📊 Procurement Timeline
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search all submittals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#09090b] text-[#f4f4f5] text-xs px-3 py-2 rounded-xl border border-[#27272a] w-64 focus:outline-none focus:border-[#f4f4f5] placeholder-zinc-500"
          />
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'register' && (
        <div className="bg-[#121215] border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-xs text-[#f4f4f5]">
            <thead className="bg-[#09090b] text-[#f4f4f5] uppercase font-bold text-[10px] border-b border-[#27272a]">
              <tr>
                <th className="p-4">Submittal #</th>
                <th className="p-4">Project</th>
                <th className="p-4">Title & Trade</th>
                <th className="p-4">Controlling Activity</th>
                <th className="p-4">Submit-By</th>
                <th className="p-4">Required On-Site</th>
                <th className="p-4">Risk Status</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {filtered.map(submittal => (
                <tr
                  key={submittal.id}
                  onClick={() => {
                    setSelectedSubmittal(submittal);
                    setIsDetailOpen(true);
                  }}
                  className="hover:bg-[#18181b] transition-colors cursor-pointer"
                >
                  <td className="p-4 font-mono font-bold text-[#f4f4f5]">{submittal.submittal_number}</td>
                  <td className="p-4 text-[#f4f4f5] font-medium">
                    <Link
                      href={`/projects/${submittal.project_id}/submittals`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#f4f4f5] hover:underline font-bold"
                    >
                      {projects.find(p => p.id === submittal.project_id)?.name || submittal.project_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="p-4 font-bold text-[#f4f4f5]">{submittal.title}</td>
                  <td className="p-4 text-[#f4f4f5] font-semibold">
                    {submittal.controlling_activity_name ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#09090b] border border-[#27272a] text-[#f4f4f5] font-mono text-[11px]">
                        🎯 {submittal.controlling_activity_name}
                      </span>
                    ) : (
                      <span className="text-zinc-500">Unlinked</span>
                    )}
                  </td>
                  <td className="p-4 font-mono font-bold text-[#f4f4f5]">{submittal.submit_by_date || 'N/A'}</td>
                  <td className="p-4 font-mono font-bold text-[#f4f4f5]">{submittal.required_on_site_date || 'N/A'}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      submittal.schedule_risk_status === 'red' ? 'bg-red-950 text-red-300 border border-red-700' :
                      submittal.schedule_risk_status === 'yellow' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                      submittal.schedule_risk_status === 'green' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                      'bg-[#18181b] text-zinc-400 border border-[#27272a]'
                    }`}>
                      {submittal.schedule_risk_status}
                    </span>
                  </td>
                  <td className="p-4 capitalize text-[#f4f4f5] font-medium">{submittal.status.replace(/_/g, ' ')}</td>
                  <td className="p-4 text-right">
                    <button className="text-xs text-[#f4f4f5] hover:text-zinc-300 font-bold underline">Manage ➔</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'risk' && (
        <SubmittalRiskView
          submittals={filtered}
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

      {viewMode === 'timeline' && (
        <SubmittalTimelineGantt
          submittals={filtered}
          onOpenDetail={(s) => {
            setSelectedSubmittal(s);
            setIsDetailOpen(true);
          }}
        />
      )}

      <SubmittalDetailModal
        submittal={selectedSubmittal}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onSave={handleSubmittalSaved}
        availableActivities={activities}
      />
    </div>
  );
}
