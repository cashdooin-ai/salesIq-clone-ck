#!/bin/bash
# ===========================================
# Nexvo Deployment Script
# Run from /opt/nexvo directory
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$DEPLOY_DIR")"

echo -e "${BLUE}🚀 Nexvo Deployment${NC}"
echo "===================="
echo "Deploy dir: $DEPLOY_DIR"
echo "Project dir: $PROJECT_DIR"

cd "$PROJECT_DIR"

# ===================
# PRE-CHECKS
# ===================
echo -e "\n${YELLOW}Running pre-checks...${NC}"

# Check .env exists
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo -e "${RED}Error: deploy/.env not found${NC}"
    echo "Copy deploy/.env.example to deploy/.env and configure it"
    exit 1
fi

# Load environment
source "$DEPLOY_DIR/.env"

# Check required vars
required_vars=("DOMAIN" "DB_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: $var is not set in .env${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ Pre-checks passed${NC}"

# ===================
# GIT PULL
# ===================
echo -e "\n${YELLOW}Pulling latest code...${NC}"
git pull origin main || git pull origin master || echo "Git pull skipped"

# ===================
# BUILD & DEPLOY
# ===================
echo -e "\n${YELLOW}Building and deploying...${NC}"

cd "$DEPLOY_DIR"

# Pull latest images
docker compose -f docker-compose.prod.yml pull || true

# Build images
docker compose -f docker-compose.prod.yml build --no-cache

# Stop old containers
docker compose -f docker-compose.prod.yml down || true

# Start new containers
docker compose -f docker-compose.prod.yml up -d

# ===================
# HEALTH CHECK
# ===================
echo -e "\n${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Check API health
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/health" 2>/dev/null || echo "000")
if [ "$API_HEALTH" = "200" ]; then
    echo -e "${GREEN}✓ API is healthy${NC}"
else
    echo -e "${RED}⚠ API health check failed (status: $API_HEALTH)${NC}"
fi

# ===================
# CLEANUP
# ===================
echo -e "\n${YELLOW}Cleaning up old images...${NC}"
docker image prune -f

# ===================
# STATUS
# ===================
echo -e "\n${YELLOW}Container status:${NC}"
docker compose -f docker-compose.prod.yml ps

# ===================
# DONE
# ===================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "URLs:"
echo "  Dashboard: https://app.$DOMAIN"
echo "  API:       https://api.$DOMAIN"
echo "  Widget:    https://widget.$DOMAIN"
echo ""
echo "Logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "Status:  docker compose -f docker-compose.prod.yml ps"
