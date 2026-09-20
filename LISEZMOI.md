# Site du BDE : Hugo + Decap CMS + Cloudflare Workers

## À personnaliser
1. `hugo.toml` : `title` (et `baseURL` une fois l'adresse connue)
2. `build.sh` : `HUGO_VERSION` (la version affichée par `hugo version`)
3. `wrangler.jsonc` : `name` (identique au nom du projet Cloudflare) et `GITHUB_CLIENT_ID`
4. `static/admin/config.yml` : `repo`, `base_url`, `site_domain`

## Tester en local
    hugo server
puis ouvrir http://localhost:1313

## Réglages du projet Cloudflare (Workers Builds)
- Build command : (vide)
- Deploy command : `npx wrangler deploy`
- Variable de build : `SKIP_DEPENDENCY_INSTALL` = `true`
- Secret du Worker : `GITHUB_CLIENT_SECRET` (Settings > Variables and Secrets, type Secret)

## Dossiers
- `content/` : les textes (modifiables via /admin)
- `layouts/` : les modèles de pages
- `static/` : css, images, interface d'admin (`static/admin/`)
- `src/worker.js` : la connexion GitHub pour l'admin (/api/auth et /api/callback)
- `wrangler.jsonc` et `build.sh` : configuration du déploiement
