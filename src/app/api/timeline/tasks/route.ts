import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** GET — List tasks for a project */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data });
}

/** POST — Create a task */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();

  // Calculate working days if not provided
  if (!body.working_days && body.start_date && body.end_date) {
    const start = new Date(body.start_date);
    const end = new Date(body.end_date);
    let wd = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) wd++;
      cur.setDate(cur.getDate() + 1);
    }
    body.working_days = wd;
  }

  if (!body.duration && body.working_days) {
    body.duration = body.working_days;
  }

  const { data, error } = await supabase
    .from('project_tasks')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

/** PUT — Bulk update tasks (for drag/drop, reordering) */
export async function PUT(request: NextRequest) {
  const { tasks } = await request.json();
  if (!Array.isArray(tasks)) return NextResponse.json({ error: 'tasks array required' }, { status: 400 });

  const supabase = await createClient();
  const results = [];

  for (const t of tasks) {
    const { id, ...updates } = t;
    const { data, error } = await supabase
      .from('project_tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    results.push(data);
  }

  return NextResponse.json({ tasks: results });
}
