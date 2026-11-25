-- Pasaporte Motero: reminders and administrative audit trail. Additive only.
create table if not exists public.rider_reminders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check (char_length(btrim(title)) between 3 and 120),
 reminder_type text not null default 'custom' check (reminder_type in ('maintenance','document','custom')),
 due_date date,
 due_odometer_km numeric(10,1) check (due_odometer_km is null or due_odometer_km >= 0),
 notes text check (notes is null or char_length(notes) <= 500),
 is_completed boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint rider_reminders_due_required check (due_date is not null or due_odometer_km is not null)
);
create index if not exists rider_reminders_user_due_idx on public.rider_reminders(user_id,due_date) where is_completed=false;
create index if not exists rider_reminders_user_created_idx on public.rider_reminders(user_id,created_at desc);
alter table public.rider_reminders enable row level security;
drop policy if exists "Riders manage own reminders" on public.rider_reminders;
create policy "Riders manage own reminders" on public.rider_reminders for all to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
grant select,insert,update,delete on public.rider_reminders to authenticated;

create table if not exists public.admin_audit_log (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references auth.users(id) on delete set null,
 action text not null check (char_length(action) between 1 and 80),
 entity_type text not null check (char_length(entity_type) between 1 and 80),
 entity_id text,
 before_data jsonb,
 after_data jsonb,
 created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log(actor_id,created_at desc);
alter table public.admin_audit_log enable row level security;
drop policy if exists "Admins read audit log" on public.admin_audit_log;
create policy "Admins read audit log" on public.admin_audit_log for select to authenticated
 using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
revoke all on public.admin_audit_log from anon,authenticated;
grant select on public.admin_audit_log to authenticated;
