(function () {
  window.OficiosApp = window.OficiosApp || {};

  function renderDetailList(profile) {
    const items = [
      profile.professional.hasServiceArea ? ["Zona de trabajo", profile.professional.serviceArea] : null,
      profile.professional.hasCoverage ? ["Cobertura", profile.professional.coverage] : null,
      profile.professional.hasExperience ? ["Experiencia", profile.professional.experience] : null,
      profile.professional.hasWorkingHours ? ["Horarios", profile.professional.workingHours] : null,
      profile.canContactByPhone ? ["Telefono", profile.user.phone] : null,
    ].filter(Boolean);

    if (!items.length) return "";

    return `
      <dl class="detail-list">
        ${items.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
      </dl>
    `;
  }

  function renderTrades(profile) {
    const validTrades = profile.trades.filter((trade) => trade !== "Sin categoria");

    if (!validTrades.length && profile.primaryTrade === "Sin categoria") {
      return '<p class="empty-state">Oficio pendiente de clasificacion.</p>';
    }

    return `
      <div class="tag-list" aria-label="Oficios">
        ${validTrades.map((trade) => `<span>${trade}</span>`).join("")}
      </div>
    `;
  }

  function renderSpecialties(profile) {
    if (!profile.publicProfile.hasSpecialties) return "";

    return `
      <section class="profile-page-section" aria-labelledby="specialties-title">
        <h2 id="specialties-title">Especialidades</h2>
        <div class="tag-list">
          ${profile.publicProfile.specialties.map((specialty) => `<span>${specialty}</span>`).join("")}
        </div>
      </section>
    `;
  }

  function renderGallery(profile) {
    if (!profile.publicProfile.gallery.length) return "";

    return `
      <section class="profile-page-section" aria-labelledby="gallery-title">
        <h2 id="gallery-title">Trabajos realizados</h2>
        <div class="work-gallery">
          ${profile.publicProfile.gallery.map((item) => `<img src="${item.src}" alt="${item.alt}" />`).join("")}
        </div>
      </section>
    `;
  }

  function renderRating(profile) {
    if (!profile.publicProfile.hasRating) return "";

    return `<div class="rating" aria-label="Calificacion">${profile.publicProfile.ratingLabel} / 5</div>`;
  }

  function renderMissingState(target) {
    target.innerHTML = `
      <main class="profile-page-main">
        <section class="profile-not-found" aria-labelledby="not-found-title">
          <span class="brand-mark">OA</span>
          <h1 id="not-found-title">No encontramos este profesional.</h1>
          <p>El enlace puede estar incompleto o el perfil ya no estar disponible.</p>
          <a class="button primary" href="index.html#profesionales">Volver al directorio</a>
        </section>
      </main>
    `;
  }

  window.OficiosApp.renderProfessionalDetailPage = function (profile, target) {
    if (!target) return;

    if (!profile) {
      renderMissingState(target);
      return;
    }

    const helpers = window.OficiosApp.renderHelpers;
    const statusClass = helpers.getStatusClass(profile);
    const description = profile.publicProfile.hasLongDescription ? `<p>${profile.publicProfile.longDescription}</p>` : "";

    target.innerHTML = `
      <main class="profile-page-main">
        <article class="profile-page-shell">
          <a class="back-link" href="index.html#profesionales">Volver al directorio</a>
          <section class="profile-page-hero" aria-labelledby="profile-title">
            <div class="profile-page-photo">
              ${helpers.renderPhoto(profile, "profile-photo", `${profile.user.displayName}, ${profile.publicProfile.title}`)}
            </div>
            <div class="profile-page-summary">
              <span class="status ${statusClass}">${profile.statusLabel}</span>
              <h1 id="profile-title">${profile.user.displayName}</h1>
              <p class="profession-line">${profile.publicProfile.title}</p>
              <p class="trust-label">Registrado en OFICIOS APP</p>
              ${profile.professional.hasServiceArea ? `<p class="profile-location">${profile.professional.serviceArea}</p>` : ""}
              ${renderRating(profile)}
              ${description}
              ${renderTrades(profile)}
              <div class="profile-contact-actions">
                ${profile.canEditOwnProfile ? '<a class="button secondary" href="mi-perfil.html">Editar mi perfil</a>' : ""}
                ${helpers.renderWhatsapp(profile)}
              </div>
            </div>
          </section>
          <section class="profile-page-section" aria-labelledby="details-title">
            <h2 id="details-title">Informacion profesional</h2>
            ${renderDetailList(profile) || '<p class="empty-state">Informacion profesional pendiente de carga.</p>'}
          </section>
          ${renderSpecialties(profile)}
          ${renderGallery(profile)}
        </article>
      </main>
    `;
  };
})();
