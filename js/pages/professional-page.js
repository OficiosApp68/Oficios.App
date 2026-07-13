(function () {
  const app = window.OficiosApp;
  const params = new URLSearchParams(window.location.search);
  const professionalId = params.get("id");
  const profile = professionalId ? app.directoryService.getProfessionalById(professionalId) : null;

  function updatePageMeta(profileModel) {
    if (!profileModel) {
      document.title = "Profesional no encontrado | OFICIOS APP";
      return;
    }

    document.title = `${profileModel.user.displayName} | ${profileModel.publicProfile.title} | OFICIOS APP`;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) return;

    const description = profileModel.publicProfile.hasSummary
      ? profileModel.publicProfile.summary
      : `${profileModel.user.displayName} - ${profileModel.publicProfile.title} en ${profileModel.professional.serviceArea}.`;
    metaDescription.setAttribute("content", description);
  }

  updatePageMeta(profile);
  app.renderProfessionalDetailPage(profile, document.querySelector("[data-professional-page]"));
})();
