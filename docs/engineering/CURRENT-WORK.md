# Current Work — Request-Control-Evo

Last reviewed: 2026-10-08. The canonical integrated branch is `master`. **Stable 1.20.0 is not approved or released by this handoff.**

## Product status and release gates

- [ROADMAP.md](../../ROADMAP.md) is authoritative. The recorded last release candidate is `1.20.0-rc.8`; publication of Stable requires **physical Firefox/Waterfox desktop and Firefox Android validation**, a release-security gate, and explicit user approval.
- Check [open PRs](https://github.com/HyperCriSiS/Request-Control-Evo/pulls) and the [CI history](https://github.com/HyperCriSiS/Request-Control-Evo/actions). Dependency update PRs are proposals, not validated fixes until the audit and aggregate checker are green.
- The docs-navigation PR [#90](https://github.com/HyperCriSiS/Request-Control-Evo/pull/90) has historically been blocked by `npm run audit` (high/critical dependencies); don't bypass the checker to merge documentation.

## How to resume

1. Compare the current `master` roadmap, current PRs and audit results rather than trusting this dated status text as the live outcome.
2. Fix/triage high and critical dependency findings with controlled updates, ensuring test/build/security policy remains intact.
3. Treat physical Firefox desktop/Android browser checks as outstanding until explicitly evidenced; keep stable publication manual and approval-gated.
4. Record only verified integration changes in `ROADMAP.md` on `master`. Do not create a second editable roadmap under `docs/` (the existing lower-case `docs/roadmap.md` must not collide on case-insensitive filesystems).

[Documentation navigation](../DOCUMENTATION.md) · [Agent instructions](../../AGENTS.md)
