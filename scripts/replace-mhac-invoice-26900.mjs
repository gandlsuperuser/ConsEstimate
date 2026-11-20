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

async function run() {
  const projectId = '1f2af6f8-7486-486c-b03e-334f6c88ec57';
  const oldExpenseId = '30fbd997-f65b-4f02-9fa5-9ba75b8384ab';

  console.log('1. Checking & deleting old $18,995 expense...');
  const { data: delData, error: delErr } = await supabase
    .from('expenses')
    .delete()
    .eq('id', oldExpenseId)
    .select();

  if (delErr) {
    console.warn('Warning deleting old expense:', delErr.message);
  } else {
    console.log('Deleted old expense:', delData);
  }

  // Also check if any other $18,995 expense exists in Conviva
  await supabase
    .from('expenses')
    .delete()
    .eq('project_id', projectId)
    .eq('amount', 18995);

  console.log('2. Uploading new receipt image to storage...');
  const imgPath = '/Users/moli/.gemini/antigravity/brain/b51f249c-0d20-4aa8-ad18-7de720a66dbd/.user_uploaded/media_1794944014638_cafaca49.png';
  let receiptUrl = null;

  if (fs.existsSync(imgPath)) {
    const fileBuffer = fs.readFileSync(imgPath);
    const storagePath = `${projectId}/${Date.now()}-MHAC_HVAC_Equipment_Invoice_10658_11-15-26_26900_Conviva.png`;

    const { error: uploadErr } = await supabase.storage
      .from('receipts')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      console.warn('Storage upload warning:', uploadErr.message);
    } else {
      const { data: pubData } = supabase.storage.from('receipts').getPublicUrl(storagePath);
      receiptUrl = pubData.publicUrl;
      console.log('Uploaded receipt:', receiptUrl);
    }
  }

  console.log('3. Inserting new $26,900 expense...');
  const notes = 'Invoice #10658 | MHAC (San Antonio, TX | 210-848-7212) | Bill To: BTX Contractor | Job: Conviva Job | Invoice Date: 11/15/2026 | Scope: Lennox Complete HVAC Equipment System (8 units) — MMPD048S6S-71 (Qty 2), MMD024S6-1P (Qty 2), MMD048S6-1P (Qty 2), ML14KP1-060-230 (Qty 1), CBK48MVT-060-71 (Qty 1) | Subtotal: $26,900.00 | Tax (6.00%): $0.00 | Total Amount Due: $26,900.00 | Project: Conviva - Jourdanton / HVAC (Replaces prior $18,995 invoice)';

  const { data: newExp, error: insErr } = await supabase
    .from('expenses')
    .insert({
      project_id: projectId,
      category: 'HVAC',
      vendor: 'MHAC',
      expense_date: '2026-11-15',
      amount: 26900.00,
      receipt_url: receiptUrl,
      scan_confidence: 'high',
      notes,
    })
    .select()
    .single();

  if (insErr) {
    console.error('Insert error:', insErr);
    process.exit(1);
  }

  console.log('Successfully inserted new $26,900 HVAC expense:', newExp);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

