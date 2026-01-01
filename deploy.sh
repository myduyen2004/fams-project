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

# 3. Clean up Docker System (to prevent disk full)
echo -e "${YELLOW}Step 2: Cleaning up Docker system (Prune)...${NC}"
docker system prune -a --volumes -f
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

# 4.4 Frontend
echo " -> Building Frontend..."
docker compose build frontend
docker compose up -d frontend

# 5. Final Check
echo -e "${GREEN}=== Deployment Finished ===${NC}"
docker compose ps

echo -e "${YELLOW}You can check logs with: 'docker compose logs -f'${NC}"
