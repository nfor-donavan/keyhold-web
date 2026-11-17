// Formatting helpers shared by every view. FCFA has no decimals and is
// written with spaces as thousands separators (150 000 FCFA).
export function formatNumber(value) {
  const n = Math.round(Number(value) || 0);
  return (n < 0 ? "-" : "") + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export const formatFCFA = (value) => `${formatNumber(value)} FCFA`;

export function formatDate(str) {
  if (!str) return "—";
  const d = new Date(String(str).length === 10 ? `${str}T00:00:00` : str);
  if (Number.isNaN(d.getTime())) return String(str);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const todayISO = () => isoLocal(new Date());

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

// Renewal notice deadline = lease end date minus the required notice period.
export function renewalDeadline(endDate, noticeDays) {
  if (!endDate) return null;
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  end.setDate(end.getDate() - (parseInt(noticeDays, 10) || 0));
  const date = isoLocal(end);
  return { date, daysLeft: daysUntil(date) };
}

// Only allow http(s) links from user-entered data (blocks javascript: URLs).
export function safeUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}
