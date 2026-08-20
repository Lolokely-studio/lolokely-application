# Backend Documentation

## Overview

The Lolokely backend is built with **Flask**, a lightweight Python web framework. It provides a RESTful API for task management, user authentication, social media post generation, and notifications. The backend uses PostgreSQL for data persistence and integrates with NVIDIA LangChain (`ChatNVIDIA`) for content generation.

## Technology Stack

- **Flask 2.3.3**: Web framework
- **PostgreSQL**: Database (via Supabase)
- **Flask-JWT-Extended 4.5.3**: JWT authentication
- **Flask-Bcrypt 1.0.1**: Password hashing
- **Marshmallow 3.20.1**: Data validation
- **psycopg2-binary 2.9.7**: PostgreSQL adapter
- **langchain-nvidia-ai-endpoints 1.4.3** / **langchain-core 1.5.3**: NVIDIA ChatNVIDIA integration
- **Flask-CORS 4.0.0**: Cross-origin resource sharing
- **python-dotenv 1.0.0**: Environment variable management
- **Werkzeug 3.1.3**: WSGI toolkit — pinned explicitly, since Flask 2.3.3 only requires `>=2.3.7`
- **gunicorn 23.0.0**: Production WSGI server
- **pytest 9.1.1**: Test framework — *development dependency only*

Versions are pinned in `backend/pyproject.toml` and locked in `backend/uv.lock`.
Python is pinned to **3.11.9** by `backend/.python-version`: `psycopg2-binary
2.9.7` publishes no wheel for Python 3.13, so an unpinned runtime fails to build.

## Project Structure

```
backend/
├── app.py                 # Flask application factory (+ /healthz)
├── wsgi.py                # WSGI entrypoint used by gunicorn in production
├── db.py                  # Pooled database connection management
├── pyproject.toml         # Python dependencies (uv)
├── uv.lock                # Locked dependency tree — committed
├── .python-version        # Pinned runtime (3.11.9)
├── tests/                 # pytest suite
│   ├── conftest.py
│   ├── test_db.py        # Connection pooling and transaction semantics
│   └── test_app.py       # /healthz and the CORS guard
├── routes/                # API route handlers (Blueprints)
│   ├── __init__.py
│   ├── auth.py           # Authentication endpoints
│   ├── tasks.py          # Task management endpoints
│   ├── users.py          # User management endpoints
│   ├── posts.py          # Post generation endpoints
│   ├── notifications.py  # Notification endpoints
│   └── jobs.py           # Job-related endpoints
└── schemas/              # Data validation schemas
    ├── __init__.py
    ├── task_schema.py    # Task/subtask validation
    └── user_schema.py    # User validation
```

## Application Factory Pattern

### `app.py`

The Flask application uses the **Application Factory Pattern** for better testability and configuration:

```python
def create_app():
    app = Flask(__name__)
    # Configuration
    # Extension initialization
    # Blueprint registration
    return app
```

**Key Features:**
- Environment-based configuration
- Extension initialization (JWT, Bcrypt, CORS)
- Blueprint registration for modular routes
- Error handlers

**Configuration:**
- `SECRET_KEY`: Flask secret key
- `JWT_SECRET_KEY`: JWT token secret
- `JWT_ACCESS_TOKEN_EXPIRES`: Token expiration (currently disabled)

**Extensions:**
- `JWTManager`: JWT token management
- `Bcrypt`: Password hashing
- `CORS`: Cross-origin resource sharing

## Database Connection

### `db.py`

Manages PostgreSQL connections through a **process-local connection pool**.

`get_connection()` is a context manager that borrows a connection from a
`ThreadedConnectionPool`, and always returns it:

```python
from db import get_connection

with get_connection() as conn, conn.cursor() as cur:
    cur.execute("SELECT 1")
    cur.fetchone()
# normal exit  -> commit, connection returned to the pool
# exception    -> rollback, connection returned, exception propagates
```

**Semantics:**

| Exit path | Result |
|---|---|
| Normal exit | `commit()`, then returned to the pool |
| Early `return` inside the block | Counts as a normal exit — commits |
| Exception | `rollback()`, returned to the pool, exception re-raised |
| Connection found dead | Closed instead of being recycled |

This matches psycopg2's `with conn:` transaction semantics, with one critical
difference: psycopg2's `with conn:` manages the *transaction* and never closes
or releases the connection. Relying on it leaks a connection per request, which
surfaces on a multi-worker production server as `FATAL: too many connections`.

**Pooling details:**

