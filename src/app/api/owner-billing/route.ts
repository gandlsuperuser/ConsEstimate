import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, batchInsertWorkflowRecords, updateWorkflowRecord, deleteWorkflowRecord, deleteWorkflowRecordsByFilter } from '@/lib/workflow-store';
import { OwnerBilling, OwnerBillingItem } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const billings = await getWorkflowData<OwnerBilling>('owner_billings', projectId);

  // Attach items to each billing sorted strictly by item_number
  const billingsWithItems = await Promise.all(
    billings.map(async (b) => {
      const items = await getWorkflowData<OwnerBillingItem>('owner_billing_items', b.id, 'billing_id');
      items.sort((a, b) => (Number(a.item_number) || 0) - (Number(b.item_number) || 0));
      return { ...b, items };
    })
  );

  return NextResponse.json(
    { billings: billingsWithItems },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      application_number = 1,
      period_to,
      owner_name = '',
      owner_address = '',
      contractor_name = '',
      contractor_address = '',
      contract_for = '',
      via_architect = '',
      project_nos = '',
      contract_date = '',
      distribution_to = [],
      original_contract_sum = 0,
      net_change_orders = 0,
      total_completed_and_stored = 0,
      retainage_completed_pct = 0.0,
      retainage_stored_pct = 0.0,
      less_previous_certificates = 0,
      change_order_additions = 0,
      change_order_deductions = 0,
      status = 'submitted',
      items = [],
    } = body;

    const contract_sum_to_date = Number(original_contract_sum) + Number(net_change_orders);
    const retainage_amount = (Number(total_completed_and_stored) * Number(retainage_completed_pct)) / 100;
    const total_earned_less_retainage = Number(total_completed_and_stored) - retainage_amount;
    const current_payment_due = total_earned_less_retainage - Number(less_previous_certificates);
    const balance_to_finish_incl_retainage = contract_sum_to_date - total_earned_less_retainage;

    const newBilling = await insertWorkflowRecord<OwnerBilling>('owner_billings', {
      project_id,
      application_number: Number(application_number),
      period_to: period_to || new Date().toISOString().split('T')[0],
      owner_name,
      owner_address,
      contractor_name,
      contractor_address,
      contract_for,
      via_architect,
      project_nos,
      contract_date,
      distribution_to,
      original_contract_sum: Number(original_contract_sum),
      net_change_orders: Number(net_change_orders),
      contract_sum_to_date,
      total_completed_and_stored: Number(total_completed_and_stored),
      retainage_completed_pct: Number(retainage_completed_pct),
      retainage_stored_pct: Number(retainage_stored_pct),
      retainage_amount,
      total_earned_less_retainage,
      less_previous_certificates: Number(less_previous_certificates),
      current_payment_due: Math.max(0, current_payment_due),
      balance_to_finish_incl_retainage: Math.max(0, balance_to_finish_incl_retainage),
      change_order_additions: Number(change_order_additions),
      change_order_deductions: Number(change_order_deductions),
      project_name: body.project_name || '',
      project_address: body.project_address || '',
      purchase_order: body.purchase_order || '',
      contractor_signature_by: body.contractor_signature_by || '',
      contractor_signature_date: body.contractor_signature_date || '',
      state_of: body.state_of || '',
      county_of: body.county_of || '',
      notary_day: body.notary_day || '',
      notary_month_year: body.notary_month_year || '',
      notary_public: body.notary_public || '',
      notary_commission_expires: body.notary_commission_expires || '',
      amount_certified: body.amount_certified !== undefined ? Number(body.amount_certified) : current_payment_due,
      architect_signature_by: body.architect_signature_by || '',
      architect_signature_date: body.architect_signature_date || '',
      status,
    });

    // Save continuation sheet items in batch to maintain exact sheet order instantly
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any, idx: number) => ({
        billing_id: newBilling.id,
        item_number: item.item_number ?? idx + 1,
        description: item.description || '',
        scheduled_value: Number(item.scheduled_value || 0),
        work_completed_previous: Number(item.work_completed_previous || 0),
        work_completed_this_period: Number(item.work_completed_this_period || 0),
        stored_materials: Number(item.stored_materials || 0),
        total_completed: Number(item.total_completed || 0),
        pct_complete: Number(item.pct_complete || 0),
        balance_to_finish: Number(item.balance_to_finish || 0),
        retainage: Number(item.retainage || 0),
        scheduled_value_formula: item.scheduled_value_formula || undefined,
        work_completed_previous_formula: item.work_completed_previous_formula || undefined,
        work_completed_this_period_formula: item.work_completed_this_period_formula || undefined,
        stored_materials_formula: item.stored_materials_formula || undefined,
      }));
      await batchInsertWorkflowRecords<OwnerBillingItem>('owner_billing_items', itemsToInsert);
      return NextResponse.json({ success: true, billing: { ...newBilling, items: itemsToInsert } }, { status: 201 });
    }

    return NextResponse.json({ success: true, billing: { ...newBilling, items: [] } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating owner billing' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, items, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const original_contract_sum = Number(updates.original_contract_sum ?? body.original_contract_sum ?? 0);
    const net_change_orders = Number(updates.net_change_orders ?? body.net_change_orders ?? 0);
    const total_completed_and_stored = Number(updates.total_completed_and_stored ?? body.total_completed_and_stored ?? 0);
    const retainage_completed_pct = Number(updates.retainage_completed_pct ?? body.retainage_completed_pct ?? 0);
    const less_previous_certificates = Number(updates.less_previous_certificates ?? body.less_previous_certificates ?? 0);

    const contract_sum_to_date = original_contract_sum + net_change_orders;
    const retainage_amount = (total_completed_and_stored * retainage_completed_pct) / 100;
    const total_earned_less_retainage = total_completed_and_stored - retainage_amount;
    const current_payment_due = total_earned_less_retainage - less_previous_certificates;
    const balance_to_finish_incl_retainage = contract_sum_to_date - total_earned_less_retainage;

    const fullUpdates = {
      ...updates,
      contract_sum_to_date: updates.contract_sum_to_date ?? contract_sum_to_date,
      retainage_amount: updates.retainage_amount ?? retainage_amount,
      total_earned_less_retainage: updates.total_earned_less_retainage ?? total_earned_less_retainage,
      current_payment_due: updates.current_payment_due ?? Math.max(0, current_payment_due),
      balance_to_finish_incl_retainage: updates.balance_to_finish_incl_retainage ?? Math.max(0, balance_to_finish_incl_retainage),
    };

    const updated = await updateWorkflowRecord<OwnerBilling>('owner_billings', id, fullUpdates);

    // Replace items if provided
    let insertedItems: any[] = [];
    if (items && Array.isArray(items)) {
      // Cleanly delete existing items atomically
      await deleteWorkflowRecordsByFilter('owner_billing_items', 'billing_id', id);

      insertedItems = items.map((item: any, idx: number) => ({
        billing_id: id,
        item_number: item.item_number ?? idx + 1,
        description: item.description || '',
        scheduled_value: Number(item.scheduled_value || 0),
        work_completed_previous: Number(item.work_completed_previous || 0),
        work_completed_this_period: Number(item.work_completed_this_period || 0),
        stored_materials: Number(item.stored_materials || 0),
        total_completed: Number(item.total_completed || 0),
        pct_complete: Number(item.pct_complete || 0),
        balance_to_finish: Number(item.balance_to_finish || 0),
        retainage: Number(item.retainage || 0),
        scheduled_value_formula: item.scheduled_value_formula || undefined,
        work_completed_previous_formula: item.work_completed_previous_formula || undefined,
        work_completed_this_period_formula: item.work_completed_this_period_formula || undefined,
        stored_materials_formula: item.stored_materials_formula || undefined,
      }));

      await batchInsertWorkflowRecords<OwnerBillingItem>('owner_billing_items', insertedItems);
    }

    return NextResponse.json({
      success: true,
      billing: {
        ...updated,
        items: items && Array.isArray(items) ? insertedItems : undefined,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating owner billing' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Delete items first
  const items = await getWorkflowData<OwnerBillingItem>('owner_billing_items', id, 'billing_id');
  await Promise.all(items.map((item) => deleteWorkflowRecord('owner_billing_items', item.id)));

  await deleteWorkflowRecord('owner_billings', id);
  return NextResponse.json({ success: true });
}
