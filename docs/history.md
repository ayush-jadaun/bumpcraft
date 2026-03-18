# History & Querying

Every release Bumpcraft makes is recorded in `.bumpcraft/history.json` as structured data. You can query this history via CLI or API.

## How It Works

After each release (non-dry-run), Bumpcraft appends an entry:

```json
{
  "version": "1.3.0",
  "previousVersion": "1.2.0",
  "date": "2026-03-18T10:00:00.000Z",
  "commits": [
    {
      "hash": "abc1234",
      "type": "feat",
      "scope": "auth",
      "subject": "add OAuth2 support",
      "body": null,
      "breaking": false,
      "raw": "abc1234 feat(auth): add OAuth2 support"
    }
  ],
  "changelogOutput": "## 1.3.0 (2026-03-18)\n### Features\n- **auth:** add OAuth2 support"
}
```

Entries are stored newest-first.

## CLI Queries

```bash
# Show all history
bumpcraft history

# Show only releases with breaking changes
bumpcraft history --breaking

# Filter by commit scope
bumpcraft history --scope auth

# Filter by commit type
bumpcraft history --type feat

# Show releases since a specific version
bumpcraft history --since v2.0.0

# Show releases between two versions
bumpcraft history --from v1.0.0 --to v2.0.0

# Show only the last 5 releases
bumpcraft history --last 5

# Combine filters
bumpcraft history --scope auth --since v2.0.0 --type feat
```

## API Queries

All the same filters are available as query parameters:

```bash
GET /api/history?breaking=true
GET /api/history?scope=auth&since=2.0.0
GET /api/history?from=1.0.0&to=2.0.0
GET /api/history?type=feat&last=10
```

Response:

```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "version": "2.0.0",
        "previousVersion": "1.5.0",
        "date": "2026-03-18T10:00:00.000Z",
        "commits": [...],
        "changelogOutput": "..."
      }
    ]
  },
  "error": null
}
```

## Storage

History is stored at `.bumpcraft/history.json`. This file:
- Is created automatically on first release
- Grows over time (one entry per release)
- Can be committed to version control if you want shared history
- Can be added to `.gitignore` if you prefer local-only history

To reset history, delete the file:

```bash
rm .bumpcraft/history.json
```
