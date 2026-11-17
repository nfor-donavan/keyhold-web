import { api } from "../api.js";
import { h, badge } from "../ui.js";
import { formatFCFA, formatNumber, formatDate } from "../format.js";
import { currentUser } from "../auth.js";

const STAT_CARDS = [
  { key: "properties", label: "Properties", route: "properties" },
  { key: "land", label: "Land plots", route: "land" },
  { key: "openMaintenance", label: "Open repairs", route: "maintenance" },
  { key: "inspections", label: "Inspections", route: "inspections" },
  { key: "leases", label: "Leases", route: "leases" },
  { key: "rentGroups", label: "Rent groups", route: "rent-groups" },
];

const LAND_ROWS = [
  ["available", "Available"],
  ["reserved", "Reserved"],
  ["sold", "Sold"],
  ["disputed", "Disputed"],
  ["under-survey", "Under survey"],
];
const MAINT_TONES = { open: "bad", "in-progress": "warn", done: "good" };
const MAINT_LABELS = { open: "Open", "in-progress": "In progress", done: "Done" };

const kv = (label, value) => h("div", { class: "kv" }, h("span", { class: "muted" }, label), h("b", {}, value));

export async function renderDashboard(container) {
  const s = await api.get("/dashboard/summary");
  const user = currentUser();
  const totalLand = Object.values(s.land.byStatus).reduce((a, b) => a + b, 0);

  const alerts = s.leases.alerts.length
    ? h(
        "div",
        { class: "table-wrap" },
        h(
          "table",
          {},
          h("thead", {}, h("tr", {}, ["Property", "Lease ends", "Notice by", ""].map((t) => h("th", {}, t)))),
          h(
            "tbody",
            {},
            s.leases.alerts.map((a) =>
              h(
                "tr",
                {},
                h("td", {}, a.property),
                h("td", {}, formatDate(a.endDate)),
                h("td", {}, formatDate(a.deadline)),
                h("td", {}, badge(a.daysLeft < 0 ? "Passed" : `${a.daysLeft}d left`, a.daysLeft < 0 ? "bad" : a.daysLeft <= 30 ? "warn" : "good"))
              )
            )
          )
        )
      )
    : h("p", { class: "muted" }, "Nothing urgent — no renewal-notice deadlines in the next 60 days.");

  const repairs = s.maintenance.oldestOpen.length
    ? h(
        "div",
        { class: "table-wrap" },
        h(
          "table",
          {},
          h("thead", {}, h("tr", {}, ["Issue", "Property", "Status", "Logged"].map((t) => h("th", {}, t)))),
          h(
            "tbody",
            {},
            s.maintenance.oldestOpen.map((m) =>
              h("tr", {}, h("td", {}, m.title), h("td", {}, m.property), h("td", {}, badge(MAINT_LABELS[m.status] || m.status, MAINT_TONES[m.status])), h("td", {}, formatDate(m.dateCreated)))
            )
          )
        )
      )
    : h("p", { class: "muted" }, "No open repairs. 🎉");

  container.append(
    h("div", { class: "page-head" }, h("div", {}, h("h1", {}, `Welcome back, ${(user?.name || "").split(" ")[0] || "there"}`), h("span", { class: "muted" }, user?.organization?.name || ""))),
    h(
      "div",
      { class: "stat-grid" },
      STAT_CARDS.map((c) =>
        h("button", { class: "stat", type: "button", onclick: () => (location.hash = `#/${c.route}`) }, h("div", { class: "num" }, formatNumber(s.counts[c.key])), h("div", { class: "lbl" }, c.label))
      )
    ),
    h(
      "div",
      { class: "panels" },
      h("section", { class: "card panel" }, h("h2", {}, "Lease renewals needing attention"), alerts),
      h("section", { class: "card panel" }, h("h2", {}, "Oldest open repairs"), repairs),
      h(
        "section",
        { class: "card panel" },
        h("h2", {}, "Land overview"),
        totalLand
          ? LAND_ROWS.map(([key, label]) =>
              h("div", { class: "bar-row" }, h("span", {}, label), h("div", { class: "bar-track" }, h("div", { class: "bar-fill", style: `width:${Math.round((s.land.byStatus[key] / totalLand) * 100)}%` })), h("b", {}, s.land.byStatus[key]))
            )
          : h("p", { class: "muted" }, "No land plots yet."),
        kv("Total area", `${formatNumber(s.land.totalSqm)} m²`),
        kv("Value of available plots", formatFCFA(s.land.availableValue))
      ),
      h(
        "section",
        { class: "card panel" },
        h("h2", {}, "Operations"),
        kv("Monthly rent roll (leases)", formatFCFA(s.leases.monthlyRentTotal)),
        kv("Open repair costs (estimated)", formatFCFA(s.maintenance.openCostTotal)),
        kv("Repairs open / in progress / done", `${s.maintenance.byStatus.open} / ${s.maintenance.byStatus["in-progress"]} / ${s.maintenance.byStatus.done}`)
      )
    )
  );
}
