import { h, btn, toast, emptyState } from "./ui.js";
import { RESOURCES, getResource } from "./resources.js";
import { isLoggedIn, currentUser, isOwner, logout } from "./auth.js";
import { setUnauthorizedHandler, setWakingHandler } from "./api.js";
import { renderLogin } from "./views/login.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderTeam } from "./views/team.js";
import { renderResource } from "./views/resource.js";

const root = document.getElementById("root");
let shell = null; // { main, nav }
let renderId = 0;

const THEME_KEY = "keyhold:theme";

function effectiveTheme() {
  return document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function toggleTheme() {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
}

function navItems() {
  return [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    ...RESOURCES.map((r) => ({ key: r.key, label: r.label, icon: r.icon })),
    ...(isOwner() ? [{ key: "team", label: "Team", icon: "👥" }] : []),
  ];
}

function buildShell() {
  const user = currentUser();
  const main = h("main", { class: "main", id: "main" });
  const banner = h("div", { class: "banner", hidden: true }, "Waking up the server (it sleeps when idle) — this can take up to a minute…");
  setWakingHandler((on) => (banner.hidden = !on));

  const nav = h(
    "nav",
    { class: "nav", "aria-label": "Main" },
    navItems().map((i) => h("a", { href: `#/${i.key}`, "data-key": i.key }, h("span", { class: "ico" }, i.icon), i.label))
  );

  const sidebar = h(
    "aside",
    { class: "sidebar" },
    h("div", { class: "brand" }, h("img", { src: "assets/keyhold-icon.png", alt: "" }), h("div", {}, h("b", {}, "Keyhold"), h("span", {}, "Admin"))),
    nav,
    h(
      "div",
      { class: "nexus-credit" },
      h("small", {}, "A PRODUCT OF"),
      h("img", { class: "logo-light", src: "assets/nexus-lockup-light.png", alt: "Nexus Tech Labs" }),
      h("img", { class: "logo-dark", src: "assets/nexus-lockup-dark.png", alt: "Nexus Tech Labs" })
    )
  );

  const topbar = h(
    "header",
    { class: "topbar" },
    h("div", {}, h("b", {}, user?.organization?.name || "Your organization")),
    h(
      "div",
      { class: "who" },
      h("span", { class: "muted small" }, `${user?.name || ""}${user?.role === "owner" ? " · Owner" : ""}`),
      btn("Theme", { small: true, onClick: toggleTheme }),
      btn("Log out", {
        small: true,
        onClick: () => {
          logout();
          shell = null;
          history.replaceState(null, "", location.pathname);
          showLogin();
        },
      })
    )
  );

  root.replaceChildren(h("div", { class: "app" }, sidebar, h("div", { class: "content" }, topbar, h("div", { style: "padding:14px 28px 0" }, banner), main)));
  return { main, nav };
}

function showLogin() {
  root.replaceChildren(
    renderLogin(() => {
      shell = null;
      if (location.hash !== "#/dashboard") location.hash = "#/dashboard"; // triggers route()
      else route();
    })
  );
}

async function route() {
  if (!isLoggedIn()) return showLogin();
  if (!shell) shell = buildShell();

  const key = location.hash.replace(/^#\/?/, "") || "dashboard";
  const myId = ++renderId;
  shell.nav.querySelectorAll("a").forEach((a) => a.classList.toggle("active", a.dataset.key === key));
  shell.main.replaceChildren(h("p", { class: "muted" }, "Loading…"));

  const container = h("div");
  try {
    if (key === "dashboard") await renderDashboard(container);
    else if (key === "team") {
      if (!isOwner()) throw new Error("Only the organization owner can manage the team.");
      await renderTeam(container);
    } else {
      const res = getResource(key);
      if (!res) throw new Error("That page doesn't exist.");
      await renderResource(container, res);
    }
    if (myId === renderId) shell.main.replaceChildren(container);
  } catch (err) {
    if (myId !== renderId) return;
    shell.main.replaceChildren(
      h("div", { class: "card" }, emptyState("Couldn't load this page", err.message), h("div", { style: "text-align:center" }, btn("Try again", { onClick: route })))
    );
  }
}

setUnauthorizedHandler(() => {
  if (!isLoggedIn()) return;
  logout();
  shell = null;
  toast("Your session ended — please log in again.", "error");
  showLogin();
});

window.addEventListener("hashchange", route);
route();
