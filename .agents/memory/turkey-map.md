---
name: Turkey Province Map
description: Shared TurkeyProvinceMap + TurkeyMapScreen components for family/gang territory control across the app.
---

## Architecture
- **File**: `src/screens/TurkeyMapScreen.js` — exports `window.TurkeyProvinceMap` (embeddable SVG) and `window.TurkeyMapScreen` (full page)
- **Registered in**: `index.html` SCREEN_FILES (after FamilyCenterScreen.js)
- **SVG**: viewBox `0 0 840 440`, 81 province circles positioned geographically

## Province Data
- `TR_PROVINCES` array: `[id, name, svgX, svgY, region]` for all 81 cities
- Regions: `marmara`, `ege`, `akdeniz`, `i_anadolu`, `karadeniz`, `d_anadolu`, `g_dogu`

## Control Storage
- localStorage key: `rep_provinceControl`
- Shape: `{ [cityName]: { ownerName, ownerType: 'family'|'gang'|'neutral', color, security: 0-100, welfare: 0-100, claimedAt } }`
- Socket event: `province:sync` (client emits, server broadcasts)
- DOM event: `provinceControlUpdate` (dispatched on localStorage change)

## Integration Points
- **FamilyCenterScreen.js**: New "🗺️ Harita" tab renders `window.TurkeyMapScreen` with `mode:'family'`
- **GangPage.js**: `sub==='territory'` renders `window.TurkeyMapScreen` with `mode:'gang'` (falls back to TerritorySystem if not loaded)
- **PoliticsScreen.js**: Has its own TurkeyMap component for party spread view (unchanged)
- **app.js**: `province:sync` socket listener writes to `rep_provinceControl` and fires `provinceControlUpdate` event

## Actions (province click modal)
- **Claim** (family): costs ₺2M from family treasury
- **Capture** (gang): costs 50 power
- **Attack** (gang vs owned): costs 30 + province.security power; reduces target security by 20
- **Fortify** (security +10): costs ₺500K from family treasury
- **Develop** (welfare +10): costs ₺300K
- **Release**: drops province back to neutral

**Why separate file**: Shared across FamilyCenterScreen, GangPage without code duplication; keeps app.js from growing further.

## Security Fixes Applied (same session)
- `ALLOWED_UPDATE_COLUMNS` in `dbService.js`: removed `role` and `banned` — admin routes now use direct SQL (`UPDATE users SET role = $1 WHERE id = $2`)
- `playerJoin` in `gameHandler.js`: socket.userId from JWT auth middleware takes precedence over client-supplied `data.userId`
- `gang:disband`: leader ownership check before deleteGang
- `party:sync`: only syncs parties where `leaderId === socket.userId`
