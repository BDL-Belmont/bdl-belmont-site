// Worker du site du BDE.
// Il ne s'occupe QUE de la connexion à l'admin (/api/auth et /api/callback).
// Toutes les autres pages sont servies directement par Cloudflare (fichiers statiques),
// sans passer par ce code (voir "run_worker_first" dans wrangler.jsonc).

const COOKIE_ETAT = "oauth_state";

// ---------- Étape 1 : envoyer le membre s'identifier sur GitHub ----------
function auth(request, env) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response("Variable GITHUB_CLIENT_ID manquante (wrangler.jsonc).", { status: 500 });
  }

  const url = new URL(request.url);
  const state = crypto.randomUUID(); // protège contre les connexions forgées

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", url.origin + "/api/callback");
  // public_repo suffit pour un dépôt public. Dépôt privé : mettre GITHUB_SCOPE=repo.
  authorize.searchParams.set("scope", env.GITHUB_SCOPE || "public_repo");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.href,
      "Set-Cookie": `${COOKIE_ETAT}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=600`,
    },
  });
}

// ---------- Étape 2 : GitHub renvoie le membre ici avec un code ----------
function reponse(statut, contenu, httpStatus) {
  const message = `authorization:github:${statut}:${JSON.stringify(contenu)}`;
  const messageJs = JSON.stringify(message).replace(/</g, "\\u003c");
  const html = `<!doctype html><html><body><script>
(function () {
  var message = ${messageJs};
  function recevoir(e) {
    window.opener.postMessage(message, e.origin);
    window.removeEventListener("message", recevoir, false);
  }
  window.addEventListener("message", recevoir, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script></body></html>`;

  return new Response(html, {
    status: httpStatus,
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Set-Cookie": `${COOKIE_ETAT}=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0`,
    },
  });
}

async function callback(request, env) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookie = request.headers.get("Cookie") || "";
    const etatSauvegarde = (cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_ETAT}=([^;]+)`)) || [])[1];

    if (!code || !state || !etatSauvegarde || state !== etatSauvegarde) {
      return reponse("error", { message: "Connexion invalide ou expirée. Recommence." }, 400);
    }

    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "bde-decap-oauth",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const resultat = await r.json();

    if (resultat.error || !resultat.access_token) {
      return reponse("error", { message: resultat.error_description || "Échec de l'authentification." }, 401);
    }
    return reponse("success", { token: resultat.access_token, provider: "github" }, 200);
  } catch (err) {
    console.error(err);
    return reponse("error", { message: "Erreur interne." }, 500);
  }
}

// ---------- Aiguillage ----------
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method !== "GET") {
      return new Response("Méthode non autorisée", { status: 405 });
    }
    if (pathname === "/api/auth") return auth(request, env);
    if (pathname === "/api/callback") return callback(request, env);
    return new Response("Introuvable", { status: 404 });
  },
};
