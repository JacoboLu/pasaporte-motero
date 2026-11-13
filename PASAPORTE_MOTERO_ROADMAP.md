# PASAPORTE MOTERO — plan de cierre por fases

## Entorno
- Frontend: Cloudflare Pages
- Código: GitHub
- Datos y autenticación: Supabase
- Producción protegida: cambios pasan primero por Preview y PR.

## Fase 1 — Estabilización
- [x] Corregir lectura de evidencias de visitas: se suben a `travel-media`, por tanto la galería debe firmar y borrar desde ese mismo bucket.
- [x] No afirmar que las escrituras offline se guardan localmente: aclarar el comportamiento real.
- [ ] Probar GPS en Android/iOS y permisos denegados.
- [ ] Probar QR con dos cuentas y caducidad/reutilización.
- [ ] Validar aprobación/rechazo y generación única de sellos.
- [x] Versionar en GitHub las 7 Edge Functions activas recuperadas desde Supabase (sin redeplegar ni alterar producción).
- [ ] Revisar RLS, Storage y recuperación de cuenta.

## Fase 2 — Pasaporte y destinos
- [ ] Auditar coordenadas y radios de geocerca de cada destino.
- [ ] Añadir imágenes verificadas y con licencia/atribución por destino.
- [ ] Añadir logros, hitos y progreso sin modificar sellos históricos.

## Fase 3 — Comunidad
- [x] Backend de notificaciones por seguidores, likes y comentarios.
- [x] UI de bandeja y marcado como leído (contador persistente pendiente de conectar y probar con la migración).
- [ ] Flujo de reportes y moderación en el panel.
- [ ] Probar visibilidad pública/seguidores/privada.

## Fase 4 — Administración
- [x] Esquema de asignación de encargados por departamento y lectura regional acotada.
- [ ] UI de administración para asignaciones.
- [ ] Cola de revisión de visitas y de reportes.
- [ ] CRUD seguro del catálogo con auditoría.

## Fase 5 — Funciones avanzadas
- [ ] Planificador de rutas y navegación externa.
- [ ] Cola offline persistente y sincronización idempotente.
- [ ] Recordatorios configurables de mantenimiento/documentos.
- [ ] Exportación y eliminación de cuenta.
- [ ] Gamificación avanzada.

## Criterio de aceptación
Una fase solo se marca completa cuando su interfaz, permisos, base de datos y flujo real han sido probados. Las tablas y triggers no equivalen a una funcionalidad completa de cara al usuario.
