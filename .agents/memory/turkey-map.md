---
name: Turkey Map Component
description: TurkeyMap SVG React component — 81 province circles, gang/party coloring, used in gang territory and parliament sections
---

# TurkeyMap Component

## Location
Defined in `src/app.js` just before `TerritorySystem` function.

## Key Constants
- `PROVINCE_MAP_DATA` — array of `{n, x, y}` for all 81 provinces. SVG viewBox `0 0 820 360`. Coordinates derived from real Turkish province capitals (lon 26–44.8° → x, lat 36–42.2° → y).
- `GANG_PALETTE` — 12 distinct colors for gang coloring.

## Props
- `territories` — `gangTerritories` object (`{city: {gangId, gangName, capturedAt}}`)
- `gangs` — full gangs array (used to build color map by index)
- `parties` — full parties array (each party has `color` property)
- `partyMode` — `true` shows party dominance (computed from `rep_users` localStorage), `false` shows gang control
- `onCityClick(cityName)` — called when province circle is clicked
- `selectedCity` — highlights the selected province (e.g., `attackModal` in gang section)

## Gang Section Integration
Inserted in `TerritorySystem` return between stats card and the 2-column city grid.
Clicking a province opens `attackModal` if user is gang leader and city is not blocked.

## Parliament Section Integration
New `🗺️ Harita` tab added to PoliticsPage's `subs` array.
Shows party dominance map + cabinet current assignments.

## Party Dominance Logic
Computed via `cityDominance` useMemo: for each city, counts how many of each party's members have that city in `rep_users` localStorage. Dominant party colors the province with `party.color`.

## Immediate Save
Influence point buttons (`⚡ Etki Puanı Kazan`) in YetkilerimPage now call `/api/save` immediately (Bearer token from `rep_token`) after deducting money and adding meritPoints, in addition to the 30s autosave.

**Why:** Pure localStorage updates without immediate server sync could lose data on crash/logout within 30s window.
