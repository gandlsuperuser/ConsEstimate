import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { Submittal } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const submittals = await getWorkflowData<Submittal>('submittals', projectId);
  return NextResponse.json({ submittals });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      spec_division,
      submittal_number,
      title,
      description = '',
      subcontractor_name = '',
      approver_name = '',
      received_date,
      required_on_site_date,
      lead_time_weeks = 2,
      status = 'pending',
      is_substitution = false,
      substitution_cost_delta = 0,
      schedule_risk_level = 'low',
      notes = '',
    } = body;

    const newSubmittal = await insertWorkflowRecord<Submittal>('submittals', {
      project_id,
      spec_division: spec_division || '23 - HVAC',
      submittal_number: submittal_number || `SUB-${Math.floor(100 + Math.random() * 900)}`,
      title,
      description,
      subcontractor_name,
      approver_name,
      received_date: received_date || new Date().toISOString().split('T')[0],
      required_on_site_date: required_on_site_date || null,
      lead_time_weeks: Number(lead_time_weeks),
      status,
      is_substitution: Boolean(is_substitution),
      substitution_cost_delta: Number(substitution_cost_delta),
      schedule_risk_level,
      notes,
    });

    return NextResponse.json({ success: true, submittal: newSubmittal }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating submittal' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updated = await updateWorkflowRecord<Submittal>('submittals', id, updates);
    return NextResponse.json({ success: true, submittal: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating submittal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord('submittals', id);
  return NextResponse.json({ success: true });
}
