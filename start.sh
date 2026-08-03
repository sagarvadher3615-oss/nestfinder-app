#!/bin/bash

echo ""
echo "======================================"
echo "   🏠  NestFinder App - Starting..."
echo "======================================"
echo ""

# Check Docker is installed
if ! command -v docker &> /dev/null; then
  echo "❌  Docker is not installed."
  echo "    Download it from: https://www.docker.com/products/docker-desktop"
  exit 1
fi

# Check Docker is running
if ! docker info &> /dev/null; then
  echo "❌  Docker is not running. Please open Docker Desktop and try again."
  exit 1
fi

echo "✅  Docker is running"
echo ""
echo "🔨  Building and starting all services (this takes 2-3 mins the first time)..."
echo ""

docker compose up --build -d

echo ""
echo "======================================"
echo "   ✅  NestFinder is ready!"
echo "======================================"
echo ""
echo "   🌐  Open in browser:"
echo "       http://localhost:8081"
echo ""
echo "   🔑  Demo accounts:"
echo "       Tenant:   tenant@nestfinder.app   / Demo123!"
echo "       Landlord: landlord@nestfinder.app / Demo123!"
echo ""
echo "   🛑  To stop the app, run: docker compose down"
echo "======================================"
echo ""

# Open browser automatically if possible
if command -v open &> /dev/null; then
  sleep 5 && open http://localhost:8081 &
elif command -v xdg-open &> /dev/null; then
  sleep 5 && xdg-open http://localhost:8081 &
elif command -v start &> /dev/null; then
  sleep 5 && start http://localhost:8081 &
fi
