const categoryGrid = document.querySelector("[data-category-grid]");
const professionalsGrid = document.querySelector("[data-professionals-grid]");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector("[data-nav-links]");
const navActions = document.querySelector(".nav-actions");

function renderCategories() {
  categoryGrid.innerHTML = categories
    .map(
      (category) => `
        <article class="category-card">
          <span class="category-icon" aria-hidden="true">${category.icon}</span>
          <div>
            <strong>${category.name}</strong>
            <small>${category.count}</small>
          </div>
        </article>
      `
    )
    .join("");
}

function renderProfessionals() {
  professionalsGrid.innerHTML = professionals
    .map((professional) => {
      const isPremium = professional.status === "Premium";
      return `
        <article class="professional-card ${isPremium ? "premium-card" : ""}">
          <img src="${professional.photo}" alt="${professional.name}, ${professional.profession}" />
          <div class="professional-body">
            <div class="professional-meta">
              <span class="status ${isPremium ? "premium" : "free"}">${professional.status}</span>
              <span class="zone">${professional.zone}</span>
            </div>
            <h3>${professional.name}</h3>
            <p class="profession-line">${professional.profession}</p>
            <p>${professional.description}</p>
            <a class="button whatsapp" href="${professional.whatsapp}" target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </div>
        </article>
      `;
    })
    .join("");
}

function toggleMenu() {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  navLinks.classList.toggle("is-open", !isOpen);
  navActions.classList.toggle("is-open", !isOpen);
}

function closeMenuOnLinkClick() {
  document.querySelectorAll(".nav-links a, .nav-actions a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      navLinks.classList.remove("is-open");
      navActions.classList.remove("is-open");
    });
  });
}

menuToggle.addEventListener("click", toggleMenu);
renderCategories();
renderProfessionals();
closeMenuOnLinkClick();
