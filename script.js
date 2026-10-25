  async function initializeApp() {
  const dataResponse = await fetch("catalog-data.html");
  if (!dataResponse.ok) throw new Error(`Could not load catalog data (${dataResponse.status}).`);
  const dataDocument = new DOMParser().parseFromString(await dataResponse.text(), "text/html");
  const catalogData = JSON.parse(dataDocument.querySelector("#parts-data").textContent);
  window.RESEARCHED_PRICES = JSON.parse(dataDocument.querySelector("#price-history-data").textContent);
  const PARTS = catalogData.parts;
  const priceFilter = document.getElementById("priceFilter");
  const performanceFilter = document.getElementById("performanceFilter");
  const availabilityFilter = document.getElementById("availabilityFilter");
  const sortFilter = document.getElementById("sortFilter");
  const clearFilters = document.getElementById("clearFilters");
  const filterResultCount = document.getElementById("filterResultCount");
  function performanceBand(part) {
    const sameCategory = PARTS.filter((candidate) => candidate.cat === part.cat).sort((a, b) => a.price - b.price);
    const rank = sameCategory.findIndex((candidate) => candidate.id === part.id);
    const percentile = sameCategory.length <= 1 ? 1 : rank / (sameCategory.length - 1);
    if (percentile >= 0.85) return "extreme";
    if (percentile >= 0.55) return "high";
    if (percentile >= 0.25) return "standard";
    return "entry";
  }

  function matchesPrice(part, range) {
    if (range === "all") return true;
    if (range === "0-250") return part.price < 10000;
    if (range === "250-500") return part.price >= 10000 && part.price <= 25000;
    if (range === "500-1000") return part.price > 25000 && part.price <= 75000;
    if (range === "1000+") return part.price > 75000;
    return true;
  }

  function filteredParts() {
    const price = priceFilter?.value || "all";
    const performance = performanceFilter?.value || "all";
    const availability = availabilityFilter?.value || "all";
    const sort = sortFilter?.value || "default";
    const filtered = PARTS.filter((part) => {
      const categoryMatch = activeCat === "all" || part.cat === activeCat;
      const stockMatch =
        availability === "all" || part.stock === availability || (availability === "preorder" && part.preorder);
      const performanceMatch = performance === "all" || performanceBand(part) === performance;
      return categoryMatch && stockMatch && performanceMatch && matchesPrice(part, price);
    });
    if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
    if (sort === "name") filtered.sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`));
    return filtered;
  }
  const partsGrid = document.getElementById("partsGrid");
  const partCardTemplate = document.getElementById("part-card-template");
  const catBtns = document.querySelectorAll(".cat-btn");
  let activeCat = "all";

  function renderCatalog() {
    const list = filteredParts();
    if (filterResultCount)
      filterResultCount.textContent = `${list.length} ${list.length === 1 ? "part" : "parts"} shown`;
    const fragment = document.createDocumentFragment();
    list.forEach((part) => {
      const card = partCardTemplate.content.firstElementChild.cloneNode(true);
      const stockClass = part.stock === "in" ? "stock-in" : part.stock === "low" ? "stock-low" : "stock-out";
      const stockText = part.stock === "in" ? "In Stock" : part.stock === "low" ? "Low Stock" : "Out of Stock";
      const selected = buildParts.some((selectedPart) => selectedPart.id === part.id);
      card.dataset.id = part.id;
      card.dataset.cat = part.cat;
      card.classList.toggle("limited", Boolean(part.limited));
      card.classList.toggle("preorder", Boolean(part.preorder));
      card.classList.toggle("selected", selected);
      const icon = card.querySelector(".part-icon");
      icon.classList.add(`part-icon-${part.cat}`);
      icon.querySelectorAll("[data-part-icon]").forEach((image) => {
        image.toggleAttribute("hidden", image.dataset.partIcon !== part.cat);
      });
      card.querySelector(".part-category-label").textContent =
        document.querySelector(`.cat-btn[data-cat="${part.cat}"]`)?.dataset.label || "Part";
      const cardResearch = (window.RESEARCHED_PRICES || []).find((item) => item.catalog_id === part.id);
      const cardImage = card.querySelector(".part-image");
      if (cardImage) { cardImage.src = cardResearch?.image_url || ""; cardImage.alt = `${part.brand} ${part.name}`; cardImage.hidden = !cardResearch?.image_url; }
      card.querySelector(".part-brand").textContent = part.brand;
      card.querySelector(".part-name").textContent = part.name;
      card.querySelector(".part-specs").textContent = part.specs;
      card.querySelector(".part-price").textContent = `₹${part.price.toLocaleString("en-IN")}`;
      const stock = card.querySelector(".part-stock");
      stock.classList.add(stockClass);
      stock.textContent = `${stockText}${part.preorder ? " · Ships when available" : ""}`;
      card.querySelector(".select-part").textContent = selected ? "Remove part" : "Select part";
      fragment.appendChild(card);
    });
    partsGrid.replaceChildren(fragment);
  }

  if (partsGrid) {
    partsGrid.addEventListener("click", (event) => {
      const card = event.target.closest(".part-card");
      if (!card) return;
      const part = PARTS.find((candidate) => candidate.id === card.dataset.id);
      if (!part) return;
      if (event.target.closest(".inspect-part")) return openPartInspection(part);
      buildParts.some((selected) => selected.id === part.id) ? removeFromBuild(part.id) : addToBuild(part);
      renderCatalog();
    });
  }

  catBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      catBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCat = btn.dataset.cat;
      renderCatalog();
    });
  });

  [priceFilter, performanceFilter, availabilityFilter, sortFilter].forEach((control) => {
    control?.addEventListener("change", renderCatalog);
  });
  clearFilters?.addEventListener("click", () => {
    if (priceFilter) priceFilter.value = "all";
    if (performanceFilter) performanceFilter.value = "all";
    if (availabilityFilter) availabilityFilter.value = "all";
    if (sortFilter) sortFilter.value = "default";
    renderCatalog();
  });
  const buildList = document.getElementById("buildList");
  const buildItemTemplate = document.getElementById("build-item-template");
  const compatMessageTemplate = document.getElementById("compat-message-template");
  const buildSummary = document.getElementById("buildSummary");
  const totalPriceEl = document.getElementById("totalPrice");
  const compatStatus = document.getElementById("compatStatus");
  const compatMessages = document.getElementById("compatMessages");
  const clearBuildBtn = document.getElementById("clearBuildBtn");
  let buildParts = [];
  try {
    const savedBuild = JSON.parse(localStorage.getItem("renderShopBuild") || "[]");
    buildParts = Array.isArray(savedBuild) ? savedBuild : [];
  } catch (_) {
    localStorage.removeItem("renderShopBuild");
  }

  function addToBuild(part) {
    if (buildParts.find((p) => p.id === part.id)) return;
    buildParts.push(part);
    localStorage.setItem("renderShopBuild", JSON.stringify(buildParts));
    renderBuild();
  }

  function removeFromBuild(id) {
    buildParts = buildParts.filter((p) => p.id !== id);
    localStorage.setItem("renderShopBuild", JSON.stringify(buildParts));
    renderBuild();
  }

  function renderBuild() {
    if (!buildList) return;
    if (buildParts.length === 0) {
      buildList.replaceChildren(document.getElementById("build-empty-template").content.cloneNode(true));
      buildSummary.classList.add("is-hidden");
      clearBuildBtn.classList.add("is-hidden");
      compatMessages.replaceChildren(document.getElementById("compat-empty-template").content.cloneNode(true));
      compatStatus.textContent = "Not checked";
      return;
    }
    clearBuildBtn.classList.remove("is-hidden");
    buildSummary.classList.remove("is-hidden");
    const total = buildParts.reduce((s, p) => s + p.price, 0);
    totalPriceEl.textContent = "₹" + total.toLocaleString("en-IN");

    const buildFragment = document.createDocumentFragment();
    buildParts.forEach((part) => {
      const item = buildItemTemplate.content.firstElementChild.cloneNode(true);
      const name = item.querySelector(".build-item-name");
      const brand = document.createElement("strong");
      brand.textContent = part.brand;
      name.append(brand, ` ${part.name}`);
      item.querySelector(".build-item-price").textContent = `₹${part.price.toLocaleString("en-IN")}`;
      item.querySelector(".remove-part").dataset.id = part.id;
      buildFragment.appendChild(item);
    });
    buildList.replaceChildren(buildFragment);

    buildList.querySelectorAll(".remove-part").forEach((btn) => {
      btn.addEventListener("click", () => removeFromBuild(btn.dataset.id));
    });
    const checks = runCompatibility(buildParts);
    const messageFragment = document.createDocumentFragment();
    checks.forEach((check) => {
      const message = compatMessageTemplate.content.firstElementChild.cloneNode(true);
      message.className = check.type;
      message.textContent = check.msg;
      messageFragment.appendChild(message);
    });
    compatMessages.replaceChildren(messageFragment);
    const allGood = checks.every((c) => c.type === "good");
    compatStatus.textContent = allGood ? "No issues found" : "Compatibility issues found. See below.";
    compatStatus.style.color = allGood ? "var(--green)" : "var(--orange)";
  }

  function runCompatibility(parts) {
    const msgs = [];
    const cpus = parts.filter((p) => p.cat === "cpu");
    const gpus = parts.filter((p) => p.cat === "gpu");
    const mobos = parts.filter((p) => p.cat === "mobo");
    const cases = parts.filter((p) => p.cat === "case");
    const psus = parts.filter((p) => p.cat === "psu");

    const wattsFrom = (text, fallback = 150) => {
      const match = text.match(/(65|120|125|150|253|263|285|320|355|450|\d{3,4})W/i);
      return match ? parseInt(match[1], 10) : fallback;
    };

    if (cpus.length > 0 && mobos.length > 0) {
      for (const cpu of cpus) {
        for (const mobo of mobos) {
          if (
            cpu.brand === "Intel" &&
            !mobo.name.includes("LGA") &&
            !mobo.name.includes("Z790") &&
            !mobo.name.includes("Z890")
          ) {
            msgs.push({
              type: "warn",
              msg: `${cpu.brand} ${cpu.name} may not fit ${mobo.name} (socket mismatch).`,
            });
          }
          if (
            cpu.brand === "AMD" &&
            !mobo.name.includes("AM5") &&
            !mobo.name.includes("AM4") &&
            !mobo.name.includes("TRX")
          ) {
            msgs.push({
              type: "warn",
              msg: `${cpu.brand} ${cpu.name} may not fit ${mobo.name} (socket mismatch).`,
            });
          }
        }
      }
    }
    if (psus.length > 0 && (cpus.length > 0 || gpus.length > 0)) {
      const cpuTDP = cpus.length > 0 ? wattsFrom(cpus[0].specs) : 0;
      const gpuTDP = gpus.length > 0 ? wattsFrom(gpus[0].specs) : 0;
      const estLoad = cpuTDP + gpuTDP + 100;
      for (const psu of psus) {
        const psuW = wattsFrom(psu.name, 0);
        if (psuW > 0 && psuW < estLoad) {
          msgs.push({
            type: "warn",
            msg: `${psu.name} (${psuW}W) may be underpowered for ${cpuTDP}W CPU + ${gpuTDP}W GPU (est. ${estLoad}W load).`,
          });
        }
      }
    }
    if (cases.length > 0 && mobos.length > 0) {
      for (const mobo of mobos) {
        for (const c of cases) {
          if (mobo.name.includes("E-ATX") && !c.name.includes("E-ATX") && !c.name.includes("Full-tower")) {
            msgs.push({
              type: "warn",
              msg: `${mobo.name} (large format) may not fit ${c.name}.`,
            });
          }
        }
      }
    }

    if (msgs.length === 0) {
      msgs.push({ type: "good", msg: "All selected parts appear compatible." });
    }
    return msgs;
  }

  if (clearBuildBtn) {
    clearBuildBtn.addEventListener("click", () => {
      buildParts = [];
      localStorage.removeItem("renderShopBuild");
      renderBuild();
    });
  }
  let inspectionModal;
  const inspectionContentTemplate = document.getElementById("inspection-content-template");
  const inspectionAlternativeTemplate = document.getElementById("inspection-alternative-template");
  function ensureInspectionModal() {
    if (inspectionModal) return inspectionModal;
    inspectionModal = document.getElementById("inspectionBackdrop");
    if (!inspectionModal) return null;
    inspectionModal.querySelector(".inspection-close").addEventListener("click", closePartInspection);
    inspectionModal.addEventListener("click", (event) => {
      if (event.target === inspectionModal) closePartInspection();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !inspectionModal.hidden) closePartInspection();
    });
    return inspectionModal;
  }

  function stockLabel(part) {
    return part.stock === "in"
      ? "In stock"
      : part.stock === "low"
        ? "Low stock"
        : part.stock === "preorder"
          ? "Pre-order"
          : "Out of stock";
  }

  function renderPriceHistory(part, research) {
    const hasHistory = Boolean(research?.history_available && research.history_points?.length);
    const template = document.getElementById(
      hasHistory ? "price-history-loaded-template" : "price-history-unavailable-template",
    );
    const content = template.content.cloneNode(true);
    const summary = content.querySelector(".history-summary");
    summary.textContent =
      research?.history_summary || "No research record is attached yet. The catalog price is shown for planning.";

    const links = content.querySelector(".price-history-links");
    (research?.sources || []).slice(0, 3).forEach((source) => {
      const link = document.getElementById("price-history-source-template").content.firstElementChild.cloneNode(true);
      link.href = source;
      links.appendChild(link);
    });

    if (hasHistory) {
      const points = research.history_points;
      const prices = points.map((point) => point.price);
      const min = Math.min(...prices);
      const span = Math.max(1, Math.max(...prices) - min);
      const chart = content.querySelector(".research-chart");
      const stats = content.querySelector(".research-stats");

      points.forEach((point) => {
        const level = Math.max(1, Math.min(5, Math.round(((point.price - min) / span) * 4) + 1));
        const item = document.getElementById("price-history-point-template").content.firstElementChild.cloneNode(true);
        item.querySelector(".research-bar-value").textContent = `₹${Math.round(point.price).toLocaleString("en-IN")}`;
        item.querySelector(".research-bar").classList.add(`level-${level}`);
        item.querySelector(".research-bar").title = `${point.label}: ₹${point.price.toLocaleString("en-IN")}`;
        item.querySelector("small").textContent = point.label;
        chart.appendChild(item);

        const stat = document.getElementById("price-history-stat-template").content.firstElementChild.cloneNode(true);
        stat.querySelector("small").textContent = point.label;
        stat.querySelector("b").textContent = `₹${point.price.toLocaleString("en-IN")}`;
        stats.appendChild(stat);
      });
    } else {
      const price = `₹${part.price.toLocaleString("en-IN")}`;
      content.querySelector(".research-bar-value").textContent = price;
      content.querySelector(".research-bar").title = `Current reference price: ${price}`;
      const reference = content.querySelector(".inspection-price-reference");
      if (research && !research.history_available) {
        reference.hidden = false;
        reference.textContent = `Sample reference: ${price} · Demonstration data, not a live retailer listing.`;
      }
    }

    return content;
  }

  function openPartInspection(part) {
    const modal = ensureInspectionModal();
    const alternatives = PARTS.filter((candidate) => candidate.cat === part.cat && candidate.id !== part.id)
      .sort((a, b) => Math.abs(a.price - part.price) - Math.abs(b.price - part.price))
      .slice(0, 3);
    const research = (window.RESEARCHED_PRICES || []).find((item) => item.catalog_id === part.id);
    const heuristic =
      part.stock === "out" || part.stock === "preorder"
        ? "Wait or consider an alternative"
        : part.stock === "low" || part.limited
          ? "Buy soon if it fits your build"
          : part.price < 250
            ? "Reasonable to buy now"
            : "Compare before buying";
    const content = inspectionContentTemplate.content.cloneNode(true);
    content.querySelector("#inspectionTitle").textContent = `${part.brand} ${part.name}`;
    content.querySelector(".inspection-specs").textContent = part.specs;
    content.querySelector(".inspection-price").textContent = `₹${part.price.toLocaleString("en-IN")}`;
    const stock = content.querySelector(".inspection-stock");
    stock.classList.add(part.stock === "in" ? "stock-in" : part.stock === "low" ? "stock-low" : "stock-out");
    stock.textContent = stockLabel(part);
    content.querySelector(".inspection-limited").hidden = !part.limited;
    content.querySelector(".inspection-verdict").textContent = heuristic;
    content.querySelector("#priceHistoryPanel").replaceChildren(renderPriceHistory(part, research));
    const alternativeContainer = content.querySelector(".inspection-alternatives");
    if (alternatives.length) {
      const alternativeFragment = document.createDocumentFragment();
      alternatives.forEach((candidate) => {
        const alternative = inspectionAlternativeTemplate.content.firstElementChild.cloneNode(true);
        alternative.dataset.altId = candidate.id;
        alternative.querySelector("span").textContent = `${candidate.brand} ${candidate.name}`;
        alternative.querySelector("strong").textContent = `₹${candidate.price.toLocaleString("en-IN")}`;
        alternativeFragment.appendChild(alternative);
      });
      alternativeContainer.replaceChildren(alternativeFragment);
    } else {
      alternativeContainer.replaceChildren(
        document.getElementById("inspection-empty-alternative-template").content.cloneNode(true),
      );
    }
    content.querySelector(".inspection-select").textContent = buildParts.some(
      (selectedPart) => selectedPart.id === part.id,
    )
      ? "Remove from build"
      : "Add to build";
    modal.querySelector("#inspectionContent").replaceChildren(content);
    modal.hidden = false;
    modal.querySelector(".inspection-select").addEventListener("click", () => {
      if (buildParts.some((selectedPart) => selectedPart.id === part.id)) removeFromBuild(part.id);
      else addToBuild(part);
      closePartInspection();
      if (partsGrid) renderCatalog();
    });
    modal.querySelectorAll(".inspection-alternative").forEach((button) =>
      button.addEventListener("click", () => {
        const alternative = PARTS.find((candidate) => candidate.id === button.dataset.altId);
        if (alternative) openPartInspection(alternative);
      }),
    );
    const askCore = () => requestPartAnalysis(part, modal.querySelector("#inspectionAI"));
    modal.querySelector(".inspection-ai-button").addEventListener("click", askCore);
    askCore();
  }

  async function requestPartAnalysis(part, target) {
    target.textContent = "Core is checking the sample reference price, stock status, and nearby alternatives...";
    const alternatives = PARTS.filter((candidate) => candidate.cat === part.cat && candidate.id !== part.id)
      .sort((a, b) => Math.abs(a.price - part.price) - Math.abs(b.price - part.price))
      .slice(0, 3)
      .map((candidate) => `${candidate.brand} ${candidate.name} (₹${candidate.price.toLocaleString("en-IN")})`)
      .join(", ");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Inspect this PC part and give a concise buy-now/wait recommendation. Part: ${part.brand} ${part.name}. Specs: ${part.specs}. Current listed price: $${part.price}. Stock: ${stockLabel(part)}. Nearby alternatives: ${alternatives || "none"}. This is a demo reference price history; do not present it as live retailer data.`,
            },
          ],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Server returned HTTP ${response.status}.`);
      target.textContent = String(data.text || "").replace(/\*/g, "");
    } catch (error) {
      target.textContent = `Core could not analyze this part right now. ${error.message || ""}`;
    }
  }

  function closePartInspection() {
    if (inspectionModal) inspectionModal.hidden = true;
  }
  if (partsGrid) renderCatalog();
  if (buildList) renderBuild();
}

initializeApp();
