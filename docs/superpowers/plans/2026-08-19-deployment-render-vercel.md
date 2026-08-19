# Déploiement Render + Vercel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le backend Flask déployable sur Render (runtime natif Python + uv + gunicorn) et le frontend Vite/React déployable sur Vercel, avec des dépendances verrouillées et une configuration qui échoue au démarrage plutôt qu'en production.

**Architecture:** Runtime natif Render (pas de Docker — aucune dépendance système dans le stack). `uv.lock` dans `backend/` verrouille l'arbre de dépendances complet ; gunicorn sert `wsgi:app` ; la base reste Supabase Postgres via le pooler Supavisor. Le frontend est un build statique Vite avec réécriture SPA.

**Tech Stack:** Python 3.11.9, uv, Flask 2.3.3, gunicorn, psycopg2-binary, Vite 7, React 19, Vercel, Render.

**Spec:** `docs/superpowers/specs/2026-08-19-deployment-render-vercel-design.md`

## Global Constraints

- **Le bloc 1 du spec (fuite de connexions dans `backend/db.py`) est déjà fait et vérifié.** Ne pas le réimplémenter. `db.py` expose `get_connection()` comme *context manager* et `close_pool()`.
- **Ne modifier aucun fichier de `backend/routes/`, `backend/services/` ni `backend/utils/`.** Ces 65 sites d'appel DB doivent rester intacts ; leur apparition dans un diff est un échec de tâche.
- Version Python : **3.11.9** exactement. Render utilise sinon Python 3.13, sur lequel `psycopg2-binary==2.9.7` n'a pas de wheel et le build échoue.
- **Ne pas monter de version** Flask / Werkzeug / marshmallow. On verrouille l'existant tel qu'il tourne en local.
- `DB_POOL_MAX` doit rester **≥ au nombre de threads gunicorn par worker** (psycopg2 lève `PoolError` au lieu d'attendre).
- Le projet n'a **aucun framework de test**. Ne pas en introduire. Les vérifications sont des commandes exécutables avec sortie attendue.
- Toutes les commandes backend s'exécutent depuis `backend/`.
- Root directory Render = `backend`, root directory Vercel = `frontend`, branche de production = `develop`.

---

### Task 1: Migration uv + gunicorn + pin Python

Remplace `requirements.txt` par un lockfile reproductible et ajoute le serveur WSGI de production. C'est la fondation : les tâches suivantes utilisent `uv run`.

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/uv.lock` (généré, à committer)
- Create: `backend/.python-version`
- Delete: `backend/requirements.txt`

**Interfaces:**
- Consumes: rien.
- Produces: environnement `backend/.venv` géré par uv, contenant `gunicorn`. Les tâches 2 et 3 lancent leurs vérifications via `uv run`.

- [ ] **Step 1: Vérifier que uv est installé**

Run: `uv --version`
Expected: un numéro de version. Sinon : `curl -LsSf https://astral.sh/uv/install.sh | sh`

- [ ] **Step 2: Créer `backend/.python-version`**

```
3.11.9
```

Ce fichier est lu à la fois par Render et par uv, ce qui garde les deux cohérents. Sur Render, la version de Python **ne se configure pas via uv** : ni `requires-python`, ni `uv python pin` ne pilotent le runtime.

- [ ] **Step 3: Créer `backend/pyproject.toml`**

Versions reprises du venv local existant (`./venv/bin/pip freeze`), y compris `Werkzeug` qui était absent de `requirements.txt` alors que Flask 2.3.3 déclare seulement `>=2.3.7`.

```toml
[project]
name = "lolokely-backend"
version = "0.1.0"
description = "Backend Flask de Lolokely"
requires-python = "==3.11.*"
dependencies = [
    "Flask==2.3.3",
    "Werkzeug==3.1.3",
    "Flask-Cors==4.0.0",
    "Flask-JWT-Extended==4.5.3",
    "Flask-Bcrypt==1.0.1",
    "bcrypt==5.0.0",
    "python-dotenv==1.0.0",
    "psycopg2-binary==2.9.7",
    "marshmallow==3.20.1",
    "email-validator==2.0.0",
    "langchain-core==1.5.3",
    "langchain-nvidia-ai-endpoints==1.4.3",
    "gunicorn==23.0.0",
]

[tool.uv]
package = false
```

`package = false` indique à uv que le projet n'est pas une bibliothèque installable — le code est importé depuis le répertoire de travail, comme aujourd'hui.

- [ ] **Step 4: Générer le lockfile et installer**

Run: `cd backend && uv lock && uv sync --frozen`
Expected: création de `backend/uv.lock` et de `backend/.venv`, sans erreur de résolution.

Si `gunicorn==23.0.0` ne résout pas, remplacer par la dernière version stable retournée par `uv add gunicorn`, puis relancer `uv lock`.

- [ ] **Step 5: Vérifier que toutes les dépendances s'importent**

Run:
```bash
cd backend && uv run python -c "
import flask, werkzeug, psycopg2, marshmallow, flask_jwt_extended, flask_bcrypt, flask_cors
import langchain_core, langchain_nvidia_ai_endpoints, gunicorn
print('flask', flask.__version__)
print('werkzeug', werkzeug.__version__)
print('all imports OK')
"
```
Expected:
```
flask 2.3.3
werkzeug 3.1.3
all imports OK
```

- [ ] **Step 6: Vérifier que la version de Python est bien celle attendue**

Run: `cd backend && uv run python --version`
Expected: `Python 3.11.9`

- [ ] **Step 7: Supprimer `requirements.txt`**

Run: `cd backend && rm requirements.txt`

- [ ] **Step 8: Vérifier que `.venv` n'est pas suivi par git**

Run: `git status --short backend/ | grep -c '.venv' || echo "0 fichier .venv suivi"`
Expected: `0 fichier .venv suivi`

Si des fichiers `.venv` apparaissent, ajouter `backend/.venv` au `.gitignore` racine (la tâche 4 le fera de toute façon, mais ne pas committer `.venv` ici).

- [ ] **Step 9: Commit**

```bash
git add backend/pyproject.toml backend/uv.lock backend/.python-version
git add -u backend/requirements.txt
git commit -m "build: migrate backend deps to uv with pinned lockfile and gunicorn"
```

---

### Task 2: Point d'entrée WSGI + endpoint /healthz

Sans objet `app` au niveau module, `gunicorn wsgi:app` échoue. On ajoute aussi le health check que Render interrogera.

**Files:**
- Create: `backend/wsgi.py`
- Modify: `backend/app.py` (imports + enregistrement de la route dans `create_app`)

**Interfaces:**
- Consumes: environnement uv de la tâche 1.
- Produces: `backend/wsgi.py` exposant `app` (instance Flask). Route `GET /healthz` → `200 {"status": "ok"}`, et `GET /healthz?db=1` → `200 {"status": "ok", "db": "ok"}` ou `503 {"status": "error", "db": "<message>"}`.

- [ ] **Step 1: Créer `backend/wsgi.py`**

```python
from app import create_app

app = create_app()
```

`app.py` conserve son bloc `if __name__ == '__main__'` : il reste le point d'entrée de développement.

- [ ] **Step 2: Ajouter l'import `request` dans `backend/app.py`**

Remplacer la ligne 1 :

```python
from flask import Flask
```

par :

```python
from flask import Flask, request
```

- [ ] **Step 3: Ajouter la route `/healthz` dans `create_app`**

Dans `backend/app.py`, juste avant le bloc `# Error handlers`, insérer :

```python
    # Health check (pas d'auth) : ne touche pas la base par defaut, sinon une
    # coupure Supabase ferait redemarrer en boucle un backend sain.
    @app.route('/healthz')
    def healthz():
        if request.args.get('db') != '1':
            return {'status': 'ok'}, 200
        try:
            from db import get_connection
            with get_connection() as conn, conn.cursor() as cur:
                cur.execute('SELECT 1')
                cur.fetchone()
        except Exception as exc:
            return {'status': 'error', 'db': str(exc)}, 503
        return {'status': 'ok', 'db': 'ok'}, 200
```

L'import de `db` est local à la fonction : le module ne doit pas être importé au démarrage si la configuration DB est absente.

- [ ] **Step 4: Vérifier que l'app démarre sous gunicorn avec la commande de production**

Run (dans un terminal) :
```bash
cd backend && uv run gunicorn wsgi:app --bind 0.0.0.0:5000 \
  --workers 2 --threads 4 --worker-class gthread --timeout 120
```
Expected: des lignes `[INFO] Booting worker with pid: ...`, sans traceback.

- [ ] **Step 5: Vérifier `/healthz` (santé simple)**

Run (dans un second terminal) : `curl -s -w '\n%{http_code}\n' http://localhost:5000/healthz`
Expected:
```
{"status":"ok"}
200
```

- [ ] **Step 6: Vérifier `/healthz?db=1` (santé profonde)**

Run: `curl -s -w '\n%{http_code}\n' 'http://localhost:5000/healthz?db=1'`
Expected:
```
{"db":"ok","status":"ok"}
200
```

Puis arrêter gunicorn (Ctrl-C).

- [ ] **Step 7: Vérifier qu'aucune route n'a été touchée**

Run: `git status --short backend/routes backend/services backend/utils`
Expected: aucune sortie.

- [ ] **Step 8: Commit**

```bash
git add backend/wsgi.py backend/app.py
git commit -m "feat: add WSGI entrypoint and /healthz endpoint for Render"
```

---

### Task 3: Garde sur CORS_ORIGINS + previews Vercel

`backend/app.py:41` fait `os.getenv('CORS_ORIGINS').split(',')` sans garde : variable absente → `AttributeError` au boot, avec un message qui ne désigne pas la cause.

**Files:**
- Modify: `backend/app.py` (import `re` + bloc CORS)

**Interfaces:**
- Consumes: `create_app()` de la tâche 2.
- Produces: variable d'environnement optionnelle `CORS_ALLOW_VERCEL_PREVIEWS` (`1`/`true`/`yes` pour activer, désactivée par défaut), consommée par la tâche 6 dans `DEPLOY.md`.

- [ ] **Step 1: Ajouter l'import `re` dans `backend/app.py`**

Après `import os`, ajouter :

```python
import re
```

- [ ] **Step 2: Remplacer le bloc CORS**

Remplacer :

```python
    # CORS: allow frontend origins (comma-separated via CORS_ORIGINS)
    cors_origins = [
        origin.strip()
        for origin in os.getenv('CORS_ORIGINS').split(',')
        if origin.strip()
    ]
```

par :

```python
    # CORS: allow frontend origins (comma-separated via CORS_ORIGINS)
    cors_raw = os.getenv('CORS_ORIGINS')
    if not cors_raw:
        raise RuntimeError('CORS_ORIGINS must be set in the environment')
    cors_origins = [origin.strip() for origin in cors_raw.split(',') if origin.strip()]
    if not cors_origins:
        raise RuntimeError('CORS_ORIGINS must contain at least one origin')

    # Les URLs de preview Vercel changent a chaque deploiement et ne peuvent
    # pas etre listees a l'avance. Desactive par defaut : ouvrir toute la
    # plateforme Vercel est un choix, pas un defaut raisonnable.
    if os.getenv('CORS_ALLOW_VERCEL_PREVIEWS', '').strip().lower() in ('1', 'true', 'yes'):
        cors_origins.append(re.compile(r'^https://.*\.vercel\.app$'))
```

- [ ] **Step 3: Vérifier l'échec explicite quand `CORS_ORIGINS` est absente**

Run:
```bash
cd backend && CORS_ORIGINS= uv run python -c "
from app import create_app
try:
    create_app()
    print('ECHEC: aucune erreur levee')
except RuntimeError as e:
    print('OK ->', e)
"
```
Expected: `OK -> CORS_ORIGINS must be set in the environment`

Le passage de `CORS_ORIGINS=` (valeur vide) suffit et évite de déplacer le `.env` : `load_dotenv()` s'exécute avec `override=False` par défaut et n'écrase pas une variable déjà présente dans l'environnement, même vide. Comportement vérifié sur ce projet.

- [ ] **Step 4: Vérifier que l'app démarre normalement avec la configuration réelle**

Run: `cd backend && uv run python -c "from wsgi import app; print('boot OK')"`
Expected: `boot OK`

- [ ] **Step 5: Vérifier l'acceptation du motif preview**

Run:
```bash
cd backend && CORS_ALLOW_VERCEL_PREVIEWS=true uv run python -c "
from wsgi import app
print('boot avec previews OK')
"
```
Expected: `boot avec previews OK`

- [ ] **Step 6: Commit**

```bash
git add backend/app.py
git commit -m "fix: fail fast on missing CORS_ORIGINS and support Vercel preview origins"
```

---

### Task 4: Variables d'environnement DB_* + hygiène du repo

Aligne `.env.example` sur les noms canoniques introduits dans `db.py`, bascule vers le pooler Supabase, et ferme le trou du `.gitignore`.

**Files:**
- Modify: `backend/.env.example`
- Modify: `.gitignore`
- Modify: `backend/.env` (local, non suivi — à faire manuellement, hors commit)

**Interfaces:**
- Consumes: les noms de variables lus par `backend/db.py` (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_POOL_MIN`, `DB_POOL_MAX`) et par `backend/app.py` (`CORS_ORIGINS`, `CORS_ALLOW_VERCEL_PREVIEWS`).
- Produces: la liste de référence des variables, reprise telle quelle par `DEPLOY.md` en tâche 6.

- [ ] **Step 1: Corriger le `.gitignore` racine**

Remplacer la ligne `.env` par :

```
.env*
!.env.example
```

Et ajouter, sous `backend/venv` :

```
backend/.venv
```

`.env.local`, `.env.production` et `.env.render` n'étaient couverts nulle part à la racine ni dans `backend/`.

- [ ] **Step 2: Vérifier que la règle attrape bien les variantes**

Run:
```bash
touch .env.local backend/.env.production
git status --short | grep -E '\.env' || echo "AUCUN fichier .env visible par git"
rm .env.local backend/.env.production
```
Expected: `AUCUN fichier .env visible par git`

- [ ] **Step 3: Vérifier que `.env.example` reste bien suivi**

Run: `git check-ignore -v backend/.env.example || echo "backend/.env.example NON ignore (correct)"`
Expected: `backend/.env.example NON ignore (correct)`

- [ ] **Step 4: Réécrire `backend/.env.example`**

```bash
# CORS (comma-separated frontend origins)
# Production : y mettre l'URL Vercel, ex. https://lolokely.vercel.app
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
# Optionnel : autorise toutes les URLs de preview *.vercel.app (1/true/yes)
CORS_ALLOW_VERCEL_PREVIEWS=

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database — Supabase Supavisor (transaction pooler)
# ATTENTION : ne PAS utiliser la variable PORT, reservee par Render pour le
# port HTTP du service. Le port Postgres est DB_PORT.
# Pooler : DB_PORT=6543 et DB_USER=postgres.<project-ref>
# Connexion directe : DB_PORT=5432 et DB_USER=postgres
DB_USER=postgres.your_project_ref
DB_PASSWORD=your_database_password
DB_HOST=aws-0-<region>.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres

# Pool de connexions (par processus gunicorn)
# DB_POOL_MAX doit rester >= au nombre de threads par worker
DB_POOL_MIN=1
DB_POOL_MAX=5

# Security (generate with: python -c "import secrets; print(secrets.token_hex(32))")
SECRET_KEY=your-secret-key-here-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-here-change-in-production
# false = tokens never expire; set an integer for expiry in minutes (e.g. 60 = 1 hour)
JWT_ACCESS_TOKEN_EXPIRES=60

# NVIDIA BUILD API
NVIDIA_API_KEY=nvapi-your_key_here
NVIDIA_TEXT_MODELS=nvidia/nemotron-3-ultra-550b-a55b,minimaxai/minimax-m3,z-ai/glm-5.2,moonshotai/kimi-k2.6,stepfun-ai/step-3.7-flash
# Optional: NVIDIA_VISION_MODEL, NVIDIA_TEMPERATURE
```

- [ ] **Step 5: Auditer l'historique git à la recherche de secrets committés**

Run: `git log --all --full-history --oneline -- backend/.env frontend/.env.local`
Expected: aucune sortie.

Si des commits apparaissent : les clés Supabase et NVIDIA sont à considérer comme compromises et à faire tourner. La réécriture d'historique est un sujet distinct, à trancher séparément — le noter dans `DEPLOY.md` en tâche 6, ne pas la lancer ici.

- [ ] **Step 6: Vérifier qu'aucune variable lue par le code ne manque dans `.env.example`**

Run:
```bash
grep -rho "os.getenv(['\"][A-Z_]*['\"]" backend/app.py backend/db.py backend/services backend/routes backend/utils \
  | sed "s/.*[\"']\([A-Z_]*\)[\"'].*/\1/" | sort -u > /tmp/used.txt
grep -o '^[A-Z_]*=' backend/.env.example | tr -d '=' | sort -u > /tmp/documented.txt
comm -23 /tmp/used.txt /tmp/documented.txt
```
Expected: aucune sortie (toute variable lue par le code est documentée).

Les noms hérités (`USER_DB`, `PASSWORD_DB`, `HOST`, `PORT`, `DBNAME`) apparaîtront dans `used.txt` car `db.py` les accepte encore en repli — c'est attendu. S'ils ressortent ici, les ignorer explicitement plutôt que de les réintroduire dans `.env.example`.

- [ ] **Step 7: Mettre à jour `backend/.env` local (hors commit)**

Renommer manuellement dans `backend/.env` : `USER_DB`→`DB_USER`, `PASSWORD_DB`→`DB_PASSWORD`, `HOST`→`DB_HOST`, `PORT`→`DB_PORT`, `DBNAME`→`DB_NAME`. Le repli de `db.py` rend cette étape non bloquante en local, mais elle évite de garder deux conventions.

Vérification :
```bash
cd backend && uv run python -c "
from db import get_connection, close_pool
with get_connection() as conn, conn.cursor() as cur:
    cur.execute('SELECT 1'); print('DB OK ->', cur.fetchone()[0])
close_pool()
"
```
Expected: `DB OK -> 1`

- [ ] **Step 8: Commit**

```bash
git add .gitignore backend/.env.example
git commit -m "chore: document DB_* env vars, Supabase pooler and tighten .env ignore rules"
```

---

### Task 5: Frontend — réécriture SPA Vercel + garde VITE_API_URL

**Files:**
- Create: `frontend/vercel.json`
- Modify: `frontend/src/services/api.js:3`
- Modify: `frontend/.env.example`

**Interfaces:**
- Consumes: rien du backend (le contrat est l'URL `VITE_API_URL`).
- Produces: build statique `frontend/dist` servi par Vercel avec fallback SPA.

- [ ] **Step 1: Créer `frontend/vercel.json`**

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Les fichiers statiques existants (`/assets/*`) sont servis avant les réécritures : seules les routes sans fichier correspondant retombent sur `index.html`, ce qui est exactement le comportement voulu pour `react-router-dom`.

- [ ] **Step 2: Ajouter la garde dans `frontend/src/services/api.js`**

Remplacer la ligne 3 :

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL;
```

par :

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    'VITE_API_URL is not defined. Set it in frontend/.env.local for local dev, ' +
      'or in the Vercel project settings (Production and Preview) for deploys.',
  );
}
```

Sans cette garde, `baseURL` vaut `undefined`, axios bascule sur des URLs relatives, et les appels partent vers le domaine Vercel où ils reçoivent l'`index.html` — du HTML là où du JSON est attendu, avec des symptômes très éloignés de la cause.

- [ ] **Step 3: Compléter `frontend/.env.example`**

```
# URL de base de l'API, suffixe /api inclus
# Local : http://localhost:5000/api
# Production : https://<votre-service>.onrender.com/api
VITE_API_URL=http://localhost:5000/api
```

- [ ] **Step 4: Vérifier que le build passe avec la variable définie**

Run: `cd frontend && npm run build`
Expected: `✓ built in ...`, et création de `frontend/dist/index.html`.

- [ ] **Step 5: Vérifier que le build échoue explicitement sans la variable**

Run:
```bash
cd frontend && mv .env.local .env.local.bak && VITE_API_URL= npm run build; \
  mv .env.local.bak .env.local
```
Expected: le build échoue avec le message `VITE_API_URL is not defined...`.

Si le build **réussit**, c'est que Vite a inliné une valeur depuis un autre fichier `.env` — vérifier lequel avant de continuer.

- [ ] **Step 6: Vérifier le rendu d'une route profonde en local**

Run:
```bash
cd frontend && npm run preview
```
Puis ouvrir `http://localhost:4173/login` directement (pas via un lien) et recharger.
Expected: la page se charge, pas de 404.

`vite preview` applique déjà un fallback SPA ; ce test valide le routeur, tandis que `vercel.json` apporte le même comportement côté Vercel. Arrêter le serveur ensuite.

- [ ] **Step 7: Commit**

```bash
git add frontend/vercel.json frontend/src/services/api.js frontend/.env.example
git commit -m "feat: add Vercel SPA rewrite and fail fast on missing VITE_API_URL"
```

---

### Task 6: DEPLOY.md

Document unique permettant de refaire le déploiement de zéro sans relire le code.

**Files:**
- Create: `DEPLOY.md`

**Interfaces:**
- Consumes: les réglages et variables établis dans les tâches 1 à 5.
- Produces: rien (document terminal).

- [ ] **Step 1: Rassembler la liste réelle des variables lues par le code**

Run:
```bash
grep -rn "os.getenv" backend/app.py backend/db.py backend/services backend/routes backend/utils | sed 's/:.*getenv(/ -> /'
grep -rn "import.meta.env" frontend/src
```
Expected: la liste complète à reporter dans le tableau du document. Toute variable trouvée ici doit apparaître dans `DEPLOY.md`.

- [ ] **Step 2: Écrire `DEPLOY.md`**

Le document doit contenir, dans cet ordre :

1. **Prérequis** — un compte Render, un compte Vercel, le projet Supabase existant, le repo GitHub avec la branche `develop`.

2. **Ordre de déploiement et dépendance circulaire.** Les deux services se référencent mutuellement : `VITE_API_URL` pointe vers Render, `CORS_ORIGINS` pointe vers Vercel. Casser le cycle ainsi :
   1. déployer le backend sur Render avec un `CORS_ORIGINS` provisoire (`http://localhost:5173`) ;
   2. relever l'URL `https://<service>.onrender.com` ;
   3. déployer le frontend sur Vercel avec `VITE_API_URL=https://<service>.onrender.com/api` ;
   4. relever l'URL Vercel, revenir sur Render, mettre `CORS_ORIGINS` à cette URL, redéployer.

3. **Récupération des identifiants du pooler Supabase** — dashboard Supabase → Project Settings → Database → Connection string → onglet **Transaction pooler**. En extraire l'hôte (`aws-0-<region>.pooler.supabase.com`), le port `6543` et l'utilisateur `postgres.<project-ref>`. Signaler que l'utilisateur du pooler n'est **pas** `postgres`.

4. **Réglages Render** :

   | Réglage | Valeur |
   |---|---|
   | Language / Runtime | Python 3 (natif, pas Docker) |
   | Root Directory | `backend` |
   | Branch | `develop` |
   | Build Command | `uv sync --frozen` |
   | Start Command | `uv run gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --worker-class gthread --timeout 120` |
   | Health Check Path | `/healthz` |
   | Instance Type | Free |

   Justifier `--timeout 120` : le défaut gunicorn est de 30 s et les routes `/api/crm-ai/*` appellent des modèles NVIDIA dont la latence le dépasse régulièrement — sans ce réglage le worker est tué en plein appel LLM.

5. **Réglages Vercel** :

   | Réglage | Valeur |
   |---|---|
   | Framework Preset | Vite |
   | Root Directory | `frontend` |
   | Production Branch | `develop` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

6. **Tableau des variables d'environnement** — une ligne par variable, avec les colonnes : nom, destination (Render / Vercel), secrète (oui/non), exemple de valeur. Doit couvrir : `CORS_ORIGINS`, `CORS_ALLOW_VERCEL_PREVIEWS`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_POOL_MIN`, `DB_POOL_MAX`, `SECRET_KEY`, `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRES`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NVIDIA_API_KEY`, `NVIDIA_TEXT_MODELS` (Render) et `VITE_API_URL` (Vercel).

7. **Avertissement de sécurité** — tout ce qui est préfixé `VITE_` est inliné **en clair** dans le bundle JavaScript livré au navigateur. `SUPABASE_SERVICE_ROLE_KEY` et `NVIDIA_API_KEY` ne doivent exister que côté Render. Mentionner aussi le résultat de l'audit d'historique de la tâche 4, et la rotation des clés si un `.env` y a été trouvé.

8. **Piège `PORT`** — `PORT` est réservé par Render pour le port HTTP du service. Le port Postgres est `DB_PORT`. Ne jamais définir `PORT` pour la base sur Render : `db.py` lève une erreur explicite dans ce cas.

9. **Pannes attendues et symptômes** :

   | Symptôme | Cause | Correctif |
   |---|---|---|
   | Première requête très lente (~1 min) puis normal | Spin-down free après 15 min sans trafic | Comportement attendu ; un pinger externe l'évite mais consomme ~744 h des 750 h/mois du quota |
   | `FATAL: too many connections` | `DB_POOL_MAX` trop haut × nombre de workers | Baisser `DB_POOL_MAX`, vérifier l'usage du pooler `:6543` |
   | `PoolError: connection pool exhausted` | `DB_POOL_MAX` < threads gunicorn | Monter `DB_POOL_MAX` à ≥ `--threads` |
   | 404 au refresh sur une route profonde | `frontend/vercel.json` absent ou ignoré | Vérifier le Root Directory Vercel = `frontend` |
   | Réponses HTML là où du JSON est attendu | `VITE_API_URL` non défini au build | Définir la variable sur Production **et** Preview, puis rebuild |
   | Erreurs CORS depuis une URL de preview | Preview non listée dans `CORS_ORIGINS` | Activer `CORS_ALLOW_VERCEL_PREVIEWS=true` sur Render |
   | Build Render échoue sur `psycopg2` | Python 3.13 utilisé au lieu de 3.11.9 | Vérifier que `backend/.python-version` est bien committé |
   | Worker tué pendant une génération IA | `--timeout` gunicorn trop bas | Confirmer `--timeout 120` dans la Start Command |

- [ ] **Step 3: Vérifier la complétude du tableau des variables**

Run:
```bash
grep -o '^[A-Z_]*=' backend/.env.example | tr -d '=' | sort -u > /tmp/env_ref.txt
while read v; do grep -q "\`$v\`" DEPLOY.md || echo "MANQUANT dans DEPLOY.md: $v"; done < /tmp/env_ref.txt
echo "--- verification terminee ---"
```
Expected: aucune ligne `MANQUANT`, puis `--- verification terminee ---`.

- [ ] **Step 4: Vérifier que `VITE_API_URL` est documentée**

Run: `grep -c 'VITE_API_URL' DEPLOY.md`
Expected: un nombre ≥ 2.

- [ ] **Step 5: Commit**

```bash
git add DEPLOY.md
git commit -m "docs: add Render and Vercel deployment guide"
```

---

## Vérification finale (après la tâche 6)

- [ ] **Aucun fichier métier touché**

Run: `git diff --stat develop...HEAD -- backend/routes backend/services backend/utils`
Expected: aucune sortie.

- [ ] **Le backend démarre exactement comme sur Render**

Run:
```bash
cd backend && uv sync --frozen && \
  PORT=5000 uv run gunicorn wsgi:app --bind 0.0.0.0:$PORT \
  --workers 2 --threads 4 --worker-class gthread --timeout 120
```
Puis : `curl -s -w '\n%{http_code}\n' 'http://localhost:5000/healthz?db=1'`
Expected: `{"db":"ok","status":"ok"}` et `200`.

Ce test couvre aussi la garde `PORT`/`DB_PORT` : avec `PORT=5000` défini, la connexion Postgres doit continuer d'utiliser `DB_PORT` et non 5000.

- [ ] **Le frontend build**

Run: `cd frontend && npm run build`
Expected: `✓ built in ...`

- [ ] **Aucun secret dans le diff**

Run: `git diff develop...HEAD | grep -iE 'nvapi-|eyJ|service_role|password' | grep -v '.env.example'`
Expected: aucune sortie.
