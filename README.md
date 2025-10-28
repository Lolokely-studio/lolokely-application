# Lolokely Admin - Task Management Application

A full-stack web application for team task management similar to Monday.com, built with Flask backend and React frontend.

## Features

- **User Authentication**: Registration, login, and JWT-based authentication
- **Task Management**: Create, read, update, and delete tasks
- **Subtask Support**: Hierarchical task structure with subtasks
- **Team Assignment**: Assign tasks and subtasks to multiple team members
- **Status Tracking**: Track task progress (To Do, In Progress, Completed)
- **Priority Levels**: Set task priorities (Low, Medium, High)
- **Due Dates**: Set and track task deadlines
- **Modern UI**: Clean, responsive interface built with Tailwind CSS

## Tech Stack

### Backend
- **Flask**: Python web framework
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Primary database (Supabase)
- **Flask-JWT-Extended**: JWT authentication
- **Flask-Bcrypt**: Password hashing
- **Marshmallow**: Data validation and serialization
- **Flask-CORS**: Cross-origin resource sharing

### Frontend
- **React**: JavaScript library for building user interfaces
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API requests
- **Heroicons**: Beautiful SVG icons

## Project Structure

```
lolokely-admin/
├── backend/
│   ├── models/           # Database models
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic
│   ├── schemas/          # Data validation schemas
│   ├── app.py           # Flask application entry point
│   └── requirements.txt # Python dependencies
└── frontend/
    ├── src/
    │   ├── components/   # React components
    │   ├── contexts/    # React context providers
    │   ├── services/    # API service functions
    │   ├── hooks/       # Custom React hooks
    │   └── utils/       # Utility functions
    ├── package.json     # Node.js dependencies
    └── tailwind.config.js # Tailwind configuration
```

## Setup Instructions

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Initialize database:**
   ```bash
   export FLASK_APP=app.py
   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
   ```

6. **Run the backend server:**
   ```bash
   python app.py
   ```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env if needed (default points to localhost:5000)
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

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

### Users Table
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `password_hash` (String)
- `first_name` (String)
- `last_name` (String)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Tasks Table
- `id` (UUID, Primary Key)
- `title` (String)
- `description` (Text)
- `status` (String: todo, in_progress, completed)
- `priority` (String: low, medium, high)
- `due_date` (DateTime)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Subtasks Table
- `id` (UUID, Primary Key)
- `task_id` (UUID, Foreign Key)
- `title` (String)
- `description` (Text)
- `status` (String: todo, in_progress, completed)
- `priority` (String: low, medium, high)
- `due_date` (DateTime)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Task Assignments Table
- `id` (UUID, Primary Key)
- `task_id` (UUID, Foreign Key)
- `user_id` (UUID, Foreign Key)
- `assigned_at` (DateTime)

### Subtask Assignments Table
- `id` (UUID, Primary Key)
- `subtask_id` (UUID, Foreign Key)
- `user_id` (UUID, Foreign Key)
- `assigned_at` (DateTime)

## Usage

1. **Register/Login**: Create an account or sign in to access the dashboard
2. **Create Tasks**: Click "Create New Task" to add tasks with titles, descriptions, priorities, and due dates
3. **Manage Tasks**: Update task status, priority, and details directly from the task cards
4. **Add Subtasks**: Create subtasks within existing tasks for better organization
5. **Assign Team Members**: Assign tasks and subtasks to team members
6. **Track Progress**: Monitor task completion and team workload

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation and sanitization
- SQL injection prevention through ORM
- XSS protection through React's built-in escaping

## Development

### Adding New Features

1. **Backend**: Add new models in `models/`, routes in `routes/`, and services in `services/`
2. **Frontend**: Create new components in `components/` and update the routing in `App.jsx`

### Database Migrations

When modifying models, create new migrations:
```bash
flask db migrate -m "Description of changes"
flask db upgrade
```

### Testing

Run backend tests:
```bash
python -m pytest
```

Run frontend tests:
```bash
npm test
```

## Deployment

### Backend Deployment
1. Set up PostgreSQL database (Supabase recommended)
2. Configure environment variables
3. Deploy to your preferred platform (Heroku, Railway, etc.)

### Frontend Deployment
1. Build the production bundle: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
