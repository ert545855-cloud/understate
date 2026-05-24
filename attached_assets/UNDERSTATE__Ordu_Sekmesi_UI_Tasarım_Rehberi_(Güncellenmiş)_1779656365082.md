# UNDERSTATE: Ordu Sekmesi UI Tasarım Rehberi (Güncellenmiş)

Bu doküman, **Understate** projesine entegre edilen **Ordu** mekaniği için kullanıcı arayüzü (UI) tasarım önerilerini sunmaktadır. Özellikle ordunun bağımsız yapısı ve darbe mekanizması göz önünde bulundurularak, mevcut Obsidian Design System v5 (`styles.css`) ve React bileşen yapısı (`Icon.jsx`) temel alınarak tutarlı, otoriter ve işlevsel bir görsel dil hedeflenmiştir.

---

## 1. Genel UI Prensipleri

-   **Karanlık ve Askeri Tema:** Mevcut `var(--bg)`, `var(--card-bg)` renk paletine uygun, koyu tonlarda, metalik ve keskin hatlara sahip bir arayüz. Vurgu renkleri olarak `var(--accent)` (mavi/mor) ve `var(--gold)` (altın) kullanılabilir.
-   **Hiyerarşik ve Düzenli:** Bilgiyi rütbe ve önem sırasına göre düzenleyerek, askeri disiplini yansıtan bir yapı.
-   **Modüler ve Erişilebilir:** Ordu içindeki farklı roller (asker, Savunma Bakanı, Genelkurmay Başkanı) için yetkilere göre değişen paneller veya sekmeler.
-   **Etkileşimli Elementler:** Butonlar, ilerleme çubukları ve listeler için mevcut `btn`, `icon-btn`, `progress-wrap` gibi sınıfları kullanma.
-   **Görsel İkonografi:** Askeri rütbeler, silahlar, operasyon türleri için özel ikonlar (`ICON_MAP` genişletilerek).
-   **Uyarı ve Durum Göstergeleri:** Darbe potansiyeli, yolsuzluk seviyesi gibi kritik durumları belirten görsel uyarılar ve göstergeler.

---

## 2. Ordu Genel Bakış Paneli (Tüm Oyuncular İçin)

Bu panel, tüm oyuncuların ordunun genel durumu hakkında bilgi alabileceği bir giriş noktasıdır.

-   **Yerleşim:** Ana navigasyon menüsünde yeni bir "Ordu" sekmesi (`/army` rotası).
-   **Görünüm:** `card` yapısında, birden fazla bilgi kartını içeren bir düzen.
-   **Elementler:**
    -   **Ordu Başlığı:** `card-title` stilinde, "Şehir Ordusu" veya "Milli Savunma Kuvvetleri".
    -   **Genel Güç Durumu:** Büyük bir `stat-item` ile toplam askeri güç puanı (`strength`). Belki bir `progress-fill` ile maksimum güce ne kadar yakın olduğu gösterilebilir.
    -   **Ordu Bütçesi:** `stat-item` stilinde, mevcut ordu bütçesi (`money` ikonu ile).
    -   **Komuta Zinciri Kartı:** `card` yapısında, Başkomutan, Savunma Bakanı ve Genelkurmay Başkanı'nın avatarları, isimleri ve rütbeleri. Her birinin üzerine gelindiğinde kısa biyografileri gösterilebilir.
    -   **Aktif Operasyonlar Kartı:** `card` yapısında, devam eden önemli operasyonların kısa listesi. Her operasyon için başlık, hedef bölge ve kalan süre (`timer-text` stilinde) gösterilebilir.
    -   **Askeri İhaleler Özeti:** `card` yapısında, açık askeri ihalelerin başlıkları ve bitiş süreleri. "Tüm İhaleleri Görüntüle" butonu (`btn-secondary` stilinde) ile detaylı ihale paneline yönlendirme.
    -   **Darbe Potansiyeli Göstergesi (Opsiyonel):** Genel oyun dengesi veya yolsuzluk seviyesi gibi faktörlere bağlı olarak ordunun darbe yapma potansiyelini gösteren bir `tag` veya `progress-bar` (örn. `tag-red` for 'Yüksek Risk', `tag-green` for 'Düşük Risk'). Bu, tüm oyuncular için bir uyarı niteliği taşır.

