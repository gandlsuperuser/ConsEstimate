-- ============================================================
-- ConsEstimate: Project Timeline & Gantt Chart Module
-- Database Schema Migration
-- Run this in the Supabase SQL Editor AFTER the base schema
-- ============================================================

-- ============================================================
-- RESOURCE TABLES
-- ============================================================

-- Employees / Team Members
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  role text not null default 'worker',
  department text,
  hourly_rate numeric(10,2) default 0,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- Subcontractors
create table if not exists subcontractors (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  specialty text,
  license_number text,
  hourly_rate numeric(10,2) default 0,
  rating numeric(3,1) default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- Equipment
create table if not exists equipment (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text,
  model text,
  serial_number text,
  daily_rate numeric(10,2) default 0,
  status text default 'available' check (status in ('available','in_use','maintenance','retired')),
  location text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- Materials
create table if not exists materials (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  unit text default 'ea',
  unit_cost numeric(12,2) default 0,
  supplier text,
  lead_time_days int default 0,
  in_stock numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- ============================================================
-- PROJECT TIMELINE TABLES
-- ============================================================

-- Project Phases (groups of tasks)
create table if not exists project_phases (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  sort_order int not null default 0,
  color text default '#6366f1',
  start_date date,
  end_date date,
  baseline_start date,
  baseline_end date,
  progress numeric(5,2) default 0 check (progress >= 0 and progress <= 100),
  status text default 'not_started' check (status in ('not_started','in_progress','completed','on_hold','cancelled')),
  is_collapsed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- Project Tasks
create table if not exists project_tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  phase_id uuid references project_phases(id) on delete set null,
  parent_task_id uuid references project_tasks(id) on delete set null,
  name text not null,
  description text,
  assigned_to text,
  department text,
  start_date date not null,
  end_date date not null,
  duration int not null default 1,
  working_days int,
  baseline_start date,
  baseline_end date,
  status text default 'not_started' check (status in ('not_started','in_progress','completed','on_hold','cancelled','delayed')),
  priority text default 'medium' check (priority in ('low','medium','high','critical')),
  progress numeric(5,2) default 0 check (progress >= 0 and progress <= 100),
  is_milestone boolean default false,
  is_critical boolean default false,
  sort_order int default 0,
  budget numeric(12,2) default 0,
  actual_cost numeric(12,2) default 0,
  estimated_cost numeric(12,2) default 0,
  weather_delay_days int default 0,
  inspection_required boolean default false,
  inspection_passed boolean,
  material_delivery_date date,
  completion_date date,
  notes text,
  color text,
  estimate_line_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- Task Dependencies
create table if not exists task_dependencies (
  id uuid primary key default uuid_generate_v4(),
  predecessor_id uuid not null references project_tasks(id) on delete cascade,
  successor_id uuid not null references project_tasks(id) on delete cascade,
  dependency_type text default 'FS' check (dependency_type in ('FS','FF','SS','SF')),
  lag_days int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (predecessor_id, successor_id)
);

-- Task Assignments (many-to-many)
create table if not exists task_assignments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references project_tasks(id) on delete cascade,
  resource_type text not null check (resource_type in ('employee','subcontractor','equipment','material','team')),
  resource_id uuid not null,
  allocation_pct numeric(5,2) default 100,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Project Milestones
create table if not exists project_milestones (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid references project_tasks(id) on delete set null,
  name text not null,
  description text,
  target_date date not null,
  actual_date date,
  status text default 'pending' check (status in ('pending','completed','missed','at_risk')),
  is_key_milestone boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- ============================================================
-- TRACKING & AUDIT TABLES
-- ============================================================

-- Project Updates / Status Reports
create table if not exists project_updates (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  content text,
  update_type text default 'general' check (update_type in ('general','milestone','delay','risk','budget','schedule')),
  author text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- Project Risks
create table if not exists project_risks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  probability text default 'medium' check (probability in ('low','medium','high')),
  impact text default 'medium' check (impact in ('low','medium','high','critical')),
  status text default 'open' check (status in ('open','mitigated','closed','occurred')),
  mitigation_plan text,
  owner text,
  identified_date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- Task Comments
create table if not exists task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references project_tasks(id) on delete cascade,
  author text not null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- Task Files
create table if not exists task_files (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references project_tasks(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  uploaded_by text,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- Task Status History
create table if not exists task_status_history (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references project_tasks(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by text,
  changed_at timestamptz default now(),
  notes text
);

-- Project Calendar (working hours / schedule config)
create table if not exists project_calendar (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  work_days jsonb default '["mon","tue","wed","thu","fri"]'::jsonb,
  work_start_time time default '07:00',
  work_end_time time default '17:00',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Holidays
create table if not exists holidays (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  holiday_date date not null,
  is_global boolean default false,
  created_at timestamptz default now()
);

-- Weather Delays
create table if not exists weather_delays (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid references project_tasks(id) on delete set null,
  delay_date date not null,
  delay_days int default 1,
  weather_type text check (weather_type in ('rain','snow','wind','extreme_heat','extreme_cold','storm','other')),
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  task_id uuid references project_tasks(id) on delete set null,
  title text not null,
  message text,
  type text default 'info' check (type in ('info','warning','urgent','success')),
  category text default 'general' check (category in ('general','deadline','overdue','material','inspection','completed','dependency','weather')),
  is_read boolean default false,
  action_url text,
  created_at timestamptz default now()
);

-- Activity Logs
create table if not exists activity_logs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  description text,
  actor text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Time Entries
create table if not exists time_entries (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references project_tasks(id) on delete cascade,
  employee_id uuid references employees(id) on delete set null,
  date date not null,
  hours numeric(5,2) not null,
  description text,
  billable boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- Task Checklists
create table if not exists task_checklists (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references project_tasks(id) on delete cascade,
  item text not null,
  is_completed boolean default false,
  sort_order int default 0,
  completed_at timestamptz,
  completed_by text,
  created_at timestamptz default now()
);

-- Inspection Records
create table if not exists inspection_records (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid references project_tasks(id) on delete set null,
  inspector_name text,
  inspection_type text,
  inspection_date date not null,
  result text check (result in ('passed','failed','conditional','pending')),
  notes text,
  report_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- Project Documents
create table if not exists project_documents (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  file_url text not null,
  file_type text,
  file_size bigint,
  category text default 'general',
  uploaded_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- Project Templates
create table if not exists project_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  project_type text check (project_type in ('commercial','residential')),
  template_data jsonb not null default '{}'::jsonb,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  deleted_at timestamptz
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_project_phases_project_id on project_phases(project_id);
create index if not exists idx_project_phases_sort on project_phases(project_id, sort_order);

create index if not exists idx_project_tasks_project_id on project_tasks(project_id);
create index if not exists idx_project_tasks_phase_id on project_tasks(phase_id);
create index if not exists idx_project_tasks_parent on project_tasks(parent_task_id);
create index if not exists idx_project_tasks_status on project_tasks(status);
create index if not exists idx_project_tasks_dates on project_tasks(start_date, end_date);
create index if not exists idx_project_tasks_sort on project_tasks(phase_id, sort_order);

create index if not exists idx_task_dependencies_predecessor on task_dependencies(predecessor_id);
create index if not exists idx_task_dependencies_successor on task_dependencies(successor_id);

create index if not exists idx_task_assignments_task on task_assignments(task_id);
create index if not exists idx_task_assignments_resource on task_assignments(resource_type, resource_id);

create index if not exists idx_milestones_project on project_milestones(project_id);
create index if not exists idx_milestones_date on project_milestones(target_date);

create index if not exists idx_project_updates_project on project_updates(project_id);
create index if not exists idx_project_risks_project on project_risks(project_id);
create index if not exists idx_task_comments_task on task_comments(task_id);
create index if not exists idx_task_status_history_task on task_status_history(task_id);
create index if not exists idx_weather_delays_project on weather_delays(project_id);
create index if not exists idx_notifications_project on notifications(project_id);
create index if not exists idx_notifications_read on notifications(is_read);
create index if not exists idx_activity_logs_project on activity_logs(project_id);
create index if not exists idx_time_entries_task on time_entries(task_id);
create index if not exists idx_task_checklists_task on task_checklists(task_id);
create index if not exists idx_inspection_records_project on inspection_records(project_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table employees enable row level security;
alter table subcontractors enable row level security;
alter table equipment enable row level security;
alter table materials enable row level security;
alter table project_phases enable row level security;
alter table project_tasks enable row level security;
alter table task_dependencies enable row level security;
alter table task_assignments enable row level security;
alter table project_milestones enable row level security;
alter table project_updates enable row level security;
alter table project_risks enable row level security;
alter table task_comments enable row level security;
alter table task_files enable row level security;
alter table task_status_history enable row level security;
alter table project_calendar enable row level security;
alter table holidays enable row level security;
alter table weather_delays enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;
alter table time_entries enable row level security;
alter table task_checklists enable row level security;
alter table inspection_records enable row level security;
alter table project_documents enable row level security;
alter table project_templates enable row level security;

-- Public access policies (matching existing app pattern)
-- In production, replace with authenticated user policies

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'employees','subcontractors','equipment','materials',
    'project_phases','project_tasks','task_dependencies','task_assignments',
    'project_milestones','project_updates','project_risks',
    'task_comments','task_files','task_status_history',
    'project_calendar','holidays','weather_delays',
    'notifications','activity_logs','time_entries',
    'task_checklists','inspection_records','project_documents','project_templates'
  ])
  loop
    execute format('create policy "Public select on %1$s" on %1$s for select using (true)', t);
    execute format('create policy "Public insert on %1$s" on %1$s for insert with check (true)', t);
    execute format('create policy "Public update on %1$s" on %1$s for update using (true)', t);
    execute format('create policy "Public delete on %1$s" on %1$s for delete using (true)', t);
  end loop;
end
$$;
