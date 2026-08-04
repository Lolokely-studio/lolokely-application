# Lolokely Admin Backend

A Flask-based REST API for task management similar to Monday.com.

## Setup Instructions

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   Create a `.env` file in the backend directory with the following variables:
   ```bash
   # Database Configuration
   USER_DB=your_database_user
   PASSWORD_DB=your_database_password
   HOST=your_database_host
   PORT=5432
   DBNAME=your_database_name

   # JWT Configuration
   SECRET_KEY=your-secret-key-here
   JWT_SECRET_KEY=your-jwt-secret-key-here

   # NVIDIA API Configuration (LangChain ChatNVIDIA)
   # Get your API key from: https://build.nvidia.com/
   NVIDIA_API_KEY=nvapi-your_key_here
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
