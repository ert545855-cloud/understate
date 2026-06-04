---
name: Screen File Splits
description: SocialScreen.js ve GamesScreen.js bölündü — her bileşen src/screens/social/ ve src/screens/games/ altında ayrı dosya.
---

## Kural
SocialScreen.js ve GamesScreen.js artık 1-satır stub. Asıl bileşenler:
- `src/screens/social/`: YetkilerimPage, EventsPage, TeamWarPage, GangPage, AlliancePage, PlayersPage, ProfilePage, PremiumPage, StorePage
- `src/screens/games/`: FootballPage, FactoryPage, MiningPage, ArmyPage, SpyPage, NewspaperPage, PvpPage, KlanChatPage, NpcPlayersPage, DuyurularPage, LeaderboardPage, SocialFeedPage, AchievementsPage, CrisisPage, CasinoPage

## index.html SCREEN_FILES
Yeni dosyalar SCREEN_FILES'e eklendi (SocialScreen.js ve GamesScreen.js yerine tüm alt dosyalar).
Babel global scope'ta tüm bileşenler window global olarak yükleniyor — app.js doğrudan `<GangPage .../>` vs. çağırıyor.

**Why:** 2874 + 2369 = 5243 satırlık iki devasa dosyayı bölmek Babel derleme süresini ve edit complexity'sini azaltır.
**How to apply:** Yeni screen eklerken src/screens/social/ veya src/screens/games/ altına yaz ve index.html SCREEN_FILES'e ekle.
