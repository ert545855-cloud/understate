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

## Atomic / CD-gated events (server-side enforcement)
| Event | Handler | Notes |
|-------|---------|-------|
| `party:updateInfluence` | gameHandler.js | 60s CD per userId+partyId; UPDATE parties SET influence_points |
| `gang:updateTerritory` | gameHandler.js | capture/release; writes war log; broadcasts full territory map |
| `lobi:sync` | gameHandler.js | saves to game_state KV key 'lobiler'; broadcast `lobiUpdate` |

## Relay-only events (server forwards to target socket)
| Event | Notes |
|-------|-------|
| `tradeOffer` | to target socketId |
| `tradeResponse` | to target socketId |
| `partnershipOffer` | to target userId + notif |
| `money:transfer` | moneyUpdate to recipient + notif |
| `dm` | to target userId |
| `notification:send` | to target userId |

## Legacy events
| Event | Notes |
|-------|-------|
| `gameAction` | emitted on gang:create (type='newGang') and party:create (type='newParty') |

## Client listeners (app.js socket useEffect ~line 10813)
`gangUpdate` → `_syncLs('gangs', data.gangs)` → fb-sync → useLs hook updates state
Same for partyUpdate, allianceUpdate, electionUpdate, lawUpdate, announcementUpdate, cabinetUpdate, territoryUpdate, notification.
`lobiUpdate` → DevletScreen.js useLobiStore useEffect listener
`partnershipOffer` → app.js line 1280 setIncomingTrade
`gameAction` → app.js line 1297 showNotif for newParty/newGang
