(function () {
  let installEvent;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button secondary";
  button.textContent = "Instalar app";
  button.hidden = true;
  button.style.display = "none";
  const target = document.querySelector(".footer-links");
  if (target) target.append(button);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installEvent = event;
    button.hidden = false;
    button.style.display = "";
  });
  button.addEventListener("click", async () => {
    if (!installEvent) return;
    button.disabled = true;
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } finally {
      installEvent = null;
      button.hidden = true;
      button.style.display = "none";
      button.disabled = false;
    }
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    button.hidden = true;
    button.style.display = "none";
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch((error) => {
      console.warn("No se pudo preparar la instalacion de Oficios App.", error);
    });
  }
})();
