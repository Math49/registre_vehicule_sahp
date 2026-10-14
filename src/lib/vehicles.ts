import "server-only";
import { db } from "./db";
import { normalizeSerial, validateVehicle, type FieldErrors, type VehicleField, type VehicleInput } from "./validation";

export type Vehicle = {
  id: number;
  owner: string;
  model: string;
  serial: string; // entier stocké en texte (pas de limite de chiffres)
  plate: string;
  createdAt: number;
};

export const SORT_KEYS = ["plate", "owner", "model", "serial", "date"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = "asc" | "desc";
export const PER_PAGE = 10;

// Le n° de série est trié numériquement : d'abord par longueur, puis par valeur.
const SORT_SQL: Record<SortKey, (dir: SortDir) => string> = {
  plate: (d) => `plate ${d}`,
  owner: (d) => `owner COLLATE NOCASE ${d}`,
  model: (d) => `model COLLATE NOCASE ${d}`,
  serial: (d) => `length(serial) ${d}, serial ${d}`,
  date: (d) => `created_at ${d}`,
};

const SELECT = "SELECT id, owner, model, serial, plate, created_at AS createdAt FROM vehicles";

export type VehiclePage = {
  items: Vehicle[];
  total: number; // tout le registre
  matching: number; // résultats de la recherche
  page: number;
  pages: number;
  perPage: number;
};

export function listVehicles(opts: { q?: string; sort?: string; dir?: string; page?: number }): VehiclePage {
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(opts.sort ?? "") ? (opts.sort as SortKey) : "date";
  const dir: SortDir = opts.dir === "asc" ? "asc" : "desc";
  const q = (opts.q ?? "").trim().toLowerCase().slice(0, 100);

  let where = "";
  const params: Record<string, string> = {};
  if (q) {
    const esc = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);
    params.q = `%${esc(q)}%`;
    params.qn = `%${esc(q.replace(/\s/g, ""))}%`;
    where = `WHERE lower(owner) LIKE :q ESCAPE '\\'
      OR lower(model) LIKE :q ESCAPE '\\'
      OR serial LIKE :qn ESCAPE '\\'
      OR replace(lower(plate), ' ', '') LIKE :qn ESCAPE '\\'`;
  }

  const total = (db.prepare("SELECT COUNT(*) AS n FROM vehicles").get() as { n: number }).n;
  const args = q ? [params] : [];
  const matching = q ? (db.prepare(`SELECT COUNT(*) AS n FROM vehicles ${where}`).get(...args) as { n: number }).n : total;
  const pages = Math.max(1, Math.ceil(matching / PER_PAGE));
  const page = Math.min(Math.max(1, Math.floor(opts.page || 1)), pages);

  const items = db
    .prepare(`${SELECT} ${where} ORDER BY ${SORT_SQL[sort](dir)}, id ${dir} LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`)
    .all(...args) as Vehicle[];

  return { items, total, matching, page, pages, perPage: PER_PAGE };
}

export function getVehicle(id: number): Vehicle | undefined {
  return db.prepare(`${SELECT} WHERE id = ?`).get(id) as Vehicle | undefined;
}

type SaveResult = { ok: true; vehicle: Vehicle } | { ok: false; errors: FieldErrors<VehicleField> };

/** Normalise + valide une saisie brute (corps JSON non fiable). */
function parse(body: unknown, excludeId?: number): { data?: Omit<Vehicle, "id" | "createdAt">; errors: FieldErrors<VehicleField> } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
  const input: VehicleInput = {
    owner: str(b.owner).trim(),
    model: str(b.model).trim(),
    serial: str(b.serial).trim(),
    plate: str(b.plate).toUpperCase(),
  };
  const errors = validateVehicle(input);
  if (!errors.serial) {
    const dup = db
      .prepare("SELECT id, owner, plate FROM vehicles WHERE serial = ? AND id IS NOT ?")
      .get(normalizeSerial(input.serial), excludeId ?? null) as { owner: string; plate: string } | undefined;
    if (dup) errors.serial = `Ce n° de série est déjà enregistré (${dup.plate.trim()} — ${dup.owner}).`;
  }
  if (Object.keys(errors).length) return { errors };
  return { errors, data: { owner: input.owner, model: input.model, serial: normalizeSerial(input.serial), plate: input.plate } };
}

const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === "SQLITE_CONSTRAINT_UNIQUE";

export function createVehicle(body: unknown): SaveResult {
  const { data, errors } = parse(body);
  if (!data) return { ok: false, errors };
  const now = Date.now();
  try {
    const { lastInsertRowid } = db
      .prepare("INSERT INTO vehicles (owner, model, serial, plate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(data.owner, data.model, data.serial, data.plate, now, now);
    return { ok: true, vehicle: getVehicle(Number(lastInsertRowid))! };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, errors: { serial: "Ce n° de série est déjà enregistré." } };
    throw e;
  }
}

export function updateVehicle(id: number, body: unknown): SaveResult | null {
  if (!getVehicle(id)) return null;
  const { data, errors } = parse(body, id);
  if (!data) return { ok: false, errors };
  try {
    db.prepare("UPDATE vehicles SET owner = ?, model = ?, serial = ?, plate = ?, updated_at = ? WHERE id = ?").run(
      data.owner,
      data.model,
      data.serial,
      data.plate,
      Date.now(),
      id,
    );
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, errors: { serial: "Ce n° de série est déjà enregistré." } };
    throw e;
  }
  return { ok: true, vehicle: getVehicle(id)! };
}

export function deleteVehicle(id: number): Vehicle | null {
  const v = getVehicle(id);
  if (!v) return null;
  db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
  return v;
}
