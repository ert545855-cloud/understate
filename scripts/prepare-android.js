/**
 * UNDERSTATE — Android Build Preparation Script
 * 
 * Bu script, web varlıklarını Capacitor'un www/ klasörüne kopyalar
 * ve production sunucu URL'ini yapılandırır.
 * 
 * Kullanım: node scripts/prepare-android.js [production_url]
 * Örnek: node scripts/prepare-android.js https://understate.onrender.com
 */

const fs   = require('fs');
const path = require('path');

const PRODUCTION_URL = process.argv[2] || process.env.PUBLIC_URL || 'https://yourdomain.com';
const WWW_DIR        = path.join(__dirname, '../www');

// ── Helpers ──────────────────────────────────────────────────────────────────
function mkdirSafe(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  mkdirSafe(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) { console.warn(`  [SKIP] ${src} bulunamadı`); return; }
  mkdirSafe(dest);
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  }
}

// ── Clean www/ ───────────────────────────────────────────────────────────────
console.log('\n🔨 UNDERSTATE Android Build Hazırlığı');
console.log(`   Production URL: ${PRODUCTION_URL}`);
console.log('');

if (fs.existsSync(WWW_DIR)) {
  fs.rmSync(WWW_DIR, { recursive: true });
  console.log('  ✓ Eski www/ silindi');
}
mkdirSafe(WWW_DIR);

// ── Copy & patch index.html ───────────────────────────────────────────────────
console.log('  → index.html kopyalanıyor ve patch ediliyor...');
let html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

// 1. Patch socket URL: inject production URL so app knows where to connect
const socketPatch = `
<script>
// Capacitor native app — force production server URL
window._UNDERSTATE_SERVER_URL = '${PRODUCTION_URL}';
window._UNDERSTATE_IS_NATIVE  = true;
</script>`;
html = html.replace('<head>', '<head>' + socketPatch);

// 2. Remove service worker registration (Capacitor handles this natively)
html = html.replace(/navigator\.serviceWorker\.register[^;]+;/, '// SW handled by Capacitor');

// 3. Patch Socket.IO to connect to production
html = html.replace(
  "io(window._US_SERVER_URL || ''",
  "io(window._UNDERSTATE_SERVER_URL || window._US_SERVER_URL || ''"
);
html = html.replace(
  "io('', {",
  `io(window._UNDERSTATE_SERVER_URL || '', {`
);

fs.writeFileSync(path.join(WWW_DIR, 'index.html'), html);
console.log('  ✓ index.html hazırlandı');

// ── Copy static assets ────────────────────────────────────────────────────────
const COPY_DIRS = ['css', 'js', 'src', 'public', 'assets', 'audio', 'img', 'fonts'];
for (const dir of COPY_DIRS) {
  const src = path.join(__dirname, '..', dir);
  if (fs.existsSync(src)) {
    copyDir(src, path.join(WWW_DIR, dir));
    console.log(`  ✓ ${dir}/ kopyalandı`);
  }
}

// ── Copy root static files ────────────────────────────────────────────────────
const ROOT_FILES = ['manifest.json', 'service-worker.js', 'favicon.ico'];
const ICON_FILES = fs.readdirSync(path.join(__dirname, '..')).filter(f => f.match(/^icon-\d+\.png$/));
for (const f of [...ROOT_FILES, ...ICON_FILES]) {
  const src = path.join(__dirname, '..', f);
  if (fs.existsSync(src)) {
    copyFile(src, path.join(WWW_DIR, f));
  }
}
console.log(`  ✓ Statik dosyalar kopyalandı (${ROOT_FILES.length + ICON_FILES.length} dosya)`);

// ── Create Capacitor init script ──────────────────────────────────────────────
const capInit = `
// Capacitor Bridge
import { AdMob } from '@capacitor-community/admob';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

export async function initCapacitor() {
  // Status bar
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0A1628' });
  } catch {}

  // AdMob
  try {
    await AdMob.initialize({
      appId:              'ca-app-pub-7362104594733603~3744323984',
      initializeForTesting: false,
    });
    window._UsAd._nativeReady = true;
    console.log('[Capacitor] AdMob initialized');
  } catch (e) {
    console.warn('[Capacitor] AdMob init failed:', e);
  }

  // Hide splash after load
  await SplashScreen.hide({ fadeOutDuration: 500 });

  // Handle back button
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });
}
`;
fs.writeFileSync(path.join(WWW_DIR, 'capacitor-init.js'), capInit);

// ── Summary ───────────────────────────────────────────────────────────────────
const files = countFiles(WWW_DIR);
console.log('');
console.log(`✅ www/ hazırlandı: ${files} dosya`);
console.log('');
console.log('Sonraki adımlar:');
console.log('  1. npx cap sync android');
console.log('  2. npx cap open android');
console.log('  3. Android Studio → Build → Generate Signed APK/Bundle');
console.log('');

function countFiles(dir) {
  let count = 0;
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    count += fs.statSync(p).isDirectory() ? countFiles(p) : 1;
  }
  return count;
}
