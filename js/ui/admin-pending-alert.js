(function () {
  window.OficiosApp = window.OficiosApp || {};

  const app = window.OficiosApp;

  function getAlertTargets() {
    return Array.from(document.querySelectorAll("[data-admin-pending-alert]"));
  }

  function hideAlerts(targets) {
    targets.forEach((target) => {
      target.hidden = true;
      target.classList.add("is-hidden");
      target.innerHTML = "";
    });
  }

  function renderAlerts(targets, count) {
    const label = count === 1 ? "perfil pendiente" : "perfiles pendientes";

    targets.forEach((target) => {
      target.hidden = false;
      target.classList.remove("is-hidden");
      target.innerHTML = `
        <strong>Tenes ${count} ${label} de aprobacion.</strong>
        <a class="button primary" href="admin-moderacion.html">Revisar ahora</a>
      `;
    });
  }

  async function initAdminPendingAlert() {
    const targets = getAlertTargets();

    if (!targets.length || !app.authService || !app.supabaseService) {
      return;
    }

    hideAlerts(targets);

    try {
      const session = await app.authService.getSession();

      if (!session) {
        hideAlerts(targets);
        return;
      }

      const count = await app.supabaseService.getPendingModerationCount();

      if (!count) {
        hideAlerts(targets);
        return;
      }

      renderAlerts(targets, count);
    } catch (error) {
      hideAlerts(targets);
    }
  }

  app.initAdminPendingAlert = initAdminPendingAlert;

  document.addEventListener("DOMContentLoaded", initAdminPendingAlert);
})();
