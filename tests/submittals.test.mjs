import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { NextRequest } from 'next/server.js';
const loadDependency = createRequire(import.meta.url);
const project = '11111111-1111-4111-8111-111111111111';
const otherProject = '22222222-2222-4222-8222-222222222222';
const source = ts.transpileModule(fs.readFileSync('src/app/api/submittals/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup() {
  let rows = [], failure = null;
  const client = { from() {
    let operation = 'read', payload, filters = [];
    const query = {
      select() { return this; }, order() { return this; },
      eq(key, value) { filters.push(row => row[key] === value); return this; },
      insert(value) { operation = 'insert'; payload = value; return this; },
      update(value) { operation = 'update'; payload = value; return this; },
      delete() { operation = 'delete'; return this; },
      single() { return this.execute(true); }, maybeSingle() { return this.execute(true); },
      then(resolve, reject) { return this.execute(false).then(resolve, reject); },
      async execute(single) {
        if (failure) return { data: null, error: failure };
        let matched = rows.filter(row => filters.every(filter => filter(row)));
        if (operation === 'insert') {
          matched = [{ id: randomUUID(), status: 'pending', ...payload }];
          rows.push(...matched);
        }
        if (operation === 'update') matched.forEach(row => Object.assign(row, payload));
        if (operation === 'delete') rows = rows.filter(row => !matched.includes(row));
        return { data: single ? matched[0] ?? null : matched, error: null };
      },
    };
    return query;
  } };
  function load() {
    const exports = {};
    vm.runInNewContext(source, { exports, console: { error() {} }, require(name) {
      return name === '@/lib/supabase-server' ? { createClient: async () => client } : loadDependency(name);
    } });
    return exports;
  }
  return { load, fail: () => { failure = { message: 'Database unavailable' }; } };
}
function request(method, body, query = '') {
  return new NextRequest(`http://localhost/api/submittals${query}`, {
    method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
}

test('create, fresh read, review, project isolation, and delete', async () => {
  const store = setup();
  let api = store.load();
  const created = await api.POST(request('POST', { project_id: project, title: '  Test cut sheet  ', lead_time_weeks: 0, is_substitution: true, substitution_cost_delta: -125.50 }));
  assert.equal(created.status, 201);
  const { submittal } = await created.json();
  assert.equal(submittal.title, 'Test cut sheet');
  assert.match(submittal.submittal_number, /^SUB-/);
  api = store.load(); // New handler instance cannot depend on an in-memory fallback.
  const list = await (await api.GET(request('GET', undefined, `?projectId=${project}`))).json();
  assert.equal(list.submittals[0].id, submittal.id);
  assert.equal(list.submittals[0].substitution_cost_delta, -125.50);
  const wrong = await api.PATCH(request('PATCH', { id: submittal.id, project_id: otherProject, status: 'approved' }));
  assert.equal(wrong.status, 404);
  const updated = await api.PATCH(request('PATCH', { id: submittal.id, project_id: project, status: 'approved_as_noted', created_at: 'tampered' }));
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).submittal.created_at, undefined);
  const reread = await (await store.load().GET(request('GET', undefined, `?projectId=${project}`))).json();
  assert.equal(reread.submittals[0].status, 'approved_as_noted');
  assert.equal((await api.DELETE(request('DELETE', undefined, `?id=${submittal.id}&projectId=${otherProject}`))).status, 404);
  assert.equal((await api.DELETE(request('DELETE', undefined, `?id=${submittal.id}&projectId=${project}`))).status, 200);
  const empty = await (await api.GET(request('GET', undefined, `?projectId=${project}`))).json();
  assert.deepEqual(empty.submittals, []);
  assert.equal((await api.PATCH(request('PATCH', { id: submittal.id, project_id: project, status: 'approved' }))).status, 404);
});

test('invalid input is rejected before saving', async () => {
  const api = setup().load();
  for (const body of [null, [], {}, { project_id: project, title: ' ' },
    { project_id: 'bad', title: 'Test' }, ...[
      { status: 'invalid' }, { schedule_risk_level: 'invalid' }, { lead_time_weeks: -1 },
      { lead_time_weeks: 1.5 }, { lead_time_weeks: '3' }, { is_substitution: 'false' },
      { substitution_cost_delta: 'bad' }, { received_date: '2026-02-30' },
    ].map(fields => ({ project_id: project, title: 'Test', ...fields }))]) {
    assert.equal((await api.POST(request('POST', body))).status, 400, JSON.stringify(body));
  }
  assert.equal((await api.POST(new NextRequest('http://localhost/api/submittals', { method: 'POST', body: '{' }))).status, 400);
});

test('database failures never become false successes or local records', async () => {
  const store = setup();
  store.fail();
  const api = store.load();
  for (const [method, body, query] of [
    ['GET', undefined, `?projectId=${project}`],
    ['POST', { project_id: project, title: 'Test' }],
    ['PATCH', { id: otherProject, project_id: project, status: 'approved' }],
    ['DELETE', undefined, `?id=${otherProject}&projectId=${project}`],
  ]) {
    const result = await api[method](request(method, body, query));
    assert.equal(result.status, 503);
    assert.match((await result.json()).error, /storage/);
  }
});
