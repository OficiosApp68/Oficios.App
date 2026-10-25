(function () {
  const trigger = document.querySelector("[data-open-presentation]");
  const dialog = document.querySelector("[data-presentation-dialog]");
  const video = document.querySelector("[data-presentation-video]");
  if (!trigger || !dialog || !video) return;
  trigger.addEventListener("click", () => {
    dialog.showModal();
    const source = video.querySelector("source");
    if (!source.hasAttribute("src")) {
      source.src = source.dataset.src;
      video.load();
    }
    video.play().catch(() => { /* Native controls remain available if playback is blocked. */ });
  });
  document.querySelector("[data-close-presentation]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    video.pause();
    trigger.focus({ preventScroll: true });
  });
  video.addEventListener("error", () => {
    document.querySelector("[data-presentation-error]").hidden = false;
  });
})();
