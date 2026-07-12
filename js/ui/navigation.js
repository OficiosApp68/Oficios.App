(function () {
  window.OficiosApp = window.OficiosApp || {};

  window.OficiosApp.initNavigation = function () {
    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector("[data-nav-links]");
    const navActions = document.querySelector(".nav-actions");

    if (!menuToggle || !navLinks || !navActions) return;

    menuToggle.addEventListener("click", function () {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      navLinks.classList.toggle("is-open", !isOpen);
      navActions.classList.toggle("is-open", !isOpen);
    });

    document.querySelectorAll(".nav-links a, .nav-actions a").forEach((link) => {
      link.addEventListener("click", function () {
        menuToggle.setAttribute("aria-expanded", "false");
        navLinks.classList.remove("is-open");
        navActions.classList.remove("is-open");
      });
    });
  };
})();
