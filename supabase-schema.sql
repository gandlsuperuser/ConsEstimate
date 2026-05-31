-- ConsEstimate Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects table
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('commercial', 'residential')),
  client_name text not null,
  address text not null,
  start_date date not null,
  status text not null default 'active' check (status in ('active', 'bidding', 'complete')),
  overhead_pct numeric(5,2) not null default 10.00,
  profit_pct numeric(5,2) not null default 10.00,
  created_at timestamp with time zone default now()
);

-- Estimate lines table
create table if not exists estimate_lines (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  category text not null,
  division_code text,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit text not null default 'ea',
  labor_unit_cost numeric(12,2) not null default 0,
  material_unit_cost numeric(12,2) not null default 0,
  sub_cost numeric(12,2) not null default 0,
  estimated_total numeric(12,2) not null default 0,
  actual_total numeric(12,2) not null default 0,
  notes text
);

-- Expenses table
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  category text not null,
  vendor text not null,
  expense_date date not null,
  amount numeric(12,2) not null,
  receipt_url text,
  scan_confidence text check (scan_confidence in ('high', 'medium', 'low')),
  notes text,
  created_at timestamp with time zone default now()
);

-- Indexes for better query performance
create index if not exists idx_estimate_lines_project_id on estimate_lines(project_id);
create index if not exists idx_expenses_project_id on expenses(project_id);
create index if not exists idx_expenses_category on expenses(category);

-- Row Level Security (RLS) - Enable for production
alter table projects enable row level security;
alter table estimate_lines enable row level security;
alter table expenses enable row level security;

-- Public read access for all tables (adjust as needed for your security requirements)
create policy "Public read access on projects" on projects for select using (true);
create policy "Public insert access on projects" on projects for insert with check (true);
create policy "Public update access on projects" on projects for update using (true);
create policy "Public delete access on projects" on projects for delete using (true);

create policy "Public read access on estimate_lines" on estimate_lines for select using (true);
create policy "Public insert access on estimate_lines" on estimate_lines for insert with check (true);
create policy "Public update access on estimate_lines" on estimate_lines for update using (true);
create policy "Public delete access on estimate_lines" on estimate_lines for delete using (true);

create policy "Public read access on expenses" on expenses for select using (true);
create policy "Public insert access on expenses" on expenses for insert with check (true);
create policy "Public update access on expenses" on expenses for update using (true);
create policy "Public delete access on expenses" on expenses for delete using (true);

-- Storage bucket for receipts
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Storage policy for receipts
create policy "Public read access on receipts" on storage.objects for select using (bucket_id = 'receipts');
create policy "Public upload access on receipts" on storage.objects for insert with check (bucket_id = 'receipts');
create policy "Public delete access on receipts" on storage.objects for delete using (bucket_id = 'receipts');
