# Plan tecnico Fase 2: registro real de profesionales

## Objetivo

Transformar el prototipo estatico actual en una plataforma funcional donde un profesional pueda registrarse, iniciar sesion, completar su perfil, publicar su ficha en el directorio y mantener sus datos actualizados.

No se implementa codigo en esta etapa. Este documento define la arquitectura recomendada para evitar rehacer trabajo mas adelante.

## Arquitectura recomendada

### Backend recomendado

Para una primera version funcional y rapida de validar con usuarios reales, se recomienda usar Supabase como backend principal:

- PostgreSQL para datos relacionales.
- Supabase Auth para registro e inicio de sesion.
- Supabase Storage para fotografias.
- Row Level Security para permisos por usuario.
- Edge Functions solo cuando sea necesario ejecutar logica segura del lado servidor.

Esta eleccion permite avanzar rapido sin construir desde cero autenticacion, base de datos, storage y permisos. Si el proyecto crece mucho, se puede sumar una API propia en Node.js/NestJS sin descartar PostgreSQL ni el modelo de datos.

### Frontend recomendado

Etapa inmediata:

- Mantener el frontend actual en HTML, CSS y JavaScript modular.
- Conectar progresivamente los servicios actuales a Supabase.

Etapa siguiente:

- Evaluar migracion a Vite + React o Next.js cuando aparezcan pantallas con estado complejo, formularios largos, rutas protegidas y panel privado.

La migracion no deberia hacerse antes de validar el flujo real de profesionales.

### Base de datos

Base recomendada: PostgreSQL.

Motivos:

- Relaciones claras entre usuarios, profesionales, oficios, perfiles publicos, suscripciones e imagenes.
- Indices para busqueda por oficio, zona y estado.
- Escala bien para crecimiento nacional con paginacion y filtros.
- Permite auditoria y reglas de seguridad.

### Sistema de autenticacion

Supabase Auth con email y password para la primera version. Tambien se prepara acceso con Google para reducir problemas de contrasenas durante la validacion del MVP.

Mas adelante:

- Verificacion de email.
- Recuperacion de contraseña.
- Roles internos para administradores.

### Almacenamiento de imagenes

Supabase Storage.

Buckets sugeridos:

- `profile-photos`: foto principal del profesional.
- `work-gallery`: imagenes de trabajos realizados.

Reglas:

- Cada profesional solo puede subir, editar o borrar sus propias imagenes.
- Las imagenes publicadas pueden ser visibles publicamente.
- Validar tipo, tamaño y cantidad maxima de archivos.

### Variables de entorno

Archivo local sugerido: `.env`

Variables:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_PROFILE_BUCKET=profile-photos
SUPABASE_STORAGE_GALLERY_BUCKET=work-gallery
APP_PUBLIC_URL=
```

Reglas:

- `SUPABASE_ANON_KEY` puede usarse en frontend con Row Level Security correcta.
- `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse en el navegador.
- Crear `.env.example` cuando empiece la integracion real.

### Estructura de carpetas propuesta

Manteniendo el proyecto actual:

```text
/assets
/css
/docs
/images
/js
  /data
  /pages
  /renderers
  /services
  /ui
  /utils
```

Al incorporar backend/Supabase:

```text
/js
  /auth
  /config
  /forms
  /repositories
  /services
  /validators
```

Responsabilidades:

- `auth`: sesion, login, registro, logout.
- `config`: inicializacion de Supabase y variables.
- `forms`: lectura y escritura de formularios.
- `repositories`: consultas directas a Supabase.
- `services`: reglas de negocio de la app.
- `validators`: validaciones reutilizables.

## Modelo de datos

### `users`

Responsabilidad: identidad base del sistema.

Campos sugeridos:

- `id` UUID, primary key, vinculado a Supabase Auth.
- `email`.
- `display_name`.
- `phone`.
- `role`: `professional`, `admin`.
- `status`: `active`, `disabled`, `pending`.
- `created_at`.
- `updated_at`.

