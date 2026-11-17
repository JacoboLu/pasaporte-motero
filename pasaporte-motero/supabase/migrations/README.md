# Migraciones de Supabase

Este directorio debe reproducir el esquema del proyecto `vngbrvfvoqdrhnxcnmdu`. Las migraciones se aplican en orden alfabético de nombre de archivo.

## Estructura

- `0001` a `0011`: migraciones iniciales. **No están registradas** en el historial remoto (`supabase_migrations.schema_migrations`); se aplicaron antes del 12 de noviembre de 2026 por otra vía.
- `20261112…` en adelante: migraciones con la **misma versión** que tienen en el historial remoto, salvo las dos indicadas abajo. El SQL de las migraciones `20261112170416` a `20261112205337` y `20261112225027` se recuperó del historial remoto, porque solo existían en producción.
- `20261113133856`, `20261113141328` y `20261113144208` eran antes `0014`, `0015` y `0016`. Se renombraron con su versión remota para que el orden de aplicación coincida con el que tuvieron en producción. Su contenido no cambió.

## Pendientes conocidos

1. **Versiones duplicadas `0003`.** Hay tres archivos que empiezan por `0003_`. La CLI de Supabase exige versiones únicas, así que `supabase db push` no funcionará hasta renombrarlos (por ejemplo `0003`, `0004`, `0005`, conservando el orden alfabético actual).
2. **Historial remoto incompleto.** Antes de usar `supabase db push`, marca `0001`–`0011` como aplicadas con `supabase migration repair --status applied <versión>`; de lo contrario la CLI intentará ejecutarlas de nuevo sobre producción.
3. **`20261112233000` y `20261112233500`** existen en el repo pero no figuran con esa versión en el historial remoto. Sus efectos (vista `public_profiles` con `security_invoker` e índices de claves foráneas de sellos) ya están aplicados en producción.
4. **Sin probar desde cero.** Reconstruir una base vacía con estos archivos no se ha probado. Pruébalo en una rama de Supabase o en local (`supabase db reset`) antes de depender de ello.
5. Algunas migraciones del repo (`0015`, `0016`, `20261117221522`, `add_arequipa_destinations`) difieren en formato y comentarios del texto guardado en el historial remoto; se comprobó que `0015` y `20261117221522` son equivalentes en lo que ejecutan.
