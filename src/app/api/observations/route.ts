import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { FieldObservation } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const observations = await getWorkflowData<FieldObservation>('field_observations', projectId);
  return NextResponse.json({ observations });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      observation_number,
      category = 'quality',
      title,
      description = '',
      trade_partner = '',
      assignee = '',
      location = '',
      urgency = 'medium',
      status = 'open',
      due_date = null,
      photo_url = null,
    } = body;

    const newObs = await insertWorkflowRecord<FieldObservation>('field_observations', {
      project_id,
      observation_number: observation_number || `OBS-${Math.floor(100 + Math.random() * 900)}`,
      category,
      title,
      description,
      trade_partner,
      assignee,
      location,
      urgency,
      status,
      due_date,
      photo_url,
    });

    return NextResponse.json({ success: true, observation: newObs }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating observation' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updated = await updateWorkflowRecord<FieldObservation>('field_observations', id, updates);
    return NextResponse.json({ success: true, observation: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating observation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord('field_observations', id);
  return NextResponse.json({ success: true });
}
