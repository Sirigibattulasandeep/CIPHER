# SENTRIX foundation

SENTRIX is Team CIPHER's digital risk protection workspace: **Detect Threats. Defend Trust.** This branch provides the Next.js App Router foundation, premium dark design system, responsive navigation, brand CRUD, persisted finding views, and shared contracts for detection and investigation modules.

## Run locally

Requirements: Node.js 20 or 22 LTS and npm. Git also requires macOS Command Line Tools on macOS. The repository already contains its dependency lockfile; use the existing `node_modules` when available and do not run `npm install` unless dependencies are intentionally being restored.

```bash
cp .env.example .env.local
npm run dev
```

With no `DATABASE_URL`, development uses the explicit local JSON adapter in `src/lib/store.ts` and persists to `data/brands.json` and `data/findings.json` (ignored by Git). The adapter validates persisted records and uses atomic replacement writes; it does not silently replace malformed data with demo fixtures. Production deployments should use Prisma/PostgreSQL and an authenticated organisation context. See [`docs/integration-contract.md`](docs/integration-contract.md).

Checks: `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

The local authentication adapter is deliberately demo-only: it supplies `org_demo` and rejects a different organization header, but it is not a real user session or production authentication provider. Replace it with the application's established session provider before deployment.
