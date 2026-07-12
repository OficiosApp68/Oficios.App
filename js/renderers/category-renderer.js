(function () {
  window.OficiosApp = window.OficiosApp || {};

  window.OficiosApp.renderCategories = function (categories, target) {
    if (!target) return;

    target.innerHTML = categories
      .map(
        (category) => `
          <article class="category-card" data-category-id="${category.id}">
            <span class="category-icon" aria-hidden="true">${category.icon}</span>
            <div>
              <strong>${category.name}</strong>
              <small>${category.count}</small>
            </div>
          </article>
        `
      )
      .join("");
  };
})();
