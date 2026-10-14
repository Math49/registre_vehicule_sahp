# Registre des véhicules — SAHP

Registre public des véhicules de la San Andreas Highway Patrol (serveur FiveM).
Consultation et enregistrement publics ; modification, suppression et gestion des comptes réservées aux admins.

Stack : Next.js 16 (App Router) · React 19 · SQLite (better-sqlite3) · CSS natif (tokens du handoff Claude Design).

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis définir ADMIN_USERNAME / ADMIN_PASSWORD
npm run dev                  # http://localhost:3000
```

Au premier démarrage, si aucun admin n'existe, le compte `ADMIN_USERNAME` / `ADMIN_PASSWORD` est créé.
Ensuite, les autres comptes se gèrent depuis le **Panel admin**.

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` puis `npm start` | Production |
| `npm run create-admin -- <identifiant>` | Créer un admin, ou réinitialiser son mot de passe |
| `npm run seed-demo` | Ajouter 47 véhicules fictifs (seulement si le registre est vide) |

## Configuration (`.env.local`)

| Variable | Défaut | Rôle |
|---|---|---|
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | — | Premier admin (créé uniquement si la table est vide) |
| `NEXT_PUBLIC_TIMEZONE` | `America/Toronto` | Fuseau d'affichage des dates JJ/MM/AAAA |
| `DATABASE_PATH` | `data/registre.db` | Fichier SQLite |
| `COOKIE_SECURE` | `true` en production | Cookie de session HTTPS uniquement ; `false` si servi en HTTP |

La base est un simple fichier : pour la sauvegarder, copiez `data/registre.db`.

## Déploiement (GitHub Actions → GHCR → Portainer)

Le workflow [.github/workflows/build.yml](.github/workflows/build.yml) :

1. **check** : `npm ci` + vérification TypeScript (aussi sur les pull requests).
2. **docker** : build de l'image et push sur `ghcr.io/<propriétaire>/registre-vehicule-sahp`
   (tags `latest` sur `main`, `sha-xxxxxxx`, et `1.2.3` / `1.2` pour un tag `v1.2.3`). Pas de push sur les PR.
3. **deploy** : appel `POST` du webhook Portainer, qui va chercher la dernière image (sur `main` et les tags `v*`).

À configurer dans GitHub (Settings → Secrets and variables → Actions) :

| Nom | Type | Rôle |
|---|---|---|
| `PORTAINER_WEBHOOK_URL` | Secret | URL du webhook de la stack Portainer || `TIMEZONE` | Variable (optionnelle) | Fuseau des dates, figé au build (défaut `America/Toronto`) |

Côté Portainer :

- Créer une stack à partir de [docker-compose.yml](docker-compose.yml) et renseigner `ADMIN_USERNAME`, `ADMIN_PASSWORD`
  (et `COOKIE_SECURE=false` si le site n'est pas en HTTPS, sinon la connexion admin échouera).
- Activer le webhook de la stack avec l'option **re-pull image**, et copier son URL dans le secret GitHub.
- Portainer étant en certificat auto-signé, le webhook est appelé sans vérification du certificat (`curl --insecure`).
- Si le package GHCR est privé, ajouter le registre `ghcr.io` dans Portainer (identifiant GitHub + token avec `read:packages`).

La base vit dans le volume `registre-data` (`/app/data/registre.db`) : elle survit aux mises à jour de l'image.
Créer un admin depuis le conteneur :

```bash
docker exec -it registre-sahp node scripts/create-admin.mjs admin.nom
```

## Règles métier

- **Plaque** : exactement 8 caractères `[A-Z0-9 ]`, espaces conservés, majuscules automatiques, non unique.
- **N° de série** : entier unique, sans limite de chiffres (stocké en texte, zéros de tête retirés, tri numérique).
- **Création publique** limitée à 10 enregistrements réussis / 10 min par IP ; connexion limitée à 10 tentatives / 10 min.
  Derrière un reverse proxy, celui-ci doit transmettre `X-Forwarded-For`.
- Un admin ne peut pas supprimer son propre compte (vérifié côté serveur).
- Sessions : cookie httpOnly, 7 jours, mots de passe hashés en scrypt.

## Structure

```
src/app/            pages (/, /connexion, /admin) et API (/api/vehicles, /api/auth, /api/admins)
src/components/     interface (registre, formulaire, plaques, modales, toasts, panel admin)
src/lib/            base SQLite, auth, validation partagée, rate-limit
scripts/            create-admin, seed-demo
design_handoff_registre_sahp/   maquette de référence
```
