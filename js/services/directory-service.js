(function () {
  window.OficiosApp = window.OficiosApp || {};

  const app = window.OficiosApp;
  const fallbackProfilePhoto = "assets/profile-placeholder.svg";

  function findById(collection, id) {
    if (!Array.isArray(collection)) return undefined;
    return collection.find((item) => item.id === id);
  }

  function normalizeText(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function getTradeName(tradeId) {
    const category = findById(app.categories, tradeId);
    return category ? category.name : "Sin categoria";
  }

  function getSubscription(professionalId) {
    return app.directory.subscriptions.find((subscription) => subscription.professionalId === professionalId);
  }

  function normalizeUser(user, professional) {
    const fallbackName = professional && professional.id ? "Profesional pendiente" : "Profesional";

    return {
      id: user ? user.id : null,
      role: user ? user.role : "professional",
      displayName: normalizeText(user && user.displayName, fallbackName),
      email: normalizeText(user && user.email, ""),
      phone: normalizeText(user && user.phone, ""),
      accountStatus: normalizeText(user && user.accountStatus, "pending"),
      hasValidReference: Boolean(user),
    };
  }

  function normalizeProfessional(professional) {
    const safeTradeIds = Array.isArray(professional.tradeIds) ? professional.tradeIds : [];

    return {
      id: professional.id,
      userId: normalizeText(professional.userId, ""),
      primaryTradeId: normalizeText(professional.primaryTradeId, ""),
      tradeIds: safeTradeIds,
      experience: normalizeText(professional.experience, "Experiencia pendiente de carga"),
      serviceArea: normalizeText(professional.serviceArea, "Zona a confirmar"),
      coverage: normalizeText(professional.coverage, "Zona de cobertura pendiente de carga."),
      workingHours: normalizeText(professional.workingHours, "Horarios a confirmar"),
      isActive: professional.isActive !== false,
    };
  }

  function normalizePublicProfile(publicProfile, professional) {
    const primaryTrade = getTradeName(professional.primaryTradeId);
    const gallery = Array.isArray(publicProfile && publicProfile.gallery)
      ? publicProfile.gallery
          .filter((item) => item && normalizeText(item.src, ""))
          .map((item) => ({
            src: normalizeText(item.src, ""),
            alt: normalizeText(item.alt, "Trabajo realizado"),
          }))
      : [];

    return {
      id: publicProfile ? publicProfile.id : null,
      professionalId: professional.id,
      title: normalizeText(publicProfile && publicProfile.title, primaryTrade),
      summary: normalizeText(publicProfile && publicProfile.summary, "Descripcion pendiente de carga."),
      longDescription: normalizeText(publicProfile && publicProfile.longDescription, "Descripcion profesional pendiente de carga."),
      specialties: Array.isArray(publicProfile && publicProfile.specialties) ? publicProfile.specialties : [],
      rating: typeof (publicProfile && publicProfile.rating) === "number" ? publicProfile.rating : null,
      ratingLabel: typeof (publicProfile && publicProfile.rating) === "number" ? publicProfile.rating.toFixed(1) : "Sin calificacion",
      whatsapp: normalizeText(publicProfile && publicProfile.whatsapp, ""),
      photo: normalizeText(publicProfile && publicProfile.photo, fallbackProfilePhoto),
      hasPhoto: Boolean(publicProfile && normalizeText(publicProfile.photo, "")),
      gallery,
      reviews: Array.isArray(publicProfile && publicProfile.reviews) ? publicProfile.reviews : [],
      hasValidReference: Boolean(publicProfile),
    };
  }

  function normalizeSubscription(subscription) {
    return {
      id: subscription ? subscription.id : null,
      professionalId: subscription ? subscription.professionalId : null,
      plan: normalizeText(subscription && subscription.plan, "free"),
      status: normalizeText(subscription && subscription.status, "inactive"),
      hasValidReference: Boolean(subscription),
    };
  }

  function getProfileViewModels() {
    return app.directory.professionals
      .filter((professional) => professional.isActive)
      .map((professional) => {
        const normalizedProfessional = normalizeProfessional(professional);
        const user = normalizeUser(findById(app.directory.users, normalizedProfessional.userId), normalizedProfessional);
        const publicProfile = normalizePublicProfile(
          app.directory.publicProfiles.find((profile) => profile.professionalId === normalizedProfessional.id),
          normalizedProfessional
        );
        const subscription = normalizeSubscription(getSubscription(normalizedProfessional.id));
        const hasPremiumPlan = subscription.plan === "premium" && subscription.status === "active";

        return {
          id: normalizedProfessional.id,
          user,
          professional: normalizedProfessional,
          publicProfile,
          primaryTrade: getTradeName(normalizedProfessional.primaryTradeId),
          trades: normalizedProfessional.tradeIds.map(getTradeName),
          subscription,
          statusLabel: hasPremiumPlan ? "Premium" : "Gratuito",
          canContactByWhatsapp: Boolean(publicProfile.whatsapp),
        };
      });
  }

  app.directoryService = {
    getProfileViewModels,
    getFeaturedProfile: function () {
      return getProfileViewModels()[0];
    },
  };
})();
