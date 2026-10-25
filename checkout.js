(() => {
  const readBuild = () => {
    try {
      const value = JSON.parse(localStorage.getItem("renderShopBuild") || "[]");
      return Array.isArray(value) ? value.filter((part) => part && typeof part === "object") : [];
    } catch (_) {
      return [];
    }
  };

  const formatPrice = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
  const countEl = document.querySelector("[data-checkout-count]");
  const subtotalEl = document.querySelector("[data-checkout-subtotal]");
  const totalEl = document.querySelector("[data-checkout-total]");
  const form = document.querySelector(".payment-card");
  const statusEl = document.getElementById("checkoutStatus");
  const confirmation = document.getElementById("order-confirmed");
  const refresh = () => {
    const build = readBuild();
    const subtotal = build.reduce((sum, part) => sum + (Number(part.price) || 0), 0);
    if (countEl) countEl.textContent = `${build.length} ${build.length === 1 ? "part" : "parts"}`;
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (totalEl) totalEl.textContent = formatPrice(subtotal);
    if (form) form.dataset.itemCount = String(build.length);
  };

  refresh();
  window.addEventListener("storage", refresh);
  form?.addEventListener("submit", (event) => {
    const build = readBuild();
    if (!build.length) {
      event.preventDefault();
      if (statusEl) statusEl.textContent = "Add at least one part before reviewing the order.";
      return;
    }
    event.preventDefault();
    if (statusEl) statusEl.textContent = "";
    confirmation?.classList.remove("is-hidden");
    confirmation?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
})();
