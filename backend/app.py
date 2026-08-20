from flask import Flask, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
import os
import re

# Load environment variables
load_dotenv()

# Initialize extensions
jwt = JWTManager()
bcrypt = Bcrypt()

def create_app():
    app = Flask(__name__)
    
    # Configuration (secrets must come from environment)
    secret_key = os.getenv('SECRET_KEY')
    jwt_secret_key = os.getenv('JWT_SECRET_KEY')
    if not secret_key or not jwt_secret_key:
        raise RuntimeError('SECRET_KEY and JWT_SECRET_KEY must be set in the environment')

    app.config['SECRET_KEY'] = secret_key
    app.config['JWT_SECRET_KEY'] = jwt_secret_key

    # false = never expire; integer = minutes until expiry
    expires_raw = os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 'false').strip().lower()
    if expires_raw.isdigit():
        from datetime import timedelta
        app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=int(expires_raw))
    else:
        app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False
    
    # Initialize extensions with app
    jwt.init_app(app)
    bcrypt.init_app(app)

    # CORS: allow frontend origins (comma-separated via CORS_ORIGINS)
    cors_raw = os.getenv('CORS_ORIGINS')
    if not cors_raw:
        raise RuntimeError('CORS_ORIGINS must be set in the environment')
    cors_origins = [origin.strip() for origin in cors_raw.split(',') if origin.strip()]
    if not cors_origins:
        raise RuntimeError('CORS_ORIGINS must contain at least one origin')

    # Vercel preview URLs change on every deployment and cannot be listed in
    # advance. Disabled by default: opening up the whole Vercel platform is a
    # choice, not a reasonable default.
    if os.getenv('CORS_ALLOW_VERCEL_PREVIEWS', '').strip().lower() in ('1', 'true', 'yes'):
        cors_origins.append(re.compile(r'^https://.*\.vercel\.app$'))

    CORS(
        app,
        resources={r'/api/*': {'origins': cors_origins}},
        supports_credentials=True,
        allow_headers=['Content-Type', 'Authorization'],
        methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    )
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.tasks import tasks_bp
    from routes.users import users_bp
    from routes.jobs import jobs_bp
    from routes.posts import posts_bp
    from routes.notifications import notifications_bp
    from routes.leaves import leaves_bp
    from routes.companies import companies_bp
    from routes.prospects import prospects_bp
    from routes.company_emails import company_emails_bp
    from routes.company_financials import company_financials_bp
    from routes.crm_ai import crm_ai_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(tasks_bp, url_prefix='/api/tasks')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(jobs_bp, url_prefix='/api/jobs')
    app.register_blueprint(posts_bp, url_prefix='/api/posts')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(leaves_bp, url_prefix='/api/leaves')
    app.register_blueprint(companies_bp, url_prefix='/api/companies')
    app.register_blueprint(prospects_bp, url_prefix='/api/prospects')
    app.register_blueprint(company_emails_bp, url_prefix='/api/company-emails')
    app.register_blueprint(company_financials_bp, url_prefix='/api/company-financials')
    app.register_blueprint(crm_ai_bp, url_prefix='/api/crm-ai')
    
    # Health check (no auth): does not touch the database by default, otherwise
    # a Supabase outage would make a healthy backend restart in a loop.
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

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Not found'}, 404
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
