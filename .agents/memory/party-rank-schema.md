---
name: Party Rank Schema
description: 6-tier party management hierarchy in PartyCenterScreen.js and associated state/logic.
---

## Party Rank System (PartyCenterScreen.js)

### Hierarchy (PARTY_RANKS constant, in order)
| id | Label | Color | maxCount | canBeCampaign |
|---|---|---|---|---|
| genel_baskan | ⭐ Genel Başkan | #FFD700 | 1 | true |
| baskan_yrd | 🏅 Başkan Yardımcısı | #F97316 | 2 | true |
| sozcu | 🎙️ Parti Sözcüsü | #60A5FA | 1 | false |
| il_baskani | 🌆 İl Başkanı | #A78BFA | 8 | true |
| milletvekili | 🏛️ Milletvekili | #10B981 | 30 | false |
| uye | 👤 Üye | #5E7390 | 999 | false |

### State
`partyRanks` — localStorage key `us_prtctr_partyRanks`, structure: `{ [partyId]: { [username]: rankId } }`

### Functions
- `getPartyRank(username)` — returns PARTY_RANKS entry; leader always maps to genel_baskan
- `assignPartyRank(username, rankId)` — leader-only; enforces maxCount before assigning; emits meclisBroadcast

### Tabs added
- `yonetim` tab: org chart (visual indented hierarchy with holders listed), "Rütbe Ata" (leader only), Kabine Pozisyonları
- `members` tab: shows party rank badge + cabinet position badge; stats row at bottom (Liderlik/İl Teşkilatı/Milletvekili counts)

**Why:** The old members tab only showed a "LİDER" badge with no real hierarchy. Party management was flat.

**How to apply:** Always use `getPartyRank(m)` to display member rank, not direct localStorage reads.
