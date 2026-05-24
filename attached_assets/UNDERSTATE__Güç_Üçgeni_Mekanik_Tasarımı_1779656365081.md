# UNDERSTATE: Güç Üçgeni Mekanik Tasarımı

Bu doküman, **Understate** projesinin mevcut altyapısını (SQL şeması ve oyun motoru) temel alarak, **Aile**, **Çete** ve **Parti** arasındaki güç dengesini ve ekonomik döngüyü kurgular.

---

## 1. Temel Yapı: Güç Üçgeni (The Power Triangle)

Oyunun ana döngüsü, üç farklı organizasyon türünün birbirine olan bağımlılığı üzerine kuruludur. Hiçbir grup tek başına tüm ekosistemi domine edemez.

| Organizasyon | Rolü | Kaynağı | İhtiyacı |
| :--- | :--- | :--- | :--- |
| **Aile (Sermaye)** | Üretim ve Finans | Fabrikalar, Holdingler, İhaleler | Güvenlik, İş Gücü ve Yasama Gücü |
| **Çete (Kuvvet)** | Koruma ve Uygulama | Silahlı Güç, Alan Kontrolü | Para, Lojistik Destek ve İtibar |
| **Parti (Siyaset)** | Yasama ve Yönetim | Yasalar, Devlet Bütçesi, Üye Aidatları | Finansman, Oy ve Toplumsal Destek |

---

## 2. Aile Mekanikleri: "Sermayenin Sahipleri"

Aileler, oyunun ekonomik motorudur. Fabrika ve holding gibi pasif gelir kaynaklarını sadece aile üyeleri (veya aile liderinin yetkilendirdiği kişiler) açabilir ve yönetebilirler.

-   **Üretim Tekeli:** Fabrika kurma ve işletme yetkisi ailelere aittir. Diğer oyuncular bu fabrikalarda işçi olarak çalışabilir ancak sahibi olamazlar.
-   **Holding Yönetimi:** Holdingler, birden fazla fabrikayı ve borsa portföyünü birleştirir. Aile liderleri, holdinglerin yönetimini aile üyelerine devredebilir.
-   **Fonlama:** Aileler, siyasi partileri ve çeteleri finanse ederek dolaylı güç elde ederler. Bu fonlamalar, karşılıklı çıkar ilişkileri üzerine kuruludur.
-   **Devlet İhaleleri:** Aileler, devlet tarafından açılan ihalelere katılarak büyük projeler üstlenebilir ve önemli gelirler elde edebilirler. İhaleler, rekabetçi bir açık artırma sistemiyle belirlenir.

---

## 3. Çete Mekanikleri: "Sokağın Hakimleri"

Çeteler, ailelerin fiziksel güvenliğini, sevkiyat yollarını korur ve kendi bölgelerinde düzeni sağlar.

-   **Haftalık Koruma Ücreti (Protection Fee):** Aileler, sahip oldukları fabrika başına veya toplam gelirleri üzerinden anlaştıkları bir çeteye haftalık ödeme yapar. Bu ödemeler doğrudan çetenin kasasına aktarılır.
-   **Güvenlik Görevleri:** Eğer bir aile ödeme yapmazsa, çete o ailenin fabrikalarına "sabotaj" düzenleyebilir veya sevkiyatlarını engelleyebilir. Bu durum, ailelerin üretim ve gelir kaybına yol açar.
-   **Alan Kontrolü:** Çeteler, hammadde kaynaklarının (madenler, kaçak üretim bölgeleri vb.) olduğu bölgeleri kontrol ederek ailelerin üretim maliyetlerini etkileyebilir veya kendi gelir kaynaklarını yaratabilir.
-   **Çete Kasası ve Lojistik:** Ailelerden alınan koruma ücretleri çete kasasında toplanır. Çete liderleri, bu kasadaki parayı öncelikli olarak çetenin savunma gücünü artırmak için silah ve ekipman alımına harcar. Kalan bütçeyle çete üyelerine haftalık veya görev bazlı maaş ödemeleri yapılabilir.

---

## 4. Parti Mekanikleri: "Yasanın Gücü"

Partiler, siyasi arenada güç mücadelesi verir, yasaları belirler ve devleti yönetir. Ailelerin finansal desteği önemli olsa da, partiler kendi üyeleri ve ideolojileriyle de varlık gösterir.

