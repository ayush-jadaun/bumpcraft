# Deployment Guide

This guide covers every way to deploy and run Bumpcraft — from local CLI usage to production API servers.

---

## 1. CLI (Local / CI)

### Install

```bash
npm install -g bumpcraft
# or as a dev dependency
npm install --save-dev bumpcraft
```

### First-time setup

```bash
cd your-project
bumpcraft init            # creates .bumpcraftrc.json
bumpcraft validate        # preview what a release would do
bumpcraft release         # run the full pipeline
```

### CI/CD integration

Add to your CI pipeline (GitHub Actions, GitLab CI, etc.):

```yaml
# Example: GitHub Actions — one line does everything
- name: Release
  run: npx bumpcraft release --approve --push
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_REPOSITORY: ${{ github.repository }}
```

That's it. `--push` handles committing, tagging, pushing, and creating a GitHub Release with full changelog. Both `GITHUB_TOKEN` and `GITHUB_REPOSITORY` are provided automatically by GitHub Actions — **no secrets to configure**.

The only secret you need to add manually is `NPM_TOKEN` (if you want auto-publish to npm).

Key flags for CI:
- `--push` — commit release artifacts, tag, push, and create GitHub Release
- `--approve` — bypasses `requireApproval` policies (needed in non-interactive environments)
- `--dry-run` — preview without writing anything
- `--force-bump <major|minor|patch>` — override auto-detection

---

## 2. API Server (Node.js)

Run Bumpcraft as a REST API server for dashboard access, webhooks, or remote triggering.

### Build and start

```bash
cd bumpcraft
npm install
npm run build
npm start
```

The server starts on port 3000 by default.

### Environment variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `3000` | No | Server listen port |
| `BUMPCRAFT_API_KEY` | — | Yes (for writes) | API key for `POST /api/release` and other write endpoints |
| `BUMPCRAFT_AUTH_ALL` | `false` | No | Set to `true` to require the API key for ALL endpoints (including reads) |
| `GITHUB_TOKEN` | — | No | GitHub personal access token for creating GitHub releases |
| `GITHUB_REPOSITORY` | — | No | `owner/repo` format, used by the GitHub release plugin |

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Health check |
| `GET` | `/api/version` | No | Current version |
| `GET` | `/api/changelog/latest` | No | Latest changelog entry |
| `GET` | `/api/changelog` | No | Changelog with `?from=` and `?to=` filters |
| `GET` | `/api/history` | No | Release history with filters |
| `GET` | `/api/plugins` | No | List configured plugins |
| `POST` | `/api/release` | Yes | Trigger a real release |
| `POST` | `/api/release/dry-run` | Yes | Preview a release |
| `GET` | `/dashboard` | No | Web dashboard UI |

### Example: trigger a release via API

```bash
curl -X POST http://localhost:3000/api/release \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{}'
```

---

## 3. Docker

### Quick start

```bash
# Set required env vars
export BUMPCRAFT_API_KEY=your-secret-key
export GITHUB_TOKEN=ghp_your_token          # optional, for GitHub releases
export GITHUB_REPOSITORY=owner/repo          # optional

# Build and run
npm run build
docker compose up -d
```

Server available at `http://localhost:3000`, dashboard at `http://localhost:3000/dashboard`.

### docker-compose.yml

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

### Build manually

```bash
npm run build
docker build -t bumpcraft .
docker run -p 3000:3000 \
  -e BUMPCRAFT_API_KEY=your-key \
  -e GITHUB_TOKEN=ghp_xxx \
  -v $(pwd):/app/workspace \
  -w /app/workspace \
  bumpcraft
```

### Docker security notes

- The container runs as a **non-root user** (`bumpcraft`)
- A `HEALTHCHECK` is built in (polls `/api/health` every 30s)
- The volume mount gives the container write access to your project directory (needed for `package.json` version writes and `.bumpcraft/` state). For read-only deployments, add `:ro` to the volume mount and only use `--dry-run` endpoints.

### Stop

```bash
docker compose down
```

---

## 4. Library (programmatic)

Use Bumpcraft as a library in your own Node.js scripts or tools.

```bash
npm install bumpcraft
```

```typescript
import { runRelease, currentVersion } from 'bumpcraft'

// Get current version
const version = await currentVersion()

// Dry-run preview
const preview = await runRelease({ dryRun: true })
console.log(preview.bumpType, preview.nextVersion)

// Actual release
const result = await runRelease({
  preRelease: 'beta',
  forceBump: 'minor'
})
```

---

## 5. Production checklist

Before deploying to production:

- [ ] Set a strong `BUMPCRAFT_API_KEY` (min 32 characters recommended)
- [ ] Set `BUMPCRAFT_AUTH_ALL=true` if the API is publicly accessible
- [ ] Configure `GITHUB_TOKEN` with `repo` scope if using GitHub releases
- [ ] Set `GITHUB_REPOSITORY` to `owner/repo`
- [ ] Review `.bumpcraftrc.json` — especially `branches.release` and `policies`
- [ ] Test with `--dry-run` before the first real release
- [ ] Verify the dashboard loads at `/dashboard`
- [ ] Set up a reverse proxy (nginx, Caddy) with HTTPS in front of the API

### Recommended policies for production

```json
{
  "policies": {
    "requireApproval": ["major"],
    "autoRelease": ["patch"],
    "freezeAfter": "friday 17:00",
    "maxBumpPerDay": 10
  }
}
```

This requires explicit `--approve` for major bumps, auto-releases patches without confirmation, freezes releases over weekends, and caps at 10 releases per day.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `No release needed` | No conventional commits since last tag. Use `bumpcraft validate` to check. |
| `Authentication required` (401) | Set `X-API-Key` header or configure `BUMPCRAFT_API_KEY` env var. |
| `Release blocked` | A policy is blocking. Use `--approve` to override, or adjust `policies` in config. |
| `Dashboard not found` (404) | Run `npm run build` — the build step copies the dashboard HTML to `dist/`. |
| `GITHUB_TOKEN not set` | Set the env var. The GitHub plugin silently skips without it. |
| Port already in use | Set `PORT` env var to a different port. |
| `Config error` | Check `.bumpcraftrc.json` for JSON syntax errors or invalid `freezeAfter` format. |
