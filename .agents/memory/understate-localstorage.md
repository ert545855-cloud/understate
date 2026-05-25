---
name: UNDERSTATE localStorage conventions
description: Key naming conventions and important localStorage keys for UNDERSTATE
---

## useLs() hook
- All useLs(key) calls prepend 'rep_' prefix → localStorage.getItem('rep_' + key)
- Example: useLs('userProfile') → 'rep_userProfile'

## Critical keys
- rep_userProfile — logged-in user profile object
- rep_dailyTaskState — daily task state (NOT 'dailyTaskState' — common mistake)
- rep_users — all registered users array
- rep_directMessages — DM messages array
- rep_uiLang — selected UI language code (tr/en/de/az)

## Daily task state keys (inside rep_dailyTaskState day bucket)
- dailyFarmCount, dailyMineCount, dailyChatCount, dailyJobCount, dailyTradeCount, dailyVoteCount, dailyPvpCount

**Why:** Earlier code mistakenly used 'dailyTaskState' without prefix, breaking daily task tracking. All 7 task types have been fixed to use rep_dailyTaskState.
