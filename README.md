# SENTRIX by CIPHER

**Detect Threats. Defend Trust.** SENTRIX is a Digital Risk Protection prototype for reviewing potential social, mobile-app, website, and domain impersonation. It uses Next.js, Zod, Prisma, PostgreSQL, and Tailwind.

## Run locally

Requirements: Node.js 20+ and npm. The local PostgreSQL server is installed as an npm dependency and starts with the app.

```powershell
npm ci
npm run dev
```

Open `http://localhost:3000`. With no `DATABASE_URL`, `npm run dev` starts an embedded PostgreSQL server on `127.0.0.1:5432`, applies checked-in migrations, and seeds three example brands plus labeled simulated findings: Kampus.VC (EdTech, based on the challenge brief), Northstar Bank (fictional FinTech), and Cedar & Finch (fictional e-commerce). The database persists under `data/postgres`; local credentials are saved in ignored `.env.local`. The first run prints the generated login credentials. Stop the server with Ctrl+C; the database server stops with it.

You can set `SENTRIX_LOGIN_EMAIL`, `SENTRIX_LOGIN_PASSWORD`, and a random `SESSION_SECRET` (at least 32 characters) in `.env.local` to choose local credentials. Otherwise the app generates them on first run and stores them in `.env.local`. The login form issues a signed, HTTP-only 12-hour session cookie; pages and API routes require a valid session, and the sidebar provides sign-out.

Set `DATABASE_URL` in `.env.local` to use an existing PostgreSQL database instead of the embedded server. The app generates the Prisma client on startup; apply migrations and seed records with `npm run db:migrate` and `npm run db:seed`. `SENTRIX_DATA_DIR` selects the local JSON fallback data directory for environments that explicitly use the JSON adapter.

## PostgreSQL setup

Create a PostgreSQL database and set `DATABASE_URL` in `.env.local` to its connection string. Then run:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The seed is repeatable and upserts three brands plus labeled simulated findings. `db:migrate` deploys the checked-in migrations; it does not reset or drop data. The second migration converts existing single-organization users into membership rows, adds tenant/brand constraints and query indexes, stores score breakdowns, and normalizes official aliases, keywords, domains, social accounts, and mobile apps from existing brand JSON fields.

## Deploy from GitHub

This repository includes provider configuration for both deployment options:

- **Vercel:** import the GitHub repository as a Next.js project. Vercel uses `vercel.json`, runs `npm ci`, and builds with `npm run build`.
- **Render:** create a Blueprint from the repository. `render.yaml` creates the web service and PostgreSQL database, runs checked-in Prisma migrations during deploy, and starts the app with `npm start`.

### Vercel frontend + Render backend

For a split deployment, deploy the repository to Render first using `render.yaml`. Copy the Render service's public URL, for example `https://sentrix-api.onrender.com`, into the Vercel project's `BACKEND_URL` environment variable. Vercel then proxies every `/api/*` browser request to Render through the rewrite in `next.config.mjs`; frontend code continues to use same-origin `/api/*` URLs and session cookies remain usable.

On Vercel, set `BACKEND_URL` for Production, Preview, and Development environments as appropriate. Do not set `DATABASE_URL`, `SESSION_SECRET`, or `SENTRIX_LOGIN_*` on Vercel for this split mode; authentication and the database belong to the Render backend. On Render, keep `DATABASE_URL`, `SESSION_SECRET`, and login credentials configured. Redeploy Vercel after changing `BACKEND_URL`.

Use the Render URL directly only for backend health checks such as `https://sentrix-api.onrender.com/api/health`. Use the Vercel URL for the user-facing application. If you do not need a split deployment, deploy only the Render service and leave `BACKEND_URL` empty.

Set these production environment variables in the selected provider:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | At least 32 random characters for signed sessions |
| `SENTRIX_LOGIN_EMAIL` | Yes | Application login email |
| `SENTRIX_LOGIN_PASSWORD` | Yes | Application login password |
| `GEMINI_API_KEY` | No | AI summary integration |

