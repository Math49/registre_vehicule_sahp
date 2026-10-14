import "server-only";

type Bucket = { hits: number[] };
const g = globalThis as unknown as { __registreRate?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = g.__registreRate ?? (g.__registreRate = new Map());

/**
 * Fenêtre glissante en mémoire, suffisante pour une seule instance du serveur.
 * Retourne true si l'action est autorisée. Avec `consume: false`, vérifie sans compter
 * (on appelle ensuite `recordHit` seulement si l'action a réussi).
 */
export function rateLimit(key: string, limit: number, windowMs: number, consume = true): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  buckets.set(key, b);
  if (b.hits.length >= limit) return false;
  if (consume) recordHit(key, windowMs);
  return true;
}

export function recordHit(key: string, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key) ?? { hits: [] };
  b.hits.push(now);
  buckets.set(key, b);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.hits.some((t) => now - t < windowMs)) buckets.delete(k);
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}
