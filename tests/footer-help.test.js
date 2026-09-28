const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const pages = [
  "admin-moderacion.html",
  "auth-callback.html",
  "ayuda.html",
  "cambiar-password.html",
  "cerrar-sesion.html",
  "index.html",
  "login.html",
  "mi-perfil.html",
  "privacidad.html",
  "profesional.html",
  "recuperar-password.html",
  "registro.html",
  "terminos.html",
];

test("every page footer links to the help center", () => {
  pages.forEach((page) => {
    const html = readFileSync(join(__dirname, "..", page), "utf8");
    const footer = html.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/);

    assert.ok(footer, `${page} must include a site footer`);
    assert.match(footer[1], /href="ayuda\.html"(?: aria-current="page")?>Ayuda<\/a>/);
    assert.doesNotMatch(footer[1], /wa\.me|whatsapp/i);
  });
});

test("help center answers common questions and keeps email as a fallback", () => {
  const html = readFileSync(join(__dirname, "../ayuda.html"), "utf8");

  assert.equal((html.match(/<details class="faq-item">/g) || []).length, 10);
  assert.match(html, /registro/i);
  assert.match(html, /moderacion/i);
  assert.match(html, /contrasena/i);
  assert.match(html, /fot(?:o|ograf)/i);
  assert.match(html, /mailto:oficios\.app68@gmail\.com\?subject=Ayuda%20-%20OFICIOS%20APP/);
  assert.match(html, />Enviar un correo<\/a>/);
});
