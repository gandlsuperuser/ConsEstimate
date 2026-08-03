import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/** POST — Create a dependency */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_dependencies')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dependency: data });
}

/** DELETE — Remove a dependency */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
