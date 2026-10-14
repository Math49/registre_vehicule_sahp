# syntax=docker/dockerfile:1

# ── Base commune ─────────────────────────────────────────────
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── Dépendances ──────────────────────────────────────────────
# better-sqlite3 embarque ses binaires précompilés (prebuilds/), mais npm 10 lance quand même
# `node-gyp rebuild` à cause de son binding.gyp. Aucun paquet n'a besoin de scripts d'installation.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Build Next.js (sortie standalone) ────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Les variables NEXT_PUBLIC_* sont figées au build.
ARG NEXT_PUBLIC_TIMEZONE=America/Toronto
ENV NEXT_PUBLIC_TIMEZONE=$NEXT_PUBLIC_TIMEZONE
RUN npm run build

# ── Image finale ─────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/app/data/registre.db

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Scripts d'administration : docker exec -it <conteneur> node scripts/create-admin.mjs <identifiant>
COPY --from=build --chown=node:node /app/scripts ./scripts

RUN mkdir -p /app/data && chown node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
