(function () {
  const app = window.OficiosApp || {};
  const form = document.querySelector("[data-reviewer-account-form]");
  const accountFields = document.querySelector("[data-reviewer-account-fields]");
  const googleSection = document.querySelector("[data-reviewer-google-section]");
  const authDivider = document.querySelector("[data-reviewer-auth-divider]");
  const googleButton = document.querySelector("[data-google-reviewer-register]");
  const submitButton = document.querySelector("[data-reviewer-account-submit]");
  const message = document.querySelector("[data-reviewer-account-message]");
  const termsCheckbox = document.querySelector("[data-reviewer-terms]");
  const nameInput = document.querySelector("#reviewer-name");
  const captcha = app.createTurnstileCaptcha?.(form);
  const profileId = new URLSearchParams(window.location.search).get("profile") || "";

  function getProfileUrl() {
    return profileId ? `profesional.html?id=${encodeURIComponent(profileId)}#calificar` : "index.html#profesionales";
  }

  function setMessage(text, type) {
    if (!message) return;
    message.textContent = text;
    message.className = `form-message ${type || ""}`.trim();
  }

  function setSignedInState(session) {
    const signedIn = Boolean(session);
    accountFields?.classList.toggle("is-hidden", signedIn);
    accountFields?.querySelectorAll("input").forEach((input) => { input.disabled = signedIn; });
    googleSection?.classList.toggle("is-hidden", signedIn);
    authDivider?.classList.toggle("is-hidden", signedIn);
    captcha?.setVisible(!signedIn);
    if (submitButton) submitButton.textContent = signedIn ? "Enviar para aprobacion" : "Crear cuenta";

    const metadata = session?.user?.user_metadata || {};
    if (signedIn && nameInput && !nameInput.value) {
      nameInput.value = metadata.display_name || metadata.full_name || metadata.name || "";
    }
  }

  function setupPasswordToggles() {
    form?.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
      const input = document.getElementById(toggle.getAttribute("aria-controls"));
      if (!input) return;
      toggle.addEventListener("click", () => {
        const visible = input.type === "password";
        input.type = visible ? "text" : "password";
        const label = visible ? "Ocultar contrasena" : "Mostrar contrasena";
        toggle.setAttribute("aria-label", label);
        toggle.title = label;
        toggle.querySelector("[data-icon-show]").hidden = visible;
        toggle.querySelector("[data-icon-hide]").hidden = !visible;
        input.focus({ preventScroll: true });
      });
    });
  }

  function validateAccount(values, hasSession) {
    if (values.displayName.length < 2) return "Escribi tu nombre.";
    if (!values.termsAccepted) return "Acepta los terminos y la politica de privacidad.";
    if (hasSession) return "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return "Escribi un email valido.";
    if (values.password.length < 6) return "La contrasena debe tener al menos 6 caracteres.";
    if (values.password !== values.passwordConfirmation) return "Las contrasenas no coinciden.";
    return "";
  }

  async function finishReviewerRegistration(values) {
    const status = await app.supabaseService.registerReviewerAccount(values.displayName, values.termsAccepted);
    if (status === "approved") {
      setMessage("Tu cuenta ya esta aprobada. Ya podes volver al perfil y valorar.", "success");
    } else {
      setMessage("Registro enviado. Tu cuenta queda pendiente de aprobacion antes de poder valorar.", "success");
    }
    submitButton.disabled = false;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const session = await app.authService.getSession();
    const formData = new FormData(form);
    const values = {
      displayName: String(formData.get("displayName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || ""),
      passwordConfirmation: String(formData.get("passwordConfirmation") || ""),
      termsAccepted: formData.get("termsAcceptance") === "on",
    };
    const validationMessage = validateAccount(values, Boolean(session));
    if (validationMessage) {
      setMessage(validationMessage, "error");
      return;
    }

    const captchaToken = !session && captcha?.enabled ? captcha.getToken() : "";
    if (!session && captcha?.enabled && !captchaToken) {
      setMessage("Completa la verificacion para crear tu cuenta.", "error");
      return;
    }

    submitButton.disabled = true;
    setMessage(session ? "Enviando registro..." : "Creando cuenta...", "");
    try {
      if (session) {
        await finishReviewerRegistration(values);
        return;
      }

      const redirectPath = `registro-valoracion.html${profileId ? `?profile=${encodeURIComponent(profileId)}` : ""}`;
      const authData = await app.authService.signUp(values.email, values.password, captchaToken, {
        redirectPath,
        data: { account_type: "reviewer", display_name: values.displayName },
      });

      if (!authData.session) {
        setMessage("Cuenta creada. Revisa tu correo, confirma el enlace y despues completa el envio para aprobacion.", "success");
        return;
      }

      setSignedInState(authData.session);
      await finishReviewerRegistration(values);
    } catch (error) {
      const text = `${error?.code || ""} ${error?.message || ""}`;
      setMessage(
        /already|exists|registered/i.test(text)
          ? "Ese email ya tiene una cuenta. Inicia sesion y completa el registro para valorar."
          : "No pudimos completar el registro. Revisa los datos e intenta nuevamente.",
        "error"
      );
    } finally {
      captcha?.reset();
      if (submitButton) submitButton.disabled = false;
    }
  }

  async function handleGoogleRegister() {
    const displayName = String(nameInput?.value || "").trim();
    if (displayName.length < 2) {
      setMessage("Escribi tu nombre antes de continuar con Google.", "error");
      return;
    }
    if (!termsCheckbox?.checked) {
      setMessage("Acepta los terminos y la politica de privacidad.", "error");
      return;
    }

    googleButton.disabled = true;
    setMessage("Abriendo Google para continuar...", "");
    const redirectPath = `registro-valoracion.html${profileId ? `?profile=${encodeURIComponent(profileId)}` : ""}`;
    try {
      await app.authService.signInWithGoogle(redirectPath);
    } catch (_) {
      googleButton.disabled = false;
      setMessage("No pudimos abrir Google. Intenta nuevamente.", "error");
    }
  }

  async function init() {
    document.querySelectorAll("[data-reviewer-return]").forEach((link) => {
      link.href = getProfileUrl();
    });
    setupPasswordToggles();
    const session = await app.authService.getSession();
    setSignedInState(session);

    if (!session) return;
    const account = await app.supabaseService.getCurrentReviewerAccount();
    if (!account) {
      setMessage("Tu correo esta confirmado. Completa el nombre y envia el registro para aprobacion.", "success");
      return;
    }

    if (nameInput) nameInput.value = account.displayName;
    if (account.status === "approved") {
      setMessage("Tu cuenta esta aprobada. Ya podes volver al perfil y valorar.", "success");
      submitButton.textContent = "Actualizar datos";
    } else if (account.status === "pending") {
      setMessage("Tu cuenta esta pendiente de aprobacion.", "success");
    } else {
      setMessage("Tu registro no fue aprobado. Revisa el nombre y podes enviarlo nuevamente.", "error");
    }
  }

  form?.addEventListener("submit", handleSubmit);
  googleButton?.addEventListener("click", handleGoogleRegister);
  init().catch(() => setMessage("No pudimos comprobar tu cuenta. Actualiza la pagina.", "error"));
})();
