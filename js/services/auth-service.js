(function () {
  window.OficiosApp = window.OficiosApp || {};

  const app = window.OficiosApp;
  const authOperationTimeoutMs = 12000;
  const authTimeoutCode = "auth_operation_timeout";
  let authRedirectPromise = null;
  let lastAuthError = "";

  function createAuthTimeoutError(message) {
    const error = new Error(message || "La sesion tardo demasiado en responder.");
    error.code = authTimeoutCode;
    return error;
  }

  function withTimeout(promise, message) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => reject(createAuthTimeoutError(message)), authOperationTimeoutMs);
    });

    return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
      if (typeof window.clearTimeout === "function") {
        window.clearTimeout(timeoutId);
      }
    });
  }

  function getSupabaseStoragePrefix() {
    const config = app.supabaseConfig || {};
    const match = String(config.url || "").match(/^https:\/\/([^.]+)\.supabase\.co/i);
    return match ? `sb-${match[1]}` : "";
  }

  function clearStoredAuthSession() {
    const prefix = getSupabaseStoragePrefix();
    const storages = [window.localStorage, window.sessionStorage].filter(Boolean);

    storages.forEach((storage) => {
      Object.keys(storage).forEach((key) => {
        if ((prefix && key.startsWith(prefix)) || key === "supabase.auth.token") {
          storage.removeItem(key);
        }
      });
    });
  }

  function hasAuthRedirectData() {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    return Boolean(
      params.get("code") ||
        params.get("error") ||
        params.get("error_description") ||
        hashParams.get("access_token") ||
        hashParams.get("error") ||
        hashParams.get("error_description")
    );
  }

  async function getAuth() {
    const client = await app.supabaseService.getClient();
    return client.auth;
  }

  function getCanonicalLocalUrl() {
    if (window.location.hostname !== "localhost" || window.location.port !== "8000") {
      return "";
    }

    const url = new URL(window.location.href);
    url.hostname = "127.0.0.1";
    return url.href;
  }

  function redirectToCanonicalLocalUrl() {
    const canonicalUrl = getCanonicalLocalUrl();

    if (canonicalUrl) {
      window.location.replace(canonicalUrl);
      return true;
    }

    return false;
  }

  function getRedirectUrl(path) {
    const redirectUrl = new URL(path || "index.html", window.location.href);

    if (redirectUrl.hostname === "localhost" && redirectUrl.port === "8000") {
      redirectUrl.hostname = "127.0.0.1";
    }

    return redirectUrl.href;
  }

  function getAuthCallbackUrl(nextPath) {
    const callbackUrl = new URL("auth-callback.html", getRedirectUrl("index.html"));
    callbackUrl.searchParams.set("next", nextPath || "index.html");
    return callbackUrl.href;
  }

  function getAuthErrorFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    return (
      params.get("error_description") ||
      params.get("error") ||
      hashParams.get("error_description") ||
      hashParams.get("error") ||
      ""
    );
  }

  async function handleAuthRedirect(authInstance) {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = params.get("code");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const authError = getAuthErrorFromUrl();

    if (authError) {
      lastAuthError = authError;
      throw new Error(authError);
    }

    if (accessToken && refreshToken) {
      const auth = authInstance || (await getAuth());
      const { data, error } = await auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        lastAuthError = error.message || "No pudimos completar el inicio con Google.";
        throw error;
      }

      lastAuthError = "";
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      if (data.session) {
        return data.session;
      }

      const sessionResult = await auth.getSession();
      return sessionResult.data ? sessionResult.data.session : null;
    }

    if (!code) {
      return null;
    }

    if (!authRedirectPromise) {
      authRedirectPromise = Promise.resolve(authInstance || getAuth()).then(async (auth) => {
        const { data, error } = await auth.exchangeCodeForSession(code);

        if (error) {
          lastAuthError = error.message || "No pudimos completar el inicio con Google.";
          throw error;
        }

        lastAuthError = "";
        window.history.replaceState({}, document.title, window.location.pathname);
        if (data.session) {
          return data.session;
        }

        const sessionResult = await auth.getSession();
        return sessionResult.data ? sessionResult.data.session : null;
      });
    }

    return authRedirectPromise;
  }

  async function signUp(email, password, captchaToken) {
    const auth = await withTimeout(getAuth(), "No pudimos conectar con el registro.");
    const { data, error } = await withTimeout(
      auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl("registro.html"),
          ...(captchaToken ? { captchaToken } : {}),
        },
      }),
      "El registro tardo demasiado en responder."
    );

    if (error) {
      throw error;
    }

    return data;
  }

  async function signIn(email, password, captchaToken) {
    const auth = await withTimeout(getAuth(), "No pudimos conectar con el inicio de sesion.");
    const { data, error } = await withTimeout(
      auth.signInWithPassword({
        email,
        password,
        ...(captchaToken ? { options: { captchaToken } } : {}),
      }),
      "El inicio de sesion tardo demasiado en responder."
    );

    if (error) {
      throw error;
    }

    return data;
  }

  async function signInWithGoogle(redirectPath) {
    const auth = await withTimeout(getAuth(), "No pudimos conectar con Google.");

    const { data, error } = await withTimeout(
      auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthCallbackUrl(redirectPath || "index.html"),
        },
      }),
      "Google tardo demasiado en responder."
    );

    if (error) {
      throw error;
    }

    return data;
  }

  async function signOut() {
    const auth = await withTimeout(getAuth(), "No pudimos conectar para cerrar la sesion.");
    const { error } = await withTimeout(
      auth.signOut({ scope: "local" }),
      "El cierre de sesion tardo demasiado en responder."
    );

    if (error) {
      throw error;
    }
  }

  async function resetPasswordForEmail(email, captchaToken) {
    const auth = await withTimeout(getAuth(), "No pudimos conectar con la recuperacion de contrasena.");
    const redirectTo = getRedirectUrl("cambiar-password.html");
    const { data, error } = await withTimeout(
      auth.resetPasswordForEmail(email, {
        redirectTo,
        ...(captchaToken ? { captchaToken } : {}),
      }),
      "La recuperacion de contrasena tardo demasiado en responder."
    );

    if (error) {
      throw error;
    }

    return data;
  }

  async function updatePassword(password) {
    const auth = await withTimeout(getAuth(), "No pudimos conectar con el cambio de contrasena.");
    const { data, error } = await withTimeout(
      auth.updateUser({ password }),
      "El cambio de contrasena tardo demasiado en responder."
    );

    if (error) {
      throw error;
    }

    return data;
  }

  async function getSession() {
    const auth = await withTimeout(getAuth(), "No pudimos conectar con la sesion.");
    let redirectSession = null;

    if (hasAuthRedirectData()) {
      try {
        redirectSession = await withTimeout(
          handleAuthRedirect(auth),
          "La confirmacion de la sesion tardo demasiado en responder."
        );
      } catch (error) {
        lastAuthError = error.message || "No pudimos completar el inicio de sesion.";
        return null;
      }
    }

    if (redirectSession) {
      return redirectSession;
    }

    let sessionResult;

    try {
      sessionResult = await withTimeout(
        auth.getSession(),
        "La sesion guardada quedo bloqueada. Volve a iniciar sesion."
      );
    } catch (error) {
      if (error && error.code === authTimeoutCode) {
        clearStoredAuthSession();
        lastAuthError = error.message;
        return null;
      }

      throw error;
    }

    const { data, error } = sessionResult;

    if (error) {
      throw error;
    }

    if (data.session) {
      lastAuthError = "";
      return data.session;
    }

    if (redirectToCanonicalLocalUrl()) {
      return null;
    }

    return data.session;
  }

  function getLastAuthError() {
    return lastAuthError || getAuthErrorFromUrl();
  }

  async function onAuthStateChange(callback) {
    const auth = await withTimeout(getAuth(), "No pudimos observar los cambios de sesion.");
    const { data } = auth.onAuthStateChange((event, session) => callback(event, session));
    return data.subscription;
  }

  app.authService = {
    clearStoredAuthSession,
    getLastAuthError,
    getSession,
    handleAuthRedirect,
    onAuthStateChange,
    resetPasswordForEmail,
    signIn,
    signInWithGoogle,
    signOut,
    signUp,
    updatePassword,
  };
})();
