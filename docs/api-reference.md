# REST API Reference

Bumpcraft includes a lightweight Express.js REST API for remote version checking, changelog access, and release triggering.

## Starting the API Server

```bash
# After building
npm run build
npm start

# Or in development
npx tsx src/api/server.ts
```

The server starts on port `3000` by default (configurable via `PORT` env var).

Dashboard available at: `http://localhost:3000/dashboard`

## Authentication

- **GET endpoints** are public by default
- **POST endpoints** require an API key via `X-API-Key` header
- Set the key with the `BUMPCRAFT_API_KEY` environment variable
- If `BUMPCRAFT_API_KEY` is not set, POST endpoints return `403 Forbidden`
- Set `BUMPCRAFT_AUTH_ALL=true` to require the API key for ALL endpoints (including GET)

```bash
# Set API key
export BUMPCRAFT_API_KEY=my-secret-key

# Make authenticated request
curl -X POST http://localhost:3000/api/release \
  -H "X-API-Key: my-secret-key" \
  -H "Content-Type: application/json"
```

## Response Format

All endpoints return:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

On error:

```json
{
  "success": false,
  "data": null,
  "error": "Error description"
}
```

---

## Endpoints

### GET /api/health

Health check.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-03-18T10:00:00.000Z"
  },
  "error": null
}
```

---

### GET /api/version

Get the current project version.

**Response:**
```json
{
  "success": true,
  "data": { "version": "1.2.3" },
  "error": null
}
```

---

### GET /api/changelog

Get changelog entries.

**Query parameters:**

| Param | Description |
|-------|-------------|
| `from` | Version range start (e.g., `v1.0.0`) |
| `to` | Version range end (e.g., `v2.0.0`) |

```bash
curl http://localhost:3000/api/changelog
curl http://localhost:3000/api/changelog?from=1.0.0&to=2.0.0
```

---

### GET /api/changelog/latest

Get the most recent changelog entry.

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "1.3.0",
    "previousVersion": "1.2.0",
    "date": "2026-03-18T10:00:00.000Z",
    "commits": [...],
    "changelogOutput": "## 1.3.0 (2026-03-18)\n..."
  },
  "error": null
}
```

---

### POST /api/release

Trigger a full release. **Requires API key.**

**Request body (all optional):**
```json
{
  "preRelease": "beta",
  "forceBump": "minor",
  "from": "v1.2.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bumpType": "minor",
    "currentVersion": "1.2.0",
    "nextVersion": "1.3.0",
    "changelogOutput": "## 1.3.0 ...",
    "releaseResult": { "url": "https://github.com/..." },
    "dryRun": false
  },
  "error": null
}
```

---

### POST /api/release/dry-run

Preview what a release would do without making changes. **Requires API key.**

Same request/response format as `POST /api/release`, but `dryRun` will be `true` and no changes are written.

---

### GET /api/plugins

List configured plugins.

**Response:**
```json
{
  "success": true,
  "data": {
    "plugins": [
      "bumpcraft-plugin-conventional-commits",
      "bumpcraft-plugin-changelog-md"
    ]
  },
  "error": null
}
```

---

### GET /api/history

Query the release history database.

**Query parameters:**

| Param | Description |
|-------|-------------|
| `breaking` | `true` to show only releases with breaking changes |
| `scope` | Filter by commit scope (e.g., `auth`) |
| `type` | Filter by commit type (e.g., `feat`) |
| `since` | Show entries since this version |
| `from` | Range start version |
| `to` | Range end version |
| `last` | Show only last N entries |

```bash
curl http://localhost:3000/api/history?breaking=true
curl http://localhost:3000/api/history?scope=auth&since=2.0.0
curl http://localhost:3000/api/history?last=5
```

---

### GET /dashboard

Serves the release preview dashboard. See [Dashboard](dashboard.md).
