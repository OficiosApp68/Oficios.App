(function () {
  window.OficiosApp = window.OficiosApp || {};

  window.OficiosApp.renderAdminTable = function (profiles, target) {
    if (!target) return;
    const helpers = window.OficiosApp.renderHelpers;

    const rows = profiles
      .map((profile) => {
        const statusClass = helpers.getStatusClass(profile);
        const activeAction = profile.professional.isActive ? "Pausar" : "Activar";

        return `
          <div class="admin-row" role="row">
            <span>${profile.user.displayName}</span>
            <span>${profile.primaryTrade}</span>
            <span class="status ${statusClass}">${profile.statusLabel}</span>
            <span class="table-actions">Editar / ${activeAction}</span>
          </div>
        `;
      })
      .join("");

    target.innerHTML = `
      <div class="admin-row admin-head" role="row">
        <span>Nombre</span>
        <span>Oficio</span>
        <span>Estado</span>
        <span>Acciones</span>
      </div>
      ${rows}
    `;
  };
})();
