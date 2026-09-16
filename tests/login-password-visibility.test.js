const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const { join } = require("node:path");

test("login password can be shown and hidden without submitting", () => {
  const handlers = {};
  const showIcon = { hidden: false };
  const hideIcon = { hidden: true };
  const passwordInput = {
    type: "password",
    value: "example-password",
    focus() {},
  };
  const passwordToggle = {
    title: "Mostrar contrasena",
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelector(selector) {
      return selector === "[data-icon-show]" ? showIcon : hideIcon;
    },
    addEventListener(type, listener) { handlers[type] = listener; },
  };
  const form = {
    querySelector(selector) {
      return selector === "#login-password" ? passwordInput : passwordToggle;
    },
    addEventListener(type, listener) { handlers[type] = listener; },
  };
  const document = {
    querySelector(selector) { return selector === "[data-login-form]" ? form : null; },
  };
  const window = { OficiosApp: {} };

  runInNewContext(
    readFileSync(join(__dirname, "../js/pages/login-page.js"), "utf8"),
    { window, document }
  );

  handlers.click();
  assert.equal(passwordInput.type, "text");
  assert.equal(passwordInput.value, "example-password");
  assert.equal(passwordToggle.attributes["aria-label"], "Ocultar contrasena");
  assert.equal(showIcon.hidden, true);
  assert.equal(hideIcon.hidden, false);

  handlers.click();
  assert.equal(passwordInput.type, "password");
  assert.equal(passwordToggle.attributes["aria-label"], "Mostrar contrasena");
  assert.equal(showIcon.hidden, false);
  assert.equal(hideIcon.hidden, true);
  assert.equal(typeof handlers.submit, "function");
});
