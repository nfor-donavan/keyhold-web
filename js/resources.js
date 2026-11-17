import { h, badge } from "./ui.js";
import { formatFCFA, formatNumber, formatDate, todayISO, renewalDeadline, safeUrl } from "./format.js";
import { calculateSplit } from "./prorate.js";

// ---- shared option lists --------------------------------------------------
const LAND_STATUS = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "disputed", label: "Disputed" },
  { value: "under-survey", label: "Under survey" },
];
const LAND_TONES = { available: "good", reserved: "warn", sold: "neutral", disputed: "bad", "under-survey": "warn" };
const TITLE_STATUS = [
  { value: "titled", label: "Titled" },
  { value: "in-process", label: "Title in process" },
  { value: "no-title", label: "No title" },
  { value: "unknown", label: "Unknown" },
];
const MAINT_STATUS = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Done" },
];
const MAINT_TONES = { open: "bad", "in-progress": "warn", done: "good" };

const labelsOf = (options) => Object.fromEntries(options.map((o) => [o.value, o.label]));

// ---- detail renderers -----------------------------------------------------
function photoGrid(urls = []) {
  const safe = urls.map(safeUrl).filter(Boolean);
  if (!safe.length) return h("p", { class: "muted small" }, "No photos yet.");
  return h(
    "div",
    { class: "photo-grid" },
    safe.map((u) => h("a", { href: u, target: "_blank", rel: "noopener noreferrer" }, h("img", { src: u, alt: "Photo", loading: "lazy" })))
  );
}

function landExtras(rec) {
  const docs = (rec.documents || []).filter((d) => safeUrl(d.url));
  const map = safeUrl(rec.mapLink);
  return [
    map ? h("p", {}, h("a", { href: map, target: "_blank", rel: "noopener noreferrer" }, "🗺️ Open map location")) : null,
    h("div", { class: "section-title" }, "Photos (added from the mobile app)"),
    photoGrid(rec.photos),
    h("div", { class: "section-title" }, "Documents"),
    docs.length
      ? h("ul", {}, docs.map((d) => h("li", {}, h("a", { href: safeUrl(d.url), target: "_blank", rel: "noopener noreferrer" }, `📄 ${d.name}`))))
      : h("p", { class: "muted small" }, "No documents yet."),
  ];
}

function inspectionDetail(rec, ctx) {
  return [
    h("p", {}, h("b", {}, rec.type === "move-in" ? "Move-in" : "Move-out"), ` inspection · ${ctx.propMap[rec.propertyId] || "Unknown property"} · ${formatDate(rec.date)}`),
    ...(rec.rooms || []).map((room) =>
      h(
        "div",
        { class: "room" },
        h("h3", {}, room.name),
        room.notes ? h("p", {}, room.notes) : h("p", { class: "muted small" }, "No notes."),
        (room.photos || []).length ? photoGrid(room.photos) : null
      )
    ),
  ];
}

