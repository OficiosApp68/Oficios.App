const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

function loadService(client) {
  const source = readFileSync(join(__dirname, "../js/services/supabase-service.js"), "utf8").replace(
    /async function getClient\(\) \{[\s\S]*?\n  \}\n\n  async function createProfessionalProfile/,
    "async function getClient() { return window.__testClient; }\n\n  async function createProfessionalProfile"
  );
  const window = {
    __testClient: client,
    OficiosApp: {},
    setTimeout(callback) {
      return setImmediate(callback);
    },
    clearTimeout(handle) {
      clearImmediate(handle);
    },
  };

  vm.runInNewContext(source, {
    Error,
    Promise,
    URL,
    window,
  });

  return window.OficiosApp.supabaseService;
}

test("profile creation stops waiting and returns a clear timeout", async () => {
  const service = loadService({
    rpc() {
      return new Promise(() => {});
    },
  });

  await assert.rejects(
    service.createProfessionalProfile({
      name: "Perfil de prueba",
      occupation: "Emprendimiento",
      phone: "1112345678",
      zone: "Zona de prueba",
      description: "Prueba de corte por demora",
      termsAccepted: true,
    }),
    (error) => error.code === "service_request_timeout" && /Recarga Mi perfil/i.test(error.message)
  );
});

test("profile loading also stops when session lookup hangs", async () => {
  const service = loadService({
    auth: {
      getSession() {
        return new Promise(() => {});
      },
    },
  });

  await assert.rejects(
    service.getCurrentUserProfile(),
    (error) => error.code === "service_request_timeout" && /sesion/i.test(error.message)
  );
});

test("all profile pages request the new service version", () => {
  const pages = [
    "auth-callback.html",
    "cerrar-sesion.html",
    "cambiar-password.html",
    "index.html",
    "admin-moderacion.html",
    "login.html",
    "mi-perfil.html",
    "recuperar-password.html",
    "profesional.html",
    "registro.html",
  ];

  pages.forEach((page) => {
    const html = readFileSync(join(__dirname, "..", page), "utf8");
    assert.match(html, /supabase-service\.js\?v=operation-timeout-20260927a/);
  });
});
