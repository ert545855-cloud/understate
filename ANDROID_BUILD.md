# UNDERSTATE — Android APK Build Kılavuzu

## Ön Gereksinimler

| Araç | Versiyon | İndirme |
|---|---|---|
| Android Studio | Ladybug+ | https://developer.android.com/studio |
| JDK | 17+ | Android Studio ile gelir |
| Node.js | 18+ | https://nodejs.org |

---

## 1. Production Sunucusunu Ayarla

Önce backend'i deploy et (Render, Railway, VPS):
```
PUBLIC_URL=https://understate.onrender.com
```

---

## 2. Web Varlıklarını Hazırla

```bash
node scripts/prepare-android.js https://SENIN_SUNUCU_URL_IN
```

Bu komut `www/` klasörünü oluşturur ve production URL'ini inject eder.

---

## 3. Android'e Sync Et

```bash
npx cap sync android
```

---

## 4. Keystore Oluştur (İlk Kez)

```bash
bash scripts/generate-keystore.sh
```

> ⚠️ **KRİTİK:** Keystore dosyasını (`android/app/understate.keystore`) ve şifresini güvenli yerde sakla.
> Kaybolursa Play Store'a güncelleme yükleyemezsin!

SHA-256 parmak izini `.well-known/assetlinks.json` dosyasına yaz:
```json
"sha256_cert_fingerprints": ["AA:BB:CC:..."]
```

---

## 5. Android Studio'da Aç

```bash
npx cap open android
```

Ya da Android Studio → Open → `android/` klasörünü seç.

---

## 6. Debug APK Build (Test İçin)

Android Studio'da:
1. `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
2. Ya da terminalde (Android Studio içinde):
   ```
   ./gradlew assembleDebug
   ```
3. APK: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 7. Release APK Build (Play Store İçin)

### a. Signing Config Hazırla

`android/app/gradle.properties` dosyasına ekle:
```properties
KEYSTORE_PATH=understate.keystore
KEYSTORE_PASSWORD=SENIN_SIFREN
KEY_ALIAS=understate
KEY_PASSWORD=SENIN_SIFREN
```

### b. Release Build

```bash
cd android && ./gradlew bundleRelease
```

Ya da Android Studio:
1. `Build` → `Generate Signed Bundle / APK`
2. `Android App Bundle (.aab)` seç (Play Store tercih eder)
3. Keystore bilgilerini gir
4. `Release` seç → `Finish`

Çıktı: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 8. Play Store'a Yükle

1. [Google Play Console](https://play.google.com/console) → Yeni Uygulama Oluştur
2. Uygulama bilgileri:
   - **Ad:** UNDERSTATE
   - **Paket Adı:** `com.understate.game`
   - **Kategori:** Oyunlar → Strateji
   - **İçerik Derecelendirmesi:** Gerekli anket doldur
3. `.aab` dosyasını yükle (Internal Testing → Closed Testing → Production)
4. Store Listing, Privacy Policy, Screenshots ekle

---

## 9. AdMob Yapılandırması

AdMob hesabında:
1. [AdMob Console](https://admob.google.com) → Uygulamalar → Uygulama Ekle
2. Platform: **Android**
3. App ID: `ca-app-pub-7362104594733603~3744323984` ✓ (zaten ayarlı)
4. Ad Unit: `ca-app-pub-7362104594733603/8613507280` ✓ (zaten ayarlı)

Play Store'a yükledikten sonra AdMob → Uygulamalar → Uygulamayı Play Store ile eşleştir.

---

## 10. Güncelleme Yayınlama

Kod değişikliklerinden sonra:
```bash
# 1. Sunucuyu güncelle ve deploy et
git push

# 2. Eğer web varlıkları değiştiyse (index.html, css, js):
npm run android:sync

# 3. Yeni APK/AAB build et ve Play Store'a yükle
# versionCode'u her seferinde artır!
```

Sadece sunucu kodu değiştiyse (socket handler, API) → APK güncellemeye gerek yok, sunucu otomatik çeker.

---

## Önemli Dosyalar

| Dosya | Amaç |
|---|---|
| `capacitor.config.json` | Capacitor ana config |
| `android/app/src/main/AndroidManifest.xml` | Android permissions ve meta-data |
| `android/app/build.gradle` | Build yapılandırması |
| `android/variables.gradle` | SDK versiyonları |
| `scripts/prepare-android.js` | www/ hazırlama scripti |
| `scripts/generate-keystore.sh` | Keystore oluşturma scripti |
| `.well-known/assetlinks.json` | TWA digital asset linking |

---

## Sorun Giderme

**"SDK location not found"**
→ Android Studio'da SDK yükle: SDK Manager → Android 13/14

**"Manifest merger failed"**
→ `android/app/src/main/AndroidManifest.xml` kontrol et

**"AdMob failed to load"**
→ Test modunda test ID kullan, canlıya geçince gerçek ID aktif olur

**"App rejected by Play Store"**
→ `Privacy Policy` URL'i ekle, `Content Rating` anketi doldur

---

## Hızlı Komutlar

```bash
npm run android:prepare   # www/ klasörünü hazırla
npm run android:sync      # Sync + prepare
npm run android:open      # Android Studio'da aç
```
