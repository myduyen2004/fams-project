#!/bin/bash

# ========================================
# FAMS AUTOMATED DEPLOYMENT SCRIPT
# ========================================
# Updated: Uses Neon Cloud PostgreSQL instead of Docker

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Starting FAMS Deployment ===${NC}"

# 1. Pull Latest Code from Develop
echo -e "${YELLOW}Step 1: Pulling latest code from develop...${NC}"
git fetch --all
git checkout develop
git pull origin develop

# 2. Check for .env file
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and configure your secrets."
    exit 1
fi

# 2.1 Verify required environment variables for Neon
echo -e "${YELLOW}Step 2: Checking environment variables...${NC}"
source .env

if [ -z "$DATABASE_PASSWORD_PROD" ]; then
    echo -e "${RED}Error: DATABASE_PASSWORD_PROD not set in .env!${NC}"
    echo "Please add: DATABASE_PASSWORD_PROD=your-neon-password"
    exit 1
fi

echo -e "${GREEN}✓ Database password configured${NC}"

# 2.2 Check for ai-service/.env
if [ ! -f ai-service/.env ]; then
    echo -e "${YELLOW}Notice: ai-service/.env not found. Creating from example...${NC}"
    cp ai-service/.env.example ai-service/.env
fi

# 3. Clean up Docker System (to prevent disk full)
echo -e "${YELLOW}Step 3: Cleaning up Docker...${NC}"
docker system prune -f
echo "Cleanup complete."

# 4. Build & Start Services
echo -e "${YELLOW}Step 4: Building and Starting Services...${NC}"

# 4.1 Redis only (No PostgreSQL - using Neon Cloud!)
echo " -> Starting Redis..."
docker compose up -d redis

# 4.2 Backend with PRODUCTION profile
echo " -> Building Backend (using Neon Cloud DB)..."
docker compose build backend

# Export profile for production
export SPRING_PROFILES_ACTIVE=prod

docker compose up -d backend

# 4.3 AI Service
echo " -> Building AI Service..."
docker compose build ai-service
docker compose up -d ai-service

# 5. Final Check
echo -e "${GREEN}=== Deployment Finished ===${NC}"
echo -e "${GREEN}✓ Database: Neon Cloud PostgreSQL${NC}"
echo -e "${GREEN}✓ Redis: Docker Container${NC}"
docker compose ps

echo -e "${YELLOW}You can check logs with: 'docker compose logs -f backend'${NC}"

