#!/bin/bash
# ===========================================
# Nexvo Server Setup Script
# For Ubuntu 22.04 / Debian 12
# Run as root: bash setup-server.sh
# ===========================================

set -e

echo "🚀 Nexvo Server Setup"
echo "====================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# ===================
# STEP 1: System Update
# ===================
echo -e "\n${GREEN}Step 1: Updating system...${NC}"
apt update && apt upgrade -y

# ===================
# STEP 2: Install Docker
# ===================
echo -e "\n${GREEN}Step 2: Installing Docker...${NC}"

# Remove old versions
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install dependencies
apt install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
systemctl enable docker
systemctl start docker

echo -e "${GREEN}✓ Docker installed${NC}"

# ===================
# STEP 3: Install useful tools
# ===================
echo -e "\n${GREEN}Step 3: Installing tools...${NC}"
apt install -y git htop ncdu ufw fail2ban

# ===================
# STEP 4: Setup Firewall
# ===================
echo -e "\n${GREEN}Step 4: Configuring firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

echo -e "${GREEN}✓ Firewall configured${NC}"

# ===================
# STEP 5: Setup Fail2ban
# ===================
echo -e "\n${GREEN}Step 5: Configuring fail2ban...${NC}"
systemctl enable fail2ban
systemctl start fail2ban

# ===================
# STEP 6: Create app directory
# ===================
echo -e "\n${GREEN}Step 6: Creating app directory...${NC}"
mkdir -p /opt/nexvo
cd /opt/nexvo

echo -e "${GREEN}✓ Directory created at /opt/nexvo${NC}"

# ===================
# STEP 7: Setup swap (for small servers)
# ===================
echo -e "\n${GREEN}Step 7: Setting up swap...${NC}"
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo -e "${GREEN}✓ 2GB swap created${NC}"
else
    echo -e "${YELLOW}Swap already exists${NC}"
fi

# ===================
# STEP 8: Create deploy user
# ===================
echo -e "\n${GREEN}Step 8: Creating deploy user...${NC}"
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
    chown -R deploy:deploy /opt/nexvo
    echo -e "${GREEN}✓ User 'deploy' created${NC}"
else
    echo -e "${YELLOW}User 'deploy' already exists${NC}"
fi

# ===================
# DONE
# ===================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Server setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Clone your repo:     cd /opt/nexvo && git clone <repo-url> ."
echo "2. Copy env file:       cp deploy/.env.example deploy/.env"
echo "3. Edit env file:       nano deploy/.env"
echo "4. Start services:      cd deploy && docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "Server specs:"
echo "- Docker: $(docker --version)"
echo "- Disk: $(df -h / | tail -1 | awk '{print $4}') available"
echo "- RAM: $(free -h | grep Mem | awk '{print $2}')"
echo "- Swap: $(free -h | grep Swap | awk '{print $2}')"
