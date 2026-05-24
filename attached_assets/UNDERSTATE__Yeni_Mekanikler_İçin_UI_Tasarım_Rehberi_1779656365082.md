# UNDERSTATE: Yeni Mekanikler İçin UI Tasarım Rehberi

Bu doküman, **Understate** projesine eklenen yeni oyun mekanikleri olan Devlet İhaleleri, Sendika ve İşçilik, Çete Kasası ve Lojistik ile Parti Merkezi için kullanıcı arayüzü (UI) tasarım önerilerini sunmaktadır. Mevcut Obsidian Design System v5 (styles.css) ve React bileşen yapısı (Icon.jsx) temel alınarak tutarlı bir görsel dil hedeflenmiştir.

---

## 1. Genel UI Prensipleri

-   **Karanlık Tema:** Mevcut `var(--bg)`, `var(--card-bg)` renk paletine uygun, koyu tonlarda bir arayüz.
-   **Minimalist ve İşlevsel:** Gereksiz süslemelerden kaçınarak, bilgiyi net ve anlaşılır bir şekilde sunma.
-   **Modüler Yapı:** Her bir mekanik için ayrı paneller veya modallar kullanarak, içeriği düzenli tutma.
-   **Etkileşimli Elementler:** Butonlar, giriş alanları ve listeler için mevcut `btn`, `icon-btn`, `search-bar` gibi sınıfları kullanma.
-   **Bilgi Hiyerarşisi:** Önemli bilgileri (para miktarı, süre sayaçları, uyarılar) vurgulama.

---

## 2. Devlet İhaleleri UI Tasarımı

Devlet İhaleleri, ailelerin rekabet ettiği ve aktif katılım gerektiren bir sistemdir. UI, şeffaflığı ve zamanlamayı ön planda tutmalıdır.

### 2.1. İhale Listesi Paneli

-   **Yerleşim:** Ana oyun arayüzünde, belki bir "Devlet" veya "Ekonomi" sekmesi altında erişilebilir bir panel.
-   **Görünüm:** `card` yapısında, her ihale için ayrı bir kart veya liste öğesi.
-   **Elementler:**
    -   **İhale Başlığı:** `card-title` stilinde, ihalenin adını belirtir.
    -   **Açan Makam:** İhaleyi açan Başkanın adı/avatarı.
    -   **Mevcut Teklif:** `stat-item` benzeri bir yapıda, en yüksek teklif ve teklif veren aile.
    -   **Kalan Süre:** `timer-text` stilinde, ihalenin bitimine kalan süreyi gösteren geri sayım sayacı.
    -   **Durum:** `tag` stilinde (örn. `tag-blue` for 'Açık', `tag-gold` for 'Aktif', `tag-gray` for 'Tamamlandı').
    -   **Teklif Ver Butonu:** `btn-primary` stilinde, ihaleye teklif vermek için bir buton. (Sadece aile liderleri için aktif).

### 2.2. İhale Detayları ve Teklif Verme Modalı

-   **Açılış:** İhale listesindeki bir ihaleye tıklandığında açılan bir modal veya tam ekran panel.
-   **Elementler:**
    -   **İhale Bilgileri:** Başlık, açıklama, başlangıç bedeli, toplam gelir beklentisi.
    -   **Teklif Geçmişi:** İhaleye verilen tüm tekliflerin listesi (kim, ne kadar, ne zaman).
    -   **Teklif Verme Alanı:** Oyuncunun (aile liderinin) yeni teklif girebileceği bir `input` alanı ve `btn-primary` stilinde "Teklif Ver" butonu.
    -   **Mevcut En Yüksek Teklif:** Net bir şekilde vurgulanır.

### 2.3. İhale Kontrol Mekanizması (Aile Lideri için)

