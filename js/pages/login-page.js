(function () {
  const app = window.OficiosApp || {};
  const form = document.querySelector("[data-login-form]");
  const googleButton = document.querySelector("[data-google-login]");
  const sessionPanel = document.querySelector("[data-login-session-panel]");
  const message = document.querySelector("[data-form-message]");

  function setMessage(text, type) {
    if (!message) return;

    message.textContent = text;
    message.className = `form-message ${type || ""}`.trim();
  }

  function getValue(formData, fieldName) {
    return String(formData.get(fieldName) || "").trim();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const email = getValue(formData, "email");
    const password = getValue(formData, "password");

    if (!isValidEmail(email)) {
      setMessage("Escribi un email valido.", "error");
      return;
    }

    if (!password) {
      setMessage("Escribi tu contrasena.", "error");
      return;
    }

    submitButton.disabled = true;
    setMessage("Iniciando sesion...", "");

    try {
      const data = await app.authService.signIn(email, password);
      const accountEmail = data.session && data.session.user ? data.session.user.email : email;
      setMessage(`Sesion iniciada como ${accountEmail}.`, "success");
      message.insertAdjacentHTML("beforeend", ' <a class="inline-link" href="index.html">Volver al inicio</a>');
    } catch (error) {
      const errorText = error && error.message ? error.message : "";
      setMessage(
        /confirm|verified|email/i.test(errorText)
          ? "Antes de iniciar sesion tenes que confirmar tu email. Revisa tu correo y toca el enlace de OFICIOS APP."
          : "No pudimos iniciar sesion. Revisa el email y la contrasena.",
        "error"
      );
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleGoogleLogin() {
    if (!app.authService) {
      setMessage("El inicio con Google todavia no esta disponible.", "error");
      return;
    }

    googleButton.disabled = true;
    setMessage("Abriendo Google para iniciar sesion...", "");

    try {
      await app.authService.signInWithGoogle("index.html");
    } catch (error) {
      googleButton.disabled = false;
      setMessage("No pudimos abrir el inicio con Google. Revisa la configuracion e intentalo nuevamente.", "error");
    }
  }

  function renderSessionPanel(session) {
    if (!sessionPanel) {
      return;
    }

    const email = session && session.user ? session.user.email : "";

    if (!email) {
      sessionPanel.classList.add("is-hidden");
      sessionPanel.innerHTML = "";
      return;
    }

    sessionPanel.classList.remove("is-hidden");
    sessionPanel.innerHTML = `
      <strong>Ya tenes sesion iniciada</strong>
      <span>Estas entrando como ${email}.</span>
      <div class="form-actions">
        <a class="button primary large" href="index.html">Volver al inicio</a>
        <button class="button ghost large" type="button" data-login-logout>Cerrar sesion</button>
      </div>
    `;

    const logoutButton = sessionPanel.querySelector("[data-login-logout]");

    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;

        try {
          await app.authService.signOut();
          renderSessionPanel(null);
        } catch (error) {
          logoutButton.disabled = false;
        }
      });
    }
  }

  async function initLoginSessionPanel() {
    if (!app.authService) {
      return;
    }

    try {
      const session = await app.authService.getSession();
      renderSessionPanel(session);

      await app.authService.onAuthStateChange((event, updatedSession) => {
        renderSessionPanel(updatedSession);
      });
    } catch (error) {
      renderSessionPanel(null);
    }
  }

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  if (googleButton) {
    googleButton.addEventListener("click", handleGoogleLogin);
  }

  if (app.initSessionStatus) {
    app.initSessionStatus();
  }

  initLoginSessionPanel();
})();