- The pool is created lazily and rebuilt after a fork, so gunicorn workers never
  share sockets inherited from the parent process.
- `DB_POOL_MIN` / `DB_POOL_MAX` size it (default 1 / 5). Keep `DB_POOL_MAX`
  greater than or equal to the gunicorn `--threads` value: psycopg2 raises
  `PoolError` when the pool is exhausted rather than waiting.
- `sslmode` is always `require`.
- `close_pool()` closes every connection held by the current process.

**Environment Variables:**
- `DB_USER`: Database user (on the Supabase pooler: `postgres.<project-ref>`)
- `DB_PASSWORD`: Database password
- `DB_HOST`: Database host
- `DB_PORT`: Database port (`6543` for the pooler, `5432` direct)
- `DB_NAME`: Database name
- `DB_POOL_MIN` / `DB_POOL_MAX`: Pool bounds (default 1 / 5)

Missing values raise `RuntimeError` naming exactly which ones are absent.

The legacy names `USER_DB`, `PASSWORD_DB`, `HOST`, `PORT`, `DBNAME` are still
accepted as a fallback so old local `.env` files keep working. Do not use them
in a deployed environment: `PORT` is the HTTP port variable reserved by Render,
so `DB_PORT` deliberately refuses that fallback when `RENDER` is set, and raises
an error naming the conflict instead of connecting to the wrong port.

## Route Handlers (Blueprints)

### Authentication Routes (`routes/auth.py`)

**Blueprint:** `auth_bp`

**Endpoints:**
- `POST /api/auth/register`: Register new user
- `POST /api/auth/login`: User login
- `GET /api/auth/me`: Get current user

**Features:**
- User registration with validation
- Password hashing with Bcrypt
- JWT token generation
- Email uniqueness check

**Schema Validation:**
- `UserSchema`: Registration data validation
- `LoginSchema`: Login credentials validation

### Task Routes (`routes/tasks.py`)

**Blueprint:** `tasks_bp`

**Endpoints:**
- `GET /api/tasks/`: Get all tasks
- `POST /api/tasks/`: Create task
- `GET /api/tasks/<id>`: Get task by ID
- `PUT /api/tasks/<id>`: Update task
- `DELETE /api/tasks/<id>`: Delete task
- `POST /api/tasks/<id>/assign`: Assign task
- `POST /api/tasks/<id>/subtasks`: Create subtask
- `PUT /api/tasks/subtasks/<id>`: Update subtask
- `DELETE /api/tasks/subtasks/<id>`: Delete subtask
- `POST /api/tasks/subtasks/<id>/assign`: Assign subtask

**Features:**
- Full CRUD operations for tasks and subtasks
- Task assignment to multiple users
- Notification creation on task events
- Cascade delete for subtasks

**Helper Functions:**
- `create_notification()`: Creates notifications for task events

### User Routes (`routes/users.py`)

**Blueprint:** `users_bp`

**Endpoints:**
- `GET /api/users/`: Get all users
- `GET /api/users/<id>`: Get user by ID

**Features:**
- User listing
- User retrieval by ID
- JWT authentication required

### Post Routes (`routes/posts.py`)

**Blueprint:** `posts_bp`

**Endpoints:**
- `POST /api/posts/generate`: Generate post variations
- `POST /api/posts/save`: Save generated post
- `GET /api/posts/`: Get all posts
- `GET /api/posts/preferences`: Get user preferences

**Features:**
- NVIDIA LangChain (ChatNVIDIA) integration with multi-model fallback
- Optional image analysis for image-aware copy
- Post variation generation (3 variations)
- User preference tracking
- Post history management

**AI Integration:**
- Text chain: `minimaxai/minimax-m3` → `z-ai/glm-5.2` → `nvidia/nemotron-3-ultra-550b-a55b`
- Vision: `google/diffusiongemma-26b-a4b-it` (non-blocking on failure)
- Structured prompt engineering
- JSON response parsing
- Overload-aware model fallback

**Helper Functions:**
- `generate_post_variations()`: Calls NVIDIA via `services.nvidia_llm`
- `update_user_preferences()`: Updates user preferences
- `describe_image()` / `generate_text()`: Vision caption + text fallback

### CRM AI Routes (`routes/crm_ai.py`)

**Blueprint:** `crm_ai_bp` (prefix `/api/crm-ai`) — **admin only**

