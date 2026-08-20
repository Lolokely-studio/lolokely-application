# Architecture Documentation

## System Architecture Overview

Lolokely follows a **client-server architecture** with a clear separation between frontend and backend components. The application uses a RESTful API for communication between the client and server.

```
┌─────────────────────┐
│    React Client     │
│  (Vite build, SPA)  │
│   deployed: Vercel  │
└──────────┬──────────┘
           │ HTTP/REST — VITE_API_URL
           │
┌──────────▼──────────┐
│    Flask Server     │
│  (gunicorn, WSGI)   │
│   deployed: Render  │
└──────────┬──────────┘
           │
           ├──────────────────────┐
           │                      │
┌──────────▼──────────┐ ┌─────────▼──────────┐
│  Supabase Postgres  │ │  NVIDIA BUILD API  │
│ (Supavisor pooler,  │ │  (LangChain Chat-  │
│  psycopg2 pool)     │ │   NVIDIA models)   │
└─────────────────────┘ └────────────────────┘
```

Deployment settings for both platforms live in `DEPLOY.md` at the repository root.

## Backend Architecture

### Application Structure

```
backend/
├── app.py                 # Flask application factory (+ /healthz)
├── wsgi.py                # WSGI entrypoint used by gunicorn in production
├── db.py                  # Pooled database connection management
├── pyproject.toml         # Python dependencies (uv)
├── uv.lock                # Locked dependency tree — committed
├── .python-version        # Pinned runtime (3.11.9)
├── tests/                 # pytest suite (db.py + app configuration)
├── routes/                # API route handlers
│   ├── auth.py           # Authentication endpoints
│   ├── tasks.py          # Task management endpoints
│   ├── users.py          # User management endpoints
│   ├── posts.py          # Post generation endpoints
│   ├── notifications.py  # Notification endpoints
│   └── jobs.py           # Job-related endpoints
└── schemas/              # Data validation schemas
    ├── task_schema.py    # Task/subtask validation
    └── user_schema.py    # User validation
```

### Core Components

#### 1. Flask Application (`app.py`)

The Flask application is created using the **Application Factory Pattern**:

```python
def create_app():
    app = Flask(__name__)
    # Configuration
    # Extension initialization
    # Blueprint registration
    return app
```

**Key Features:**
- JWT Manager for authentication
- Bcrypt for password hashing
- CORS enabled for cross-origin requests
- Blueprint-based route organization

#### 2. Database Connection (`db.py`)

Uses `psycopg2` for PostgreSQL connections:

- **Connection Management**: Context managers for safe connection handling
- **Environment Variables**: Database credentials from `.env` file
- **SSL Mode**: Secure connections with `sslmode="require"`

#### 3. Route Handlers

Each route module is a Flask Blueprint:

- **`auth.py`**: User registration, login, and current user info
- **`tasks.py`**: CRUD operations for tasks and subtasks, assignments
- **`users.py`**: User listing and retrieval
- **`posts.py`**: Post generation, saving, and retrieval
- **`notifications.py`**: Notification management
- **`jobs.py`**: Job-related operations

#### 4. Data Validation (`schemas/`)

Uses **Marshmallow** for schema validation:

- **TaskSchema**: Validates task creation/update data
- **SubtaskSchema**: Validates subtask data
- **UserSchema**: Validates user registration data
- **LoginSchema**: Validates login credentials

### Request Flow

```
Client Request
    │
    ▼
Flask App (app.py)
    │
    ▼
JWT Middleware (Authentication Check)
    │
    ▼
Blueprint Route Handler
    │
    ▼
Schema Validation (Marshmallow)
    │
    ▼
Database Query (psycopg2)
    │
    ▼
Response (JSON)
```

### Authentication Flow

1. **Registration/Login**: User provides credentials
2. **Password Verification**: Bcrypt checks password hash
3. **Token Generation**: JWT token created with user ID
4. **Token Storage**: Client stores token in localStorage
5. **Request Authentication**: Token sent in `Authorization` header
6. **Token Validation**: Flask-JWT-Extended validates token
7. **User Identity**: `get_jwt_identity()` extracts user ID

## Frontend Architecture

### Application Structure

```
frontend/
├── src/
│   ├── App.jsx            # Main application component
│   ├── main.jsx           # Application entry point
│   ├── components/        # React components
│   │   ├── Dashboard.jsx
│   │   ├── TaskCard.jsx
│   │   ├── PostGenerator.jsx
│   │   └── ...
│   ├── contexts/          # React Context providers
│   │   ├── AuthContext.jsx
│   │   ├── ThemeContext.jsx
│   │   └── SidebarContext.jsx
│   └── services/          # API service functions
│       ├── api.js
│       ├── taskService.js
│       └── postService.js
├── package.json
└── vite.config.js
```

### Component Hierarchy

```
App
├── ThemeProvider
│   └── AuthProvider
│       └── SidebarProvider
│           └── Router
│               └── Routes
│                   ├── LoginForm
│                   ├── RegisterForm
│                   └── ProtectedRoute
│                       └── LayoutWrapper
│                           ├── Navbar
│                           ├── NotificationBell
│                           └── Page Components
│                               ├── Dashboard
│                               ├── Jobs
│                               ├── PostGenerator
│                               └── PostHistory
```

### State Management

#### Context API Usage

1. **AuthContext**: Manages authentication state
   - `isAuthenticated`: Boolean flag
   - `user`: Current user object
   - `login()`, `logout()`: Authentication methods
   - `loading`: Loading state

