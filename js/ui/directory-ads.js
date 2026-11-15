(function () {
  const app = window.OficiosApp;
  const root = document.querySelector("[data-directory-ads]");
  if (!root) return;
  const placeholder = root.querySelector("[data-ad-placeholder]");

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  let displayed = [];
  let timer;
  let paused = false;
  let index = 0;
  let touchStart;

  function safeUrl(value, image = false) {
    if (!value) return null;
    try {
      const url = new URL(value, document.baseURI);
      return url.protocol === "https:" || (image && url.origin === location.origin && url.protocol === "http:") ? url.href : null;
    } catch {
      return null;
    }
  }

  function element(name, text) {
    const node = document.createElement(name);
    if (text) node.textContent = text;
    return node;
  }

  app.updateDirectoryAds = function ({ query, occupation }, profiles = []) {
    const rubro = normalize(occupation || query);
    const now = Date.now();
    const ads = (app.directoryAds || []).filter((ad) =>
      ad.active && ad.label && ad.rubros?.some((name) => normalize(name) === rubro) &&
      (!ad.startsAt || Date.parse(ad.startsAt) <= now) &&
      (!ad.endsAt || Date.parse(ad.endsAt) > now) &&
      safeUrl(ad.image, true)).map((ad) => {
      const contact = ad.contactProfileId && profiles.find((profile) => profile.id === ad.contactProfileId);
      return { ...ad, destination: safeUrl(ad.contactProfileId ? contact?.publicProfile?.whatsapp : ad.url) };
    }).filter((ad) => ad.destination);
    if (ads.length === displayed.length && ads.every((ad, i) =>
      ad.image === displayed[i].image && ad.mobileImage === displayed[i].mobileImage &&
      ad.destination === displayed[i].destination && ad.label === displayed[i].label)) return;
    clearInterval(timer);
    touchStart = null;
    displayed = ads;
    root.replaceChildren();
    if (!ads.length) {
      if (placeholder) root.append(placeholder.content.cloneNode(true));
      return;
    }
    index = 0;
    paused = motion.matches;
    root.append(element("strong", "Publicidad"));
    const banner = element("a");
    banner.className = "directory-ad-banner";
    const picture = element("picture");
    const mobile = element("source");
    mobile.media = "(max-width: 640px)";
    const image = element("img");
    picture.append(mobile, image);
    banner.append(picture);
    root.append(banner);

    function show() {
      const ad = ads[index];
      banner.href = ad.destination;
      banner.classList.toggle("has-mobile-image", Boolean(ad.mobileImage));
      const mobileUrl = safeUrl(ad.mobileImage, true);
      if (mobileUrl) mobile.srcset = mobileUrl;
      else mobile.removeAttribute("srcset");
      image.alt = ad.label;
      image.src = safeUrl(ad.image, true);
    }
    show();
    if (ads.length === 1) return;

    const controls = element("div");
    controls.className = "directory-ad-controls";
    const previous = element("button", "Anterior");
    const next = element("button", "Siguiente");
    const pause = element("button", paused ? "Reanudar" : "Pausar");
    const position = element("span");
    position.textContent = `1 / ${ads.length}`;
    controls.append(previous, position, next, pause);
    root.append(controls);
    function advance(delta) {
      index = (index + delta + ads.length) % ads.length;
      show();
      position.textContent = `${index + 1} / ${ads.length}`;
      if (!motion.matches) image.animate([{ opacity: .45, transform: `translateX(${delta * 16}px)` }, { opacity: 1, transform: "translateX(0)" }], 220);
    }
    function resetTimer() {
      clearInterval(timer);
      if (!paused) timer = setInterval(() => {
        if (!document.hidden && !root.matches(":hover, :focus-within") && !touchStart) advance(1);
      }, 6000);
    }
    function move(delta) {
      advance(delta);
      resetTimer();
    }
    previous.onclick = () => move(-1);
    next.onclick = () => move(1);
    pause.onclick = () => {
      paused = !paused;
      pause.textContent = paused ? "Reanudar" : "Pausar";
      resetTimer();
    };
    banner.addEventListener("touchstart", (event) => {
      touchStart = event.changedTouches[0];
    }, { passive: true });
    banner.addEventListener("touchcancel", () => { touchStart = null; });
    banner.addEventListener("touchend", (event) => {
      if (!touchStart) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStart.clientX;
      const dy = touch.clientY - touchStart.clientY;
      touchStart = null;
      if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;
      event.preventDefault();
      move(dx < 0 ? 1 : -1);
    }, { passive: false });
    resetTimer();
  };
})();
