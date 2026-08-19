# Déploiement Render (backend) + Vercel (frontend) — Design Spec

**Date:** 2026-08-19
**Status:** Approved
**Context:** Rendre l'application déployable sur des offres gratuites : backend Flask sur Render (runtime natif Python), frontend Vite/React sur Vercel, code sur GitHub (branche `develop`). L'audit du repo montre un code déjà portable (aucune URL en dur, aucune écriture disque, DB déjà externe sur Supabase) mais quatre blocs bloquants : une fuite de connexions Postgres, l'absence de tout artefact de déploiement backend, l'absence de configuration SPA côté Vercel, et une hygiène de secrets incomplète.

**Le bloc 1 (fuite de connexions) a été corrigé et vérifié dans le commit de ce spec.** Il reste documenté ci-dessous parce que sa configuration d'environnement — pooler Supabase et renommage `PORT` → `DB_PORT` — conditionne les blocs suivants.

## Goals

- Le backend démarre sur Render en runtime natif Python, servi par gunicorn, avec des dépendances verrouillées.
- Le backend tient la charge d'une démo sans saturer le quota de connexions Postgres de Supabase free.
- Le frontend se déploie sur Vercel avec un routage SPA correct (pas de 404 au refresh).
- Une configuration manquante échoue **au démarrage avec un message explicite**, jamais silencieusement en production.
- Un document unique (`DEPLOY.md`) permet de refaire le déploiement de zéro sans relire le code.

## Non-goals

- Docker / `render.yaml` (blueprint) — décision prise : runtime natif. Le Dockerfile reste la porte de sortie si une dépendance système apparaît un jour.
- Montée de version de Flask, Werkzeug ou marshmallow — on **verrouille** l'existant, on ne le modernise pas dans ce chantier.
- CI/CD, tests automatisés, domaine custom, monitoring externe.
- Refonte des routes ou de la logique métier. Les 65 sites d'appel DB ne doivent **pas** être modifiés.
- Migration vers un ORM ou vers le SDK Supabase.

## Décision d'architecture

**Runtime natif Python + uv + gunicorn.**

Le stack n'a aucune dépendance système : `psycopg2-binary` fournit des wheels précompilés, `langchain-*` est du Python pur, et la génération PDF est côté client (`html2pdf.js`). Docker n'apporterait que du temps de build en plus sur un quota free limité. uv est retenu parce que le point faible actuel est précisément la reproductibilité : `langchain-core` et `langchain-nvidia-ai-endpoints` ne sont pas versionnés, et `Werkzeug` (3.1.3 en local) est absent de `requirements.txt`.

```
GitHub (branche develop)
   │
   ├──> Render — root directory: backend/
   │      build : uv sync --frozen
   │      start : uv run gunicorn wsgi:app --bind 0.0.0.0:$PORT ...
   │      health: /healthz
   │        │
   │        └──> Supabase Postgres (Supavisor, transaction pooler :6543)
   │
   └──> Vercel — root directory: frontend/
          build : npm run build  →  dist/
          rewrite SPA : /(.*) → /index.html
          env : VITE_API_URL = https://<service>.onrender.com/api
```

---

## Bloc 1 — Fuite de connexions Postgres — ✅ FAIT

### Problème

`backend/db.py` ouvre une connexion par appel. Le repo compte **64 `with get_connection()` et zéro `conn.close()`**.

En psycopg2, `with conn:` gère la **transaction** (commit en sortie normale, rollback sur exception) — il **ne ferme pas** la connexion. En local, avec le serveur de dev mono-process relancé souvent, ça ne se voit pas. Sur Render avec gunicorn multi-workers et Supabase free (60 connexions directes), la saturation arrive en quelques dizaines de requêtes : `FATAL: too many connections`.

### Solution retenue et appliquée

Les 65 appels n'utilisent que **deux formes syntaxiques** :

```python
with get_connection() as conn:
with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
```

Les deux consomment uniquement la valeur produite par `__enter__`. On peut donc remplacer l'objet connexion par un **context manager** qui produit cette même connexion et se charge, lui, de la libérer — **sans toucher un seul site d'appel**. C'est ce qui rend ce bloc à faible risque malgré son ampleur.

`db.py` est réécrit autour de :

