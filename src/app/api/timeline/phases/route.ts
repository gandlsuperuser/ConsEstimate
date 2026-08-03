import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/** GET — List phases for a project */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_phases')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ phases: data });
}

/** POST — Create a phase */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_phases')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ phase: data });
}

/** PUT — Update a phase */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_phases')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ phase: data });
}

/** DELETE — Soft-delete a phase */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from('project_phases')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
