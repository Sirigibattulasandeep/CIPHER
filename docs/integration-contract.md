# SENTRIX integration contract

The canonical contracts are exported from `src/lib/contracts.ts`. Detection
modules create findings through `POST /api/findings` using `Finding`: `source`
is one of `SOCIAL`, `MOBILE_APP`, `WEBSITE`, or `DOMAIN`; `riskScore` and
`confidence` are integers from 0–100. `PATCH /api/findings/:id` accepts a shared
finding status. API failures use `{ error: { code, message, fields? } }`.

The Social & Apps scanner accepts `POST /api/monitoring/scan` with
`{ brandId, kind: 'social' | 'apps', records }`. It returns shared `Finding`
objects, which the workspace persists through `POST /api/findings`. Origin
labels (`CONNECTED`, `IMPORTED`, `DEMO`) are carried in evidence and detection
indicators until the shared contract adds a dedicated origin field.

Brand endpoints are `GET /api/brands?q=`, `POST /api/brands`,
`GET/PATCH/DELETE /api/brands/:id`. POST/PATCH bodies must satisfy
`brandSchema`; successful create returns 201 and the brand, successful update
returns 200, delete returns 204. Detection owners use `brandId` from the brand
selector and never accept an organisation ID from the browser.

The development adapter persists brands to `data/brands.json` and shared
findings to `data/findings.json`; production should configure `DATABASE_URL`
and replace both adapters with Prisma repository methods.

Organisation isolation is represented by `organisationId` on each tenant
model. The server-only context helper in `src/lib/auth.ts` currently supplies
`org_demo` for the local demo; replace it with the established session provider
before production and pass its organisation ID into every repository query.
Never expose database credentials or server-only environment variables to
client components.
