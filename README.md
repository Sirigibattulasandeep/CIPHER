# SENTRIX by CIPHER

**Detect Threats. Defend Trust.** SENTRIX is a Digital Risk Protection prototype for reviewing potential social, mobile-app, website, and domain impersonation. The current branch is `feature/social-monitoring` and preserves the shared Next.js, Zod, Prisma, and Tailwind foundation.

## Run locally

Requirements: Node.js 20+ and npm. PostgreSQL is optional for local development.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. With no `DATABASE_URL`, the app uses a local JSON adapter and creates three example brand profiles the first time it reads brand data: Kampus.VC (EdTech, based on the challenge brief), Northstar Bank (fictional FinTech), and Cedar & Finch (fictional e-commerce). Only the latter two are fictional brands. Existing JSON files are preserved; to start with empty demo storage, stop the app and remove the local `data` directory yourself.

Set `SENTRIX_LOGIN_EMAIL`, `SENTRIX_LOGIN_PASSWORD`, and a random `SESSION_SECRET` (at least 32 characters) in `.env.local` before starting the app. The login form issues a signed, HTTP-only 12-hour session cookie; pages and API routes require a valid session, and the sidebar provides sign-out.

Set `SENTRIX_DATA_DIR` to choose another local data directory. The adapter stores brands, findings, and investigations there. It is a single-process development fallback, not a production database; run one app process when using JSON storage.

## PostgreSQL setup

Create a PostgreSQL database and set `DATABASE_URL` in `.env.local` to its connection string. Then run:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The seed is repeatable and upserts three brands plus labeled simulated findings. `db:migrate` deploys the checked-in migrations; it does not reset or drop data. The second migration converts existing single-organization users into membership rows, adds tenant/brand constraints and query indexes, stores score breakdowns, and normalizes official aliases, keywords, domains, social accounts, and mobile apps from existing brand JSON fields.

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
- `npm run lint` currently needs ESLint and `eslint-config-next` installed and configured; the base scaffold does not include them.

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
