import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, updateWorkflowRecord } from '@/lib/workflow-store';
import { InAppNotification } from '@/types';

export async function GET() {
  const notifications = await getWorkflowData<InAppNotification>('in_app_notifications');
  return NextResponse.json({ notifications });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updated = await updateWorkflowRecord<InAppNotification>('in_app_notifications', id, { is_read: true });
    return NextResponse.json({ success: true, notification: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
