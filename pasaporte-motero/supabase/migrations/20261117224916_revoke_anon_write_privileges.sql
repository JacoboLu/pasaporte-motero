-- Defensa en profundidad: el rol anon no necesita escribir en ninguna tabla.
-- RLS ya bloquea esas escrituras (no existen políticas de escritura para anon); esto quita además el permiso a nivel de tabla.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
-- Las tablas nuevas tampoco concederán escritura a anon por defecto.
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon;
