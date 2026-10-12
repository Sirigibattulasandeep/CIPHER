# Social & App Monitoring architecture

```mermaid
flowchart LR
    UI[Next.js Social & Apps workspace]
    CONN[Authorized social and app-store connectors\nnot yet connected]
    IMPORT[JSON record upload]
    DEMO[Clearly labeled simulated records]
    BRAND[Shared Brand profile\nlogo URL, domains, social URLs,\nofficial app IDs and publishers]
    NORMALIZE[Validate and normalize records]
    EXCLUDE[Exclude exact official social URLs\nand app package IDs]
    SOCIAL[Social profile and post analysis]
    APPS[App name, publisher, description,\nlink and supplied logo-similarity analysis]
    DOMAINS[Offline URL, domain and supplied page-metadata analysis]
    SCORE[Shared risk scoring v1\nstrongest signal per category\nLOW 0-34 / MEDIUM 35-64\nHIGH 65-84 / CRITICAL 85-100]
    FINDING[Shared Finding contract]
    API[Server-side scan APIs\n/api/monitoring/scan\n/api/monitoring/domains]
    STORE[Shared repository\nPrisma when DATABASE_URL is set\nJSON development adapter otherwise]
    WORKFLOW[Shared finding status\nNEW / INVESTIGATING / RESOLVED / FALSE_POSITIVE]
    INVESTIGATION[Investigation record\nstatus and analyst notes]

    CONN --> NORMALIZE
    IMPORT --> NORMALIZE
    DEMO --> NORMALIZE
    BRAND --> EXCLUDE
    NORMALIZE --> EXCLUDE
    EXCLUDE --> SOCIAL
    EXCLUDE --> APPS
    NORMALIZE --> DOMAINS
    SOCIAL --> FINDING
    APPS --> FINDING
    DOMAINS --> FINDING
    SOCIAL --> SCORE
    APPS --> SCORE
    DOMAINS --> SCORE
    SCORE --> FINDING
    FINDING --> API
    API --> STORE
    STORE --> UI
    UI --> WORKFLOW
    WORKFLOW --> STORE
    UI --> INVESTIGATION
    INVESTIGATION --> STORE
```

## Implemented boundary

`src/lib/social-monitoring.ts` contains deterministic analysis for supplied
social profiles/posts and mobile-app listings. `src/lib/domain-monitoring.ts`
analyzes submitted URL strings and manually supplied page metadata. The scan
APIs validate a selected shared Brand, calculate versioned risk breakdowns,
and persist shared Findings server-side. The public import route assigns
imported or demo provenance server-side; client records cannot claim connected
source reliability. Repeated scans update the matching
brand/source/entity record and preserve its status while merging evidence.
The workspace imports JSON or loads simulated examples. The separate
`/domains` workspace accepts one URL per line. Both show actual saved findings.
The Prisma repository is selected when `DATABASE_URL` is configured; otherwise
JSON adapters use `SENTRIX_DATA_DIR` (default `data/`). Investigation records
and notes use the shared repository boundary.

No external source is connected. Domain analysis parses submitted URLs but
does not open them. Logo similarity is accepted only when supplied as a record
signal; image fetching and comparison are not implemented. The risk score is
the sum of the strongest contribution in each independent category, capped at
100; source reliability contributes to confidence, not the risk score. The
dashboard exposure index is separately defined as the highest active finding
plus five points for each additional source family, capped at 15 corroboration
points. It is a prioritization heuristic, not a probability.

PostgreSQL stores shared findings, memberships, official assets, investigation
records, notes, and score breakdowns. The current app still uses the
fixed `org_demo` auth context. Authenticated login, membership role checks,
rate limiting, and live source adapters must be integrated before production
deployment.

## Official-asset exclusion

Social identity signals are suppressed when a candidate's configured platform
and normalized handle or profile URL exactly match a Brand social profile.
App impersonation analysis is skipped for exact configured package IDs.
Domain/website URL findings are suppressed for exact configured official
domains and their subdomains. Other signals on a real social profile can still
be retained for review. Name similarity, publisher mismatch, supplied logo
similarity, and unlisted domains are indicators; they do not establish fraud.
