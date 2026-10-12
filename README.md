# SENTRIX App & Domain Monitoring

A no-dependency browser demo for mobile app listing comparisons and URL/domain string analysis. The supplied repository had no application foundation, shared contracts or build pipeline; all evidence and source activity here is explicitly simulated. Records use common Finding-shaped fields (id, brand, entity, category/kind, source, indicators, detected, score, severity, confidence, status) and persist in browser localStorage for this demo. This does not replace or claim integration with an unavailable shared backend.

## Run

Requires Node.js 18 or newer. Run npm start, then open http://127.0.0.1:4173. Data is stored in this browser profile. Use the controls to search and filter findings, open comparisons, change investigation status, or analyze and save a URL. npm test runs the Node built-in test suite. There is no production build pipeline or bundling step in this repository; the server serves static files directly.

## Analysis and safety

- Configurable in-code brand profiles hold official domains, app publishers, names and package IDs. Sample records demonstrate name, publisher and package mismatches.
- URL analysis normalizes HTTP/HTTPS URLs and rejects malformed values, credentials, IP literals and local/private-style hostnames. It compares domain labels with configured profiles using edit distance and brand-string hints.
- No submitted destination is fetched, resolved, redirected to, or downloaded. Results are URL-string-only and never claim page scanning, phishing confirmation, binary inspection, permissions analysis, or live threat-intelligence checks.
- App store buttons lead to store search pages; no store API is connected. Sample stores and histories are simulated.
- Findings and status changes persist locally in the browser, not in a shared server database. Integrating Person 1/4 contracts requires those contracts and the application foundation to be present.

## Current limitations

The workspace contains a nested Git checkout. The active nested checkout is already feature/app-monitoring; the outer workspace's CIPHER gitlink is malformed and its working copy is not the project checkout. The remote's main and other feature branches were inspected and contain only the initial README. Therefore no shared contracts, production data sources, backend persistence or production build checks are available. Push and PR creation require authenticated remote access.
