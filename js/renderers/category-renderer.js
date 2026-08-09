(function () {
  window.OficiosApp = window.OficiosApp || {};

  const iconPaths = {
    activity: '<path d="M4 12h4l2-5 4 10 2-5h4"></path>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"></path>',
    book: '<path d="M5 4h7a4 4 0 0 1 4 4v12H9a4 4 0 0 0-4-4V4Z"></path><path d="M16 8h3v12"></path>',
    brick: '<path d="M3 7h18v10H3Z"></path><path d="M3 12h18"></path><path d="M9 7v5"></path><path d="M15 12v5"></path>',
    cake: '<path d="M4 11h16v9H4Z"></path><path d="M8 11V8"></path><path d="M12 11V8"></path><path d="M16 11V8"></path><path d="M7 15c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0"></path>',
    camera: '<path d="M4 7h4l2-2h4l2 2h4v12H4Z"></path><circle cx="12" cy="13" r="3"></circle>',
    chef: '<path d="M7 11a4 4 0 1 1 2-7 4 4 0 0 1 6 0 4 4 0 1 1 2 7"></path><path d="M7 11h10v9H7Z"></path><path d="M9 15h6"></path>',
    computer: '<path d="M4 5h16v11H4Z"></path><path d="M8 20h8"></path><path d="M12 16v4"></path>',
    eye: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle>',
    face: '<circle cx="12" cy="12" r="8"></circle><path d="M9 10h.01"></path><path d="M15 10h.01"></path><path d="M9 15c2 1.5 4 1.5 6 0"></path>',
    flame: '<path d="M12 22c4-2 6-5 5-9-1-4-4-6-5-11-2 3-1 6-4 9-2 2-3 5-1 8 1 2 3 3 5 3Z"></path>',
    foot: '<path d="M10 20c-3 0-5-2-5-5 0-4 4-6 5-10 1 4 5 6 5 10 0 3-2 5-5 5Z"></path><path d="M15 7h.01"></path><path d="M17 10h.01"></path><path d="M18 13h.01"></path>',
    hammer: '<path d="M14 4 20 10"></path><path d="M12 6 6 12"></path><path d="M8 14 3 19"></path><path d="M5 21 2 18"></path><path d="M10 4l10 10-3 3L7 7Z"></path>',
    hand: '<path d="M7 12V7a2 2 0 0 1 4 0v5"></path><path d="M11 12V5a2 2 0 0 1 4 0v8"></path><path d="M15 13V8a2 2 0 0 1 4 0v7c0 4-3 7-7 7h-1c-3 0-6-3-6-6v-4a2 2 0 0 1 4 0v2"></path>',
    heart: '<path d="M20 8c0 6-8 12-8 12S4 14 4 8a4 4 0 0 1 8-2 4 4 0 0 1 8 2Z"></path>',
    home: '<path d="M3 11 12 3l9 8"></path><path d="M5 10v10h14V10"></path>',
    key: '<circle cx="8" cy="12" r="4"></circle><path d="M12 12h8"></path><path d="M17 12v3"></path><path d="M20 12v3"></path>',
    leaf: '<path d="M5 20c10 0 15-5 15-15-10 0-15 5-15 15Z"></path><path d="M5 20 15 10"></path>',
    newspaper: '<path d="M4 5h13a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3V5Z"></path><path d="M17 8h3"></path><path d="M8 9h5"></path><path d="M8 13h8"></path><path d="M8 17h5"></path>',
    paint: '<path d="M4 20h4l10-10a3 3 0 0 0-4-4L4 16v4Z"></path><path d="M13 7l4 4"></path>',
    paw: '<circle cx="6" cy="9" r="2"></circle><circle cx="18" cy="9" r="2"></circle><circle cx="9" cy="5" r="2"></circle><circle cx="15" cy="5" r="2"></circle><path d="M8 17c0-3 2-5 4-5s4 2 4 5c0 2-2 3-4 3s-4-1-4-3Z"></path>',
    pen: '<path d="M4 20h4L19 9a3 3 0 0 0-4-4L4 16v4Z"></path><path d="M13 7l4 4"></path>',
    pipe: '<path d="M5 7h10a4 4 0 0 1 4 4v6"></path><path d="M5 5v4"></path><path d="M15 17h8"></path><path d="M21 15v4"></path>',
    scissors: '<circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M8.5 8.5 20 20"></path><path d="M8.5 15.5 20 4"></path>',
    shield: '<path d="M12 3 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6Z"></path><path d="M9 12h6"></path>',
    snow: '<path d="M12 2v20"></path><path d="m5 5 14 14"></path><path d="m19 5-14 14"></path><path d="M4 12h16"></path>',
    sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"></path>',
    tools: '<path d="M14 7 17 4l3 3-3 3"></path><path d="M4 20l8-8"></path><path d="M6 4l14 14"></path>',
    truck: '<path d="M3 7h11v9H3Z"></path><path d="M14 10h4l3 3v3h-7Z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle>',
    window: '<path d="M4 4h16v16H4Z"></path><path d="M12 4v16"></path><path d="M4 12h16"></path>',
    wrench: '<path d="M14 6a5 5 0 0 0 6 6L10 22l-4-4 10-10a5 5 0 0 0-6-6"></path>',
  };

  function renderCategoryIcon(category) {
    const icon = iconPaths[category.icon];

    if (!icon) {
      return `<span class="category-icon-fallback">${category.icon || ""}</span>`;
    }

    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg>`;
  }

  window.OficiosApp.renderCategories = function (categories, target) {
    if (!target) return;

    target.innerHTML = categories
      .map(
        (category) => `
          <button class="category-card" type="button" data-category-id="${category.id}" data-category-query="${category.query || category.name}">
            <span class="category-icon" aria-hidden="true">${renderCategoryIcon(category)}</span>
            <div>
              <strong>${category.name}</strong>
              <small>Buscar rubro</small>
            </div>
          </button>
        `
      )
      .join("");
  };
})();
