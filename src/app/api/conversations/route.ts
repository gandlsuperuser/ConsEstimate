import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { ProjectMessage } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const messages = await getWorkflowData<ProjectMessage>('project_messages', projectId);
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, sender_name = 'Mo Li (PM)', sender_role = 'Project Manager', recipient_group = 'All Team', message_text, linked_record_type, linked_record_id } = body;

    if (!project_id || !message_text) {
      return NextResponse.json({ error: 'project_id and message_text required' }, { status: 400 });
    }

    const newMessage = await insertWorkflowRecord<ProjectMessage>('project_messages', {
      project_id,
      sender_name,
      sender_role,
      recipient_group,
      message_text,
      linked_record_type: linked_record_type || null,
      linked_record_id: linked_record_id || null,
    });

    return NextResponse.json({ success: true, message: newMessage }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating message' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord('project_messages', id);
  return NextResponse.json({ success: true });
}
