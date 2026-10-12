# Social & App Monitoring — prototype architecture

```mermaid
flowchart LR
    UI[Future SENTRIX monitoring workspace]
    SOURCES[Authorized social and app-store connectors]
    IMPORT[JSON imports]
    DEMO[Clearly labeled simulated records]
    BRAND[Brand profile\nname and aliases\nofficial handles and domains\nofficial app IDs, publishers and logo asset reference]
    NORMALIZE[Normalize and validate records]
    EXCLUDE[Compare exact configured official accounts and app IDs]
    SOCIAL[Social profile and post indicators]
    APP[App title, publisher, description, link and logo indicators]
    FINDINGS[Explainable findings\nscore, severity, confidence, evidence and source]
    SHARED[Person 1 shared Finding / RiskAssessment API]
    STORE[Shared SENTRIX persistence]
    INVESTIGATE[Shared investigation workflow]

    SOURCES --> NORMALIZE
    IMPORT --> NORMALIZE
    DEMO --> NORMALIZE
    BRAND --> EXCLUDE
    NORMALIZE --> EXCLUDE
    EXCLUDE --> SOCIAL
    EXCLUDE --> APP
    SOCIAL --> FINDINGS
    APP --> FINDINGS
    FINDINGS --> SHARED
    SHARED --> STORE
    STORE --> INVESTIGATE
    UI --> BRAND
    UI --> IMPORT
    UI --> FINDINGS
```

## Current implementation boundary

Implemented in this branch: brand-profile records and validation, social and
app candidate models, deterministic analysis, JSON parsing functions, demo
records, evidence-linked findings, and in-memory filters. URL analysis parses
provided links but makes no network requests. Logo similarity is accepted as
an input from a separate image-analysis component; this module does not
compute image similarity itself.

Not implemented yet: platform/store connectors, upload UI, SENTRIX shared
contracts, persistence, status updates, and the responsive monitoring
workspace. The finding conversion point is `Finding` in `detector.py`; adapt
that boundary when Person 1 publishes the shared contract. Do not persist this
temporary model as a separate social-only database.

## Official-asset exclusion

Configured social accounts are matched by platform and normalized handle.
Configured apps are matched by store and exact app/package ID. These exact
matches suppress identity-impersonation signals. Other evidence, such as a
suspicious link or scam-associated text, remains visible for human review.
Name similarity, publisher mismatch, logo similarity, and external domains
are review indicators; no score establishes that a profile or app is
fraudulent.
