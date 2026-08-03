import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/** POST — Create a milestone */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_milestones')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ milestone: data });
}

/** PUT — Update a milestone */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_milestones')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ milestone: data });
}
