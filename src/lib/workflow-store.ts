import fs from 'fs';
import path from 'path';
import { createClient } from './supabase-server';

const STORE_PATH = path.join(process.cwd(), 'data', 'workflow_store.json');

// In-memory fallback cache for smooth offline/local development
const memStore: Record<string, any[]> = {
  bid_packages: [],
  bids: [],
  contracts: [],
  submittals: [],
  rfis: [],
  change_events: [],
  change_orders: [],
  field_observations: [],
  pay_applications: [],
  pay_app_items: [],
  payments: [],
  risk_items: [],
  project_drawings: [],
  drawing_markups: [],
  action_plans: [],
  action_plan_items: [],
  project_messages: [],
  owner_billings: [],
  owner_billing_items: [],
  vendor_partners: [],
  audit_activities: [],
  in_app_notifications: [
    {
      id: 'notif-1',
      title: 'Subcontract SC-2301 Executed',
      description: 'Apex Mechanical executed contract for RTU Mechanical Installation.',
      module: 'Contracts',
      link: '/contracts',
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      title: 'Change Order PCO-005 Approved',
      description: 'PCO-005 for $3,200 has been executed and committed.',
      module: 'Change Orders',
      link: '/change-orders',
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'notif-3',
      title: 'Pay Application #1 Disbursed',
      description: 'Disbursement ACH-8892104 for $22,500 cleared.',
      module: 'Pay Apps',
      link: '/pay-apps',
      is_read: true,
      created_at: new Date().toISOString(),
    }
  ],
};

function initPersistedStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const content = fs.readFileSync(STORE_PATH, 'utf8');
      const loaded = JSON.parse(content);
      for (const k of Object.keys(loaded)) {
        memStore[k] = loaded[k];
      }
    }
  } catch (e) {
    // ignore
  }
}
initPersistedStore();

function syncToDisk() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(memStore, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

export async function getWorkflowData<T>(table: string, projectId?: string, filterKey = 'project_id'): Promise<T[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from(table).select('*');
    if (projectId) {
      query = query.eq(filterKey, projectId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as T[];
    }
  } catch (err) {
    // Supabase table may not be migrated yet, fallback to memory
  }

  if (!projectId) {
    return (memStore[table] || []) as T[];
  }

  return (memStore[table] || []).filter((item: any) => item[filterKey] === projectId) as T[];
}

export async function insertWorkflowRecord<T extends { id?: string }>(table: string, record: any): Promise<T> {
  const itemWithId = {
    id: record.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : 'rec-' + Date.now()),
    created_at: record.created_at || new Date().toISOString(),
    ...record,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(table)
      .insert(itemWithId)
      .select()
      .single();

    if (!error && data) {
      if (!memStore[table]) memStore[table] = [];
      memStore[table].unshift(data);
      syncToDisk();
      return data as T;
    }
  } catch (err) {
    // fallback to memory
  }

  if (!memStore[table]) memStore[table] = [];
  memStore[table].unshift(itemWithId);
  syncToDisk();
  return itemWithId as T;
}

export async function updateWorkflowRecord<T>(table: string, id: string, updates: any): Promise<T> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      if (memStore[table]) {
        const idx = memStore[table].findIndex((i) => i.id === id);
        if (idx >= 0) memStore[table][idx] = { ...memStore[table][idx], ...data };
        syncToDisk();
      }
      return data as T;
    }
  } catch (err) {
    // fallback to memory
  }

  if (memStore[table]) {
    const idx = memStore[table].findIndex((i) => i.id === id);
    if (idx >= 0) {
      memStore[table][idx] = { ...memStore[table][idx], ...updates };
      syncToDisk();
      return memStore[table][idx] as T;
    }
  }

  return { id, ...updates } as T;
}

export async function deleteWorkflowRecord(table: string, id: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    await supabase.from(table).delete().eq('id', id);
  } catch (err) {
    // ignore
  }

  if (memStore[table]) {
    memStore[table] = memStore[table].filter((i) => i.id !== id);
    syncToDisk();
  }

  return true;
}

export function logAuditActivity(projectId: string, actor: string, actionType: any, moduleName: string, desc: string) {
  insertWorkflowRecord('audit_activities', {
    project_id: projectId,
    actor_name: actor,
    action_type: actionType,
    module: moduleName,
    description: desc,
    timestamp: new Date().toISOString(),
  });
}
