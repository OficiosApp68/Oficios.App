(function () {
  window.OficiosApp = window.OficiosApp || {};

  function renderGallery(items, helpers) {
    return items
      .map((item) => {
        const src = helpers.getSafeImageUrl(item.src);
        return src ? `<img src="${helpers.escapeHtml(src)}" alt="${helpers.escapeHtml(item.alt)}" />` : "";
      })
      .join("");
  }

  function renderReviews(items, helpers) {
    return items
      .map(
        (review) => `
          <blockquote>
            "${helpers.escapeHtml(review.text)}"
            <cite>${helpers.escapeHtml(review.author)}</cite>
          </blockquote>
        `
      )
      .join("");
  }

  window.OficiosApp.renderProfileDetail = function (profile, target) {
    if (!target || !profile) return;
    const helpers = window.OficiosApp.renderHelpers;

    const statusClass = helpers.getStatusClass(profile);
    const gallery = profile.publicProfile.gallery.length ? renderGallery(profile.publicProfile.gallery, helpers) : "";
    const reviews = profile.publicProfile.reviews.length ? renderReviews(profile.publicProfile.reviews, helpers) : "";
    const rating = profile.publicProfile.hasRating
      ? `<div class="rating" aria-label="Calificacion">${helpers.escapeHtml(profile.publicProfile.ratingLabel)} / 5</div>`
      : "";

    target.innerHTML = `
      <div class="profile-hero">
        ${helpers.renderPhoto(profile, "profile-photo", `${profile.user.displayName} trabajando`)}
      </div>
      <div class="profile-info">
        <span class="status ${statusClass}">${helpers.escapeHtml(profile.statusLabel)}</span>
        <h3>${helpers.escapeHtml(profile.user.displayName)}</h3>
        <p class="profession-line">${helpers.escapeHtml(profile.publicProfile.title)} - ${helpers.escapeHtml(profile.professional.serviceArea)}</p>
        <p>${helpers.escapeHtml(profile.publicProfile.longDescription)}</p>
        ${rating}
        <div class="tag-list" aria-label="Especialidades">
          ${profile.publicProfile.specialties.map((specialty) => `<span>${helpers.escapeHtml(specialty)}</span>`).join("")}
        </div>
        <div class="coverage">
          <strong>Zona de cobertura:</strong>
          ${helpers.escapeHtml(profile.professional.coverage)}
        </div>
        ${helpers.renderWhatsapp(profile)}
      </div>
      ${gallery ? `<div class="work-gallery" aria-label="Galeria de trabajos">${gallery}</div>` : ""}
      ${reviews ? `<div class="reviews"><h4>Opiniones</h4>${reviews}</div>` : ""}
    `;
  };
})();
