(function () {
  const app = window.OficiosApp || {};
  const statusSelect = document.querySelector("[data-moderation-status]");
  const refreshButton = document.querySelector("[data-refresh-moderation]");
  const list = document.querySelector("[data-moderation-list]");
  const message = document.querySelector("[data-moderation-message]");

  const statusCopy = {
    approved: "aprobados",
    pending: "pendientes",
    rejected: "rechazados",
  };

  function setMessage(text, type) {
    if (!message) return;

    message.textContent = text;
    message.className = `form-message ${type || ""}`.trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderPhoto(profile) {
    if (profile.publicProfile.hasPhoto) {
      return `<img src="${escapeHtml(profile.publicProfile.photo)}" alt="Foto de ${escapeHtml(profile.user.displayName)}" />`;
    }

    return '<div class="photo-placeholder moderation-photo-placeholder">OA</div>';
  }

  function renderEmpty(status) {
    if (!list) return;

    list.innerHTML = `
      <article class="moderation-empty">
        <h2>No hay perfiles ${statusCopy[status] || "para revisar"}.</h2>
        <p>Cuando una persona complete su perfil, va a aparecer aca antes de publicarse.</p>
      </article>
    `;
  }

  function renderProfiles(profiles, status) {
    if (!list) return;

    if (!profiles.length) {
      renderEmpty(status);
      return;
    }

    list.innerHTML = profiles
      .map(
        (profile) => `
          <article class="moderation-card" data-profile-id="${escapeHtml(profile.id)}">
            <div class="moderation-photo">
              ${renderPhoto(profile)}
            </div>
            <div class="moderation-content">
              <div class="professional-meta">
                <span class="status ${escapeHtml(profile.moderationStatus)}">${escapeHtml(profile.moderationLabel)}</span>
                <span class="zone">${escapeHtml(profile.professional.serviceArea)}</span>
              </div>
              <h2>${escapeHtml(profile.user.displayName)}</h2>
              <p class="profession-line">${escapeHtml(profile.publicProfile.title)}</p>
              <p>${escapeHtml(profile.publicProfile.summary)}</p>
              <dl class="moderation-details">
                <div>
                  <dt>Telefono</dt>
                  <dd>${escapeHtml(profile.user.phone || "Sin telefono")}</dd>
                </div>
                <div>
                  <dt>Zona</dt>
                  <dd>${escapeHtml(profile.professional.serviceArea || "Sin zona")}</dd>
                </div>
              </dl>
              <div class="form-actions moderation-card-actions">
                ${
                  profile.moderationStatus !== "approved"
                    ? '<button class="button primary" type="button" data-moderation-action="approve">Aprobar</button>'
                    : ""
                }
                ${
                  profile.moderationStatus !== "rejected"
                    ? '<button class="button danger" type="button" data-moderation-action="reject">Rechazar</button>'
                    : ""
                }
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  async function loadProfiles() {
    if (!app.authService || !app.supabaseService) {
      setMessage("No pudimos cargar la conexion con Supabase.", "error");
      renderEmpty("pending");
      return;
    }

    const session = await app.authService.getSession();

    if (!session) {
      setMessage("Inicia sesion con la cuenta administradora para revisar perfiles.", "error");
      if (list) {
        list.innerHTML = `
          <article class="moderation-empty">
            <h2>Necesitas iniciar sesion.</h2>
            <p>Esta pantalla es solo para administrar perfiles.</p>
            <a class="button primary" href="login.html">Iniciar sesion</a>
          </article>
        `;
      }
      return;
    }

    const status = statusSelect ? statusSelect.value : "pending";
    setMessage("Cargando perfiles...", "");

    try {
      const profiles = await app.supabaseService.getModerationProfiles(status);
      renderProfiles(profiles, status);
      setMessage(`${profiles.length} perfil(es) ${statusCopy[status] || "cargados"}.`, "success");
    } catch (error) {
      setMessage("No pudimos cargar la moderacion. Revisa que tu usuario este como administrador en Supabase.", "error");
      renderEmpty(status);
    }
  }

  async function updateProfile(profileId, action) {
    const isApproval = action === "approve";
    setMessage(isApproval ? "Aprobando perfil..." : "Rechazando perfil...", "");

    try {
      if (isApproval) {
        await app.supabaseService.approveProfessionalProfile(profileId);
      } else {
        await app.supabaseService.rejectProfessionalProfile(profileId);
      }

      setMessage(isApproval ? "Perfil aprobado. Ya puede aparecer en el directorio." : "Perfil rechazado. No aparecera publico.", "success");
      await loadProfiles();
    } catch (error) {
      setMessage("No pudimos actualizar el perfil. Revisa permisos o intenta nuevamente.", "error");
    }
  }

  if (app.initSessionStatus) {
    app.initSessionStatus();
  }

  if (statusSelect) {
    statusSelect.addEventListener("change", loadProfiles);
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", loadProfiles);
  }

  if (list) {
    list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-moderation-action]");
      const card = event.target.closest("[data-profile-id]");

      if (!button || !card) return;

      updateProfile(card.dataset.profileId, button.dataset.moderationAction);
    });
  }

  loadProfiles().catch(() => {
    setMessage("No pudimos iniciar la moderacion.", "error");
  });
})();
