import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'data', 'workflow_store.json');
const projectId = '1f2af6f8-7486-486c-b03e-334f6c88ec57';

async function run() {
  console.log('Reading workflow store...');
  const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));

  if (!data.expenses) {
    data.expenses = [];
  }
  if (!data.audit_activities) {
    data.audit_activities = [];
  }

  // 1. Remove old $18,995 MHAC expense if present in workflow store
  const oldLen = data.expenses.length;
  data.expenses = data.expenses.filter(
    (e) => !(e.project_id === projectId && (e.amount === 18995 || e.id === '30fbd997-f65b-4f02-9fa5-9ba75b8384ab'))
  );
  if (data.expenses.length < oldLen) {
    console.log('Removed old $18,995 MHAC expense from local store.');
  }

  // 2. Check or add the new $26,900 MHAC invoice #10658
  const mhacExists = data.expenses.some(
    (e) => e.project_id === projectId && e.amount === 26900 && e.vendor === 'MHAC'
  );
  if (!mhacExists) {
    const mhacExpense = {
      id: 'exp-mhac-10658-26900',
      project_id: projectId,
      category: 'HVAC',
      vendor: 'MHAC',
      expense_date: '2026-11-15',
      amount: 26900.00,
      receipt_url: '/receipts/MHAC_Invoice_10658_26900_Conviva.png',
      scan_confidence: 'high',
      notes: 'Invoice #10658 | MHAC (San Antonio, TX | 210-848-7212) | Bill To: BTX Contractor | Job: Conviva Job | Invoice Date: 11/15/2026 | Scope: Lennox Complete HVAC Equipment System (8 units) — MMPD048S6S-71 (Qty 2), MMD024S6-1P (Qty 2), MMD048S6-1P (Qty 2), ML14KP1-060-230 (Qty 1), CBK48MVT-060-71 (Qty 1) | Subtotal: $26,900.00 | Tax (6.00%): $0.00 | Total Amount Due: $26,900.00 | Project: Conviva - Jourdanton / HVAC (Replaces prior $18,995 invoice)',
      created_at: new Date('2026-11-17T19:35:00Z').toISOString(),
    };
    data.expenses.push(mhacExpense);
    console.log('Added $26,900 MHAC HVAC expense.');

    data.audit_activities.unshift({
      id: 'rec-' + Date.now() + '-mhac',
      project_id: projectId,
      actor_name: 'Admin',
      action_type: 'expense_updated',
      module: 'Expenses',
      description: 'Replaced prior $18,995.00 MHAC HVAC equipment expense with $26,900.00 invoice #10658 from MHAC (Lennox Complete HVAC System) - Conviva Jourdanton',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  }

  // 3. Add Allied Associates Commercial Floors, Inc. Proposal / Estimate #2867 ($9,406.88)
  const alliedExists = data.expenses.some(
    (e) => e.project_id === projectId && e.amount === 9406.88 && e.vendor.includes('Allied')
  );

  if (!alliedExists) {
    const alliedExpense = {
      id: 'exp-allied-2867-9406',
      project_id: projectId,
      category: 'Flooring',
      vendor: 'Allied Associates Commercial Floors, Inc.',
      expense_date: '2026-11-19',
      amount: 9406.88,
      receipt_url: '/receipts/Allied_Flooring_Estimate_2867_Conviva.jpg',
      scan_confidence: 'high',
      notes: 'Proposal / Estimate #2867 | Allied Associates Commercial Floors, Inc. (Universal City, TX | 210-646-9090) | Bill To: BTX Contractors LLC (Attn: Ralph Ayala) | Project: Conviva Jourdanton, 1105 Oak Street, Jourdanton, TX 78026 (Attn: Li Mo & Ralph Ayala) | Date: 11/19/2026 | Scope: Mohawk LVP - Secoya C2103, Color #148 Knotty Oak (72 cartons @ $99.25 = $7,146.00, ~3,000 sq ft), Mohawk Adhesive - M99 Premium Pressure Sensitive LVP Adhesive 4-Gal Pails (3 pails @ $364.00 = $1,092.00), Freight from GA to SAT ($462.00) | Subtotal: $8,700.00 | Sales Tax (8.125%): $706.88 | Total: $9,406.88',
      created_at: new Date().toISOString(),
    };
    data.expenses.push(alliedExpense);
    console.log('Added $9,406.88 Allied Associates Commercial Floors expense.');

    data.audit_activities.unshift({
      id: 'rec-' + Date.now() + '-allied',
      project_id: projectId,
      actor_name: 'Admin',
      action_type: 'expense_logged',
      module: 'Expenses',
      description: 'Logged $9,406.88 proposal/estimate #2867 from Allied Associates Commercial Floors, Inc. (Mohawk LVP Knotty Oak & Adhesive) - Conviva Jourdanton',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  } else {
    console.log('Allied flooring expense already exists.');
  }

  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('Updated workflow store successfully.');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

