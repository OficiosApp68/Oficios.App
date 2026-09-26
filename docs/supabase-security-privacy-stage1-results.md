# Resultado tecnico de ETAPA 1

Fecha: 2026-09-26

## Estado previo

- Perfiles totales: 8.
- Perfiles aprobados y activos: 8.
- Lectura anonima directa de `public.professional_profiles`: habilitada.
- Funciones `SECURITY DEFINER` ejecutables por `PUBLIC`: 9.
- Limite del bucket `profile-photos`: sin configurar.
- Tipos MIME permitidos en el bucket: sin configurar.

## Estado posterior a la migracion

- Perfiles totales: 8.
- Perfiles aprobados y activos: 8.
- Lectura anonima directa de `public.professional_profiles`: bloqueada.
- RPC publico disponible para `anon` y `authenticated`: `list_public_professional_profiles(uuid)`.
- Columnas devueltas por el RPC: `id`, `name`, `occupation`, `phone`, `zone`, `description`, `photo_url`.
- Funciones anteriores ejecutables por `PUBLIC`: 0.
- Limite del bucket `profile-photos`: 5 MB.
- Tipos MIME permitidos para nuevas cargas: `image/webp`.

## Prueba anonima de la API REST

- `GET /rest/v1/professional_profiles?select=*`: HTTP 401, permiso denegado.
- `POST /rest/v1/rpc/list_public_professional_profiles`: HTTP 200.
- Perfiles devueltos: 8.
- Campos internos detectados en la respuesta: ninguno.

La migracion no contiene instrucciones para eliminar perfiles, usuarios ni objetos del almacenamiento.

