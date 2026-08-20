# Lolokely Admin Backend

A Flask-based REST API for task management similar to Monday.com.

## Setup Instructions

Dependencies are managed with [uv](https://docs.astral.sh/uv/) and locked in `uv.lock`.
All commands below are run from `backend/`.

1. **Install uv** (once per machine):
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Install dependencies:**
   ```bash
   uv sync --frozen
   ```

   This creates `backend/.venv` with the exact locked versions, on the Python
   version pinned in `.python-version` (3.11.9). There is no `requirements.txt`
   and no need to create or activate a virtualenv by hand — `uv run` uses
   `.venv` automatically.

   To add or change a dependency, edit `pyproject.toml`, then run `uv lock`
   and commit the updated `uv.lock`.

3. **Set up environment variables:**
   Copy `.env.example` to `.env` and fill it in:
   ```bash
   cp .env.example .env
   ```

   The variables read by the code:

   | Variable | Required | Notes |
   |---|---|---|
   | `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | yes | Supabase Postgres connection |
   | `DB_POOL_MIN`, `DB_POOL_MAX` | no | Connection pool bounds, default 1 / 5 |
   | `SECRET_KEY`, `JWT_SECRET_KEY` | yes | The app refuses to start without them |
   | `JWT_ACCESS_TOKEN_EXPIRES` | no | Minutes; `false` (default) = never expires |
   | `CORS_ORIGINS` | yes | Comma-separated frontend origins, e.g. `http://localhost:5173` |
   | `NVIDIA_API_KEY` | yes for AI routes | From https://build.nvidia.com/ |
   | `NVIDIA_TEXT_MODELS` | no | Comma-separated model list |
   | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | no | Not used by the Flask API today |

   The legacy names `USER_DB`, `PASSWORD_DB`, `HOST`, `PORT`, `DBNAME` still
   work as a fallback, but prefer the `DB_*` names: `PORT` collides with the
   HTTP port variable reserved by hosting providers. There is **no**
   `DATABASE_URL` support — `db.py` builds the connection from discrete values.

4. **Initialize the database:**
   ```bash
   psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f schemas/db.sql
   ```
   Or run the SQL from `schemas/db.sql` manually in your database.

5. **Run the development server:**
   ```bash
   uv run python app.py
   ```

   Available at `http://localhost:5000`.

6. **Run the tests:**
   ```bash
   uv run pytest
   ```

   The suite touches neither the database nor the network, so it runs without
   a `.env` and without any secret.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Tasks
- `GET /api/tasks/` - Get all tasks for current user
- `POST /api/tasks/` - Create a new task
- `GET /api/tasks/<id>` - Get specific task
- `PUT /api/tasks/<id>` - Update task
- `DELETE /api/tasks/<id>` - Delete task
- `POST /api/tasks/<id>/assign` - Assign task to users
- `POST /api/tasks/<id>/subtasks` - Create subtask

### Subtasks
- `PUT /api/tasks/subtasks/<id>` - Update subtask
- `DELETE /api/tasks/subtasks/<id>` - Delete subtask
- `POST /api/tasks/subtasks/<id>/assign` - Assign subtask to users

### Users
- `GET /api/users/` - Get all users
- `GET /api/users/<id>` - Get specific user

## Database Schema

- **Users**: id, email, password_hash, first_name, last_name, timestamps
- **Tasks**: id, title, description, status, priority, due_date, timestamps
- **Subtasks**: id, task_id, title, description, status, priority, due_date, timestamps
- **TaskAssignments**: id, task_id, user_id, assigned_at
- **SubtaskAssignments**: id, subtask_id, user_id, assigned_at
