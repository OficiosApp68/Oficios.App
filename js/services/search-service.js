(function () {
  window.OficiosApp = window.OficiosApp || {};

  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function getSearchFields(profile) {
    return [
      profile.user && profile.user.displayName,
      profile.primaryTrade,
      profile.publicProfile && profile.publicProfile.title,
      profile.publicProfile && profile.publicProfile.summary,
      profile.publicProfile && profile.publicProfile.longDescription,
      profile.professional && profile.professional.serviceArea,
      profile.professional && profile.professional.coverage,
      ...(Array.isArray(profile.trades) ? profile.trades : []),
    ];
  }

  function getSearchTokens(value) {
    return normalizeSearchText(value).split(" ").filter(Boolean);
  }

  function getTokenVariants(token) {
    const variants = [token];
    const stem = token.length > 4 ? token.replace(/[aeiou]$/, "") : "";

    if (stem && stem !== token) {
      variants.push(stem);
    }

    return variants;
  }

  function matchesQuery(profile, query) {
    const queryTokens = getSearchTokens(query);
    if (!queryTokens.length) return true;

    const searchableText = normalizeSearchText(getSearchFields(profile).join(" "));
    return queryTokens.every((token) => getTokenVariants(token).some((variant) => searchableText.includes(variant)));
  }

  function matchesOccupation(profile, occupation) {
    const normalizedOccupation = normalizeSearchText(occupation);
    if (!normalizedOccupation) return true;

    const profileOccupations = [
      profile.primaryTrade,
      profile.publicProfile && profile.publicProfile.title,
      ...(Array.isArray(profile.trades) ? profile.trades : []),
    ];

    return profileOccupations.some((item) => normalizeSearchText(item) === normalizedOccupation);
  }

  function matchesLocation(profile, location) {
    const normalizedLocation = normalizeSearchText(location);
    if (!normalizedLocation) return true;

    return [profile.professional && profile.professional.serviceArea, profile.professional && profile.professional.coverage].some(
      (item) => normalizeSearchText(item) === normalizedLocation
    );
  }

  function searchProfessionals(profiles, filters) {
    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    const safeFilters = filters || {};

    return safeProfiles.filter(
      (profile) =>
        matchesQuery(profile, safeFilters.query) &&
        matchesOccupation(profile, safeFilters.occupation) &&
        matchesLocation(profile, safeFilters.location)
    );
  }

  function getUniqueSortedValues(values) {
    const options = new Map();

    values.forEach((value) => {
      const label = String(value || "").trim();
      const key = normalizeSearchText(label);

      if (label && key && !options.has(key)) {
        options.set(key, label);
      }
    });

    return [...options.values()].sort((a, b) => a.localeCompare(b, "es"));
  }

  function getFilterOptions(profiles) {
    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    const occupationValues = [];
    const locationValues = [];

    safeProfiles.forEach((profile) => {
      occupationValues.push(profile.primaryTrade, profile.publicProfile && profile.publicProfile.title);

      if (Array.isArray(profile.trades)) {
        occupationValues.push(...profile.trades);
      }

      locationValues.push(profile.professional && profile.professional.serviceArea, profile.professional && profile.professional.coverage);
    });

    return {
      occupations: getUniqueSortedValues(occupationValues),
      locations: getUniqueSortedValues(locationValues),
    };
  }

  function getSearchSuggestions(profiles, categories) {
    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    const safeCategories = Array.isArray(categories) ? categories : [];
    const values = [];

    safeCategories.forEach((category) => {
      values.push(category.name);
    });

    safeProfiles.forEach((profile) => {
      values.push(
        profile.user && profile.user.displayName,
        profile.primaryTrade,
        profile.publicProfile && profile.publicProfile.title,
        profile.professional && profile.professional.serviceArea
      );

      if (Array.isArray(profile.trades)) {
        values.push(...profile.trades);
      }
    });

    return getUniqueSortedValues(values);
  }

  window.OficiosApp.searchService = {
    getFilterOptions,
    getSearchSuggestions,
    normalizeSearchText,
    searchProfessionals,
  };
})();
