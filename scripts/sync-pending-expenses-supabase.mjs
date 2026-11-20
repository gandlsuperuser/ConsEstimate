import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const STORE_PATH = path.join(process.cwd(), 'data', 'workflow_store.json');
const projectId = '1f2af6f8-7486-486c-b03e-334f6c88ec57';

async function run() {
  console.log('Testing Supabase connection...');
  try {
    const { data: proj, error: projErr } = await supabase.from('projects').select('id, name').limit(1);
    if (projErr) throw projErr;
    console.log('Connected to Supabase project successfully!');
  } catch (err) {
    console.error('Supabase is still offline or paused:', err.message);
    console.log('Local workflow store remains the active source of truth.');
    process.exit(0);
  }

  // 1. Disregard / delete old $18,995 MHAC expense
  console.log('Cleaning up old $18,995 expense if present...');
  await supabase
    .from('expenses')
    .delete()
    .eq('project_id', projectId)
    .eq('amount', 18995);

  // 2. Upload receipts to Supabase Storage if storage bucket exists
  const receiptsToUpload = [
    {
      localPath: path.join(process.cwd(), 'public/receipts/MHAC_Invoice_10658_26900_Conviva.png'),
      storageName: `${projectId}/MHAC_Invoice_10658_26900_Conviva.png`,
      contentType: 'image/png',
      amount: 26900.00,
    },
    {
      localPath: path.join(process.cwd(), 'public/receipts/Allied_Flooring_Estimate_2867_Conviva.jpg'),
      storageName: `${projectId}/Allied_Flooring_Estimate_2867_Conviva.jpg`,
      contentType: 'image/jpeg',
      amount: 9406.88,
    },
  ];

  for (const item of receiptsToUpload) {
    if (fs.existsSync(item.localPath)) {
      const buffer = fs.readFileSync(item.localPath);
      const { error: upErr } = await supabase.storage.from('receipts').upload(item.storageName, buffer, {
        contentType: item.contentType,
        upsert: true,
      });
      if (!upErr) {
        const { data: pubData } = supabase.storage.from('receipts').getPublicUrl(item.storageName);
        console.log(`Uploaded ${item.storageName} -> ${pubData.publicUrl}`);
      }
    }
  }

  // 3. Upsert expenses into Supabase table
  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  const convivaExpenses = (store.expenses || []).filter((e) => e.project_id === projectId);

  console.log(`Syncing ${convivaExpenses.length} Conviva expenses to Supabase...`);
  for (const exp of convivaExpenses) {
    const { data: existing } = await supabase
      .from('expenses')
      .select('id')
      .eq('project_id', exp.project_id)
      .eq('amount', exp.amount)
      .eq('vendor', exp.vendor)
      .maybeSingle();

    if (!existing) {
      const { error: insErr } = await supabase.from('expenses').insert({
        project_id: exp.project_id,
        category: exp.category,
        vendor: exp.vendor,
        expense_date: exp.expense_date,
        amount: exp.amount,
        receipt_url: exp.receipt_url,
        scan_confidence: exp.scan_confidence || 'high',
        notes: exp.notes || '',
      });
      if (insErr) {
        console.warn(`Error inserting ${exp.vendor} ($${exp.amount}):`, insErr.message);
      } else {
        console.log(`Synced ${exp.vendor} ($${exp.amount}) to Supabase.`);
      }
    } else {
      console.log(`Already in Supabase: ${exp.vendor} ($${exp.amount})`);
    }
  }

  console.log('Sync complete.');
}

run().catch((err) => {
  console.error('Fatal sync error:', err);
});

