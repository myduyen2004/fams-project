#!/bin/bash
set -e

echo "🚀 Starting Production Deployment..."

# Navigate to project directory
cd /home/ec2-user/fams-project || exit 1

# Checkout main branch
echo "📦 Checking out main branch..."
git fetch origin
git checkout main
git pull origin main

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production down 2>/dev/null || true

# Build and start new containers with env file
echo "🔨 Building and starting containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d

# Wait for health check (longer wait for schema creation)
echo "⏳ Waiting for health check (60s for schema creation)..."
sleep 60

# Check health
if curl -sf http://localhost:8080/actuator/health; then
    echo "✅ Production deployment successful!"
    
    # Send success notification to Discord
    COMMIT_HASH=$(git rev-parse HEAD)
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -X POST "${DISCORD_WEBHOOK_URL}" \
          -H "Content-Type: application/json" \
          -d "{\"embeds\": [{\"title\": \"✅ Production Deployment Successful\", \"color\": 3066993, \"fields\": [{\"name\": \"Environment\", \"value\": \"**PRODUCTION**\", \"inline\": true}, {\"name\": \"Commit\", \"value\": \"\`${COMMIT_HASH:0:7}\`\", \"inline\": true}]}], \"username\": \"FAMS Deploy Monitor\"}"
    fi
    
    exit 0
else
    echo "❌ Production deployment failed!"
    
    # Send failure notification to Discord
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -X POST "${DISCORD_WEBHOOK_URL}" \
          -H "Content-Type: application/json" \
          -d "{\"embeds\": [{\"title\": \"❌ Production Deployment Failed\", \"color\": 15158332}], \"username\": \"FAMS Deploy Monitor\"}"
    fi
    
    docker compose -f docker-compose.prod.yml --env-file .env.production logs backend --tail=50
    exit 1
fi
