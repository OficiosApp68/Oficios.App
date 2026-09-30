const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

test("registration guidance stays compact and reveals details on demand", () => {
  const html = readFileSync(join(__dirname, "../registro.html"), "utf8");
  const notes = html.match(/<details class="register-info-note[^"]*">/g) || [];

  assert.equal(notes.length, 3);
  assert.match(html, /<summary>[\s\S]*Que hace OFICIOS APP/);
  assert.match(html, /<summary>[\s\S]*Confirma tu cuenta/);
  assert.match(html, /<summary>[\s\S]*Tu perfil, tu responsabilidad/);
  assert.doesNotMatch(html, /<article class="register-info-note/);
});
