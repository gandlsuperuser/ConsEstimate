import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { VendorPartner } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  const vendors = await getWorkflowData<VendorPartner>('vendor_partners', projectId || undefined);
  return NextResponse.json({ vendors });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      company_name,
      trade,
      contact_name,
      email = '',
      phone = '',
      safety_emr_rating = 0.85,
      quality_score = 4.8,
      awarded_contracts_count = 1,
      historical_spend = 0,
      is_prequalified = true,
      notes = '',
    } = body;

    const newVendor = await insertWorkflowRecord<VendorPartner>('vendor_partners', {
      project_id,
      company_name,
      trade,
      contact_name,
      email,
      phone,
      safety_emr_rating: Number(safety_emr_rating),
      quality_score: Number(quality_score),
      awarded_contracts_count: Number(awarded_contracts_count),
      historical_spend: Number(historical_spend),
      is_prequalified: Boolean(is_prequalified),
      notes,
    });

    return NextResponse.json({ success: true, vendor: newVendor }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating vendor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord('vendor_partners', id);
  return NextResponse.json({ success: true });
}
