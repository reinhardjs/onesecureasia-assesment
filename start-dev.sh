#!/bin/bash

# OneSecure Asia - Local Development Startup Script
echo "🛡️ Starting OneSecure Asia Domain Security Assessment Platform"
echo "=============================================================="

# Check if Docker mode is requested
if [ "$1" == "--docker" ]; then
    echo "🐳 Starting in Docker mode..."
    ./docker-dev.sh
    exit $?
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Edit it with your database credentials if needed."
fi

# Check if dependencies are installed
echo "📦 Checking dependencies..."

# Install Python dependencies
if [ ! -d "python-tests/__pycache__" ]; then
    echo "Installing Python dependencies..."
    cd python-tests && pip install -r requirements.txt && cd ..
fi

# Install backend dependencies
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Install frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "🚀 Starting services..."

# Start backend in background
echo "Starting backend server on port 3001..."
(cd backend && node src/server.js) &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Test backend health
echo "🔍 Testing backend health..."
curl -s http://localhost:3001/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend is running at http://localhost:3001"
    echo "📚 API documentation: http://localhost:3001/api-docs"
    echo "🔑 Default login: admin / admin123"
else
    echo "❌ Backend failed to start properly"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend in background
echo ""
echo "🚀 Starting frontend development server..."
(cd frontend && npm start) &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

echo ""
echo "🎉 Services started successfully!"
echo "Backend:  http://localhost:3001"
echo "API Docs: http://localhost:3001/api-docs"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    echo "✅ Backend server stopped"
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Frontend server stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for processes to complete
wait $BACKEND_PID $FRONTEND_PID
