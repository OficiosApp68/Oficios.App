(function () {
  const app = window.OficiosApp || {};
  const form = document.querySelector("[data-register-form]");
  const accountFields = document.querySelector("[data-account-fields]");
  const authDivider = document.querySelector("[data-auth-divider]");
  const googleButton = document.querySelector("[data-google-register]");
  const sessionNote = document.querySelector("[data-auth-session-note]");
  const message = document.querySelector("[data-form-message]");

  function setMessage(text, type) {
    if (!message) {
      return;
    }

    message.textContent = text;
    message.className = `form-message ${type || ""}`.trim();
  }

  function getTrimmedValue(formData, fieldName) {
    return String(formData.get(fieldName) || "").trim();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setAccountFieldsVisible(isVisible) {
    if (accountFields) {
      accountFields.classList.toggle("is-hidden", !isVisible);
      accountFields.querySelectorAll("input").forEach((input) => {
        input.disabled = !isVisible;
      });
    }

    if (authDivider) {
      authDivider.classList.toggle("is-hidden", !isVisible);
    }
  }

  function setSessionNote(session) {
    if (!sessionNote) {
      return;
    }

    const email = session && session.user ? session.user.email : "";

    if (!email) {
      sessionNote.textContent = "";
      sessionNote.className = "form-message auth-session-note";
      return;
    }

    sessionNote.textContent = `Sesion iniciada como ${email}. Completa tus datos profesionales para publicar el perfil.`;
    sessionNote.className = "form-message auth-session-note success";
  }

  function validateProfile(profile, hasSession) {
    if (!hasSession) {
      if (!isValidEmail(profile.email)) {
        return "Escribi un email valido.";
      }

      if (profile.password.length < 6) {
        return "La contrasena debe tener al menos 6 caracteres.";
      }

      if (profile.password !== profile.passwordConfirmation) {
        return "Las contrasenas no coinciden.";
      }
    }

    const requiredFields = [
      ["name", "Completa tu nombre."],
      ["occupation", "Completa tu oficio."],
      ["phone", "Completa tu telefono."],
      ["zone", "Completa tu zona de trabajo."],
      ["description", "Completa una descripcion breve."]
    ];

    return requiredFields.find(([fieldName]) => !profile[fieldName])?.[1] || "";
  }

  async function getCurrentSession() {
    if (!app.authService) {
      return null;
    }

    try {
      return await app.authService.getSession();
    } catch (error) {
      return null;
    }
  }

  async function refreshSessionState() {
    const session = await getCurrentSession();

    setAccountFieldsVisible(!session);
    setSessionNote(session);

    return session;
  }

  async function handleGoogleRegister() {
    if (!app.authService) {
      setMessage("El registro con Google todavia no esta disponible.", "error");
      return;
    }

    googleButton.disabled = true;
    setMessage("Abriendo Google para continuar...", "");

    try {
      await app.authService.signInWithGoogle("registro.html");
    } catch (error) {
      googleButton.disabled = false;
      setMessage("No pudimos abrir Google. Revisa la configuracion e intentalo nuevamente.", "error");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const currentSession = await getCurrentSession();
    const profile = {
      email: getTrimmedValue(formData, "email"),
      password: String(formData.get("password") || ""),
      passwordConfirmation: String(formData.get("passwordConfirmation") || ""),
      name: getTrimmedValue(formData, "name"),
      occupation: getTrimmedValue(formData, "occupation"),
      phone: getTrimmedValue(formData, "phone"),
      zone: getTrimmedValue(formData, "zone"),
      description: getTrimmedValue(formData, "description"),
      savedAt: new Date().toISOString()
    };
    const validationMessage = validateProfile(profile, Boolean(currentSession));

    if (validationMessage) {
      setMessage(validationMessage, "error");
      return;
    }

    submitButton.disabled = true;
    setMessage(currentSession ? "Guardando perfil..." : "Creando cuenta y guardando perfil...", "");

    try {
      let session = currentSession;

      if (!session) {
        const authData = await app.authService.signUp(profile.email, profile.password);
        session = authData.session;
      }

      if (!session) {
        setMessage(
          "Cuenta creada. Supabase pide confirmar el email antes de guardar el perfil. Revisa tu correo y despues inicia sesion.",
          "success"
        );
        message.insertAdjacentHTML("beforeend", ' <a class="inline-link" href="login.html">Ir a iniciar sesion</a>');
        return;
      }

      const userId = session.user ? session.user.id : "";
      const savedProfile = await app.supabaseService.createProfessionalProfile({
        ...profile,
        userId,
      });

      setMessage("Cuenta creada y sesion iniciada. Tu perfil ya esta publicado en el directorio.", "success");
      form.reset();
      setAccountFieldsVisible(false);
      setSessionNote(session);

      const profileUrl = `profesional.html?id=${encodeURIComponent(savedProfile.id)}`;
      message.insertAdjacentHTML(
        "beforeend",
        ` <a class="inline-link" href="index.html#profesionales">Ver directorio</a> · <a class="inline-link" href="${profileUrl}">Abrir ficha</a>`
      );
    } catch (error) {
      setMessage("No pudimos guardar el perfil. Revisa la conexion e intentalo nuevamente.", "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  if (form) {
    form.addEventListener("submit", handleSubmit);
    refreshSessionState();
  }

  if (googleButton) {
    googleButton.addEventListener("click", handleGoogleRegister);
  }

  if (app.initSessionStatus) {
    app.initSessionStatus();
  }
})();
