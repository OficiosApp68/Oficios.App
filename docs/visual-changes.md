# Revision visual de cambios

Este documento sirve para confirmar que estas viendo la version nueva de OFICIOS APP y no una version anterior guardada en cache.

## Como ejecutar el proyecto

1. Abrir PowerShell.
2. Entrar a la carpeta del proyecto:

```powershell
cd "C:\Users\Usuario\Documents\OFICIOS APP"
```

3. Iniciar un servidor local con Python:

```powershell
py -m http.server 8000
```

4. Abrir en el navegador:

```text
http://localhost:8000/
```

Si `py` no esta disponible, probar esta alternativa con Python:

```powershell
python -m http.server 8000
```

Alternativa con Node.js:

```powershell
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml'};http.createServer((req,res)=>{const url=decodeURIComponent((req.url||'/').split('?')[0]);const file=path.join(root,url==='/'?'index.html':url);fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('No encontrado');return;}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});res.end(data);});}).listen(8000);"
```

## URLs para revisar

- `http://localhost:8000/index.html`
  - Debe mostrar la pagina principal.
  - En el pie de pagina debe verse: `Version de revision: ficha publica individual`.
  - En cada tarjeta de profesional debe verse el boton `Ver perfil`.

- `http://localhost:8000/profesional.html?id=pro-lucas`
  - Debe abrir la ficha de Lucas Fernandez.
  - Debe mostrar foto, nombre, oficio, zona, descripcion, detalles profesionales, WhatsApp y telefono.

- `http://localhost:8000/profesional.html?id=pro-camila`
  - Debe abrir la ficha de Camila Rios.
  - Si no hay galeria de trabajos, esa seccion no aparece.

- `http://localhost:8000/profesional.html?id=no-existe`
  - Debe mostrar el mensaje: `No encontramos este profesional.`
  - Debe ofrecer un boton para volver al directorio.

- `http://localhost:8000/profesional.html`
  - Debe mostrar el mismo estado de perfil no encontrado, porque falta el identificador `id`.

## Cambios visibles

### Cambio 1

Pagina: `index.html`

Elemento: Pie de pagina.

Antes: Solo se veia el texto general de OFICIOS APP.

Ahora: Se ve tambien `Version de revision: ficha publica individual`.

Como verificarlo: Abrir `http://localhost:8000/index.html` y bajar hasta el pie de pagina.

### Cambio 2

Pagina: `index.html`

Elemento: Tarjetas de profesionales.

Antes: Cada tarjeta mostraba datos del profesional y boton de WhatsApp.

Ahora: Cada tarjeta tambien muestra un boton visible `Ver perfil`.

Como verificarlo: Ir a la seccion `Profesionales disponibles` y confirmar que cada tarjeta tenga `Ver perfil`.

### Cambio 3

Pagina: `index.html`

Elemento: Boton `Ver perfil`.

Antes: No habia una pagina individual para cada profesional.

Ahora: El boton abre `profesional.html?id=...` usando el identificador del profesional.

Como verificarlo: Hacer clic en `Ver perfil` en una tarjeta. Debe abrir una ficha individual.

### Cambio 4

Pagina: `profesional.html?id=pro-lucas`

Elemento: Ficha individual.

Antes: La pagina no existia.

Ahora: Muestra una ficha con nombre, oficio, zona, descripcion, datos profesionales, telefono, WhatsApp y trabajos cuando existen.

Como verificarlo: Abrir `http://localhost:8000/profesional.html?id=pro-lucas`.

### Cambio 5

Pagina: `profesional.html?id=pro-camila`

Elemento: Galeria de trabajos.

Antes: No habia ficha individual.

Ahora: La galeria solo aparece cuando hay imagenes validas. Si el perfil no tiene imagenes de trabajos, no se muestra una seccion vacia.

Como verificarlo: Abrir `http://localhost:8000/profesional.html?id=pro-camila`.

### Cambio 6

Pagina: `profesional.html?id=no-existe`

Elemento: Estado de error.

Antes: No habia manejo visual para enlaces invalidos.

Ahora: Se muestra `No encontramos este profesional.` con accion para volver al directorio.

Como verificarlo: Abrir `http://localhost:8000/profesional.html?id=no-existe`.

### Cambio 7

Pagina: cualquier ficha individual.

Elemento: Fotografia.

Antes: Si faltaba una foto, existia riesgo de imagen rota.

Ahora: Si falta la fotografia, se muestra un bloque visual de reemplazo con `OA`.

Como verificarlo: Este estado esta preparado en el codigo. Con los perfiles actuales, la mayoria tiene foto cargada.

### Cambio 8

Pagina: cualquier ficha individual.

Elemento: Contacto.

Antes: Si faltaba WhatsApp o telefono, podia quedar un enlace vacio o inutil.

Ahora: El telefono solo aparece cuando existe. Si no hay WhatsApp, aparece `WhatsApp no disponible` sin enlace vacio.

Como verificarlo: Este estado esta preparado en el codigo para perfiles incompletos.

## Cambios internos que no se ven tanto

- Los datos se separaron en usuario, profesional, perfil publico y suscripcion.
- La ficha individual usa una sola pagina dinamica, no un HTML por profesional.
- El listado y la ficha usan datos normalizados desde `directory-service.js`.
- Hay protecciones para evitar textos como `undefined` o `null`.
- Se agrego documentacion tecnica en `docs/architecture.md` y `docs/validation-report.md`.

## Cache y archivos cargados

El proyecto no tiene service worker ni mecanismo propio de cache persistente.

`index.html` carga actualmente estos archivos principales:

- `js/data/catalog.js`
- `js/data/directory.js`
- `js/services/directory-service.js`
- `js/renderers/render-helpers.js`
- `js/renderers/category-renderer.js`
- `js/renderers/professional-renderer.js`
- `js/renderers/profile-renderer.js`
- `js/renderers/admin-renderer.js`
- `js/ui/navigation.js`
- `js/app.js`

`profesional.html` carga:

- `js/data/catalog.js`
- `js/data/directory.js`
- `js/services/directory-service.js`
- `js/renderers/render-helpers.js`
- `js/renderers/professional-detail-renderer.js`
- `js/pages/professional-page.js`

Si no ves el texto de version en el pie de pagina:

1. Presionar `Ctrl + F5`.
2. Cerrar y volver a abrir la pestana.
3. Confirmar que estas entrando por `http://localhost:8000/`.
4. Detener el servidor con `Ctrl + C` y volver a iniciarlo.
