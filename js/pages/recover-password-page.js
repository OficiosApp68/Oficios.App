(function () {
  const app = window.OficiosApp || {};
  const form = document.querySelector("[data-recover-password-form]");
  const message = document.querySelector("[data-form-message]");

  function setMessage(text, type) {
    if (!message) return;

    message.textContent = text;
    message.className = `form-message ${type || ""}`.trim();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();

    if (!isValidEmail(email)) {
      setMessage("Escribi un email valido.", "error");
      return;
    }

    submitButton.disabled = true;
    setMessage("Enviando enlace de recuperacion...", "");

    try {
      await app.authService.resetPasswordForEmail(email);
      setMessage("Si el email existe, te enviamos un enlace para cambiar la contrasena.", "success");
      form.reset();
    } catch (error) {
      setMessage("No pudimos enviar el enlace. Revisa el email e intentalo nuevamente.", "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
})();
