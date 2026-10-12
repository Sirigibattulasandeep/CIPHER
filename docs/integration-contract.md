# SENTRIX integration contract

The canonical contracts are exported from `src/lib/contracts.ts`. Detection modules should create findings through `POST /api/findings` (to be added with the findings owner) using `Finding`: `source` is one of `SOCIAL`, `MOBILE_APP`, `WEBSITE`, or `DOMAIN`; `riskScore` and `confidence` are integers from 0–100. All API failures use `{ error: { code, message, fields? } }`.

Brand endpoints are `GET /api/brands?q=`, `POST /api/brands`, `GET/PATCH/DELETE /api/brands/:id`. POST/PATCH bodies must satisfy `brandSchema`; successful create returns 201 and the brand, successful update returns 200, delete returns 204. Detection owners should use `brandId` from the brand selector and never accept an organisation ID from the browser. The current development adapter persists to `data/brands.json`; production should configure `DATABASE_URL` and replace the adapter with Prisma repository methods.

Organisation isolation is represented by `organisationId` on every tenant model. The server-only context helper in `src/lib/auth.ts` currently supplies `org_demo` for the local demo; replace it with the established session provider before production deployment and pass its organisation id into every repository query. Never expose database credentials or server-only environment variables to client components.
