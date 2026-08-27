import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowData, insertWorkflowRecord, deleteWorkflowRecord } from '@/lib/workflow-store';
import { ProjectDrawing, DrawingMarkup } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const drawingId = searchParams.get('drawingId');

  if (drawingId) {
    const markups = await getWorkflowData<DrawingMarkup>('drawing_markups', drawingId, 'drawing_id');
    return NextResponse.json({ markups });
  }

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const drawings = await getWorkflowData<ProjectDrawing>('project_drawings', projectId);
  return NextResponse.json({ drawings });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'add_markup') {
      const { drawing_id, markup_type, x, y, text, color, author_name, linked_record_id } = body;
      const markup = await insertWorkflowRecord<DrawingMarkup>('drawing_markups', {
        drawing_id,
        markup_type: markup_type || 'cloud',
        x: Number(x),
        y: Number(y),
        text: text || '',
        color: color || '#F47E20',
        author_name: author_name || 'Project Manager',
        linked_record_id: linked_record_id || null,
      });
      return NextResponse.json({ success: true, markup }, { status: 201 });
    }

    // Default: create drawing sheet
    const { project_id, drawing_number, title, discipline, revision_number = '0', set_date } = body;
    const newDrawing = await insertWorkflowRecord<ProjectDrawing>('project_drawings', {
      project_id,
      drawing_number,
      title,
      discipline: discipline || 'Architectural',
      revision_number,
      set_date: set_date || new Date().toISOString().split('T')[0],
      markups_count: 0,
    });

    return NextResponse.json({ success: true, drawing: newDrawing }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing drawing request' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'drawing';

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await deleteWorkflowRecord(type === 'markup' ? 'drawing_markups' : 'project_drawings', id);
  return NextResponse.json({ success: true });
}
