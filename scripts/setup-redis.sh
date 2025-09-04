#!/bin/bash

# Redis Setup Script for Development
# This script helps set up Redis for the agritech universities queue system

echo "🚀 Setting up Redis for Agritech Universities Worker..."

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis is not installed."
    echo "📦 Installing Redis..."

    # For Windows (using Chocolatey)
    if command -v choco &> /dev/null; then
        choco install redis-64
    # For macOS
    elif command -v brew &> /dev/null; then
        brew install redis
    # For Ubuntu/Debian
    elif command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install redis-server
    else
        echo "❌ Please install Redis manually:"
        echo "   - Windows: choco install redis-64"
        echo "   - macOS: brew install redis"
        echo "   - Ubuntu: sudo apt-get install redis-server"
        exit 1
    fi
fi

echo "✅ Redis is installed"

# Start Redis server
echo "🔄 Starting Redis server..."
if command -v redis-server &> /dev/null; then
    redis-server --daemonize yes
    echo "✅ Redis server started in background"
else
    echo "❌ Failed to start Redis server"
    exit 1
fi

# Verify Redis is running
sleep 2
if redis-cli ping &> /dev/null; then
    echo "✅ Redis is running and responding to ping"
else
    echo "❌ Redis is not responding"
    exit 1
fi

echo ""
echo "🎉 Redis setup complete!"
echo "📋 Redis is now running on localhost:6379"
echo "🔧 Update your .env.local with Redis configuration if needed"
echo ""
echo "To start the agritech worker:"
echo "  npm run worker:agritech"
echo ""
echo "To stop Redis:"
echo "  redis-cli shutdown"
