import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'data', 'workflow_store.json');
const projectId = '1f2af6f8-7486-486c-b03e-334f6c88ec57';

const app2ItemsData = [
  { item_number: 1, description: 'Division 01: General Requirements', scheduled_value: 94600.00, work_completed_previous: 14190.00, work_completed_this_period: 9480.00 },
  { item_number: 2, description: 'Division 02: Existing Conditions / Demolition', scheduled_value: 54606.37, work_completed_previous: 21842.40, work_completed_this_period: 0.00 },
  { item_number: 3, description: 'Division 03: Concrete', scheduled_value: 21802.00, work_completed_previous: 21802.00, work_completed_this_period: 0.00 },
  { item_number: 4, description: 'Division 04: Masonry', scheduled_value: 11066.00, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 5, description: 'Division 05: Metals', scheduled_value: 2460.93, work_completed_previous: 896.94, work_completed_this_period: 0.00 },
  { item_number: 6, description: 'Division 06: Wood, Plastics & Composites', scheduled_value: 95640.03, work_completed_previous: 8000.00, work_completed_this_period: 2882.00 },
  { item_number: 7, description: 'Division 07: Thermal & Moisture Protection', scheduled_value: 48703.45, work_completed_previous: 16234.48, work_completed_this_period: 5749.00 },
  { item_number: 8, description: 'Division 08: A Windows &Glazing (Glazing)', scheduled_value: 5800.00, work_completed_previous: 1933.33, work_completed_this_period: 1357.00 },
  { item_number: 9, description: 'Division 08: All Door Locks', scheduled_value: 7700.00, work_completed_previous: 2566.66, work_completed_this_period: 0.00 },
  { item_number: 10, description: 'Division 08: Wood Doors & Hardware', scheduled_value: 24374.00, work_completed_previous: 8126.66, work_completed_this_period: 7130.00 },
  { item_number: 11, description: 'Division 09: Finishes', scheduled_value: 166947.95, work_completed_previous: 55649.31, work_completed_this_period: 18992.00 },
  { item_number: 12, description: 'Division 10: Specialties', scheduled_value: 1218.00, work_completed_previous: 1218.00, work_completed_this_period: 0.00 },
  { item_number: 13, description: 'Division 11: Equipment', scheduled_value: 11250.00, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 14, description: 'Division 22: Plumbing', scheduled_value: 73166.65, work_completed_previous: 14633.33, work_completed_this_period: 10136.00 },
  { item_number: 15, description: 'Division 23: HVAC', scheduled_value: 121245.38, work_completed_previous: 24249.08, work_completed_this_period: 16462.00 },
  { item_number: 16, description: 'Division 26: Electrical', scheduled_value: 104020.00, work_completed_previous: 20804.00, work_completed_this_period: 19222.00 },
  { item_number: 17, description: 'Alternate #1: Additional plumbing allowances for the service hook up from city', scheduled_value: 16500.00, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 18, description: 'Alternate #2: fire alarm system allowances', scheduled_value: 7000.00, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 19, description: 'Alternate #3: Temporary power generator 3-phase 300kw allowances', scheduled_value: 12000.00, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 20, description: 'Permit Allowance', scheduled_value: 3000.00, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 21, description: 'Insurance', scheduled_value: 5466.00, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 22, description: 'Overhead & Profit', scheduled_value: 82844.08, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 23, description: 'Taxes', scheduled_value: 72855.81, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 24, description: '', scheduled_value: 0.00, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 25, description: '', scheduled_value: 0.00, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 26, description: '', scheduled_value: 0.00, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 27, description: '', scheduled_value: 0.00, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
  { item_number: 28, description: '', scheduled_value: 0.00, work_completed_previous: 0.00, work_completed_this_period: 0.00 },
];

async function main() {
  console.log('Loading workflow_store.json...');
  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));

  const billings = store.owner_billings || [];
  let app2 = billings.find(b => b.project_id === projectId && b.application_number === 2);
  let app3 = billings.find(b => b.project_id === projectId && b.application_number === 3);

  if (!app2) {
    console.error('Application #2 not found!');
    process.exit(1);
  }

  console.log('\n--- 1. Adjusting Application #2 to match PDF ---');
  // App 2 header values matching PDF exactly
  app2.original_contract_sum = 1044266.65;
  app2.net_change_orders = 0.00;
  app2.contract_sum_to_date = 1044266.65;
  app2.total_completed_and_stored = 303556.19;
  app2.retainage_completed_pct = 10.0;
  app2.retainage_stored_pct = 0.0;
  app2.retainage_amount = 9141.00;
  app2.total_earned_less_retainage = 294415.19;
  app2.less_previous_certificates = 212146.19;
  app2.current_payment_due = 82269.00;
  app2.balance_to_finish_incl_retainage = 749851.46;
  app2.amount_certified = 82269.00;
  app2.period_to = '2026-09-30';
  app2.status = 'submitted';

  // Remove existing App 2 items and recreate exactly
  store.owner_billing_items = (store.owner_billing_items || []).filter(it => it.billing_id !== app2.id);

  const app2Items = app2ItemsData.map((d, idx) => {
    const total_completed = Math.round((d.work_completed_previous + d.work_completed_this_period) * 100) / 100;
    const pct_complete = d.scheduled_value > 0 ? Math.round((total_completed / d.scheduled_value) * 100) : 0;
    const balance_to_finish = Math.round((d.scheduled_value - total_completed) * 100) / 100;
    const retainage = Math.round(d.work_completed_this_period * 0.10 * 100) / 100;

    return {
      id: `item-app2-${idx + 1}`,
      billing_id: app2.id,
      item_number: d.item_number,
      description: d.description,
      scheduled_value: d.scheduled_value,
      work_completed_previous: d.work_completed_previous,
      work_completed_this_period: d.work_completed_this_period,
      stored_materials: 0.00,
      total_completed,
      pct_complete,
      balance_to_finish,
      retainage,
      created_at: new Date('2026-10-07T16:00:00Z').toISOString(),
    };
  });

  store.owner_billing_items.push(...app2Items);
  console.log(`Replaced App 2 items (${app2Items.length} rows).`);

  const app2ColD = app2Items.reduce((s, r) => s + r.work_completed_previous, 0);
  const app2ColE = app2Items.reduce((s, r) => s + r.work_completed_this_period, 0);
  const app2ColG = app2Items.reduce((s, r) => s + r.total_completed, 0);
  const app2ColI = app2Items.reduce((s, r) => s + r.retainage, 0);
  console.log(`App 2 Verification:
  Col D (Prev): $${app2ColD.toFixed(2)} (Expected 212,146.19)
  Col E (Curr): $${app2ColE.toFixed(2)} (Expected 91,410.00)
  Col G (Total): $${app2ColG.toFixed(2)} (Expected 303,556.19)
  Col I (Retainage): $${app2ColI.toFixed(2)} (Expected 9,141.00)
  Line 8 (Due): $${app2.current_payment_due.toFixed(2)} (Expected 82,269.00)
  Line 9 (Bal): $${app2.balance_to_finish_incl_retainage.toFixed(2)} (Expected 749,851.46)`);

  console.log('\n--- 2. Adjusting Application #3 based on Application #2 ---');
  if (!app3) {
    app3 = {
      id: 'app3-' + Date.now(),
      created_at: new Date().toISOString(),
      project_id: projectId,
      application_number: 3,
      owner_name: app2.owner_name,
      owner_address: app2.owner_address,
      contractor_name: app2.contractor_name,
      contractor_address: app2.contractor_address,
      project_name: app2.project_name,
      project_address: app2.project_address,
      contract_for: app2.contract_for,
      project_nos: app2.project_nos,
      contract_date: app2.contract_date,
      distribution_to: app2.distribution_to,
      status: 'draft',
    };
    billings.push(app3);
  }

  app3.original_contract_sum = 1044266.65;
  app3.net_change_orders = 0.00;
  app3.contract_sum_to_date = 1044266.65;
  app3.total_completed_and_stored = 303556.19;
  app3.retainage_completed_pct = 10.0;
  app3.retainage_stored_pct = 0.0;
  app3.retainage_amount = 9141.00;
  app3.total_earned_less_retainage = 294415.19;
  app3.less_previous_certificates = 294415.19; // Line 6 from prior Certificate (App 2)!
  app3.current_payment_due = 0.00; // Ready for period 3 work
  app3.balance_to_finish_incl_retainage = 749851.46;
  app3.amount_certified = 0.00;
  app3.period_to = '2026-10-31';
  app3.status = 'draft';

  // Remove existing App 3 items and create rows where previous = App 2 total_completed
  store.owner_billing_items = (store.owner_billing_items || []).filter(it => it.billing_id !== app3.id);

  const app3Items = app2Items.map((app2Row, idx) => {
    const prevCompleted = app2Row.total_completed;
    const sched = app2Row.scheduled_value;
    const total_completed = prevCompleted;
    const pct_complete = sched > 0 ? Math.round((total_completed / sched) * 100) : 0;
    const balance_to_finish = Math.round((sched - total_completed) * 100) / 100;

    return {
      id: `item-app3-${idx + 1}`,
      billing_id: app3.id,
      item_number: app2Row.item_number,
      description: app2Row.description,
      scheduled_value: sched,
      work_completed_previous: prevCompleted,
      work_completed_this_period: 0.00,
      stored_materials: 0.00,
      total_completed,
      pct_complete,
      balance_to_finish,
      retainage: 0.00,
      created_at: new Date().toISOString(),
    };
  });

  store.owner_billing_items.push(...app3Items);
  console.log(`Replaced App 3 items (${app3Items.length} rows).`);

  const app3ColD = app3Items.reduce((s, r) => s + r.work_completed_previous, 0);
  const app3ColE = app3Items.reduce((s, r) => s + r.work_completed_this_period, 0);
  const app3ColG = app3Items.reduce((s, r) => s + r.total_completed, 0);
  console.log(`App 3 Verification:
  Col D (Prev): $${app3ColD.toFixed(2)} (Expected 303,556.19)
  Col E (Curr): $${app3ColE.toFixed(2)} (Expected 0.00)
  Col G (Total): $${app3ColG.toFixed(2)} (Expected 303,556.19)
  Line 6 (Earned Less Retainage): $${app3.total_earned_less_retainage.toFixed(2)} (Expected 294,415.19)
  Line 7 (Less Previous Certificates): $${app3.less_previous_certificates.toFixed(2)} (Expected 294,415.19)
  Line 8 (Current Payment Due): $${app3.current_payment_due.toFixed(2)} (Expected 0.00)
  Line 9 (Balance to Finish): $${app3.balance_to_finish_incl_retainage.toFixed(2)} (Expected 749,851.46)`);

  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  console.log('\nSuccessfully saved adjusted billings to workflow_store.json!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
