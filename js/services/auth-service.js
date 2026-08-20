(function () {
  window.OficiosApp = window.OficiosApp || {};

  const app = window.OficiosApp;
  let authRedirectPromise = null;
  let lastAuthError = "";

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

  async function signUp(email, password) {
    const auth = await getAuth();
    const { data, error } = await auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl("registro.html"),
      },
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async function signIn(email, password) {
    const auth = await getAuth();
    const { data, error } = await auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }

    return data;
  }

  async function signInWithGoogle(redirectPath) {
    const auth = await getAuth();

    const { data, error } = await auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthCallbackUrl(redirectPath || "index.html"),
      },
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async function signOut() {
    const auth = await getAuth();
    const { error } = await auth.signOut();

    if (error) {
      throw error;
    }
  }

  async function resetPasswordForEmail(email) {
    const auth = await getAuth();
    const redirectTo = getRedirectUrl("cambiar-password.html");
    const { data, error } = await auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      throw error;
    }

    return data;
  }

  async function updatePassword(password) {
    const auth = await getAuth();
    const { data, error } = await auth.updateUser({ password });

    if (error) {
      throw error;
    }

    return data;
  }

  async function getSession() {
    const auth = await getAuth();
    let redirectSession = null;

    try {
      redirectSession = await handleAuthRedirect(auth);
    } catch (error) {
      lastAuthError = error.message || "No pudimos completar el inicio con Google.";
      redirectSession = null;
    }

    if (redirectSession) {
      return redirectSession;
    }

    const { data, error } = await auth.getSession();

    if (error) {
      throw error;
    }

    if (data.session) {
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
    const auth = await getAuth();
    const { data } = auth.onAuthStateChange((event, session) => callback(event, session));
    return data.subscription;
  }

  app.authService = {
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
