// Remplit le registre avec 47 véhicules fictifs (données de la maquette). Usage : npm run seed-demo
import Database from "better-sqlite3";
import path from "node:path";

const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "registre.db");
const db = new Database(file);
const { n } = db.prepare("SELECT COUNT(*) AS n FROM vehicles").get();
if (n > 0) {
  console.log(`Le registre contient déjà ${n} véhicule(s) : rien à faire.`);
  process.exit(0);
}

const OWNERS = ["Marcus Delgado", "Camille Rousseau", "Tyrell Banks", "Sofia Marquez", "Hugo Lefèvre", "Nina Kowalski", "Malik Johnson", "Léa Fontaine", "Diego Ramirez", "Chloé Bernard", "Isaac Thompson", "Yasmine Haddad", "Victor Moreau", "Kenji Watanabe", "Ava Mitchell", "Rafael Ortega", "Inès Garnier", "Dwayne Carter", "Élodie Marchand", "Andre Wallace", "Lucas Petit", "Maya Reyes", "Omar Benali", "Grace Holloway"];
const MODELS = ["Vapid Stanier", "Bravado Buffalo", "Declasse Alamo", "Pegassi Zentorno", "Albany Emperor", "Karin Sultan", "Übermacht Oracle", "Benefactor Schafter", "Vapid Dominator", "Dinka Blista", "Obey Tailgater", "Grotti Carbonizzare", "Canis Mesa", "Bravado Banshee", "Declasse Granger", "Karin Futo", "Vapid Sandking", "Truffade Adder", "Albany Washington", "Pfister Comet"];
let s = 20260;
const r = () => ((s = (s * 16807) % 2147483647), (s - 1) / 2147483646);
const pick = (a) => a[Math.floor(r() * a.length)];
const L = "ABCDEFGHJKLMNPRSTUVWXYZ", D = "0123456789";
const rep = (set, k) => Array.from({ length: k }, () => pick(set)).join("");
const gens = [() => rep(D, 2) + rep(L, 3) + rep(D, 3), () => rep(D, 1) + rep(L, 3) + " " + rep(D, 3), () => rep(L, 3) + " " + rep(D, 4)];
const fixed = [["Jean Dupont", "Vapid Stanier", "SAHP 042"], ["SAHP — Flotte", "Vapid Stanier", "SAHP 001"], ["Marcus Delgado", "Bravado Buffalo", "46EEK572"], ["Camille Rousseau", "Declasse Alamo", "8FKQ 213"], ["Tyrell Banks", "Pegassi Zentorno", "74ZNT118"]];

const base = Date.now() - 225 * 864e5;
const rows = Array.from({ length: 47 }, (_, i) => {
  const f = fixed[i];
  return { owner: f ? f[0] : pick(OWNERS), model: f ? f[1] : pick(MODELS), plate: f ? f[2] : pick(gens)(), ts: base + Math.floor(r() * 225) * 864e5 + i };
}).sort((a, b) => a.ts - b.ts);

const ins = db.prepare("INSERT INTO vehicles (owner, model, serial, plate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
db.transaction(() => rows.forEach((v, i) => ins.run(v.owner, v.model, String(15553 + i), v.plate, v.ts, v.ts)))();
console.log(`${rows.length} véhicules de démo ajoutés.`);
