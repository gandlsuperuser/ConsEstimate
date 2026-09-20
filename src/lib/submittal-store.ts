import { createClient } from './supabase-server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord } from './workflow-store';
import {
  calculateSubmittalSchedule,
  ScheduleActivityRef,
  SubmittalScheduleInput,
  diffDays,
} from './submittal-schedule-engine';
import {
  Submittal,
  SubmittalRevision,
  SubmittalComment,
  SubmittalAttachment,
  SubmittalAuditEntry,
  SubmittalScheduleLinkItem,
} from '@/types';

export interface SubmittalExtensionData {
  id: string; // submittal_id
  submittal_id: string;
  project_id: string;
  linked_activity_ids: string[];
  lead_time_weeks: number;
  review_duration_days: number;
  revisions: SubmittalRevision[];
  comments: SubmittalComment[];
  attachments: SubmittalAttachment[];
  audit_trail: SubmittalAuditEntry[];
  updated_at: string;
}

/**
 * Fetch all tasks/activities for a project
 */
export async function getProjectTasks(projectId: string): Promise<ScheduleActivityRef[]> {
  try {
    const supabase = await createClient();
    const { data: tasks, error } = await supabase
      .from('project_tasks')
      .select('id, name, start_date, end_date, material_delivery_date, phase_id')
      .eq('project_id', projectId);

    if (error || !tasks) return [];
    return tasks.map(t => ({
      id: t.id,
      name: t.name,
      start_date: t.start_date,
      end_date: t.end_date,
      material_delivery_date: t.material_delivery_date,
    }));
  } catch {
    return [];
  }
}

/**
 * Get extension data for a submittal (or default skeleton)
 */
export async function getSubmittalExtension(
  submittalId: string,
  projectId: string
): Promise<SubmittalExtensionData> {
  const all = await getWorkflowData<SubmittalExtensionData>('submittal_extensions', projectId);
  const found = all.find(e => e.submittal_id === submittalId || e.id === submittalId);

  if (found) {
    return {
      id: found.id || submittalId,
      submittal_id: submittalId,
      project_id: projectId,
      linked_activity_ids: found.linked_activity_ids || [],
      lead_time_weeks: found.lead_time_weeks ?? 3,
      review_duration_days: found.review_duration_days ?? 14,
      revisions: found.revisions || [],
      comments: found.comments || [],
      attachments: found.attachments || [],
      audit_trail: found.audit_trail || [],
      updated_at: found.updated_at || new Date().toISOString(),
    };
  }

  // Create initial record
  const initial: SubmittalExtensionData = {
    id: submittalId,
    submittal_id: submittalId,
    project_id: projectId,
    linked_activity_ids: [],
    lead_time_weeks: 3,
    review_duration_days: 14,
    revisions: [
      {
        id: `rev-0-${submittalId.slice(0, 6)}`,
        revision_number: 0,
        title: 'Initial Submittal Package',
        submitted_date: new Date().toISOString().slice(0, 10),
        status: 'pending',
        review_remarks: 'Submitted for architectural & engineering review.',
      },
    ],
    comments: [],
    attachments: [],
    audit_trail: [
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        event_type: 'created',
        summary: 'Submittal created',
        details: 'Initial submittal record established in system.',
        actor: 'BTX Project Management',
        timestamp: new Date().toISOString(),
      },
    ],
    updated_at: new Date().toISOString(),
  };

  await insertWorkflowRecord<SubmittalExtensionData>('submittal_extensions', initial);
  return initial;
}

/**
 * Save extension data for a submittal
 */
export async function saveSubmittalExtension(
  data: SubmittalExtensionData
): Promise<SubmittalExtensionData> {
  data.updated_at = new Date().toISOString();
  await updateWorkflowRecord<SubmittalExtensionData>('submittal_extensions', data.id || data.submittal_id, data);
  return data;
}

/**
 * Enrich a raw submittal record with linked activities, calculations, and extension data
 */
