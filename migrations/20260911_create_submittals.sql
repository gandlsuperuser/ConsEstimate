-- Apply to the database configured by NEXT_PUBLIC_SUPABASE_URL.
-- Requires the existing public.projects table. Does not change existing records.
begin;

create table if not exists public.submittals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
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

create index if not exists idx_submittals_project_created
  on public.submittals (project_id, created_at desc);

-- Match access to the parent project, including its existing RLS policies.
alter table public.submittals enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'submittals' and policyname = 'Submittals for accessible projects') then
    create policy "Submittals for accessible projects" on public.submittals
      for all to anon, authenticated
      using (exists (select 1 from public.projects where projects.id = submittals.project_id))
      with check (exists (select 1 from public.projects where projects.id = submittals.project_id));
  end if;
end $$;

grant select, insert, update, delete on public.submittals to anon, authenticated;
notify pgrst, 'reload schema';
commit;
