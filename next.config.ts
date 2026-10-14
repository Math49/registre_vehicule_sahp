import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serveur autonome minimal pour l'image Docker (.next/standalone).
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // La base SQLite locale ne doit jamais être embarquée dans le build.
  outputFileTracingExcludes: { "*": ["data/**"] },
};

export default nextConfig;