function rentGroupDetail(rec) {
  const now = new Date();
  const { daysInMonth, totalCost, totalUtilities, results } = calculateSplit({
    members: rec.members || [],
    totalRent: rec.totalRent,
    utilities: rec.utilities || [],
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  return [
    h("p", { class: "muted" }, `${formatFCFA(rec.totalRent)} rent + ${formatFCFA(totalUtilities)} utilities · ${daysInMonth}-day month · split by days present`),
    h(
      "div",
      { class: "table-wrap" },
      h(
        "table",
        {},
        h("thead", {}, h("tr", {}, ["Member", "Moves in (day)", "Days present", "Share"].map((t) => h("th", {}, t)))),
        h(
          "tbody",
          {},
          results.map((m) => h("tr", {}, h("td", {}, m.name), h("td", {}, m.moveInDay), h("td", {}, `${m.daysPresent}/${daysInMonth}`), h("td", {}, formatFCFA(m.share)))),
          h("tr", {}, h("td", {}, h("b", {}, "Total")), h("td"), h("td"), h("td", {}, h("b", {}, formatFCFA(totalCost))))
        )
      )
    ),
    (rec.utilities || []).length
      ? [h("div", { class: "section-title" }, "Utilities"), h("ul", {}, rec.utilities.map((u) => h("li", {}, `${u.name}: ${formatFCFA(u.amount)}`)))]
      : null,
    h("p", { class: "muted small" }, "Rent groups are managed from the mobile app; this is a read-only view."),
  ];
}

// ---- the modules ----------------------------------------------------------
// To add a module: add an entry here (and its route on the API). The list,
// search, sort, CSV export, create/edit form and detail modal all come for free.
export const RESOURCES = [
  {
    key: "properties",
    path: "/properties",
    label: "Properties",
    singular: "property",
    icon: "🏠",
    canCreate: true,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: "name", label: "Name" },
      { key: "address", label: "Address" },
      { key: "createdAt", label: "Added", type: "date" },
    ],
    fields: [
      { key: "name", label: "Name", type: "text", required: true, full: true },
      { key: "address", label: "Address", type: "text", full: true },
    ],
  },
  {
    key: "land",
    path: "/land",
    label: "Land",
    singular: "plot",
    icon: "🗺️",
    canCreate: true,
    canEdit: true,
    canDelete: true,
    defaults: { status: "available", titleStatus: "unknown" },
    filter: { key: "status", label: "All statuses", options: LAND_STATUS },
    columns: [
      { key: "title", label: "Plot" },
      { key: "town", label: "Town" },
      { key: "sizeSqm", label: "Size", type: "number", suffix: " m²" },
      { key: "askingPrice", label: "Asking price", type: "fcfa" },
      { key: "status", label: "Status", type: "badge", labels: labelsOf(LAND_STATUS), tones: LAND_TONES },
      { key: "titleStatus", label: "Title", type: "badge", labels: labelsOf(TITLE_STATUS) },
      { key: "ownerName", label: "Owner" },
    ],
    fields: [
      { key: "title", label: "Plot name", type: "text", required: true, full: true },
      { key: "town", label: "Town / neighbourhood", type: "text" },
      { key: "mapLink", label: "Map link", type: "url" },
      { key: "location", label: "Location / landmarks", type: "textarea", full: true },
      { key: "sizeSqm", label: "Size (m²)", type: "number" },
      { key: "askingPrice", label: "Asking price (FCFA)", type: "number" },
      { key: "status", label: "Status", type: "select", options: LAND_STATUS },
      { key: "titleStatus", label: "Land title", type: "select", options: TITLE_STATUS },
      { key: "titleNumber", label: "Title number", type: "text" },
      { key: "ownerName", label: "Owner / seller", type: "text" },
      { key: "ownerPhone", label: "Owner phone", type: "text" },
      { key: "notes", label: "Notes", type: "textarea", full: true },
    ],
    extras: landExtras,
  },
  {
    key: "maintenance",
    path: "/maintenance",
    label: "Maintenance",
    singular: "request",
    icon: "🛠️",
    canCreate: true,
    canEdit: true,
    canDelete: true,
    defaults: { status: "open" },
    filter: { key: "status", label: "All statuses", options: MAINT_STATUS },
    columns: [
      { key: "title", label: "Issue" },
      { key: "propertyId", label: "Property", type: "property" },
      { key: "vendor", label: "Vendor" },
      { key: "cost", label: "Est. cost", type: "fcfa" },
      { key: "status", label: "Status", type: "badge", labels: labelsOf(MAINT_STATUS), tones: MAINT_TONES },
      { key: "dateCreated", label: "Logged", type: "date" },
    ],
    fields: [
      { key: "propertyId", label: "Property", type: "property", required: true, full: true },
      { key: "title", label: "Issue", type: "text", required: true, full: true },
      { key: "description", label: "Description", type: "textarea", full: true },
      { key: "vendor", label: "Vendor / contractor", type: "text" },
      { key: "cost", label: "Estimated cost (FCFA)", type: "number" },
      { key: "status", label: "Status", type: "select", options: MAINT_STATUS },
    ],
    beforeSave(values, isNew, existing) {
      const out = { ...values };
      if (isNew) out.dateCreated = todayISO();
      out.dateResolved = out.status === "done" ? (existing && existing.dateResolved) || todayISO() : null;
      return out;
    },
  },
  {
    key: "leases",
    path: "/leases",
    label: "Leases",
    singular: "lease",
    icon: "📄",
    canCreate: true,
    canEdit: true,
    canDelete: true,
    defaults: { renewalNoticeDays: 30 },
    columns: [
      { key: "propertyId", label: "Property", type: "property" },
      { key: "monthlyRent", label: "Monthly rent", type: "fcfa" },
      { key: "endDate", label: "Ends", type: "date" },
      {
        label: "Notice deadline",
        value: (r) => renewalDeadline(r.endDate, r.renewalNoticeDays)?.daysLeft ?? "",
        csv: (r) => renewalDeadline(r.endDate, r.renewalNoticeDays)?.date ?? "",
        render: (r) => {
          const d = renewalDeadline(r.endDate, r.renewalNoticeDays);
          if (!d) return "—";
          const tone = d.daysLeft < 0 ? "bad" : d.daysLeft <= 30 ? "warn" : "good";
          return badge(d.daysLeft < 0 ? `Passed · ${formatDate(d.date)}` : `${formatDate(d.date)} · ${d.daysLeft}d`, tone);
        },
      },
    ],
    fields: [
      { key: "propertyId", label: "Property", type: "property", required: true, full: true },
      { key: "monthlyRent", label: "Monthly rent (FCFA)", type: "number" },
      { key: "deposit", label: "Security deposit (FCFA)", type: "number" },
      { key: "startDate", label: "Start date", type: "date" },
      { key: "endDate", label: "End date", type: "date" },
      { key: "renewalNoticeDays", label: "Renewal notice (days before end)", type: "number" },
      { key: "notes", label: "Notes / unusual clauses", type: "textarea", full: true },
    ],
  },
  {
    key: "inspections",
    path: "/inspections",
    label: "Inspections",
    singular: "inspection",
    icon: "📋",
    canDelete: true,
    columns: [
      { key: "propertyId", label: "Property", type: "property" },
      { key: "type", label: "Type", type: "badge", labels: { "move-in": "Move-in", "move-out": "Move-out" } },
      { key: "date", label: "Date", type: "date" },
      { key: "rooms", label: "Rooms", type: "count" },
      { label: "Photos", value: (r) => (r.rooms || []).reduce((n, room) => n + (room.photos || []).length, 0) },
    ],
    detail: inspectionDetail,
    detailTitle: "Inspection",
  },
  {
    key: "rent-groups",
    path: "/rent-groups",
    label: "Rent groups",
    singular: "rent group",
    icon: "💸",
    canDelete: true,
    columns: [
      { key: "name", label: "Group" },
      { key: "propertyId", label: "Property", type: "property" },
      { key: "members", label: "Members", type: "count" },
      { key: "totalRent", label: "Monthly rent", type: "fcfa" },
    ],
    detail: rentGroupDetail,
    detailTitle: "Rent group",
  },
];

export const getResource = (key) => RESOURCES.find((r) => r.key === key);
