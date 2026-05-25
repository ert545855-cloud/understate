---
name: UNDERSTATE stack & architecture
description: Tech stack, file layout, and key patterns for the UNDERSTATE game project
---

## Stack
- Node.js/Express backend (server/index.js) with Socket.IO and pg (PostgreSQL)
- React via Babel standalone — NO build step, runs in-browser transpilation
- src/app.js is monolithic ~12800 lines (all main UI/logic)
- External screens loaded as window globals: ArmyScreen, UnionScreen, TenderScreen, EconomicEmpireScreen, PartyCenterScreen, PowerTriangleScreen, IndependentArmyScreen, GangTreasuryScreen, ProtectionDealsScreen

## Admin bypass
- username: admin / password: admin123 for local testing

## Navigation
- NAV_GROUPS defines the sidebar groups and items
- page==='family' routes to <GangPage typeFilter='family' />
- page==='gang' routes to <GangPage typeFilter='gang' />

**Why:** monolithic Babel-standalone means no imports/exports, everything must be global or in-scope.
