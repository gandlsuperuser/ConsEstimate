export type ProjectType = 'commercial' | 'residential';
export type ProjectStatus = 'active' | 'bidding' | 'complete';

export const RESIDENTIAL_CATEGORIES = [
  'Demo',
  'Foundation',
  'Framing',
  'Roofing',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Insulation',
  'Drywall',
  'Flooring',
  'Cabinets/Millwork',
  'Paint',
  'Exterior',
  'Landscaping',
  'Overhead',
  'Equipment',
  'Permits',
  'Other',
] as const;

export const COMMERCIAL_DIVISIONS = [
  { code: '01', name: 'General Requirements' },
  { code: '02', name: 'Existing Conditions' },
  { code: '03', name: 'Concrete' },
  { code: '04', name: 'Masonry' },
  { code: '05', name: 'Metals' },
  { code: '06', name: 'Wood, Plastics, and Composites' },
  { code: '07', name: 'Thermal and Moisture Protection' },
  { code: '08', name: 'Openings' },
  { code: '09', name: 'Finishes' },
  { code: '10', name: 'Specialties' },
  { code: '11', name: 'Equipment' },
  { code: '12', name: 'Furnishings' },
  { code: '13', name: 'Special Construction' },
  { code: '14', name: 'Conveying Equipment' },
  { code: '15', name: 'Mechanical' },
  { code: '16', name: 'Electrical' },
] as const;

export type ResidentialCategory = typeof RESIDENTIAL_CATEGORIES[number];
export type CommercialDivision = typeof COMMERCIAL_DIVISIONS[number]['code'];

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  client_name: string;
  address: string;
  start_date: string;
  end_date?: string;
  status: ProjectStatus | string;
  overhead_pct: number;
  profit_pct: number;
  created_at: string;
}

export interface EstimateLine {
  id: string;
  project_id: string;
  category: string;
  division_code: string | null;
  description: string;
  quantity: number;
  unit: string;
  labor_unit_cost: number;
  material_unit_cost: number;
  sub_cost: number;
  estimated_total: number;
  actual_total: number;
  notes: string;
}

export interface Expense {
  id: string;
  project_id: string;
  category: string;
  vendor: string;
  expense_date: string;
  amount: number;
  receipt_url: string | null;
  scan_confidence: 'high' | 'medium' | 'low';
  notes: string;
  created_at: string;
}

export interface ReceiptScanResult {
  vendor: string;
  date: string | null;
  total: number;
  currency: string;
  items: { description: string; amount: number }[];
  suggested_category: string;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

export interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  storage_path: string;
  file_name: string;
  caption?: string;
  category?: 'site' | 'progress' | 'before_after' | 'issue' | 'other';
  uploaded_at: string;
  file_size?: number;
}

// ============================================================
// PROCORE WORKFLOW TYPES (Estimate → Bid → Contract → ...)
// ============================================================

// 1. Bids & Packages
export interface BidPackage {
  id: string;
  project_id: string;
  title: string;
  trade: string;
  division_code?: string;
  scope_description: string;
  estimated_budget: number;
  due_date: string;
  status: 'draft' | 'open' | 'leveling' | 'awarded' | 'closed';
  awarded_bid_id?: string;
  bids?: Bid[];
  created_at?: string;
}

export interface Bid {
  id: string;
  bid_package_id: string;
  subcontractor_name: string;
  contact_email?: string;
  contact_phone?: string;
  base_bid_amount: number;
  alternate_amount?: number;
  inclusions?: string;
  exclusions?: string;
  submitted_date: string;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'awarded' | 'rejected';
  notes?: string;
  created_at?: string;
}

// 2. Contracts & Commitments
export interface Contract {
  id: string;
  project_id: string;
  contract_number: string;
  title: string;
  vendor_name: string;
  contract_type: 'subcontract' | 'prime_contract' | 'purchase_order';
  original_amount: number;
  revised_amount: number;
  retainage_pct: number;
  start_date?: string;
  completion_date?: string;
  status: 'draft' | 'out_for_signature' | 'approved' | 'executed' | 'closed';
  approval_step?: string;
  e_signed_at?: string;
  notes?: string;
  created_at?: string;
}

