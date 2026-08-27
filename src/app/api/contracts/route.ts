import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { Contract } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const contracts = await getWorkflowData<Contract>('contracts', projectId);
  return NextResponse.json({ contracts });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      contract_number,
      title,
      vendor_name,
      contract_type = 'subcontract',
      original_amount,
      retainage_pct = 10.0,
      start_date,
      completion_date,
      status = 'draft',
      notes = '',
    } = body;

    if (!project_id || !vendor_name || original_amount === undefined) {
      return NextResponse.json({ error: 'project_id, vendor_name, and original_amount are required' }, { status: 400 });
    }

    const newContract = await insertWorkflowRecord<Contract>('contracts', {
      project_id,
      contract_number: contract_number || `SC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title || `Contract - ${vendor_name}`,
      vendor_name,
      contract_type,
      original_amount: Number(original_amount),
      revised_amount: Number(original_amount),
      retainage_pct: Number(retainage_pct),
      start_date: start_date || new Date().toISOString().split('T')[0],
      completion_date: completion_date || null,
      status,
      approval_step: status === 'executed' ? 'Executed' : 'PM Review',
      notes,
    });

    return NextResponse.json({ success: true, contract: newContract }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating contract' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (updates.status === 'executed' && !updates.e_signed_at) {
      updates.e_signed_at = new Date().toISOString();
      updates.approval_step = 'Fully Executed';
    }

    const updated = await updateWorkflowRecord<Contract>('contracts', id, updates);
    return NextResponse.json({ success: true, contract: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating contract' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord('contracts', id);
  return NextResponse.json({ success: true });
}
