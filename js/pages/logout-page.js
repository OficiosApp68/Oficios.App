(function () {
  const app = window.OficiosApp || {};
  const message = document.querySelector("[data-logout-message]");

  function setMessage(text, type) {
    if (!message) return;

    message.textContent = text;
    message.className = type ? `form-message ${type}` : "";
  }

  function goHome() {
    window.setTimeout(() => {
      window.location.replace("index.html?sesion=cerrada");
    }, 700);
  }

  function getSupabaseStoragePrefix() {
    const config = app.supabaseConfig || {};
    const match = String(config.url || "").match(/^https:\/\/([^.]+)\.supabase\.co/i);
    return match ? `sb-${match[1]}` : "";
  }

  function clearStoredAuthSession() {
    const prefix = getSupabaseStoragePrefix();
    const storages = [window.localStorage, window.sessionStorage].filter(Boolean);

    storages.forEach((storage) => {
      Object.keys(storage).forEach((key) => {
        const isCurrentProjectSession = prefix && key.startsWith(prefix);
        const isLegacySupabaseSession = key === "supabase.auth.token";

        if (isCurrentProjectSession || isLegacySupabaseSession) {
          storage.removeItem(key);
        }
      });
    });
  }

  async function initLogoutPage() {
    if (!app.authService) {
      setMessage("No pudimos cargar el cierre de sesion. Volviendo al inicio...", "error");
      goHome();
      return;
    }

    try {
      await app.authService.signOut();
      clearStoredAuthSession();
      setMessage("Sesion cerrada. Volviendo al inicio...", "success");
    } catch (error) {
      clearStoredAuthSession();
      setMessage("Sesion cerrada en este navegador. Volviendo al inicio...", "success");
    } finally {
      goHome();
    }
  }

  initLogoutPage();
})();
