# Difusion y publicidad de Oficios App

## Instagram y Facebook

Reutilizar dos publicaciones semanales entre ambas cuentas. Dejar TikTok y la pauta paga para mas adelante.

1. Presentacion: "Encontra oficios y emprendimientos en CABA y Gran Buenos Aires. Explora el directorio sin registrarte." Usar un recorte del video y enlazar a https://oficiosapp68.github.io/Oficios.App/
2. Invitacion: "Si trabajas o tenes un emprendimiento en CABA o Gran Buenos Aires, publica tu perfil gratis." Usar el tutorial y enlazar a https://oficiosapp68.github.io/Oficios.App/registro.html
3. Mostrar un perfil local con permiso de su titular y explicar como encontrarlo.

## Alta de banners para el piloto

Agregar cada anuncio aprobado a `js/data/directory-ads.js` con sus rubros (texto exacto de la categoria o del filtro, se ignoran mayusculas y acentos), nombre accesible (`label`), imagen horizontal 3:1 (`image`), enlace HTTPS (`url`) y `active: true`. Se pueden indicar `startsAt` y `endsAt` con fecha, hora y zona horaria. El orden en la lista es el orden de rotacion. Para pausar, usar `active: false`. Publicar el cambio y actualizar la version del archivo en la referencia de `index.html`.

No hay anuncios de muestra activos. Para incorporar a MyE Turismo o el emprendimiento de Mati, confirmar el rubro, la pieza y el enlace de destino. Si funciona el piloto, el siguiente paso es mover la configuracion al panel de administracion; no hay cobros, suscripciones ni cuentas para anunciantes.
