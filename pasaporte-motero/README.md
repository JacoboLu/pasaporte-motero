# Pasaporte Motero

PWA mobile-first para descubrir destinos, coleccionar sellos, documentar viajes y compartir experiencias.

## Funciones del frontend

- Exploración de destinos con búsqueda, filtros y fichas.
- Pasaporte con progreso y registro de visitas.
- Registro y acceso con Supabase Auth; perfil sincronizado.
- Ficha técnica de motocicleta, fotografía, mantenimiento y documentos.
- Viajes y bitácoras con privacidad: público, seguidores o privado.
- Publicaciones con fotografía, visibilidad, likes y comentarios.
- Destinos guardados e historial de visitas sincronizados para usuarios autenticados.
- Evidencia GPS/fotográfica registrada como pendiente de revisión.
- Diseño adaptable, navegación móvil y PWA.

## Estado real de sincronización

Cuando hay sesión autenticada, esta rama lee y guarda en Supabase:
- Perfil y motocicleta.
- Viajes y destinos asociados que existan en el catálogo.
- Publicaciones, fotografías, likes y comentarios.
- Destinos guardados, seguimientos e historial de visitas.
- Evidencias fotográficas privadas.

El frontend **no aprueba visitas ni concede sellos definitivos**. GPS y fotografía solo generan solicitudes pendientes. La aprobación segura requiere una Edge Function y un flujo de revisión autorizado.

## Migraciones Supabase

Las migraciones se encuentran en `supabase/migrations` y deben revisarse y aplicarse en orden en el SQL Editor del proyecto:

1. `0001_initial_schema.sql`
2. `0002_fix_profile_signup_trigger.sql`
3. `0003_motorcycle_garage.sql`
4. `0004_trip_followers_privacy.sql`
5. `0005_signup_motorcycle_metadata.sql`
6. `0006_content_privacy_and_storage.sql`
7. `0007_seed_mvp_destinations.sql`

**Importante:** la base de datos de desarrollo ya recibió cambios manuales y migraciones anteriores. Antes de ejecutar una migración en el proyecto activo, comparar las columnas y políticas existentes. No volver a ejecutar a ciegas scripts históricos ni modificar una migración ya aplicada. Las migraciones nuevas son aditivas y las políticas nuevas usan `drop policy if exists` cuando corresponde.

## Seguridad y tareas pendientes antes de producción

- Crear Edge Functions para verificación GPS en servidor, tokens QR temporales de un solo uso, validación por encargado y aprobación de visitas.
- No incluir nunca la clave `service_role` en el frontend. La clave publishable/anon sí puede utilizarse en cliente junto con RLS.
- Completar el catálogo oficial de destinos, provincias y coordenadas verificadas. Los seis destinos sembrados son una muestra inicial.
- Terminar el flujo de cámara QR para encargados y panel de administración con roles verificados en servidor.
- Añadir moderación, reportes y notificaciones reales.
- Implementar cola offline con reintentos e idempotencia. El shell PWA y el almacenamiento local no equivalen a sincronización offline completa.
- Probar privacidad con cuentas distintas (propietario, seguidor, visitante anónimo) antes de abrir la comunidad.

## Desarrollo y despliegue

- Build: `npm run build`
- Publish directory: `dist`
- Base directory Netlify: `pasaporte-motero`
- Package directory: vacío.

GitHub Actions ejecuta el build en la nube. La rama `feature/registro-integral-y-estabilidad` no debe fusionarse a producción hasta completar las pruebas de Supabase y validar los flujos en dispositivos reales.
