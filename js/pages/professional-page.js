(function () {
  const app = window.OficiosApp;
  const params = new URLSearchParams(window.location.search);
  const professionalId = params.get("id");

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

  function renderProfile(profile) {
    updatePageMeta(profile);
    app.renderProfessionalDetailPage(profile, document.querySelector("[data-professional-page]"));
  }

  async function initProfessionalPage() {
    app.initSessionStatus();

    if (!professionalId) {
      renderProfile(null);
      return;
    }

    const localProfile = app.directoryService.getProfessionalById(professionalId);

    if (localProfile) {
      renderProfile(localProfile);
      return;
    }

    if (!app.supabaseService) {
      renderProfile(null);
      return;
    }

    try {
      const onlineProfile = await app.supabaseService.getProfessionalProfileById(professionalId);
      renderProfile(onlineProfile);
    } catch (error) {
      renderProfile(null);
    }
  }

  initProfessionalPage();
})();
