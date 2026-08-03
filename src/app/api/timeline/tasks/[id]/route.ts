import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/** GET — Single task with related data */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const [taskRes, depsRes, assignmentsRes, commentsRes, checklistRes] = await Promise.all([
    supabase.from('project_tasks').select('*').eq('id', id).single(),
    supabase.from('task_dependencies').select('*').or(`predecessor_id.eq.${id},successor_id.eq.${id}`),
    supabase.from('task_assignments').select('*').eq('task_id', id),
    supabase.from('task_comments').select('*').eq('task_id', id).order('created_at', { ascending: false }),
    supabase.from('task_checklists').select('*').eq('task_id', id).order('sort_order'),
  ]);

  if (taskRes.error) return NextResponse.json({ error: taskRes.error.message }, { status: 500 });

  return NextResponse.json({
    task: taskRes.data,
    dependencies: depsRes.data || [],
    assignments: assignmentsRes.data || [],
    comments: commentsRes.data || [],
    checklist: checklistRes.data || [],
  });
}

/** PUT — Update a single task */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  // Track status changes
  if (body.status) {
    const { data: current } = await supabase
      .from('project_tasks')
      .select('status')
      .eq('id', id)
      .single();

    if (current && current.status !== body.status) {
      await supabase.from('task_status_history').insert({
        task_id: id,
        old_status: current.status,
        new_status: body.status,
        changed_by: body.changed_by || 'System',
      });
    }
  }

  const { data, error } = await supabase
    .from('project_tasks')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

/** DELETE — Soft-delete a task */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from('project_tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