- un `ThreadedConnectionPool` psycopg2, **créé paresseusement, une fois par processus** (compatible avec le fork de gunicorn : aucun pool ne préexiste au fork) ;
- `get_connection()` décoré `@contextmanager`, qui emprunte au pool, produit la connexion, puis en sortie :
  - sortie normale → `commit()`,
  - exception → `rollback()` puis propagation,
  - dans tous les cas → retour de la connexion au pool (`putconn`), y compris via `finally`.

**Sémantique préservée :** un `return` à l'intérieur du `with` (motif très présent, ex. `routes/auth.py:34` qui renvoie un 409 depuis le bloc) est une sortie normale et **committe**, exactement comme avant. Les `conn.commit()` explicites déjà présents dans les routes restent valides — un commit sans transaction en attente est un no-op.

Détail retenu au passage : `DB_POOL_MAX` doit rester **supérieur ou égal au nombre de threads gunicorn par worker**, car psycopg2 lève `PoolError` quand le pool est épuisé au lieu d'attendre une connexion libre. Défaut fixé à 5, pour la commande de démarrage à 4 threads du bloc 2.

### Correction annexe : collision `PORT`

`db.py` lisait `os.getenv("PORT")` pour le port Postgres. Or `PORT` est la variable **réservée par Render** pour le port HTTP du service — celle que gunicorn utilise dans `--bind 0.0.0.0:$PORT`. Une même variable ne peut pas porter les deux sens.

Les noms canoniques deviennent donc `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`, avec repli sur les anciens noms (`USER_DB`, `PASSWORD_DB`, `HOST`, `PORT`, `DBNAME`) pour que le `.env` local continue de fonctionner sans modification. Seul `DB_PORT` refuse ce repli lorsque la variable `RENDER` est présente, et lève une erreur nommant explicitement le conflit.

### Vérification effectuée

Chemins validés sur pool simulé : sortie normale → commit ; `return` anticipé → commit ; exception → rollback puis propagation ; connexion morte → fermée au lieu d'être recyclée ; les deux syntaxes d'appel réelles ; repli sur les anciens noms de variables ; garde `DB_PORT`/`RENDER`.

Validé également contre la base Supabase réelle : après deux emprunts successifs, le pool interne ne contient qu'**une seule connexion**, ce qui démontre la réutilisation effective et l'absence de fuite.

### Reste à faire sur ce bloc (configuration, pas code)

Bascule de la connexion directe vers le **Supavisor transaction pooler** de Supabase, à traiter dans `.env.example` et `DEPLOY.md` (bloc 4) :

- `DB_PORT` = `6543` au lieu de `5432` ;
- `DB_USER` prend la forme `postgres.<project-ref>` et non `postgres`.

Le mode transaction est compatible avec psycopg2 : le driver interpole les paramètres côté client et n'utilise pas de *prepared statements* serveur par défaut, ce qui est la seule incompatibilité connue de ce mode.

---

## Bloc 2 — Artefacts de déploiement backend

### Point d'entrée WSGI

`backend/app.py:80` n'instancie l'application que sous `if __name__ == '__main__'`. Aucun objet `app` n'existe au niveau module, donc `gunicorn app:app` échoue. On ajoute `backend/wsgi.py` :

```python
from app import create_app
app = create_app()
```

`app.py` n'est pas modifié : le bloc `__main__` reste le point d'entrée de développement.

### Dépendances et version de Python

`backend/requirements.txt` est remplacé par `backend/pyproject.toml` + `backend/uv.lock`. **`uv.lock` doit être dans `backend/`**, pas à la racine du repo : c'est le root directory du service Render qui fait foi, et c'est la présence de ce fichier qui déclenche la détection uv.

Versions à verrouiller — celles qui tournent en local, vérifiées via le venv :

