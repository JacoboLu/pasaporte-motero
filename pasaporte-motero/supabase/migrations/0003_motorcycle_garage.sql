-- Pasaporte Motero · ficha de motocicleta, mantenimiento y documentos
create table if not exists public.motorcycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  brand text not null,
  model text not null,
  year integer check (year is null or year between 1885 and 2100),
  photo_url text,
  displacement_cc integer check (displacement_cc is null or displacement_cc between 1 and 3000),
  motorcycle_type text not null default 'Adventure',
  fuel_type text not null default 'Gasolina',
  odometer_km numeric(12,1) check (odometer_km is null or odometer_km >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.motorcycle_maintenance (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  service_date date not null default current_date,
  service_type text not null,
  odometer_km numeric(12,1) check (odometer_km is null or odometer_km >= 0),
  cost_pen numeric(12,2) check (cost_pen is null or cost_pen >= 0),
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.motorcycle_documents (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  expiry_date date not null,
  created_at timestamptz not null default now()
);
alter table public.motorcycles enable row level security;
alter table public.motorcycle_maintenance enable row level security;
alter table public.motorcycle_documents enable row level security;
drop policy if exists "Owners manage own motorcycle" on public.motorcycles;
create policy "Owners manage own motorcycle" on public.motorcycles
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Owners manage own motorcycle maintenance" on public.motorcycle_maintenance;
create policy "Owners manage own motorcycle maintenance" on public.motorcycle_maintenance
for all to authenticated using (auth.uid() = user_id and exists (select 1 from public.motorcycles m where m.id = motorcycle_id and m.user_id = auth.uid()))
with check (auth.uid() = user_id and exists (select 1 from public.motorcycles m where m.id = motorcycle_id and m.user_id = auth.uid()));
drop policy if exists "Owners manage own motorcycle documents" on public.motorcycle_documents;
create policy "Owners manage own motorcycle documents" on public.motorcycle_documents
for all to authenticated using (auth.uid() = user_id and exists (select 1 from public.motorcycles m where m.id = motorcycle_id and m.user_id = auth.uid()))
with check (auth.uid() = user_id and exists (select 1 from public.motorcycles m where m.id = motorcycle_id and m.user_id = auth.uid()));
create index if not exists motorcycle_maintenance_owner_date_idx on public.motorcycle_maintenance(user_id, service_date desc);
create index if not exists motorcycle_documents_owner_expiry_idx on public.motorcycle_documents(user_id, expiry_date);
