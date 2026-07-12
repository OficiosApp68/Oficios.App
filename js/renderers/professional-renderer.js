(function () {
  window.OficiosApp = window.OficiosApp || {};

  window.OficiosApp.renderProfessionals = function (profiles, target) {
    if (!target) return;
    const helpers = window.OficiosApp.renderHelpers;

    target.innerHTML = profiles
      .map((profile) => {
        const statusClass = helpers.getStatusClass(profile);

        return `
          <article class="professional-card ${statusClass === "premium" ? "premium-card" : ""}">
            ${helpers.renderPhoto(profile, "professional-photo", `${profile.user.displayName}, ${profile.publicProfile.title}`)}
            <div class="professional-body">
              <div class="professional-meta">
                <span class="status ${statusClass}">${profile.statusLabel}</span>
                <span class="zone">${profile.professional.serviceArea}</span>
              </div>
              <h3>${profile.user.displayName}</h3>
              <p class="profession-line">${profile.publicProfile.title}</p>
              <p>${profile.publicProfile.summary}</p>
              ${helpers.renderWhatsapp(profile)}
            </div>
          </article>
        `;
      })
      .join("");
  };
})();
