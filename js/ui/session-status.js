(function () {
  window.OficiosApp = window.OficiosApp || {};

  const app = window.OficiosApp;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderSignedOut(target) {
    target.innerHTML = `
      <a class="button ghost" href="login.html">Iniciar sesion</a>
      <a class="button primary" href="registro.html">Registrarse</a>
    `;
  }

  function renderChecking(target) {
    target.innerHTML = '<span class="session-label">Comprobando sesion...</span>';
  }

  function renderAuthError(target, errorMessage) {
    target.innerHTML = `
      <span class="session-label session-error">${errorMessage}</span>
      <a class="button ghost" href="login.html">Intentar de nuevo</a>
    `;
  }

  function renderSignedIn(target, session, isAdmin) {
    const email = escapeHtml(session && session.user ? session.user.email : "");

    target.innerHTML = `
      <span class="session-label">Sesion iniciada como ${email}</span>
      ${isAdmin ? '<a class="button secondary" href="admin-moderacion.html">Administrar</a>' : ""}
      <a class="button secondary" href="mi-perfil.html">Editar mi perfil</a>
      <a class="button ghost" href="cerrar-sesion.html">Cerrar sesion</a>
    `;
  }

  async function renderAuthenticated(target, session) {
    renderSignedIn(target, session, false);

    if (app.supabaseService && app.supabaseService.isCurrentUserAdmin) {
      const isAdmin = await app.supabaseService.isCurrentUserAdmin();

      if (isAdmin) {
        renderSignedIn(target, session, true);
      }
    }
  }

  async function initSessionStatus() {
    const target = document.querySelector("[data-session-status]");

    if (!target || !app.authService) {
      return;
    }

    renderChecking(target);

    try {
      let session = await app.authService.getSession();

      if (!session) {
        for (let attempt = 0; attempt < 12; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          session = await app.authService.getSession();

          if (session) {
            break;
          }
        }
      }

      if (session) {
        await renderAuthenticated(target, session);
      } else {
        const authError = app.authService.getLastAuthError ? app.authService.getLastAuthError() : "";
        if (authError) {
          renderAuthError(target, "No pudimos completar Google.");
        } else {
          renderSignedOut(target);
        }
      }

      await app.authService.onAuthStateChange(async (event, updatedSession) => {
        if (updatedSession) {
          await renderAuthenticated(target, updatedSession);
        } else {
          renderSignedOut(target);
        }
      });
    } catch (error) {
      renderSignedOut(target);
    }
  }

  app.initSessionStatus = initSessionStatus;
})();