| Paquet | Version | Remarque |
|---|---|---|
| Flask | 2.3.3 | inchangé |
| Werkzeug | 3.1.3 | **absent** de `requirements.txt` aujourd'hui ; Flask 2.3.3 déclare `>=2.3.7`, donc non verrouillé la résolution peut casser |
| Flask-Cors | 4.0.0 | inchangé |
| Flask-JWT-Extended | 4.5.3 | inchangé |
| Flask-Bcrypt | 1.0.1 | + `bcrypt` 5.0.0 |
| psycopg2-binary | 2.9.7 | **pas de wheel cp313** — d'où le pin Python ci-dessous |
| marshmallow | 3.20.1 | inchangé |
| email-validator | 2.0.0 | inchangé |
| langchain-core | 1.5.3 | **non versionné** aujourd'hui |
| langchain-nvidia-ai-endpoints | 1.4.3 | **non versionné** aujourd'hui |
| python-dotenv | 1.0.0 | inchangé |
| gunicorn | à ajouter | absent du projet |

`backend/.python-version` fixe **3.11.9** (la version locale). Render utilise sinon un Python 3.13 par défaut, sur lequel `psycopg2-binary==2.9.7` n'a pas de wheel et le build échoue à la compilation. Ce fichier est lu à la fois par Render et par uv, ce qui garde les deux cohérents. Point de vigilance documenté : sur Render, **la version de Python ne se configure pas via uv** — ni `requires-python`, ni `uv python pin` ne pilotent le runtime.

### Commandes Render

- Root directory : `backend`
- Build : `uv sync --frozen`
- Start : `uv run gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --worker-class gthread --timeout 120`

Le `--timeout 120` n'est pas décoratif : le défaut gunicorn est de 30 s, et les routes `/api/crm-ai/*` appellent des modèles NVIDIA dont la latence dépasse régulièrement ce seuil. Sans ce réglage, le worker est tué en plein appel LLM et le client reçoit une erreur incompréhensible. `gthread` + 4 threads permet d'absorber ces attentes I/O sans multiplier les processus, ce qui compte sur les 512 Mo du free tier.

### Garde sur `CORS_ORIGINS`

`backend/app.py:41` fait `os.getenv('CORS_ORIGINS').split(',')` sans garde : si la variable manque, c'est un `AttributeError` au boot, avec un message qui ne désigne pas la cause. On aligne le comportement sur celui, déjà correct, de `SECRET_KEY` / `JWT_SECRET_KEY` : un `RuntimeError` nommant explicitement la variable manquante.

Les URLs de preview Vercel changent à chaque déploiement et ne peuvent pas être listées à l'avance. On ajoute donc une variable optionnelle `CORS_ALLOW_VERCEL_PREVIEWS` (défaut : désactivé) qui, si activée, ajoute un motif regex `^https://.*\.vercel\.app$` à la liste des origines — flask-cors accepte les regex dans `origins`. Désactivé par défaut, parce qu'ouvrir toute la plateforme Vercel en production est un choix, pas un défaut raisonnable.

### Endpoint de santé

`GET /healthz`, sans authentification, enregistré directement dans `create_app()` :

- par défaut : réponse `200 {"status": "ok"}` sans toucher la base — un health check ne doit pas dépendre d'un service tiers, sinon Render redémarre en boucle un backend sain lors d'une coupure Supabase ;
- avec `?db=1` : effectue en plus un `SELECT 1` et renvoie `503` en cas d'échec — utile pour diagnostiquer manuellement.

Renseigné dans le champ *Health Check Path* de Render.

### Spin-down du free tier

Le service s'endort après 15 min sans trafic entrant ; le réveil prend ~1 min. Deux implications :

- Côté frontend, le timeout axios par défaut (aucun) laisse l'utilisateur devant une interface figée. On documente le comportement, sans le contourner par du code.
- Un pinger externe peut maintenir le service éveillé, mais le quota free est de 750 heures d'instance par mois pour l'espace de travail, et un service éveillé 24/7 en consomme ~744. C'est jouable, mais cela ne laisse aucune marge pour un second service gratuit. À documenter comme un arbitrage, pas comme une recommandation.

---

## Bloc 3 — Frontend Vercel

### Routage SPA

L'application utilise `react-router-dom`. Sans configuration, un accès direct ou un refresh sur `/dashboard` renvoie un 404 Vercel : le fichier n'existe pas sur le disque statique. On ajoute `frontend/vercel.json` avec une réécriture de toutes les routes vers `/index.html`, laissant le routeur client prendre le relais.

### Garde sur `VITE_API_URL`

