import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { OwnerBilling } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const billings = await getWorkflowData<OwnerBilling>('owner_billings', projectId);
  return NextResponse.json({ billings });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      application_number = 1,
      period_to,
      original_contract_sum,
      net_change_orders = 0,
      total_completed_and_stored,
      retainage_pct = 10.0,
      less_previous_certificates = 0,
      status = 'submitted',
    } = body;

    const contract_sum_to_date = Number(original_contract_sum) + Number(net_change_orders);
    const retainage_amount = (Number(total_completed_and_stored) * Number(retainage_pct)) / 100;
    const total_earned_less_retainage = Number(total_completed_and_stored) - retainage_amount;
    const current_payment_due = total_earned_less_retainage - Number(less_previous_certificates);

    const newBilling = await insertWorkflowRecord<OwnerBilling>('owner_billings', {
      project_id,
      application_number: Number(application_number),
      period_to: period_to || new Date().toISOString().split('T')[0],
      original_contract_sum: Number(original_contract_sum),
      net_change_orders: Number(net_change_orders),
      contract_sum_to_date,
      total_completed_and_stored: Number(total_completed_and_stored),
      retainage_amount,
      total_earned_less_retainage,
      less_previous_certificates: Number(less_previous_certificates),
      current_payment_due: Math.max(0, current_payment_due),
      status,
    });

    return NextResponse.json({ success: true, billing: newBilling }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating owner billing' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updated = await updateWorkflowRecord<OwnerBilling>('owner_billings', id, updates);
    return NextResponse.json({ success: true, billing: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating owner billing' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord('owner_billings', id);
  return NextResponse.json({ success: true });
}
