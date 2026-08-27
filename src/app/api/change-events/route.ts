import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { ChangeEvent, ChangeOrder } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const changeEvents = await getWorkflowData<ChangeEvent>('change_events', projectId);
  return NextResponse.json({ changeEvents });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Cross-module action: Convert Change Event to Change Order
    if (action === 'create_change_order') {
      const { change_event_id, project_id, title, contract_id, amount, time_extension_days, co_type = 'subcontract' } = body;

      const newCO = await insertWorkflowRecord<ChangeOrder>('change_orders', {
        project_id,
        co_number: `PCO-${Math.floor(100 + Math.random() * 900)}`,
        title: title || 'Change Order from CE',
        co_type,
        contract_id: contract_id || null,
        amount: Number(amount || 0),
        time_extension_days: Number(time_extension_days || 0),
        status: 'pending_approval',
        description: `Created from Change Event ${change_event_id}`,
      });

      // Update Change Event status
      await updateWorkflowRecord<ChangeEvent>('change_events', change_event_id, {
        status: 'approved',
        change_order_id: newCO.id,
      });

      return NextResponse.json({ success: true, change_order: newCO });
    }

    // Default: create change event
    const {
      project_id,
      event_number,
      title,
      description = '',
      origin_rfi_id = null,
      trade = '',
      estimated_cost = 0,
      contingency_allocation = 0,
      schedule_delay_days = 0,
      status = 'pricing',
    } = body;

    const newCE = await insertWorkflowRecord<ChangeEvent>('change_events', {
      project_id,
      event_number: event_number || `CE-${Math.floor(100 + Math.random() * 900)}`,
      title,
      description,
      origin_rfi_id,
      trade,
      estimated_cost: Number(estimated_cost),
      contingency_allocation: Number(contingency_allocation),
      schedule_delay_days: Number(schedule_delay_days),
      status,
    });

    return NextResponse.json({ success: true, change_event: newCE }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing change event' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updated = await updateWorkflowRecord<ChangeEvent>('change_events', id, updates);
    return NextResponse.json({ success: true, change_event: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating change event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord('change_events', id);
  return NextResponse.json({ success: true });
}
