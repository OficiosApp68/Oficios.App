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
    const experience = normalizeText(professional.experience, "");
    const serviceArea = normalizeText(professional.serviceArea, "");
    const coverage = normalizeText(professional.coverage, "");
    const workingHours = normalizeText(professional.workingHours, "");

    return {
      id: professional.id,
      userId: normalizeText(professional.userId, ""),
      primaryTradeId: normalizeText(professional.primaryTradeId, ""),
      tradeIds: safeTradeIds,
      experience: experience || "Experiencia pendiente de carga",
      serviceArea: serviceArea || "Zona a confirmar",
      coverage: coverage || "Zona de cobertura pendiente de carga.",
      workingHours: workingHours || "Horarios a confirmar",
      isActive: professional.isActive !== false,
      hasExperience: Boolean(experience),
      hasServiceArea: Boolean(serviceArea),
      hasCoverage: Boolean(coverage),
      hasWorkingHours: Boolean(workingHours),
    };
  }

  function normalizePublicProfile(publicProfile, professional) {
    const primaryTrade = getTradeName(professional.primaryTradeId);
    const title = normalizeText(publicProfile && publicProfile.title, "");
    const summary = normalizeText(publicProfile && publicProfile.summary, "");
    const longDescription = normalizeText(publicProfile && publicProfile.longDescription, "");
    const specialties = Array.isArray(publicProfile && publicProfile.specialties)
      ? publicProfile.specialties.filter((specialty) => normalizeText(specialty, ""))
      : [];
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
      title: title || primaryTrade,
      summary: summary || "Descripcion pendiente de carga.",
      longDescription: longDescription || "Descripcion profesional pendiente de carga.",
      specialties,
      rating: typeof (publicProfile && publicProfile.rating) === "number" ? publicProfile.rating : null,
      ratingLabel: typeof (publicProfile && publicProfile.rating) === "number" ? publicProfile.rating.toFixed(1) : "Sin calificacion",
      whatsapp: normalizeText(publicProfile && publicProfile.whatsapp, ""),
      photo: normalizeText(publicProfile && publicProfile.photo, fallbackProfilePhoto),
      hasPhoto: Boolean(publicProfile && normalizeText(publicProfile.photo, "")),
      gallery,
      reviews: Array.isArray(publicProfile && publicProfile.reviews) ? publicProfile.reviews : [],
      hasValidReference: Boolean(publicProfile),
      hasTitle: Boolean(title),
      hasSummary: Boolean(summary),
      hasLongDescription: Boolean(longDescription),
      hasSpecialties: specialties.length > 0,
      hasRating: typeof (publicProfile && publicProfile.rating) === "number",
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

  function buildProfileViewModel(professional) {
    if (!professional) return null;

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
      canContactByPhone: Boolean(user.phone),
    };
  }

  function getProfileViewModels() {
    return app.directory.professionals.filter((professional) => professional.isActive).map(buildProfileViewModel);
  }

  function getProfessionalById(professionalId) {
    const professional = findById(app.directory.professionals, professionalId);
    return buildProfileViewModel(professional);
  }

  app.directoryService = {
    getProfileViewModels,
    getProfessionalById,
    getFeaturedProfile: function () {
      return getProfileViewModels()[0];
    },
  };
})();
