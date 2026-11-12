-- Pasaporte Motero: reparar compatibilidad del feed de comunidad.
-- Algunas instalaciones crearon public.posts antes de que existiera la columna title.
-- La operación es segura si la columna ya existe.
alter table public.posts
  add column if not exists title text;

-- Mantener un título legible para publicaciones antiguas sin título.
update public.posts
set title = 'Una nueva aventura'
where title is null or btrim(title) = '';
