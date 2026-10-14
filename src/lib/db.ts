import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./password";
import { USERNAME_RE, PASSWORD_MIN } from "./validation";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS vehicles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  owner       TEXT    NOT NULL,
  model       TEXT    NOT NULL,
  serial      TEXT    NOT NULL UNIQUE, -- entier sans limite de taille, chiffres uniquement
  plate       TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vehicles_created ON vehicles(created_at);

CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT    PRIMARY KEY,
  admin_id    INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL
);
`;

function open(): Database.Database {
  const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "registre.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  bootstrapAdmin(db);
  return db;
}

/** Crée le premier admin depuis ADMIN_USERNAME / ADMIN_PASSWORD si la table est vide. */
function bootstrapAdmin(db: Database.Database) {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM admins").get() as { n: number };
  if (n > 0) return;
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn("[registre] Aucun admin. Définissez ADMIN_USERNAME / ADMIN_PASSWORD ou lancez `npm run create-admin`.");
    return;
  }
  if (!USERNAME_RE.test(username) || password.length < PASSWORD_MIN) {
    console.warn("[registre] ADMIN_USERNAME ou ADMIN_PASSWORD invalide, admin initial non créé.");
    return;
  }
  // OR IGNORE : plusieurs processus (workers de build) peuvent démarrer en même temps.
  const { changes } = db
    .prepare("INSERT OR IGNORE INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)")
    .run(username, hashPassword(password), Date.now());
  if (changes) console.log(`[registre] Admin initial « ${username} » créé.`);
}

// Une seule connexion par processus, conservée entre les rechargements en dev.
// Ouverte au premier usage (pas pendant `next build`).
const g = globalThis as unknown as { __registreDb?: Database.Database };
const instance = () => g.__registreDb ?? (g.__registreDb = open());

export const db = new Proxy({} as Database.Database, {
  get(_, prop) {
    const d = instance();
    const value = Reflect.get(d, prop, d);
    return typeof value === "function" ? value.bind(d) : value;
  },
});