// 3. Submittals
export interface Submittal {
  id: string;
  project_id: string;
  spec_division: string;
  submittal_number: string;
  title: string;
  description?: string;
  subcontractor_name?: string;
  approver_name?: string;
  received_date: string;
  required_on_site_date?: string;
  lead_time_weeks?: number;
  status: 'draft' | 'pending' | 'under_review' | 'approved' | 'approved_as_noted' | 'revise_resubmit' | 'rejected';
  is_substitution: boolean;
  substitution_cost_delta: number;
  schedule_risk_level: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
  created_at?: string;
}

// 4. RFIs (BTX Contractors RFI Transmittal Standard)
export interface RFI {
  id: string;
  project_id: string;
  rfi_number: string;
  subject: string;
  question: string;
  suggestion?: string;
  official_response?: string;
  transmittal_id?: string;
  rfi_type?: string;
  purpose?: string;
  via?: string;
  assigned_to?: string;
  drawing_number?: string;
  spec_section?: string;
  drawing_spec_ref?: string;
  attachments?: string;
  cost_impact_choice?: 'Yes' | 'No' | 'TBD';
  schedule_impact_choice?: 'Yes' | 'No' | 'TBD';
  schedule_impact_days: number;
  cost_impact_estimate: number;
  status: 'draft' | 'open' | 'responded' | 'closed';
  responded_at?: string;
  has_change_event: boolean;
  change_event_id?: string;
  created_at?: string;
}

// 5. Change Events
export interface ChangeEvent {
  id: string;
  project_id: string;
  event_number: string;
  title: string;
  description?: string;
  origin_rfi_id?: string;
  trade?: string;
  estimated_cost: number;
  contingency_allocation: number;
  schedule_delay_days: number;
  status: 'open' | 'pricing' | 'under_review' | 'approved' | 'rejected' | 'void';
  change_order_id?: string;
  created_at?: string;
}

// 6. Change Orders
export interface ChangeOrder {
  id: string;
  project_id: string;
  co_number: string;
  title: string;
  co_type: 'prime' | 'subcontract';
  contract_id?: string;
  amount: number;
  time_extension_days: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'executed' | 'rejected';
  approval_date?: string;
  description?: string;
  created_at?: string;
}

// 7. Field Observations
export interface FieldObservation {
  id: string;
  project_id: string;
  observation_number: string;
  category: 'quality' | 'safety' | 'punch_list' | 'progress' | 'environmental';
  title: string;
  description?: string;
  trade_partner?: string;
  assignee?: string;
  location?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'ready_for_review' | 'resolved' | 'closed';
  due_date?: string;
  photo_url?: string;
  created_at?: string;
}

// 8. Pay Applications & SOV
export interface PayApplication {
  id: string;
  project_id: string;
  contract_id: string;
  application_number: number;
  period_to: string;
  contract_amount: number;
  change_order_amount: number;
  total_completed_to_date: number;
  retainage_amount: number;
  previous_payments: number;
  current_payment_due: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'paid' | 'rejected';
  approved_at?: string;
  notes?: string;
  items?: PayAppItem[];
  created_at?: string;
}

export interface PayAppItem {
  id: string;
  pay_application_id: string;
  item_code?: string;
  description: string;
  scheduled_value: number;
  work_completed_previous: number;
  work_completed_this_period: number;
  stored_materials: number;
  total_completed: number;
  pct_complete: number;
  balance_to_finish: number;
}

// 9. Payments
export interface Payment {
  id: string;
  project_id: string;
  pay_application_id?: string;
  recipient_name: string;
  amount: number;
  payment_date: string;
  payment_method: 'ACH' | 'Wire' | 'Check' | 'Credit Card';
  funding_account: string;
  check_or_tx_number?: string;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  cleared_at?: string;
  notes?: string;
  created_at?: string;
}

// 10. Risk Items
export interface RiskItem {
  id: string;
  project_id: string;
  title: string;
  category: 'Cost' | 'Schedule' | 'Quality' | 'Safety' | 'Procurement' | 'Permits';
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  potential_cost_impact: number;
  potential_delay_days: number;
  mitigation_strategy?: string;
  status: 'active' | 'mitigated' | 'realized' | 'closed';
  created_at?: string;
}

// ============================================================
// EXTENDED MODULE TYPES (Drawings, Action Plans, Comms, etc.)
// ============================================================

// 11. Drawings & Markup
export interface ProjectDrawing {
  id: string;
  project_id: string;
  drawing_number: string;
  title: string;
  discipline: 'Architectural' | 'Structural' | 'Mechanical' | 'Electrical' | 'Plumbing' | 'Civil';
  revision_number: string;
  set_date: string;
  url?: string;
  markups_count?: number;
  created_at?: string;
}

