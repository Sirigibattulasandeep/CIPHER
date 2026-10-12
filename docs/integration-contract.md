# SENTRIX integration contract

The canonical contracts are exported from `src/lib/contracts.ts`. Detection
modules create findings through `POST /api/findings` using `Finding`: `source`
is one of `SOCIAL`, `MOBILE_APP`, `WEBSITE`, or `DOMAIN`; `riskScore` and
`confidence` are integers from 0–100. `PATCH /api/findings/:id` accepts a shared
finding status. API failures use `{ error: { code, message, fields? } }`.

The Social & Apps scanner accepts `POST /api/monitoring/scan` with
`{ brandId, kind: 'social' | 'apps', records }`. The domain analyzer accepts
`POST /api/monitoring/domains` with `{ brandId, source: 'DOMAIN' | 'WEBSITE',
records }`. Both validate the selected brand, calculate findings on the server,
and persist through the shared findings repository before returning success.
Domain analysis is offline and makes no external requests. Origin labels
(`CONNECTED`, `IMPORTED`, `DEMO`) are carried in evidence and detection
indicators until the shared contract adds a dedicated origin field.

Shared findings include optional `riskScoreBreakdown` entries
(`category`, `indicator`, `contribution`, `reason`) and `scoringVersion`.
The current `sentrix-risk-v1` aggregation takes the strongest signal per
category, sums independent categories, caps at 100, and uses severity bands
LOW 0–34, MODERATE 35–64, HIGH 65–84, CRITICAL 85–100. Confidence is kept
separate from risk score.

`POST /api/investigations` opens or returns one investigation per finding.
`PATCH /api/investigations/:id` changes its workflow state, and
`POST /api/investigations/:id/notes` appends a note. PostgreSQL deployments
also record finding status changes in `StatusHistory`.

Brand endpoints are `GET /api/brands?q=`, `POST /api/brands`,
`GET/PATCH/DELETE /api/brands/:id`. POST/PATCH bodies must satisfy
`brandSchema`; successful create returns 201 and the brand, successful update
returns 200, delete returns 204. Detection owners use `brandId` from the brand
selector and never accept an organisation ID from the browser.

With no `DATABASE_URL`, the development adapters persist brands, findings, and
investigations to JSON files under `data/` (or `SENTRIX_DATA_DIR`). When
`DATABASE_URL` is configured, repository methods use Prisma/PostgreSQL. The
Prisma migration adds organization memberships, a composite tenant/brand
finding constraint, normalized official-asset tables, source-run metadata,
investigation records, and query indexes. The local auth context still returns
the fixed `org_demo` user; integrate authenticated sessions and enforce
membership roles before deploying this API to a multi-tenant environment.

Organisation isolation is represented by `organisationId` on each tenant
model. The server-only context helper in `src/lib/auth.ts` currently supplies
`org_demo` for the local demo; replace it with the established session provider
before production and pass its organisation ID into every repository query.
Never expose database credentials or server-only environment variables to
client components.
