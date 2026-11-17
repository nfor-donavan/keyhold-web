import { api } from "../api.js";
import { h, btn, badge, toast, confirmDialog } from "../ui.js";
import { formatDate } from "../format.js";
import { currentUser } from "../auth.js";

export async function renderTeam(container) {
  const data = await api.get("/team");
  const me = currentUser();
  let members = data.members;

  const codeEl = h("div", { class: "code" }, data.organization.inviteCode);
  const tableHost = h("div", { class: "table-wrap" });

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(codeEl.textContent);
      toast("Invite code copied", "success");
    } catch {
      toast("Couldn't copy automatically — select the code and copy it.", "error");
    }
  }

  async function regenerate() {
    const ok = await confirmDialog("Generate a new invite code? The old code will stop working for new joiners (existing team members are not affected).", { confirmLabel: "Generate new code" });
    if (!ok) return;
    try {
      const res = await api.post("/team/invite-code/regenerate", {});
      codeEl.textContent = res.inviteCode;
      toast("New invite code generated", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function removeMember(member) {
    const ok = await confirmDialog(`Remove ${member.name}? They will lose access immediately.`, { confirmLabel: "Remove", danger: true });
    if (!ok) return;
    try {
      await api.del(`/team/members/${member.id}`);
      members = members.filter((m) => m.id !== member.id);
      renderMembers();
      toast("Member removed", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function renderMembers() {
    tableHost.replaceChildren(
      h(
        "table",
        {},
        h("thead", {}, h("tr", {}, ["Name", "Email", "Role", "Joined", ""].map((t) => h("th", {}, t)))),
        h(
          "tbody",
          {},
          members.map((m) =>
            h(
              "tr",
              {},
              h("td", {}, m.name),
              h("td", {}, m.email),
              h("td", {}, badge(m.role === "owner" ? "Owner" : "Member", m.role === "owner" ? "good" : "neutral")),
              h("td", {}, formatDate(m.createdAt)),
              h("td", {}, m.role !== "owner" && m.id !== me?.id ? btn("Remove", { variant: "danger", small: true, onClick: () => removeMember(m) }) : "")
            )
          )
        )
      )
    );
  }
  renderMembers();

  container.append(
    h("div", { class: "page-head" }, h("div", {}, h("h1", {}, "👥 Team"), h("span", { class: "muted" }, data.organization.name))),
    h(
      "section",
      { class: "card", style: "margin-bottom:14px" },
      h("h2", {}, "Invite code"),
      h("p", { class: "muted" }, "Share this code with staff. They choose “Join a team” on the web or in the mobile app and enter it — they'll then see the same data as everyone else here."),
      codeEl,
      h("div", { class: "toolbar", style: "margin-top:14px" }, btn("Copy code", { onClick: copyCode }), btn("Generate new code", { onClick: regenerate }))
    ),
    h("section", { class: "card" }, h("h2", { style: "margin-bottom:10px" }, `Members (${members.length})`), tableHost)
  );
}
