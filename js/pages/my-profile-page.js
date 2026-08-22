(function () {
  const app = window.OficiosApp || {};
  const form = document.querySelector("[data-my-profile-form]");
  const message = document.querySelector("[data-form-message]");
  const photoInput = document.querySelector("[data-profile-photo-input]");
  const photoPreview = document.querySelector("[data-profile-photo-preview]");
  const previewName = document.querySelector("[data-profile-preview-name]");
  const previewDetail = document.querySelector("[data-profile-preview-detail]");
  const saveAndLogoutButton = document.querySelector("[data-save-and-logout]");
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
        ? `${profile.publicProfile.title} - ${profile.professional.serviceArea}`
        : "Los cambios guardados se veran en el directorio.";
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
    };
    const validationMessage = getValidationMessage(profile);

    if (validationMessage) {
      setMessage(validationMessage, "error");
      return null;
    }

    const file = photoInput && photoInput.files ? photoInput.files[0] : null;

    if (file) {
      setMessage("Subiendo foto...", "");
      profile.photoUrl = await app.supabaseService.uploadCurrentUserProfilePhoto(file);
    }

    const isNewProfile = !currentProfile;

    setMessage(isNewProfile ? "Creando perfil..." : "Guardando cambios...", "");
    let updatedProfile = currentProfile
      ? await app.supabaseService.updateCurrentUserProfile(profile)
      : await app.supabaseService.createProfessionalProfile(profile);

    if (isNewProfile && profile.photoUrl) {
      updatedProfile = await app.supabaseService.updateCurrentUserProfile(profile);
    }

    currentProfile = updatedProfile;
    fillForm(updatedProfile);
    if (photoInput) photoInput.value = "";
    setMessage(
      isNewProfile ? "Perfil creado. Ya apareces en el directorio." : "Cambios guardados. Tu perfil ya esta actualizado.",
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
      setMessage(
        error && /profile-photos|storage|bucket/i.test(error.message)
          ? "No pudimos guardar la foto. Falta configurar el espacio de fotos en Supabase."
          : "No pudimos guardar los cambios. Revisa los datos e intentalo nuevamente.",
        "error"
      );
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