-   **Makam Sistemi:** Aileler bir partiyi fonladığında, parti lideri seçimi kazanırsa kabinedeki kritik makamları (Ekonomi Bakanı, Sanayi Müdürü, İçişleri Bakanı vb.) o aile üyelerine veya partinin sadık üyelerine atayabilir. Bu, ailelerin ve partinin çıkarlarını dengeleyen bir sistemdir.
-   **Yasal Ayrıcalıklar ve Düzenlemeler:** İktidardaki parti, belirli sektörlerdeki vergileri düşürebilir, rakip ailelerin fabrikalarına ağır denetimler getirebilir veya çetelerin faaliyetlerini kısıtlayıcı yasalar çıkarabilir. Bu yasalar, oyun ekonomisini ve güç dengelerini doğrudan etkiler.
-   **Hazine Yönetimi:** Ailelerin ödediği vergiler, devlet ihalelerinden gelen gelirler ve diğer devlet gelirleri parti hazinesine ve oradan devlet projelerine akar. Parti, bu bütçeyi şehir altyapısı, güvenlik veya kendi propaganda faaliyetleri için kullanabilir.
-   **Parti Üyeliği ve Özerklik:** Partiler, ailelerden bağımsız olarak kendi üyelerini toplayabilir ve bu üyeler arasında makamları paylaşabilir. Aile fonlaması önemli bir avantaj sağlasa da, parti içi dinamikler ve üye sadakati de siyasi gücü belirler.

---

## 5. Yeni Mekanikler ve Detaylar

### 5.1. Devlet İhaleleri Sistemi

Devlet Başkanı (veya ilgili makam), belirli aralıklarla büyük devlet ihaleleri açabilir. Bu ihaleler, şehir altyapısı, yeni fabrika inşaatları veya özel projeler gibi alanlarda olabilir.

-   **İhale Açılışı:** Devlet Başkanı, ihale türünü, başlangıç bedelini ve süresini belirleyerek ihaleyi duyurur.
-   **Açık Artırma:** İhaleye sadece aileler katılabilir. Belirlenen süre boyunca en yüksek teklifi veren aile ihaleyi kazanır.
-   **Kontrol Mekanizması:** İhaleyi kazanan aile, projenin belirli aşamalarında (örneğin 8 saatte bir) "kontrol" yapmak zorundadır. Bu kontroller, projenin ilerleyişini ve kalitesini denetlemek içindir.
-   **Ceza Sistemi:** Her kaçırılan kontrol için, ihaleden elde edilecek toplam kazançtan %10 düşülür. Bu, aile liderlerinin ihaleleri ciddiye almasını ve aktif olmasını teşvik eder.
-   **İhale Takibi:** İhale süreçleri ve kontrol durumları, oyuncuların takip edebileceği bir arayüzde gösterilir.

### 5.2. Sendika ve İşçilik Sistemi

Ailelerin sahip olduğu fabrikalarda, aile üyesi olmayan diğer oyuncular işçi olarak çalışabilirler. Bu, oyundaki bireysel oyuncular için önemli bir gelir kaynağı ve sosyal etkileşim alanı sunar.

-   **İş Başvurusu:** Oyuncular, açık iş pozisyonları olan fabrikalara başvurabilirler.
-   **Çalışma Vardiyaları:** İşçiler, günde belirli sayıda (örneğin 4 saatlik) vardiya yapabilirler. Her vardiya sonunda belirlenen bir ücret kazanırlar.
-   **Sendika Kurulumu:** İşçiler, haklarını korumak ve daha iyi çalışma koşulları talep etmek için sendikalar kurabilirler. Sendikalar, ailelerle toplu sözleşme yapabilir veya grev kararı alabilir.
-   **Fabrika Verimliliği:** İşçilerin sayısı ve sendika anlaşmaları, fabrikanın üretim verimliliğini ve dolayısıyla ailenin gelirini etkiler.

---

## 6. Ekonomik Döngü ve İşleyiş (Scenario)

### "Gölge Hükümet" Senaryosu (Güncellenmiş)

Oyun sadece aile üzerine kurulu değildir; çünkü her grubun bir "Veto" gücü vardır ve yeni mekanikler bu dengeyi daha da karmaşık hale getirir:

