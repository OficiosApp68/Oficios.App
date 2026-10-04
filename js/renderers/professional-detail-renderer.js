(function () {
  window.OficiosApp = window.OficiosApp || {};

  function renderDetailList(profile, helpers) {
    const items = [
      profile.professional.hasServiceArea ? ["Zona de trabajo", profile.professional.serviceArea] : null,
      profile.professional.hasCoverage ? ["Cobertura", profile.professional.coverage] : null,
      profile.professional.hasExperience ? ["Experiencia", profile.professional.experience] : null,
      profile.professional.hasWorkingHours ? ["Horarios", profile.professional.workingHours] : null,
    ].filter(Boolean);

    if (!items.length) return "";

    return `
      <dl class="detail-list">
        ${items.map(([label, value]) => `<div><dt>${helpers.escapeHtml(label)}</dt><dd>${helpers.escapeHtml(value)}</dd></div>`).join("")}
      </dl>
    `;
  }

  function renderTrades(profile, helpers) {
    const validTrades = profile.trades.filter((trade) => trade !== "Sin categoria");

    if (!validTrades.length && profile.primaryTrade === "Sin categoria") {
      return '<p class="empty-state">Oficio pendiente de clasificacion.</p>';
    }

    return `
      <div class="tag-list" aria-label="Oficios">
        ${validTrades.map((trade) => `<span>${helpers.escapeHtml(trade)}</span>`).join("")}
      </div>
    `;
  }

  function renderSpecialties(profile, helpers) {
    if (!profile.publicProfile.hasSpecialties) return "";

    return `
      <section class="profile-page-section" aria-labelledby="specialties-title">
        <h2 id="specialties-title">Especialidades</h2>
        <div class="tag-list">
          ${profile.publicProfile.specialties.map((specialty) => `<span>${helpers.escapeHtml(specialty)}</span>`).join("")}
        </div>
      </section>
    `;
  }

  function renderGallery(profile, helpers) {
    if (!profile.publicProfile.gallery.length) return "";

    return `
      <section class="profile-page-section" aria-labelledby="gallery-title">
        <h2 id="gallery-title">Trabajos realizados</h2>
        <div class="work-gallery">
          ${profile.publicProfile.gallery
            .map((item) => {
              const src = helpers.getSafeImageUrl(item.src);
              return src ? `<img src="${helpers.escapeHtml(src)}" alt="${helpers.escapeHtml(item.alt)}" />` : "";
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function renderRating(profile) {
    if (!profile.publicProfile.hasRating) return "";

    const reviewCount = Number(profile.publicProfile.reviewCount) || 0;
    const opinionLabel = reviewCount === 1 ? "1 opinion" : `${reviewCount} opiniones`;
    return `
      <div class="profile-rating-summary" aria-label="Calificacion">
        <span class="rating-stars" aria-hidden="true">&#9733;</span>
        <strong>${window.OficiosApp.renderHelpers.escapeHtml(profile.publicProfile.ratingLabel)} / 5</strong>
        <span>${window.OficiosApp.renderHelpers.escapeHtml(opinionLabel)}</span>
      </div>
    `;
  }

  function renderReviewForm(profile, helpers) {
    if (profile.canEditOwnProfile) {
      return `
        <section class="profile-page-section profile-reputation-note" aria-labelledby="reputation-title">
          <span class="eyebrow">Tu reputacion</span>
          <h2 id="reputation-title">Cada experiencia cuenta</h2>
          <p>
            Una atencion clara, un presupuesto responsable y un buen trabajo pueden convertirse en valoraciones que
            ayuden a otras personas a elegirte. Cada puntaje se revisa antes de incorporarse al promedio.
          </p>
        </section>
      `;
    }

    return `
      <section class="profile-page-section review-invitation" id="calificar" aria-labelledby="review-form-title">
        <div class="review-invitation-copy">
          <span class="eyebrow">Compartir una experiencia</span>
          <h2 id="review-form-title">¿Contrataste a ${helpers.escapeHtml(profile.user.displayName)}?</h2>
          <p>
            Podes dejar de 1 a 5 estrellas. Para cuidar la confiabilidad, necesitas una cuenta confirmada y aprobada.
            Tu nombre y tu email no se publican junto con la valoracion.
          </p>
        </div>
        <div class="review-access-panel" data-review-access>
          <p class="form-message" role="status" aria-live="polite">Comprobando tu cuenta...</p>
        </div>
      </section>
    `;
  }

  function renderMissingState(target) {
    target.innerHTML = `
      <main class="profile-page-main">
        <section class="profile-not-found" aria-labelledby="not-found-title">
          <span class="brand-mark">OA</span>
          <h1 id="not-found-title">No encontramos este perfil.</h1>
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
    const description = profile.publicProfile.hasLongDescription
      ? `<p>${helpers.escapeHtml(profile.publicProfile.longDescription)}</p>`
      : "";

    target.innerHTML = `
      <main class="profile-page-main">
        <article class="profile-page-shell">
          <a class="back-link" href="index.html#profesionales">Volver al directorio</a>
          <section class="profile-page-hero" aria-labelledby="profile-title">
            <div class="profile-page-photo">
              ${helpers.renderPhoto(profile, "profile-photo", `${profile.user.displayName}, ${profile.publicProfile.title}`)}
            </div>
            <div class="profile-page-summary">
              <span class="status ${statusClass}">${helpers.escapeHtml(profile.statusLabel)}</span>
              <h1 id="profile-title">${helpers.escapeHtml(profile.user.displayName)}</h1>
              <p class="profession-line">${helpers.escapeHtml(profile.publicProfile.title)}</p>
              <p class="trust-label">Registrado en OFICIOS APP</p>
              ${profile.professional.hasServiceArea ? `<p class="profile-location">${helpers.escapeHtml(profile.professional.serviceArea)}</p>` : ""}
              ${renderRating(profile)}
              ${description}
              ${renderTrades(profile, helpers)}
              <p class="profile-contact-note">
                OFICIOS APP conecta a las partes y no certifica identidad, experiencia ni calidad del trabajo. Antes de
                contratar, acorda detalles, precio, forma de pago y condiciones directamente con quien publica.
              </p>
              <div class="profile-contact-actions">
                ${profile.canEditOwnProfile ? '<a class="button secondary" href="mi-perfil.html">Editar mi perfil</a>' : ""}
                ${helpers.renderWhatsapp(profile)}
              </div>
            </div>
          </section>
          <section class="profile-page-section" aria-labelledby="details-title">
            <h2 id="details-title">Informacion del perfil</h2>
            ${renderDetailList(profile, helpers) || '<p class="empty-state">Informacion pendiente de carga.</p>'}
          </section>
          ${renderSpecialties(profile, helpers)}
          ${renderGallery(profile, helpers)}
          ${renderReviewForm(profile, helpers)}
        </article>
      </main>
    `;
  };
})();
