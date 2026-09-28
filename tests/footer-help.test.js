const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const pages = [
  "admin-moderacion.html",
  "auth-callback.html",
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

test("every page footer offers email help without using WhatsApp", () => {
  pages.forEach((page) => {
    const html = readFileSync(join(__dirname, "..", page), "utf8");
    const footer = html.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/);

    assert.ok(footer, `${page} must include a site footer`);
    assert.match(footer[1], /href="mailto:oficios\.app68@gmail\.com\?subject=Ayuda%20-%20OFICIOS%20APP">Ayuda<\/a>/);
    assert.doesNotMatch(footer[1], /wa\.me|whatsapp/i);
  });
});
