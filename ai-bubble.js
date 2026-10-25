(() => {
  const root = document.querySelector(".core-chat");
  if (!root) return;

  const launcher = root.querySelector(".core-chat-launcher");
  const panel = root.querySelector(".core-chat-panel");
  const header = root.querySelector(".core-chat-header");
  const form = root.querySelector(".core-chat-form");
  const input = form?.querySelector("textarea");
  const messages = root.querySelector(".core-chat-messages");
  const minimize = root.querySelector(".core-chat-minimize");
  const close = root.querySelector(".core-chat-close");
  if (!launcher || !panel || !header || !form || !input || !messages || !minimize || !close) return;

  const history = [];
  let minimized = false;
  let drag;

  function addMessage(text, role) {
    const message = document.createElement("div");
    message.className = `core-chat-message ${role}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    if (open && !minimized) input.focus();
  }

  function setMinimized(value) {
    minimized = value;
    panel.classList.toggle("is-minimized", value);
    minimize.setAttribute("aria-label", value ? "Restore chat" : "Minimize chat");
    minimize.textContent = value ? "+" : "−";
    if (!value) input.focus();
  }

  launcher.addEventListener("click", () => setOpen(panel.hidden));
  document.querySelector(".home-side-chat")?.addEventListener("click", () => launcher.click());
  close.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(false);
  });
  minimize.addEventListener("click", (event) => {
    event.stopPropagation();
    setMinimized(!minimized);
  });

  header.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    const rect = root.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
    root.classList.add("is-dragging");
    header.setPointerCapture(event.pointerId);
  });
  header.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const left = Math.max(8, Math.min(window.innerWidth - root.offsetWidth - 8, event.clientX - drag.x));
    const top = Math.max(8, Math.min(window.innerHeight - root.offsetHeight - 8, event.clientY - drag.y));
    Object.assign(root.style, { left: `${left}px`, top: `${top}px`, right: "auto", bottom: "auto" });
  });
  function stopDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (header.hasPointerCapture(event.pointerId)) header.releasePointerCapture(event.pointerId);
    localStorage.setItem("coreChatPosition", JSON.stringify({ left: root.style.left, top: root.style.top }));
    drag = null;
    root.classList.remove("is-dragging");
  }
  header.addEventListener("pointerup", stopDrag);
  header.addEventListener("pointercancel", stopDrag);

  try {
    const position = JSON.parse(localStorage.getItem("coreChatPosition") || "null");
    if (position?.left && position?.top) {
      Object.assign(root.style, { left: position.left, top: position.top, right: "auto", bottom: "auto" });
    }
  } catch (_) {}

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    history.push({ role: "user", content: text });
    addMessage(text, "user");
    const pending = addMessage("Thinking...", "assistant");
    const submit = form.querySelector("button");
    submit.disabled = true;

    try {
      let build = [];
      try {
        const saved = JSON.parse(localStorage.getItem("renderShopBuild") || "[]");
        build = Array.isArray(saved)
          ? saved.filter((part) => part && typeof part.brand === "string" && typeof part.name === "string")
          : [];
      } catch (_) {
        localStorage.removeItem("renderShopBuild");
      }
      const selected = build.map((part) => `${part.brand} ${part.name}`).join(", ");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...history,
            ...(selected ? [{ role: "user", content: `Current selected parts: ${selected}` }] : []),
          ],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Server returned HTTP ${response.status}.`);
      pending.textContent = data.text;
      history.push({ role: "assistant", content: data.text });
    } catch (error) {
      pending.textContent = `Assistant error: ${error.message || "Unknown error."}`;
    } finally {
      submit.disabled = false;
      input.focus();
    }
  });
})();
