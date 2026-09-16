const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const { join } = require("node:path");

async function submitWithError(error) {
  let submitHandler;
  const message = { textContent: "", className: "" };
  const submitButton = { disabled: false, textContent: "" };
  const form = {
    querySelectorAll() { return []; },
    addEventListener(type, handler) {
      if (type === "submit") submitHandler = handler;
    },
  };
  const elements = {
    "[data-register-form]": form,
    "[data-form-message]": message,
    "[data-register-submit]": submitButton,
    "[data-terms-acceptance]": { checked: true },
  };
  const document = {
    querySelector(selector) { return elements[selector] || null; },
  };
  const app = {
    authService: {
      async getSession() { return null; },
      async signUp() { throw error; },
    },
  };
  class MockFormData {
    get(name) {
      return {
        email: "test@example.com",
        password: "example-password",
        passwordConfirmation: "example-password",
      }[name] || "";
    }
  }

  runInNewContext(
    readFileSync(join(__dirname, "../js/pages/register-page.js"), "utf8"),
    { window: { OficiosApp: app }, document, FormData: MockFormData }
  );

  await submitHandler({ preventDefault() {} });
  assert.equal(submitButton.disabled, false);
  assert.equal(message.className, "form-message error");
  return message.textContent;
}

test("registration explains CAPTCHA errors without exposing the provider's raw message", async () => {
  const text = await submitWithError({ code: "captcha_failed", status: 400, message: "Sensitive diagnostic" });
  assert.match(text, /verificacion no pudo validarse/);
  assert.doesNotMatch(text, /Sensitive diagnostic/);
});

test("registration identifies email delivery configuration errors", async () => {
  const text = await submitWithError({ code: "email_address_not_authorized", status: 403 });
  assert.match(text, /correo de confirmacion/);
});

test("registration includes a safe code for otherwise unknown server failures", async () => {
  const text = await submitWithError({ code: "unexpected_failure", status: 500 });
  assert.match(text, /Codigo: unexpected_failure/);
});
