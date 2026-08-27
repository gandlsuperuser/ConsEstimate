import { NextRequest, NextResponse } from 'next/server';
import { insertWorkflowRecord } from '@/lib/workflow-store';
import { BidPackage, Contract, RFI, ChangeEvent, PayApplication } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    // 1. Bid Package
    const pkg = await insertWorkflowRecord<BidPackage>('bid_packages', {
      project_id: projectId,
      title: 'Division 23 - Rooftop Air Handling Unit (RTU-1) & Piping',
      trade: 'Mechanical / HVAC',
      division_code: '23',
      scope_description: 'Furnish and install one 25-ton packaged rooftop air handling unit, roof curb, vibration isolators, condensate piping, and refrigerant charge.',
      estimated_budget: 45000,
      due_date: today,
      status: 'awarded',
    });

    // Bids
    await insertWorkflowRecord('bids', {
      bid_package_id: pkg.id,
      subcontractor_name: 'Apex Mechanical Contractors',
      contact_email: 'bids@apexmech.com',
      contact_phone: '(210) 555-0144',
      base_bid_amount: 44500,
      alternate_amount: 1800,
      inclusions: 'Includes 25-ton RTU, crane hoisting, and 1-yr maintenance warranty',
      exclusions: 'Low-voltage controls wiring by electrical trade',
      submitted_date: today,
      status: 'awarded',
      notes: 'Lowest responsive bidder with excellent safety rating',
    });

    await insertWorkflowRecord('bids', {
      bid_package_id: pkg.id,
      subcontractor_name: 'AirPro Commercial HVAC',
      contact_email: 'estimating@airpro.com',
      base_bid_amount: 47200,
      submitted_date: today,
      status: 'submitted',
    });

    await insertWorkflowRecord('bids', {
      bid_package_id: pkg.id,
      subcontractor_name: 'LoneStar Climate Systems',
      contact_email: 'projects@lonestarclimate.com',
      base_bid_amount: 46000,
      submitted_date: today,
      status: 'submitted',
    });

    // 2. Contract
    const contract = await insertWorkflowRecord<Contract>('contracts', {
      project_id: projectId,
      contract_number: 'SC-2301-APEX',
      title: 'Subcontract - RTU Mechanical Installation',
      vendor_name: 'Apex Mechanical Contractors',
      contract_type: 'subcontract',
      original_amount: 44500,
      revised_amount: 47700, // +$3,200 approved change order
      retainage_pct: 10.0,
      start_date: today,
      status: 'executed',
      approval_step: 'Fully Executed',
      e_signed_at: new Date().toISOString(),
      notes: 'Executed contract linked to Division 23 package',
    });

    // 3. Submittals
    await insertWorkflowRecord('submittals', {
      project_id: projectId,
      spec_division: '23 74 13 - Packaged Outdoor Central-Station Air-Handling Units',
      submittal_number: 'SUB-23-001',
      title: 'Trane Voyager 25-Ton High Efficiency Rooftop Unit',
      description: 'Cut sheets, performance ratings, electrical schematics, and sound data.',
      subcontractor_name: 'Apex Mechanical Contractors',
      approver_name: 'Lead Mechanical Engineer (MEP)',
      received_date: today,
      lead_time_weeks: 4,
      status: 'approved',
      is_substitution: true,
      substitution_cost_delta: -1800,
      schedule_risk_level: 'low',
      notes: 'Substituted for York model due to 8-week supplier delay on original spec; approved with $1,800 cost credit.',
    });

    await insertWorkflowRecord('submittals', {
      project_id: projectId,
      spec_division: '23 05 48 - Vibration and Seismic Controls for HVAC',
      submittal_number: 'SUB-23-002',
      title: 'Kinetics Spring Vibration Isolators & Curb Gaskets',
      subcontractor_name: 'Apex Mechanical Contractors',
      approver_name: 'Structural Engineer',
      received_date: today,
      lead_time_weeks: 2,
      status: 'approved_as_noted',
      is_substitution: false,
      schedule_risk_level: 'low',
    });

    // 4. RFI
    const rfi = await insertWorkflowRecord<RFI>('rfis', {
      project_id: projectId,
      rfi_number: 'RFI-042',
      subject: 'Structural Curb Opening Dimensions vs. M-201 Ductwork Penetration',
      question: 'Drawing S-102 shows a 48"x60" roof opening for the RTU, but Mechanical M-201 requires 54"x72" to accommodate supply/return plenum transitions. Please confirm revised structural header framing.',
      assigned_to: 'Apex Engineering Group (Structural)',
      drawing_number: 'S-102 / M-201',
      spec_section: '23 74 13',
      schedule_impact_days: 3,
      cost_impact_estimate: 3200,
      status: 'responded',
      official_response: 'Proceed with enlarged 54"x72" curb opening. Add two W8x15 structural cross-angles per revised detail S-102-R1 attached. Submit Change Event for added steel framing.',
      responded_at: new Date().toISOString(),
      has_change_event: true,
    });

    // 5. Change Event
    const ce = await insertWorkflowRecord<ChangeEvent>('change_events', {
      project_id: projectId,
      event_number: 'CE-018',
      title: 'Structural Steel Header Enlargement for RTU-1 Curb',
      description: 'Furnish and install two W8x15 steel header beams and welded angle clips per RFI-042 response.',
      origin_rfi_id: rfi.id,
      trade: 'Structural Metals & Mechanical',
      estimated_cost: 3200,
      contingency_allocation: 3200,
      schedule_delay_days: 2,
      status: 'approved',
    });

    // 6. Change Order
    await insertWorkflowRecord('change_orders', {
      project_id: projectId,
      co_number: 'PCO-005',
      title: 'Added Structural Framing at RTU-1 Roof Penetration',
      co_type: 'subcontract',
      contract_id: contract.id,
      amount: 3200,
      time_extension_days: 2,
      status: 'executed',
      approval_date: today,
      description: `Formal Change Order created from Change Event ${ce.event_number} per RFI-042.`,
    });

    // 7. Field Observations
    await insertWorkflowRecord('field_observations', {
      project_id: projectId,
      observation_number: 'OBS-031',
      category: 'quality',
      title: 'Verify Roof Curb Gasket Seal Before Crane Pick',
      description: 'Continuous neoprene gasket must be fully inspected and dry before RTU-1 is lowered onto the curb.',
      trade_partner: 'Apex Mechanical Contractors',
      assignee: 'Robert Mason (Superintendent)',
      location: 'Main Roof - Sector B',
      urgency: 'high',
      status: 'resolved',
      due_date: today,
    });

    await insertWorkflowRecord('field_observations', {
      project_id: projectId,
      observation_number: 'OBS-032',
      category: 'safety',
      title: 'Crane Hoist Rigging Inspection Tag Verified',
      description: '100-ton mobile crane certified rigging inspection complete. 50ft perimeter exclusion barricade active.',
      trade_partner: 'Apex Mechanical & Crane Rental',
      assignee: 'Safety Coordinator',
      location: 'Ground Staging Area',
      urgency: 'critical',
      status: 'closed',
      due_date: today,
    });

    // 8. Pay Application
    const payApp = await insertWorkflowRecord<PayApplication>('pay_applications', {
      project_id: projectId,
      contract_id: contract.id,
      application_number: 1,
      period_to: today,
      contract_amount: 44500,
      change_order_amount: 3200,
      total_completed_to_date: 25000,
      retainage_amount: 2500,
      previous_payments: 0,
      current_payment_due: 22500,
      status: 'approved',
      approved_at: new Date().toISOString(),
      notes: 'Application #1 for 50% equipment delivery and curb rough-in.',
    });

    await insertWorkflowRecord('pay_app_items', {
      pay_application_id: payApp.id,
      item_code: '23-01',
      description: 'RTU-1 Equipment Delivery on Site',
      scheduled_value: 30000,
      work_completed_previous: 0,
      work_completed_this_period: 20000,
      stored_materials: 0,
      total_completed: 20000,
      pct_complete: 66.7,
      balance_to_finish: 10000,
    });

    await insertWorkflowRecord('pay_app_items', {
      pay_application_id: payApp.id,
      item_code: '23-02',
      description: 'Roof Curb Installation & Flashing',
      scheduled_value: 8000,
      work_completed_previous: 0,
      work_completed_this_period: 5000,
      stored_materials: 0,
      total_completed: 5000,
      pct_complete: 62.5,
      balance_to_finish: 3000,
    });

    // 9. Payment
    await insertWorkflowRecord('payments', {
      project_id: projectId,
      pay_application_id: payApp.id,
      recipient_name: 'Apex Mechanical Contractors',
      amount: 22500,
      payment_date: today,
      payment_method: 'ACH',
      funding_account: 'Construction Draw Account #4012',
      check_or_tx_number: 'ACH-8892104',
      status: 'completed',
      cleared_at: new Date().toISOString(),
      notes: 'Disbursement for Pay App #1 approved by Project Manager.',
    });

    // 10. Risk Items
    await insertWorkflowRecord('risk_items', {
      project_id: projectId,
      title: 'Crane Pick Wind Window Restrictions',
      category: 'Schedule',
      probability: 'medium',
      impact: 'high',
      potential_cost_impact: 4500,
      potential_delay_days: 2,
      mitigation_strategy: 'Reserved secondary Saturday crane window with municipal road closure permit active.',
      status: 'mitigated',
    });

    await insertWorkflowRecord('risk_items', {
      project_id: projectId,
      title: 'Power Feed Re-routing for Higher Amp Draw',
      category: 'Cost',
      probability: 'low',
      impact: 'medium',
      potential_cost_impact: 1800,
      potential_delay_days: 0,
      mitigation_strategy: 'Electrical sub verified breaker panel capacity during submittal review.',
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully seeded Procore lifecycle workflow data!',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error seeding workflow data' }, { status: 500 });
  }
}
