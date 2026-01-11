#!/bin/bash
set -e

echo "🚀 Starting Production Deployment..."

# Navigate to project directory
cd /home/ubuntu/fams-project

# Checkout main branch
echo "📦 Checking out main branch..."
git fetch origin
git checkout main
git pull origin main

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Build and start new containers
echo "🔨 Building and starting containers..."
docker-compose -f docker-compose.prod.yml up --build -d

# Wait for health check
echo "⏳ Waiting for health check..."
sleep 15

# Check health
if curl -f http://localhost:8080/actuator/health; then
    echo "✅ Production deployment successful!"
    
    # Send success notification to Discord
    COMMIT_HASH=$(git rev-parse HEAD)
    curl -X POST "${DISCORD_WEBHOOK_URL}" \
      -H "Content-Type: application/json" \
      -d "{\"embeds\": [{\"title\": \"✅ Production Deployment Successful\", \"color\": 3066993, \"fields\": [{\"name\": \"Environment\", \"value\": \"**PRODUCTION**\", \"inline\": true}, {\"name\": \"Branch\", \"value\": \"main\", \"inline\": true}, {\"name\": \"Commit\", \"value\": \"\`${COMMIT_HASH:0:7}\`\", \"inline\": true}], \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}], \"username\": \"FAMS Deploy Monitor\"}"
    
    exit 0
else
    echo "❌ Production deployment failed!"
    
    # Send failure notification to Discord
    COMMIT_HASH=$(git rev-parse HEAD)
    curl -X POST "${DISCORD_WEBHOOK_URL}" \
      -H "Content-Type: application/json" \
      -d "{\"embeds\": [{\"title\": \"❌ Production Deployment Failed\", \"color\": 15158332, \"fields\": [{\"name\": \"Environment\", \"value\": \"**PRODUCTION**\", \"inline\": true}, {\"name\": \"Branch\", \"value\": \"main\", \"inline\": true}, {\"name\": \"Commit\", \"value\": \"\`${COMMIT_HASH:0:7}\`\", \"inline\": true}], \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}], \"username\": \"FAMS Deploy Monitor\"}"
    
    # Show logs
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi
