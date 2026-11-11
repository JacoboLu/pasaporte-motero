# Pasaporte Motero — Frontend integrado

PWA mobile-first para descubrir destinos, coleccionar sellos, documentar viajes y compartir experiencias.

## Qué incluye esta entrega

- Interfaz basada en el diseño compartido: exploración de destinos, pasaporte con sellos, comunidad, perfil y acción central.
- Exploración con búsqueda, filtros por departamento/categoría y ficha individual de destino.
- Acceso a indicaciones de ruta mediante Google Maps.
- Pasaporte con progreso por territorios, sellos y registro de validaciones.
- Validación GPS en el navegador: calcula distancia respecto a coordenadas de demostración y solo valida si está dentro del radio configurado.
- Evidencia fotográfica para revisión pendiente.
- Flujo de QR presencial de demostración y generación del QR personal de demostración.
- Feed comunitario, likes, comentarios, compartir y publicaciones con visibilidad.
- Creación de viajes y bitácoras, destinos asociados y opción de publicación pública.
- Galería de recuerdos a partir de imágenes guardadas en visitas/publicaciones.
- Perfil editable, acceso a autenticación Supabase cuando esté configurado y panel local de revisión de evidencias.
- Persistencia local mediante localStorage.
- Service worker inicial para caché de la estructura de la PWA.
- Migración SQL ampliada para viajes, destinos guardados y logros.

## Importante: qué sigue siendo demostración

Este frontend funciona en modo local sin credenciales y permite probar los flujos de interfaz. No afirmar que las operaciones locales son registros oficiales.

Para producción todavía se requiere:

1. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (clave pública anon/publishable, nunca `service_role`).
2. Ejecutar la migración SQL en Supabase.
3. Implementar sincronización real de perfiles, destinos, visitas, viajes, publicaciones, comentarios, likes y fotos con Supabase.
4. Crear buckets privados de Storage y sus políticas de acceso.
5. Implementar Edge Functions para validación GPS server-side, QR temporal de un solo uso, aprobación de visitas y asignación de logros.
6. Completar el catálogo de atractivos y sus coordenadas verificadas. La lista de 25 departamentos está completa, pero los destinos detallados son solo una muestra.
7. Añadir cola de sincronización offline y estrategia de resolución de conflictos. El service worker actual almacena el shell; localStorage conserva datos del prototipo en el dispositivo.
8. Incorporar lector QR de cámara compatible con iOS/Android y panel web seguro para encargados.
9. Añadir gestión de seguidores, moderación, reportes y notificaciones push reales.

## Desarrollo y despliegue

- Build command: `npm run build`
- Publish directory: `dist`
- Base directory en el repositorio actual: `pasaporte-motero`
- Package directory: vacío

No se necesita instalar herramientas en el equipo del usuario: GitHub y Netlify pueden ejecutar el build en la nube.

## Supabase

Ejecuta `supabase/migrations/0001_initial_schema.sql` desde SQL Editor. La base incluye perfiles, QR, catálogo, visitas, fotos, publicaciones, relaciones sociales, comentarios, encargados, validaciones, reportes, viajes, destinos asociados, destinos guardados y logros.

La validación de QR, la aprobación definitiva de visitas y el otorgamiento de logros deben ejecutarse en backend confiable. No habilitar actualizaciones directas del estado de visita desde el navegador.