### Örnek UI Yapısı (HTML/JSX)

```html
<div className="content">
  <div className="grid-2">
    <div className="card">
      <h3 className="card-title">Şehir Ordusu Genel Durumu</h3>
      <div className="stat-item">
        <span className="stat-label">Toplam Güç</span>
        <span className="stat-value stat-green">12,500</span>
      </div>
      <div className="progress-wrap">
        <div className="progress-fill" style={{ width: '75%' }}></div>
      </div>
      <div className="stat-item mt-3">
        <span className="stat-label">Mevcut Bütçe</span>
        <span className="stat-value stat-gold"><Icon name="money" size={16} /> 125,000,000</span>
      </div>
      {coupReadinessScore > 70 && (
        <div className="tag tag-red mt-3">Darbe Riski: Yüksek!</div>
      )}
    </div>

    <div className="card">
      <h3 className="card-title">Komuta Zinciri</h3>
      <div className="flex items-center gap-3 mb-2">
        <img src="/avatars/president.png" alt="Başkomutan" className="w-10 h-10 rounded-full" />
        <div>
          <p className="text-sm font-bold">Başkomutan: {presidentName}</p>
          <p className="text-xs text-muted">Devlet Başkanı</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <img src="/avatars/defense_minister.png" alt="Savunma Bakanı" className="w-10 h-10 rounded-full" />
        <div>
          <p className="text-sm font-bold">Savunma Bakanı: {ministerName}</p>
          <p className="text-xs text-muted">Parti: {partyName}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <img src="/avatars/general.png" alt="Genelkurmay Başkanı" className="w-10 h-10 rounded-full" />
        <div>
          <p className="text-sm font-bold">Genelkurmay Başkanı: {generalName}</p>
          <p className="text-xs text-muted">Rütbe: General</p>
        </div>
      </div>
    </div>
  </div>

  <div className="card mt-4">
    <h3 className="card-title">Aktif Operasyonlar</h3>
    {activeOperations.length > 0 ? (
      <ul>
        {activeOperations.map(op => (
          <li key={op.id} className="flex justify-between items-center py-2 border-b border-border2 last:border-b-0">
            <div>
              <p className="font-bold">{op.title}</p>
              <p className="text-xs text-muted">Hedef: {op.targetArea}</p>
            </div>
            <span className="timer-text">Kalan Süre: {op.timeRemaining}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-muted">Şu anda aktif bir operasyon bulunmamaktadır.</p>
    )}
  </div>

  <div className="card mt-4">
    <h3 className="card-title">Açık Askeri İhaleler</h3>
    {militaryTenders.length > 0 ? (
      <ul>
        {militaryTenders.map(tender => (
          <li key={tender.id} className="flex justify-between items-center py-2 border-b border-border2 last:border-b-0">
            <div>
              <p className="font-bold">{tender.title}</p>
              <p className="text-xs text-muted">İstenen: {tender.equipment}</p>
            </div>
            <span className="timer-text">Bitiş: {tender.endsAt}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-muted">Şu anda açık askeri ihale bulunmamaktadır.</p>
    )}
    <button className="btn btn-secondary mt-3">Tüm İhaleleri Görüntüle</button>
  </div>
</div>
```

---

## 3. Askeri Kariyer Paneli (Bireysel Oyuncular İçin)

Bu panel, orduya katılan veya katılmak isteyen oyuncuların kariyerlerini yönettiği yerdir.

