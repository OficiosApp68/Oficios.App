(function () {
  window.OficiosApp = window.OficiosApp || {};

  const app = window.OficiosApp;

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

  function renderSignedIn(target, session) {
    const email = session && session.user ? session.user.email : "";

    target.innerHTML = `
      <span class="session-label">Sesion iniciada como ${email}</span>
      <a class="button secondary" href="mi-perfil.html">Editar mi perfil</a>
      <button class="button ghost" type="button" data-logout-button>Cerrar sesion</button>
    `;

    const logoutButton = target.querySelector("[data-logout-button]");

    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;

        try {
          await app.authService.signOut();
        } catch (error) {
          logoutButton.disabled = false;
        }
      });
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
        renderSignedIn(target, session);
      } else {
        const authError = app.authService.getLastAuthError ? app.authService.getLastAuthError() : "";
        if (authError) {
          renderAuthError(target, "No pudimos completar Google.");
        } else {
          renderSignedOut(target);
        }
      }

      await app.authService.onAuthStateChange((event, updatedSession) => {
        if (updatedSession) {
          renderSignedIn(target, updatedSession);
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
