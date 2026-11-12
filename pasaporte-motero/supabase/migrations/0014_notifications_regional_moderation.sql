-- PASAPORTE MOTERO · fase 1-4: notificaciones y operación regional
-- No elimina ni modifica registros históricos. Idempotente.

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('follow','like','comment','visit_approved','visit_rejected','stamp_earned','system')),
  entity_type text,
  entity_id uuid,
  message text not null check (char_length(message) between 1 and 500),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_recipient_created_idx
  on public.user_notifications(recipient_id, created_at desc);
create index if not exists user_notifications_unread_idx
  on public.user_notifications(recipient_id) where read_at is null;
alter table public.user_notifications enable row level security;
drop policy if exists "Users read own notifications" on public.user_notifications;
create policy "Users read own notifications" on public.user_notifications
  for select to authenticated using (recipient_id = auth.uid());
drop policy if exists "Users mark own notifications read" on public.user_notifications;
create policy "Users mark own notifications read" on public.user_notifications
  for update to authenticated using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid() and actor_id is not distinct from actor_id
    and event_type = event_type and message = message and created_at = created_at);
-- Clients cannot create notifications directly; trusted database triggers do it.

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.user_notifications(recipient_id, actor_id, event_type, entity_type, entity_id, message)
  values (new.following_id, new.follower_id, 'follow', 'profile', new.follower_id,
    'Un motociclista comenzó a seguirte.');
  return new;
end;
$$;
drop trigger if exists notify_follow_created on public.follows;
create trigger notify_follow_created after insert on public.follows
for each row execute function public.notify_on_follow();

create or replace function public.notify_on_post_like()
returns trigger language plpgsql security definer set search_path = public
as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.user_notifications(recipient_id, actor_id, event_type, entity_type, entity_id, message)
    values (owner_id, new.user_id, 'like', 'post', new.post_id, 'A alguien le gustó tu publicación.');
  end if;
  return new;
end;
$$;
drop trigger if exists notify_post_like_created on public.post_likes;
create trigger notify_post_like_created after insert on public.post_likes
for each row execute function public.notify_on_post_like();

create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public
as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.user_notifications(recipient_id, actor_id, event_type, entity_type, entity_id, message)
    values (owner_id, new.user_id, 'comment', 'post', new.post_id, 'Alguien comentó tu publicación.');
  end if;
  return new;
end;
$$;
drop trigger if exists notify_comment_created on public.comments;
create trigger notify_comment_created after insert on public.comments
for each row execute function public.notify_on_comment();

-- Encargados regionales: asignación explícita a uno o varios departamentos.
create table if not exists public.department_managers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  department_code text not null references public.passport_department_catalog(code) on delete cascade,
  assigned_by uuid not null references auth.users(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, department_code)
);
create index if not exists department_managers_user_active_idx
  on public.department_managers(user_id, department_code) where is_active;
alter table public.department_managers enable row level security;
drop policy if exists "Admins manage department managers" on public.department_managers;
create policy "Admins manage department managers" on public.department_managers
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "Managers read own assignments" on public.department_managers;
create policy "Managers read own assignments" on public.department_managers
  for select to authenticated using (user_id = auth.uid());

-- Encargados solo pueden consultar las visitas de los departamentos que tienen asignados.
drop policy if exists "Department managers read regional visits" on public.app_visits;
create policy "Department managers read regional visits" on public.app_visits
  for select to authenticated
  using (
    exists (
      select 1
      from public.destination_catalog d
      join public.department_managers dm on dm.department_code = upper(left(d.department, 3))
      where d.id = app_visits.destination_id
        and dm.user_id = auth.uid()
        and dm.is_active
    )
  );

-- Los administradores pueden revisar denuncias; los usuarios solo ven las propias.
drop policy if exists "Admins review content reports" on public.content_reports;
create policy "Admins review content reports" on public.content_reports
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
