# Nexvo Deployment Guide

Complete guide for deploying Nexvo as a solo developer with minimal cost.

## Quick Start (15 minutes)

### Step 1: Get a Server

**Recommended: Hetzner Cloud** (Best price/performance)

| Plan | RAM | CPU | Storage | Price |
|------|-----|-----|---------|-------|
| CX22 | 4GB | 2 vCPU | 40GB | €4.35/mo (~$5) |
| CX32 | 8GB | 4 vCPU | 80GB | €8.98/mo (~$10) |
| CX42 | 16GB | 8 vCPU | 160GB | €17.98/mo (~$20) |

**Alternative Options:**
- DigitalOcean: $12-24/mo
- Vultr: $10-20/mo
- AWS Lightsail: $10-40/mo

### Step 2: Setup Server

SSH into your server and run:

```bash
# Download and run setup script
curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/deploy/setup-server.sh | bash
```

Or manually:

```bash
# Clone repo
cd /opt
git clone https://github.com/YOUR_REPO/nexvo.git
cd nexvo

# Run setup
chmod +x deploy/setup-server.sh
./deploy/setup-server.sh
```

### Step 3: Configure Environment

```bash
cd /opt/nexvo/deploy
cp .env.example .env
nano .env  # Edit with your values
```

**Required settings:**
```env
DOMAIN=yourdomain.com
ACME_EMAIL=you@email.com
DB_PASSWORD=strong_password_here
REDIS_PASSWORD=another_strong_password
JWT_SECRET=generate_with_openssl_rand_base64_32
```

### Step 4: Deploy

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### Step 5: Setup DNS

Point these DNS records to your server IP:

| Type | Name | Value |
|------|------|-------|
| A | @ | YOUR_SERVER_IP |
| A | api | YOUR_SERVER_IP |
| A | app | YOUR_SERVER_IP |
| A | widget | YOUR_SERVER_IP |

SSL certificates are automatically provisioned by Let's Encrypt.

---

## Cost Breakdown

### Minimum Setup (~$10-15/month)

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| Server (4GB) | Hetzner CX22 | $5 |
| Domain | Cloudflare | $10/year |
| Email (100/day) | Resend | Free |
| Storage (10GB) | Cloudflare R2 | Free |
| **Total** | | **~$10-15/mo** |

### Recommended Setup (~$25-35/month)

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| Server (8GB) | Hetzner CX32 | $10 |
| Domain | Cloudflare | $10/year |
| Email (1000/day) | Resend | $20/mo |
| Storage (50GB) | Cloudflare R2 | ~$2/mo |
| **Total** | | **~$25-35/mo** |

### Growth Setup (~$60-100/month)

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| Server (16GB) | Hetzner CX42 | $20 |
| Managed PostgreSQL | Hetzner/DO | $15 |
| Domain | Cloudflare | $10/year |
| Email (10k/day) | Resend | $50/mo |
| Storage (100GB) | Cloudflare R2 | ~$5/mo |
| CDN | Cloudflare Pro | $20/mo |
| **Total** | | **~$100/mo** |

---

## Service Recommendations

### File Storage: Cloudflare R2

**Why R2?**
- 10GB free storage
- No egress fees (unlike S3!)
- S3-compatible API
- Global CDN included

**Setup:**
1. Create Cloudflare account
2. Go to R2 → Create bucket → "nexvo"
3. Create API token with R2 read/write
4. Add to .env:
```env
S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_BUCKET=nexvo
S3_ACCESS_KEY=your_r2_access_key
S3_SECRET_KEY=your_r2_secret_key
```

### Email: Resend

**Why Resend?**
- 100 emails/day free
- Great deliverability
- Simple API
- React email templates

**Setup:**
1. Sign up at resend.com
2. Verify your domain
3. Create API key
4. Add to .env:
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

### DNS & CDN: Cloudflare

**Free tier includes:**
- DNS management
- SSL/TLS
- DDoS protection
- Basic analytics
- Caching

---

## Scaling Guide

### When to Scale

| Symptom | Solution |
|---------|----------|
| API response > 500ms | Upgrade CPU/RAM |
| Database queries slow | Add indexes, then managed DB |
| Memory usage > 80% | Upgrade RAM or add swap |
| Disk usage > 80% | Expand disk or move files to R2 |
| 50+ concurrent WebSockets | Add Redis pub/sub |

### Scaling Steps

**Level 1: Vertical Scaling (easy)**
```bash
# Upgrade your VPS plan
# No code changes needed
```

**Level 2: Separate Database**
```bash
# Use managed PostgreSQL
# Update DATABASE_URL in .env
# Benefits: automatic backups, scaling, maintenance
```

**Level 3: Multiple Servers**
```bash
# Add load balancer (Hetzner/Cloudflare)
# Run multiple API containers
# Use Redis for session sharing
```

**Level 4: Kubernetes (when profitable)**
- Wait until you have 500+ paying customers
- Migration cost is high
- Only worth it for significant scale

---

## Automated Deployment

### GitHub Actions (Recommended)

1. Add secrets to your repo (Settings → Secrets):
   - `SERVER_HOST` - Your server IP
   - `SERVER_USER` - deploy
   - `SERVER_SSH_KEY` - SSH private key
   - `VITE_API_URL` - https://api.yourdomain.com
   - `VITE_SOCKET_URL` - https://api.yourdomain.com

2. Push to main branch → Auto deploys!

### Manual Deploy

```bash
ssh deploy@your-server
cd /opt/nexvo
./deploy/deploy.sh
```

---

## Monitoring (Free)

### Uptime Monitoring
- **UptimeRobot** (free, 50 monitors)
- **Better Uptime** (free tier)
- **Cloudflare** (built-in)

### Error Tracking
- **Sentry** (free tier, 5k events/mo)

### Server Monitoring
```bash
# Quick checks
htop          # CPU/Memory
docker stats  # Container resources
df -h         # Disk usage
```

### Log Viewing
```bash
# All logs
cd /opt/nexvo/deploy
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api
```

---

## Backup Strategy

### Automatic Daily Backups

The backup container runs daily and keeps:
- 7 daily backups
- 4 weekly backups
- 6 monthly backups

Backups are stored in `/opt/nexvo/deploy/backups/`

### Manual Backup

```bash
# Database
docker exec nexvo-postgres pg_dump -U nexvo nexvo > backup.sql

# Full system
tar -czvf nexvo-backup.tar.gz /opt/nexvo
```

### Offsite Backup (recommended)

```bash
# Sync to R2
rclone sync /opt/nexvo/deploy/backups r2:nexvo-backups
```

---

## Security Checklist

- [ ] Strong passwords in .env
- [ ] Firewall enabled (only 22, 80, 443)
- [ ] Fail2ban running
- [ ] SSH key authentication only
- [ ] Regular security updates
- [ ] Database backups encrypted
- [ ] HTTPS everywhere
- [ ] Rate limiting enabled

---

## Troubleshooting

### Container won't start
```bash
docker compose -f docker-compose.prod.yml logs api
```

### Database connection error
```bash
docker exec -it nexvo-postgres psql -U nexvo -d nexvo
```

### Redis connection error
```bash
docker exec -it nexvo-redis redis-cli -a YOUR_REDIS_PASSWORD ping
```

### SSL certificate issues
```bash
# Check Traefik logs
docker logs nexvo-traefik
# Force certificate renewal
docker restart nexvo-traefik
```

### Out of memory
```bash
# Add swap
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

---

## Support

- GitHub Issues: Report bugs and feature requests
- Documentation: Check /docs folder
- Community: Join our Discord (coming soon)

Happy deploying! 🚀
