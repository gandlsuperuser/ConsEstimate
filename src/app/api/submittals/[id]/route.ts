import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  getProjectTasks,
  getSubmittalExtension,
  saveSubmittalExtension,
  enrichSubmittalWithSchedule,
} from '@/lib/submittal-store';
import { Submittal } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** GET /api/submittals/[id]?projectId=... — Fetch single submittal enriched with schedule data */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = request.nextUrl.searchParams.get('projectId');
    const supabase = await createClient();

    let query = supabase.from('submittals').select('*').eq('id', id);
    if (projectId) query = query.eq('project_id', projectId);

    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: 'Submittal not found' }, { status: 404 });
    }

    const submittal = data as Submittal;
    const tasks = await getProjectTasks(submittal.project_id);
    const ext = await getSubmittalExtension(submittal.id, submittal.project_id);
    const enriched = enrichSubmittalWithSchedule(submittal, tasks, ext);

    return NextResponse.json({ submittal: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH /api/submittals/[id] — Update submittal details, link activities, add revisions/comments */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const projectId = body.project_id || request.nextUrl.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Separate base table columns from extension data
    const baseKeys = [
      'spec_division', 'submittal_number', 'title', 'description',
      'subcontractor_name', 'approver_name', 'notes', 'status',
      'is_substitution', 'substitution_cost_delta', 'schedule_risk_level',
      'received_date', 'required_on_site_date', 'lead_time_weeks'
    ];

    const baseUpdates: Record<string, any> = {};
    for (const key of baseKeys) {
      if (body[key] !== undefined) baseUpdates[key] = body[key];
    }

    let updatedSubmittal: Submittal | null = null;
    if (Object.keys(baseUpdates).length > 0) {
      const { data, error } = await supabase
        .from('submittals')
        .update(baseUpdates)
        .eq('id', id)
        .eq('project_id', projectId)
        .select()
        .maybeSingle();

      if (error) throw error;
      updatedSubmittal = data as Submittal;
    } else {
      const { data } = await supabase
        .from('submittals')
        .select('*')
        .eq('id', id)
        .eq('project_id', projectId)
        .maybeSingle();
      updatedSubmittal = data as Submittal;
    }

    if (!updatedSubmittal) {
      return NextResponse.json({ error: 'Submittal not found' }, { status: 404 });
    }

    // Extension updates
    const ext = await getSubmittalExtension(id, projectId);
    let modified = false;

    if (Array.isArray(body.linked_activity_ids)) {
      const oldIds = ext.linked_activity_ids || [];
      ext.linked_activity_ids = body.linked_activity_ids;
      modified = true;
      ext.audit_trail.unshift({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        event_type: 'activity_linked',
        summary: `Linked activities updated (${body.linked_activity_ids.length} linked)`,
        details: `Linked schedule task IDs: ${body.linked_activity_ids.join(', ') || 'None'}. Controlling dates re-evaluated.`,
        actor: body.actor || 'Project Manager',
        timestamp: new Date().toISOString(),
      });
    }

    if (typeof body.lead_time_weeks === 'number' && body.lead_time_weeks !== ext.lead_time_weeks) {
      ext.lead_time_weeks = body.lead_time_weeks;
      modified = true;
      ext.audit_trail.unshift({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        event_type: 'lead_time_updated',
        summary: `Lead time changed to ${body.lead_time_weeks} weeks`,
        details: `Lead time updated. Required submit-by date recalculated.`,
        actor: body.actor || 'Project Manager',
        timestamp: new Date().toISOString(),
      });
    }

    if (typeof body.review_duration_days === 'number') {
      ext.review_duration_days = body.review_duration_days;
      modified = true;
    }

    if (body.new_revision) {
      ext.revisions = [body.new_revision, ...(ext.revisions || [])];
      modified = true;
      ext.audit_trail.unshift({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        event_type: 'revision_added',
        summary: `Revision ${body.new_revision.revision_number} added`,
        details: `Title: ${body.new_revision.title}. Status: ${body.new_revision.status}.`,
        actor: body.actor || 'Submitter',
        timestamp: new Date().toISOString(),
      });
    }

    if (body.new_comment) {
      ext.comments = [...(ext.comments || []), body.new_comment];
      modified = true;
      ext.audit_trail.unshift({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        event_type: 'comment_added',
        summary: `Comment from ${body.new_comment.author_name}`,
        details: body.new_comment.comment.slice(0, 100),
        actor: body.new_comment.author_name,
        timestamp: new Date().toISOString(),
      });
    }

    if (body.new_attachment) {
      ext.attachments = [...(ext.attachments || []), body.new_attachment];
      modified = true;
    }

    if (modified) {
      await saveSubmittalExtension(ext);
    }

    const tasks = await getProjectTasks(projectId);
    const enriched = enrichSubmittalWithSchedule(updatedSubmittal, tasks, ext);

    return NextResponse.json({ success: true, submittal: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
