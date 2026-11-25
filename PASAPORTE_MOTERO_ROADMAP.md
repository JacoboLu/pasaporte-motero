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
- [x] UI de bandeja, contador de no leídas y marcado como leído (pendiente prueba end-to-end con la migración aplicada).
- [ ] Flujo de reportes y moderación en el panel.
- [ ] Probar visibilidad pública/seguidores/privada.

## Fase 4 — Administración
- [x] Esquema de asignación de encargados por departamento y lectura regional acotada.
- [ ] UI de administración para asignaciones.
- [x] Restringir en código las Edge Functions de revisión y QR para que los encargados solo operen en departamentos asignados (requiere aplicar y probar migración 0014 antes del despliegue).
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


## Fase 1 — cambios preparados en feature/phase-1-stabilization
- [x] Restringir actualizaciones de visitas desde el cliente: solo se permite limpiar `evidence_path`; el estado, revisor y motivo quedan reservados al servidor.
- [x] Reforzar la política de inserción: solo visitas pendientes del usuario autenticado, sin campos de revisión y con coordenadas/notas dentro de límites.
- [x] Evitar dos visitas pendientes simultáneas del mismo usuario al mismo destino mediante índice único.
- [x] Validar precisión GPS en cliente y servidor (máximo 100 m) y exigir que distancia + incertidumbre esté dentro de la geocerca.
- [x] Evitar reenvíos GPS duplicados y mostrar mensaje específico al detectar una evidencia fotográfica pendiente.
- [x] Generar notificaciones al obtener sellos de destino y departamento.
- [x] Añadir comprobaciones de regresión al pipeline CI.
- [ ] Aplicar la migración en una rama/base de pruebas y luego en producción tras validar el PR.
- [ ] Probar GPS real en Android/iOS, permisos denegados, QR con dos cuentas, caducidad/reutilización, revisión y notificaciones end-to-end.
- [ ] Verificar visibilidad de publicaciones con cuentas públicas, seguidoras y no seguidoras.


---

## Ejecución de auditoría integral — 25/11/2026

### Cambios preparados en `stabilization/5-phases-2026-11`

- [x] Corregir el cliente inexistente usado en la consulta de coordenadas compartidas de `validate-gps-visit`: ahora utiliza el cliente administrativo del servidor.
- [x] Extraer normalización de categorías, validación del payload y cálculo de distancia a un módulo reutilizable y testeable.
- [x] Normalizar tildes y espacios correctamente antes de comparar categorías no físicas.
- [x] Rechazar destinos con coordenadas o radios de geocerca inválidos, sin otorgar sellos.
- [x] Añadir pruebas automatizadas para categorías españolas, coordenadas, precisión, distancia y regresión del cliente GPS.
- [x] Añadir diagnóstico SQL de solo lectura para identificar coordenadas compartidas, incompletas y geocercas inválidas.
- [x] Dejar de precargar el fondo PNG de 3.76 MB; usar el JPG existente de aproximadamente 15 KB y renovar la caché del Service Worker.
- [x] Incorporar pruebas GPS al pipeline CI.
- [ ] Ejecutar CI y corregir cualquier fallo antes de integrar.
- [ ] Desplegar la Edge Function GPS corregida después de validar el código.
- [ ] Probar GPS, QR, revisión y sincronización real en dispositivos.

### Hallazgos de datos que requieren revisión humana

- El catálogo contiene 4,700 destinos; 4,699 están activos.
- No se encontraron coordenadas ausentes, coordenadas fuera de rango ni radios de geocerca inválidos en la consulta global.
- Hay grupos de destinos activos que comparten exactamente las mismas coordenadas. No se modificarán automáticamente: algunos pueden ser registros regionales o lugares próximos, y requieren verificación geográfica antes de habilitar GPS individual.
- Las políticas RLS continúan habilitadas en las tablas públicas. El asesor de Supabase señala una tabla con RLS sin políticas (`visit_qr_challenges`); sus permisos de tabla para `anon` y `authenticated` están revocados, por lo que no se añadirá una política abierta para silenciar el aviso.

