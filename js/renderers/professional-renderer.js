(function () {
  window.OficiosApp = window.OficiosApp || {};

  window.OficiosApp.renderProfessionals = function (profiles, target) {
    if (!target) return;
    const helpers = window.OficiosApp.renderHelpers;

    target.innerHTML = profiles
      .map((profile) => {
        const statusClass = helpers.getStatusClass(profile);
        const displayName = helpers.escapeHtml(profile.user.displayName);
        const profileTitle = helpers.escapeHtml(profile.publicProfile.title);

        return `
          <article class="professional-card ${statusClass === "premium" ? "premium-card" : ""}">
            ${helpers.renderPhoto(profile, "professional-photo", `${profile.user.displayName}, ${profile.publicProfile.title}`)}
            <div class="professional-body">
              <div class="professional-meta">
                <span class="status ${statusClass}">${helpers.escapeHtml(profile.statusLabel)}</span>
                <span class="zone">${helpers.escapeHtml(profile.professional.serviceArea)}</span>
              </div>
              <h3>${displayName}</h3>
              <p class="profession-line">${profileTitle}</p>
              <p class="trust-label">Registrado en OFICIOS APP</p>
              <div class="professional-actions">
                <a class="button secondary" href="${helpers.getProfessionalUrl(profile)}">Ver perfil</a>
                ${helpers.renderWhatsapp(profile)}
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  };
})();
