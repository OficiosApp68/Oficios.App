(function () {
  const app = window.OficiosApp || {};
  const message = document.querySelector("[data-auth-callback-message]");

  function setMessage(text, type) {
    if (!message) {
      return;
    }

    message.textContent = text;
    message.className = type ? `form-message ${type}` : "";
  }

  function getReadableAuthError(errorText) {
    const safeError = String(errorText || "").trim();

    if (!safeError) {
      return "";
    }

    if (/redirect|uri|url/i.test(safeError)) {
      return "Parece un problema con la direccion autorizada de Google o Supabase.";
    }

    if (/access_denied|denied|cancel/i.test(safeError)) {
      return "Google aviso que el acceso fue cancelado o rechazado.";
    }

    if (/email/i.test(safeError)) {
      return "Google no entrego el email de la cuenta.";
    }

    return safeError.length > 180 ? `${safeError.slice(0, 180)}...` : safeError;
  }

  function getSafeNextPath() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "index.html";

    if (/^https?:\/\//i.test(next) || next.startsWith("//")) {
      return "index.html";
    }

    return next;
  }

  async function waitForSession() {
    let session = null;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      session = await app.authService.getSession();

      if (session) {
        return session;
      }

      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    return null;
  }

  async function initAuthCallback() {
    if (!app.authService) {
      setMessage("No pudimos cargar la confirmacion de cuenta. Volve a intentar.", "error");
      return;
    }

    try {
      setMessage("Estamos confirmando tu sesion...", "");

      const session = await waitForSession();

      if (!session) {
        const authError = app.authService.getLastAuthError ? app.authService.getLastAuthError() : "";
        const readableError = getReadableAuthError(authError);
        setMessage(
          readableError
            ? `No pudimos completar el inicio de sesion. Motivo: ${readableError}`
            : "No encontramos una sesion activa. Volve a iniciar sesion.",
          "error"
        );
        return;
      }

      const email = session.user && session.user.email ? session.user.email : "tu cuenta";
      setMessage(`Sesion iniciada como ${email}. Volviendo a OFICIOS APP...`, "success");

      window.setTimeout(() => {
        window.location.href = getSafeNextPath();
      }, 900);
    } catch (error) {
      const readableError = getReadableAuthError(error && error.message);
      setMessage(
        readableError
          ? `No pudimos completar el inicio. Motivo: ${readableError}`
          : "No pudimos completar el inicio. Volve a intentar.",
        "error"
      );
    }
  }

  initAuthCallback();
})();
