# OFICIOS APP

OFICIOS APP es un marketplace de oficios y servicios para conectar clientes con profesionales, tecnicos y oficios. El objetivo del proyecto es construir un directorio claro, confiable y preparado para crecer hacia registro real de profesionales, panel privado y publicacion automatica de perfiles.

## Estado actual

El proyecto es un MVP estatico navegable con una primera conexion a Supabase para guardar perfiles de prueba de profesionales. Ya tiene registro, login, recuperacion de contrasena y cierre de sesion con Supabase Auth. Todavia no tiene pagos ni suscripciones reales.

## Funcionalidades disponibles

- Home con buscador visual preparado.
- Listado de categorias/oficios.
- Directorio de profesionales cargados como datos de ejemplo.
- Tarjetas con estado gratuito o premium.
- Ficha publica individual por profesional usando `profesional.html?id=...`.
- Formulario `registro.html` para cargar perfiles de profesionales en Supabase.
- Inicio de sesion con email y contrasena.
- Acceso con Google preparado en login y registro, pendiente de configurar el proveedor OAuth en Supabase y Google Cloud.
- Recuperacion basica de contrasena con email de Supabase.
- Estado visual para profesional inexistente.
- Panel administrador visual sin programacion real.
- Documentacion tecnica inicial.

## Estructura principal

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
index.html
profesional.html
```

## Ejecutar localmente

Desde la carpeta del proyecto:

```powershell
py -m http.server 8000
```

Abrir:

```text
http://localhost:8000/
```

Alternativa:

```powershell
python -m http.server 8000
```

## URLs para probar

- Directorio principal: `http://localhost:8000/index.html`
- Ficha valida: `http://localhost:8000/profesional.html?id=pro-lucas`
- Ficha inexistente: `http://localhost:8000/profesional.html?id=no-existe`
- Registro: `http://localhost:8000/registro.html`
- Login: `http://localhost:8000/login.html`
- Recuperar contrasena: `http://localhost:8000/recuperar-password.html`
- Cambiar contrasena: `http://localhost:8000/cambiar-password.html`

Cuando GitHub Pages este activo, la URL publica esperada sera:

- `https://oficiosapp68.github.io/Oficios.App/`

## Tecnologias actuales

- HTML.
- CSS.
- JavaScript modular sin framework.
- Datos locales de ejemplo en archivos JavaScript.
- Supabase como base online gratuita para los primeros perfiles cargados desde el formulario.

La web usa una `Publishable key` publica de Supabase, apta para navegador. No se debe usar ni pegar en archivos JavaScript ninguna clave secreta, `service_role` ni credencial administrativa.

Para configurar el proyecto en otra computadora, copiar `js/config/supabase-config.example.js` como `js/config/supabase-config.js` y completar la URL publica y la Publishable key del proyecto Supabase.

Para GitHub Pages, el workflow copia `js/config/supabase-config.production.js` como `js/config/supabase-config.js` durante la publicacion. Ese archivo solo contiene datos publicos de navegador.

Para que funcione `Continuar con Google`, hay que activar el proveedor Google dentro de Supabase Auth y cargar alli el Client ID y Client Secret generados en Google Cloud. El Client Secret de Google no debe guardarse en este repositorio ni en archivos JavaScript del navegador.

## Documentacion

- [Arquitectura actual](docs/architecture.md)
- [Plan tecnico Fase 2](docs/phase-2-plan.md)
- [Reporte de validacion](docs/validation-report.md)
- [Guia de revision visual](docs/visual-changes.md)
