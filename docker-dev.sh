#!/bin/bash

# OneSecure Asia - Docker Development Startup Script
echo "🐳 Starting OneSecure Asia Development Environment with Docker"
echo "=============================================================="

# Parse command line arguments
BACKEND_ONLY=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --backend-only) BACKEND_ONLY=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Edit it with your database credentials if needed."
fi

echo "🚀 Building and starting services with Docker Compose Development Configuration..."

# Build and start services using the dev configuration
if [ "$BACKEND_ONLY" = true ]; then
    echo "Starting backend services only (PostgreSQL + Backend API)..."
    docker compose -f docker-compose.dev.yml up postgres backend
else
    echo "Starting all services (PostgreSQL + Backend + Frontend)..."
    docker compose -f docker-compose.dev.yml up
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping Docker services..."
    docker compose -f docker-compose.dev.yml down
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for Docker Compose to finish
wait
