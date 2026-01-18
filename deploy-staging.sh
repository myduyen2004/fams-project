#!/bin/bash
set -e

echo "🚀 Starting Staging Deployment..."

# Navigate to project directory
cd /home/ec2-user/fams-staging || exit 1

# Checkout staging branch
echo "📦 Checking out staging branch..."
git fetch origin
git checkout staging
git pull origin staging

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -p fams-staging -f docker-compose.staging.yml --env-file .env.staging down 2>/dev/null || true

# Build and start new containers with env file
echo "🔨 Building and starting containers..."
docker compose -p fams-staging -f docker-compose.staging.yml --env-file .env.staging up --build -d

# Wait for health check (longer wait for schema creation)
echo "⏳ Waiting for health check (60s for schema creation)..."
sleep 60

# Check health
if curl -sf http://localhost:8081/actuator/health; then
    echo "✅ Staging deployment successful!"
    exit 0
else
    echo "❌ Staging deployment failed!"
    docker compose -p fams-staging -f docker-compose.staging.yml --env-file .env.staging logs backend --tail=50
    exit 1
fi
