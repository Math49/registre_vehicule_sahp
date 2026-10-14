import "server-only";
import { db } from "./db";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./password";
import { validatePassword, validateUsername } from "./validation";

export type AdminAccount = { id: number; username: string; createdAt: number };

export function listAdmins(): AdminAccount[] {
  return db.prepare("SELECT id, username, created_at AS createdAt FROM admins ORDER BY created_at, id").all() as AdminAccount[];
}

export function authenticate(username: string, password: string): AdminAccount | null {
  const row = db
    .prepare("SELECT id, username, password_hash AS hash, created_at AS createdAt FROM admins WHERE username = ?")
    .get(username.trim()) as (AdminAccount & { hash: string }) | undefined;
  const ok = verifyPassword(password, row?.hash ?? DUMMY_HASH);
  if (!row || !ok) return null;
  return { id: row.id, username: row.username, createdAt: row.createdAt };
}

type Errors = { u?: string; p?: string };

export function createAdmin(username: string, password: string): { ok: true; admin: AdminAccount } | { ok: false; errors: Errors } {
  const u = username.trim();
  const errors: Errors = { u: validateUsername(u), p: validatePassword(password) };
  if (!errors.u && db.prepare("SELECT 1 FROM admins WHERE username = ?").get(u)) errors.u = "Cet identifiant existe déjà.";
  if (errors.u || errors.p) return { ok: false, errors };
  const now = Date.now();
  const { lastInsertRowid } = db
    .prepare("INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)")
    .run(u, hashPassword(password), now);
  return { ok: true, admin: { id: Number(lastInsertRowid), username: u, createdAt: now } };
}

export function getAdmin(id: number): AdminAccount | undefined {
  return db.prepare("SELECT id, username, created_at AS createdAt FROM admins WHERE id = ?").get(id) as AdminAccount | undefined;
}

/** Change le mot de passe et ferme les autres sessions de ce compte. */
export function setAdminPassword(id: number, password: string, keepSessionOf?: number) {
  db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(hashPassword(password), id);
  if (id !== keepSessionOf) db.prepare("DELETE FROM sessions WHERE admin_id = ?").run(id);
}

export function deleteAdmin(id: number) {
  db.prepare("DELETE FROM admins WHERE id = ?").run(id);
}
