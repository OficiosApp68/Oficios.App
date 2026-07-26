(function () {
  const app = window.OficiosApp;
  const profiles = app.directoryService.getProfileViewModels();
  const professionalsGrid = document.querySelector("[data-professionals-grid]");
  const directoryStatus = document.querySelector("[data-directory-status]");

  function updateDirectoryStatus(message, type) {
    if (!directoryStatus) return;

    directoryStatus.textContent = message;
    directoryStatus.className = `directory-status ${type || ""}`.trim();
  }

  app.initNavigation();
  app.initSessionStatus();
  app.renderCategories(app.categories, document.querySelector("[data-category-grid]"));
  app.renderProfessionals(profiles, professionalsGrid);
  app.renderProfileDetail(app.directoryService.getFeaturedProfile(), document.querySelector("[data-profile-detail]"));
  app.renderAdminTable(profiles, document.querySelector("[data-admin-table]"));

  if (!app.supabaseService) {
    updateDirectoryStatus("Directorio inicial cargado. Conexion online no disponible.", "error");
    return;
  }

  app.supabaseService
    .getProfessionalProfiles()
    .then((onlineProfiles) => {
      const allProfiles = [...onlineProfiles, ...profiles];
      app.renderProfessionals(allProfiles, professionalsGrid);
      updateDirectoryStatus(
        onlineProfiles.length
          ? `${onlineProfiles.length} profesional(es) registrado(s) online.`
          : "Todavia no hay profesionales registrados online.",
        "success"
      );
    })
    .catch(() => {
      updateDirectoryStatus("No pudimos cargar los profesionales online. El directorio de ejemplo sigue disponible.", "error");
    });
})();
