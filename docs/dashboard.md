# Release Preview Dashboard

Bumpcraft includes a built-in web dashboard for previewing and triggering releases.

## Accessing the Dashboard

Start the API server:

```bash
# Production
npm run build && npm start

# Development
npx tsx src/api/server.ts
```

Open: **http://localhost:3000/dashboard**

## What It Shows

- **Current version** — read from your configured version source
- **Next release preview** — what the next version would be, with bump type badge (major = red, minor = blue, patch = green)
- **Draft changelog** — preview of the changelog that would be generated
- **"Release Now" button** — triggers a release directly from the browser

## Authentication

On load, the dashboard prompts for your API key. This is the same key set via `BUMPCRAFT_API_KEY` environment variable.

- GET endpoints (version, changelog) work without the key
- The "Release Now" button requires a valid key

## How It Works

The dashboard is a single static HTML file (`src/dashboard/index.html`) served by the Express API. It uses:

- `GET /api/version` for current version
- `POST /api/release/dry-run` for the next release preview
- `GET /api/changelog/latest` for the latest changelog
- `POST /api/release` for the "Release Now" button

No build step, no framework, no external dependencies. Just vanilla HTML/CSS/JS.

## Customization

Edit `src/dashboard/index.html` directly. It's self-contained — all CSS and JS are inline.
