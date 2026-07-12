(function () {
  window.OficiosApp = window.OficiosApp || {};

  function renderGallery(items) {
    return items.map((item) => `<img src="${item.src}" alt="${item.alt}" />`).join("");
  }

  function renderReviews(items) {
    return items
      .map(
        (review) => `
          <blockquote>
            "${review.text}"
            <cite>${review.author}</cite>
          </blockquote>
        `
      )
      .join("");
  }

  window.OficiosApp.renderProfileDetail = function (profile, target) {
    if (!target || !profile) return;
    const helpers = window.OficiosApp.renderHelpers;

    const statusClass = helpers.getStatusClass(profile);
    const gallery = profile.publicProfile.gallery.length
      ? renderGallery(profile.publicProfile.gallery)
      : '<p class="empty-state">Galeria preparada para futuras fotos de trabajos realizados.</p>';
    const reviews = profile.publicProfile.reviews.length
      ? renderReviews(profile.publicProfile.reviews)
      : '<p class="empty-state">Opiniones preparadas para futuras calificaciones.</p>';

    target.innerHTML = `
      <div class="profile-hero">
        ${helpers.renderPhoto(profile, "profile-photo", `${profile.user.displayName} trabajando`)}
      </div>
      <div class="profile-info">
        <span class="status ${statusClass}">${profile.statusLabel}</span>
        <h3>${profile.user.displayName}</h3>
        <p class="profession-line">${profile.publicProfile.title} - ${profile.professional.serviceArea}</p>
        <p>${profile.publicProfile.longDescription}</p>
        <div class="rating" aria-label="Calificacion simulada">5/5 <strong>${profile.publicProfile.ratingLabel}</strong></div>
        <div class="tag-list" aria-label="Especialidades">
          ${profile.publicProfile.specialties.map((specialty) => `<span>${specialty}</span>`).join("")}
        </div>
        <div class="coverage">
          <strong>Zona de cobertura:</strong>
          ${profile.professional.coverage}
        </div>
        ${helpers.renderWhatsapp(profile)}
      </div>
      <div class="work-gallery" aria-label="Galeria de trabajos">${gallery}</div>
      <div class="reviews">
        <h4>Opiniones</h4>
        ${reviews}
      </div>
    `;
  };
})();
