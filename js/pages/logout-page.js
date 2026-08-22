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
      window.location.href = "index.html";
    }, 700);
  }

  async function initLogoutPage() {
    if (!app.authService) {
      setMessage("No pudimos cargar el cierre de sesion. Volviendo al inicio...", "error");
      goHome();
      return;
    }

    try {
      await app.authService.signOut();
      setMessage("Sesion cerrada. Volviendo al inicio...", "success");
    } catch (error) {
      setMessage("La sesion local se va a limpiar al volver al inicio.", "error");
    } finally {
      goHome();
    }
  }

  initLogoutPage();
})();
