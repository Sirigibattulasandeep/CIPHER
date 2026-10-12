# Social and app analysis library

The Python package in this directory is a deterministic analysis prototype for supplied candidate records. It does not connect to social platforms or app stores, fetch URLs, or calculate logo similarity. Any logo/avatar similarity value must come from an explicitly identified upstream component.

The active SENTRIX web workflow is the Next.js workspace at `/monitoring`. It validates imported or demo records, analyzes them with `src/lib/social-monitoring.ts`, and saves results through the shared `Finding` API and development JSON adapter. New domain changes should target the shared contracts, not introduce a parallel Python persistence model.

Configured official social profiles and app package IDs suppress identity-impersonation signals for exact matches. They do not establish that every other signal on that account is safe. Name similarity, publisher mismatch, supplied logo similarity, and external domains are review indicators, not proof of fraud.

Uploaded records are treated as imported. The scan API does not accept client claims that a record came from a connected live source; demo fixtures receive a lower, server-assigned reliability value. No connected social or app-store source is currently implemented.