Never commit `.env.local` or production credentials. After the first deploy, confirm the provider health check at `/api/health`, then sign in using the configured credentials. The production build generates Prisma Client automatically; Render applies migrations with `npm run db:migrate` before starting the service.

The Prisma-backed repositories are organization-scoped and keep the existing Brand/Finding contracts. The current authentication helper still returns a fixed local demo organization, so the database adapter is suitable for local evaluation only until the team integrates authenticated sessions and membership checks. Do not deploy the current APIs as a multi-tenant service.

## Implemented workflows

- Create and edit brand profiles with industries, aliases, official domains, social URLs, app IDs, and publishers.
- Analyze imported JSON or clearly labeled demo social profiles and mobile-app listings.
- Analyze submitted domain URLs and manually supplied website metadata without fetching the target.
- Exclude configured official social assets, app package IDs, and official domains before making findings.
- Review evidence, source provenance, confidence, and versioned risk-score contributions.
- Filter findings, preserve analyst status on repeated scans, and open investigations with notes and workflow status.
- View dashboard counts, a severity distribution, and a documented cross-source exposure heuristic. Metrics use saved findings and explicitly label simulated records.

## Current limitations

- No live social-platform, app-store, DNS, or website connectors are configured. The product does not search the public web or provide continuous monitoring.
- Domain analysis parses submitted URL and metadata only. It makes zero outbound requests; redirect expansion, page retrieval, URL reputation lookups, and image comparison are not implemented.
- `avatarSimilarity` and `logoSimilarity` are values supplied by an upstream record. SENTRIX does not calculate image similarity.
- Organization switching, membership role enforcement, rate limiting, alert delivery, takedown workflows, CSV/PDF reports, and protected evidence-file upload are not implemented. Login credentials are configured as a single application account through environment variables.
- Brand fields remain in shared JSON columns for API compatibility while migration 0002 backfills normalized official-asset tables. New production adapters should treat the normalized tables as canonical and keep both representations synchronized until the shared contracts are migrated.
- The older Python detector and the current app’s TypeScript analyzer are separate implementations. TypeScript is the integrated scanner; Python tests need a working Python 3 runtime.

## API endpoints

All request bodies are validated with Zod. Findings returned by scan routes are saved server-side before success is returned.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET`, `POST` | `/api/brands` | List and create brand profiles |
| `GET`, `PATCH`, `DELETE` | `/api/brands/:id` | Read, update, and delete a brand |
| `POST` | `/api/monitoring/scan` | Analyze imported/demo social profiles or app records |
| `POST` | `/api/monitoring/domains` | Analyze submitted domains or manually supplied site metadata (offline) |
| `GET`, `POST` | `/api/findings` | Query findings and accept shared-contract findings |
| `PATCH` | `/api/findings/:id` | Update finding status and write status history in PostgreSQL |
| `GET`, `POST` | `/api/investigations` | List or open an investigation for a finding |
| `PATCH` | `/api/investigations/:id` | Update investigation workflow status |
| `POST` | `/api/investigations/:id/notes` | Add an analyst note |

Example offline domain request:

```json
{
  "brandId": "brand_northstar",
  "source": "DOMAIN",
  "records": [
    {
      "url": "https://northstarr-support.example/login",
      "title": "Northstar support",
      "description": "Sign in to review your account",
      "origin": "IMPORTED"
    }
  ]
}
```

See [the integration contract](docs/integration-contract.md), [monitoring architecture](docs/social-monitoring-architecture.md), and [demo walkthrough](docs/social-monitoring-demo.md) for interface and provenance details.

## Checks

```powershell
npm run typecheck
npm test
npm run build
npm run lint
```

Prisma schema checks need a syntactically valid `DATABASE_URL` environment value; they do not require a running server:

```powershell
$env:DATABASE_URL = 'postgresql://user:password@localhost:5432/sentrix'
npx prisma validate
```
