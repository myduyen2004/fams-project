#!/bin/bash

# ========================================
# FAMS AUTOMATED DEPLOYMENT SCRIPT
# ========================================

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Starting FAMS Deployment ===${NC}"

# 1. Pull Latest Code
echo -e "${YELLOW}Step 1: Pulling latest code...${NC}"
git pull

# 2. Check for .env file
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and configure your secrets."
    exit 1
fi

# 2.1 Check for ai-service/.env
if [ ! -f ai-service/.env ]; then
    echo -e "${YELLOW}Notice: ai-service/.env not found. Creating from example...${NC}"
    cp ai-service/.env.example ai-service/.env
fi

# 3. Clean up Docker System (to prevent disk full)
# Standard cleanup (Keeps cache for faster builds)
# WARNING: If disk is 8GB, this might fail. Upgrade to 20GB for best performance.
docker system prune -f
echo "Cleanup complete."

# 4. Build & Start Services Sequentially (to save RAM/Disk)
echo -e "${YELLOW}Step 3: Building and Starting Services...${NC}"

# 4.1 Databases & Redis
echo " -> Starting Databases & Redis..."
docker compose up -d postgres postgres-ai redis

# 4.2 Backend
echo " -> Building Backend..."
docker compose build backend
docker compose up -d backend

# 4.3 AI Service
echo " -> Building AI Service..."
docker compose build ai-service
docker compose up -d ai-service

# 5. Final Check
echo -e "${GREEN}=== Deployment Finished ===${NC}"
docker compose ps

echo -e "${YELLOW}You can check logs with: 'docker compose logs -f'${NC}"
