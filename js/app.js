(function () {
  const app = window.OficiosApp;
  const profiles = app.directoryService.getProfileViewModels();

  app.initNavigation();
  app.renderCategories(app.categories, document.querySelector("[data-category-grid]"));
  app.renderProfessionals(profiles, document.querySelector("[data-professionals-grid]"));
  app.renderProfileDetail(app.directoryService.getFeaturedProfile(), document.querySelector("[data-profile-detail]"));
  app.renderAdminTable(profiles, document.querySelector("[data-admin-table]"));
})();
