const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");

const root = new URL("../", `file:///${__filename.replaceAll("\\", "/")}`);

function runScript(path, window, document) {
  runInNewContext(readFileSync(new URL(path, root), "utf8"), { window, document, URL, URLSearchParams });
}

test("Turnstile stays off without a public sitekey", () => {
  const window = { OficiosApp: { supabaseConfig: { turnstileSiteKey: "" } } };
  runScript("js/ui/turnstile-captcha.js", window, {});
  const captcha = window.OficiosApp.createTurnstileCaptcha({ querySelector: () => ({ hidden: true }) });
  assert.equal(captcha.enabled, false);
  assert.equal(captcha.getToken(), "");
});

test("Turnstile returns and resets the widget token", async () => {
  const container = { hidden: true };
  let script;
  let resetId;
  const window = {
    OficiosApp: { supabaseConfig: { turnstileSiteKey: "public-key" } },
    turnstile: {
      render: (target, options) => {
        assert.equal(target, container);
        assert.equal(options.sitekey, "public-key");
        return "widget-id";
      },
      getResponse: () => "test-token",
      reset: (id) => { resetId = id; },
    },
  };
  const document = {
    createElement: () => (script = {}),
    head: { appendChild: () => { script.onload(); } },
  };
  runScript("js/ui/turnstile-captcha.js", window, document);
  const captcha = window.OficiosApp.createTurnstileCaptcha({ querySelector: () => container });
  await new Promise(setImmediate);
  assert.equal(container.hidden, false);
  assert.equal(captcha.getToken(), "test-token");
  captcha.reset();
  assert.equal(resetId, "widget-id");
});

test("email auth forwards captcha tokens without changing Google login", async () => {
  const calls = [];
  const auth = {
    signUp: async (payload) => { calls.push(["signUp", payload]); return { data: {}, error: null }; },
    signInWithPassword: async (payload) => { calls.push(["signIn", payload]); return { data: {}, error: null }; },
    resetPasswordForEmail: async (email, options) => { calls.push(["reset", email, options]); return { data: {}, error: null }; },
  };
  const window = {
    location: { href: "https://example.com/registro.html", hostname: "example.com", port: "" },
    OficiosApp: { supabaseService: { getClient: async () => ({ auth }) } },
  };
  runScript("js/services/auth-service.js", window, {});
  await window.OficiosApp.authService.signUp("a@example.com", "password", "signup-token");
  await window.OficiosApp.authService.signIn("a@example.com", "password", "login-token");
  await window.OficiosApp.authService.resetPasswordForEmail("a@example.com", "reset-token");
  assert.equal(calls[0][1].options.captchaToken, "signup-token");
  assert.equal(calls[1][1].options.captchaToken, "login-token");
  assert.equal(calls[2][2].captchaToken, "reset-token");
});