### Pendientes de configuración externa

- Activar la protección de contraseñas filtradas desde la configuración de Auth de Supabase; no existe una acción de configuración Auth disponible en esta conexión.
- Conciliar el historial de migraciones entre GitHub y Supabase antes de aplicar nuevas migraciones: no se ejecutará un reset ni se volverán a aplicar migraciones existentes.
- Probar la moderación, permisos de encargados, privacidad de publicaciones y flujos QR con cuentas reales.
- Completar la implementación de navegación, recordatorios, exportación/eliminación de cuenta y gamificación avanzada. La cola de evidencias fotográficas existente no equivale a sincronización offline idempotente de toda la aplicación.
- La modularización de `App.tsx` será incremental para no alterar pantallas que ya funcionan.

**Criterio de cierre:** ningún bloque se considerará terminado hasta que compile, pase pruebas automatizadas y supere pruebas funcionales con cuentas y dispositivos reales.

### Verificación de la rama y despliegues — 25/11/2026

- [x] GitHub Actions ejecutó `npm run build` y `npm run test:all`: ambos finalizaron correctamente en el commit `b03cb5c`.
- [x] Cloudflare Pages generó un deployment Preview exitoso para la rama de estabilización: https://f75453b1.pasaporte-motero.pages.dev
- [x] Supabase Edge Function `validate-gps-visit` desplegada en versión 9, con `verify_jwt=true` y los dos archivos versionados (`index.ts`, `validation.mjs`).
- [ ] Falta prueba funcional de una visita real con GPS en Android/iOS; el despliegue y las pruebas unitarias no sustituyen esa validación.
- [ ] No se desplegó a la rama de producción de Cloudflare Pages (`main`).

### Hallazgos adicionales de almacenamiento y catálogo

- El catálogo activo presenta 107 grupos de coordenadas compartidas que abarcan 332 destinos. Se mantiene la protección: esos destinos no deben obtener sellos por GPS hasta verificar y corregir sus coordenadas individualmente.
- Storage conserva políticas duplicadas o solapadas para algunos archivos de avatar y comunidad. No se eliminaron para evitar interrumpir lectura/borrado de archivos.
- El aviso de Supabase sobre `visit_qr_challenges` corresponde a RLS sin políticas, pero los permisos de tabla de `anon` y `authenticated` están revocados. No se creó una política de acceso para ocultar el aviso.


---

## Segunda entrega de implementación — 25/11/2026

### Fase 1 — Estabilización y seguridad
- [x] Corregir validación GPS server-side y bloquear coordenadas compartidas para evitar sellos incorrectos.
- [x] Validar precisión GPS, rangos de coordenadas, radios y categorías no físicas.
- [x] Cola persistente cifrada e idempotente para evidencias fotográficas sin conexión.
- [x] Mantener QR y revisión manual protegidos por JWT; el backend limita encargados a departamentos asignados.
- [x] Añadir pruebas automatizadas de regresión GPS, seguridad y controles de las fases nuevas.
- [ ] Completar pruebas físicas en Android/iOS, permisos GPS denegados, QR con dos cuentas y aprobación/rechazo real.
- [ ] Revisar recuperación de cuenta y probar sincronización en dos dispositivos con cuentas reales.

### Fase 2 — Pasaporte, catálogo y gamificación
- [x] Auditar coordenadas: 107 grupos de coordenadas compartidas abarcan 332 destinos activos. La validación GPS bloquea esos registros hasta corregirlos.
- [x] Mantener el otorgamiento de sellos únicamente desde visitas validadas; no se modifican sellos históricos.
- [x] Ampliar logros con hitos de destinos, departamentos, publicaciones y bitácoras; incorporar niveles XP y rachas calculadas con visitas validadas.
- [ ] Completar fotografías verificadas para todo el catálogo. El proceso por bloques de 20 sigue disponible; destinos sin coincidencia/licencia verificable permanecen sin imagen.
- [ ] Verificar y corregir manualmente las coordenadas duplicadas con fuentes geográficas confiables.