-   **Görünüm:** Ana arayüzde veya ilgili holding/fabrika yönetim panelinde beliren bir uyarı/buton.
-   **Elementler:**
    -   **Uyarı Kartı:** `card` yapısında, `tag-red` ile "Kontrol Gerekli!" veya `tag-gold` ile "Kontrol Süresi Yaklaşıyor!" uyarısı.
    -   **Kalan Süre:** `timer-text` stilinde, bir sonraki kontrol için kalan süre.
    -   **Kaçırılan Kontrol Sayısı:** Net bir şekilde gösterilir (örn. `Missed Controls: 2`).
    -   **Kontrol Yap Butonu:** `btn-primary` stilinde, "Kontrol Yap" butonu. Tıklandığında kontrolü tamamlar ve sayacı sıfırlar.
    -   **Görsel İlerleme Çubuğu:** `progress-wrap` ve `progress-fill` kullanarak projenin genel ilerlemesini gösterir.

---

## 3. Sendika ve İşçilik UI Tasarımı

Sendika sistemi, bireysel oyuncuların etkileşimini ve ailelerin iş gücü yönetimini kapsar.

### 3.1. Sendika Paneli

-   **Yerleşim:** "Topluluk" veya "İş Hayatı" sekmesi altında erişilebilir.
-   **Görünüm:** `card` yapısında, mevcut sendikaların listesi.
-   **Elementler:**
    -   **Sendika Adı:** `card-title` stilinde.
    -   **Lider:** Sendika liderinin adı.
    -   **Üye Sayısı:** `stat-item` benzeri bir gösterge.
    -   **Etki Alanı/Gücü:** Sendikanın oyundaki genel etkisini gösteren bir bar veya sayı.
    -   **Katıl/Kur Butonu:** `btn-primary` veya `btn-secondary` stilinde.

### 3.2. Fabrika İşçi Yönetimi (Aile Lideri için)

-   **Yerleşim:** Aile liderinin fabrika yönetim panelinde bir sekme veya bölüm.
-   **Elementler:**
    -   **İşçi Listesi:** Fabrikada çalışan oyuncuların listesi (ad, vardiya durumu, maaş).
    -   **Sendika Anlaşması Durumu:** `tag` stilinde (örn. `tag-green` for 'Anlaşma Var', `tag-red` for 'Anlaşma Yok').
    -   **Maaş Ayarları:** İşçilere ödenecek maaş miktarını ayarlama `input` alanı.
    -   **Toplu Sözleşme Butonu:** Sendika ile müzakere başlatmak için buton.

### 3.3. İşçi Paneli (Bireysel Oyuncu için)

-   **Yerleşim:** Oyuncunun kişisel profilinde veya "İş Hayatı" sekmesinde.
-   **Elementler:**
    -   **Çalıştığı Fabrika:** Fabrikanın adı ve sahibi aile.
    -   **Kalan Vardiya Süresi:** `timer-text` stilinde, 4 saatlik vardiyanın bitimine kalan süre.
    -   **Kazanılan Ücret:** Mevcut vardiyada kazanılan veya bir sonraki ödemede alınacak miktar.
    -   **Vardiya Başlat/Bitir Butonu:** `btn-primary` stilinde.
    -   **Sendika Üyeliği:** Hangi sendikaya üye olduğu veya sendikaya katılma/kurma seçeneği.

---

## 4. Çete Kasası ve Lojistik UI Tasarımı

Çete liderlerinin kaynakları yönettiği ve savunma stratejilerini belirlediği bir arayüz.

### 4.1. Çete Kasası Paneli (Çete Lideri için)

-   **Yerleşim:** Çete yönetim panelinde ana bir sekme.
-   **Elementler:**
    -   **Mevcut Kasa:** `stat-item` stilinde, büyük ve vurgulu bir şekilde gösterilen toplam para miktarı.
    -   **Haftalık Gelir/Gider Özeti:** Ailelerden gelen koruma ücretleri, silah alımları, maaş ödemeleri gibi kalemlerin listesi.
    -   **Silah Alım Butonu:** `btn-primary` stilinde, "Silah Al" modalını açar.
    -   **Maaş Dağıt Butonu:** `btn-secondary` stilinde, üyelere maaş dağıtma modalını açar.

### 4.2. Silah Envanteri ve Alım Modalı

