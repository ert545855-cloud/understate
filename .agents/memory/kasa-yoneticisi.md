---
name: Kasa Yöneticisi Role
description: Treasury manager rank in the family system (FamilyCenterScreen.js).
---

## Kasa Yöneticisi (Treasury Manager) Role

### RANKS array (FamilyCenterScreen.js)
New rank added between underboss and yonetici:
`{ id:'kasaci', label:'💰 Kasa Yöneticisi', color:'#10B981', perms:['treasury'] }`

Full hierarchy: boss → underboss → kasaci → yonetici → uye

### Permissions
- `treasury` perm allows: depositing AND withdrawing from family treasury
- All members can always deposit (no perm required)
- `withdraw()` function now checks: `!isLeader && !hasPerm('treasury')` — so both boss and kasaci can withdraw

### UI Changes (kasa tab)
- Shows "💰 Kasa Yöneticisi: {name}" badge in the treasury header when one is appointed
- Withdraw button label changes: "Çek (Boss)" for leader, "Çek (Kasa Yön.)" for kasaci
- Boss-only section: "Kasa Yöneticisi Ata" — lists all non-leader members with Ata/Görevden Al buttons
- "Görevden Al" sets their rank back to 'uye'; "Ata" calls changeRank(m, 'kasaci')

### How appointment works
Uses the existing `changeRank(uname, 'kasaci')` function — rank stored in `myFamily.ranks[uname]`.
Only one kasaci at a time by convention (no server enforcement — boss can revoke via changeRank back to uye).

**Why:** Previously only the boss could withdraw, leaving treasury management entirely to one person. The kasaci role lets the boss delegate financial management without giving the full underboss invite/kick permissions.
