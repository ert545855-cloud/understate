---
name: Family Factory Anti-cheat
description: Architecture decisions for server-side income validation in the Aile Fabrikaları feature.
---

## Rule
Income collection amount and timing are computed entirely server-side. The client never sends an amount; it only sends `factoryId` + `familyId`.

**Why:** Families are localStorage-based (no DB treasury), but collection exploits (calling collect multiple times per day or faking elapsed time) must be prevented. Server stores `last_collected_at` as Unix-ms in the `family_factories` table.

**How to apply:**
- `POST /api/family-factory/collect` → server reads `last_collected_at`, enforces 24-hour interval, computes `Math.floor(monthlyIncome / 30)` as daily income, updates `last_collected_at`, returns earned amount.
- Client applies `earned` to localStorage treasury and emits `family:sync`.
- Factory purchase (`/buy`) is validated only for `familyInfluence` (mücevher requires ≥50); treasury deduction is client-side.
- DB table: `family_factories (id, family_id, factory_type, name, monthly_income, last_collected_at, created_by, created_at, updated_at)` — applied via `server/migrations/002_family_factories.sql`.
- Factory subtypes (canonical): sarap(₺2.5M/₺220K), tekstil(₺3.5M/₺320K), rafine(₺7M/₺600K), insaat(₺12M/₺950K), mucevher(₺20M/₺1.6M, minInfluence:50).
- Rate limits table also created in migration 002.
- DB-backed rate limiter middleware at `server/middleware/dbRateLimiter.js`.
