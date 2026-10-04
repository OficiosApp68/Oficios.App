(function () {
  const app = window.OficiosApp || {};
  const statusSelect = document.querySelector("[data-review-moderation-status]");
  const refreshButton = document.querySelector("[data-refresh-reviews]");
  const list = document.querySelector("[data-review-moderation-list]");
  const message = document.querySelector("[data-review-moderation-message]");
  const accountStatusSelect = document.querySelector("[data-reviewer-account-status]");
  const accountRefreshButton = document.querySelector("[data-refresh-reviewer-accounts]");
  const accountList = document.querySelector("[data-reviewer-account-list]");
  const accountMessage = document.querySelector("[data-reviewer-account-moderation-message]");
  const statusCopy = { pending: "pendientes", approved: "aprobadas", rejected: "rechazadas" };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setMessage(text, type) {
    if (!message) return;
    message.textContent = text;
    message.className = `form-message ${type || ""}`.trim();
  }

  function setAccountMessage(text, type) {
    if (!accountMessage) return;
    accountMessage.textContent = text;
    accountMessage.className = `form-message ${type || ""}`.trim();
  }

  function renderAccountEmpty(status) {
    if (!accountList) return;
    accountList.innerHTML = `
      <article class="moderation-empty">
        <h2>No hay cuentas ${statusCopy[status] || "para revisar"}.</h2>
        <p>Las cuentas aparecen aca despues de que la persona confirma su correo y envia el registro.</p>
      </article>
    `;
  }

  function renderAccounts(accounts, status) {
    if (!accountList) return;
    if (!accounts.length) {
      renderAccountEmpty(status);
      return;
    }

    accountList.innerHTML = accounts.map((account) => `
      <article class="moderation-card reviewer-account-card" data-reviewer-user-id="${escapeHtml(account.userId)}">
        <div class="moderation-content">
          <div class="professional-meta">
            <span class="status ${escapeHtml(account.status)}">${escapeHtml(statusCopy[account.status] || account.status)}</span>
            <span class="zone">Correo confirmado</span>
          </div>
          <h2>${escapeHtml(account.displayName)}</h2>
          <p>Cuenta privada para dejar valoraciones con estrellas.</p>
          <div class="form-actions moderation-card-actions">
            ${account.status !== "approved" ? '<button class="button primary" type="button" data-reviewer-action="approve">Aprobar cuenta</button>' : ""}
            ${account.status !== "rejected" ? '<button class="button danger" type="button" data-reviewer-action="reject">Rechazar cuenta</button>' : ""}
          </div>
        </div>
      </article>
    `).join("");
  }

  function renderEmpty(status) {
    if (!list) return;
    list.innerHTML = `
      <article class="moderation-empty">
        <h2>No hay valoraciones ${statusCopy[status] || "para revisar"}.</h2>
        <p>Los puntajes aparecen aca despues de que una cuenta aprobada los envia.</p>
      </article>
    `;
  }

  function renderReviews(reviews, status) {
    if (!list) return;
    if (!reviews.length) {
      renderEmpty(status);
      return;
    }

    list.innerHTML = reviews
      .map(
        (review) => `
          <article class="moderation-card review-moderation-card" data-review-id="${escapeHtml(review.id)}">
            <div class="review-moderation-score" aria-label="${escapeHtml(String(review.rating))} de 5 estrellas">
              <strong>${escapeHtml(String(review.rating))}</strong>
              <span aria-hidden="true">&#9733;</span>
              <small>de 5</small>
            </div>
            <div class="moderation-content">
              <div class="professional-meta">
                <span class="status ${escapeHtml(review.status)}">${escapeHtml(statusCopy[review.status] || review.status)}</span>
                <span class="zone">Email confirmado</span>
              </div>
              <h2>${escapeHtml(review.profileName)}</h2>
              <p class="profession-line">${escapeHtml(review.profileOccupation)}</p>
              <p><strong>Evaluador:</strong> ${escapeHtml(review.reviewerName)}</p>
              <div class="form-actions moderation-card-actions">
                ${review.status !== "approved" ? '<button class="button primary" type="button" data-review-action="approve">Aprobar</button>' : ""}
                ${review.status !== "rejected" ? '<button class="button danger" type="button" data-review-action="reject">Rechazar</button>' : ""}
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  async function loadReviews() {
    if (!app.authService || !app.supabaseService) {
      setMessage("No pudimos cargar la conexion con Supabase.", "error");
      return;
    }

    const session = await app.authService.getSession();
    if (!session) {
      setMessage("Inicia sesion con la cuenta administradora para revisar valoraciones.", "error");
      renderEmpty("pending");
      return;
    }

    const status = statusSelect?.value || "pending";
    setMessage("Cargando valoraciones...", "");
    try {
      const reviews = await app.supabaseService.getModerationReviews(status);
      renderReviews(reviews, status);
      setMessage(`${reviews.length} valoracion(es) ${statusCopy[status] || "cargadas"}.`, "success");
    } catch (_) {
      setMessage("No pudimos cargar las valoraciones. Revisa la configuracion o intenta nuevamente.", "error");
      renderEmpty(status);
    }
  }

  async function loadAccounts() {
    if (!app.authService || !app.supabaseService) {
      setAccountMessage("No pudimos cargar la conexion con Supabase.", "error");
      return;
    }

    const session = await app.authService.getSession();
    if (!session) {
      setAccountMessage("Inicia sesion con la cuenta administradora para revisar evaluadores.", "error");
      renderAccountEmpty("pending");
      return;
    }

    const status = accountStatusSelect?.value || "pending";
    setAccountMessage("Cargando cuentas...", "");
    try {
      const accounts = await app.supabaseService.getModerationReviewerAccounts(status);
      renderAccounts(accounts, status);
      setAccountMessage(`${accounts.length} cuenta(s) ${statusCopy[status] || "cargadas"}.`, "success");
    } catch (_) {
      setAccountMessage("No pudimos cargar las cuentas. Revisa la configuracion o intenta nuevamente.", "error");
      renderAccountEmpty(status);
    }
  }

  async function updateAccount(userId, action) {
    const card = accountList?.querySelector(`[data-reviewer-user-id="${userId}"]`);
    const buttons = card ? Array.from(card.querySelectorAll("[data-reviewer-action]")) : [];
    buttons.forEach((button) => { button.disabled = true; });
    setAccountMessage(action === "approve" ? "Aprobando cuenta..." : "Rechazando cuenta...", "");

    try {
      if (action === "approve") await app.supabaseService.approveReviewerAccount(userId);
      else await app.supabaseService.rejectReviewerAccount(userId);
      await loadAccounts();
    } catch (error) {
      setAccountMessage(error?.message || "No pudimos actualizar la cuenta.", "error");
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  async function updateReview(reviewId, action) {
    const card = list?.querySelector(`[data-review-id="${reviewId}"]`);
    const buttons = card ? Array.from(card.querySelectorAll("[data-review-action]")) : [];
    buttons.forEach((button) => { button.disabled = true; });
    setMessage(action === "approve" ? "Aprobando valoracion..." : "Rechazando valoracion...", "");

    try {
      if (action === "approve") await app.supabaseService.approveProfileReview(reviewId);
      else await app.supabaseService.rejectProfileReview(reviewId);
      await loadReviews();
    } catch (error) {
      setMessage(error?.message || "No pudimos actualizar la valoracion.", "error");
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  if (app.initSessionStatus) app.initSessionStatus();
  statusSelect?.addEventListener("change", loadReviews);
  refreshButton?.addEventListener("click", loadReviews);
  accountStatusSelect?.addEventListener("change", loadAccounts);
  accountRefreshButton?.addEventListener("click", loadAccounts);
  list?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-review-action]");
    const card = event.target.closest("[data-review-id]");
    if (button && card) updateReview(card.dataset.reviewId, button.dataset.reviewAction);
  });
  accountList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-reviewer-action]");
    const card = event.target.closest("[data-reviewer-user-id]");
    if (button && card) updateAccount(card.dataset.reviewerUserId, button.dataset.reviewerAction);
  });
  loadAccounts().catch(() => setAccountMessage("No pudimos iniciar la moderacion de cuentas.", "error"));
  loadReviews().catch(() => setMessage("No pudimos iniciar la moderacion de valoraciones.", "error"));
})();
