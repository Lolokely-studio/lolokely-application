# Lolokely Admin Backend

A Flask-based REST API for task management similar to Monday.com.

## Setup Instructions

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Configure database (Supabase Postgres):**
   Set your `.env` with either a full connection string or discrete values:
   ```env
   # Full connection string (preferred)
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME

   # Or discrete values used by backend/db.py
   USER=...
   PASSWORD=...
   HOST=...
   PORT=5432
   DBNAME=...
   ```

4. **Run the application:**
   ```bash
   python app.py
   ```

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