### Fase 3 — Comunidad
- [x] Mantener notificaciones in-app de seguidores, likes, comentarios y revisión de visitas.
- [x] Bandeja de reportes y acciones de moderación para administradores.
- [x] Conservar políticas de visibilidad para publicaciones públicas, seguidores y privadas.
- [ ] Ejecutar pruebas de privacidad con cuentas reales públicas, seguidoras y no seguidoras, incluyendo comentarios y fotografías.
- [ ] Notificaciones push en segundo plano: no incluidas en esta entrega; la bandeja actual es in-app.

### Fase 4 — Administración
- [x] Panel regional disponible para encargados con rol `manager`.
- [x] Cola de evidencias fotográficas filtrada en backend por departamentos asignados.
- [x] Validación QR limitada por departamento en el backend.
- [x] UI de asignación/desactivación de encargados para administradores.
- [x] CRUD de destinos con Edge Function de acceso exclusivo para administradores.
- [x] Registro de auditoría para altas, ediciones y desactivaciones del catálogo.
- [ ] Prueba funcional con un administrador y encargados de dos departamentos distintos.

### Fase 5 — Funciones avanzadas
- [x] Planificación de bitácoras con paradas del catálogo y paradas personalizadas.
- [x] Apertura de navegación externa con Google Maps para rutas de dos o más paradas.
- [x] Recordatorios sincronizados de mantenimiento, documentos y tareas, por fecha o kilometraje.
- [x] Exportación de los datos personales accesibles por RLS en JSON.
- [x] Solicitud de eliminación de cuenta con confirmación literal, sesión reciente, limpieza de QR asociados, protección de último administrador y limpieza de archivos personales.
- [x] Gamificación ampliada con XP, niveles, logros adicionales y rachas de visitas validadas.
- [ ] Extender la cola offline a operaciones distintas de evidencias fotográficas. No se promete edición offline completa.
- [ ] Probar exportación y eliminación de cuenta en una cuenta de prueba con archivos en cada bucket antes de recomendar su uso en producción.
- [ ] Recordatorios push/background: no incluidos; los recordatorios se consultan dentro de la aplicación.

### Cambios de base de datos y funciones desplegados
- Migración aplicada: `20261125184054_rider_reminders_and_admin_audit`.
- Tablas nuevas: `rider_reminders` (RLS por propietario) y `admin_audit_log` (lectura solo de administradores; escrituras desde backend).
- Edge Functions nuevas: `manage-destination-catalog` v2 y `delete-account` v2, ambas con JWT obligatorio.
- Edge Function GPS existente: `validate-gps-visit` v9.
- Las nuevas funciones de catálogo y eliminación no se han ejecutado con cuentas reales durante esta validación para evitar modificar destinos o eliminar cuentas reales.

### Límites del plan gratuito y hallazgos de seguridad
- La protección de contraseñas filtradas de Supabase Auth requiere el plan Pro o superior según la documentación vigente; se mantiene desactivada para respetar el plan gratuito solicitado.
- `visit_qr_challenges` mantiene RLS sin políticas y sin privilegios de acceso para `anon` ni `authenticated`; no se abre acceso para eliminar el aviso informativo del asesor.
- Los 38 índices reportados como no utilizados no se eliminan automáticamente: deben observarse con carga real antes de retirar índices.
- El historial de migraciones anterior a esta entrega no coincide completamente entre GitHub y Supabase. La nueva migración se registró con su versión exacta; no se ejecutó reset ni se reaplicaron migraciones antiguas.

**Estado de cierre:** las funcionalidades pendientes de interfaz/backend de las cinco fases ya tienen una implementación inicial concreta. Las fases no se declaran certificadas para producción hasta completar los casos end-to-end y las verificaciones manuales marcadas arriba.
