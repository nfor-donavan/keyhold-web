import { api } from "../api.js";
import { h, btn, badge, emptyState, toast, openModal, confirmDialog, downloadCSV } from "../ui.js";
import { formatFCFA, formatNumber, formatDate, todayISO } from "../format.js";

const makeCtx = (properties) => ({
  properties,
  propMap: Object.fromEntries(properties.map((p) => [p._id, p.name])),
});

// Plain value used for sorting and searching.
function rawValue(col, rec, ctx) {
  if (col.value) return col.value(rec, ctx);
  const v = rec[col.key];
  if (col.type === "property") return ctx.propMap[v] || "";
  if (col.type === "badge") return (col.labels && col.labels[v]) ?? v ?? "";
  if (col.type === "count") return Array.isArray(v) ? v.length : 0;
  return v ?? "";
}

const csvValue = (col, rec, ctx) => (col.csv ? col.csv(rec, ctx) : rawValue(col, rec, ctx));

function displayCell(col, rec, ctx) {
  if (col.render) return col.render(rec, ctx);
  const raw = rawValue(col, rec, ctx);
  switch (col.type) {
    case "fcfa":
      return raw ? formatFCFA(raw) : "—";
    case "number":
      return raw ? formatNumber(raw) + (col.suffix || "") : "—";
    case "date":
      return formatDate(raw);
    case "badge":
      return raw === "" ? "—" : badge(String(raw), col.tones && col.tones[rec[col.key]]);
    default:
      return raw === "" || raw === null || raw === undefined ? "—" : String(raw);
  }
}

function buildForm(res, record, ctx) {
  const values = { ...(res.defaults || {}), ...(record || {}) };
  const controls = {};
  const grid = h("div", { class: "form-grid" });

  for (const f of res.fields) {
    const id = `f-${f.key}`;
    let control;
    if (f.type === "textarea") {
      control = h("textarea", { id, rows: 3 });
    } else if (f.type === "select" || f.type === "property") {
      const options = f.type === "property" ? ctx.properties.map((p) => ({ value: p._id, label: p.name })) : f.options;
      control = h(
        "select",
        { id },
        f.type === "property" ? h("option", { value: "" }, options.length ? "Choose a property…" : "No properties yet — add one first") : null,
        options.map((o) => h("option", { value: o.value }, o.label))
      );
    } else {
      const type = { number: "number", date: "date", url: "url" }[f.type] || "text";
      control = h("input", { id, type, min: f.type === "number" ? "0" : null, step: f.type === "number" ? "1" : null });
    }
    const current = values[f.key];
    control.value = current === undefined || current === null ? "" : String(current);
    controls[f.key] = control;
    grid.append(h("div", { class: `field${f.full ? " full" : ""}` }, h("label", { for: id }, f.label + (f.required ? " *" : "")), control));
  }

  function getValues() {
    const out = {};
    let valid = true;
    for (const f of res.fields) {
      const raw = controls[f.key].value.trim();
      controls[f.key].closest(".field").classList.toggle("invalid", Boolean(f.required && !raw));
      if (f.required && !raw) valid = false;
      out[f.key] = f.type === "number" ? (raw === "" ? 0 : Number(raw)) : raw;
    }
    if (!valid) toast("Please fill in the required fields.", "error");
    return valid ? out : null;
  }

  return { el: grid, getValues };
}

