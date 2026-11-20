import { NextRequest, NextResponse } from 'next/server';
import {
  getWorkflowData,
  insertWorkflowRecord,
  updateWorkflowRecord,
  deleteWorkflowRecord,
} from '@/lib/workflow-store';
import { Expense } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const expenses = await getWorkflowData<Expense>('expenses', projectId || undefined);
    expenses.sort(
      (a, b) =>
        new Date(b.expense_date || b.created_at).getTime() -
        new Date(a.expense_date || a.created_at).getTime()
    );

    return NextResponse.json({ expenses });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      project_id,
      category,
      vendor,
      expense_date,
      amount,
      receipt_url = null,
      scan_confidence = 'high',
      notes = '',
    } = body;

    if (!project_id || !vendor || amount === undefined) {
      return NextResponse.json(
        { error: 'Project ID, vendor, and amount are required' },
        { status: 400 }
      );
    }

    const expense = await insertWorkflowRecord<Expense>('expenses', {
      project_id,
      category: category || 'Other',
      vendor,
      expense_date: expense_date || new Date().toISOString().split('T')[0],
      amount: Number(amount),
      receipt_url,
      scan_confidence,
      notes,
    });

    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const expense = await updateWorkflowRecord<Expense>('expenses', id, updates);
    return NextResponse.json({ success: true, expense });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    await deleteWorkflowRecord('expenses', id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
