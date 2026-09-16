const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const { join } = require("node:path");

test("registration password fields toggle independently without losing their values", () => {
  const html = readFileSync(join(__dirname, "../registro.html"), "utf8");
  const ids = ["professional-password", "professional-password-confirmation"];
  const inputs = Object.fromEntries(ids.map((id) => [id, {
    type: "password",
    value: `value-for-${id}`,
    focus() {},
  }]));
  const toggles = ids.map((id) => {
    const icons = { show: { hidden: false }, hide: { hidden: true } };
    return {
      title: "Mostrar contrasena",
      attributes: { "aria-controls": id },
      icons,
      getAttribute(name) { return this.attributes[name]; },
      setAttribute(name, value) { this.attributes[name] = value; },
      querySelector(selector) {
        return selector === "[data-icon-show]" ? icons.show : icons.hide;
      },
      addEventListener(type, listener) { this[type] = listener; },
    };
  });
  const form = {
    querySelectorAll(selector) {
      return selector === "[data-password-toggle]" ? toggles : [];
    },
    addEventListener() {},
  };
  const document = {
    querySelector(selector) { return selector === "[data-register-form]" ? form : null; },
    getElementById(id) { return inputs[id]; },
  };

  for (const id of ids) {
    assert.match(html, new RegExp(`aria-controls="${id}"`));
  }

  runInNewContext(
    readFileSync(join(__dirname, "../js/pages/register-page.js"), "utf8"),
    { window: { OficiosApp: {} }, document }
  );

  toggles[0].click();
  assert.equal(inputs[ids[0]].type, "text");
  assert.equal(inputs[ids[1]].type, "password");
  assert.equal(inputs[ids[0]].value, `value-for-${ids[0]}`);
  assert.equal(toggles[0].attributes["aria-label"], "Ocultar contrasena");
  assert.equal(toggles[0].icons.show.hidden, true);
  assert.equal(toggles[0].icons.hide.hidden, false);

  toggles[1].click();
  assert.equal(inputs[ids[1]].type, "text");
  assert.equal(inputs[ids[1]].value, `value-for-${ids[1]}`);

  toggles[0].click();
  assert.equal(inputs[ids[0]].type, "password");
  assert.equal(inputs[ids[1]].type, "text");
  assert.equal(toggles[0].attributes["aria-label"], "Mostrar contrasena");
  assert.equal(toggles[0].icons.show.hidden, false);
  assert.equal(toggles[0].icons.hide.hidden, true);
});