export function enrichSubmittalWithSchedule(
  submittal: Submittal,
  tasks: ScheduleActivityRef[],
  extension: SubmittalExtensionData
): Submittal {
  const linkedIds = extension.linked_activity_ids || [];
  const linkedTasks = tasks.filter(t => linkedIds.includes(t.id));

  const calcInput: SubmittalScheduleInput = {
    lead_time_weeks: submittal.lead_time_weeks ?? extension.lead_time_weeks ?? 3,
    review_duration_days: extension.review_duration_days ?? 14,
    status: submittal.status,
    submitted_date: submittal.received_date,
    required_on_site_override: submittal.required_on_site_date,
    linked_activities: linkedTasks,
  };

  const scheduleCalc = calculateSubmittalSchedule(calcInput);

  const linkedActivityItems: SubmittalScheduleLinkItem[] = scheduleCalc.linked_evaluations.map(ev => ({
    activity_id: ev.activity_id,
    activity_name: ev.activity_name,
    activity_start_date: ev.activity_start_date,
    activity_end_date: ev.activity_end_date,
    material_delivery_date: ev.material_delivery_date,
    phase_name: ev.phase_name,
    required_on_site_date: ev.required_on_site_date,
    is_controlling: ev.is_controlling,
    float_days: ev.float_days,
    impact_status: ev.impact_status,
    impact_message: ev.impact_message,
  }));

  return {
    ...submittal,
    lead_time_weeks: calcInput.lead_time_weeks,
    review_duration_days: calcInput.review_duration_days,
    linked_activity_ids: linkedIds,
    linked_activities: linkedActivityItems,
    submit_by_date: scheduleCalc.submit_by_date,
    planned_approval_date: scheduleCalc.planned_approval_date,
    required_on_site_date: scheduleCalc.required_on_site_date || submittal.required_on_site_date,
    procurement_window_start: scheduleCalc.procurement_window_start,
    procurement_window_end: scheduleCalc.procurement_window_end,
    controlling_activity_id: scheduleCalc.controlling_activity_id,
    controlling_activity_name: scheduleCalc.controlling_activity_name,
    schedule_risk_status: scheduleCalc.risk_status,
    risk_reasons: scheduleCalc.risk_reasons,
    recommended_actions: scheduleCalc.recommended_actions,
    float_days: scheduleCalc.float_days,
    revisions: extension.revisions || [],
    comments: extension.comments || [],
    attachments: extension.attachments || [],
    audit_trail: extension.audit_trail || [],
  };
}

/**
 * Handle timeline task updates: dynamically recalculate all linked submittals and record audit logs
 */
export async function syncSubmittalsOnTaskUpdate(
  taskId: string,
  projectId: string,
  updatedTask: { name?: string; start_date?: string; end_date?: string; material_delivery_date?: string | null }
): Promise<number> {
  const allExtensions = await getWorkflowData<SubmittalExtensionData>('submittal_extensions', projectId);
  const affected = allExtensions.filter(e => e.linked_activity_ids?.includes(taskId));

  if (affected.length === 0) return 0;

  const tasks = await getProjectTasks(projectId);
  // Update task in memory list for accurate calculation
  const taskIdx = tasks.findIndex(t => t.id === taskId);
  if (taskIdx >= 0 && updatedTask) {
    tasks[taskIdx] = {
      ...tasks[taskIdx],
      ...updatedTask,
    };
  }

  for (const ext of affected) {
    const linkedTasks = tasks.filter(t => ext.linked_activity_ids.includes(t.id));
    const newCalc = calculateSubmittalSchedule({
      lead_time_weeks: ext.lead_time_weeks,
      review_duration_days: ext.review_duration_days,
      linked_activities: linkedTasks,
    });

    // Record audit entry
    const auditEntry: SubmittalAuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      event_type: 'schedule_recalculated',
      summary: `Schedule updated from activity '${updatedTask.name || taskId}'`,
      details: `Activity date moved to ${updatedTask.start_date || 'new date'}. Controlling required date recalculated to ${newCalc.required_on_site_date || 'N/A'}, submit-by date shifted to ${newCalc.submit_by_date || 'N/A'}. Float: ${newCalc.float_days ?? 'N/A'} days.`,
      actor: 'Timeline Engine Auto-Sync',
      timestamp: new Date().toISOString(),
    };

    ext.audit_trail = [auditEntry, ...(ext.audit_trail || [])];
    await saveSubmittalExtension(ext);
  }

  return affected.length;
}
