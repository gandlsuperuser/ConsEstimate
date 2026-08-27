import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { ChangeOrder, Contract } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const changeOrders = await getWorkflowData<ChangeOrder>('change_orders', projectId);
  return NextResponse.json({ changeOrders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      co_number,
      title,
      co_type = 'subcontract',
      contract_id = null,
      amount = 0,
      time_extension_days = 0,
      status = 'draft',
      description = '',
    } = body;

    const newCO = await insertWorkflowRecord<ChangeOrder>('change_orders', {
      project_id,
      co_number: co_number || `CO-${Math.floor(100 + Math.random() * 900)}`,
      title,
      co_type,
      contract_id,
      amount: Number(amount),
      time_extension_days: Number(time_extension_days),
      status,
      approval_date: status === 'approved' || status === 'executed' ? new Date().toISOString().split('T')[0] : null,
      description,
    });

    // If approved on creation and linked to a contract, adjust contract revised amount
    if ((status === 'approved' || status === 'executed') && contract_id) {
      const contracts = await getWorkflowData<Contract>('contracts', project_id);
      const contract = contracts.find((c) => c.id === contract_id);
      if (contract) {
        await updateWorkflowRecord<Contract>('contracts', contract_id, {
          revised_amount: Number(contract.revised_amount || contract.original_amount) + Number(amount),
        });
      }
    }

    return NextResponse.json({ success: true, change_order: newCO }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating change order' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, project_id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (updates.status === 'approved' || updates.status === 'executed') {
      updates.approval_date = updates.approval_date || new Date().toISOString().split('T')[0];

      // If approved and linked to contract, update contract revised amount
      if (updates.contract_id && project_id) {
        const contracts = await getWorkflowData<Contract>('contracts', project_id);
        const contract = contracts.find((c) => c.id === updates.contract_id);
        if (contract && updates.amount) {
          await updateWorkflowRecord<Contract>('contracts', updates.contract_id, {
            revised_amount: Number(contract.original_amount) + Number(updates.amount),
          });
        }
      }
    }

    const updated = await updateWorkflowRecord<ChangeOrder>('change_orders', id, updates);
    return NextResponse.json({ success: true, change_order: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating change order' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord('change_orders', id);
  return NextResponse.json({ success: true });
}