Relaciones:

- Un usuario profesional puede tener un registro en `professionals`.

### `professionals`

Responsabilidad: datos laborales privados/administrativos del profesional.

Campos sugeridos:

- `id` UUID, primary key.
- `user_id` FK a `users.id`.
- `primary_occupation_id` FK a `occupations.id`.
- `service_area`.
- `coverage_text`.
- `experience`.
- `working_hours`.
- `is_active`.
- `publication_status`: `draft`, `published`, `paused`.
- `created_at`.
- `updated_at`.

Relaciones:

- Pertenece a un usuario.
- Tiene un perfil publico.
- Tiene muchos oficios mediante `professional_occupations`.
- Tiene muchas imagenes mediante `gallery_images`.
- Puede tener una suscripcion.

### `public_profiles`

Responsabilidad: informacion visible para clientes.

Campos sugeridos:

- `id` UUID, primary key.
- `professional_id` FK a `professionals.id`.
- `slug` futuro para URLs amigables.
- `title`.
- `summary`.
- `description`.
- `profile_photo_url`.
- `whatsapp`.
- `public_phone`.
- `rating_average` nullable.
- `reviews_count`.
- `published_at`.
- `updated_at`.

Relaciones:

- Pertenece a un profesional.

### `subscriptions`

Responsabilidad: estado comercial del profesional.

Campos sugeridos:

- `id` UUID, primary key.
- `professional_id` FK a `professionals.id`.
- `plan`: `free`, `premium`.
- `status`: `active`, `inactive`, `past_due`, `cancelled`.
- `started_at`.
- `expires_at`.
- `provider`: futuro, por ejemplo `mercado_pago`.
- `provider_subscription_id`.
- `created_at`.
- `updated_at`.

Regla inicial:

- Todos los profesionales pueden publicar informacion basica con plan `free`.
- `premium` solo debe destacar visualmente cuando el estado sea valido.

### `occupations`

Responsabilidad: catalogo central de oficios.

Campos sugeridos:

- `id` UUID, primary key.
- `slug`.
- `name`.
- `description`.
- `is_active`.
- `created_at`.
- `updated_at`.

### `professional_occupations`

Responsabilidad: relacion muchos-a-muchos entre profesionales y oficios.

Campos sugeridos:

- `professional_id` FK a `professionals.id`.
- `occupation_id` FK a `occupations.id`.
- `is_primary`.

Clave sugerida:

- Primary key compuesta: `professional_id`, `occupation_id`.

### `gallery_images`

Responsabilidad: fotografias de trabajos realizados.

Campos sugeridos:

- `id` UUID, primary key.
- `professional_id` FK a `professionals.id`.
- `storage_path`.
- `public_url`.
- `alt_text`.
- `sort_order`.
- `is_visible`.
- `created_at`.
- `updated_at`.

Reglas:

- Un profesional solo administra sus propias imagenes.
- El directorio solo muestra imagenes visibles.

## Flujo del profesional

1. Entra a OFICIOS APP.
2. Selecciona `Registrarse`.
3. Crea una cuenta con email y contraseña.
4. Verifica email si se habilita esa regla.
5. Accede a un panel privado.
6. Completa datos personales basicos.
7. Carga datos profesionales:
   - oficio principal;
   - oficios adicionales;
   - zona de trabajo;
   - experiencia;
   - horarios;
   - descripcion.
8. Carga foto principal.
9. Opcionalmente carga galeria de trabajos.
10. Guarda perfil como borrador.
11. Publica el perfil.
12. El perfil aparece en el directorio si:
   - el usuario esta activo;
   - el profesional esta activo;
   - el perfil publico tiene datos minimos;
   - `publication_status` es `published`.
13. Puede volver al panel y editar sus datos.

## Seguridad

### Permisos

Reglas principales:

