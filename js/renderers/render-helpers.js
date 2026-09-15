(function () {
  window.OficiosApp = window.OficiosApp || {};

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getSafeImageUrl(value) {
    try {
      const url = new URL(String(value || ""), window.location.href);
      return url.protocol === "https:" || url.origin === window.location.origin ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function getStatusClass(profile) {
    if (profile.moderationStatus === "pending") return "pending";
    if (profile.moderationStatus === "rejected") return "rejected";
    return profile.statusLabel === "Premium" ? "premium" : "free";
  }

  function renderPhoto(profile, className, altText) {
    const photoUrl = getSafeImageUrl(profile.publicProfile.photo);
    const safeAltText = escapeHtml(altText);

    if (!profile.publicProfile.hasPhoto || !photoUrl) {
      return `<div class="${className} photo-placeholder" role="img" aria-label="${safeAltText}">OA</div>`;
    }

    return `<img src="${escapeHtml(photoUrl)}" alt="${safeAltText}" />`;
  }

  function renderWhatsapp(profile) {
    if (!profile.canContactByWhatsapp) {
      return '<span class="button whatsapp contact-disabled" aria-disabled="true">WhatsApp no disponible</span>';
    }

    const message = `Hola ${profile.user.displayName}, vengo de OFICIOS APP y quiero consultarte por un presupuesto.`;
    const separator = profile.publicProfile.whatsapp.includes("?") ? "&" : "?";
    const whatsappUrl = `${profile.publicProfile.whatsapp}${separator}text=${encodeURIComponent(message)}`;

    return `
      <a class="button whatsapp" href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noreferrer">
        WhatsApp
      </a>
    `;
  }

  function renderPhone(profile) {
    if (!profile.canContactByPhone) return "";
    const phoneHref = profile.user.phone.replace(/[^\d+]/g, "");

    return `
      <a class="button secondary" href="tel:${escapeHtml(phoneHref)}" aria-label="Llamar a ${escapeHtml(profile.user.displayName)}">
        ${escapeHtml(profile.user.phone)}
      </a>
    `;
  }

  function getProfessionalUrl(profile) {
    return `profesional.html?id=${encodeURIComponent(profile.id)}`;
  }

  window.OficiosApp.renderHelpers = {
    getStatusClass,
    getProfessionalUrl,
    escapeHtml,
    getSafeImageUrl,
    renderPhoto,
    renderPhone,
    renderWhatsapp,
  };
})();