**Endpoints:**
- `POST /api/crm-ai/suggest-top`: Rank up to 10 companies with `status=new`
- `GET /api/crm-ai/suggest-top/latest`: Return last successful ranking from `ai_runs`
- `POST /api/crm-ai/companies/<id>/outreach-pack`: Generate French email + prestation markdown
- `GET /api/crm-ai/companies/<id>/outreach-pack`: Latest pack for a company
- `GET /api/crm-ai/runs`: Paginated AI run observability (`suggest_top` / `outreach_pack`)

**Tables:**
- `outreach_packs`: email subject/body + proposal markdown per company
- `ai_runs`: run metadata (model, duration, status, summaries)

**Services:**
- `services/crm_tools.py`: DB candidates/context + persistence helpers
- `services/crm_agents.py`: orchestrated ranking + outreach generation via `nvidia_llm.generate_text`

### Notification Routes (`routes/notifications.py`)

**Blueprint:** `notifications_bp`

**Endpoints:**
- `GET /api/notifications/`: Get all notifications
- `GET /api/notifications/unread-count`: Get unread count
- `PUT /api/notifications/<id>/read`: Mark as read
- `PUT /api/notifications/mark-all-read`: Mark all as read

**Features:**
- Notification retrieval with user context
- Unread count tracking
- Mark as read functionality
- Bulk mark as read

## Data Validation

### Marshmallow Schemas

Data validation is handled using **Marshmallow** schemas:

#### TaskSchema (`schemas/task_schema.py`)

```python
class TaskSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    description = fields.Str(allow_none=True)
    status = fields.Str(validate=validate.OneOf(['todo', 'in_progress', 'completed']))
    priority = fields.Str(validate=validate.OneOf(['low', 'medium', 'high']))
    due_date = fields.DateTime(allow_none=True)
```

**Validation Rules:**
- `title`: Required, 1-200 characters
- `description`: Optional
- `status`: Must be one of: todo, in_progress, completed
- `priority`: Must be one of: low, medium, high
- `due_date`: Optional datetime

#### SubtaskSchema

Similar to TaskSchema but for subtasks.

#### UserSchema (`schemas/user_schema.py`)

Validates user registration data:
- Email format
- Password requirements
- Name fields

#### LoginSchema

Validates login credentials:
- Email format
- Password presence

## Authentication & Authorization

### JWT Authentication

**Token Generation:**
```python
from flask_jwt_extended import create_access_token

access_token = create_access_token(identity=user_id)
```

**Token Validation:**
```python
from flask_jwt_extended import jwt_required, get_jwt_identity

@route('/protected')
@jwt_required()
def protected_route():
    user_id = get_jwt_identity()
    # ...
```

**Token Storage:**
- Client stores token in localStorage
- Token sent in `Authorization: Bearer <token>` header
- Server validates token on each protected request

### Password Security

**Hashing:**
```python
from app import bcrypt

password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
```

**Verification:**
```python
is_valid = bcrypt.check_password_hash(stored_hash, provided_password)
```

## Database Operations

### Query Patterns

**Using Context Managers:**
```python
with get_connection() as conn:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
```

**RealDictCursor:**
- Returns results as dictionaries
- Easier to work with than tuples
- Column names as keys

### Common Patterns

**Insert:**
```python
cur.execute(
    "INSERT INTO table (col1, col2) VALUES (%s, %s) RETURNING *",
    (value1, value2)
)
result = cur.fetchone()
conn.commit()
```

**Update:**
```python
cur.execute(
    "UPDATE table SET col1 = %s WHERE id = %s RETURNING *",
    (new_value, record_id)
)
result = cur.fetchone()
conn.commit()
```

**Delete:**
```python
cur.execute("DELETE FROM table WHERE id = %s", (record_id,))
conn.commit()
```

## Error Handling

### Exception Handling

```python
try:
    # Database operation
    result = perform_operation()
    return jsonify({'data': result}), 200
except ValidationError as err:
    return jsonify({'error': 'Validation error', 'details': err.messages}), 400
except Exception as e:
    print(f"Error: {str(e)}")
    traceback.print_exc()
    return jsonify({'error': str(e)}), 500
```

### Error Response Format

```json
{
  "error": "Error message",
  "details": { ... }  // Optional validation details
}
```

## AI Integration

### NVIDIA LangChain Integration

The post generation feature uses `langchain-nvidia-ai-endpoints`:

1. **API Configuration**: `NVIDIA_API_KEY` from environment variables
2. **Client**: `ChatNVIDIA` with multi-model text fallback and optional vision
3. **Invocation**: `invoke()` with system + user messages (HumanMessage for images)
4. **Response Parsing**: JSON extraction and validation (unchanged)
5. **Error Handling**: ValueError for missing key; retry next text model on overload; 503 if all models fail

