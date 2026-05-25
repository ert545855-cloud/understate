# Yeni Senaryo — Entegrasyon Kılavuzu

## 3 Yeni Ekran

| Dosya | Ekran | Nav ID |
|-------|-------|--------|
| `EconomicEmpireScreen.js` | 🏢 Ekonomik İmparatorluk | `economic_empire` |
| `ProtectionDealsScreen.js` | 🛡️ Koruma Anlaşmaları | `protection_deals` |
| `IndependentArmyScreen.js` | 🪖 Bağımsız Ordu | `independent_army` |

---

## 1. `index.html` — Script Tag Ekle

Mevcut screen scriptlerinin yanına şunları ekle:

```html
<script src="/src/screens/EconomicEmpireScreen.js"></script>
<script src="/src/screens/ProtectionDealsScreen.js"></script>
<script src="/src/screens/IndependentArmyScreen.js"></script>
```

Dosyaları `/src/screens/` klasörüne kopyala.

---

## 2. `src/app.js` — NAV_GROUPS İçine Ekle

### Ekonomi grubuna:
```js
{ id:'economic_empire', icon:'🏢', label:'İmparatorluk', rgb:'16,185,129' },
```

### Savaş grubuna:
```js
{ id:'protection_deals', icon:'🛡️', label:'Koruma', rgb:'239,68,68' },
```

### Mevcut `army_system` yerine veya yanına:
```js
{ id:'independent_army', icon:'🪖', label:'Ordu Sistemi', rgb:'239,68,68' },
```

---

## 3. `src/app.js` — Sayfa Render Switch'e Ekle

Ana render bölümünde `case` ekle:

```js
case 'economic_empire':
  return <window.EconomicEmpireScreen
    cu={currentUser}
    families={families}
    gangs={gangs}
    parties={parties}
    allUsers={allUsers}
    setCurrentPage={setPage}
  />;

case 'protection_deals':
  return <window.ProtectionDealsScreen
    cu={currentUser}
    gangs={gangs}
    families={families}
    allUsers={allUsers}
    setCurrentPage={setPage}
  />;

case 'independent_army':
  return <window.IndependentArmyScreen
    cu={currentUser}
    allUsers={allUsers}
    families={families}
    gangs={gangs}
    parties={parties}
    setCurrentPage={setPage}
  />;
```

---

## Senaryo Özeti

### 🏢 Aileler — Ekonomik İmparatorluk
- Holding → Fabrika → Şirket hiyerarşisi
- Sadece **aile lideri** veya **aile liderinin atadığı yöneticiler** işletme kurabilir
- Partileri fonlayarak siyasi söz hakkı kazanır

### 🛡️ Çeteler — Koruma Anlaşmaları
- Çete lideri veya atanmış yönetici → aile varlıkları için koruma teklifi yapar
- Haftalık / aylık ücret
- Aile lideri → teklifi kabul/reddeder
- Diğer çeteler → korumasız varlıklara saldırabilir
- **Çeteler orduda olanlara saldıramaz**

### 🪖 Bağımsız Ordu
- Siyasi atama yok — tamamen askeri puana (MP) dayalı
- Orduya katılmak için **hiçbir örgüte üye olmamak** zorunlu
- Genelkurmay adaylığı: min 800.000 MP + örgütsüz
- Ordu → çetelere saldırabilir (suç puanı koşulu)
- Çeteler → orduya saldıramaz
- Devlet → ordunun maaşını ödemek zorunda

### ⚑ Siyasi Partiler — Fonlama
- Aileler fonlar → parti puan kazanır → makam atayabilir
- Ancak **ordu makamlarına atama yapamaz**
