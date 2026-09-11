import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const statuses = ['draft', 'pending', 'under_review', 'approved', 'approved_as_noted', 'revise_resubmit', 'rejected'];
const risks = ['low', 'medium', 'high', 'critical'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const textFields = ['spec_division', 'submittal_number', 'title', 'description', 'subcontractor_name', 'approver_name', 'notes'];
const editableFields = [...textFields, 'received_date', 'required_on_site_date', 'lead_time_weeks', 'status', 'is_substitution', 'substitution_cost_delta', 'schedule_risk_level'];

class InvalidInput extends Error {}

async function readBody(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { throw new InvalidInput('A valid JSON object is required.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InvalidInput('A JSON object is required.');
  return body as Record<string, unknown>;
}

function requireId(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !uuid.test(value)) throw new InvalidInput(`${name} must be a valid ID.`);
}

function validateFields(body: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  for (const key of editableFields) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  for (const key of textFields) {
    if (key in fields) {
      if (typeof fields[key] !== 'string') throw new InvalidInput(`${key} must be text.`);
      fields[key] = (fields[key] as string).trim();
    }
  }
  if ('title' in fields && !fields.title) throw new InvalidInput('Submittal title is required.');
  if ('status' in fields && !statuses.includes(fields.status as string)) throw new InvalidInput('Invalid submittal status.');
  if ('schedule_risk_level' in fields && !risks.includes(fields.schedule_risk_level as string)) throw new InvalidInput('Invalid schedule risk level.');
  if ('is_substitution' in fields && typeof fields.is_substitution !== 'boolean') throw new InvalidInput('is_substitution must be true or false.');
  for (const key of ['lead_time_weeks', 'substitution_cost_delta']) {
    if (key in fields && (typeof fields[key] !== 'number' || !Number.isFinite(fields[key]))) throw new InvalidInput(`${key} must be a finite number.`);
  }
  if ('lead_time_weeks' in fields && (!Number.isInteger(fields.lead_time_weeks) || Number(fields.lead_time_weeks) < 0 || Number(fields.lead_time_weeks) > 2147483647)) throw new InvalidInput('Lead time must be a non-negative whole number.');
  for (const key of ['received_date', 'required_on_site_date']) {
    if (!(key in fields)) continue;
    if (key === 'required_on_site_date' && (fields[key] === '' || fields[key] === null)) { fields[key] = null; continue; }
    const value = fields[key];
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new InvalidInput(`${key} must be a valid date (YYYY-MM-DD).`);
  }
  return fields;
}

function failure(error: unknown) {
  if (error instanceof InvalidInput) return NextResponse.json({ error: error.message }, { status: 400 });
  console.error('Submittal storage request failed:', error);
  return NextResponse.json({ error: 'Unable to access submittal storage. Please try again. If this continues, check the database connection and submittals table setup.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId');
    requireId(projectId, 'projectId');
    const supabase = await createClient();
    const { data, error } = await supabase.from('submittals').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ submittals: data ?? [] });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readBody(request);
    requireId(body.project_id, 'project_id');
    const fields = validateFields(body);
    if (!fields.title) throw new InvalidInput('Submittal title is required.');
    const supabase = await createClient();
    // A successful response always represents a durable database record, never a local fallback.
    const { data, error } = await supabase.from('submittals').insert({
      ...fields,
      project_id: body.project_id,
      spec_division: fields.spec_division || '23 - HVAC',
      submittal_number: fields.submittal_number || `SUB-${randomUUID()}`,
    }).select().single();
    if (error) throw error;
    if (!data) throw new Error('Storage did not return the created submittal.');
    return NextResponse.json({ success: true, submittal: data }, { status: 201 });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await readBody(request);
    requireId(body.id, 'id');
    requireId(body.project_id, 'project_id');
    const updates = validateFields(body);
    if (!Object.keys(updates).length) throw new InvalidInput('At least one editable field is required.');
    const supabase = await createClient();
    const { data, error } = await supabase.from('submittals').update(updates).eq('id', body.id).eq('project_id', body.project_id).select().maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Submittal not found in this project.' }, { status: 404 });
    return NextResponse.json({ success: true, submittal: data });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const projectId = request.nextUrl.searchParams.get('projectId');
    requireId(id, 'id');
    requireId(projectId, 'projectId');
    const supabase = await createClient();
    const { data, error } = await supabase.from('submittals').delete().eq('id', id).eq('project_id', projectId).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Submittal not found in this project.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) { return failure(error); }
}
