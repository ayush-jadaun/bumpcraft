# Docker API Server with HTTPS

Production-ready deployment of Bumpcraft's REST API behind nginx with SSL.

## Setup

1. Copy `.env.example` to `.env` and fill in your values
2. Replace `YOUR_DOMAIN` in `nginx.conf` and `docker-compose.yml`
3. Place your SSL certificates in `./certs/`:
   - `fullchain.pem`
   - `privkey.pem`
4. Run:

```bash
docker compose up -d
```

## Endpoints

All endpoints are behind HTTPS and require `X-API-Key` header (since `BUMPCRAFT_AUTH_ALL=true`):

```bash
# Health check
curl https://your-domain/api/health -H "X-API-Key: your-key"

# Trigger a release
curl -X POST https://your-domain/api/release \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{}'

# Open dashboard in browser
open https://your-domain/dashboard
```

## Let's Encrypt (free SSL)

Use certbot to generate free certificates:

```bash
# Install certbot
sudo apt install certbot

# Generate certs
sudo certbot certonly --standalone -d your-domain.com

# Copy to certs/
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./certs/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./certs/
```

## Architecture

```
Internet → nginx (443/SSL) → bumpcraft-api (3000) → git repo
```

nginx handles SSL termination, security headers, and proxying. The bumpcraft container runs as a non-root user with a built-in health check.
