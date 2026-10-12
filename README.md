# SENTRIX foundation

SENTRIX is Team CIPHER's digital risk protection workspace: **Detect Threats. Defend Trust.** This branch provides the Next.js App Router foundation, premium dark design system, responsive navigation, brand CRUD and shared contracts for detection and investigation modules.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

With no `DATABASE_URL`, development uses the explicit local JSON adapter in `src/lib/store.ts` and persists to `data/brands.json` (ignored by Git). Production deployments should use Prisma/PostgreSQL and an authenticated organisation context. See [`docs/integration-contract.md`](docs/integration-contract.md).

Checks: `npm run typecheck`, `npm run build`, and `npm test`.
