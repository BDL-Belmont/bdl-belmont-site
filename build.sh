#!/usr/bin/env bash
# Construit le site avec Hugo. Lancé automatiquement par « wrangler deploy » (voir wrangler.jsonc).
set -euo pipefail

# Version de Hugo à utiliser : mets ici celle affichée par `hugo version` sur ton ordinateur.
HUGO_VERSION="${HUGO_VERSION:-0.166.0}"
export TZ="Europe/Paris"

# Sur les serveurs de Cloudflare (Linux), on télécharge la version choisie de Hugo.
# Sur ton ordinateur (Windows/Mac), on utilise le Hugo déjà installé.
if [[ "$(uname -s)" == "Linux" ]]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  echo "Installation de Hugo ${HUGO_VERSION}..."
  curl -sfL -o "$tmp/hugo.tar.gz" \
    "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_linux-amd64.tar.gz"
  mkdir -p "${HOME}/.local/hugo"
  tar -C "${HOME}/.local/hugo" -xf "$tmp/hugo.tar.gz"
  export PATH="${HOME}/.local/hugo:${PATH}"
fi

hugo version
echo "Construction du site..."
hugo build --gc --minify
