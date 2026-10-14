// Fuseau fixe pour que le rendu serveur et navigateur affichent la même date.
const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "America/Toronto";

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** JJ/MM/AAAA */
export function formatDate(ts: number): string {
  return dateFmt.format(new Date(ts));
}

/** Initiales d'un identifiant : « admin.vasquez » → « VA ». */
export function initials(username: string): string {
  const last = username.split(".").pop() || username;
  return last.slice(0, 2).toUpperCase();
}