2. **ThemeContext**: Manages theme preferences
   - `theme`: Current theme ('light' or 'dark')
   - `toggleTheme()`: Switch themes

3. **SidebarContext**: Manages sidebar state
   - `isCollapsed`: Sidebar collapse state
   - `toggleSidebar()`: Toggle sidebar

#### Service Layer

Centralized API communication through service modules:

- **`api.js`**: Axios instance with interceptors
  - Base URL configuration
  - Token injection
  - Error handling (401 redirects)

- **`taskService.js`**: Task-related API calls
- **`postService.js`**: Post-related API calls
- **`notificationService.js`**: Notification API calls

### Routing Structure

Protected routes require authentication:

- `/login` - Public
- `/register` - Public
- `/dashboard` - Protected
- `/jobs` - Protected
- `/posts` - Protected
- `/posts/history` - Protected

## Database Architecture

### Database Design

PostgreSQL database with the following characteristics:

- **UUID Primary Keys**: All tables use UUID for primary keys
- **Timestamps**: `created_at` and `updated_at` on all tables
- **Foreign Keys**: Referential integrity with cascade deletes
- **Indexes**: Optimized queries with strategic indexes
- **Constraints**: Check constraints for status and priority values

### Table Relationships

```
users
  ├── task_assignments (many-to-many)
  ├── subtask_assignments (many-to-many)
  ├── social_posts (one-to-many)
  ├── user_post_preferences (one-to-one)
  └── notifications (one-to-many)

tasks
  ├── subtasks (one-to-many)
  ├── task_assignments (many-to-many)
  └── notifications (one-to-many)

subtasks
  ├── subtask_assignments (many-to-many)
  └── notifications (one-to-many)
```

### Data Flow

1. **Create Operation**: Client → API → Validation → Database → Response
2. **Read Operation**: Client → API → Database Query → Response
3. **Update Operation**: Client → API → Validation → Database Update → Response
4. **Delete Operation**: Client → API → Database Delete → Cascade → Response

## AI Integration

### NVIDIA BUILD Integration

Post generation and the CRM AI features call NVIDIA-hosted models through
LangChain's `ChatNVIDIA` (`backend/services/nvidia_llm.py`). This replaced the
earlier Google Gemini integration.

1. **API Configuration**: `NVIDIA_API_KEY` from environment variables
2. **Client Initialization**: `ChatNVIDIA` via `langchain-nvidia-ai-endpoints`
3. **Model Fallback**: `NVIDIA_TEXT_MODELS` lists models tried in order
4. **Prompt Engineering**: Structured prompts for consistent output
5. **Response Parsing**: JSON extraction and validation
6. **Error Handling**: Retries on rate-limit and capacity errors, then fallback
   to the next model in the list

Because these calls routinely take longer than gunicorn's 30 s default, the
production start command sets `--timeout 120`. See `DEPLOY.md`.

### Post Generation Flow

```
User Input (theme, platform, tonality, etc.)
    │
    ▼
Flask Route (/api/posts/generate)
    │
    ▼
NVIDIA model call (with fallback)
    │
    ▼
Response Parsing (JSON extraction)
    │
    ▼
Return 3 Variations
    │
    ▼
User Selection
    │
    ▼
Save to Database
    │
    ▼
Update User Preferences
```

## Security Architecture

### Authentication & Authorization

- **JWT Tokens**: Stateless authentication
- **Token Storage**: localStorage (client-side)
- **Token Expiration**: Configurable (currently disabled for simplicity)
- **Protected Routes**: Middleware checks on all protected endpoints

### Data Security

- **Password Hashing**: Bcrypt with salt rounds
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: React's automatic escaping
- **CORS**: Configured for specific origins
- **Input Validation**: Server-side validation with Marshmallow

### Error Handling

- **Try-Catch Blocks**: Comprehensive error handling
- **Error Logging**: Console logging for debugging
- **User-Friendly Messages**: Sanitized error messages to clients
- **HTTP Status Codes**: Proper status code usage

## Deployment Architecture

### Development Environment

- **Backend**: Flask development server (localhost:5000)
- **Frontend**: Vite dev server (localhost:5173)
- **Database**: Supabase PostgreSQL (cloud)

### Production Considerations

- **Backend**: WSGI server (Gunicorn, uWSGI)
- **Frontend**: Static files served via CDN or web server
- **Database**: Production PostgreSQL instance
- **Environment Variables**: Secure configuration management
- **HTTPS**: SSL/TLS encryption
- **CORS**: Restricted to production domain

## Performance Considerations

### Database Optimization

- **Indexes**: Strategic indexes on frequently queried columns
- **Connection Pooling**: Efficient connection management
- **Query Optimization**: Efficient JOIN operations

### Frontend Optimization

- **Code Splitting**: Route-based code splitting
- **Lazy Loading**: Component lazy loading
- **Asset Optimization**: Vite build optimization
- **Caching**: Browser caching strategies

## Scalability

### Horizontal Scaling

- **Stateless Backend**: JWT allows stateless scaling
- **Database Scaling**: PostgreSQL read replicas
- **CDN**: Static asset delivery

### Vertical Scaling

- **Connection Pooling**: Efficient resource usage
- **Caching**: Redis for session/token caching (future)
- **Load Balancing**: Multiple backend instances

## Monitoring & Logging

### Current Implementation

- **Console Logging**: Python print statements
- **Error Tracking**: Try-catch with traceback
- **Client Logging**: Browser console

### Future Enhancements

- Structured logging (e.g., Python logging module)
- Error tracking service (e.g., Sentry)
- Performance monitoring
- Analytics integration

