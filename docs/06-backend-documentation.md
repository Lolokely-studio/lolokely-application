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
- **langchain-nvidia-ai-endpoints** / **langchain-core**: NVIDIA ChatNVIDIA integration
- **Flask-CORS 4.0.0**: Cross-origin resource sharing
- **python-dotenv 1.0.0**: Environment variable management

## Project Structure

```
backend/
├── app.py                 # Flask application factory
├── db.py                  # Database connection management
├── requirements.txt       # Python dependencies
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

Manages PostgreSQL database connections:

```python
def get_connection():
    """Returns a new database connection"""
    return psycopg2.connect(
        user=USER,
        password=PASSWORD,
        host=HOST,
        port=PORT,
        dbname=DBNAME,
        sslmode="require"
    )
```

**Features:**
- Environment variable configuration
- SSL connection requirement
- Context manager support for automatic cleanup

**Environment Variables:**
- `USER_DB`: Database user
- `PASSWORD_DB`: Database password
- `HOST`: Database host
- `PORT`: Database port (default: 5432)
- `DBNAME`: Database name

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
# Database
USER_DB=your_database_user
PASSWORD_DB=your_database_password
HOST=your_database_host
PORT=5432
DBNAME=your_database_name

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# AI Integration
NVIDIA_API_KEY=nvapi-your_key_here
```

## Running the Application

### Development

```bash
python app.py
```

Runs Flask development server on `http://localhost:5000`

### Production

Use a WSGI server like Gunicorn:

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:create_app()
```

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

