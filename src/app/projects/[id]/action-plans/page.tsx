'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ActionPlan } from '@/types';

export default function ActionPlansPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewPlanModal, setIsNewPlanModal] = useState(false);

  const [form, setForm] = useState({
    plan_number: 'AP-101',
    title: 'RTU-1 Rooftop Unit Pre-Installation & Quality Verification',
    plan_type: 'pre_installation' as ActionPlan['plan_type'],
    assigned_to: 'Robert Mason (Superintendent)',
  });

  const fetchPlans = async () => {
    try {
      const res = await fetch(`/api/action-plans?projectId=${projectId}`);
      const data = await res.json();
      const list = data.actionPlans || [];
      if (list.length === 0) {
        // Initial sample Action Plan from ConsJ.rule section 6 & 29
        const defaultPlan: ActionPlan = {
          id: 'ap-1',
          project_id: projectId,
          plan_number: 'AP-23-01',
          title: 'RTU-1 Mechanical Unit Pre-Install & Commissioning Quality Plan',
          plan_type: 'pre_installation',
          status: 'in_progress',
          assigned_to: 'Robert Mason (Superintendent)',
          due_date: new Date().toISOString().split('T')[0],
          items: [
            {
              id: 'it-1',
              action_plan_id: 'ap-1',
              step_number: 1,
              section: '1. Engineering & Submittal Sign-Off',
              requirement_title: 'Verify Trane Voyager submittal SUB-23-001 is approved by MEP engineer',
              is_completed: true,
              completed_by: 'Mo Li (PM)',
              completed_at: new Date().toISOString(),
            },
            {
              id: 'it-2',
              action_plan_id: 'ap-1',
              step_number: 2,
              section: '2. Structural Header Verification',
              requirement_title: 'Inspect welded structural cross-angles per RFI-042 & PCO-005 prior to roof decking',
              is_completed: true,
              completed_by: 'Robert Mason (Superintendent)',
              completed_at: new Date().toISOString(),
            },
            {
              id: 'it-3',
              action_plan_id: 'ap-1',
              step_number: 3,
              section: '3. Pre-Installation Inspection',
              requirement_title: 'Verify neoprene curb gasket seal and vibration spring isolator alignment',
              is_completed: false,
              notes: 'Inspection scheduled before Friday crane pick',
            },
            {
              id: 'it-4',
              action_plan_id: 'ap-1',
              step_number: 4,
              section: '4. Safety & Rigging Checklist',
              requirement_title: 'Verify crane 100-ton inspection tag and perimeter barricades active',
              is_completed: false,
            },
            {
              id: 'it-5',
              action_plan_id: 'ap-1',
              step_number: 5,
              section: '5. Commissioning & Startup',
              requirement_title: 'Measure refrigerant pressure, test electrical 480V disconnect, and record airflow CFM',
              is_completed: false,
            },
          ],
        };
        setPlans([defaultPlan]);
        setSelectedPlan(defaultPlan);
      } else {
        setPlans(list);
        setSelectedPlan(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [projectId]);

  const handleToggleItem = async (itemId: string, currentVal: boolean) => {
    try {
      const res = await fetch('/api/action-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_item',
          item_id: itemId,
          is_completed: !currentVal,
          completed_by: 'Robert Mason (Superintendent)',
        }),
      });
      if (res.ok) {
        await fetchPlans();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/action-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          project_id: projectId,
          items: [
            { section: '1. Pre-Check', requirement_title: 'Verify submittals and site access' },
            { section: '2. Field Work', requirement_title: 'Complete rough-in and field inspection' },
            { section: '3. QA Sign-Off', requirement_title: 'Superintendent final sign-off' },
          ],
        }),
      });
      if (res.ok) {
        setIsNewPlanModal(false);
        await fetchPlans();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalItems = selectedPlan?.items?.length || 0;
  const completedItems = selectedPlan?.items?.filter(i => i.is_completed).length || 0;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Action Plans & QA Checklists</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 6: Quality Protocols
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            Structured quality assurance, pre-installation verification, and commissioning checklists per ConsJ.rule section 6.
          </p>
        </div>

        <button
          onClick={() => setIsNewPlanModal(true)}
          className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>+</span> Create Action Plan
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Plans Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-procore-text-muted px-1">
            Active Action Plans ({plans.length})
          </h2>
          {plans.map((p) => {
            const isSelected = selectedPlan?.id === p.id;
            const pItems = p.items || [];
            const done = pItems.filter(i => i.is_completed).length;
            const pct = pItems.length > 0 ? Math.round((done / pItems.length) * 100) : 0;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-procore-orange shadow-sm ring-1 ring-procore-orange'
                    : 'bg-white border-procore-border hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-procore-orange">{p.plan_number}</span>
                  <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {p.plan_type.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-procore-text mt-1">{p.title}</h3>
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-bold text-procore-text-muted mb-1">
                    <span>Progress</span>
                    <span>{pct}% ({done}/{pItems.length})</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Plan Sequential Checklist */}
        <div className="lg:col-span-8 space-y-4">
          {selectedPlan && (
            <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
              <div className="p-4 border-b border-procore-border bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-procore-orange">{selectedPlan.plan_number}</span>
                  <h2 className="text-base font-bold text-procore-text">{selectedPlan.title}</h2>
                  <p className="text-xs text-procore-text-muted">Lead: {selectedPlan.assigned_to}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-emerald-600">{progressPct}%</span>
                  <span className="text-xs text-procore-text-muted block">Completed</span>
                </div>
              </div>

              {/* Checklist Items */}
              <div className="p-4 divide-y divide-procore-border-light space-y-4">
                {selectedPlan.items?.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-start gap-3">
                    <button
                      onClick={() => handleToggleItem(item.id, item.is_completed)}
                      className={`w-6 h-6 rounded border flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0 mt-0.5 ${
                        item.is_completed
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-white border-procore-border text-transparent hover:border-procore-orange'
                      }`}
                    >
                      ✓
                    </button>
                    <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">{item.section}</span>
                      <h4 className={`text-sm font-bold text-procore-text ${item.is_completed ? 'line-through text-procore-text-muted' : ''}`}>
                        {item.step_number}. {item.requirement_title}
                      </h4>
                      {item.completed_by && (
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          ✓ Verified by {item.completed_by} on {new Date().toLocaleDateString()}
                        </p>
                      )}
                      {item.notes && <p className="text-xs text-procore-text-secondary italic mt-0.5">{item.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Plan */}
      {isNewPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Create Action Plan</h3>
            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Plan Title</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Plan Type</label>
                  <select
                    value={form.plan_type}
                    onChange={(e) => setForm({ ...form, plan_type: e.target.value as any })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  >
                    <option value="pre_installation">Pre-Installation</option>
                    <option value="quality_assurance">Quality Assurance</option>
                    <option value="commissioning">Commissioning</option>
                    <option value="safety_audit">Safety Audit</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Assigned Lead</label>
                  <input
                    type="text"
                    value={form.assigned_to}
                    onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-procore-border-light">
                <button
                  type="button"
                  onClick={() => setIsNewPlanModal(false)}
                  className="px-3 py-1.5 border border-procore-border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-procore-orange text-white font-bold rounded hover:bg-procore-orange-hover"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
