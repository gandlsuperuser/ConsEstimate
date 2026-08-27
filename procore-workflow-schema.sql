-- ============================================================
-- Procore-Style Construction Lifecycle Workflow Schema
-- Complete Master Schema covering all 30 ConsJ.rule sections
-- ============================================================

-- 1. BIDDING & TRADE PACKAGES
create table if not exists bid_packages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  trade text not null,
  division_code text,
  scope_description text,
  estimated_budget numeric(12,2) default 0,
  due_date date,
  status text not null default 'open' check (status in ('draft', 'open', 'leveling', 'awarded', 'closed')),
  awarded_bid_id uuid,
  created_at timestamptz default now()
);

create table if not exists bids (
  id uuid primary key default uuid_generate_v4(),
  bid_package_id uuid not null references bid_packages(id) on delete cascade,
  subcontractor_name text not null,
  contact_email text,
  contact_phone text,
  base_bid_amount numeric(12,2) not null,
  alternate_amount numeric(12,2) default 0,
  inclusions text,
  exclusions text,
  submitted_date date default current_date,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'shortlisted', 'awarded', 'rejected')),
  notes text,
  created_at timestamptz default now()
);

-- 2. CONTRACTS & COMMITMENTS
create table if not exists contracts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  contract_number text not null,
  title text not null,
  vendor_name text not null,
  contract_type text not null default 'subcontract' check (contract_type in ('subcontract', 'prime_contract', 'purchase_order')),
  original_amount numeric(12,2) not null default 0,
  revised_amount numeric(12,2) not null default 0,
  retainage_pct numeric(5,2) not null default 10.00,
  start_date date,
  completion_date date,
  status text not null default 'draft' check (status in ('draft', 'out_for_signature', 'approved', 'executed', 'closed')),
  approval_step text default 'PM Review',
  e_signed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- 3. SPECIFICATIONS & SUBMITTALS
create table if not exists submittals (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  spec_division text not null,
  submittal_number text not null,
  title text not null,
  description text,
  subcontractor_name text,
  approver_name text,
  received_date date default current_date,
  required_on_site_date date,
  lead_time_weeks int default 0,
  status text not null default 'pending' check (status in ('draft', 'pending', 'under_review', 'approved', 'approved_as_noted', 'revise_resubmit', 'rejected')),
  is_substitution boolean default false,
  substitution_cost_delta numeric(12,2) default 0,
  schedule_risk_level text default 'low' check (schedule_risk_level in ('low', 'medium', 'high', 'critical')),
  notes text,
  created_at timestamptz default now()
);

-- 4. RFI (REQUEST FOR INFORMATION)
create table if not exists rfis (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  rfi_number text not null,
  subject text not null,
  question text not null,
  assigned_to text,
  drawing_number text,
  spec_section text,
  schedule_impact_days int default 0,
  cost_impact_estimate numeric(12,2) default 0,
  status text not null default 'open' check (status in ('draft', 'open', 'responded', 'closed')),
  official_response text,
  responded_at timestamptz,
  has_change_event boolean default false,
  change_event_id uuid,
  created_at timestamptz default now()
);

-- 5. CHANGE EVENTS
create table if not exists change_events (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  event_number text not null,
  title text not null,
  description text,
  origin_rfi_id uuid references rfis(id) on delete set null,
  trade text,
  estimated_cost numeric(12,2) not null default 0,
  contingency_allocation numeric(12,2) default 0,
  schedule_delay_days int default 0,
  status text not null default 'pricing' check (status in ('open', 'pricing', 'under_review', 'approved', 'rejected', 'void')),
  change_order_id uuid,
  created_at timestamptz default now()
);

-- 6. CHANGE ORDERS (PCO / CCO)
create table if not exists change_orders (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  co_number text not null,
  title text not null,
  co_type text not null default 'subcontract' check (co_type in ('prime', 'subcontract')),
  contract_id uuid references contracts(id) on delete set null,
  amount numeric(12,2) not null default 0,
  time_extension_days int default 0,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'executed', 'rejected')),
  approval_date date,
  description text,
  created_at timestamptz default now()
);

-- 7. FIELD OBSERVATIONS & QUALITY/SAFETY
create table if not exists field_observations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  observation_number text not null,
  category text not null default 'quality' check (category in ('quality', 'safety', 'punch_list', 'progress', 'environmental')),
  title text not null,
  description text,
  trade_partner text,
  assignee text,
  location text,
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'ready_for_review', 'resolved', 'closed')),
  due_date date,
  photo_url text,
  created_at timestamptz default now()
);

