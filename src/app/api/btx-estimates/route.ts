import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, updateWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { createClient } from '@/lib/supabase-server';
import { BTXEstimate } from '@/types';

const SEED_ESTIMATE_ITEMS = [
  {
    id: 'item-1',
    item_number: 1,
    description: 'Concrete',
    details: 'Additional concrete required for Phase 1 change order as requested by Humana engineer.',
    amount: 5800.0,
  },
  {
    id: 'item-2',
    item_number: 2,
    description: 'Electrical',
    details: 'Change order as per engineer. New wiring to new patient room. Material and electrician included.',
    amount: 1960.0,
  },
  {
    id: 'item-3',
    item_number: 3,
    description: 'HVAC – Duct',
    details: 'Change order per engineer. New duct requested by engineer. New duct fabricated.',
    amount: 1222.0,
  },
  {
    id: 'item-4',
    item_number: 4,
    description: 'HVAC – Labor',
    details: 'Labor for installation of new HVAC ductwork.',
    amount: 1500.0,
  },
  {
    id: 'item-5',
    item_number: 5,
    description: 'Additional Wall',
    details: 'Additional wall to be added as requested by engineer. Drywall material included.',
    amount: 6700.0,
  },
  {
    id: 'item-6',
    item_number: 6,
    description: 'Inspector & Permit Fees',
    details: 'Inspector fee and City permit fee for additional change.',
    amount: 685.0,
  },
  {
    id: 'item-7',
    item_number: 7,
    description: 'ADA Ramp',
    details: 'Additional ADA ramp requested by Humana engineer to build. Includes concrete slab, aluminum rail, and landing ramp.',
    amount: 2952.0,
  },
];

