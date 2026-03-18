# Docker Deployment

Run the Bumpcraft API server as a Docker container.

## Quick Start with Docker Compose

```bash
cd bumpcraft

# Set your API key
export BUMPCRAFT_API_KEY=your-secret-key

# Optional: for GitHub releases
export GITHUB_TOKEN=ghp_your_token
export GITHUB_REPOSITORY=owner/repo

# Build and start
npm run build
docker compose up -d
```

The API is now running at **http://localhost:3000** and the dashboard at **http://localhost:3000/dashboard**.

## Docker Compose Configuration

`docker-compose.yml`:

```yaml
version: '3.8'
services:
  bumpcraft-api:
    build: .
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - BUMPCRAFT_API_KEY=${BUMPCRAFT_API_KEY}
      - BUMPCRAFT_AUTH_ALL=${BUMPCRAFT_AUTH_ALL:-false}
      - GITHUB_TOKEN=${GITHUB_TOKEN:-}
      - GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-}
      - PORT=3000
    volumes:
      - .:/app/workspace
    working_dir: /app/workspace
```

**Environment variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `BUMPCRAFT_API_KEY` | (none) | Required for POST endpoints |
| `BUMPCRAFT_AUTH_ALL` | `false` | Require API key for all endpoints |
| `GITHUB_TOKEN` | (none) | GitHub PAT for creating GitHub releases |
| `GITHUB_REPOSITORY` | (none) | `owner/repo` for GitHub releases |
| `PORT` | `3000` | Server port |

## Build Manually

```bash
# Build the TypeScript project first
npm run build

# Build Docker image
docker build -t bumpcraft .

# Run
docker run -p 3000:3000 \
  -e BUMPCRAFT_API_KEY=your-key \
  -e GITHUB_TOKEN=ghp_xxx \
  -v $(pwd):/app/workspace \
  -w /app/workspace \
  bumpcraft
```

## Security

- The container runs as a **non-root user** (`bumpcraft`) — not as root
- A built-in `HEALTHCHECK` polls `/api/health` every 30s
- API key comparison uses timing-safe equality to prevent side-channel attacks
- For read-only deployments, mount the volume as read-only (`:ro`) and only use dry-run endpoints

## Volume Mount

The container mounts your project directory so Bumpcraft can access:
- `.bumpcraftrc.json` (configuration)
- `package.json` (version source)
- `.git/` (git history, tags)
- `.bumpcraft/` (history, groups)

Without the volume mount, the API can only serve health checks.

## Stopping

```bash
docker compose down
```
