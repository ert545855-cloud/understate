---
name: Security & Deploy Hardening
description: Decisions made during the security hardening + deploy simplification pass.
---

## Fail-fast env var checks
Both `server/main.js` (at top, before any require) and `server/config/jwt.js` call `process.exit(1)` if `JWT_SECRET` is missing. `server/main.js` also exits if `DATABASE_URL` is missing. Logs `[WARN]` if `ALLOWED_ORIGINS=*` in production.

**Why:** Silent fallbacks (e.g. fallback JWT secret) allowed auth bypass. Crashing early gives a clear error instead of a mysterious runtime failure.

## render.yaml
- `startCommand: node server/main.js` (not index.js, not server/index.js — though index.js re-exports main.js)
- PORT is NOT set statically — Render injects `$PORT` automatically
- Removed: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `MONGODB_URI`
- Added: `ALLOWED_ORIGINS`, `ADMIN_USERS`, `BETA_MODE`, email, VAPID, GIPHY keys (all sync:false)

## SQL file cleanup
- All stale SQL files moved to `sql/_archive/` (schema.sql, schema_full.sql, schema_v2.sql, schema_realtime.sql, migration_features.sql, missing_tables.sql)
- Canonical initial migration: `server/migrations/001_initial_schema.sql` (copy of schema.sql)
- New feature migration: `server/migrations/002_family_factories.sql`
- Unused deploy configs moved to `deploy/_unused/` (Dockerfile, wrangler.jsonc, worker.js, .ebignore)

## Rate limiter
- In-memory `rateLimiter.js` now has a clear warning comment about its single-instance limitation
- DB-backed alternative: `server/middleware/dbRateLimiter.js` — uses `rate_limits` PostgreSQL table (created in migration 002)
- `createDbRateLimiter(windowMs, max, message)` returns Express middleware using PostgreSQL upsert
