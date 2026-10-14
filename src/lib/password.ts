import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Format stocké : scrypt$<sel hex>$<hash hex>. Même format que scripts/create-admin.mjs.
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

// Hash factice pour garder un temps de réponse constant quand l'identifiant n'existe pas.
export const DUMMY_HASH = hashPassword(randomBytes(12).toString("hex"));
