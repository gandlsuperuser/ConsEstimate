import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord } from '@/lib/workflow-store';
import { AuditActivity } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  const activities = await getWorkflowData<AuditActivity>('audit_activities', projectId || undefined);
  
  if (activities.length === 0) {
    // Default audit events for transparency
    const sampleActivities: AuditActivity[] = [
      {
        id: 'act-1',
        project_id: projectId || 'demo',
        actor_name: 'Mo Li (PM)',
        action_type: 'execute',
        module: 'Contracts',
        description: 'Executed Subcontract SC-2301-APEX for $44,500 with Apex Mechanical Contractors.',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'act-2',
        project_id: projectId || 'demo',
        actor_name: 'Structural Engineer',
        action_type: 'update',
        module: 'RFIs',
        description: 'Issued official design response to RFI-042 (Curb structural discrepancy).',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'act-3',
        project_id: projectId || 'demo',
        actor_name: 'Lead Estimator',
        action_type: 'approve',
        module: 'Change Orders',
        description: 'Approved PCO-005 (+ $3,200) adjusting commitment to $47,700.',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'act-4',
        project_id: projectId || 'demo',
        actor_name: 'Accounting Lead',
        action_type: 'disburse',
        module: 'Payments',
        description: 'Disbursed ACH-8892104 for $22,500 against Pay Application #1.',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
      },
    ];
    return NextResponse.json({ activities: sampleActivities });
  }

  return NextResponse.json({ activities });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, actor_name, action_type, module, description } = body;

    const newActivity = await insertWorkflowRecord<AuditActivity>('audit_activities', {
      project_id,
      actor_name: actor_name || 'System User',
      action_type: action_type || 'update',
      module: module || 'General',
      description,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, activity: newActivity }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating audit log' }, { status: 500 });
  }
}
