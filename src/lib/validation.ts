// Règles partagées entre le navigateur et le serveur.

export const PLATE_LENGTH = 8;
export const OWNER_MAX = 60;
export const MODEL_MAX = 40;
export const PASSWORD_MIN = 8;

export type VehicleInput = { owner: string; model: string; serial: string; plate: string };
export type VehicleField = keyof VehicleInput;
export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Filtre la saisie de plaque : majuscules, [A-Z0-9 ] uniquement, 8 caractères max. */
export function sanitizePlateInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, PLATE_LENGTH);
}

/** Filtre la saisie du n° de série : chiffres uniquement, sans limite de longueur. */
export function sanitizeSerialInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Forme canonique d'un n° de série valide : « 015600 » → « 15600 ». */
export function normalizeSerial(serial: string): string {
  return serial.replace(/^0+(?=\d)/, "");
}

export function validateVehicle(f: VehicleInput): FieldErrors<VehicleField> {
  const e: FieldErrors<VehicleField> = {};
  const owner = f.owner.trim();
  const model = f.model.trim();
  const serial = f.serial.trim();

  if (!owner) e.owner = "Champ requis.";
  else if (owner.length > OWNER_MAX) e.owner = `${OWNER_MAX} caractères maximum.`;

  if (!model) e.model = "Champ requis.";
  else if (model.length > MODEL_MAX) e.model = `${MODEL_MAX} caractères maximum.`;

  if (!serial) e.serial = "Champ requis.";
  else if (!/^\d+$/.test(serial)) e.serial = "Le n° de série doit être un nombre.";

  if (!f.plate.length) e.plate = "Champ requis.";
  else if (f.plate.length !== PLATE_LENGTH)
    e.plate = `La plaque doit contenir exactement ${PLATE_LENGTH} caractères (actuellement ${f.plate.length}).`;
  else if (!/^[A-Z0-9 ]+$/.test(f.plate)) e.plate = "Lettres, chiffres et espaces uniquement.";
  else if (!/[A-Z0-9]/.test(f.plate)) e.plate = "La plaque doit contenir au moins une lettre ou un chiffre.";

  return e;
}

export type AccountInput = { username: string; password: string; confirm: string };
export type AccountField = "u" | "p" | "c";

export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

export function validateUsername(u: string): string | undefined {
  const v = u.trim();
  if (!v) return "Champ requis.";
  if (!USERNAME_RE.test(v)) return "3 à 32 caractères : minuscules, chiffres, points ou tirets.";
  return undefined;
}

export function validatePassword(p: string): string | undefined {
  if (!p) return "Champ requis.";
  if (p.length < PASSWORD_MIN) return `${PASSWORD_MIN} caractères minimum.`;
  if (p.length > 200) return "200 caractères maximum.";
  return undefined;
}

export function errorCount(e: object): number {
  return Object.values(e).filter(Boolean).length;
}
