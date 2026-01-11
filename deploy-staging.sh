#!/bin/bash
set -e

echo "🚀 Starting Staging Deployment..."

# Navigate to project directory
cd /home/ubuntu/fams-project

# Checkout staging branch
echo "📦 Checking out staging branch..."
git fetch origin
git checkout staging
git pull origin staging

# Load environment variables
if [ -f .env.staging ]; then
    export $(cat .env.staging | grep -v '^#' | xargs)
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.staging.yml down

# Build and start new containers
echo "🔨 Building and starting containers..."
docker-compose -f docker-compose.staging.yml up --build -d

# Wait for health check
echo "⏳ Waiting for health check..."
sleep 10

# Check health
if curl -f http://localhost:8081/actuator/health; then
    echo "✅ Staging deployment successful!"
    exit 0
else
    echo "❌ Staging deployment failed!"
    # Rollback
    docker-compose -f docker-compose.staging.yml logs backend
    exit 1
fi
