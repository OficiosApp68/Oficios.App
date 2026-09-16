(function () {
  window.OficiosApp = window.OficiosApp || {};

  const app = window.OficiosApp;
  const siteKey = String(app.supabaseConfig?.turnstileSiteKey || "").trim();
  let scriptPromise;

  function loadScript() {
    if (!scriptPromise) {
      scriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.onload = () => resolve(window.turnstile);
        script.onerror = () => reject(new Error("No se pudo cargar la verificacion."));
        document.head.appendChild(script);
      });
    }

    return scriptPromise;
  }

  function create(form) {
    const container = form?.querySelector("[data-turnstile]");
    if (!siteKey || !container) {
      return { enabled: false, getToken: () => "", reset: () => {}, setVisible: () => {} };
    }

    container.hidden = false;
    let widgetId = null;
    loadScript()
      .then((turnstile) => {
        if (!turnstile) throw new Error("Turnstile no esta disponible.");
        widgetId = turnstile.render(container, {
          sitekey: siteKey,
          language: "es",
          theme: "auto",
          size: "flexible",
        });
      })
      .catch(() => {
        container.textContent = "No se pudo cargar la verificacion. Actualiza la pagina e intentalo de nuevo.";
      });

    return {
      enabled: true,
      getToken: () => widgetId !== null && window.turnstile
        ? window.turnstile.getResponse(widgetId) || ""
        : "",
      reset: () => {
        if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
      },
      setVisible: (visible) => { container.hidden = !visible; },
    };
  }

  app.createTurnstileCaptcha = create;
})();