-   **Açılış:** "Silah Al" butonuna tıklandığında açılan modal.
-   **Elementler:**
    -   **Mevcut Silahlar:** Çetenin sahip olduğu silahların listesi (tür, miktar, toplam güç katkısı).
    -   **Silah Mağazası:** Satın alınabilecek silahların listesi (resim, fiyat, güç bonusu).
    -   **Satın Alma Butonu:** Her silah için `btn-primary` stilinde "Satın Al" butonu. Yeterli kasa bakiyesi yoksa pasif.

### 4.3. Üye Maaş Yönetimi Modalı

-   **Açılış:** "Maaş Dağıt" butonuna tıklandığında açılan modal.
-   **Elementler:**
    -   **Üye Listesi:** Çete üyelerinin listesi.
    -   **Maaş Giriş Alanı:** Her üye için ödenecek maaş miktarını belirten `input` alanı.
    -   **Toplu Maaş Öde Butonu:** `btn-primary` stilinde.

---

## 5. Parti Merkezi UI Tasarımı

Partilerin siyasi faaliyetlerini yürüttüğü, üyelerini yönettiği ve fonlarını takip ettiği bir arayüz.

### 5.1. Parti Listesi Paneli

-   **Yerleşim:** "Siyaset" veya "Hükümet" sekmesi altında erişilebilir.
-   **Görünüm:** `card` yapısında, mevcut partilerin listesi.
-   **Elementler:**
    -   **Parti Adı:** `card-title` stilinde.
    -   **Lider:** Parti liderinin adı/avatarı.
    -   **Üye Sayısı:** `stat-item` benzeri bir gösterge.
    -   **İdeoloji:** `tag` stilinde (örn. `tag-blue` for 'Liberal', `tag-red` for 'Muhafazakar').
    -   **Katıl/Kur Butonu:** `btn-primary` veya `btn-secondary` stilinde.

### 5.2. Parti Yönetim Paneli (Parti Lideri için)

-   **Yerleşim:** Parti liderinin parti yönetim panelinde ana bir sekme.
-   **Elementler:**
    -   **Parti Kasası:** `stat-item` stilinde, toplam para miktarı.
    -   **Üye Listesi:** Parti üyelerinin listesi (ad, rütbe/makam, katkı).
    -   **Makam Atama:** Üyelere kabinedeki veya parti içindeki makamları atama arayüzü.
    -   **Fonlama Kaynakları:** Ailelerden gelen fonları ve diğer gelirleri gösteren özet.
    -   **Yasa Teklif Et Butonu:** Yeni yasa teklifi oluşturmak için `btn-primary` stilinde.

---

## 6. Teknik Uygulama Notları (UI Bileşenleri)

-   **Modallar:** Tüm detay panelleri ve onay ekranları için mevcut modal yapısı kullanılabilir.
-   **İkonlar:** `Icon.jsx` dosyasındaki `ICON_MAP` genişletilerek yeni ikonlar (ihale, sendika, silah vb.) eklenebilir.
-   **CSS Sınıfları:** `styles.css` dosyasındaki `card`, `btn`, `tag`, `stat-item`, `timer-text` gibi genel sınıflar yeni UI elementlerinde tutarlı bir şekilde kullanılmalıdır.
-   **React Bileşenleri:** Her bir panel veya modal için ayrı React bileşenleri (`TenderList.jsx`, `UnionPanel.jsx`, `GangTreasury.jsx`, `PartyCenter.jsx`) oluşturulmalıdır. Bu bileşenler, mevcut `app.jsx` veya benzeri bir ana bileşen üzerinden çağrılmalıdır.
-   **Veri Bağlama:** UI elementleri, `gameEngine.js` ve veritabanından gelen gerçek zamanlı verilerle güncellenmelidir.

---

## 7. Özet Görsel Dil

Understate'in mevcut karanlık, modern ve hafif fütüristik tasarım dilini koruyarak, yeni mekanikler için kullanıcıların kolayca anlayabileceği ve etkileşimde bulunabileceği arayüzler hedeflenmiştir. Özellikle zamanlayıcılar, ilerleme çubukları ve renk kodlu etiketler, oyunun dinamiklerini görsel olarak destekleyecektir.
