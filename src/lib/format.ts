/** Money is stored as integer paise (1 INR = 100 paise). */
export const IST_TZ = "Asia/Kolkata";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatINR(paise: number | null | undefined): string {
  if (paise == null || Number.isNaN(paise)) return "—";
  return inrFormatter.format(paise / 100);
}

/** Convert a rupee amount typed by a user (e.g. "499" or "499.50") to integer paise. */
export function rupeesToPaise(input: string | number): number | null {
  const str = String(input).trim().replace(/[,₹\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(str)) return null;
  const [whole, frac = ""] = str.split(".");
  const paise = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return Number.isSafeInteger(paise) ? paise : null;
}

export function paiseToRupeesInput(paise: number): string {
  const r = paise / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Today's date in India as YYYY-MM-DD. */
export function istDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST_TZ }).format(d);
}

export function addDaysToDateString(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function weekdayOfDateString(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatDateLabel(date: string): { day: string; num: string; month: string } {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return {
    day: new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(dt),
    num: String(d),
    month: new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(dt),
  };
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: IST_TZ,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: IST_TZ,
  }).format(new Date(iso));
}

export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: IST_TZ,
  }).format(new Date(iso));
}

/** "21:00:00" -> "9:00 pm" */
export function formatClock(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Strip characters that would break a PostgREST filter expression. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[%,()*\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}