```python
from services.nvidia_llm import describe_image, generate_text

analysis, image_model = describe_image(media_url)  # optional
text, model_used = generate_text(system_instruction, prompt)
```

**Pipeline (with image):** vision caption → text generation with enriched prompt.  
**Without image / on vision failure:** text-only generation.

## Notification System

### Notification Creation

Notifications are created automatically for:
- Task creation (all users except creator)
- Task assignment (assigned users)
- Subtask assignment (assigned users)

**Helper Function:**
```python
def create_notification(cur, user_id, type, message, 
                        related_task_id=None, 
                        related_subtask_id=None, 
                        created_by_user_id=None):
    cur.execute(
        "INSERT INTO notifications (...) VALUES (...)",
        (notification_data,)
    )
```

## Environment Variables

### Required Variables

Create `.env` file in backend directory:

```env
# Database — Supabase Supavisor (transaction pooler)
DB_USER=postgres.your_project_ref
DB_PASSWORD=your_database_password
DB_HOST=aws-0-<region>.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres

# Connection pool (per gunicorn process)
DB_POOL_MIN=1
DB_POOL_MAX=5

# CORS — required, the app refuses to start without it
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# AI Integration
NVIDIA_API_KEY=nvapi-your_key_here
```

`backend/.env.example` is the authoritative list. `DEPLOY.md` documents every
variable with its destination (Render or Vercel) and whether it is secret.

## Running the Application

Dependencies are managed with [uv](https://docs.astral.sh/uv/); run
`uv sync --frozen` once, then prefix commands with `uv run`.

### Development

```bash
uv run python app.py
```

Runs the Flask development server on `http://localhost:5000`.

### Tests

```bash
uv run pytest
```

The suite touches neither the database nor the network, so it needs no `.env`
and no secret.

### Production

Served by gunicorn through the `wsgi:app` entrypoint — `app.py` only builds the
application under `if __name__ == '__main__'`, so `gunicorn app:app` would fail:

```bash
uv run --no-dev gunicorn wsgi:app --bind 0.0.0.0:$PORT \
  --workers 2 --threads 4 --worker-class gthread --timeout 120
```

`--no-dev` is required here, not only on the install step: `uv run` re-syncs the
environment before executing and includes the dev group by default, which would
reinstall pytest at every boot.

`--timeout 120` replaces gunicorn's 30 s default because the AI routes routinely
exceed it. See `DEPLOY.md` for the full deployment procedure.

## Best Practices

### Code Organization

- **Blueprints**: Modular route organization
- **Schemas**: Centralized validation
- **Helper Functions**: Reusable utility functions
- **Error Handling**: Comprehensive try-catch blocks

### Security

- **Password Hashing**: Always hash passwords
- **SQL Injection Prevention**: Use parameterized queries
- **Input Validation**: Validate all user input
- **JWT Tokens**: Secure token handling

### Database

- **Connection Management**: Use context managers
- **Transactions**: Commit after operations
- **Error Handling**: Handle database errors gracefully
- **Indexes**: Optimize queries with indexes

### API Design

- **RESTful**: Follow REST conventions
- **Status Codes**: Use appropriate HTTP status codes
- **Error Messages**: Clear, user-friendly error messages
- **Response Format**: Consistent JSON structure

## Testing (Future)

Consider implementing:
- Unit tests (pytest)
- Integration tests
- API endpoint tests
- Database transaction tests

## Logging

### Current Implementation

- Console logging with `print()`
- Error traceback with `traceback.print_exc()`

### Future Enhancements

- Structured logging (Python logging module)
- Log levels (DEBUG, INFO, WARNING, ERROR)
- Log file rotation
- External logging service integration

## Performance Optimization

### Database Queries

- Use indexes for frequently queried columns
- Optimize JOIN operations
- Limit result sets when appropriate
- Use connection pooling

### Caching (Future)

- Redis for session caching
- Response caching for frequently accessed data
- Query result caching

## Deployment Considerations

### Production Checklist

- [ ] Set secure `SECRET_KEY` and `JWT_SECRET_KEY`
- [ ] Use production database
- [ ] Configure CORS for production domain
- [ ] Set up SSL/TLS
- [ ] Use WSGI server (Gunicorn, uWSGI)
- [ ] Configure environment variables securely
- [ ] Set up monitoring and logging
- [ ] Database backup strategy
- [ ] Rate limiting (if needed)