-   **Yerleşim:** "Ordu" sekmesi altında bir alt sekme veya modal.
-   **Görünüm:** Oyuncunun rütbesini ve ilerlemesini vurgulayan bir düzen.
-   **Elementler:**
    -   **Mevcut Rütbe ve İlerleme:** Oyuncunun mevcut rütbesi (örn. "Çavuş"). Rütbe atlamaya kalan XP veya görev sayısını gösteren bir `progress-wrap` ve `progress-fill`.
    -   **Askeri Maaş:** `stat-item` stilinde, oyuncunun aldığı düzenli maaş.
    -   **Görev Listesi:** Tamamlanabilecek askeri görevlerin listesi (devriye, eğitim, operasyon katılımı). Her görev için ödül (XP, para) ve zorluk seviyesi belirtilir. "Görevi Başlat" butonu (`btn-primary`).
    -   **Orduya Katıl/Terhis Ol Butonu:** `btn-primary` veya `btn-red` stilinde. Oyuncu orduya katılmamışsa "Orduya Katıl", katılmışsa "Terhis Ol" seçeneği sunulur.

### Örnek UI Yapısı (HTML/JSX)

```html
<div className="card">
  <h3 className="card-title">Askeri Kariyerim</h3>
  <div className="flex items-center justify-between mb-3">
    <div>
      <p className="text-lg font-bold">Rütbe: {playerRank}</p>
      <p className="text-sm text-muted">Sonraki Rütbe: {nextRank} ({xpToNextRank} XP kaldı)</p>
    </div>
    <img src="/icons/rank_{playerRank}.svg" alt="Rütbe İkonu" className="w-12 h-12" />
  </div>
  <div className="progress-wrap mb-3">
    <div className="progress-fill" style={{ width: `${rankProgress}%` }}></div>
  </div>
  <div className="stat-item mb-4">
    <span className="stat-label">Aylık Maaş</span>
    <span className="stat-value stat-green"><Icon name="money" size={16} /> {militarySalary}</span>
  </div>

  <h4 className="text-md font-bold mb-2">Mevcut Görevler</h4>
  {availableMissions.length > 0 ? (
    <ul>
      {availableMissions.map(mission => (
        <li key={mission.id} className="flex justify-between items-center py-2 border-b border-border2 last:border-b-0">
          <div>
            <p className="font-bold">{mission.title}</p>
            <p className="text-xs text-muted">Ödül: {mission.rewardMoney} <Icon name="money" size={12} /> / {mission.rewardXP} XP</p>
          </div>
          <button className="btn btn-primary btn-sm">Görevi Başlat</button>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-muted">Şu anda tamamlanacak askeri görev bulunmamaktadır.</p>
  )}

  {isEnlisted ? (
    <button className="btn btn-red mt-4">Terhis Ol</button>
  ) : (
    <button className="btn btn-primary mt-4">Orduya Katıl</button>
  )}
</div>
```

---

## 4. Ordu Yönetim Paneli (Savunma Bakanı / Genelkurmay Başkanı İçin)

Bu panel, ordunun stratejik ve operasyonel yönetimini sağlayan yetkililere özeldir. Özellikle Genelkurmay Başkanı için darbe mekanizması ile ilgili ek UI elementleri içerir.

