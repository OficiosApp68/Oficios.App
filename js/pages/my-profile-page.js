(function () {
  const app = window.OficiosApp || {};
  const form = document.querySelector("[data-my-profile-form]");
  const message = document.querySelector("[data-form-message]");
  const photoInput = document.querySelector("[data-profile-photo-input]");
  const photoPreview = document.querySelector("[data-profile-photo-preview]");
  const previewName = document.querySelector("[data-profile-preview-name]");
  const previewDetail = document.querySelector("[data-profile-preview-detail]");
  const saveAndLogoutButton = document.querySelector("[data-save-and-logout]");
  const termsCheckbox = document.querySelector("[data-profile-terms-acceptance]");
  let currentProfile = null;
  let shouldLogoutAfterSave = false;

  function getSubmitButton() {
    return form ? form.querySelector('button[type="submit"]') : null;
  }

  function setMessage(text, type) {
    if (!message) return;

    message.textContent = text;
    message.className = `form-message ${type || ""}`.trim();
  }

  function getField(name) {
    return form ? form.elements[name] : null;
  }

  function setFieldValue(name, value) {
    const field = getField(name);
    if (field) {
      field.value = value || "";
    }
  }

  function getTrimmedValue(formData, fieldName) {
    return String(formData.get(fieldName) || "").trim();
  }

  function getValidationMessage(profile) {
    if (!profile.termsAccepted) {
      return "Para guardar, confirma que aceptas las condiciones y que los datos son reales.";
    }

    const requiredFields = [
      ["name", "Completa tu nombre."],
      ["occupation", "Completa tu oficio."],
      ["phone", "Completa tu telefono."],
      ["zone", "Completa tu zona de trabajo."],
      ["description", "Completa una descripcion breve."],
    ];

    return requiredFields.find(([fieldName]) => !profile[fieldName])?.[1] || "";
  }

  function renderPhotoPreview(src) {
    if (!photoPreview) return;

    if (!src) {
      photoPreview.classList.add("photo-placeholder");
      photoPreview.removeAttribute("style");
      photoPreview.textContent = "OA";
      return;
    }

    photoPreview.classList.remove("photo-placeholder");
    photoPreview.textContent = "";
    photoPreview.style.backgroundImage = `url("${src}")`;
  }

  function renderPreview(profile) {
    if (previewName) {
      previewName.textContent = profile ? profile.user.displayName : "Tu perfil profesional";
    }

    if (previewDetail) {
      previewDetail.textContent = profile
        ? `${profile.publicProfile.title} - ${profile.professional.serviceArea} - ${profile.moderationLabel}`
        : "El perfil quedara pendiente de aprobacion. La revision puede demorar entre 24 y 48 horas.";
    }

    renderPhotoPreview(profile && profile.publicProfile.hasPhoto ? profile.publicProfile.photo : "");
  }

  function prepareNewProfile() {
    currentProfile = null;
    setFieldValue("name", "");
    setFieldValue("occupation", "");
    setFieldValue("phone", "");
    setFieldValue("zone", "");
    setFieldValue("description", "");
    if (termsCheckbox) termsCheckbox.checked = false;
    renderPreview(null);

    const submitButton = getSubmitButton();
    if (submitButton) {
      submitButton.textContent = "Crear perfil";
    }
  }

  function fillForm(profile) {
    setFieldValue("name", profile.user.displayName);
    setFieldValue("occupation", profile.publicProfile.title);
    setFieldValue("phone", profile.user.phone);
    setFieldValue("zone", profile.professional.serviceArea);
    setFieldValue("description", profile.publicProfile.summary);
    if (termsCheckbox) {
      termsCheckbox.checked = Boolean(profile.compliance && profile.compliance.hasTermsAcceptance);
    }
    renderPreview(profile);

    const submitButton = getSubmitButton();
    if (submitButton) {
      submitButton.textContent = "Guardar cambios";
    }
  }

  function setFormDisabled(isDisabled) {
    if (!form) return;

    form.querySelectorAll("input, textarea, button").forEach((field) => {
      field.disabled = isDisabled;
    });
  }

  function setSavingState(isSaving) {
    if (!form) return;

    form.querySelectorAll("button").forEach((button) => {
      button.disabled = isSaving;
    });
  }

  function getFriendlySaveError(error) {
    const errorText = error && error.message ? error.message : "";

    if (/profile-photos|storage|bucket|row-level security|storage\.objects|object/i.test(errorText)) {
      return "No pudimos guardar la foto. Falta revisar la configuracion de fotos en Supabase.";
    }

    if (/function|schema cache|p_photo_url|photo_url|moderation_status|column/i.test(errorText)) {
      return "No pudimos guardar porque falta actualizar la configuracion de la base en Supabase.";
    }

    return "No pudimos guardar los cambios. Revisa los datos e intentalo nuevamente.";
  }

  async function loadProfile() {
    if (!app.authService || !app.supabaseService) {
      setMessage("No pudimos cargar la conexion. Volve a intentar.", "error");
      setFormDisabled(true);
      return;
    }

    const session = await app.authService.getSession();

    if (!session) {
      setMessage("Necesitas iniciar sesion para editar tu perfil.", "error");
      setFormDisabled(true);
      return;
    }

    currentProfile = await app.supabaseService.getCurrentUserProfile();

    if (!currentProfile) {
      prepareNewProfile();
      setMessage("Tu cuenta ya esta confirmada. Completa estos datos para publicar tu perfil.", "success");
      return;
    }

    fillForm(currentProfile);
    setMessage("Perfil listo para editar.", "success");
  }

  function previewSelectedPhoto() {
    const file = photoInput && photoInput.files ? photoInput.files[0] : null;

    if (!file) {
      renderPhotoPreview(currentProfile && currentProfile.publicProfile.hasPhoto ? currentProfile.publicProfile.photo : "");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => renderPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function saveProfile() {
    const formData = new FormData(form);
    const profile = {
      name: getTrimmedValue(formData, "name"),
      occupation: getTrimmedValue(formData, "occupation"),
      phone: getTrimmedValue(formData, "phone"),
      zone: getTrimmedValue(formData, "zone"),
      description: getTrimmedValue(formData, "description"),
      termsAccepted: Boolean(termsCheckbox && termsCheckbox.checked),
    };
    const validationMessage = getValidationMessage(profile);

    if (validationMessage) {
      setMessage(validationMessage, "error");
      return null;
    }

    const file = photoInput && photoInput.files ? photoInput.files[0] : null;
    const isNewProfile = !currentProfile;

    setMessage(isNewProfile ? "Creando perfil..." : "Guardando cambios...", "");
    let updatedProfile = currentProfile
      ? await app.supabaseService.updateCurrentUserProfile(profile)
      : await app.supabaseService.createProfessionalProfile(profile);

    currentProfile = updatedProfile;

    if (file) {
      try {
        setMessage("Datos guardados. Subiendo foto...", "");
        profile.photoUrl = await app.supabaseService.uploadCurrentUserProfilePhoto(file);
        updatedProfile = await app.supabaseService.updateCurrentUserProfile(profile);
        currentProfile = updatedProfile;
      } catch (photoError) {
        fillForm(currentProfile);
        if (photoInput) photoInput.value = "";
        setMessage("Guardamos los datos del perfil, pero no pudimos guardar la foto. Podemos revisar esa configuracion despues.", "error");
        return currentProfile;
      }
    }

    fillForm(updatedProfile);
    if (photoInput) photoInput.value = "";
    setMessage(
      isNewProfile
        ? "Perfil creado. Queda pendiente de aprobacion antes de aparecer en el directorio. La revision puede demorar entre 24 y 48 horas."
        : "Cambios guardados. Tu perfil queda pendiente de aprobacion antes de publicarse. La revision puede demorar entre 24 y 48 horas.",
      "success"
    );

    return updatedProfile;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSavingState(true);

    try {
      const updatedProfile = await saveProfile();

      if (updatedProfile && shouldLogoutAfterSave) {
        setMessage("Cambios guardados. Cerrando sesion...", "success");
        window.location.href = "cerrar-sesion.html";
      }
    } catch (error) {
      setMessage(getFriendlySaveError(error), "error");
    } finally {
      shouldLogoutAfterSave = false;
      setSavingState(false);
    }
  }

  if (app.initSessionStatus) {
    app.initSessionStatus();
  }

  if (photoInput) {
    photoInput.addEventListener("change", previewSelectedPhoto);
  }

  if (saveAndLogoutButton) {
    saveAndLogoutButton.addEventListener("click", () => {
      shouldLogoutAfterSave = true;
      form.requestSubmit();
    });
  }

  if (form) {
    form.addEventListener("submit", handleSubmit);
    loadProfile().catch(() => {
      setMessage("No pudimos cargar tu perfil. Volve a intentar.", "error");
      setFormDisabled(true);
    });
  }
})();
