---
name: Socket Emit Patterns
description: Where and how gang/party/alliance/election/law/announcement mutations emit socket events in src/app.js
---

## Pattern
All state mutations use the functional updater form of `setX` to inline the socket emit:

```js
setGangs(prev => {
  const next = [...prev, gang];
  try { window._socket?.emit('gang:create', {gang}); window._socket?.emit('gang:sync', {gangs:next}); } catch(e) {}
  return next;
});
```

This ensures the emit uses the same next value that React will commit, and fails silently if socket is not connected.

## Covered mutations (as of this session)
| Action | Socket event(s) emitted |
|--------|------------------------|
| createGang | `gang:create`, `gang:sync` |
| joinGang | `gang:join`, `gang:sync` |
| leaveGang | `gang:leave`, `gang:sync` |
| disbandGang | `gang:disband`, `gang:sync` |
| createParty | `party:create`, `party:sync` |
| joinParty | `party:join`, `party:sync` |
| leaveParty | `party:leave`, `party:sync` |
| disbandParty | `party:sync` |
| proposeLaw | `law:propose`, `law:sync` |
| voteInElection | `election:sync` |
| registerCandidate | `election:sync` |
| createAlliance | `alliance:sync` |
| joinAlliance | `alliance:sync` |
| leaveAlliance | `alliance:sync` |
| disbandAlliance | `alliance:sync` |
| Admin announcement | `announcement:new`, `announcement:sync` |

## Server listeners (gameHandler.js)
Each `:sync` event saves the full array to DB via `db.setX(data)` and broadcasts to other clients.
Each `:create`/`:join`/`:leave`/`:disband` event does targeted DB upsert/delete then broadcasts fresh array.

## Client listeners (app.js socket useEffect ~line 10813)
`gangUpdate` → `_syncLs('gangs', data.gangs)` → fb-sync → useLs hook updates state
Same for partyUpdate, allianceUpdate, electionUpdate, lawUpdate, announcementUpdate, cabinetUpdate, territoryUpdate, notification.
