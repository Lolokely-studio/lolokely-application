#!/bin/bash

echo "🚀 Setting up Lolokely Admin Task Management Application"
echo "=================================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Python and Node.js are installed"

# Backend setup
echo ""
echo "📦 Setting up Backend..."
cd backend

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your database credentials"
fi

echo "✅ Backend setup complete"
echo ""

# Frontend setup
echo "📦 Setting up Frontend..."
cd ../frontend

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

echo "✅ Frontend setup complete"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your database credentials"
echo "2. Initialize the database:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   export FLASK_APP=app.py"
echo "   flask db init"
echo "   flask db migrate -m 'Initial migration'"
echo "   flask db upgrade"
echo ""
echo "3. Start the backend server:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python app.py"
echo ""
echo "4. Start the frontend server (in a new terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "5. Open http://localhost:5173 in your browser"
echo ""
echo "Happy coding! 🚀"