1.  **Başlangıç:** Bir oyuncu tek başına zenginleşebilir ama "Holding" seviyesine geçmek için bir **Aile** kurması veya katılması gerekir.
2.  **Büyüme:** Aile fabrikalar kurar, ancak fabrikalar "Saldırıya Açık" statüsündedir. Güvenlik için bir **Çete** ile "Koruma Protokolü" imzalar. Ayrıca, iş gücü için **Sendikalar** ile anlaşmalar yapar.
3.  **Hegemonya:** Aile, rakiplerini yasal yollarla ezmek, devlet ihalelerini kazanmak ve kendi çıkarlarını korumak için bir **Parti** kurar veya mevcut bir partiyi fonlar. Partiler, ailelerden bağımsız üyelerle de güçlenebilir.
4.  **Denge ve Karşıtlıklar:**
    *   Eğer Aile, Çete'ye parasını ödemezse; Çete fabrikayı yakar veya sevkiyatları engeller. Çete, kasasındaki silahlarla bu eylemleri daha etkili hale getirebilir.
    *   Eğer Parti, Aile'ye makam vermez veya ailenin çıkarlarına aykırı yasalar çıkarırsa; Aile fonu keser, parti bir sonraki seçimi kaybeder veya siyasi gücü zayıflar.
    *   Eğer Çete, Parti'ye itaat etmezse; Parti "Polis Baskını" yasası çıkararak çeteyi zayıflatır veya çete liderlerini hedef alır.
    *   Eğer Aile, işçilerin haklarını ihlal ederse; Sendika grev kararı alabilir, bu da fabrikanın üretimini durdurur ve aileye ekonomik zarar verir.
    *   Devlet İhalelerinde kontrolü aksatan aileler, büyük maddi kayıplarla karşılaşır ve itibarları düşer.

---

## 7. Teknik Uygulama Önerileri (SQL & JS)

-   **`holdings` tablosuna `family_id` eklenmeli:** Sadece bu ID'ye sahip oyuncular holding yönetebilmeli.
-   **`gangs` tablosuna `contract_id` ve `treasury` ile `weapon_inventory` JSONB alanları eklenmeli:** Hangi aileyle koruma anlaşması olduğu takip edilmeli, çete kasası ve silah envanteri yönetilmeli.
-   **`parties` tablosuna `sponsor_family_id` (opsiyonel) ve `members` JSONB alanları eklenmeli:** Seçim kampanyası bütçesinin kaynağı belirlenmeli ve parti üyeleri takip edilmeli.
-   **Yeni `tenders` tablosu oluşturulmalı:**
    ```sql
    CREATE TABLE IF NOT EXISTS tenders (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title TEXT NOT NULL,
      description TEXT,
      president_id TEXT NOT NULL, -- İhaleyi açan başkan
      winning_family_id TEXT, -- İhaleyi kazanan aile
      winning_bid BIGINT DEFAULT 0,
      status TEXT DEFAULT 'open', -- open, active, completed, failed
      control_interval_hours INTEGER DEFAULT 8, -- Kontrol sıklığı
      last_control_at TIMESTAMPTZ,
      missed_controls INTEGER DEFAULT 0,
      penalty_per_miss DECIMAL(5,2) DEFAULT 0.10, -- %10 ceza
      total_revenue BIGINT DEFAULT 0, -- İhalenin toplam geliri
      ends_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```
-   **Yeni `unions` tablosu oluşturulmalı:**
    ```sql
    CREATE TABLE IF NOT EXISTS unions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT UNIQUE NOT NULL,
      leader_id TEXT,
      members JSONB DEFAULT '[]',
      treasury BIGINT DEFAULT 0,
      influence INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```
-   **`players` tablosuna `union_id` ve `job_shift_end` BIGINT alanları eklenmeli:** Oyuncunun hangi sendikaya üye olduğu ve çalışma vardiyasının bitiş zamanı takip edilmeli.
-   **`holdings` tablosuna `worker_count` INTEGER ve `union_contract_id` TEXT alanları eklenmeli:** Fabrikadaki işçi sayısı ve sendika anlaşması takip edilmeli.
-   **Otomatik Ödeme ve Kontrol Sistemleri:** `gameEngine.js` içinde her hafta (veya oyun günü) aile kasasından çete kasasına otomatik transfer yapan bir `cron job` eklenmeli. Ayrıca, ihale kontrollerini takip eden, sendika maaşlarını ödeyen ve çete üyelerine maaş dağıtımını yöneten yeni `cron job`'lar veya zamanlanmış görevler eklenmeli.

---

## 8. Özet Senaryo Önerisi: "Understate: New Order" (Güncellenmiş)

*Şehir artık eski kurallarla yönetilmiyor. Vali sadece bir kukla. Gerçek güç, fabrikaların dumanını tüttüren **Aileler**, o fabrikaların kapısında nöbet tutan **Çeteler**, meclis koltuklarında oturan **Parti** başkanları ve işçilerin haklarını savunan **Sendikalar** arasındaki karmaşık ilişkilerde saklı.*

*Sen kim olacaksın? Parayı yöneten mi, silahı tutan mı, yasayı yazan mı, yoksa işçilerin sesi mi? Unutma, bu şehirde hayatta kalmak ve yükselmek için her zaman bir denge bulmak zorundasın.*