export async function renderResource(container, res) {
  const [loaded, propResult] = await Promise.all([api.get(res.path), res.key === "properties" ? null : api.get("/properties")]);
  let records = loaded;
  let ctx = makeCtx(res.key === "properties" ? records : propResult);

  let query = "";
  let filterValue = "";
  let sortCol = null;
  let sortDir = 1;

  const countEl = h("span", { class: "muted" });
  const tableHost = h("div", { class: "table-wrap" });

  function visibleRecords() {
    let list = records;
    if (res.filter && filterValue) list = list.filter((r) => r[res.filter.key] === filterValue);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((r) => {
        const hay = [...res.columns.map((c) => rawValue(c, r, ctx)), ...(res.fields || []).map((f) => r[f.key])];
        return hay.some((v) => typeof v !== "object" && String(v ?? "").toLowerCase().includes(q));
      });
    }
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const va = rawValue(sortCol, a, ctx);
        const vb = rawValue(sortCol, b, ctx);
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * sortDir;
        return String(va).localeCompare(String(vb), undefined, { numeric: true }) * sortDir;
      });
    }
    return list;
  }

  function renderTable() {
    const list = visibleRecords();
    countEl.textContent = `${list.length} of ${records.length}`;
    if (!list.length) {
      tableHost.replaceChildren(emptyState(records.length ? "No matches" : `No ${res.label.toLowerCase()} yet`, records.length ? "Try a different search or filter." : res.canCreate ? `Use “New ${res.singular}” to add the first one.` : "They'll appear here once they're created in the mobile app."));
      return;
    }
    const head = h(
      "tr",
      {},
      res.columns.map((col) => {
        const arrow = sortCol === col ? (sortDir === 1 ? " ▲" : " ▼") : "";
        return h(
          "th",
          {
            class: "sortable",
            onclick: () => {
              if (sortCol === col) sortDir = -sortDir;
              else {
                sortCol = col;
                sortDir = 1;
              }
              renderTable();
            },
          },
          col.label + arrow
        );
      })
    );
    const body = list.map((rec) =>
      h("tr", { class: "clickable", onclick: () => openRecord(rec) }, res.columns.map((col) => h("td", {}, displayCell(col, rec, ctx))))
    );
    tableHost.replaceChildren(h("table", {}, h("thead", {}, head), h("tbody", {}, body)));
  }

  async function reload() {
    records = await api.get(res.path);
    if (res.key === "properties") ctx = makeCtx(records);
    renderTable();
  }

  async function remove(rec, modal) {
    const ok = await confirmDialog(`Delete this ${res.singular}? This can't be undone.`, { confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      await api.del(`${res.path}/${rec._id}`);
      toast(`${res.singular[0].toUpperCase()}${res.singular.slice(1)} deleted`, "success");
      modal.close();
      await reload();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function openRecord(rec) {
    if (res.canEdit) return openForm(rec);
    const modal = openModal({
      title: res.detailTitle || res.label,
      wide: true,
      content: res.detail(rec, ctx),
      actions: [res.canDelete ? btn("Delete", { variant: "danger spacer", onClick: () => remove(rec, modal) }) : null, btn("Close", { onClick: () => modal.close() })].filter(Boolean),
    });
  }

  function openForm(rec) {
    const isNew = !rec;
    const form = buildForm(res, rec, ctx);
    const saveBtn = btn("Save", { variant: "primary" });
    const extras = rec && res.extras ? res.extras(rec, ctx) : [];
    const modal = openModal({
      title: isNew ? `New ${res.singular}` : `Edit ${res.singular}`,
      wide: Boolean(extras.length),
      content: [form.el, ...extras],
      actions: [
        !isNew && res.canDelete ? btn("Delete", { variant: "danger spacer", onClick: () => remove(rec, modal) }) : null,
        btn("Cancel", { onClick: () => modal.close() }),
        saveBtn,
      ].filter(Boolean),
    });
    saveBtn.addEventListener("click", async () => {
      const values = form.getValues();
      if (!values) return;
      const payload = res.beforeSave ? res.beforeSave(values, isNew, rec) : values;
      saveBtn.disabled = true;
      try {
        if (isNew) await api.post(res.path, payload);
        else await api.put(`${res.path}/${rec._id}`, payload);
        toast("Saved", "success");
        modal.close();
        await reload();
      } catch (err) {
        toast(err.message, "error");
        saveBtn.disabled = false;
      }
    });
  }

  const search = h("input", {
    type: "search",
    placeholder: `Search ${res.label.toLowerCase()}…`,
    "aria-label": "Search",
    oninput: (e) => {
      query = e.target.value.trim();
      renderTable();
    },
  });

  const filter = res.filter
    ? h(
        "select",
        {
          "aria-label": "Filter",
          onchange: (e) => {
            filterValue = e.target.value;
            renderTable();
          },
        },
        h("option", { value: "" }, res.filter.label),
        res.filter.options.map((o) => h("option", { value: o.value }, o.label))
      )
    : null;

  const exportBtn = btn("Export CSV", {
    onClick: () => {
      const list = visibleRecords();
      downloadCSV(`${res.key}-${todayISO()}.csv`, [res.columns.map((c) => c.label), ...list.map((r) => res.columns.map((c) => csvValue(c, r, ctx)))]);
    },
  });

  container.append(
    h("div", { class: "page-head" }, h("div", {}, h("h1", {}, `${res.icon} ${res.label}`), countEl), h("div", { class: "toolbar" }, search, filter, exportBtn, res.canCreate ? btn(`New ${res.singular}`, { variant: "primary", onClick: () => openForm(null) }) : null)),
    h("div", { class: "card" }, tableHost)
  );
  renderTable();
}
