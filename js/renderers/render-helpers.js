(function () {
  window.OficiosApp = window.OficiosApp || {};

  function getStatusClass(profile) {
    if (profile.moderationStatus === "pending") return "pending";
    if (profile.moderationStatus === "rejected") return "rejected";
    return profile.statusLabel === "Premium" ? "premium" : "free";
  }

  function renderPhoto(profile, className, altText) {
    if (!profile.publicProfile.hasPhoto) {
      return `<div class="${className} photo-placeholder" role="img" aria-label="${altText}">OA</div>`;
    }

    return `<img src="${profile.publicProfile.photo}" alt="${altText}" />`;
  }

  function renderWhatsapp(profile) {
    if (!profile.canContactByWhatsapp) {
      return '<span class="button whatsapp contact-disabled" aria-disabled="true">WhatsApp no disponible</span>';
    }

    const message = `Hola ${profile.user.displayName}, vengo de OFICIOS APP y quiero consultarte por un presupuesto.`;
    const separator = profile.publicProfile.whatsapp.includes("?") ? "&" : "?";
    const whatsappUrl = `${profile.publicProfile.whatsapp}${separator}text=${encodeURIComponent(message)}`;

    return `
      <a class="button whatsapp" href="${whatsappUrl}" target="_blank" rel="noreferrer">
        WhatsApp
      </a>
    `;
  }

  function renderPhone(profile) {
    if (!profile.canContactByPhone) return "";
    const phoneHref = profile.user.phone.replace(/[^\d+]/g, "");

    return `
      <a class="button secondary" href="tel:${phoneHref}" aria-label="Llamar a ${profile.user.displayName}">
        ${profile.user.phone}
      </a>
    `;
  }

  function getProfessionalUrl(profile) {
    return `profesional.html?id=${encodeURIComponent(profile.id)}`;
  }

  window.OficiosApp.renderHelpers = {
    getStatusClass,
    getProfessionalUrl,
    renderPhoto,
    renderPhone,
    renderWhatsapp,
  };
})();
