# Workspace access deployment

The access feature is prepared but remains disabled until shared storage is configured. Do not enable it without completing the setup below.

## Vercel production environment

Create a persistent Upstash Redis database on the Free plan and set these environment variables in the existing Vercel project:

- `UPSTASH_REDIS_REST_URL`: database REST endpoint.
- `UPSTASH_REDIS_REST_TOKEN`: database REST token (server only).
- `WORKSPACE_SESSION_SECRET`: cryptographically random secret of at least 32 characters (server only; generate with `openssl rand -hex 32`).
- `VITE_WORKSPACE_ACCESS_ENABLED`: `true`.

Redeploy after setting the variables. Never use `VITE_` prefixes for credentials. No credentials belong in GitHub or chat. Free-tier quotas still apply; choose the Free plan, not pay-as-you-go.

The landing page remains public. Direct routes for computing, lab, guided operations, sensing and communication require the access screen when enabled. Existing circuit API requests also require the signed session.

## Timing

Code validation is server-side. Each matching lowercase code has an independent, global clock. First successful entry starts 24 hours of access. Re-entry shares the original expiry; it never extends it. At expiry the code is unavailable for 12 hours. The next successful entry after those 36 hours starts a fresh cycle. Different codes have independent cycles, and one active session covers all workspaces. Timers persist across browsers and deployments through Redis. Deleting the database resets code history.

Redis TIME and an atomic Lua script establish activation time. A signed Secure/HttpOnly/SameSite cookie holds the session reference; plaintext codes are not stored. Prior-cycle cookies cannot authorize a new cycle. Failure to reach storage denies access. No UI hint discloses the code pattern. The cooldown screen shows time remaining; browser countdowns are informational and the server decides acceptance.

## Scope

This is a shared-code visitor gate, not individual accounts, code issuance, revocation or source-code DRM. Any accepted code can be entered by multiple people; another accepted code can bypass a particular code's cooldown, as requested. The application still ships browser-local scientific engines as public JavaScript. A visitor gate cannot make that downloadable code private or prevent a developer from executing a copied engine independently.

## Verification

Compile the two access service modules to a temporary directory with TypeScript, then run `ACCESS_TEST_BUILD=<directory> node --test server/access/access.test.cjs`. Tests cover format, boundary times, re-entry, independent codes, cooldown, reuse, old/tampered cookies and storage failure using a mocked Redis transport. Live Redis/Vercel end-to-end activation must be checked after configuration.
