import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { PayApplication, PayAppItem } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const payApps = await getWorkflowData<PayApplication>('pay_applications', projectId);
  
  // Attach items to each pay app
  const payAppsWithItems = await Promise.all(
    payApps.map(async (pa) => {
      const items = await getWorkflowData<PayAppItem>('pay_app_items', pa.id, 'pay_application_id');
      return { ...pa, items };
    })
  );

  return NextResponse.json({ payApplications: payAppsWithItems });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      contract_id,
      application_number,
      period_to,
      contract_amount,
      change_order_amount = 0,
      total_completed_to_date,
      retainage_pct = 10.0,
      previous_payments = 0,
      notes = '',
      items = [],
    } = body;

    const retainage_amount = (Number(total_completed_to_date) * Number(retainage_pct)) / 100;
    const current_payment_due = Number(total_completed_to_date) - retainage_amount - Number(previous_payments);

    const newPayApp = await insertWorkflowRecord<PayApplication>('pay_applications', {
      project_id,
      contract_id,
      application_number: Number(application_number || 1),
      period_to: period_to || new Date().toISOString().split('T')[0],
      contract_amount: Number(contract_amount),
      change_order_amount: Number(change_order_amount),
      total_completed_to_date: Number(total_completed_to_date),
      retainage_amount,
      previous_payments: Number(previous_payments),
      current_payment_due: Math.max(0, current_payment_due),
      status: 'submitted',
      notes,
    });

    // Save line items
    if (items && items.length > 0) {
      await Promise.all(
        items.map((item: any) =>
          insertWorkflowRecord<PayAppItem>('pay_app_items', {
            pay_application_id: newPayApp.id,
            item_code: item.item_code || '',
            description: item.description,
            scheduled_value: Number(item.scheduled_value || 0),
            work_completed_previous: Number(item.work_completed_previous || 0),
            work_completed_this_period: Number(item.work_completed_this_period || 0),
            stored_materials: Number(item.stored_materials || 0),
            total_completed: Number(item.total_completed || 0),
            pct_complete: Number(item.pct_complete || 0),
            balance_to_finish: Number(item.balance_to_finish || 0),
          })
        )
      );
    }

    return NextResponse.json({ success: true, payApplication: newPayApp }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating pay app' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (updates.status === 'approved' && !updates.approved_at) {
      updates.approved_at = new Date().toISOString();
    }

    const updated = await updateWorkflowRecord<PayApplication>('pay_applications', id, updates);
    return NextResponse.json({ success: true, payApplication: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating pay app' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord('pay_applications', id);
  return NextResponse.json({ success: true });
}
