(function () {
  window.OficiosApp = window.OficiosApp || {};

  window.OficiosApp.renderCategories = function (categories, target) {
    if (!target) return;

    target.innerHTML = categories
      .map(
        (category) => `
          <button class="category-card" type="button" data-category-id="${category.id}" data-category-query="${category.query || category.name}">
            <span class="category-icon" aria-hidden="true">${category.icon}</span>
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
