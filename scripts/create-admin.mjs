// Crée (ou réinitialise) un compte admin depuis le terminal.
// Usage : npm run create-admin -- <identifiant>
import Database from "better-sqlite3";
import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const username = (process.argv[2] || "").trim();
if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
  console.error("Usage : npm run create-admin -- <identifiant>  (3 à 32 caractères : minuscules, chiffres, points, tirets)");
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(question)) rl.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = process.env.ADMIN_PASSWORD || (await askHidden("Mot de passe (8 caractères min.) : "));
if (password.length < 8) {
  console.error("Le mot de passe doit contenir au moins 8 caractères.");
  process.exit(1);
}

// Même format que src/lib/password.ts
const salt = randomBytes(16);
const hash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;

const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "registre.db");
fs.mkdirSync(path.dirname(file), { recursive: true });
const db = new Database(file);
db.exec(`CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, created_at INTEGER NOT NULL)`);

const existing = db.prepare("SELECT id FROM admins WHERE username = ?").get(username);
if (existing) {
  db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(hash, existing.id);
  try {
    db.prepare("DELETE FROM sessions WHERE admin_id = ?").run(existing.id);
  } catch {}
  console.log(`Mot de passe de « ${username} » réinitialisé.`);
} else {
  db.prepare("INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)").run(username, hash, Date.now());
  console.log(`Admin « ${username} » créé.`);
}
db.close();