export interface DrawingMarkup {
  id: string;
  drawing_id: string;
  markup_type: 'cloud' | 'arrow' | 'callout' | 'measurement' | 'dimension' | 'pen' | 'rectangle' | 'rfi_pin' | 'obs_pin';
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
  text?: string;
  linked_record_id?: string;
  color?: string;
  strokeWidth?: number;
  author_name: string;
  created_at?: string;
}

// 12. Action Plans & Quality Checklists
export interface ActionPlan {
  id: string;
  project_id: string;
  plan_number: string;
  title: string;
  plan_type: 'pre_installation' | 'quality_assurance' | 'commissioning' | 'safety_audit' | 'closeout';
  status: 'draft' | 'in_progress' | 'completed';
  assigned_to?: string;
  due_date?: string;
  items?: ActionPlanItem[];
  created_at?: string;
}

export interface ActionPlanItem {
  id: string;
  action_plan_id: string;
  step_number: number;
  section: string;
  requirement_title: string;
  is_completed: boolean;
  completed_by?: string;
  completed_at?: string;
  notes?: string;
}

// 13. Conversations & Messages
export interface ProjectMessage {
  id: string;
  project_id: string;
  sender_name: string;
  sender_role: string;
  recipient_group: 'All Team' | 'Trade Partners' | 'Design Team' | 'Ownership' | 'Internal';
  message_text: string;
  linked_record_type?: string;
  linked_record_id?: string;
  created_at: string;
}

// 14. Owner Billing (GC to Owner / Upstream) — AIA G702/G703
export interface OwnerBillingItem {
  id: string;
  billing_id: string;
  item_number: number;
  description: string;
  scheduled_value: number;
  work_completed_previous: number;
  work_completed_this_period: number;
  stored_materials: number;
  total_completed: number;      // auto: prev + this_period + stored
  pct_complete: number;         // auto: total / scheduled * 100
  balance_to_finish: number;    // auto: scheduled - total
  retainage: number;            // auto or variable rate
}

export interface OwnerBilling {
  id: string;
  project_id: string;
  application_number: number;
  period_to: string;
  // G702 header fields
  owner_name?: string;
  owner_address?: string;
  contractor_name?: string;
  contractor_address?: string;
  project_name?: string;
  project_address?: string;
  contract_for?: string;
  via_architect?: string;
  project_nos?: string;
  contract_date?: string;
  purchase_order?: string;
  distribution_to?: string[];
  // G702 summary calculations
  original_contract_sum: number;
  net_change_orders: number;
  contract_sum_to_date: number;
  total_completed_and_stored: number;
  retainage_completed_pct?: number;
  retainage_stored_pct?: number;
  retainage_amount: number;
  total_earned_less_retainage: number;
  less_previous_certificates: number;
  current_payment_due: number;
  balance_to_finish_incl_retainage?: number;
  // Change Order Summary
  change_order_additions?: number;
  change_order_deductions?: number;
  // Signatures & Certifications
  contractor_signature_by?: string;
  contractor_signature_date?: string;
  state_of?: string;
  county_of?: string;
  notary_day?: string;
  notary_month_year?: string;
  notary_public?: string;
  notary_commission_expires?: string;
  amount_certified?: number;
  architect_signature_by?: string;
  architect_signature_date?: string;
  // Status
  status: 'draft' | 'submitted' | 'approved' | 'paid';
  items?: OwnerBillingItem[];
  created_at?: string;
}

// 15. Trade Partner Directory & Scorecards
export interface VendorPartner {
  id: string;
  project_id: string;
  company_name: string;
  trade: string;
  contact_name: string;
  email: string;
  phone: string;
  safety_emr_rating: number;
  quality_score: number;
  awarded_contracts_count: number;
  historical_spend: number;
  is_prequalified: boolean;
  notes?: string;
}

// 16. Audit Log & Activity Trail
export interface AuditActivity {
  id: string;
  project_id: string;
  actor_name: string;
  action_type: 'create' | 'update' | 'approve' | 'execute' | 'disburse' | 'convert';
  module: string;
  description: string;
  timestamp: string;
}

// 17. In-App Notifications
export interface InAppNotification {
  id: string;
  title: string;
  description: string;
  module: string;
  link: string;
  is_read: boolean;
  created_at: string;
}
