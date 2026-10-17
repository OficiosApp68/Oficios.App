(function () {
  let installEvent;
  let installationAccepted = false;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button secondary";
  button.textContent = "Como instalar";
  button.hidden = true;
  button.style.display = "none";
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "css/install-app.css?v=20261017a";
  document.head.append(style);
  const banner = document.createElement("section");
  banner.className = "app-install-banner";
  banner.setAttribute("aria-label", "Instalar Oficios App");
  banner.innerHTML = '<div class="app-install-inner"><img src="assets/app-icon-192.png" width="40" height="40" alt="" /><div class="app-install-copy"><strong>Oficios App en tu celular</strong><span>Gratis y siempre a mano</span></div></div>';
  banner.querySelector(".app-install-inner").append(button);
  const header = document.querySelector(".site-header");
  if (header) header.insertAdjacentElement("afterend", banner);
  else document.body.prepend(banner);
  button.className = "app-install-action";
  button.hidden = false;
  button.style.display = "";
  const standalone = window.matchMedia("(display-mode: standalone)");
  function updateVisibility() {
    banner.hidden = installationAccepted || standalone.matches || Boolean(navigator.standalone);
    button.textContent = installEvent ? "Instalar app" : "Como instalar";
    button.setAttribute("aria-haspopup", installEvent ? "false" : "dialog");
  }
  updateVisibility();
  standalone.addEventListener("change", updateVisibility);
  const dialog = document.createElement("dialog");
  dialog.className = "app-install-dialog";
  dialog.setAttribute("aria-labelledby", "app-install-title");
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const embedded = /FBAN|FBAV|Instagram|WhatsApp|; wv\)/i.test(navigator.userAgent);
  const instructions = ios
    ? "Abri esta pagina en Safari. Toca Compartir y elegi Agregar a inicio. Despues confirma con Agregar."
    : embedded
      ? "Abri el menu de este navegador y elegi Abrir en Chrome. En Chrome, toca los tres puntos y elegi Instalar aplicacion o Agregar a pantalla principal."
      : "En Chrome, abri el menu de los tres puntos y elegi Instalar Oficios App o Agregar a pantalla principal. En la computadora tambien podes usar el icono de instalacion de la barra de direcciones.";
  dialog.innerHTML = `<h2 id="app-install-title">Como instalar Oficios App</h2><p>${instructions}</p><form method="dialog"><button class="app-install-action" type="submit">Cerrar instrucciones</button></form>`;
  document.body.append(dialog);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installEvent = event;
    if (dialog.open) dialog.close();
    updateVisibility();
  });
  button.addEventListener("click", async () => {
    if (!installEvent) {
      dialog.showModal();
      return;
    }
    const promptEvent = installEvent;
    installEvent = null;
    button.disabled = true;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") installationAccepted = true;
    } catch (_) {
      dialog.showModal();
    } finally {
      button.disabled = false;
      updateVisibility();
    }
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    installationAccepted = true;
    updateVisibility();
    if (dialog.open) dialog.close();
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch((error) => {
      console.warn("No se pudo preparar la instalacion de Oficios App.", error);
    });
  }
})();