`frontend/src/services/api.js:3` lit `import.meta.env.VITE_API_URL` sans repli. Si la variable est oubliée dans Vercel, `baseURL` vaut `undefined`, axios bascule sur des URLs relatives, et les appels partent vers le domaine Vercel où ils renvoient l'`index.html` — un HTML reçu là où du JSON est attendu, avec des symptômes très éloignés de la cause.

On ajoute une vérification au chargement du module qui lève une erreur explicite si la variable est absente. Même principe que côté backend : échouer tôt et nommer la variable.

### Réglages Vercel

- Root directory : `frontend`
- Framework preset : Vite — Build `npm run build`, Output `dist`
- Branche de production : `develop` (et non `main`)
- Variable `VITE_API_URL` = `https://<service>.onrender.com/api`, à définir sur les environnements Production **et** Preview

Rappel de sécurité à inscrire dans `DEPLOY.md` : tout ce qui est préfixé `VITE_` est inliné en clair dans le bundle. `SUPABASE_SERVICE_ROLE_KEY` et `NVIDIA_API_KEY` ne doivent exister que côté Render. C'est correct aujourd'hui ; il s'agit de ne pas le casser.

---

## Bloc 4 — Hygiène du repo et des secrets

### `.gitignore`

La règle racine ne couvre que `.env`. Les fichiers `.env.local`, `.env.production` ou `.env.render` ne sont pas ignorés à la racine ni dans `backend/` (le frontend est couvert par son `*.local` local, mais par accident plutôt que par intention). On remplace par une règle explicite : ignorer `.env*`, ré-autoriser `.env.example`.

### Audit de l'historique

`backend/.env` contient des secrets réels (clés Supabase et NVIDIA) et est aujourd'hui correctement ignoré. Reste à vérifier qu'il n'a jamais été committé dans l'historique : `git log --all --full-history -- backend/.env`. Un `.gitignore` ajouté après coup ne retire rien de l'historique. Si un commit est trouvé, les clés sont à considérer comme compromises et à faire tourner — la réécriture d'historique est un second sujet, à trancher séparément.

### `DEPLOY.md`

Document unique à la racine, contenant : les réglages exacts des deux services (root directory, commandes, branche, health check path), le tableau complet des variables d'environnement avec leur destination (Render vs Vercel) et lesquelles sont secrètes, la procédure de récupération des identifiants du pooler Supabase, l'ordre de déploiement (backend d'abord, puis `CORS_ORIGINS` mis à jour avec l'URL Vercel obtenue), et les symptômes des pannes attendues (cold start, `too many connections`, 404 au refresh).

Note sur l'ordre : les deux services se référencent mutuellement (`VITE_API_URL` pointe vers Render, `CORS_ORIGINS` pointe vers Vercel). Il y a donc une dépendance circulaire à casser en déployant le backend d'abord, puis en revenant compléter `CORS_ORIGINS` une fois l'URL Vercel connue.

---

## Fichiers touchés

**Déjà fait :** `backend/db.py` (réécrit, vérifié)

**À créer :** `backend/wsgi.py`, `backend/pyproject.toml`, `backend/uv.lock`, `backend/.python-version`, `frontend/vercel.json`, `DEPLOY.md`

**À modifier :** `backend/app.py` (garde CORS + `/healthz`), `backend/.env.example` (noms `DB_*` + pooler), `frontend/src/services/api.js` (garde), `frontend/.env.example`, `.gitignore`

**À supprimer :** `backend/requirements.txt`

**Explicitement non touchés :** les 12 fichiers de `backend/routes/`, `backend/services/crm_tools.py` et `backend/utils/auth_helpers.py`, soit les 65 sites d'appel DB.

## Critères d'acceptation

1. ✅ `backend/db.py` rend au pool toute connexion empruntée, sur les trois chemins : succès, exception, `return` anticipé.
2. ✅ Aucun fichier de `backend/routes/`, `backend/services/` ni `backend/utils/` n'apparaît dans le diff.
3. Le backend démarre via la commande gunicorn de production en local, et `/healthz` répond `200`.
4. Chaque variable d'environnement requise absente produit une erreur au démarrage nommant la variable.
5. Le build frontend passe, et une route profonde rechargée directement résout via le rewrite.
6. `DEPLOY.md` liste toutes les variables lues par le code — vérifiable par un `grep` des `os.getenv` et `import.meta.env`.
