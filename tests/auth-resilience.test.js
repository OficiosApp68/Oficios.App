const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

function read(path) {
  return readFileSync(join(__dirname, "..", path), "utf8");
}

function createStorage(initialValues) {
  const storage = { ...(initialValues || {}) };

  Object.defineProperties(storage, {
    getItem: {
      value(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      },
    },
    removeItem: {
      value(key) {
        delete storage[key];
      },
    },
    setItem: {
      value(key, value) {
        storage[key] = String(value);
      },
    },
  });

  return storage;
}

test("a blocked stored session times out and is cleared locally", async () => {
  const localStorage = createStorage({
    "sb-azusfssqlgiiwoflseor-auth-token": "stale-session",
    "unrelated-setting": "keep-me",
  });
  const auth = {
    getSession() {
      return new Promise(() => {});
    },
  };
  const window = {
    OficiosApp: {
      supabaseConfig: { url: "https://azusfssqlgiiwoflseor.supabase.co" },
      supabaseService: {
        async getClient() {
          return { auth };
        },
      },
    },
    location: {
      hash: "",
      hostname: "oficiosapp68.github.io",
      href: "https://oficiosapp68.github.io/Oficios.App/index.html",
      port: "",
      search: "",
    },
    localStorage,
    sessionStorage: createStorage(),
    setTimeout(callback) {
      return setImmediate(callback);
    },
    clearTimeout(handle) {
      clearImmediate(handle);
    },
  };

  vm.runInNewContext(read("js/services/auth-service.js"), {
    URL,
    URLSearchParams,
    Promise,
    Object,
    String,
    window,
  });

  const session = await window.OficiosApp.authService.getSession();

  assert.equal(session, null);
  assert.equal(localStorage.getItem("sb-azusfssqlgiiwoflseor-auth-token"), null);
  assert.equal(localStorage.getItem("unrelated-setting"), "keep-me");
  assert.match(window.OficiosApp.authService.getLastAuthError(), /bloqueada/i);
});

test("session UI and callback do not retry indefinitely", () => {
  const statusSource = read("js/ui/session-status.js");
  const callbackSource = read("js/pages/auth-callback-page.js");

  assert.doesNotMatch(statusSource, /for \(let attempt/);
  assert.doesNotMatch(callbackSource, /for \(let attempt/);
  assert.match(statusSource, /Reiniciar acceso/);
  assert.match(callbackSource, /authService\.getSession\(\)/);
});
