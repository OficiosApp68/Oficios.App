# OFICIOS APP

OFICIOS APP es un marketplace de oficios y servicios para conectar clientes con profesionales, tecnicos y oficios. El objetivo del proyecto es construir un directorio claro, confiable y preparado para crecer hacia registro real de profesionales, panel privado y publicacion automatica de perfiles.

## Estado actual

El proyecto es un MVP estatico navegable. Todavia no tiene backend, base de datos, registro real, inicio de sesion ni pagos.

## Funcionalidades disponibles

- Home con buscador visual preparado.
- Listado de categorias/oficios.
- Directorio de profesionales cargados como datos de ejemplo.
- Tarjetas con estado gratuito o premium.
- Ficha publica individual por profesional usando `profesional.html?id=...`.
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

## Tecnologias actuales

- HTML.
- CSS.
- JavaScript modular sin framework.
- Datos locales de ejemplo en archivos JavaScript.

Supabase todavia no esta integrado. La integracion esta propuesta en la Fase 2, pero no existe codigo de backend ni variables reales en esta etapa.

## Documentacion

- [Arquitectura actual](docs/architecture.md)
- [Plan tecnico Fase 2](docs/phase-2-plan.md)
- [Reporte de validacion](docs/validation-report.md)
- [Guia de revision visual](docs/visual-changes.md)
