import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** GET /api/timeline/[projectId] — Fetch all timeline data for a project */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [phasesRes, tasksRes, depsRes, milestonesRes, calRes, holRes] = await Promise.all([
    supabase.from('project_phases').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('project_tasks').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('task_dependencies').select('*').in(
      'predecessor_id',
      (await supabase.from('project_tasks').select('id').eq('project_id', projectId)).data?.map(t => t.id) || []
    ),
    supabase.from('project_milestones').select('*').eq('project_id', projectId).order('target_date'),
    supabase.from('project_calendar').select('*').eq('project_id', projectId).single(),
    supabase.from('holidays').select('*').or(`project_id.eq.${projectId},is_global.eq.true`),
  ]);

  return NextResponse.json({
    phases: phasesRes.data || [],
    tasks: tasksRes.data || [],
    dependencies: depsRes.data || [],
    milestones: milestonesRes.data || [],
    calendar: calRes.data || null,
    holidays: holRes.data || [],
  });
}
