# Pasaporte Motero — MVP inicial

Aplicación web móvil PWA para pasaporte turístico, bitácoras y comunidad viajera.

## Estado de esta entrega

Esta es una **primera base visual navegable en modo demostración**. Incluye:
- Navegación móvil.
- Feed personal con publicaciones de bitácora de demostración.
- Pasaporte visual y progreso inicial.
- Explorador de 25 territorios (catálogo de muestra; falta completar destinos).
- Perfil editable en memoria local.
- Generación de QR demostrativo.
- Esquema SQL inicial para Supabase.

Todavía NO están conectados el registro real, persistencia, subida de fotos, GPS, validación presencial, comentarios reales ni sincronización offline. No usar el QR de demostración como credencial de validación.

## Publicación sin instalar programas

1. Descarga y descomprime este proyecto.
2. Crea un repositorio vacío en GitHub llamado `pasaporte-motero`.
3. En GitHub, usa **Add file → Upload files** para subir el contenido de esta carpeta.
4. En Netlify, selecciona **Add new site → Import an existing project** y conecta el repositorio.
5. Build command: `npm run build`
6. Publish directory: `dist`

## Conectar Supabase

1. Crea un proyecto en Supabase.
2. Abre SQL Editor y ejecuta `supabase/migrations/0001_initial_schema.sql`.
3. En la configuración del sitio de Netlify, agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Vuelve a desplegar.

La clave anon/publishable está diseñada para frontend y debe protegerse con RLS. Nunca publiques `service_role` ni secretos administrativos.

## Próximos hitos técnicos

1. Autenticación y perfil persistente.
2. QR personal permanente vinculado a Auth.
3. Catálogo completo de departamentos, provincias, ciudades y atractivos.
4. Visitas GPS con tolerancia configurable y evidencia fotográfica.
5. Storage con políticas por usuario y optimización de imágenes.
6. Feed, follows, likes, comentarios, privacidad y moderación.
7. Bitácoras y álbumes.
8. Validación presencial mediante Edge Function, cuenta de encargado autorizada y token de un solo uso.
9. PWA offline con cola de sincronización.

## Seguridad QR

El QR de viajero debe contener un identificador público aleatorio, no correo, teléfono ni UUID de autenticación. La validación presencial se realizará en servidor, con autorización del encargado y control de repetición. El QR de esta demo es efímero y solo visual.
