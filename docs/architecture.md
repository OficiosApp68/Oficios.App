# Arquitectura inicial de OFICIOS APP

Este documento describe la organizacion actual del MVP y las decisiones tomadas para preparar el proyecto antes de sumar funcionalidades mas complejas.

## Objetivo de esta etapa

La prioridad es sostener un directorio inicial de profesionales cargados de forma gratuita o administrada, con una base ordenada para crecer. El formulario `registro.html` ya guarda perfiles basicos en Supabase. Ya existe autenticacion basica con Supabase Auth. No se implementan todavia pagos, geolocalizacion, chat ni panel completo de autogestion.

## Estructura de archivos

- `index.html`: estructura navegable del MVP y puntos de montaje para renderizar datos.
- `css/styles.css`: estilos globales, responsive y componentes visuales.
- `js/data/catalog.js`: catalogo de categorias/oficios.
- `js/data/directory.js`: datos iniciales del directorio separados por entidad.
- `js/services/directory-service.js`: arma modelos de vista sin duplicar datos.
- `js/config/supabase-config.js`: configuracion publica de Supabase para el navegador.
- `js/services/supabase-service.js`: carga `supabase-js` desde CDN con version fija, consulta perfiles aprobados y expone acciones de moderacion.
- `js/renderers/render-helpers.js`: helpers visuales compartidos para estado, foto y contacto.
- `js/renderers/*.js`: renderizado de categorias, listado, ficha publica y panel admin.
- `js/renderers/professional-detail-renderer.js`: renderizado de la ficha publica individual.
- `js/pages/professional-page.js`: inicializacion de `profesional.html` y lectura del identificador estable desde la URL.
- `js/ui/navigation.js`: comportamiento del menu responsive.
- `js/app.js`: inicializacion de la aplicacion.

## Modelo de datos preparado para crecer

La informacion esta separada en entidades para que en una etapa posterior pueda moverse a una API o base de datos sin cambiar toda la interfaz.

`directory-service.js` es el punto de normalizacion antes de renderizar. Si faltan relaciones o datos opcionales, entrega valores seguros para evitar textos visibles como `undefined` o `null`, enlaces vacios e imagenes rotas.

`supabase-service.js` transforma los perfiles cargados online al mismo modelo visual que usan las tarjetas y la ficha publica. Desde la moderacion inicial, el directorio publico solo consulta perfiles con `moderation_status = approved` e `is_active = true`.

Los perfiles creados o editados por profesionales quedan con `moderation_status = pending`. Esto permite revisar el contenido antes de mostrarlo publicamente y evita que un perfil aprobado pueda cambiarse despues sin pasar por una nueva revision.

La pantalla `admin-moderacion.html` usa funciones seguras de Supabase para listar perfiles pendientes, aprobarlos o rechazarlos. La autorizacion de administradores se define en la tabla `app_admins`; no se usa ninguna clave privada en el navegador.

`auth-service.js` encapsula registro, login, acceso con Google, cierre de sesion y recuperacion de contrasena. Las paginas visibles no llaman directamente a Supabase Auth.

El acceso con Google usa OAuth de Supabase. El frontend solo inicia el flujo con el SDK oficial; el `Client Secret` de Google queda guardado dentro de Supabase y nunca en archivos JavaScript del navegador. Para pruebas locales se deben autorizar URLs de redireccion como `http://127.0.0.1:8000/index.html` y `http://127.0.0.1:8000/registro.html`.

## Conexion Supabase actual

La integracion actual usa una `Publishable key` publica de Supabase. Esta clave puede vivir en el navegador porque no es una clave administrativa. La seguridad de lectura y escritura depende de las politicas de la tabla y de Row Level Security.

Nunca se debe incluir en JavaScript del navegador una `Secret key`, `service_role`, contrasena de base de datos ni credenciales privadas.

El archivo real `js/config/supabase-config.js` esta ignorado por Git para evitar subir configuraciones locales por accidente. El repositorio conserva solo `js/config/supabase-config.example.js` con valores ficticios.

El archivo `docs/supabase-moderation.sql` contiene la configuracion de base necesaria para revisar perfiles antes de publicarlos.

### Usuario

Representa la cuenta o identidad base. Guarda datos transversales como nombre visible, email, telefono, rol y estado de cuenta.

### Profesional

Representa la actividad laboral asociada a un usuario. Guarda oficio principal, oficios adicionales, experiencia, zona de trabajo, cobertura, horarios y estado activo/inactivo.

### Perfil publico

Representa lo que ve el cliente. Guarda titulo profesional, descripcion, especialidades, foto principal, galeria, calificacion simulada, opiniones y enlace de WhatsApp.

### Suscripcion

Representa el plan comercial asociado al profesional. Hoy solo distingue `free` y `premium`, sin pagos reales. Mas adelante puede conectarse con suscripciones, vencimientos o Mercado Pago.

## Preparacion para Fase 2

El futuro panel del profesional deberia editar principalmente estas entidades:

- Datos personales y telefono: `users`.
- Direccion, zona, oficios, experiencia y horarios: `professionals`.
- Descripcion, fotos, especialidades y contactos publicos: `publicProfiles`.
- Estado comercial o beneficios premium: `subscriptions`.

La interfaz de autogestion no se implementa en esta fase. La separacion actual evita mezclar esos cambios con el MVP publico y permite agregar formularios por secciones mas adelante.

## Flujo entre directorio y ficha publica

El listado de profesionales renderiza una accion `Ver perfil` por tarjeta. Esa accion apunta a una unica pagina estatica:

`profesional.html?id=<professionalId>`

El identificador usado es el `id` estable del profesional, por ejemplo `pro-lucas`. No se usa el indice del array.

## Resolucion del profesional

`profesional.html` no consulta los arrays directamente. La pagina lee el parametro `id` y llama a:

`directoryService.getProfessionalById(professionalId)`

La funcion devuelve el mismo modelo normalizado que usan el listado, la ficha destacada y el panel administrador. Si no existe coincidencia, la interfaz muestra un estado claro: `No encontramos este profesional.`

## Responsabilidades del renderizador individual

`professional-detail-renderer.js` solo se ocupa de transformar el modelo normalizado en HTML. Reutiliza `render-helpers.js` para fotografia, telefono, WhatsApp y estado de suscripcion. No duplica normalizacion de datos ni consulta estructuras internas.

## Limitacion del enrutamiento estatico

El uso de query string es una solucion transitoria compatible con el proyecto estatico actual. En una etapa con backend, router o generador de paginas, estas URLs deberian evolucionar hacia rutas legibles y orientadas a SEO, por ejemplo:

`/profesionales/electricista/juan-perez`
