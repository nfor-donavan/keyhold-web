// Tiny DOM toolkit. Strings are always inserted as TEXT nodes (never innerHTML),
// so data entered by one staff member can't inject markup into another's page.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "value" || key === "checked" || key === "disabled") el[key] = value;
    else el.setAttribute(key, value === true ? "" : value);
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export const btn = (label, { variant = "", onClick, type = "button", small = false, disabled = false } = {}) =>
  h("button", { class: `btn ${variant} ${small ? "small" : ""}`.trim(), type, onclick: onClick, disabled }, label);

export const badge = (label, tone = "neutral") => h("span", { class: `badge tone-${tone}` }, label);

export const emptyState = (title, subtitle) => h("div", { class: "empty" }, h("b", {}, title), subtitle || "");

export function toast(message, type = "info") {
  let box = document.querySelector(".toasts");
  if (!box) {
    box = h("div", { class: "toasts", "aria-live": "polite" });
    document.body.append(box);
  }
  const el = h("div", { class: `toast ${type}` }, message);
  box.append(el);
  setTimeout(() => el.remove(), type === "error" ? 6000 : 3500);
}

export function openModal({ title, content, actions = [], wide = false }) {
  const overlay = h("div", { class: "overlay" });
  function close() {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    if (!document.querySelector(".overlay")) document.body.classList.remove("modal-open");
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }
  const dialog = h(
    "div",
    { class: `dialog${wide ? " wide" : ""}`, role: "dialog", "aria-modal": "true", "aria-label": title },
    h("div", { class: "dialog-head" }, h("h2", {}, title), h("button", { class: "icon-btn", "aria-label": "Close", type: "button", onclick: close }, "✕")),
    h("div", { class: "dialog-body" }, content),
    actions.length ? h("div", { class: "dialog-actions" }, actions) : null
  );
  overlay.append(dialog);
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
  document.body.classList.add("modal-open");
  dialog.querySelector("input, select, textarea")?.focus();
  return { close, dialog };
}

export function confirmDialog(message, { confirmLabel = "Confirm", danger = false } = {}) {
  return new Promise((resolve) => {
    let modal;
    const done = (value) => {
      modal.close();
      resolve(value);
    };
    modal = openModal({
      title: "Please confirm",
      content: h("p", {}, message),
      actions: [
        btn("Cancel", { onClick: () => done(false) }),
        btn(confirmLabel, { variant: danger ? "danger solid" : "primary", onClick: () => done(true) }),
      ],
    });
  });
}

export function downloadCSV(filename, rows) {
  const cell = (value) => {
    let text = value === null || value === undefined ? "" : String(value);
    // Stop spreadsheet formula injection from text fields (numbers are left alone).
    if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = h("a", { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
