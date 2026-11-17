import { h, btn, toast } from "../ui.js";
import { login, register, join } from "../auth.js";

const MODES = {
  login: { tab: "Log in", submit: "Log in", fields: [["email", "Email", "email"], ["password", "Password", "password"]] },
  register: {
    tab: "New organization",
    submit: "Create organization",
    fields: [["companyName", "Company / organization name", "text"], ["name", "Your name", "text"], ["email", "Email", "email"], ["password", "Password", "password"]],
  },
  join: {
    tab: "Join a team",
    submit: "Join organization",
    fields: [["inviteCode", "Invite code", "text"], ["name", "Your name", "text"], ["email", "Email", "email"], ["password", "Password", "password"]],
  },
};

export function renderLogin(onSuccess) {
  let mode = "login";
  const formHost = h("div");
  const tabsHost = h("div", { class: "tabs", role: "tablist" });

  function draw() {
    tabsHost.replaceChildren(
      ...Object.entries(MODES).map(([key, m]) =>
        h("button", { type: "button", role: "tab", class: key === mode ? "active" : "", onclick: () => ((mode = key), draw()) }, m.tab)
      )
    );

    const m = MODES[mode];
    const inputs = {};
    const form = h(
      "form",
      { novalidate: true },
      m.fields.map(([name, label, type]) => {
        inputs[name] = h("input", { id: `lf-${name}`, name, type, autocomplete: name === "password" ? (mode === "login" ? "current-password" : "new-password") : name === "email" ? "email" : "off", required: true });
        return h("div", { class: "field" }, h("label", { for: `lf-${name}` }, label), inputs[name]);
      })
    );
    const submit = btn(m.submit, { variant: "primary", type: "submit" });
    submit.style.width = "100%";
    form.append(submit);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value.trim()]));
      if (Object.values(v).some((x) => !x)) return toast("Please fill in every field.", "error");
      submit.disabled = true;
      submit.textContent = "Please wait…";
      try {
        if (mode === "login") await login(v.email, v.password);
        else if (mode === "register") await register(v.name, v.email, v.password, v.companyName);
        else await join(v.name, v.email, v.password, v.inviteCode);
        onSuccess();
      } catch (err) {
        toast(err.message, "error");
        submit.disabled = false;
        submit.textContent = m.submit;
      }
    });
    formHost.replaceChildren(form);
    inputs[m.fields[0][0]].focus();
  }
  draw();

  return h(
    "div",
    { class: "login-wrap" },
    h(
      "div",
      { class: "login-card" },
      h("div", { class: "card" }, h("div", { class: "brand" }, h("img", { src: "assets/keyhold-icon.png", alt: "" }), h("div", {}, h("b", {}, "Keyhold Admin"), h("span", {}, "Property & land management"))), tabsHost, formHost),
      h(
        "div",
        { class: "login-foot" },
        h("small", {}, "A PRODUCT OF"),
        h("img", { class: "logo-light", src: "assets/nexus-lockup-light.png", alt: "Nexus Tech Labs" }),
        h("img", { class: "logo-dark", src: "assets/nexus-lockup-dark.png", alt: "Nexus Tech Labs" })
      )
    )
  );
}
