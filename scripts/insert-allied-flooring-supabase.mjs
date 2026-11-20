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

async function main() {
  console.log('--- 1. Testing Supabase connection ---');
  const { data: proj, error: projErr } = await supabase.from('projects').select('id, name').eq('id', projectId).single();
  if (projErr) {
    console.error('Failed to query project in Supabase:', projErr);
    process.exit(1);
  }
  console.log(`Connected to Supabase! Found project: "${proj.name}" (${proj.id})`);

  console.log('\n--- 2. Uploading Allied Flooring proposal image to Supabase Storage ---');
  const flooringImgPath = path.join(process.cwd(), 'public/receipts/Allied_Flooring_Estimate_2867_Conviva.jpg');
  let flooringReceiptUrl = null;

  if (fs.existsSync(flooringImgPath)) {
    const fileBuffer = fs.readFileSync(flooringImgPath);
    const storagePath = `${projectId}/${Date.now()}-Allied_Flooring_Estimate_2867_Conviva.jpg`;

    const { error: upErr } = await supabase.storage
      .from('receipts')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (upErr) {
      console.warn('Storage upload error:', upErr.message);
    } else {
      const { data: pubData } = supabase.storage.from('receipts').getPublicUrl(storagePath);
      flooringReceiptUrl = pubData.publicUrl;
      console.log('Uploaded receipt image to Supabase Storage:', flooringReceiptUrl);
    }
  }

  console.log('\n--- 3. Inserting Allied Commercial Floors expense into Supabase ---');
  // Check if already in Supabase
  const { data: existingFlooring } = await supabase
    .from('expenses')
    .select('id, vendor, amount')
    .eq('project_id', projectId)
    .eq('amount', 9406.88)
    .maybeSingle();

  let insertedFlooring = null;
  const flooringNotes = 'Proposal / Estimate #2867 | ALLIED ASSOCIATES COMMERCIAL FLOORS, INC (130 Palisades Drive, Ste A, Universal City, TX 78148 | 210-646-9090) | Bill To: BTX Contractors LLC (Attn: Ralph Ayala) | Project: Conviva Jourdanton, 1105 Oak Street, Jourdanton, TX 78026 (Attn: Li Mo & Ralph Ayala) | Date: 11/19/2026 | Scope: Mohawk LVP - Secoya C2103, Color #148 Knotty Oak (72 cartons @ $99.25 = $7,146.00, ~3,000 sq ft), Mohawk Adhesive - M99 Premium Pressure Sensitive LVP Adhesive 4-Gal Pails (3 pails @ $364.00 = $1,092.00), Freight from GA to SAT ($462.00) | Subtotal: $8,700.00 | Sales Tax (8.125%): $706.88 | Total: $9,406.88';

  if (!existingFlooring) {
    const { data: newExp, error: insErr } = await supabase
      .from('expenses')
      .insert({
        project_id: projectId,
        category: 'Flooring',
        vendor: 'ALLIED ASSOCIATES COMMERCIAL FLOORS, INC',
        expense_date: '2026-11-19',
        amount: 9406.88,
        receipt_url: flooringReceiptUrl,
        scan_confidence: 'high',
        notes: flooringNotes,
      })
      .select()
      .single();

    if (insErr) {
      console.error('Failed to insert Allied Flooring expense:', insErr);
      process.exit(1);
    }
    insertedFlooring = newExp;
    console.log('Successfully inserted Allied Flooring expense in Supabase:', insertedFlooring);
  } else {
    console.log('Allied Flooring expense already present in Supabase:', existingFlooring);
    insertedFlooring = existingFlooring;
  }

  console.log('\n--- 4. Replacing old $18,995 MHAC with $26,900 MHAC Invoice #10658 in Supabase ---');
  // Delete old $18,995
  const { data: delData, error: delErr } = await supabase
    .from('expenses')
    .delete()
    .eq('project_id', projectId)
    .eq('amount', 18995)
    .select();

  console.log('Deleted old $18,995 expense from Supabase:', delData || 'none found');

  // Check if $26,900 already inserted
  const { data: existingMhac } = await supabase
    .from('expenses')
    .select('id, vendor, amount')
    .eq('project_id', projectId)
    .eq('amount', 26900)
    .maybeSingle();

  if (!existingMhac) {
    const mhacImgPath = path.join(process.cwd(), 'public/receipts/MHAC_Invoice_10658_26900_Conviva.png');
    let mhacReceiptUrl = null;

    if (fs.existsSync(mhacImgPath)) {
      const buffer = fs.readFileSync(mhacImgPath);
      const storagePath = `${projectId}/${Date.now()}-MHAC_HVAC_Equipment_Invoice_10658_11-15-26_26900_Conviva.png`;
      const { error: mhacUpErr } = await supabase.storage.from('receipts').upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: true,
      });
      if (!mhacUpErr) {
        const { data: pubData } = supabase.storage.from('receipts').getPublicUrl(storagePath);
        mhacReceiptUrl = pubData.publicUrl;
        console.log('Uploaded MHAC receipt image to Supabase Storage:', mhacReceiptUrl);
      }
    }

    const mhacNotes = 'Invoice #10658 | MHAC (San Antonio, TX | 210-848-7212) | Bill To: BTX Contractor | Job: Conviva Job | Invoice Date: 11/15/2026 | Scope: Lennox Complete HVAC Equipment System (8 units) — MMPD048S6S-71 (Qty 2), MMD024S6-1P (Qty 2), MMD048S6-1P (Qty 2), ML14KP1-060-230 (Qty 1), CBK48MVT-060-71 (Qty 1) | Subtotal: $26,900.00 | Tax (6.00%): $0.00 | Total Amount Due: $26,900.00 | Project: Conviva - Jourdanton / HVAC (Replaces prior $18,995 invoice)';

    const { data: newMhac, error: mhacInsErr } = await supabase
      .from('expenses')
      .insert({
        project_id: projectId,
        category: 'HVAC',
        vendor: 'MHAC',
        expense_date: '2026-11-15',
        amount: 26900.00,
        receipt_url: mhacReceiptUrl,
        scan_confidence: 'high',
        notes: mhacNotes,
      })
      .select()
      .single();

    if (mhacInsErr) {
      console.error('Failed to insert MHAC $26,900 expense:', mhacInsErr);
    } else {
      console.log('Successfully inserted new $26,900 MHAC expense in Supabase:', newMhac);
    }
  } else {
    console.log('$26,900 MHAC expense already present in Supabase:', existingMhac);
  }

  console.log('\n--- 5. Verifying latest expenses in Supabase for Conviva ---');
  const { data: latestExp } = await supabase
    .from('expenses')
    .select('id, vendor, amount, category, expense_date, receipt_url')
    .eq('project_id', projectId)
    .order('expense_date', { ascending: false })
    .limit(5);

  console.log('Top 5 latest expenses in Supabase:');
  console.log(latestExp);

  // Sync to data/workflow_store.json
  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  store.expenses = store.expenses || [];
  // Update or replace in local workflow store
  store.expenses = store.expenses.filter((e) => !(e.project_id === projectId && (e.amount === 18995 || e.amount === 9406.88 || e.amount === 26900)));
  if (latestExp) {
    store.expenses.unshift(...latestExp);
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  console.log('\nUpdated local workflow store with Supabase records.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