const DEFAULT_NOTES = [
  'This proposal includes only the scope of work listed above.',
  'Any additional work, unforeseen conditions, or changes to the scope will be addressed via a written change order.',
  'Permits, testing, or inspections (if required) are included only as specifically noted.',
  'BTX Contractors is not responsible for concealed conditions such as existing electrical, plumbing, structural, or hazardous materials (including asbestos).',
  'This proposal is valid for 30 days from the date above.',
  'Payment terms: Net 30, unless otherwise agreed in writing.',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Retrieve active project details from Supabase
    let currentProjectName = 'CONVIVA JOURDANTON';
    let currentClientName = 'Humana – Conviva';
    let currentLocation = 'Jourdanton, TX';
    try {
      const supabase = await createClient();
      const { data: project } = await supabase
        .from('projects')
        .select('id, name, client_name, address')
        .eq('id', projectId)
        .single();

      if (project) {
        if (project.name) currentProjectName = project.name;
        if (project.client_name) currentClientName = project.client_name;
        if (project.address) currentLocation = project.address;
      }
    } catch {
      // ignore
    }

    let estimates = await getWorkflowData<BTXEstimate>('btx_estimates', projectId);

    if (!estimates || estimates.length === 0) {
      const defaultEstimate: BTXEstimate = {
        id: `est-${Date.now()}`,
        project_id: projectId,
        title: 'Phase 1 – Additional Work / Change Order',
        bid_number: 'BTX-HC-0926-02',
        estimate_date: 'September 12, 2026',
        client_name: currentClientName,
        project_name: currentProjectName,
        location: currentLocation,
        scope: 'Phase 1 – Additional Work / Change Order',
        intro_text:
          "BTX Contractors is pleased to provide the following proposal for the above referenced project. This change order includes labor, materials, and equipment as outlined below, per the Humana engineer's request.",
        items: SEED_ESTIMATE_ITEMS,
        total_amount: 20819.0,
        notes_and_clarifications: DEFAULT_NOTES,
        closing_text: 'We appreciate the opportunity to work with Humana–Conviva and look forward to a successful project.',
        submitted_by_name: 'Raul Ayala',
        submitted_by_title: 'Project Manager',
        submitted_by_company: 'BTX Contractors',
        submitted_by_date: '',
        accepted_by_name: 'Humana – Conviva',
        accepted_by_date: '',
        status: 'submitted',
        created_at: new Date().toISOString(),
      };

      await insertWorkflowRecord('btx_estimates', defaultEstimate);
      estimates = await getWorkflowData<BTXEstimate>('btx_estimates', projectId);
    } else {
      // Ensure estimates match the current project name
      for (const est of estimates) {
        if (!est.project_name || est.project_name === 'Jourdanton Medical Center') {
          est.project_name = currentProjectName;
          await updateWorkflowRecord('btx_estimates', est.id, { project_name: currentProjectName });
        }
      }
    }

    return NextResponse.json({ estimates });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch estimates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      title = 'New Proposal / Change Order',
      bid_number = `BTX-${Math.floor(1000 + Math.random() * 9000)}`,
      estimate_date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      client_name = 'Humana – Conviva',
      project_name,
      location = 'Jourdanton, TX',
      scope = 'Phase 1 – Additional Work / Change Order',
      intro_text = "BTX Contractors is pleased to provide the following proposal for the above referenced project. This change order includes labor, materials, and equipment as outlined below, per the Humana engineer's request.",
      items = [],
      notes_and_clarifications = DEFAULT_NOTES,
      closing_text = 'We appreciate the opportunity to work with Humana–Conviva and look forward to a successful project.',
      submitted_by_name = 'Raul Ayala',
      submitted_by_title = 'Project Manager',
      submitted_by_company = 'BTX Contractors',
      accepted_by_name = 'Humana – Conviva',
    } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    // If project_name not explicitly provided, fetch from Supabase
    let finalProjectName = project_name;
    if (!finalProjectName) {
      try {
        const supabase = await createClient();
        const { data: proj } = await supabase.from('projects').select('name').eq('id', project_id).single();
        finalProjectName = proj?.name || 'CONVIVA JOURDANTON';
      } catch {
        finalProjectName = 'CONVIVA JOURDANTON';
      }
    }

    interface IncomingItem {
      id?: string;
      description?: string;
      details?: string;
      amount?: number;
    }

    const typedItems = items as IncomingItem[];
    const calculatedTotal = typedItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

    const newEstimate: BTXEstimate = {
      id: `est-${Date.now()}`,
      project_id,
      title,
      bid_number,
      estimate_date,
      client_name,
      project_name: finalProjectName,
      location,
      scope,
      intro_text,
      items: typedItems.map((it, idx) => ({
        id: it.id || `item-${Date.now()}-${idx}`,
        item_number: idx + 1,
        description: it.description || '',
        details: it.details || '',
        amount: Number(it.amount) || 0,
      })),
      total_amount: calculatedTotal,
      notes_and_clarifications,
      closing_text,
      submitted_by_name,
      submitted_by_title,
      submitted_by_company,
      submitted_by_date: '',
      accepted_by_name,
      accepted_by_date: '',
      status: 'draft',
      created_at: new Date().toISOString(),
    };

    const saved = await insertWorkflowRecord<BTXEstimate>('btx_estimates', newEstimate);
    return NextResponse.json({ success: true, estimate: saved }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create estimate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, items, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Estimate ID is required' }, { status: 400 });
    }

    const patchData: Partial<BTXEstimate> = { ...updates };

    if (items) {
      interface IncomingItem {
        id?: string;
        description?: string;
        details?: string;
        amount?: number;
      }
      const typedItems = items as IncomingItem[];
      const calculatedTotal = typedItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
      patchData.items = typedItems.map((it, idx) => ({
        id: it.id || `item-${idx + 1}`,
        item_number: idx + 1,
        description: it.description || '',
        details: it.details || '',
        amount: Number(it.amount) || 0,
      }));
      patchData.total_amount = calculatedTotal;
    }

    patchData.updated_at = new Date().toISOString();

    const updated = await updateWorkflowRecord<BTXEstimate>('btx_estimates', id, patchData);
    return NextResponse.json({ success: true, estimate: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update estimate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Estimate ID is required' }, { status: 400 });
    }

    await deleteWorkflowRecord('btx_estimates', id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete estimate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
