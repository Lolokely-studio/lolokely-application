# Setup & Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Python 3.11+**: For backend development
- **Node.js 18+**: For frontend development
- **npm** or **yarn**: Package manager
- **PostgreSQL**: Database (or use Supabase cloud)
- **Git**: Version control

### Required Accounts

- **Supabase Account**: For PostgreSQL database (or self-hosted PostgreSQL)
- **NVIDIA Build Account**: For NVIDIA API key ([Get API Key](https://build.nvidia.com/))

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd lolokely-application
```

### Step 2: Backend Setup

#### 2.1 Navigate to Backend Directory

```bash
cd backend
```

#### 2.2 Create Virtual Environment

**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

#### 2.3 Install Dependencies

```bash
pip install -r requirements.txt
```

#### 2.4 Create Environment File

Create a `.env` file in the `backend/` directory:

```env
# Database Configuration
USER_DB=your_database_user
PASSWORD_DB=your_database_password
HOST=your_database_host
PORT=5432
DBNAME=your_database_name

# Security Keys
SECRET_KEY=your-secret-key-here-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-here-change-in-production

# NVIDIA API (LangChain ChatNVIDIA)
NVIDIA_API_KEY=nvapi-your_key_here
# Optional: NVIDIA_TEXT_MODELS, NVIDIA_VISION_MODEL, NVIDIA_TEMPERATURE, etc.
```

**Generate Secret Keys:**
```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# Generate JWT_SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"
```

### Step 3: Frontend Setup

#### 3.1 Navigate to Frontend Directory

```bash
cd ../frontend
```

#### 3.2 Install Dependencies

```bash
npm install
```

#### 3.3 Create Environment File

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### Step 4: Database Setup

#### 4.1 Create Database

If using Supabase:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Note your database credentials

If using local PostgreSQL:
```bash
createdb lolokely_db
```

#### 4.2 Run Database Schema

**Option 1: Using psql**
```bash
psql -h your_host -U your_user -d your_database -f schemas/db.sql
```

**Option 2: Using Supabase SQL Editor**
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `backend/schemas/db.sql`
3. Paste and execute

**Option 3: Using Database Client**
- Use pgAdmin, DBeaver, or similar tool
- Execute the SQL from `backend/schemas/db.sql`

#### 4.3 Verify Database Setup

Check that all tables are created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Expected tables:
- users
- tasks
- subtasks
- task_assignments
- subtask_assignments
- social_posts
- user_post_preferences
- notifications

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `USER_DB` | Database username | Yes | `postgres` |
| `PASSWORD_DB` | Database password | Yes | `your_password` |
| `HOST` | Database host | Yes | `db.xxxxx.supabase.co` |
| `PORT` | Database port | Yes | `5432` |
| `DBNAME` | Database name | Yes | `postgres` |
| `SECRET_KEY` | Flask secret key | Yes | `generated_key` |
| `JWT_SECRET_KEY` | JWT secret key | Yes | `generated_key` |
| `NVIDIA_API_KEY` | NVIDIA API Catalog key | Yes | `nvapi-...` |

### Frontend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_API_URL` | Backend API URL | Yes | `http://localhost:5000/api` |

### Getting NVIDIA API Key

1. Go to [NVIDIA Build](https://build.nvidia.com/)
2. Sign in and create an API key
3. Copy the key (starts with `nvapi-`)
4. Add it to your `.env` file

**Note:** Keep your API key secure and never commit it to version control.

## Running the Application

### Development Mode

#### Start Backend Server

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python app.py
```

Backend will run on `http://localhost:5000`

#### Start Frontend Server

In a new terminal:

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:5173`

#### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

### Using Setup Script

If a `setup.sh` script is available:

```bash
chmod +x setup.sh
./setup.sh
```

## Production Deployment

### Backend Deployment

#### Option 1: Using Gunicorn (Recommended)

1. **Install Gunicorn:**
```bash
pip install gunicorn
```

2. **Create Gunicorn Config:**
Create `gunicorn_config.py`:
```python
bind = "0.0.0.0:5000"
workers = 4
worker_class = "sync"
timeout = 120
keepalive = 5
```

3. **Run with Gunicorn:**
```bash
gunicorn -c gunicorn_config.py "app:create_app()"
```

#### Option 2: Using uWSGI

1. **Install uWSGI:**
```bash
pip install uwsgi
```

2. **Create uWSGI Config:**
Create `uwsgi.ini`:
```ini
[uwsgi]
module = app:create_app()
callable = app
http = 0.0.0.0:5000
processes = 4
threads = 2
```

3. **Run with uWSGI:**
```bash
uwsgi uwsgi.ini
```

#### Deployment Platforms

**Heroku:**
1. Install Heroku CLI
2. Create `Procfile`:
```
web: gunicorn -w 4 -b 0.0.0.0:$PORT "app:create_app()"
```
3. Deploy:
```bash
heroku create your-app-name
git push heroku main
```

**Railway:**
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

**Render:**
1. Create new Web Service
2. Connect repository
3. Configure build and start commands
4. Set environment variables

**DigitalOcean App Platform:**
1. Create new app
2. Connect repository
3. Configure environment
4. Deploy

### Frontend Deployment

#### Build for Production

```bash
cd frontend
npm run build
```

This creates an optimized build in the `dist/` directory.

#### Deployment Platforms

**Vercel:**
```bash
npm install -g vercel
vercel
```

**Netlify:**
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Deploy

**GitHub Pages:**
1. Install `gh-pages`:
```bash
npm install --save-dev gh-pages
```
2. Add to `package.json`:
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```
3. Deploy:
```bash
npm run deploy
```

**Static Hosting:**
- Upload `dist/` contents to:
  - AWS S3 + CloudFront
  - Google Cloud Storage
  - Azure Static Web Apps
  - Any static hosting service

### Environment Variables in Production

#### Backend

Set environment variables on your hosting platform:

- **Heroku:**
```bash
heroku config:set SECRET_KEY=your_key
heroku config:set JWT_SECRET_KEY=your_key
heroku config:set NVIDIA_API_KEY=your_key
```

- **Railway/Render:**
Use the platform's environment variable settings in the dashboard.

#### Frontend

Set environment variables during build or in hosting platform:

- **Vercel/Netlify:**
Add environment variables in project settings.

- **Build-time:**
```bash
VITE_API_URL=https://api.yourdomain.com/api npm run build
```

### Database Setup in Production

1. **Use Managed PostgreSQL:**
   - Supabase (recommended)
   - AWS RDS
   - Google Cloud SQL
   - Azure Database for PostgreSQL

2. **Connection String:**
   - Use connection pooling
   - Enable SSL/TLS
   - Use strong passwords

3. **Backup Strategy:**
   - Automated daily backups
   - Point-in-time recovery
   - Test restore procedures

### SSL/TLS Configuration

1. **Obtain SSL Certificate:**
   - Let's Encrypt (free)
   - Cloud provider certificates
   - Commercial certificates

2. **Configure HTTPS:**
   - Use reverse proxy (Nginx, Caddy)
   - Configure SSL termination
   - Redirect HTTP to HTTPS

### Reverse Proxy Setup (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Troubleshooting

### Common Issues

#### Backend Issues

**1. Database Connection Error**
```
Error: could not connect to server
```
**Solution:**
- Check database credentials in `.env`
- Verify database is running
- Check firewall/network settings
- Verify SSL mode if using Supabase

**2. Module Not Found Error**
```
ModuleNotFoundError: No module named 'flask'
```
**Solution:**
- Activate virtual environment
- Install dependencies: `pip install -r requirements.txt`

**3. JWT Token Error**
```
Error: Invalid token
```
**Solution:**
- Check `JWT_SECRET_KEY` is set correctly
- Verify token is being sent in Authorization header
- Check token expiration settings

**4. NVIDIA API Error**
```
Error: NVIDIA API key not configured
```
**Solution:**
- Verify `NVIDIA_API_KEY` in `.env`
- Check API key is valid and starts with `nvapi-`
- Confirm models are available on https://build.nvidia.com/

#### Frontend Issues

**1. API Connection Error**
```
Network Error: Failed to fetch
```
**Solution:**
- Check `VITE_API_URL` in `.env`
- Verify backend server is running
- Check CORS configuration
- Verify network connectivity

**2. Build Errors**
```
Error: Cannot find module
```
**Solution:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Check Node.js version compatibility

**3. Routing Issues**
```
404 on page refresh
```
**Solution:**
- Configure server to serve `index.html` for all routes
- Use history mode in React Router
- Configure redirects in hosting platform

### Debugging Tips

1. **Check Logs:**
   - Backend: Check console output
   - Frontend: Check browser console
   - Database: Check database logs

2. **Verify Environment Variables:**
   ```bash
   # Backend
   python -c "from dotenv import load_dotenv; import os; load_dotenv(); print(os.getenv('SECRET_KEY'))"
   
   # Frontend
   echo $VITE_API_URL
   ```

3. **Test Database Connection:**
   ```python
   from db import get_connection
   conn = get_connection()
   print("Connected successfully!")
   conn.close()
   ```

4. **Test API Endpoints:**
   ```bash
   # Test health endpoint (if available)
   curl http://localhost:5000/api/auth/me
   
   # Test with token
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/tasks/
   ```

## Security Checklist

### Before Deployment

- [ ] Change default secret keys
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production domain only
- [ ] Set up database backups
- [ ] Enable database SSL connections
- [ ] Use environment variables (never commit secrets)
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting (if needed)
- [ ] Review and update dependencies
- [ ] Enable security headers
- [ ] Set up error tracking (Sentry, etc.)

## Maintenance

### Regular Tasks

1. **Update Dependencies:**
   ```bash
   # Backend
   pip list --outdated
   pip install --upgrade package_name
   
   # Frontend
   npm outdated
   npm update
   ```

2. **Database Maintenance:**
   - Regular backups
   - Monitor database size
   - Optimize queries
   - Review indexes

3. **Security Updates:**
   - Monitor security advisories
   - Update dependencies regularly
   - Review access logs
   - Audit user permissions

## Support

For additional help:
- Check the main [README.md](../README.md)
- Review other documentation files
- Check GitHub issues
- Contact the development team