-   **Yerleşim:** "Ordu" sekmesi altında, yetkili oyuncular için erişilebilir bir alt sekme veya ayrı bir yönetim arayüzü.
-   **Görünüm:** Bütçe, operasyonlar, personel yönetimi ve darbe mekanizması için ayrı sekmeler veya bölümler.
-   **Elementler:**
    -   **Bütçe Yönetimi Sekmesi (Savunma Bakanı için):**
        -   **Mevcut Bütçe:** Büyük ve vurgulu `stat-item`.
        -   **Harcama Kalemleri:** Maaşlar, ekipman alımı, operasyon maliyetleri gibi kalemlerin dökümü.
        -   **Bütçe Ayırma:** Farklı kalemlere bütçe ayırmak için `input` alanları ve "Bütçeyi Onayla" butonu (`btn-primary`).
        -   **Devlet Hazine Payı:** Ordunun devlet hazinesinden otomatik olarak aldığı yüzdeyi gösteren bilgi.
    -   **Operasyon Yönetimi Sekmesi (Genelkurmay Başkanı için):**
        -   **Yeni Operasyon Başlat:** Modal açan bir `btn-primary`. Modal içinde operasyon türü (çete baskını, sıkıyönetim), hedef bölge (harita üzerinden seçim), operasyon süresi ve beklenen sonuçlar belirlenir.
        -   **Aktif Operasyonlar Listesi:** Devam eden operasyonların detaylı listesi, ilerleme durumu ve "Operasyonu İptal Et" butonu (`btn-red`).
    -   **Askeri İhale Yönetimi Sekmesi (Genelkurmay Başkanı için):**
        -   **Yeni Askeri İhale Aç:** Modal açan bir `btn-primary`. Modal içinde istenen ekipman türü, miktarı, ihale süresi ve başlangıç fiyatı belirlenir.
        -   **Açık İhaleler Listesi:** Mevcut askeri ihalelerin listesi, teklifler ve "İhaleyi Sonuçlandır" butonu.
    -   **Personel Yönetimi Sekmesi (Genelkurmay Başkanı için):**
        -   **Asker Listesi:** Tüm ordu personelinin listesi (ad, rütbe, görev durumu).
        -   **Rütbe Terfisi/Tenkisi:** Seçilen askere rütbe verme veya düşürme işlemi.
        -   **Görev Atama:** Askerlere özel görevler atama.
    -   **Darbe Mekanizması Sekmesi (Sadece Genelkurmay Başkanı için):**
        -   **Darbe Hazırlık Puanı:** `coup_readiness_score`'u gösteren büyük bir `stat-item` veya `progress-bar`. Bu puanın yükselme nedenleri (yolsuzluk, rekabet azlığı, ordu bütçesi düşüşü) açıklanır.
        -   **Bildiri Gönder Butonu:** `btn-secondary` stilinde. Belirli bir `coup_readiness_score` eşiği aşıldığında aktif olur. Tıklandığında yönetime uyarı bildirisi gönderir.
        -   **Darbe Başlat Butonu:** `btn-red` stilinde. Bildiriye rağmen durum düzelmezse ve `coup_readiness_score` kritik seviyeye ulaşırsa aktif olur. Tıklandığında darbe girişimini başlatır. Onay modalları ile yanlışlıkla darbe yapılmasının önüne geçilir.
        -   **Son Darbe Girişimi Bilgisi:** Varsa, son darbe girişiminin tarihi ve sonucu.

### Örnek UI Yapısı (HTML/JSX)

```html
<div className="content">
  <div className="tabs-container">
    <div className="tab-header">
      <button className="tab-button active">Bütçe Yönetimi</button>
      <button className="tab-button">Operasyon Yönetimi</button>
      <button className="tab-button">Askeri İhale Yönetimi</button>
      <button className="tab-button">Personel Yönetimi</button>
      {isChiefOfStaff && <button className="tab-button">Darbe Mekanizması</button>}
    </div>
    <div className="tab-content card">
      {/* Bütçe Yönetimi İçeriği (Savunma Bakanı için) */}
      {isDefenseMinister && (
        <>
          <h3 className="card-title">Ordu Bütçesi</h3>
          <div className="stat-item mb-4">
            <span className="stat-label">Mevcut Bütçe</span>
            <span className="stat-value stat-gold"><Icon name="money" size={18} /> {armyBudget}</span>
          </div>
          <div className="stat-item mb-4">
            <span className="stat-label">Devlet Hazine Payı</span>
            <span className="stat-value stat-blue">%{treasuryPercentage}</span>
          </div>
          <div className="form-group">
            <label className="text-muted">Maaşlara Ayrılan Bütçe</label>
            <input type="number" className="input-field" value={salaryBudget} onChange={handleSalaryBudgetChange} />
          </div>
          <div className="form-group">
            <label className="text-muted">Ekipman Alım Bütçesi</label>
            <input type="number" className="input-field" value={equipmentBudget} onChange={handleEquipmentBudgetChange} />
          </div>
          <button className="btn btn-primary mt-4">Bütçeyi Onayla</button>
        </>
      )}

      {/* Darbe Mekanizması İçeriği (Sadece Genelkurmay Başkanı için) */}
      {isChiefOfStaff && activeTab === 'Darbe Mekanizması' && (
        <>
          <h3 className="card-title">Darbe Mekanizması</h3>
          <div className="stat-item mb-4">
            <span className="stat-label">Darbe Hazırlık Puanı</span>
            <span className="stat-value stat-red">{coupReadinessScore} / 100</span>
          </div>
          <p className="text-muted mb-3">Yüksek yolsuzluk, düşük rekabet veya ordu ödeneklerinin kesilmesi darbe potansiyelini artırır.</p>
          {coupReadinessScore >= 50 && !hasSentWarning && (
            <button className="btn btn-secondary mt-2" onClick={sendCoupWarning}>Yönetime Bildiri Gönder</button>
          )}
          {coupReadinessScore >= 80 && hasSentWarning && (
            <button className="btn btn-red mt-2" onClick={initiateCoup}>DARBE BAŞLAT!</button>
          )}
          {lastCoupAttempt && (
            <p className="text-muted mt-3">Son Darbe Girişimi: {lastCoupAttempt.date} - {lastCoupAttempt.result}</p>
          )}
        </>
      )}
    </div>
  </div>
</div>
```

