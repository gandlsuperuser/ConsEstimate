import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { Payment } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const payments = await getWorkflowData<Payment>('payments', projectId);
  return NextResponse.json({ payments });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      pay_application_id = null,
      recipient_name,
      amount,
      payment_date,
      payment_method = 'ACH',
      funding_account = 'Operating Account',
      check_or_tx_number = '',
      status = 'scheduled',
      notes = '',
    } = body;

    if (!project_id || !recipient_name || amount === undefined) {
      return NextResponse.json({ error: 'project_id, recipient_name, and amount are required' }, { status: 400 });
    }

    const newPayment = await insertWorkflowRecord<Payment>('payments', {
      project_id,
      pay_application_id,
      recipient_name,
      amount: Number(amount),
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      payment_method,
      funding_account,
      check_or_tx_number: check_or_tx_number || `TX-${Math.floor(100000 + Math.random() * 900000)}`,
      status,
      cleared_at: status === 'completed' ? new Date().toISOString() : null,
      notes,
    });

    return NextResponse.json({ success: true, payment: newPayment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating payment' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (updates.status === 'completed' && !updates.cleared_at) {
      updates.cleared_at = new Date().toISOString();
    }

    const updated = await updateWorkflowRecord<Payment>('payments', id, updates);
    return NextResponse.json({ success: true, payment: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating payment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord('payments', id);
  return NextResponse.json({ success: true });
}
