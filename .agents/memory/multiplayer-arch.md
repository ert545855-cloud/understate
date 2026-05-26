---
name: Multiplayer Architecture
description: Real-time multiplayer + DB persistence design for UNDERSTATE gang/party/alliance/election/law/announcement entities
---

## Core Pattern
All multiplayer game entities (gangs, parties, alliances, elections, laws, announcements) use the `game_state` table as a JSONB key-value store (`SELECT value FROM game_state WHERE key = $1`). Rows are upserted on every mutation via `dbService.setGameState(key, value)`.

## Server-side Flow
- **gameHandler.js**: All Socket.IO events (gang:create, party:join, election:sync, etc.) → validate → DB persist → broadcast to other clients
- **gameEngine.js**: On startup, calls `db.getFullGameState()` to load all entities into memory. Periodically re-syncs every 5 minutes.
- **dbService.js**: `getFullGameState(keys?)` does a single SQL query for all entity keys — use this for bulk loads.

## Client-side Flow
- On socket connect, server fires `gameStateInit` with all entity arrays → client stores in localStorage via `_syncLs(key, value)` → `useLs` hook picks up via `fb-sync` CustomEvent
- When user mutates local state (createGang, joinParty, etc.), inline `window._socket?.emit('gang:sync', {gangs: next})` is called inside the `setGangs(prev => { ... })` callback

## Key Tables
- `game_state` (key TEXT PK, value JSONB, updated_at) — all entity state
- `notifications` (id TEXT PK, user_id, type, title, body, data, read, created_at) — persistent notifications
- `families`, `alliances`, `holdings`, `elections_v2`, `war_logs` — future structured tables (not yet primary)

## Notification System
- `broadcastNotification(io, notif)` — sends to all connected clients + persists to DB
- `sendNotification(io, targetUserId, notif)` — targeted: looks up socketId in onlinePlayers Map + persists to DB
- Client `notification` event handler shows toast + appends to notifications state

## Why game_state KV vs. individual tables
- Simpler deployment (no migrations for new entity types)
- Works for the current single-server architecture
- Structured tables (families, elections_v2) ready for when data grows

## Anti-loop protection
- Server broadcasts use `socket.broadcast.emit` (not `io.emit`) for sync events so sender doesn't receive their own update back and trigger another emit