- Un profesional solo puede leer y editar sus propios datos privados.
- Los clientes anonimos solo pueden leer perfiles publicados.
- Un administrador puede activar, pausar o revisar perfiles.
- Las suscripciones no deben poder ser modificadas libremente desde el cliente.

### Autenticacion

- Usar Supabase Auth.
- Mantener sesiones con el SDK oficial.
- Proteger rutas privadas desde el frontend y con Row Level Security en base de datos.

### Validaciones

Frontend:

- Campos requeridos.
- Formatos de telefono y WhatsApp.
- Tamaño y tipo de imagen.
- Longitudes maximas.

Backend/base:

- Constraints.
- Row Level Security.
- Validacion de propiedad por `user_id`.
- Sanitizacion de textos si se renderizan como HTML.

### Proteccion de datos

- No exponer emails privados en el perfil publico.
- Separar telefono privado de telefono publico.
- No guardar claves ni tokens en el repositorio.
- No exponer `SERVICE_ROLE_KEY` en frontend.

## Escalabilidad

Esta arquitectura permite crecer a nivel nacional porque:

- PostgreSQL permite indices por oficio, zona, estado y texto.
- El directorio puede migrar de filtrado local a busqueda paginada.
- Las imagenes quedan fuera del repositorio y se sirven desde storage/CDN.
- Los roles y permisos se definen desde el inicio.
- El modelo separa cuenta, profesional, perfil publico y suscripcion.
- El plan comercial puede crecer sin bloquear perfiles gratuitos.

Futuras mejoras:

- Busqueda por provincia/localidad.
- Paginacion.
- Ranking por calidad, disponibilidad y plan comercial.
- Moderacion de perfiles.
- Analitica de contactos.
- URLs amigables por oficio y slug.

## Roadmap Fase 2

### Tarea 1: Preparacion tecnica

- Crear proyecto Supabase. Completado para el MVP inicial.
- Configurar clave publica de navegador. Completado con `Publishable key`.
- Agregar cliente Supabase. Completado con importacion ESM desde CDN y version fija.
- Crear repositorios base. Iniciado con `supabase-service.js`.
- Validar conexion desde entorno local.

### Tarea 2: Base de datos inicial

- Crear tablas principales.
- Cargar catalogo inicial de oficios.
- Configurar indices.
- Configurar Row Level Security.

### Tarea 3: Registro e inicio de sesion

- Crear pantalla de registro. Implementado en la primera version visible.
- Crear pantalla de login. Implementado en la primera version visible.
- Crear logout. Implementado en la primera version visible.
- Mostrar estado de sesion. Implementado en la primera version visible.
- Recuperacion basica de contrasena. Implementado con email de Supabase y pagina para nueva contrasena.
- Acceso con Google. Interfaz y llamada OAuth preparadas; requiere configurar Google Cloud y el proveedor Google dentro de Supabase.

### Tarea 4: Panel privado minimo

- Crear pantalla privada del profesional.
- Proteger acceso sin sesion.
- Mostrar datos actuales del usuario.

### Tarea 5: Edicion de datos profesionales

- Formulario de oficio, zona, descripcion, experiencia y horarios.
- Validaciones.
- Guardado en base de datos.

### Tarea 6: Publicacion del perfil

- Estado borrador/publicado.
- Validar datos minimos.
- Mostrar el perfil publicado en el directorio.

### Tarea 7: Carga de fotografia principal

- Configurar bucket.
- Subir imagen.
- Validar tipo y tamaño.
- Mostrar placeholder si falta.

### Tarea 8: Galeria de trabajos

- Subir multiples imagenes.
- Reordenar.
- Ocultar o eliminar imagenes.

### Tarea 9: Suscripciones preparadas

- Mantener plan `free`.
- Agregar estructura para `premium`.
- No integrar pagos hasta validar el flujo gratuito.

### Tarea 10: Validacion con usuarios reales

- Crear perfiles piloto.
- Revisar facilidad de carga.
- Medir contactos.
- Ajustar campos y textos antes de escalar.
