import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { ActionPlan, ActionPlanItem } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const plans = await getWorkflowData<ActionPlan>('action_plans', projectId);
  
  const plansWithItems = await Promise.all(
    plans.map(async (plan) => {
      const items = await getWorkflowData<ActionPlanItem>('action_plan_items', plan.id, 'action_plan_id');
      return { ...plan, items };
    })
  );

  return NextResponse.json({ actionPlans: plansWithItems });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'toggle_item') {
      const { item_id, is_completed, completed_by } = body;
      const updated = await updateWorkflowRecord<ActionPlanItem>('action_plan_items', item_id, {
        is_completed: Boolean(is_completed),
        completed_by: is_completed ? (completed_by || 'Robert Mason (Superintendent)') : null,
        completed_at: is_completed ? new Date().toISOString() : null,
      });
      return NextResponse.json({ success: true, item: updated });
    }

    const { project_id, plan_number, title, plan_type = 'pre_installation', assigned_to, due_date, items = [] } = body;
    
    const newPlan = await insertWorkflowRecord<ActionPlan>('action_plans', {
      project_id,
      plan_number: plan_number || `AP-${Math.floor(100 + Math.random() * 900)}`,
      title,
      plan_type,
      status: 'in_progress',
      assigned_to: assigned_to || 'Superintendent',
      due_date: due_date || null,
    });

    if (items && items.length > 0) {
      await Promise.all(
        items.map((it: any, idx: number) =>
          insertWorkflowRecord<ActionPlanItem>('action_plan_items', {
            action_plan_id: newPlan.id,
            step_number: idx + 1,
            section: it.section || 'General Requirements',
            requirement_title: it.requirement_title,
            is_completed: false,
            notes: it.notes || '',
          })
        )
      );
    }

    return NextResponse.json({ success: true, actionPlan: newPlan }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating action plan' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord('action_plans', id);
  return NextResponse.json({ success: true });
}
