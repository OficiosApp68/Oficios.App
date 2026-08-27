(function () {
  const app = window.OficiosApp || {};
  const form = document.querySelector("[data-register-form]");
  const accountFields = document.querySelector("[data-account-fields]");
  const profileFields = document.querySelector("[data-profile-fields]");
  const authDivider = document.querySelector("[data-auth-divider]");
  const googleButton = document.querySelector("[data-google-register]");
  const sessionNote = document.querySelector("[data-auth-session-note]");
  const message = document.querySelector("[data-form-message]");
  const submitButton = document.querySelector("[data-register-submit]");

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

    if (googleButton) {
      googleButton.parentElement.classList.toggle("is-hidden", !isVisible);
    }
  }

  function setProfileFieldsVisible(isVisible) {
    if (!profileFields) {
      return;
    }

    profileFields.classList.toggle("is-hidden", !isVisible);
    profileFields.querySelectorAll("input, textarea").forEach((field) => {
      field.disabled = !isVisible;
    });
  }

  function setSubmitLabel(hasSession) {
    if (!submitButton) {
      return;
    }

    submitButton.textContent = hasSession ? "Guardar perfil" : "Crear cuenta";
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

    sessionNote.textContent = `Ya hay una sesion iniciada como ${email}. Este formulario va a guardar el perfil de esa cuenta. Si queres probar otro registro, primero cerra sesion.`;
    sessionNote.className = "form-message auth-session-note success";
  }

  function validateAccount(profile) {
    if (!isValidEmail(profile.email)) {
      return "Escribi un email valido.";
    }

    if (profile.password.length < 6) {
      return "La contrasena debe tener al menos 6 caracteres.";
    }

    if (profile.password !== profile.passwordConfirmation) {
      return "Las contrasenas no coinciden.";
    }

    return "";
  }

  function validateProfile(profile) {
    const requiredFields = [
      ["name", "Completa tu nombre."],
      ["occupation", "Completa tu oficio."],
      ["phone", "Completa tu telefono."],
      ["zone", "Completa tu zona de trabajo."],
      ["description", "Completa una descripcion breve."]
    ];

    return requiredFields.find(([fieldName]) => !profile[fieldName])?.[1] || "";
  }

  function validateForm(profile, hasSession) {
    if (!hasSession) {
      return validateAccount(profile);
    }

    return validateProfile(profile);
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
    setProfileFieldsVisible(Boolean(session));
    setSubmitLabel(Boolean(session));
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

    const activeSubmitButton = submitButton || form.querySelector('button[type="submit"]');
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
    const validationMessage = validateForm(profile, Boolean(currentSession));

    if (validationMessage) {
      setMessage(validationMessage, "error");
      return;
    }

    activeSubmitButton.disabled = true;
    setMessage(currentSession ? "Guardando perfil..." : "Creando cuenta...", "");

    try {
      let session = currentSession;

      if (!session) {
        const authData = await app.authService.signUp(profile.email, profile.password);
        session = authData.session;

        if (!session) {
          setMessage(
            "Cuenta creada. Te enviamos un correo para confirmar tu email. Abri ese correo y toca el enlace para volver a OFICIOS APP.",
            "success"
          );
          message.insertAdjacentHTML("beforeend", ' <a class="inline-link" href="login.html">Ir a iniciar sesion</a>');
          form.reset();
          return;
        }

        await refreshSessionState();
        setMessage("Cuenta creada y sesion iniciada. Ahora completa tu perfil profesional.", "success");
        return;
      }

      const userId = session.user ? session.user.id : "";
      await app.supabaseService.createProfessionalProfile({
        ...profile,
        userId,
      });

      setMessage("Perfil enviado correctamente. Queda pendiente de revision antes de aparecer en el directorio.", "success");
      form.reset();
      setAccountFieldsVisible(false);
      setProfileFieldsVisible(true);
      setSessionNote(session);

      message.insertAdjacentHTML(
        "beforeend",
        ' <a class="inline-link" href="index.html#profesionales">Volver al directorio</a>'
      );
    } catch (error) {
      setMessage(currentSession ? "No pudimos guardar el perfil. Revisa la conexion e intentalo nuevamente." : "No pudimos crear la cuenta. Revisa el email e intentalo nuevamente.", "error");
    } finally {
      activeSubmitButton.disabled = false;
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
