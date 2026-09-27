(function () {
  window.OficiosApp = window.OficiosApp || {};

  const app = window.OficiosApp;
  const tableName = "professional_profiles";
  const supabaseJsUrl = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.53.0/+esm";
  const termsVersion = "2026-08-28-mvp";
  const profilePhotoBucket = "profile-photos";
  const allowedProfilePhotoTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxProfilePhotoInputBytes = 8 * 1024 * 1024;
  const maxProfilePhotoOutputBytes = 5 * 1024 * 1024;
  const maxProfilePhotoSourcePixels = 40_000_000;
  const maxProfilePhotoDimension = 1600;
  const serviceRequestTimeoutMs = 15000;
  const serviceTimeoutCode = "service_request_timeout";
  let clientPromise = null;

  function createServiceTimeoutError(message) {
    const error = new Error(message || "La operacion tardo demasiado en responder.");
    error.code = serviceTimeoutCode;
    return error;
  }

  function withRequestTimeout(request, message) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const operation = controller && request && typeof request.abortSignal === "function"
      ? request.abortSignal(controller.signal)
      : request;
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        if (controller) controller.abort();
        reject(createServiceTimeoutError(message));
      }, serviceRequestTimeoutMs);
    });

    return Promise.race([Promise.resolve(operation), timeout]).finally(() => {
      if (typeof window.clearTimeout === "function") {
        window.clearTimeout(timeoutId);
      }
    });
  }

  async function getSessionData(client, message) {
    return withRequestTimeout(
      client.auth.getSession(),
      message || "La sesion tardo demasiado en responder. Reinicia el acceso e intenta nuevamente."
    );
  }

  function normalizeText(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function removeArgentinaMobilePrefix(digits) {
    if (digits.startsWith("15") && digits.length === 10) {
      return `11${digits.slice(2)}`;
    }

    if (digits.startsWith("1115") && digits.length === 12) {
      return `11${digits.slice(4)}`;
    }

    if (digits.length >= 11 && digits.length <= 13) {
      return digits.replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");
    }

    return digits;
  }

  function normalizeWhatsappDigits(phone) {
    let digits = normalizeText(phone, "").replace(/[^\d]/g, "");

    if (!digits) return "";

    if (digits.startsWith("00")) {
      digits = digits.slice(2);
    }

    if (digits.startsWith("549")) {
      return digits;
    }

    if (digits.startsWith("54")) {
      const nationalDigits = removeArgentinaMobilePrefix(digits.slice(2).replace(/^9/, ""));
      return nationalDigits ? `549${nationalDigits}` : "";
    }

    digits = removeArgentinaMobilePrefix(digits.replace(/^0+/, ""));

    if (digits.length === 8) {
      return `54911${digits}`;
    }

    if (digits.length >= 10 && digits.length <= 11) {
      return `549${digits}`;
    }

    return digits;
  }

  function buildWhatsappUrl(phone) {
    const digits = normalizeWhatsappDigits(phone);
    return digits ? `https://wa.me/${digits}` : "";
  }

  function createProfileModel(row) {
    const name = normalizeText(row && row.name, "Perfil");
    const occupation = normalizeText(row && row.occupation, "Oficio pendiente");
    const phone = normalizeText(row && row.phone, "");
    const zone = normalizeText(row && row.zone, "Zona a confirmar");
    const description = normalizeText(row && row.description, "Descripcion pendiente de carga.");
    const photoUrl = normalizeText(row && (row.photo_url || row.profile_photo_url), "");
    const moderationStatus = normalizeText(row && row.moderation_status, "approved");
    const termsAcceptedAt = normalizeText(row && row.terms_accepted_at, "");
    const privacyAcceptedAt = normalizeText(row && row.privacy_accepted_at, "");
    const moderationLabels = {
      approved: "Aprobado",
      pending: "Pendiente",
      rejected: "Rechazado",
    };
    const moderationLabel = moderationLabels[moderationStatus] || "Pendiente";

    return {
      id: row.id,
      user: {
        id: normalizeText(row && row.user_id, ""),
        role: "professional",
        displayName: name,
        email: "",
        phone,
        accountStatus: "active",
        hasValidReference: true,
      },
      professional: {
        id: row.id,
        userId: normalizeText(row && row.user_id, ""),
        primaryTradeId: "",
        tradeIds: [],
        experience: "Experiencia pendiente de carga",
        serviceArea: zone,
        coverage: zone,
        workingHours: "Horarios a confirmar",
        isActive: row.is_active !== false,
        hasExperience: false,
        hasServiceArea: Boolean(zone),
        hasCoverage: Boolean(zone),
        hasWorkingHours: false,
      },
      publicProfile: {
        id: row.id,
        professionalId: row.id,
        title: occupation,
        summary: description,
        longDescription: description,
        specialties: [occupation],
        rating: null,
        ratingLabel: "Sin calificacion",
        whatsapp: buildWhatsappUrl(phone),
        photo: photoUrl || "assets/profile-placeholder.svg",
        hasPhoto: Boolean(photoUrl),
        gallery: [],
        reviews: [],
        hasValidReference: true,
        hasTitle: Boolean(occupation),
        hasSummary: Boolean(description),
        hasLongDescription: Boolean(description),
        hasSpecialties: Boolean(occupation),
        hasRating: false,
      },
      primaryTrade: occupation,
      trades: [occupation],
      subscription: {
        id: null,
        professionalId: row.id,
        plan: "free",
        status: "inactive",
        hasValidReference: false,
      },
      moderationStatus,
      moderationLabel,
      compliance: {
        termsVersion: normalizeText(row && row.terms_version, termsVersion),
        termsAcceptedAt,
        privacyAcceptedAt,
        hasTermsAcceptance: Boolean(termsAcceptedAt && privacyAcceptedAt),
      },
      statusLabel: moderationStatus === "approved" ? "Gratuito" : moderationLabel,
      canContactByWhatsapp: Boolean(phone),
      canContactByPhone: Boolean(phone),
      source: "supabase",
    };
  }

  async function getClient() {
    if (clientPromise) {
      return clientPromise;
    }

    clientPromise = import(supabaseJsUrl).then(({ createClient }) => {
      const config = app.supabaseConfig || {};
      return createClient(config.url, config.publishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "implicit",
          persistSession: true,
        },
      });
    });

    return clientPromise;
  }

  async function createProfessionalProfile(profile) {
    const client = await getClient();
    const payload = {
      p_name: normalizeText(profile.name, ""),
      p_occupation: normalizeText(profile.occupation, ""),
      p_phone: normalizeText(profile.phone, ""),
      p_zone: normalizeText(profile.zone, ""),
      p_description: normalizeText(profile.description, ""),
      p_terms_accepted: profile.termsAccepted === true,
    };

    const { data, error } = await withRequestTimeout(
      client.rpc("create_professional_profile", payload),
      "No recibimos confirmacion de la creacion del perfil. Recarga Mi perfil antes de volver a intentarlo."
    );

    if (error) {
      throw error;
    }

    return createProfileModel(data);
  }

  async function getProfessionalProfiles() {
    const client = await getClient();
    const { data, error } = await withRequestTimeout(
      client.rpc("list_public_professional_profiles", {
        p_profile_id: null,
      }),
      "El directorio tardo demasiado en responder."
    );

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data.map(createProfileModel) : [];
  }

  async function getProfessionalProfileById(id) {
    const client = await getClient();
    const { data, error } = await withRequestTimeout(
      client.rpc("list_public_professional_profiles", {
        p_profile_id: id,
      }),
      "La ficha tardo demasiado en responder."
    );

    if (error) {
      throw error;
    }

    return Array.isArray(data) && data.length ? createProfileModel(data[0]) : null;
  }

  async function getCurrentUserProfile() {
    const client = await getClient();
    const { data: sessionData, error: sessionError } = await getSessionData(
      client,
      "La sesion tardo demasiado en responder. Reinicia el acceso antes de cargar tu perfil."
    );

    if (sessionError) {
      throw sessionError;
    }

    const userId = sessionData.session && sessionData.session.user ? sessionData.session.user.id : "";

    if (!userId) {
      return null;
    }

    const { data, error } = await withRequestTimeout(
      client
        .from(tableName)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      "Tu perfil tardo demasiado en responder."
    );

    if (error) {
      throw error;
    }

    return data ? createProfileModel(data) : null;
  }

  async function updateCurrentUserProfile(profile) {
    const client = await getClient();
    const { data: sessionData, error: sessionError } = await getSessionData(
      client,
      "La sesion tardo demasiado en responder. Reinicia el acceso antes de guardar nuevamente."
    );

    if (sessionError) {
      throw sessionError;
    }

    const userId = sessionData.session && sessionData.session.user ? sessionData.session.user.id : "";

    if (!userId) {
      throw new Error("Necesitas iniciar sesion para editar tu perfil.");
    }

    const payload = {
      p_name: normalizeText(profile.name, ""),
      p_occupation: normalizeText(profile.occupation, ""),
      p_phone: normalizeText(profile.phone, ""),
      p_zone: normalizeText(profile.zone, ""),
      p_description: normalizeText(profile.description, ""),
      p_photo_url: normalizeText(profile.photoUrl, ""),
      p_terms_accepted: profile.termsAccepted === true,
    };

    const { data, error } = await withRequestTimeout(
      client.rpc("update_current_professional_profile", payload),
      "No recibimos confirmacion del guardado. Recarga Mi perfil antes de volver a intentarlo."
    );

    if (error) {
      throw error;
    }

    return data ? createProfileModel(data) : null;
  }

  function validateProfilePhotoFile(file) {
    if (!file || !allowedProfilePhotoTypes.includes(file.type)) {
      return "Elegí una imagen JPG, PNG o WebP.";
    }

    if (file.size > maxProfilePhotoInputBytes) {
      return "La foto puede pesar hasta 8 MB.";
    }

    return "";
  }

  async function hasValidImageSignature(file) {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    const isWebp =
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

    return isJpeg || isPng || isWebp;
  }

  function loadProfilePhotoImage(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("No pudimos leer la imagen seleccionada."));
      };
      image.src = objectUrl;
    });
  }

  function canvasToWebp(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.type !== "image/webp") {
            reject(new Error("Tu navegador no pudo preparar la foto en un formato seguro."));
            return;
          }

          resolve(blob);
        },
        "image/webp",
        0.86
      );
    });
  }

  async function prepareProfilePhoto(file) {
    const validationError = validateProfilePhotoFile(file);

    if (validationError) {
      throw new Error(validationError);
    }

    if (!(await hasValidImageSignature(file))) {
      throw new Error("El archivo no contiene una imagen JPG, PNG o WebP valida.");
    }

    const image = await loadProfilePhotoImage(file);
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;

    if (!sourceWidth || !sourceHeight || sourceWidth * sourceHeight > maxProfilePhotoSourcePixels) {
      throw new Error("La imagen tiene dimensiones demasiado grandes.");
    }

    const scale = Math.min(1, maxProfilePhotoDimension / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      throw new Error("No pudimos preparar la foto en este navegador.");
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToWebp(canvas);

    if (blob.size > maxProfilePhotoOutputBytes) {
      throw new Error("La foto procesada supera el limite de 5 MB.");
    }

    return new File([blob], `profile-${Date.now()}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  }

  async function getCurrentUserId(client, errorMessage) {
    const { data: sessionData, error: sessionError } = await getSessionData(
      client,
      "La sesion tardo demasiado en responder. Reinicia el acceso antes de continuar."
    );

    if (sessionError) {
      throw sessionError;
    }

    const userId = sessionData.session && sessionData.session.user ? sessionData.session.user.id : "";

    if (!userId) {
      throw new Error(errorMessage);
    }

    return userId;
  }

  async function uploadCurrentUserProfilePhoto(file) {
    const client = await getClient();
    const userId = await getCurrentUserId(client, "Necesitas iniciar sesion para subir una foto.");
    const preparedFile = await prepareProfilePhoto(file);

    const filePath = `${userId}/${preparedFile.name}`;
    const { error } = await withRequestTimeout(
      client.storage.from(profilePhotoBucket).upload(filePath, preparedFile, {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: false,
      }),
      "La foto tardo demasiado en subir. Recarga Mi perfil antes de volver a intentarlo."
    );

    if (error) {
      throw error;
    }

    const { data } = client.storage.from(profilePhotoBucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  function getOwnProfilePhotoPath(photoUrl, userId) {
    const marker = "/storage/v1/object/public/profile-photos/";

    try {
      const path = decodeURIComponent(new URL(photoUrl).pathname.split(marker)[1] || "");
      return path.startsWith(`${userId}/`) ? path : "";
    } catch (_) {
      return "";
    }
  }

  async function getCurrentUserProfilePhotoPaths(client, userId) {
    const { data, error } = await withRequestTimeout(
      client.storage.from(profilePhotoBucket).list(userId, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      }),
      "La lista de fotos tardo demasiado en responder."
    );

    if (error) {
      throw error;
    }

    return (data || []).filter((item) => item && item.name).map((item) => `${userId}/${item.name}`);
  }

  async function removeCurrentUserProfilePhotoFile(photoUrl) {
    const client = await getClient();
    const userId = await getCurrentUserId(client, "Necesitas iniciar sesion para eliminar tu foto.");

    const filePath = getOwnProfilePhotoPath(photoUrl, userId);

    if (filePath) {
      const { error: storageError } = await withRequestTimeout(
        client.storage.from(profilePhotoBucket).remove([filePath]),
        "La eliminacion de la foto tardo demasiado en responder."
      );

      if (storageError) {
        throw storageError;
      }
    }
  }

  async function removeSupersededCurrentUserProfilePhotos(currentPhotoUrl) {
    const client = await getClient();
    const userId = await getCurrentUserId(client, "Necesitas iniciar sesion para administrar tus fotos.");
    const currentPath = getOwnProfilePhotoPath(currentPhotoUrl, userId);
    const paths = await getCurrentUserProfilePhotoPaths(client, userId);
    const obsoletePaths = paths.filter((path) => path !== currentPath);

    if (!obsoletePaths.length) {
      return;
    }

    const { error } = await withRequestTimeout(
      client.storage.from(profilePhotoBucket).remove(obsoletePaths),
      "La limpieza de fotos anteriores tardo demasiado en responder."
    );

    if (error) {
      throw error;
    }
  }

  async function removeCurrentUserProfilePhoto() {
    const client = await getClient();
    const userId = await getCurrentUserId(client, "Necesitas iniciar sesion para eliminar tu foto.");

    const { data, error } = await withRequestTimeout(
      client.rpc("remove_current_professional_profile_photo"),
      "No recibimos confirmacion de la eliminacion de la foto. Recarga Mi perfil antes de volver a intentarlo."
    );

    if (error) {
      throw error;
    }

    const paths = await getCurrentUserProfilePhotoPaths(client, userId);

    if (paths.length) {
      const { error: storageError } = await withRequestTimeout(
        client.storage.from(profilePhotoBucket).remove(paths),
        "La eliminacion de los archivos de foto tardo demasiado en responder."
      );

      if (storageError) {
        throw storageError;
      }
    }

    return data ? createProfileModel(data) : null;
  }

  async function getModerationProfiles(status) {
    const client = await getClient();
    const { data, error } = await withRequestTimeout(
      client.rpc("list_moderation_professional_profiles", {
        p_status: normalizeText(status, "pending"),
      }),
      "La moderacion tardo demasiado en responder."
    );

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data.map(createProfileModel) : [];
  }

  async function getPendingModerationCount() {
    const profiles = await getModerationProfiles("pending");
    return profiles.length;
  }

  async function isCurrentUserAdmin() {
    const client = await getClient();
    const { data, error } = await withRequestTimeout(
      client.rpc("is_app_admin"),
      "La comprobacion de administrador tardo demasiado en responder."
    );

    if (error) {
      return false;
    }

    return data === true;
  }

  async function approveProfessionalProfile(id) {
    const client = await getClient();
    const { data, error } = await withRequestTimeout(
      client.rpc("approve_professional_profile", {
        p_profile_id: id,
      }),
      "No recibimos confirmacion de la aprobacion. Actualiza la lista antes de volver a intentarlo."
    );

    if (error) {
      throw error;
    }

    return data ? createProfileModel(data) : null;
  }

  async function rejectProfessionalProfile(id) {
    const client = await getClient();
    const { data, error } = await withRequestTimeout(
      client.rpc("reject_professional_profile", {
        p_profile_id: id,
      }),
      "No recibimos confirmacion del rechazo. Actualiza la lista antes de volver a intentarlo."
    );

    if (error) {
      throw error;
    }

    return data ? createProfileModel(data) : null;
  }

  app.supabaseService = {
    approveProfessionalProfile,
    createProfessionalProfile,
    getClient,
    getCurrentUserProfile,
    getModerationProfiles,
    getPendingModerationCount,
    getProfessionalProfileById,
    getProfessionalProfiles,
    isCurrentUserAdmin,
    rejectProfessionalProfile,
    removeCurrentUserProfilePhoto,
    removeCurrentUserProfilePhotoFile,
    removeSupersededCurrentUserProfilePhotos,
    prepareProfilePhoto,
    updateCurrentUserProfile,
    uploadCurrentUserProfilePhoto,
    validateProfilePhotoFile,
  };
})();
