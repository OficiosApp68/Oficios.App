(function () {
  window.OficiosApp = window.OficiosApp || {};

  const app = window.OficiosApp;
  const tableName = "professional_profiles";
  const supabaseJsUrl = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.53.0/+esm";
  let clientPromise = null;

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
    const name = normalizeText(row && row.name, "Profesional");
    const occupation = normalizeText(row && row.occupation, "Oficio pendiente");
    const phone = normalizeText(row && row.phone, "");
    const zone = normalizeText(row && row.zone, "Zona a confirmar");
    const description = normalizeText(row && row.description, "Descripcion pendiente de carga.");
    const photoUrl = normalizeText(row && (row.photo_url || row.profile_photo_url), "");
    const moderationStatus = normalizeText(row && row.moderation_status, "approved");
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
    };

    const { data, error } = await client.rpc("create_professional_profile", payload);

    if (error) {
      throw error;
    }

    return createProfileModel(data);
  }

  async function getProfessionalProfiles() {
    const client = await getClient();
    const { data, error } = await client
      .from(tableName)
      .select("*")
      .eq("is_active", true)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data.map(createProfileModel) : [];
  }

  async function getProfessionalProfileById(id) {
    const client = await getClient();
    const { data, error } = await client
      .from(tableName)
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .eq("moderation_status", "approved")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? createProfileModel(data) : null;
  }

  async function getCurrentUserProfile() {
    const client = await getClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    const userId = sessionData.session && sessionData.session.user ? sessionData.session.user.id : "";

    if (!userId) {
      return null;
    }

    const { data, error } = await client
      .from(tableName)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? createProfileModel(data) : null;
  }

  async function updateCurrentUserProfile(profile) {
    const client = await getClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();

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
    };

    const { data, error } = await client.rpc("update_current_professional_profile", payload);

    if (error) {
      throw error;
    }

    return data ? createProfileModel(data) : null;
  }

  async function uploadCurrentUserProfilePhoto(file) {
    const client = await getClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    const userId = sessionData.session && sessionData.session.user ? sessionData.session.user.id : "";

    if (!userId) {
      throw new Error("Necesitas iniciar sesion para subir una foto.");
    }

    if (!file || !file.type || !file.type.startsWith("image/")) {
      throw new Error("Elegí una imagen valida.");
    }

    const extension = file.name && file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
    const filePath = `${userId}/profile-${Date.now()}.${extension}`;
    const { error } = await client.storage.from("profile-photos").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (error) {
      throw error;
    }

    const { data } = client.storage.from("profile-photos").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function getModerationProfiles(status) {
    const client = await getClient();
    const { data, error } = await client.rpc("list_moderation_professional_profiles", {
      p_status: normalizeText(status, "pending"),
    });

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data.map(createProfileModel) : [];
  }

  async function approveProfessionalProfile(id) {
    const client = await getClient();
    const { data, error } = await client.rpc("approve_professional_profile", {
      p_profile_id: id,
    });

    if (error) {
      throw error;
    }

    return data ? createProfileModel(data) : null;
  }

  async function rejectProfessionalProfile(id) {
    const client = await getClient();
    const { data, error } = await client.rpc("reject_professional_profile", {
      p_profile_id: id,
    });

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
    getProfessionalProfileById,
    getProfessionalProfiles,
    rejectProfessionalProfile,
    updateCurrentUserProfile,
    uploadCurrentUserProfilePhoto,
  };
})();
