(function () {
  const app = window.OficiosApp;
  const profiles = app.directoryService.getProfileViewModels();
  const professionalsGrid = document.querySelector("[data-professionals-grid]");
  const directoryStatus = document.querySelector("[data-directory-status]");
  const directorySearchForm = document.querySelector("[data-directory-search-form]");
  const directoryEmptyState = document.querySelector("[data-directory-empty]");
  const searchQuery = document.querySelector("[data-search-query]");
  const searchOccupation = document.querySelector("[data-search-occupation]");
  const searchLocation = document.querySelector("[data-search-location]");
  const searchSuggestions = document.querySelector("[data-search-suggestions]");
  const categoryGrid = document.querySelector("[data-category-grid]");
  let allProfiles = profiles;
  let searchDebounce = null;

  function updateDirectoryStatus(message, type) {
    if (!directoryStatus) return;

    directoryStatus.textContent = message;
    directoryStatus.className = `directory-status ${type || ""}`.trim();
  }

  function getSearchState() {
    return {
      query: searchQuery ? searchQuery.value : "",
      occupation: searchOccupation ? searchOccupation.value : "",
      location: searchLocation ? searchLocation.value : "",
    };
  }

  function getResultLabel(count) {
    return count === 1 ? "1 profesional encontrado." : `${count} profesionales encontrados.`;
  }

  function fillSelect(select, options, defaultLabel) {
    if (!select) return;

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = defaultLabel;
    select.replaceChildren(defaultOption);

    options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = option;
      select.appendChild(optionElement);
    });
  }

  function updateFilterOptions(nextProfiles) {
    if (!app.searchService) return;

    const options = app.searchService.getFilterOptions(nextProfiles);
    fillSelect(searchOccupation, options.occupations, "Todos los oficios");
    fillSelect(searchLocation, options.locations, "Todas las zonas");
  }

  function updateSearchSuggestions(nextProfiles) {
    if (!searchSuggestions || !app.searchService) return;

    const suggestions = app.searchService.getSearchSuggestions(nextProfiles, app.categories);
    searchSuggestions.replaceChildren();

    suggestions.forEach((suggestion) => {
      const option = document.createElement("option");
      option.value = suggestion;
      searchSuggestions.appendChild(option);
    });
  }

  function renderDirectory(nextProfiles) {
    app.renderProfessionals(nextProfiles, professionalsGrid);

    if (directoryEmptyState) {
      directoryEmptyState.hidden = nextProfiles.length > 0;
    }

    updateDirectoryStatus(getResultLabel(nextProfiles.length), nextProfiles.length ? "success" : "error");
  }

  function applySearch() {
    const results = app.searchService ? app.searchService.searchProfessionals(allProfiles, getSearchState()) : allProfiles;
    renderDirectory(results);
  }

  function showDirectoryResults() {
    const directorySection = document.querySelector("#profesionales");

    if (directorySection) {
      directorySection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (window.location.hash !== "#profesionales") {
      history.replaceState(null, "", "#profesionales");
    }
  }

  function scheduleSearch() {
    window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(applySearch, 180);
  }

  function clearSearch() {
    if (searchQuery) searchQuery.value = "";
    if (searchOccupation) searchOccupation.value = "";
    if (searchLocation) searchLocation.value = "";
    applySearch();
  }

  function initDirectorySearch() {
    if (!directorySearchForm || !app.searchService) return;

    directorySearchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      applySearch();
      showDirectoryResults();
    });

    if (searchQuery) {
      searchQuery.addEventListener("input", scheduleSearch);
    }

    [searchOccupation, searchLocation].forEach((select) => {
      if (select) {
        select.addEventListener("change", applySearch);
      }
    });

    document.querySelectorAll("[data-clear-search]").forEach((button) => {
      button.addEventListener("click", clearSearch);
    });
  }

  function initCategorySearch() {
    if (!categoryGrid) return;

    categoryGrid.addEventListener("click", (event) => {
      const categoryButton = event.target.closest("[data-category-query]");
      if (!categoryButton) return;

      if (searchQuery) {
        searchQuery.value = categoryButton.dataset.categoryQuery || categoryButton.textContent.trim();
      }

      if (searchOccupation) searchOccupation.value = "";
      if (searchLocation) searchLocation.value = "";

      applySearch();
      showDirectoryResults();
    });
  }

  app.initNavigation();
  app.initSessionStatus();
  app.renderCategories(app.categories, document.querySelector("[data-category-grid]"));
  updateFilterOptions(allProfiles);
  updateSearchSuggestions(allProfiles);
  renderDirectory(allProfiles);
  initDirectorySearch();
  initCategorySearch();
  app.renderProfileDetail(app.directoryService.getFeaturedProfile(), document.querySelector("[data-profile-detail]"));
  app.renderAdminTable(profiles, document.querySelector("[data-admin-table]"));

  if (!app.supabaseService) {
    updateDirectoryStatus("Directorio inicial cargado. Conexion online no disponible.", "error");
    return;
  }

  app.supabaseService
    .getProfessionalProfiles()
    .then((onlineProfiles) => {
      allProfiles = [...onlineProfiles, ...profiles];
      updateFilterOptions(allProfiles);
      updateSearchSuggestions(allProfiles);
      applySearch();
    })
    .catch(() => {
      updateDirectoryStatus("No pudimos cargar los profesionales online. El directorio de ejemplo sigue disponible.", "error");
    });
})();
