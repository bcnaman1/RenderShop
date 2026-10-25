(() => {
  const saved = localStorage.getItem("renderShopTheme");
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = saved || preferred;

  const button = document.querySelector(".theme-toggle");
  if (!button) return;

  function update() {
    const dark = document.documentElement.dataset.theme === "dark";
    button.textContent = dark ? "Light" : "Dark";
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }

  button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("renderShopTheme", next);
    update();
  });
  update();
})();
