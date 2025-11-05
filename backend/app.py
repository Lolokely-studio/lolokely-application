from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize extensions
jwt = JWTManager()
bcrypt = Bcrypt()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-string')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # Tokens don't expire for simplicity
    
    # Initialize extensions with app
    jwt.init_app(app)
    bcrypt.init_app(app)
    CORS(app)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.tasks import tasks_bp
    from routes.users import users_bp
    from routes.jobs import jobs_bp
    from routes.posts import posts_bp
    from routes.notifications import notifications_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(tasks_bp, url_prefix='/api/tasks')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(jobs_bp, url_prefix='/api/jobs')
    app.register_blueprint(posts_bp, url_prefix='/api/posts')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Not found'}, 404
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
