(function () {
  const app = window.OficiosApp;
  const params = new URLSearchParams(window.location.search);
  const professionalId = params.get("id");

  function updatePageMeta(profileModel) {
    if (!profileModel) {
      document.title = "Perfil no encontrado | OFICIOS APP";
      return;
    }

    document.title = `${profileModel.user.displayName} | ${profileModel.publicProfile.title} | OFICIOS APP`;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) return;

    const description = profileModel.publicProfile.hasSummary
      ? profileModel.publicProfile.summary
      : `${profileModel.user.displayName} - ${profileModel.publicProfile.title} en ${profileModel.professional.serviceArea}.`;
    metaDescription.setAttribute("content", description);
  }

  function renderProfile(profile) {
    updatePageMeta(profile);
    app.renderProfessionalDetailPage(profile, document.querySelector("[data-professional-page]"));
    initReviewForm(profile);
  }

  function getReviewerRegistrationUrl(profileId) {
    return `registro-valoracion.html?profile=${encodeURIComponent(profileId)}`;
  }

  function renderReviewAccess(content) {
    const target = document.querySelector("[data-review-access]");
    if (target) target.innerHTML = content;
  }

  function setReviewMessage(text, type) {
    const message = document.querySelector("[data-review-message]");
    if (!message) return;
    message.textContent = text;
    message.className = `form-message review-form-message ${type || ""}`.trim();
  }

  function getReviewErrorMessage(error) {
    const text = `${error?.code || ""} ${error?.message || ""}`;
    if (/Ya enviaste/i.test(text)) return "Ya enviaste una valoracion para este perfil.";
    if (/todavia no esta aprobada/i.test(text)) return "Tu cuenta de evaluador todavia no fue aprobada.";
    if (/no esta disponible/i.test(text)) return "Este perfil no esta disponible para valorar.";
    return "No pudimos enviar la valoracion. Revisa la conexion e intenta nuevamente.";
  }

  function renderApprovedReviewForm(profile) {
    renderReviewAccess(`
      <form class="review-form" data-review-form novalidate>
        <fieldset class="review-stars-field">
          <legend>Elegir puntaje</legend>
          <div class="star-rating" role="radiogroup" aria-label="Selecciona de 1 a 5 estrellas">
            <input id="review-rating-5" name="rating" type="radio" value="5" required />
            <label for="review-rating-5" title="5 estrellas" aria-label="5 estrellas">&#9733;</label>
            <input id="review-rating-4" name="rating" type="radio" value="4" />
            <label for="review-rating-4" title="4 estrellas" aria-label="4 estrellas">&#9733;</label>
            <input id="review-rating-3" name="rating" type="radio" value="3" />
            <label for="review-rating-3" title="3 estrellas" aria-label="3 estrellas">&#9733;</label>
            <input id="review-rating-2" name="rating" type="radio" value="2" />
            <label for="review-rating-2" title="2 estrellas" aria-label="2 estrellas">&#9733;</label>
            <input id="review-rating-1" name="rating" type="radio" value="1" />
            <label for="review-rating-1" title="1 estrella" aria-label="1 estrella">&#9733;</label>
          </div>
        </fieldset>
        <label class="review-confirmation">
          <input name="confirmedExperience" type="checkbox" required />
          <span>Confirmo que tuve una experiencia real con este oficio o emprendimiento.</span>
        </label>
        <p class="form-message review-form-message" data-review-message role="status" aria-live="polite"></p>
        <div class="form-actions">
          <button class="button primary" type="submit" data-review-submit>Enviar estrellas</button>
        </div>
      </form>
    `);

    const form = document.querySelector("[data-review-form]");
    const submitButton = form?.querySelector("[data-review-submit]");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const rating = Number(formData.get("rating"));
      if (!rating) {
        setReviewMessage("Selecciona una calificacion de 1 a 5 estrellas.", "error");
        return;
      }
      if (formData.get("confirmedExperience") !== "on") {
        setReviewMessage("Confirma que tuviste una experiencia real.", "error");
        return;
      }

      submitButton.disabled = true;
      setReviewMessage("Enviando valoracion...", "");
      try {
        await app.supabaseService.submitProfileReview({ profileId: profile.id, rating });
        form.reset();
        setReviewMessage("Valoracion enviada. Queda pendiente de aprobacion antes de sumarse al promedio.", "success");
      } catch (error) {
        setReviewMessage(getReviewErrorMessage(error), "error");
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  async function initReviewForm(profile) {
    if (!document.querySelector("[data-review-access]") || !profile || profile.canEditOwnProfile) return;

    try {
      const session = await app.authService?.getSession();
      if (!session) {
        const next = encodeURIComponent(`profesional.html?id=${profile.id}#calificar`);
        renderReviewAccess(`
          <div class="form-actions">
            <a class="button primary" href="${getReviewerRegistrationUrl(profile.id)}">Registrarme para valorar</a>
            <a class="button secondary" href="login.html?next=${next}">Ya tengo una cuenta</a>
          </div>
        `);
        return;
      }

      const account = await app.supabaseService.getCurrentReviewerAccount();
      if (!account) {
        renderReviewAccess(`
          <p>Tu email ya esta confirmado. Falta solicitar la aprobacion de tu cuenta de evaluador.</p>
          <a class="button primary" href="${getReviewerRegistrationUrl(profile.id)}">Completar registro</a>
        `);
        return;
      }

      if (account.status === "pending") {
        renderReviewAccess('<p class="form-message success">Tu cuenta esta pendiente de aprobacion. Cuando sea aprobada vas a poder valorar.</p>');
        return;
      }

      if (account.status === "rejected") {
        renderReviewAccess(`
          <p class="form-message error">La cuenta no fue aprobada. Podes revisar tus datos y enviarla nuevamente.</p>
          <a class="button secondary" href="${getReviewerRegistrationUrl(profile.id)}">Revisar registro</a>
        `);
        return;
      }

      renderApprovedReviewForm(profile);
    } catch (_) {
      renderReviewAccess('<p class="form-message error">No pudimos comprobar tu cuenta. Actualiza la pagina e intenta nuevamente.</p>');
    }
  }

  async function markOwnProfile(profile) {
    if (!profile || profile.source !== "supabase" || !app.authService) {
      return profile;
    }

    try {
      const session = await app.authService.getSession();
      const sessionUserId = session && session.user ? session.user.id : "";
      profile.canEditOwnProfile = Boolean(sessionUserId && profile.user.id === sessionUserId);
    } catch (error) {
      profile.canEditOwnProfile = false;
    }

    return profile;
  }

  async function initProfessionalPage() {
    app.initSessionStatus();

    if (!professionalId) {
      renderProfile(null);
      return;
    }

    if (!app.supabaseService) {
      renderProfile(null);
      return;
    }

    try {
      const onlineProfile = await app.supabaseService.getProfessionalProfileById(professionalId);
      renderProfile(await markOwnProfile(onlineProfile));
    } catch (error) {
      renderProfile(null);
    }
  }

  initProfessionalPage();
})();
