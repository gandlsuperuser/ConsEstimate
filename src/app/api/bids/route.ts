import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { BidPackage, Bid } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const packages = await getWorkflowData<BidPackage>('bid_packages', projectId);
  
  // Attach bids to each package
  const packagesWithBids = await Promise.all(
    packages.map(async (pkg) => {
      const bids = await getWorkflowData<Bid>('bids', pkg.id, 'bid_package_id');
      return { ...pkg, bids };
    })
  );

  return NextResponse.json({ packages: packagesWithBids });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_bid') {
      const { bid_package_id, subcontractor_name, base_bid_amount, alternate_amount, inclusions, exclusions, notes } = body;
      const newBid = await insertWorkflowRecord<Bid>('bids', {
        bid_package_id,
        subcontractor_name,
        base_bid_amount: Number(base_bid_amount),
        alternate_amount: Number(alternate_amount || 0),
        inclusions: inclusions || '',
        exclusions: exclusions || '',
        submitted_date: new Date().toISOString().split('T')[0],
        status: 'submitted',
        notes: notes || '',
      });
      return NextResponse.json({ success: true, bid: newBid }, { status: 201 });
    }

    if (action === 'award_bid') {
      const { package_id, bid_id, subcontractor_name, contract_amount, project_id, title } = body;
      
      // Update bid and package status
      await updateWorkflowRecord('bid_packages', package_id, {
        status: 'awarded',
        awarded_bid_id: bid_id,
      });

      await updateWorkflowRecord('bids', bid_id, {
        status: 'awarded',
      });

      // Automatically generate a Contract in draft status
      const newContract = await insertWorkflowRecord('contracts', {
        project_id,
        contract_number: `SC-${Math.floor(1000 + Math.random() * 9000)}`,
        title: title || `Subcontract - ${subcontractor_name}`,
        vendor_name: subcontractor_name,
        contract_type: 'subcontract',
        original_amount: Number(contract_amount),
        revised_amount: Number(contract_amount),
        retainage_pct: 10.0,
        start_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        approval_step: 'Executive Review',
        notes: `Auto-generated from awarded bid package ${package_id}`,
      });

      return NextResponse.json({ success: true, contract: newContract });
    }

    // Default: create bid package
    const { project_id, title, trade, division_code, scope_description, estimated_budget, due_date } = body;
    const newPackage = await insertWorkflowRecord<BidPackage>('bid_packages', {
      project_id,
      title,
      trade: trade || 'General',
      division_code: division_code || '01',
      scope_description: scope_description || '',
      estimated_budget: Number(estimated_budget || 0),
      due_date: due_date || new Date().toISOString().split('T')[0],
      status: 'open',
    });

    return NextResponse.json({ success: true, package: newPackage }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing bid request' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'package';

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord(type === 'bid' ? 'bids' : 'bid_packages', id);
  return NextResponse.json({ success: true });
}
