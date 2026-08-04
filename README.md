# Lolokely Admin - Task Management & Social Media Post Generator

A full-stack web application for team task management, with integrated AI-powered social media post generation. Built with Flask backend and React frontend.

## Features

### Task Management
- **User Authentication**: Registration, login, and JWT-based authentication
- **Task Management**: Create, read, update, and delete tasks
- **Subtask Support**: Hierarchical task structure with subtasks
- **Team Assignment**: Assign tasks and subtasks to multiple team members
- **Status Tracking**: Track task progress (To Do, In Progress, Completed)
- **Priority Levels**: Set task priorities (Low, Medium, High)
- **Due Dates**: Set and track task deadlines

### Social Media Post Generator
- **AI-Powered Generation**: Generate engaging social media posts using NVIDIA LangChain models (with multi-model fallback)
- **Multiple Variations**: Get 3 different post variations for each generation
- **Platform Support**: Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube
- **Customizable Tonality**: Professional, Casual, Funny, Inspirational, Educational, Energetic
- **Multi-Language Support**: English, French, Spanish, German, Italian
- **Media Attachments**: Attach images or videos to posts
- **Post History**: View and manage all generated posts with full history
- **User Preferences**: System learns from your choices to improve suggestions

### CRM AI Agents (Admin)
- **Top 10 à contacter**: AI ranking of companies in status `new` with scores and reasons
- **Outreach pack**: Generate a French outreach email + prestation document (markdown) from company context
- **AI Runs**: Admin observability page (`/admin/ai-runs`) for model, duration, and status of each run

### UI/UX
- **Modern UI**: Clean, responsive interface built with Tailwind CSS
- **Dark/Light Theme**: Theme switching support
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

### Backend
- **Flask**: Python web framework
- **PostgreSQL**: Primary database (Supabase)
- **Flask-JWT-Extended**: JWT authentication
- **Flask-Bcrypt**: Password hashing
- **Marshmallow**: Data validation and serialization
- **Flask-CORS**: Cross-origin resource sharing
- **NVIDIA LangChain (ChatNVIDIA)**: AI-powered content generation with multi-model fallback
- **python-dotenv**: Environment variable management
- **psycopg2**: PostgreSQL adapter

### Frontend
- **React**: JavaScript library for building user interfaces
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API requests
- **Lucide React**: Beautiful SVG icons

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

   # Optional overrides
   # NVIDIA_TEXT_MODELS=minimaxai/minimax-m3,z-ai/glm-5.2,nvidia/nemotron-3-ultra-550b-a55b
   # NVIDIA_VISION_MODEL=google/diffusiongemma-26b-a4b-it
   # NVIDIA_TEMPERATURE=1
   # NVIDIA_TOP_P=1
   # NVIDIA_MAX_TOKENS=16384
   # NVIDIA_SEED=42
   ```

5. **Initialize database:**
   Run the SQL schema file to create all necessary tables:
   ```bash
   # Connect to your PostgreSQL database and run:
   psql -h your_host -U your_user -d your_database -f schemas/db.sql
   ```
   Or manually execute the SQL from `backend/schemas/db.sql` in your database.

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

### Social Media Posts
- `POST /api/posts/generate` - Generate social media post variations using AI
- `POST /api/posts/save` - Save a generated post
- `GET /api/posts/` - Get all saved posts for current user
- `GET /api/posts/preferences` - Get user post preferences

### CRM AI (Admin)
- `POST /api/crm-ai/suggest-top` - Rank top companies with status `new`
- `GET /api/crm-ai/suggest-top/latest` - Last cached ranking
- `POST /api/crm-ai/companies/<id>/outreach-pack` - Generate email + prestation markdown
- `GET /api/crm-ai/companies/<id>/outreach-pack` - Latest outreach pack
- `GET /api/crm-ai/runs` - List AI run observability records

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

### Social Posts Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `theme` (String)
- `description` (Text)
- `platform` (String: Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube)
- `tonality` (String: Professional, Casual, Funny, Inspirational, Educational, Energetic)
- `language` (String: en, fr, es, de, it)
- `target_audience` (Text)
- `generated_variations` (JSONB: Array of generated post variations)
- `selected_variation` (Text: The chosen variation)
- `media_url` (Text: URL or base64 data)
- `media_type` (String: image, video, or null)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### User Post Preferences Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key, Unique)
- `preferred_platforms` (JSONB: Array of preferred platforms)
- `preferred_tonalities` (JSONB: Array of preferred tonalities)
- `preferred_languages` (JSONB: Array of preferred languages)
- `common_themes` (JSONB: Array of frequently used themes)
- `created_at` (DateTime)
- `updated_at` (DateTime)

## Usage

### Task Management
1. **Register/Login**: Create an account or sign in to access the dashboard
2. **Create Tasks**: Click "Create New Task" to add tasks with titles, descriptions, priorities, and due dates
3. **Manage Tasks**: Update task status, priority, and details directly from the task cards
4. **Add Subtasks**: Create subtasks within existing tasks for better organization
5. **Assign Team Members**: Assign tasks and subtasks to team members
6. **Track Progress**: Monitor task completion and team workload

### Social Media Post Generation
1. **Navigate to Post Generator**: Click "Post Generator" in the navigation menu
2. **Fill in Post Details**: 
   - Enter a theme (required)
   - Add a description (optional)
   - Select platform (Instagram, Facebook, Twitter, etc.)
   - Choose tonality (Professional, Casual, Funny, etc.)
   - Select language (English, French, Spanish, etc.)
   - Specify target audience (optional)
3. **Generate Posts**: Click "Generate Posts" to get 3 AI-generated variations
4. **Select Variation**: Choose your preferred post from the generated variations
5. **Add Media** (Optional): Upload images or videos to accompany your post
6. **Save Post**: Click "Save Post" to store it in your history
7. **View History**: Access "Post History" to view all your saved posts, copy them, or see all variations

### Post History Features
- View all saved posts with metadata
- Expand posts to see all generated variations
- Copy any variation to clipboard
- See media attachments
- Filter by platform, tonality, or date

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
2. Configure environment variables (including `NVIDIA_API_KEY`)
3. Ensure Generative Language API is enabled in Google Cloud Console
4. Deploy to your preferred platform (Heroku, Railway, etc.)

**Note**: Make sure to add your `NVIDIA_API_KEY` to the environment variables. Get your API key from [NVIDIA Build](https://build.nvidia.com/).

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
