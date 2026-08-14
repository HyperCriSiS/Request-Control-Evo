# Release validation

## 1.16.0 modernization candidate

Validation date: 2026-08-14

The modernization candidate is validated with Node 22 and a lockfile v3 generated from the committed `package.json` dependency set.

An independent GitHub Actions build lab cloned `feature/modernization`, regenerated the dependency lock and then performed a clean install from that lock. The completed validation stages were:

- dependency resolution: success
- clean `npm ci`: success
- unit tests: success
- source / JSON / web-extension lint: success
- manual build dependency (Pandoc): success
- extension ZIP build: success
- built ZIP validation with `addons-linter`: success

The repository-local `checker` remains the authoritative merge/release gate. This document records the additional independent validation used while modernizing the old dependency stack.