---

## 5. Teknik Uygulama Notları (UI Bileşenleri)

-   **Modallar:** Tüm detay panelleri ve onay ekranları için mevcut modal yapısı kullanılabilir.
-   **İkonlar:** `Icon.jsx` dosyasındaki `ICON_MAP` genişletilerek yeni ikonlar (asker, rütbeler, tank, füze, kılıç vb.) eklenebilir. Askeri rütbeler için SVG ikonları kullanılabilir.
-   **CSS Sınıfları:** `styles.css` dosyasındaki `card`, `btn`, `tag`, `stat-item`, `timer-text`, `progress-wrap` gibi genel sınıflar yeni UI elementlerinde tutarlı bir şekilde kullanılmalıdır. Ayrıca, askeri temaya uygun yeni renkler veya gölgeler tanımlanabilir (örn. `var(--military-green)`, `var(--steel-gray)`).
-   **React Bileşenleri:** Her bir panel veya modal için ayrı React bileşenleri (`ArmyOverview.jsx`, `MilitaryCareer.jsx`, `ArmyManagement.jsx`) oluşturulmalıdır. Bu bileşenler, mevcut `app.jsx` veya benzeri bir ana bileşen üzerinden çağrılmalıdır.
-   **Veri Bağlama:** UI elementleri, `gameEngine.js` ve veritabanından gelen gerçek zamanlı verilerle güncellenmelidir. Özellikle rütbe ilerlemesi, bütçe değişimleri ve `coup_readiness_score` dinamik olarak yansıtılmalıdır.
-   **Yetkilendirme:** Ordu Yönetim Paneli gibi hassas arayüzlere sadece yetkili oyuncuların (Savunma Bakanı, Genelkurmay Başkanı) erişimi sağlanmalıdır. Darbe mekanizması sekmesi ise sadece Genelkurmay Başkanı rolündeki oyuncuya görünür olmalıdır.

---

## 6. Özet Görsel Dil

Understate'in mevcut karanlık, modern ve hafif fütüristik tasarım dilini koruyarak, Ordu mekaniği için otoriter, düzenli ve bilgilendirici arayüzler hedeflenmiştir. Özellikle rütbe ikonları, ilerleme çubukları ve operasyon haritaları gibi görsel elementler, oyuncuların kendilerini bir askeri hiyerarşinin parçası gibi hissetmelerini sağlayacaktır. Renk paletinde koyu tonlar, metalik griler ve vurgu olarak askeri yeşil veya altın sarısı kullanılabilir. Darbe mekanizması için ise kırmızı ve uyarı tonları kullanılarak gerilimli bir atmosfer yaratılabilir.