-- 8. PAY APPLICATIONS (AIA G702 / G703 Style)
create table if not exists pay_applications (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  contract_id uuid references contracts(id) on delete cascade,
  application_number int not null,
  period_to date not null,
  contract_amount numeric(12,2) not null,
  change_order_amount numeric(12,2) not null default 0,
  total_completed_to_date numeric(12,2) not null default 0,
  retainage_amount numeric(12,2) not null default 0,
  previous_payments numeric(12,2) not null default 0,
  current_payment_due numeric(12,2) not null default 0,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'under_review', 'approved', 'paid', 'rejected')),
  approved_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create table if not exists pay_app_items (
  id uuid primary key default uuid_generate_v4(),
  pay_application_id uuid not null references pay_applications(id) on delete cascade,
  item_code text,
  description text not null,
  scheduled_value numeric(12,2) not null,
  work_completed_previous numeric(12,2) default 0,
  work_completed_this_period numeric(12,2) default 0,
  stored_materials numeric(12,2) default 0,
  total_completed numeric(12,2) not null,
  pct_complete numeric(5,2) default 0,
  balance_to_finish numeric(12,2) not null
);

-- 9. PAYMENTS & DRAW-DOWN DISBURSEMENTS
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  pay_application_id uuid references pay_applications(id) on delete set null,
  recipient_name text not null,
  amount numeric(12,2) not null,
  payment_date date default current_date,
  payment_method text not null default 'ACH' check (payment_method in ('ACH', 'Wire', 'Check', 'Credit Card')),
  funding_account text not null default 'Operating Account',
  check_or_tx_number text,
  status text not null default 'scheduled' check (status in ('scheduled', 'processing', 'completed', 'failed')),
  cleared_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- 10. PROJECT RISK MATRIX
create table if not exists risk_items (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  category text not null check (category in ('Cost', 'Schedule', 'Quality', 'Safety', 'Procurement', 'Permits')),
  probability text not null check (probability in ('low', 'medium', 'high')),
  impact text not null check (impact in ('low', 'medium', 'high')),
  potential_cost_impact numeric(12,2) default 0,
  potential_delay_days int default 0,
  mitigation_strategy text,
  status text not null default 'active' check (status in ('active', 'mitigated', 'realized', 'closed')),
  created_at timestamptz default now()
);

-- 11. DRAWINGS & PLAN MARKUP
create table if not exists project_drawings (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  drawing_number text not null,
  title text not null,
  discipline text not null,
  revision_number text not null default '0',
  set_date date default current_date,
  url text,
  markups_count int default 0,
  created_at timestamptz default now()
);

create table if not exists drawing_markups (
  id uuid primary key default uuid_generate_v4(),
  drawing_id uuid not null references project_drawings(id) on delete cascade,
  markup_type text not null check (markup_type in ('cloud', 'arrow', 'callout', 'measurement', 'rfi_pin', 'obs_pin')),
  x numeric(6,2) not null,
  y numeric(6,2) not null,
  text text,
  linked_record_id uuid,
  color text default '#F47E20',
  author_name text not null,
  created_at timestamptz default now()
);

-- 12. ACTION PLANS & WORKFLOW CHECKLISTS
create table if not exists action_plans (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  plan_number text not null,
  title text not null,
  plan_type text not null check (plan_type in ('pre_installation', 'quality_assurance', 'commissioning', 'safety_audit', 'closeout')),
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed')),
  assigned_to text,
  due_date date,
  created_at timestamptz default now()
);

create table if not exists action_plan_items (
  id uuid primary key default uuid_generate_v4(),
  action_plan_id uuid not null references action_plans(id) on delete cascade,
  step_number int not null,
  section text not null,
  requirement_title text not null,
  is_completed boolean default false,
  completed_by text,
  completed_at timestamptz,
  notes text
);

-- 13. PROJECT CONVERSATIONS & MESSAGES
create table if not exists project_messages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  sender_name text not null,
  sender_role text not null default 'Project Manager',
  recipient_group text not null default 'All Team',
  message_text text not null,
  linked_record_type text,
  linked_record_id uuid,
  created_at timestamptz default now()
);

-- 14. OWNER BILLING (GC to Owner / Upstream)
create table if not exists owner_billings (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  application_number int not null,
  period_to date not null,
  original_contract_sum numeric(12,2) not null,
  net_change_orders numeric(12,2) not null default 0,
  contract_sum_to_date numeric(12,2) not null,
  total_completed_and_stored numeric(12,2) not null default 0,
  retainage_amount numeric(12,2) not null default 0,
  total_earned_less_retainage numeric(12,2) not null,
  less_previous_certificates numeric(12,2) not null default 0,
  current_payment_due numeric(12,2) not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'paid')),
  created_at timestamptz default now()
);

-- 15. TRADE PARTNER DIRECTORY & SCORECARDS
create table if not exists vendor_partners (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  company_name text not null,
  trade text not null,
  contact_name text not null,
  email text,
  phone text,
  safety_emr_rating numeric(4,2) default 0.85,
  quality_score numeric(3,1) default 4.8,
  awarded_contracts_count int default 1,
  historical_spend numeric(12,2) default 0,
  is_prequalified boolean default true,
  notes text,
  created_at timestamptz default now()
);

-- 16. AUDIT TRAIL & ACTIVITY LOG
create table if not exists audit_activities (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  actor_name text not null,
  action_type text not null,
  module text not null,
  description text not null,
  timestamp timestamptz default now()
);
