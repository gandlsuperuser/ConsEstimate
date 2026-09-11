import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { deleteWorkflowRecordsByFilter } from '@/lib/workflow-store';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from('projects')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    // Cascading cleanup of child tables in case foreign key cascades are missing in production
    const childTables = [
      'estimate_lines',
      'expenses',
      'rfis',
      'contracts',
      'submittals',
      'change_orders',
      'change_events',
      'pay_applications',
      'pay_app_items',
      'payments',
      'bid_packages',
      'bids',
      'field_observations',
      'project_photos',
      'timeline_events',
      'project_drawings',
      'drawing_markups',
      'action_plans',
      'action_plan_items',
      'owner_billings',
      'owner_billing_items',
      'audit_activities',
    ];

    for (const table of childTables) {
      try {
        await supabase.from(table).delete().eq('project_id', id);
      } catch {
        // Continue if table doesn't exist
      }
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clean up local workflow_store records as well
    for (const table of childTables) {
      try {
        await deleteWorkflowRecordsByFilter(table, 'project_id', id);
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('DELETE /api/projects/[id] unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to delete project' }, { status: 500 });
  }
}

