import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord } from '@/lib/workflow-store';
import { EstimateCatalogItem } from '@/types';

const SEED_CATALOG_ITEMS: EstimateCatalogItem[] = [
  {
    id: 'cat-1',
    description: 'Concrete',
    details: 'Additional concrete required for Phase 1 change order as requested by Humana engineer.',
    default_amount: 5800.0,
    category: 'Concrete',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    description: 'Electrical',
    details: 'Change order as per engineer. New wiring to new patient room. Material and electrician included.',
    default_amount: 1960.0,
    category: 'Electrical',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-3',
    description: 'HVAC – Duct',
    details: 'Change order per engineer. New duct requested by engineer. New duct fabricated.',
    default_amount: 1222.0,
    category: 'HVAC',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-4',
    description: 'HVAC – Labor',
    details: 'Labor for installation of new HVAC ductwork.',
    default_amount: 1500.0,
    category: 'HVAC',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-5',
    description: 'Additional Wall',
    details: 'Additional wall to be added as requested by engineer. Drywall material included.',
    default_amount: 6700.0,
    category: 'Drywall / Framing',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-6',
    description: 'Inspector & Permit Fees',
    details: 'Inspector fee and City permit fee for additional change.',
    default_amount: 685.0,
    category: 'Permits',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-7',
    description: 'ADA Ramp',
    details: 'Additional ADA ramp requested by Humana engineer to build. Includes concrete slab, aluminum rail, and landing ramp.',
    default_amount: 2952.0,
    category: 'Concrete / ADA',
    created_at: new Date().toISOString(),
  },
];

export async function GET() {
  try {
    let items = await getWorkflowData<EstimateCatalogItem>('estimate_catalog_items');

    if (!items || items.length === 0) {
      for (const item of SEED_CATALOG_ITEMS) {
        await insertWorkflowRecord('estimate_catalog_items', item);
      }
      items = await getWorkflowData<EstimateCatalogItem>('estimate_catalog_items');
    }

    return NextResponse.json({ catalogItems: items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch catalog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, details, default_amount, category } = body;

    if (!description || default_amount === undefined) {
      return NextResponse.json({ error: 'Description and default amount are required' }, { status: 400 });
    }

    const newItem: EstimateCatalogItem = {
      id: `cat-${Date.now()}`,
      description,
      details: details || '',
      default_amount: Number(default_amount),
      category: category || 'General',
      created_at: new Date().toISOString(),
    };

    const created = await insertWorkflowRecord<EstimateCatalogItem>('estimate_catalog_items', newItem);
    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add item to catalog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
