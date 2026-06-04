---
name: Server Routes Added
description: bank.js ve chat.js rotaları eklendi — kayıtlı server/main.js'de.
---

## server/routes/bank.js
- GET  /api/bank/status — bakiye + faiz durumu (canCollect, msUntil, rate, projectedInterest)
- POST /api/bank/deposit — nakit → banka
- POST /api/bank/withdraw — banka → nakit
- POST /api/bank/interest — faiz topla (24s cooldown, DB'de last_bank_interest)
- POST /api/bank/transfer — para gönder (%1 komisyon, money_transfers tablosuna kayıt)

## server/routes/chat.js
- GET  /api/chat/history/:channel — dbService.getChannelHistory() kullanır
- POST /api/chat/message — dbService.saveChatMessage() + socket.IO broadcast

**Why:** BankPage ve KlanChatPage localStorage'dan sunucuya taşındı; multiplayer tutarlılık için gerekli.
**How to apply:** Yeni kullanıcı işlemleri için her zaman authMiddleware ekle; bank route'unda `findUserById` kullan.
