import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { RFI, ChangeEvent } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const rfis = await getWorkflowData<RFI>('rfis', projectId);
  return NextResponse.json({ rfis });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Cross-module action: Convert RFI to Change Event
    if (action === 'convert_to_change_event') {
      const { rfi_id, project_id, title, estimated_cost, schedule_delay_days, trade } = body;

      const newCE = await insertWorkflowRecord<ChangeEvent>('change_events', {
        project_id,
        event_number: `CE-${Math.floor(100 + Math.random() * 900)}`,
        title: title || `Change Event from RFI`,
        origin_rfi_id: rfi_id,
        trade: trade || 'Mechanical / Electrical',
        estimated_cost: Number(estimated_cost || 0),
        contingency_allocation: Number(estimated_cost || 0),
        schedule_delay_days: Number(schedule_delay_days || 0),
        status: 'pricing',
      });

      // Mark RFI as linked to this change event
      await updateWorkflowRecord<RFI>('rfis', rfi_id, {
        has_change_event: true,
        change_event_id: newCE.id,
      });

      return NextResponse.json({ success: true, change_event: newCE });
    }

    // Default: create RFI
    const {
      project_id,
      rfi_number,
      subject,
      question,
      assigned_to = 'Architect / Engineer',
      drawing_number = '',
      spec_section = '',
      schedule_impact_days = 0,
      cost_impact_estimate = 0,
      status = 'open',
      official_response = '',
    } = body;

    const newRFI = await insertWorkflowRecord<RFI>('rfis', {
      project_id,
      rfi_number: rfi_number || `RFI-${Math.floor(100 + Math.random() * 900)}`,
      subject,
      question,
      assigned_to,
      drawing_number,
      spec_section,
      schedule_impact_days: Number(schedule_impact_days),
      cost_impact_estimate: Number(cost_impact_estimate),
      status,
      official_response,
      responded_at: official_response ? new Date().toISOString() : null,
      has_change_event: false,
    });

    return NextResponse.json({ success: true, rfi: newRFI }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing RFI' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (updates.official_response && !updates.responded_at) {
      updates.responded_at = new Date().toISOString();
      if (updates.status === 'open') updates.status = 'responded';
    }

    const updated = await updateWorkflowRecord<RFI>('rfis', id, updates);
    return NextResponse.json({ success: true, rfi: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating RFI' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord('rfis', id);
  return NextResponse.json({ success: true });
}
