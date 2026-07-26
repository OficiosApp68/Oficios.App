(function () {
  const app = window.OficiosApp || {};
  const form = document.querySelector("[data-update-password-form]");
  const message = document.querySelector("[data-form-message]");

  function setMessage(text, type) {
    if (!message) return;

    message.textContent = text;
    message.className = `form-message ${type || ""}`.trim();
  }

  async function hasRecoverySession() {
    try {
      const session = await app.authService.getSession();
      return Boolean(session);
    } catch (error) {
      return false;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const password = String(formData.get("password") || "");
    const passwordConfirmation = String(formData.get("passwordConfirmation") || "");

    if (password.length < 6) {
      setMessage("La contrasena debe tener al menos 6 caracteres.", "error");
      return;
    }

    if (password !== passwordConfirmation) {
      setMessage("Las contrasenas no coinciden.", "error");
      return;
    }

    submitButton.disabled = true;
    setMessage("Guardando nueva contrasena...", "");

    try {
      const canUpdate = await hasRecoverySession();

      if (!canUpdate) {
        setMessage("Abri esta pagina desde el enlace que recibiste por email.", "error");
        return;
      }

      await app.authService.updatePassword(password);
      setMessage("Contrasena actualizada correctamente. Ya podes iniciar sesion.", "success");
      form.reset();
      message.insertAdjacentHTML("beforeend", ' <a class="inline-link" href="login.html">Ir a iniciar sesion</a>');
    } catch (error) {
      setMessage("No pudimos cambiar la contrasena. Volve a pedir el enlace e intentalo de nuevo.", "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
})();
