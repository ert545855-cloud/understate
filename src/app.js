"use strict";
const {
  useState, useEffect, useRef, useCallback, useMemo, useReducer,
  createContext, useContext, Fragment
} = React;

// ═══════════════════════════════════════════════════════
// SVG ICON COMPONENT
// ═══════════════════════════════════════════════════════
const _ICON_MAP = {
  money:            'assets/icons/money.svg',
  bank:             'assets/icons/bank.svg',
  government:       'assets/icons/government.svg',
  user:             'assets/icons/user.svg',
  briefcase:        'assets/icons/briefcase.svg',
  settings:         'assets/icons/settings.svg',
  crown:            'assets/icons/crown.svg',
  vote:             'assets/icons/vote.svg',
  law:              'assets/icons/law.svg',
  chart:            'assets/icons/chart.svg',
  weapon:           'assets/icons/weapon.svg',
  map:              'assets/icons/map.svg',
  education:        'assets/icons/education.svg',
  truck:            'assets/icons/truck.svg',
  factory:          'assets/icons/factory.svg',
  'job-trash':      'assets/icons/jobs/trash.svg',
  'job-chef':       'assets/icons/jobs/chef.svg',
  'job-porter':     'assets/icons/jobs/porter.svg',
  'job-warehouse':  'assets/icons/jobs/warehouse.svg',
  'job-miner':      'assets/icons/jobs/miner.svg',
  'job-engineer':   'assets/icons/jobs/engineer.svg',
  'job-doctor':     'assets/icons/jobs/doctor.svg',
  'job-programmer': 'assets/icons/jobs/programmer.svg',
  'job-pilot':      'assets/icons/jobs/pilot.svg',
};
function SvgIcon({ name, size=24, style={} }) {
  const src = _ICON_MAP[name];
  if (!src) return null;
  return React.createElement('img', { src, alt:name, width:size, height:size, style:{display:'inline-block',flexShrink:0,...style} });
}

// ═══════════════════════════════════════════════════════
// SABITLER
// ═══════════════════════════════════════════════════════
const GAME_ID = "understate_main_server";
const APP_V   = "8.0";

const CITIES = ['Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın','Balıkesir','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Isparta','Mersin','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir','Niğde','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Şanlıurfa','Uşak','Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman','Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce'];

// ── Çok Dilli Destek (TR / EN / DE / AZ) ────────────────
const TRANSLATIONS = {
  tr: {
    home:'Ana Sayfa', economy:'Ekonomi', battle:'Savaş', state:'Devlet', social:'Sosyal',
    jobs:'İşler', general:'Genel', market:'Market', companies:'Şirketler', factory:'Fabrika',
    mining:'Maden', education:'Eğitim', tasks:'Görevler', farm:'Tarım', livestock:'Hayvancılık',
    army:'Ordu', fight:'Dövüş', gang:'Çete', intelligence:'İstihbarat', tournament:'Turnuva',
    crisis:'Kriz', court:'Mahkeme', politics:'Siyaset', governance:'Yönetim',
    municipality:'Belediye', construction:'İnşaat', map:'Harita', alliance:'İttifak',
    world:'Dünya', npc:'NPC', wiki:'Wiki',
    chat:'Sohbet', clan:'Klan', messages:'Mesaj', players:'Oyuncular',
    newsfeed:'Sosyal', newspaper:'Gazete', football:'Futbol', casino:'Kumarhane',
    announcements:'Duyurular', leaderboard:'Sıralama', achievements:'Başarılar',
    money:'PARA', uc:'UC', send:'Gönder', buy:'Satın Al', sell:'Sat',
    upgrade:'Geliştir', collect:'Topla', feed:'Besle', profile:'Profil',
    settings:'Ayarlar', logout:'Çıkış', language:'Dil',
    barn:'Ahır', capacity:'Kapasite', level:'Seviye', barnFull:'Ahır dolu!',
    messageSend:'Mesaj Gönder', viewProfile:'Profili Gör',
    authorities:'Yetkilerim', events:'Olaylar', war:'Savaş', premium:'Premium',
    admin:'Admin', pvp:'Dövüş', spy:'İstihbarat', daily:'Görevler',
    store:'Market', leaderbd:'Sıralama',
    // Common button texts
    close:'Kapat', save:'Kaydet', cancel:'İptal', confirm:'Onayla', back:'Geri',
    next:'İleri', search:'Ara', filter:'Filtrele', refresh:'Yenile', submit:'Gönder',
    login:'Giriş Yap', register:'Kayıt Ol', invite:'Davet Et', join:'Katıl', leave:'Ayrıl',
    create:'Oluştur', edit:'Düzenle', delete:'Sil', share:'Paylaş', report:'Şikayet Et',
    vote:'Oy Ver', donate:'Bağış Yap', collect2:'Topla', harvest:'Hasat',
    plant:'Ek', water:'Sula', upgrade2:'Yükselt', attack:'Saldır', defend:'Savun',
    trade:'Ticaret', produce:'Üret', train:'Eğit', recruit:'İşe Al',
    accept:'Kabul Et', reject:'Reddet', apply:'Başvur', manage:'Yönet',
    transfer:'Transfer', withdraw:'Çek', deposit:'Yatır',
    online:'Çevrimiçi', offline:'Çevrimdışı', loading:'Yükleniyor...',
    noData:'Veri yok', empty:'Boş',
  },
  en: {
    home:'Home', economy:'Economy', battle:'Battle', state:'State', social:'Social',
    jobs:'Jobs', general:'General', market:'Market', companies:'Companies', factory:'Factory',
    mining:'Mining', education:'Education', tasks:'Tasks', farm:'Farming', livestock:'Livestock',
    army:'Army', fight:'Fight', gang:'Gang', intelligence:'Intel', tournament:'Tournament',
    crisis:'Crisis', court:'Court', politics:'Politics', governance:'Governance',
    municipality:'Municipality', construction:'Construction', map:'Map', alliance:'Alliance',
    world:'World', npc:'NPC', wiki:'Wiki',
    chat:'Chat', clan:'Clan', messages:'Messages', players:'Players',
    newsfeed:'Social', newspaper:'News', football:'Football', casino:'Casino',
    announcements:'News', leaderboard:'Leaderboard', achievements:'Achievements',
    money:'MONEY', uc:'UC', send:'Send', buy:'Buy', sell:'Sell',
    upgrade:'Upgrade', collect:'Collect', feed:'Feed', profile:'Profile',
    settings:'Settings', logout:'Logout', language:'Language',
    barn:'Barn', capacity:'Capacity', level:'Level', barnFull:'Barn is full!',
    messageSend:'Send Message', viewProfile:'View Profile',
    authorities:'Authorities', events:'Events', war:'War', premium:'Premium',
    admin:'Admin', pvp:'Fight', spy:'Intel', daily:'Tasks',
    store:'Store', leaderbd:'Ranking',
    close:'Close', save:'Save', cancel:'Cancel', confirm:'Confirm', back:'Back',
    next:'Next', search:'Search', filter:'Filter', refresh:'Refresh', submit:'Submit',
    login:'Login', register:'Register', invite:'Invite', join:'Join', leave:'Leave',
    create:'Create', edit:'Edit', delete:'Delete', share:'Share', report:'Report',
    vote:'Vote', donate:'Donate', collect2:'Collect', harvest:'Harvest',
    plant:'Plant', water:'Water', upgrade2:'Upgrade', attack:'Attack', defend:'Defend',
    trade:'Trade', produce:'Produce', train:'Train', recruit:'Recruit',
    accept:'Accept', reject:'Reject', apply:'Apply', manage:'Manage',
    transfer:'Transfer', withdraw:'Withdraw', deposit:'Deposit',
    online:'Online', offline:'Offline', loading:'Loading...',
    noData:'No data', empty:'Empty',
  },
  de: {
    home:'Startseite', economy:'Wirtschaft', battle:'Kampf', state:'Staat', social:'Sozial',
    jobs:'Jobs', general:'Allgemein', market:'Markt', companies:'Firmen', factory:'Fabrik',
    mining:'Bergbau', education:'Bildung', tasks:'Aufgaben', farm:'Landwirtschaft', livestock:'Vieh',
    army:'Armee', fight:'Kampf', gang:'Gang', intelligence:'Geheimdienst', tournament:'Turnier',
    crisis:'Krise', court:'Gericht', politics:'Politik', governance:'Verwaltung',
    municipality:'Gemeinde', construction:'Bau', map:'Karte', alliance:'Allianz',
    world:'Welt', npc:'NPC', wiki:'Wiki',
    chat:'Chat', clan:'Clan', messages:'Nachrichten', players:'Spieler',
    newsfeed:'Sozial', newspaper:'Zeitung', football:'Fußball', casino:'Casino',
    announcements:'Ankündigungen', leaderboard:'Rangliste', achievements:'Erfolge',
    money:'GELD', uc:'UC', send:'Senden', buy:'Kaufen', sell:'Verkaufen',
    upgrade:'Verbessern', collect:'Sammeln', feed:'Füttern', profile:'Profil',
    settings:'Einstellungen', logout:'Abmelden', language:'Sprache',
    barn:'Stall', capacity:'Kapazität', level:'Stufe', barnFull:'Stall voll!',
    messageSend:'Nachricht senden', viewProfile:'Profil ansehen',
    authorities:'Befugnisse', events:'Ereignisse', war:'Krieg', premium:'Premium',
    admin:'Admin', pvp:'Kampf', spy:'Geheimdienst', daily:'Aufgaben',
    store:'Laden', leaderbd:'Rangliste',
    close:'Schließen', save:'Speichern', cancel:'Abbrechen', confirm:'Bestätigen', back:'Zurück',
    next:'Weiter', search:'Suchen', filter:'Filtern', refresh:'Aktualisieren', submit:'Absenden',
    login:'Anmelden', register:'Registrieren', invite:'Einladen', join:'Beitreten', leave:'Verlassen',
    create:'Erstellen', edit:'Bearbeiten', delete:'Löschen', share:'Teilen', report:'Melden',
    vote:'Abstimmen', donate:'Spenden', collect2:'Sammeln', harvest:'Ernten',
    plant:'Pflanzen', water:'Gießen', upgrade2:'Verbessern', attack:'Angreifen', defend:'Verteidigen',
    trade:'Handeln', produce:'Produzieren', train:'Trainieren', recruit:'Rekrutieren',
    accept:'Annehmen', reject:'Ablehnen', apply:'Bewerben', manage:'Verwalten',
    transfer:'Überweisen', withdraw:'Abheben', deposit:'Einzahlen',
    online:'Online', offline:'Offline', loading:'Laden...',
    noData:'Keine Daten', empty:'Leer',
  },
  az: {
    home:'Ana Səhifə', economy:'İqtisadiyyat', battle:'Müharibə', state:'Dövlət', social:'Sosial',
    jobs:'İşlər', general:'Ümumi', market:'Bazar', companies:'Şirkətlər', factory:'Zavod',
    mining:'Mədən', education:'Təhsil', tasks:'Tapşırıqlar', farm:'Əkinçilik', livestock:'Heyvandarlıq',
    army:'Ordu', fight:'Döyüş', gang:'Dəstə', intelligence:'Kəşfiyyat', tournament:'Turnir',
    crisis:'Böhran', court:'Məhkəmə', politics:'Siyasət', governance:'İdarəetmə',
    municipality:'Bələdiyyə', construction:'İnşaat', map:'Xəritə', alliance:'İttifaq',
    world:'Dünya', npc:'NPC', wiki:'Vikipediya',
    chat:'Söhbət', clan:'Klan', messages:'Mesaj', players:'Oyunçular',
    newsfeed:'Sosial', newspaper:'Qəzet', football:'Futbol', casino:'Kazino',
    announcements:'Elanlar', leaderboard:'Liderlik', achievements:'Nailiyyətlər',
    money:'PUL', uc:'UC', send:'Göndər', buy:'Al', sell:'Sat',
    upgrade:'Yüksəlt', collect:'Topla', feed:'Yem ver', profile:'Profil',
    settings:'Parametrlər', logout:'Çıxış', language:'Dil',
    barn:'Tövlə', capacity:'Tutum', level:'Səviyyə', barnFull:'Tövlə doludur!',
    messageSend:'Mesaj Göndər', viewProfile:'Profili Gör',
    authorities:'Səlahiyyətlər', events:'Hadisələr', war:'Müharibə', premium:'Premium',
    admin:'Admin', pvp:'Döyüş', spy:'Kəşfiyyat', daily:'Tapşırıqlar',
    store:'Mağaza', leaderbd:'Liderlik',
    close:'Bağla', save:'Saxla', cancel:'Ləğv et', confirm:'Təsdiq et', back:'Geri',
    next:'İrəli', search:'Axtar', filter:'Filtrlə', refresh:'Yenilə', submit:'Göndər',
    login:'Daxil ol', register:'Qeydiyyat', invite:'Dəvət et', join:'Qoşul', leave:'Ayrıl',
    create:'Yarat', edit:'Düzəlt', delete:'Sil', share:'Paylaş', report:'Şikayet et',
    vote:'Səs ver', donate:'Bağış et', collect2:'Topla', harvest:'Məhsul götür',
    plant:'Ək', water:'Sula', upgrade2:'Yüksəlt', attack:'Hücum et', defend:'Müdafiə et',
    trade:'Ticarət', produce:'İstehsal et', train:'Hazırla', recruit:'İşə al',
    accept:'Qəbul et', reject:'Rədd et', apply:'Müraciət et', manage:'İdarə et',
    transfer:'Köçür', withdraw:'Çək', deposit:'Yatır',
    online:'Onlayn', offline:'Oflayn', loading:'Yüklənir...',
    noData:'Məlumat yoxdur', empty:'Boş',
  },
};
const LangCtx = createContext('tr');
function useLang() { return useContext(LangCtx); }
function useT() { const lang = useLang(); return (key) => (TRANSLATIONS[lang]||TRANSLATIONS.tr)[key] || (TRANSLATIONS.tr)[key] || key; }

// Mapping from nav item id → TRANSLATIONS key
const NAV_ITEM_TKEYS = {
  jobs:'jobs', economy:'general', farm:'farm', livestock:'livestock',
  market:'market', holdings:'companies', factory:'factory', mining:'mining',
  education:'education', daily:'tasks', army:'army', pvp:'fight', gang:'gang',
  spy:'intelligence', tournament:'tournament', crisis:'crisis', crime:'court',
  politics:'politics', yetkilerim:'authorities', election_events:'events', teamwar:'war',
  citygov:'governance', taxgov:'municipality', citybuild:'construction', map:'map',
  alliance:'alliance', world:'world', npcplayers:'npc', wiki:'wiki', chat:'chat',
  klanchat:'clan', dm:'messages', players:'players', social:'newsfeed',
  newspaper:'newspaper', football:'football', casino:'casino', duyurular:'announcements',
  leaderboard:'leaderboard', achievements:'achievements', premium:'premium',
  home:'home', admin:'admin',
};

const LEVELS = [
  {lvl:1,xp:0,title:'Yeni Vatandaş',icon:'🆕'},
  {lvl:2,xp:150,title:'Vatandaş',icon:'👤'},
  {lvl:3,xp:400,title:'Aktif Vatandaş',icon:'🧑'},
  {lvl:5,xp:1000,title:'Tanınan Kişi',icon:'⭐'},
  {lvl:10,xp:4000,title:'Etkin Üye',icon:'🌟'},
  {lvl:20,xp:15000,title:'Toplum Önderi',icon:'💫'},
  {lvl:30,xp:40000,title:'Güç Sahibi',icon:'👑'},
  {lvl:50,xp:120000,title:'Efsanevi',icon:'🔱'},
  {lvl:99,xp:500000,title:'Tanrısal',icon:'⚡'},
];

function getLevelInfo(xp=0) {
  let cur = LEVELS[0];
  let nxt = LEVELS[1];
  for (let i=0; i<LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) { cur = LEVELS[i]; nxt = LEVELS[i+1] || LEVELS[i]; }
  }
  const pct = nxt.xp > cur.xp ? Math.min(100, Math.round((xp - cur.xp)/(nxt.xp - cur.xp)*100)) : 100;
  return { ...cur, next: nxt, pct };
}

// ═══════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ─── Dark Mode Context ────────────────────────────────
const ThemeCtx = createContext({ dark: false, toggle: ()=>{} });
const useTheme = () => useContext(ThemeCtx);

// ═══════════════════════════════════════════════════════
// YARDIMCI
// ═══════════════════════════════════════════════════════
const fmt    = (n) => Number(n||0).toLocaleString('tr-TR');
const fmtWord = (n) => {
  n = Math.floor(n || 0);
  if (n < 0) return `-${fmtWord(-n)}`;
  if (n >= 1e15) return `₺${(n/1e15).toFixed(1)}Kt`;
  if (n >= 1e12) return `₺${(n/1e12).toFixed(1)}Tr`;
  if (n >= 1e9)  return `₺${(n/1e9).toFixed(1)}Mr`;
  if (n >= 1e6)  return `₺${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3)  return `₺${(n/1e3).toFixed(0)}Bin`;
  return `₺${fmt(n)}`;
};
const fmtM   = fmtWord;
const fmtUC  = (n) => `${fmt(n||0)} UC`;
const cls    = (...a) => a.filter(Boolean).join(' ');

// ─── Map / Territory helpers ───────────────────────────────────────────────
const getCentroid = (pts) => {
  const pairs = pts.split(' ').map(p => p.split(',').map(Number));
  const n = pairs.length;
  return { x: pairs.reduce((s,p)=>s+p[0],0)/n, y: pairs.reduce((s,p)=>s+p[1],0)/n };
};
const DEFAULT_DISTRICTS = [
  {id:'d1',  name:'Kuzey Park',    controlBy:'Halk',      controlColor:'#6B7280', crime:28, support:76, alarm:22, income:52000,  influence:65, population:42000, legalIncome:48000, illegalIncome:4000,  conflicts:[]},
  {id:'d2',  name:'Üniversite',    controlBy:'Aydınlar',  controlColor:'#3B82F6', crime:18, support:88, alarm:14, income:55000,  influence:90, population:38000, legalIncome:50000, illegalIncome:5000,  conflicts:[]},
  {id:'d3',  name:'Askeri Üs',     controlBy:'Ordu',      controlColor:'#EF4444', crime:10, support:62, alarm:88, income:48000,  influence:95, population:8000,  legalIncome:48000, illegalIncome:0,     conflicts:['police']},
  {id:'d4',  name:'Sanayi',        controlBy:'Şirketler', controlColor:'#10B981', crime:52, support:55, alarm:40, income:95000,  influence:58, population:30000, legalIncome:72000, illegalIncome:23000, conflicts:[]},
  {id:'d5',  name:'Tarihi Merkez', controlBy:'Tüccarlar', controlColor:'#EAB308', crime:42, support:72, alarm:35, income:85000,  influence:80, population:45000, legalIncome:65000, illegalIncome:20000, conflicts:[]},
  {id:'d6',  name:'Liman',         controlBy:'Halk',      controlColor:'#06B6D4', crime:65, support:48, alarm:55, income:120000, influence:62, population:35000, legalIncome:80000, illegalIncome:40000, conflicts:['cartel']},
  {id:'d7',  name:'Gecekondular',  controlBy:'Asi Grup',  controlColor:'#F59E0B', crime:80, support:35, alarm:72, income:38000,  influence:52, population:68000, legalIncome:22000, illegalIncome:16000, conflicts:['riot','cartel']},
  {id:'d8',  name:'İş Merkezi',    controlBy:'Şirketler', controlColor:'#10B981', crime:28, support:68, alarm:26, income:200000, influence:88, population:22000, legalIncome:185000,illegalIncome:15000, conflicts:[]},
  {id:'d9',  name:'Sahil',         controlBy:'Halk',      controlColor:'#06B6D4', crime:22, support:82, alarm:18, income:90000,  influence:74, population:35000, legalIncome:82000, illegalIncome:8000,  conflicts:[]},
  {id:'d10', name:'Banliyö',       controlBy:'Halk',      controlColor:'#6B7280', crime:38, support:70, alarm:32, income:48000,  influence:45, population:58000, legalIncome:42000, illegalIncome:6000,  conflicts:[]},
  {id:'d11', name:'Çarşı',         controlBy:'Tüccarlar', controlColor:'#EAB308', crime:48, support:64, alarm:45, income:78000,  influence:68, population:42000, legalIncome:62000, illegalIncome:16000, conflicts:[]},
  {id:'d12', name:'Güney Kent',    controlBy:'Halk',      controlColor:'#6B7280', crime:44, support:68, alarm:38, income:58000,  influence:50, population:52000, legalIncome:50000, illegalIncome:8000,  conflicts:[]},
];
const DISTRICT_POLYGONS = {
  d1:  '0,0 125,0 138,88 68,108 0,86',
  d2:  '125,0 258,0 270,82 192,106 138,88',
  d3:  '258,0 360,0 360,95 308,108 270,82',
  d4:  '0,86 68,108 78,208 22,230 0,210',
  d5:  '68,108 138,88 192,106 270,82 282,190 210,218 132,212 78,208',
  d6:  '270,82 308,108 360,95 360,205 326,220 282,205 282,190',
  d7:  '0,210 22,230 32,342 0,480',
  d8:  '22,230 78,208 132,212 210,218 220,332 148,348 78,340 32,342',
  d9:  '282,190 326,220 360,205 360,342 322,355 222,334 220,332',
  d10: '32,342 78,340 88,448 35,480 0,480',
  d11: '78,340 148,348 220,332 222,334 322,355 325,465 222,480 78,480 88,448',
  d12: '322,355 360,342 360,480 325,480 325,465',
};
const genId  = () => Math.random().toString(36).slice(2,10);
const sleep  = (ms) => new Promise(r => setTimeout(r, ms));
const timeAgo = (ts) => {
  if (!ts) return '';
  const d = Date.now() - ts;
  if (d < 60000)   return 'Az önce';
  if (d < 3600000) return `${Math.floor(d/60000)}dk önce`;
  if (d < 86400000)return `${Math.floor(d/3600000)}sa önce`;
  return `${Math.floor(d/86400000)}g önce`;
};

// ═══════════════════════════════════════════════════════
// FİREBASE HOOKS
// ═══════════════════════════════════════════════════════
function useLs(key, def) {
  const [s, set] = useState(() => {
    try { const v=localStorage.getItem('rep_'+key); return v ? JSON.parse(v) : def; }
    catch { return def; }
  });
  useEffect(() => {
    const h = (e) => {
      if (e.detail?.key===key && e.detail.value != null) set(e.detail.value);
    };
    window.addEventListener('fb-sync', h);
    return () => window.removeEventListener('fb-sync', h);
  }, [key]);
  const write = useCallback((val) => {
    set(prev => {
      const v = typeof val==='function' ? val(prev) : val;
      localStorage.setItem('rep_'+key, JSON.stringify(v));
      if (window._fbPendingWrites) {
        window._fbPendingWrites[key] = v;
        window._fbScheduleFlush?.(key);
      }
      return v;
    });
  }, [key]);
  return [s, write];
}

function useOnlineCount() {
  const [cnt, setCnt] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rep_onlineCount')||'0'); } catch{return 0;}
  });
  useEffect(() => {
    const h = (e) => setCnt(e.detail?.count || 0);
    window.addEventListener('presence-updated', h);
    const fb = (e) => { if(e.detail?.key==='onlineCount') setCnt(e.detail.value); };
    window.addEventListener('fb-sync', fb);
    return () => { window.removeEventListener('presence-updated', h); window.removeEventListener('fb-sync', fb); };
  }, []);
  return cnt;
}

// ═══════════════════════════════════════════════════════
// AUTH HELPERS (Firebase kaldırıldı — JWT tabanlı)
// ═══════════════════════════════════════════════════════
async function fbLogout() {
  // Eski Firebase auth kodu kaldırıldı — socket üzerinden logout
  try { window._socket?.emit('logout'); } catch {}
}

// ═══════════════════════════════════════════════════════
// AUTH EKRANI
// ═══════════════════════════════════════════════════════

function AuthField({ label, type='text', placeholder, value, onChange, suffix }) {
  return (
    <div style={{marginBottom:'1rem'}}>
      <div style={{fontSize:'0.72rem',color:'#5A7089',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.4rem',fontWeight:700}}>{label}</div>
      <div style={{display:'flex',alignItems:'center',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',overflow:'hidden',transition:'all 0.2s'}}>
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          autoComplete={type==='password'?'current-password':type==='email'?'email':'username'}
          style={{flex:1,background:'none',border:'none',outline:'none',padding:'0.75rem 1rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px'}} />
        {suffix && <div style={{paddingRight:'0.75rem'}}>{suffix}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ORTAK BİLEŞENLER
// ═══════════════════════════════════════════════════════
function Modal({ title, onClose, children, maxW=440 }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(6px)',padding:'0'}}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{background:'rgba(10,18,36,0.99)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'20px 20px 0 0',padding:'1.5rem',width:'100%',maxWidth:maxW,maxHeight:'90dvh',overflowY:'auto',animation:'slideUp 0.25s ease'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.05rem',fontWeight:800,color:'#3B82F6',textTransform:'uppercase',letterSpacing:'0.06em'}}>{title}</div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'#5A7089',borderRadius:'8px',padding:'0.3rem 0.6rem',cursor:'pointer',fontSize:'1.1rem'}}>✕</button>
        </div>
        {children}
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

function Notif({ msg, type='info', onClose }) {
  useEffect(() => { const t=setTimeout(onClose,3500); return ()=>clearTimeout(t); }, []);
  const colors = { info:'#3B82F6', success:'#10B981', error:'#EF4444', gold:'#F59E0B' };
  const c = colors[type] || colors.info;
  return (
    <div style={{position:'fixed',bottom:'calc(70px + env(safe-area-inset-bottom, 0px))',left:'0.75rem',right:'0.75rem',background:'rgba(10,20,38,0.98)',border:`1px solid rgba(${c==='#3B82F6'?'59,130,246':c==='#10B981'?'16,185,129':c==='#EF4444'?'239,68,68':'245,158,11'},0.3)`,borderLeft:`3px solid ${c}`,borderRadius:'12px',padding:'0.75rem 1rem',zIndex:2000,fontSize:'0.85rem',fontWeight:600,color:'#E8EDF2',boxShadow:'0 8px 32px rgba(0,0,0,0.5)',backdropFilter:'blur(20px)',animation:'notifIn 0.25s ease',display:'flex',alignItems:'center',gap:'0.5rem'}}>
      <span>{msg}</span>
      <button onClick={onClose} style={{marginLeft:'auto',background:'none',border:'none',color:'#5A7089',cursor:'pointer',fontSize:'1rem'}}>✕</button>
      <style>{`@keyframes notifIn{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

function EmailVerifyBanner({ email, onDismiss }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      const token = localStorage.getItem('us_jwt') || '';
      const res = await fetch('/api/auth/resend-verify', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}
      });
      const d = await res.json();
      if (d.success) setSent(true);
    } catch {}
    setSending(false);
  };

  return (
    <div style={{background:'rgba(120,85,0,0.25)',borderBottom:'1px solid rgba(245,158,11,0.35)',padding:'0.55rem 0.9rem',display:'flex',alignItems:'center',gap:'0.5rem',flexShrink:0}}>
      <span style={{fontSize:'0.9rem',flexShrink:0}}>📧</span>
      <div style={{flex:1,minWidth:0}}>
        {sent
          ? <span style={{fontSize:'0.75rem',color:'#6EE7B7',fontWeight:600}}>Doğrulama maili gönderildi — gelen kutunu kontrol et!</span>
          : <span style={{fontSize:'0.75rem',color:'rgba(255,220,120,0.9)',fontWeight:500,lineHeight:1.3}}>
              <span style={{fontWeight:700,color:'#FCD34D'}}>{email}</span> adresin doğrulanmamış.{' '}
              <button onClick={resend} disabled={sending}
                style={{background:'none',border:'none',color:'#F59E0B',fontWeight:700,fontSize:'0.75rem',cursor:sending?'not-allowed':'pointer',padding:0,textDecoration:'underline',fontFamily:"'DM Sans',sans-serif"}}>
                {sending ? 'Gönderiliyor…' : 'Mail gönder →'}
              </button>
            </span>
        }
      </div>
      <button onClick={onDismiss}
        style={{background:'none',border:'none',color:'rgba(245,158,11,0.5)',fontSize:'1rem',cursor:'pointer',padding:'2px 4px',flexShrink:0,lineHeight:1}}>✕</button>
    </div>
  );
}

function Spinner({ size=20 }) {
  return <div style={{width:size,height:size,border:'2.5px solid rgba(59,130,246,0.2)',borderTopColor:'#3B82F6',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />;
}

function ProgressBar({ pct, color='#3B82F6', h=6 }) {
  return (
    <div style={{background:'rgba(0,0,0,0.08)',borderRadius:'100px',height:h,overflow:'hidden'}}>
      <div style={{height:'100%',width:`${Math.max(0,Math.min(100,pct))}%`,background:`linear-gradient(90deg,${color},${color}cc)`,borderRadius:'100px',transition:'width 0.5s ease'}} />
    </div>
  );
}

function Tag({ children, color='blue' }) {
  const map = { blue:'rgba(59,130,246,0.12) #60A5FA rgba(59,130,246,0.25)', green:'rgba(16,185,129,0.12) #10B981 rgba(16,185,129,0.25)', red:'rgba(239,68,68,0.12) #FCA5A5 rgba(239,68,68,0.25)', gold:'rgba(245,158,11,0.12) #F59E0B rgba(245,158,11,0.25)', gray:'rgba(255,255,255,0.06) #5A7089 rgba(255,255,255,0.1)', violet:'rgba(139,92,246,0.12) #A78BFA rgba(139,92,246,0.25)' };
  const [bg, tc, bc] = (map[color]||map.blue).split(' ');
  return <span style={{display:'inline-block',padding:'2px 8px',borderRadius:'6px',fontSize:'0.67rem',fontWeight:700,background:bg,color:tc,border:`1px solid ${bc}`}}>{children}</span>;
}

function Card({ children, style={}, onClick }) {
  const { dark } = useTheme();
  return <div style={{
    background: dark ? '#1E293B' : '#FFFFFF',
    border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)',
    borderRadius:'16px', padding:'1rem',
    boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.06)',
    ...style
  }} onClick={onClick}>{children}</div>;
}

const VIP_FRAMES = {
  rainbow: {border:'3px solid transparent',backgroundImage:'linear-gradient(#0B1527,#0B1527),linear-gradient(135deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',backgroundOrigin:'border-box',backgroundClip:'padding-box,border-box',animation:'vipRainbow 3s linear infinite'},
  fire:    {border:'3px solid transparent',backgroundImage:'linear-gradient(#0B1527,#0B1527),linear-gradient(135deg,#FF4500,#FF8C00,#FFD700)',backgroundOrigin:'border-box',backgroundClip:'padding-box,border-box',animation:'vipFire 1.5s ease-in-out infinite'},
  ice:     {border:'3px solid transparent',backgroundImage:'linear-gradient(#0B1527,#0B1527),linear-gradient(135deg,#00BFFF,#87CEEB,#E0FFFF)',backgroundOrigin:'border-box',backgroundClip:'padding-box,border-box',animation:'vipIce 2s ease-in-out infinite'},
  gold:    {border:'3px solid transparent',backgroundImage:'linear-gradient(#0B1527,#0B1527),linear-gradient(135deg,#FFD700,#FFA500,#FFD700)',backgroundOrigin:'border-box',backgroundClip:'padding-box,border-box',animation:'vipGold 2s ease-in-out infinite'},
  neon:    {border:'3px solid #00FF64',boxShadow:'0 0 8px #00FF64,0 0 16px rgba(0,255,100,0.4)',animation:'vipNeon 1.2s ease-in-out infinite'},
  violet:  {border:'3px solid transparent',backgroundImage:'linear-gradient(#0B1527,#0B1527),linear-gradient(135deg,#8B5CF6,#A78BFA,#7C3AED)',backgroundOrigin:'border-box',backgroundClip:'padding-box,border-box',animation:'vipViolet 2s ease-in-out infinite'},
  heart:   {border:'3px solid transparent',backgroundImage:'linear-gradient(#0B1527,#0B1527),linear-gradient(135deg,#EC4899,#F43F5E,#EC4899)',backgroundOrigin:'border-box',backgroundClip:'padding-box,border-box',animation:'vipHeart 1.5s ease-in-out infinite'},
};

function Avatar({ profile, size=40 }) {
  if (!profile) return <div style={{width:size,height:size,borderRadius:'50%',background:'rgba(59,130,246,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.45,flexShrink:0}}>👤</div>;
  const icon = profile.gender==='female' ? '👩' : '👨';
  const photoSrc = profile.avatarUrl || profile.photoUrl || profile.avatar || null;
  const frameStyle = profile.premium && profile.vipFrame ? (VIP_FRAMES[profile.vipFrame]||{}) : {};
  const borderDefault = profile.premium ? '2px solid rgba(245,158,11,0.5)' : '2px solid rgba(59,130,246,0.3)';
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:'linear-gradient(135deg,#1a3a5c,#0a1a2e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.45,border:borderDefault,flexShrink:0,overflow:'hidden',position:'relative',...frameStyle}}>
      {photoSrc ? <img src={photoSrc} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none';}} /> : icon}
    </div>
  );
}

function Btn({ children, onClick, variant='primary', size='md', disabled=false, style={} }) {
  const [hov, setHov]     = useState(false);
  const [press, setPress] = useState(false);

  const active = press && !disabled;
  const hover  = hov   && !disabled && !press;

  const base = {
    borderRadius:'8px', fontFamily:"'DM Sans',sans-serif", fontWeight:700,
    cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.45:1,
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    gap:'0.35rem', letterSpacing:'0.03em', userSelect:'none', WebkitUserSelect:'none',
    WebkitTapHighlightColor:'transparent', border:'none',
    position:'relative', overflow:'hidden',
    transform: active ? 'scale(0.94)' : hover ? 'translateY(-2px)' : 'none',
    transition: active ? 'transform 0.06s ease,filter 0.06s ease,box-shadow 0.1s ease'
                       : 'transform 0.15s ease,filter 0.15s ease,box-shadow 0.18s ease,background 0.18s ease',
    filter: active ? 'brightness(0.86)' : hover ? 'brightness(1.1)' : 'none',
  };

  const vars = {
    primary: {
      background:'#D00000', color:'#fff',
      boxShadow: active ? '0 1px 6px rgba(208,0,0,0.25)'
                : hover  ? '0 8px 28px rgba(208,0,0,0.55)'
                         : '0 4px 16px rgba(208,0,0,0.35)',
    },
    secondary: {
      background: hover ? 'rgba(0,201,255,0.18)' : 'rgba(0,201,255,0.08)',
      color:'#00C9FF', border:'1.5px solid #00C9FF',
      boxShadow: hover ? '0 4px 18px rgba(0,201,255,0.3)' : 'none',
    },
    ghost: {
      background: hover ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
      color: hover ? '#E2E8F0' : '#94A3B8',
      border:`1px solid ${hover?'rgba(255,255,255,0.25)':'rgba(255,255,255,0.1)'}`,
    },
    gold: {
      background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'#0F172A',
      boxShadow: active ? '0 1px 6px rgba(245,158,11,0.2)'
                : hover  ? '0 7px 22px rgba(245,158,11,0.5)'
                         : '0 3px 12px rgba(245,158,11,0.3)',
    },
    green: {
      background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff',
      boxShadow: active ? '0 1px 6px rgba(16,185,129,0.2)'
                : hover  ? '0 7px 22px rgba(16,185,129,0.5)'
                         : '0 3px 12px rgba(16,185,129,0.3)',
    },
    red: {
      background:'linear-gradient(135deg,#EF4444,#DC2626)', color:'#fff',
      boxShadow: active ? '0 1px 6px rgba(239,68,68,0.2)'
                : hover  ? '0 7px 22px rgba(239,68,68,0.5)'
                         : '0 3px 12px rgba(239,68,68,0.3)',
    },
    danger: {
      background: hover ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
      color:'#FCA5A5',
      border:`1px solid ${hover?'rgba(239,68,68,0.4)':'rgba(239,68,68,0.2)'}`,
    },
  };

  const sizes = {
    sm:   {padding:'0.32rem 0.75rem', fontSize:'0.75rem', minHeight:'30px'},
    md:   {padding:'0.62rem 1.2rem',  fontSize:'0.87rem', minHeight:'38px'},
    lg:   {padding:'0.85rem 1.5rem',  fontSize:'1rem',    minHeight:'46px'},
    full: {padding:'0.68rem 1rem',    fontSize:'0.87rem', width:'100%', minHeight:'42px'},
  };

  return (
    <button
      style={{...base,...(vars[variant]||vars.primary),...(sizes[size]||sizes.md),...style}}
      onClick={disabled?undefined:onClick}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>{setHov(false);setPress(false);}}
      onMouseDown={()=>!disabled&&setPress(true)}
      onMouseUp={()=>setPress(false)}
      onTouchStart={()=>!disabled&&setPress(true)}
      onTouchEnd={()=>setPress(false)}
    >
      {children}
    </button>
  );
}

// Header ve BottomNav → src/components/Header.js ve BottomNav.js dosyalarına taşındı

// ═══════════════════════════════════════════════════════
// SKOR HESAPLAMA
// ═══════════════════════════════════════════════════════
function calcScore(p) {
  if (!p) return 0;
  const EDU_BONUS = { ilkokul:0, ortaokul:500, lise:2000, universite:10000, yukseklisans:30000, doktora:80000, profesor:200000 };
  const diploma = p.education?.diploma || p.educationLevel || 'ilkokul';
  return Math.floor(
    (p.level || 1) * 1000 +
    (p.xp || 0) * 0.5 +
    (p.money || 0) * 0.001 +
    (p.bankMoney || p.bank || 0) * 0.001 +
    (p.meritPoints || 0) * 50 +
    (p.loyaltyPoints || 0) * 10 +
    (EDU_BONUS[diploma] || 0)
  );
}

// ═══════════════════════════════════════════════════════
// ANA SAYFA — PLATFORM DESIGN
// ═══════════════════════════════════════════════════════

function App() {
  const [profile, setProfile_raw] = useState(() => {
    try { const s=localStorage.getItem('rep_userProfile'); return s?JSON.parse(s):null; } catch{return null;}
  });
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('rep_userProfile'));
  const [page, setPage] = useState('home');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem('us_theme') === 'dark');
  const toggleDark = () => setDark(d => { const next=!d; localStorage.setItem('us_theme',next?'dark':'light'); return next; });
  const [uiLang, setUiLang] = useState(() => localStorage.getItem('rep_uiLang') || 'tr');
  useEffect(() => {
    const onLangChange = (e) => { if (e.detail?.lang) setUiLang(e.detail.lang); };
    window.addEventListener('lang-change', onLangChange);
    return () => window.removeEventListener('lang-change', onLangChange);
  }, []);
  useEffect(() => { document.body.classList.toggle('us-dark', dark); }, [dark]);
  useEffect(() => { document.body.classList.toggle('us-dark', dark); }, []);

  // ── Game events state ──────────────────────────────────────────────────────
  const [gameEvents, setGameEvents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rep_gameEvents')||'[]'); } catch { return []; }
  });

  // Listen to game-event window events (fired by socket listener or local actions)
  useEffect(() => {
    const onEvt = (e) => {
      if (!e.detail) return;
      setGameEvents(prev => {
        const next = [...prev, e.detail].slice(-50);
        try { localStorage.setItem('rep_gameEvents', JSON.stringify(next)); } catch {}
        return next;
      });
    };
    window.addEventListener('game-event', onEvt);
    return () => window.removeEventListener('game-event', onEvt);
  }, []);

  // pushGameEvent — emits to server AND stores locally
  const pushGameEvent = useCallback((type, title, desc='', icon='📢', category='genel') => {
    const evt = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      type, title, desc, icon, category,
      ts: Date.now(),
    };
    // Fire window event (updates local state + localStorage)
    window.dispatchEvent(new CustomEvent('game-event', { detail: evt }));
    // Broadcast to all players via Socket.IO
    try { if (window._socket?.connected) window._socket.emit('emitGameEvent', evt); } catch {}
  }, []);

  // Expose globally so all screens/components can call it without prop-drilling
  useEffect(() => { window._pushGameEvent = pushGameEvent; }, [pushGameEvent]);

  // ── Heartbeat — her 15 saniyede sunucuya ping at ──────────────────────────
  useEffect(() => {
    if (!authed) return;
    // window._socketUser güncel profille senkron tut
    if (profile) window._socketUser = profile;

    const sendBeat = () => {
      try {
        if (window._socket?.connected && profile) {
          window._socket.emit('heartbeat', {
            level: profile.level || 1,
            party: profile.party || null,
            gang:  profile.gang  || null,
            city:  profile.city  || '',
          });
        }
      } catch(e) {}
    };

    sendBeat(); // hemen bir tane gönder
    const interval = setInterval(sendBeat, 15000);

    // Sekme tekrar aktif olunca anında ping at
    const onVisible = () => { if (document.visibilityState === 'visible') sendBeat(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [authed, profile?.id, profile?.level, profile?.party, profile?.gang, profile?.city]);

  // Wrapper to also sync to Firebase
  const setProfile = useCallback((val) => {
    setProfile_raw(prev => {
      const newP = typeof val==='function' ? val(prev) : val;
      if (newP && newP.uid) {
        if (window._fbPendingWrites) {
          window._fbPendingWrites['userProfile'] = newP;
          window._fbScheduleFlush?.('userProfile');
        }
      }
      return newP;
    });
  }, []);

  // ── Otomatik Skor Hesaplama ──────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const newScore = calcScore(profile);
    if (newScore !== profile.score) {
      setProfile_raw(prev => prev ? { ...prev, score: newScore } : prev);
    }
  }, [profile?.level, profile?.xp, profile?.money, profile?.bankMoney, profile?.meritPoints, profile?.loyaltyPoints, profile?.education?.diploma, profile?.educationLevel]);

  // JWT tabanlı oturum yenileme — sayfa yüklendiğinde token geçerliyse profili yükle
  useEffect(() => {
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt || authed) return;
    fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + jwt } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.profile) {
          setProfile_raw(d.profile);
          setAuthed(true);
          localStorage.setItem('rep_userProfile', JSON.stringify(d.profile));
          window._setupSocket?.(d.profile);
        }
      })
      .catch(() => {});
  }, []);

  // Sync profile from firebase events
  useEffect(() => {
    const h = (e) => {
      if (e.detail?.key === 'userProfile') {
        setProfile_raw(e.detail.value);
      }
    };
    window.addEventListener('fb-sync', h);
    return () => window.removeEventListener('fb-sync', h);
  }, []);

  // ── Auto-save: sync game state to PostgreSQL every 30 seconds ──────────────
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    const doAutoSave = async () => {
      if (cancelled) return;
      try {
        const jwt = localStorage.getItem('us_jwt');
        if (!jwt) return;
        const p = profile;
        if (!p || !p.id) return;
        const payload = {
          money:             typeof p.money          === 'number' ? p.money          : 0,
          bank:              typeof p.bankMoney      === 'number' ? p.bankMoney      : (typeof p.bank === 'number' ? p.bank : 0),
          level:             typeof p.level          === 'number' ? p.level          : 1,
          xp:                typeof p.xp             === 'number' ? p.xp             : 0,
          score:             calcScore(p),
          creditScore:       typeof p.creditScore    === 'number' ? p.creditScore    : 500,
          meritPoints:       typeof p.meritPoints    === 'number' ? p.meritPoints    : 0,
          loyaltyPoints:     typeof p.loyaltyPoints  === 'number' ? p.loyaltyPoints  : 0,
          city:              p.city                 || 'İstanbul',
          under_coin:        typeof p.underCoin      === 'number' ? p.underCoin      : 0,
          health:            typeof p.hp             === 'number' ? p.hp             : 100,
          positionTag:       p.positionTag           || p.position || '',
          educationLevel:    p.education?.diploma    || p.educationLevel || 'ilkokul',
          educationProgress: typeof p.educationProgress === 'number' ? p.educationProgress : 0,
          inventory:         p.inventory            || {},
          game_data:         { ...(p.gameData || {}), education: p.education || {}, stats: p.stats || {}, achievements: p.achievements || [] },
        };
        await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
          body: JSON.stringify(payload),
        });
      } catch(_) {}
    };
    const iv = setInterval(doAutoSave, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [authed, profile]);

  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [incomingDm, setIncomingDm] = useState(null);
  const [incomingTrade, setIncomingTrade] = useState(null);
  const [parties, setParties] = useState(() => { try { return JSON.parse(localStorage.getItem('rep_parties') || '[]'); } catch { return []; } });
  const [gangs,   setGangs]   = useState(() => { try { return JSON.parse(localStorage.getItem('rep_gangs')   || '[]'); } catch { return []; } });

  // ── Token auto-refresh: her 10 dakikada kontrol, 5 dakika kalmışsa yenile ──
  useEffect(() => {
    if (!authed) return;
    const checkAndRefresh = async () => {
      try {
        const jwt = localStorage.getItem('us_jwt');
        if (!jwt) return;
        const res = await fetch('/api/auth/verify', { headers: { Authorization: 'Bearer ' + jwt } });
        const data = await res.json();
        if (data.shouldRefresh || (data.expiresIn && data.expiresIn < 300)) {
          const refreshToken = localStorage.getItem('us_refreshToken');
          if (!refreshToken) return;
          const r = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          const d = await r.json();
          if (d.success && d.token) {
            localStorage.setItem('us_jwt', d.token);
            if (d.refreshToken) localStorage.setItem('us_refreshToken', d.refreshToken);
          }
        }
      } catch(_) {}
    };
    checkAndRefresh();
    const iv = setInterval(checkAndRefresh, 10 * 60 * 1000);
    return () => clearInterval(iv);
  }, [authed]);

  // Socket.IO real-time event listeners
  useEffect(() => {
    if (!authed) return;
    const _syncLs = (key, value) => {
      try {
        localStorage.setItem('rep_'+key, JSON.stringify(value));
        window.dispatchEvent(new CustomEvent('fb-sync', {detail:{key, value}}));
      } catch(e){}
    };

    const _emitPlayerJoin = (s) => {
      const userId = profile?.id || profile?.uid || localStorage.getItem('rep_userId');
      if (!userId || !s?.connected) return;
      s.emit('playerJoin', {
        userId,
        username: profile?.username || localStorage.getItem('rep_username') || 'Oyuncu',
        level: profile?.level || 1,
        city: profile?.city || '',
        gender: profile?.gender || 'erkek',
        money: profile?.money || 0,
        party: profile?.party || null,
        gang: profile?.gang || null,
        avatar: profile?.avatar || null,
      });
    };

    const attach = () => {
      const s = window._socket;
      if (!s) return false;

      // Eğer zaten bağlıysa hemen playerJoin gönder; değilse connect event'ini dinle
      if (s.connected) {
        _emitPlayerJoin(s);
      } else {
        s.once('connect', () => _emitPlayerJoin(s));
      }

      // ── Presence ────────────────────────────────────────────────
      s.on('onlinePlayers', (list) => {
        setOnlinePlayers(list || []);
        window.dispatchEvent(new CustomEvent('fb-sync', {detail:{key:'onlineCount',value:(list||[]).length}}));
      });

      // ── İlk tam oyun state'i (bağlanınca sunucu gönderir) ────────
      s.on('gameStateInit', (data) => {
        try {
          if (Array.isArray(data.gangs))         { _syncLs('gangs', data.gangs);     setGangs(data.gangs);   }
          if (Array.isArray(data.parties))       { _syncLs('parties', data.parties); setParties(data.parties); }
          if (Array.isArray(data.alliances))     _syncLs('alliances', data.alliances);
          if (data.elections)                    _syncLs('elections', data.elections);
          if (data.elections_multi)              _syncLs('elections_multi', data.elections_multi);
          if (Array.isArray(data.laws))          _syncLs('laws', data.laws);
          if (Array.isArray(data.announcements)) _syncLs('announcements', data.announcements);
          if (data.cabinet)                      _syncLs('cabinet', data.cabinet);
          if (data.gangTerritories)              _syncLs('gangTerritories', data.gangTerritories);
          // Online oyuncular — bağlanınca anında güncel liste
          if (Array.isArray(data.onlinePlayers)) {
            setOnlinePlayers(data.onlinePlayers);
            window.dispatchEvent(new CustomEvent('fb-sync', {
              detail: { key: 'onlineCount', value: data.onlinePlayers.length }
            }));
          }
        } catch(e){}
      });

      // ── Gang güncellemeleri ──────────────────────────────────────
      s.on('gangUpdate', (data) => {
        try {
          if (Array.isArray(data.gangs)) { _syncLs('gangs', data.gangs); setGangs(data.gangs); }
          if (data.action === 'create' && data.gang) showNotif(`${data.gang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'} ${data.gang.name} kuruldu!`, 'info', data.gang.type==='family'?'👨‍👩‍👧‍👦':'⚔️');
        } catch(e){}
      });

      // ── Parti güncellemeleri ─────────────────────────────────────
      s.on('partyUpdate', (data) => {
        try {
          if (Array.isArray(data.parties)) { _syncLs('parties', data.parties); setParties(data.parties); }
          if (data.action === 'create' && data.party) showNotif(`🏛️ ${data.party.name} partisi kuruldu!`, 'info', '🏛️');
        } catch(e){}
      });

      // ── İttifak güncellemeleri ───────────────────────────────────
      s.on('allianceUpdate', (data) => {
        try {
          if (Array.isArray(data.alliances)) _syncLs('alliances', data.alliances);
        } catch(e){}
      });

      // ── Seçim güncellemeleri ─────────────────────────────────────
      s.on('electionUpdate', (data) => {
        try {
          if (data.elections !== undefined)       _syncLs('elections', data.elections);
          if (data.elections_multi !== undefined) _syncLs('elections_multi', data.elections_multi);
          if (data.phase === 'finished' && data.winner) showNotif(`🏆 Seçim bitti! ${data.winner.username} Devlet Başkanı seçildi!`, 'success', '🏆');
          else if (data.phase === 'active')             showNotif(`🗳️ Seçim başladı! Oy kullanmayı unutma.`, 'info', '🗳️');
        } catch(e){}
      });

      s.on('electionResult', (data) => {
        try {
          if (data) showNotif(`🏆 ${data.winner?.username || 'Bilinmeyen'} seçimi kazandı!`, 'success', '🏆');
        } catch(e){}
      });

      // ── Yasa güncellemeleri ──────────────────────────────────────
      s.on('lawUpdate', (data) => {
        try {
          if (Array.isArray(data.laws)) _syncLs('laws', data.laws);
          if (data.action === 'propose' && data.law) showNotif(`⚖️ Yeni yasa: "${data.law.title}"`, 'info', '⚖️');
        } catch(e){}
      });

      // ── Duyuru güncellemeleri ────────────────────────────────────
      s.on('announcementUpdate', (data) => {
        try {
          if (Array.isArray(data.announcements)) _syncLs('announcements', data.announcements);
          if (data.action === 'new' && data.announcement) showNotif(`📢 Yeni duyuru: ${(data.announcement.title||'').slice(0,40)}`, 'info', '📢');
        } catch(e){}
      });

      // ── Kabine güncellemeleri ────────────────────────────────────
      s.on('cabinetUpdate', (data) => {
        try {
          if (data.cabinet) _syncLs('cabinet', data.cabinet);
        } catch(e){}
      });

      // ── Bölge güncellemeleri ─────────────────────────────────────
      s.on('territoryUpdate', (data) => {
        try {
          if (data.territories) _syncLs('gangTerritories', data.territories);
        } catch(e){}
      });

      // ── Hedefli bildirimler ──────────────────────────────────────
      s.on('notification', (data) => {
        try {
          if (!data) return;
          const icon = data.icon || '🔔';
          const msg  = data.msg || data.title || '';
          const type = data.type === 'war' || data.type === 'attack' || data.type === 'combat' ? 'error' :
                       data.type === 'election' || data.type === 'party' ? 'success' : 'info';
          showNotif(msg, type, icon);
          // Kalıcı bildirim listesine ekle
          setNotifications(n => [...n.slice(-49), { msg, type, icon, ts: data.ts || Date.now() }]);
        } catch(e){}
      });

      // ── Savaş bildirimleri ───────────────────────────────────────
      s.on('mafiaWarUpdate', (data) => {
        try {
          showNotif(`⚔️ Savaş! ${data.attackerName||''} → ${data.defenderName||''}`, 'error', '⚔️');
        } catch(e){}
      });

      s.on('gang:assetAttacked', (data) => {
        const myId = profile?.id || profile?.uid;
        if (data.familyOwnerId === myId) {
          showNotif(`🔥 "${data.assetName}" varlığınıza saldırı!`, 'error', '🔥');
        }
      });

      // ── Savaş sonuçları ──────────────────────────────────────────
      s.on('combatResult', (data) => {
        const myId = profile?.id || profile?.uid;
        if (data.loserUserId === myId) showNotif(`💥 Savaşı kaybettiniz! ${data.winner||''} kazandı.`, 'error', '💥');
        else if (data.winnerUserId === myId) showNotif(`🏆 Savaşı kazandınız!`, 'success', '🏆');
      });

      // ── İl bölge kontrolü ────────────────────────────────────────
      s.on('province:sync', (data) => {
        try {
          if (data.control) {
            localStorage.setItem('rep_provinceControl', JSON.stringify(data.control));
            window.dispatchEvent(new Event('provinceControlUpdate'));
          }
        } catch(e){}
      });

      // ── Şehir sahipliği ──────────────────────────────────────────
      s.on('cityOwnershipUpdate', (data) => {
        try {
          showNotif(`🏙️ ${data.city||'Şehir'} sahipliği değişti: ${data.newOwner||''}`, 'info', '🏙️');
        } catch(e){}
      });

      // ── Game event — tüm clientlara yayınlanan canlı olay ──────
      s.on('gameEvent', (data) => {
        try {
          if (!data) return;
          const evt = {
            id:       data.id       || ('evt_' + Date.now()),
            type:     data.type     || 'generic',
            category: data.category || 'genel',
            title:    data.title    || 'Oyun Olayı',
            desc:     data.desc     || '',
            icon:     data.icon     || '📢',
            ts:       data.ts       || Date.now(),
          };
          // Only add if came from another socket (not our own emit)
          window.dispatchEvent(new CustomEvent('game-event', { detail: evt }));
          // Also show a toast for fresh events
          if (Date.now() - (evt.ts||0) < 30000) {
            showNotif(`${evt.icon} ${evt.title}`, 'info', evt.icon||'📢');
          }
        } catch(e){}
      });

      // ── DM ───────────────────────────────────────────────────────
      s.on('dm', (data) => {
        const myId = profile?.id || profile?.uid;
        if (data.toUserId === myId || !data.toUserId) {
          try {
            const msgs = JSON.parse(localStorage.getItem('rep_directMessages')||'[]');
            const newMsg = {id:data.ts||Date.now(), from:data.fromUserId, to:data.toUserId, fromName:data.fromUsername, text:data.text||data.message, ts:data.ts||Date.now(), read:false};
            localStorage.setItem('rep_directMessages', JSON.stringify([...msgs, newMsg]));
          } catch(e){}
          setIncomingDm(data);
          showNotif(`📬 ${data.fromUsername}: ${(data.text||data.message||'').slice(0,40)}`, 'info', '📬');
        }
      });

      // ── Trade teklifleri ─────────────────────────────────────────
      s.on('tradeOffer', (data) => {
        setIncomingTrade(data);
        showNotif(`🤝 ${data.fromUsername} ticaret teklif etti!`, 'info', '🤝');
      });
      s.on('partnershipOffer', (data) => {
        setIncomingTrade(data);
        showNotif(`🏢 ${data.fromUsername} şirket ortaklığı teklif etti!`, 'info', '🏢');
      });

      // ── Rate limit uyarısı ───────────────────────────────────────────────────
      s.on('rateLimited', ({ event: ev, retryAfter } = {}) => {
        const sec = retryAfter ? Math.ceil(retryAfter / 1000) : null;
        showNotif(`⚠️ Çok hızlı! ${sec ? `${sec}s bekle` : 'Yavaşla'}`, 'error');
      });

      // ── Market güncelleme ────────────────────────────────────────
      s.on('marketUpdate', (data) => {
        try {
          const holdings = JSON.parse(localStorage.getItem('rep_holdings')||'[]');
          if (data.companyId && data.ownerName !== profile?.username) {
            const updated = holdings.map(h => h.id===data.companyId ? {...h, sharePrice:data.sharePrice, value:data.value||h.value} : h);
            localStorage.setItem('rep_holdings', JSON.stringify(updated));
          }
        } catch(e){}
      });

      // ── Legacy gameAction ────────────────────────────────────────
      s.on('gameAction', (data) => {
        if (data.type==='newParty') showNotif(`🏛️ ${data.username} yeni parti kurdu: ${data.payload}`, 'info', '🏛️');
        if (data.type==='newGang')  showNotif(`⚔️ ${data.username} yeni çete kurdu: ${data.payload}`, 'info', '⚔️');
      });

      return true;
    };
    if (!attach()) {
      const t = setInterval(() => { if(attach()) clearInterval(t); }, 1000);
      return () => clearInterval(t);
    }
  }, [authed, profile?.id, profile?.uid]);

  const showNotif = useCallback((msg, type='info', icon='🔔') => {
    setToast({ msg, type });
    setNotifications(n => [...n.slice(-49), { msg, type, icon, ts:Date.now() }]);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const [showWelcome, setShowWelcome] = useState(false);

  // ── Global push notification yardımcı ──
  window._pushNotif = (title, body, tag='understate') => {
    try {
      if(window.Notification && Notification.permission === 'granted') {
        new Notification(title, { body, tag, icon:'favicon.jpg', badge:'favicon.jpg', silent:false });
      }
    } catch(e){}
  };

  const [emailBannerDismissed, setEmailBannerDismissed] = useState(false);

  const handleLogin = (p) => {
    setProfile_raw(p);
    setAuthed(true);
    // Bildirim izni iste
    setTimeout(()=>{
      try {
        if(window.Notification && Notification.permission === 'default') {
          Notification.requestPermission().then(perm=>{
            if(perm==='granted') window._pushNotif('🎮 UnderState', 'Hoş geldin! Bildirimler açık.','welcome');
          });
        }
      } catch(e){}
    }, 3000);
    // Yeni oyuncu kontrolü
    if (!localStorage.getItem('rep_welcomeShown_' + (p.id||p.uid))) {
      localStorage.setItem('rep_welcomeShown_' + (p.id||p.uid), '1');
      setTimeout(() => setShowWelcome(true), 1200);
    }
    if (p.uid) {
      window._startPresenceHeartbeat?.(p.uid, p.username || 'Oyuncu');
      window._setupUserListener?.(p.uid);
      window.dispatchEvent(new CustomEvent('user-logged-in', { detail:{ userId:p.uid } }));
    }
    window._setupSocket?.(p);
    _hideLoading?.();
  };

  const handleLogout = async () => {
    try { await fbLogout(); } catch{}
    localStorage.removeItem('userId');
    localStorage.removeItem('rep_userProfile');
    setProfile_raw(null);
    setAuthed(false);
    setPage('home');
  };

  // Email verification URL param handler
  useEffect(() => {
    if (window._emailVerifiedFlag) {
      window._emailVerifiedFlag = false;
      setEmailBannerDismissed(true);
      setProfile_raw(p => p ? { ...p, emailVerified: true } : p);
      try {
        const s = JSON.parse(localStorage.getItem('rep_userProfile') || 'null');
        if (s) { s.emailVerified = true; localStorage.setItem('rep_userProfile', JSON.stringify(s)); }
      } catch {}
      setTimeout(() => showNotif('✅ E-posta adresin başarıyla doğrulandı!', 'success'), 600);
    }
  }, [authed]);

  // Hide loading screen
  useEffect(() => {
    if (authed) {
      setTimeout(() => window._hideLoading?.(), 500);
    }
  }, [authed]);

  if (!authed) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const notifCount = notifications.filter(n => Date.now()-n.ts < 300000).length;

  const isAdmin = profile?.role === 'admin' || profile?.isAdmin === true || profile?.email === 'admin@understate.tr';
  const pageProps = { profile, setProfile, showNotif, onNavigate: setPage };
  const navItems = isAdmin
    ? [...NAV_ITEMS, { id:'admin', icon:'⚙️', label:'Admin', rgb:'239,68,68' }]
    : (NAV_ITEMS || []);

  const themeVal = { dark, toggle: toggleDark };
  const pageBg = dark ? '#0F172A' : '#F0F2F5';

  return (
    <LangCtx.Provider value={profile?.lang||uiLang||'tr'}>
    <ThemeCtx.Provider value={themeVal}>
      {/* Responsive outer wrapper — max 480px on desktop, centered */}
      <div style={{position:'fixed',inset:0,display:'flex',alignItems:'stretch',justifyContent:'center',background: dark ? '#060C18' : '#E5E7EB'}}>
        <div style={{position:'relative',width:'100%',maxWidth:'480px',display:'flex',flexDirection:'column',overflow:'hidden',background: dark ? '#0F172A' : '#F0F2F5',boxShadow:'0 0 60px rgba(0,0,0,0.3)'}}>
          <Header profile={profile} notifCount={notifCount} onNotif={()=>setNotifOpen(true)} page={page} onNavigate={setPage} />

          {/* Canlı Olaylar Ticker */}
          <GameEventTicker events={gameEvents} onNavigate={setPage} />

          {/* Email doğrulama banner */}
          {profile && !profile.emailVerified && !emailBannerDismissed && (
            <EmailVerifyBanner
              email={profile.email}
              onDismiss={() => setEmailBannerDismissed(true)}
            />
          )}

          {/* Main scrollable content */}
          <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',paddingBottom:'calc(70px + env(safe-area-inset-bottom, 0px))',background:pageBg}}>
            {page==='home'         && <HomePage        {...pageProps} />}
            {page==='chat'         && <ChatPage        profile={profile} />}
            {page==='economy'      && <EconomyPage     {...pageProps} />}
            {page==='market'       && <StorePage       {...pageProps} />}
            {page==='politics'     && <PoliticsPage    {...pageProps} />}
            {page==='holdings'     && <HoldingsPage    {...pageProps} />}
            {page==='gang'         && <GangPage        {...pageProps} typeFilter='gang' />}
            {page==='family'       && <GangPage        {...pageProps} typeFilter='family' />}
            {page==='alliance'     && <AlliancePage    {...pageProps} />}
            {page==='world'        && <WorldPage       profile={profile} onNavigate={setPage} />}
            {page==='admin'        && <AdminPage       profile={profile} showNotif={showNotif} onNavigate={setPage} />}
            {page==='farm'         && <EconomyPage     {...pageProps} initialSub='farm' />}
            {page==='livestock'    && <EconomyPage     {...pageProps} initialSub='livestock' />}
            {page==='players'      && <PlayersPage     profile={profile} onNavigate={setPage} onlinePlayers={onlinePlayers} />}
            {page==='profile'      && <ProfilePage     {...pageProps} onLogout={handleLogout} />}
            {page==='premium'      && <PremiumPage     {...pageProps} />}
            {page==='football'     && <FootballPage    {...pageProps} />}
            {page==='factory'      && <FactoryPage     {...pageProps} />}
            {page==='mining'       && <MiningPage      {...pageProps} />}
            {page==='army'         && <ArmyPage        {...pageProps} />}
            {page==='spy'          && <SpyPage         {...pageProps} />}
            {page==='newspaper'    && <NewspaperPage   {...pageProps} />}
            {page==='pvp'          && <PvpPage         {...pageProps} />}
            {page==='social'       && <SocialPage      profile={profile} showNotif={showNotif} onNavigate={setPage} />}
            {page==='achievements' && <AchievementsPage profile={profile} />}
            {page==='crisis'       && <CrisisPage      {...pageProps} />}
            {page==='casino'       && <CasinoPage      {...pageProps} />}
            {page==='map'          && <TerritoryMapPage {...pageProps} />}
            {page==='wiki'         && <WikiPage            profile={profile} />}
            {page==='dm'           && <DirectMessagesPage {...pageProps} />}
            {page==='taxgov'       && <TaxMunicipalityPage {...pageProps} />}
            {page==='jobs'         && <JobsPage        {...pageProps} />}
            {page==='kariyer'      && <KariyerCalismaPage {...pageProps} />}
            {page==='citybuild'    && <CityBuildPage   {...pageProps} />}
            {page==='klanchat'     && <KlanChatPage    profile={profile} />}
            {page==='npcplayers'   && <NpcPlayersPage  {...pageProps} />}
            {page==='duyurular'    && <DuyurularPage   profile={profile} />}
            {page==='leaderboard'  && <LeaderboardPage {...pageProps} />}
            {page==='education'    && <EducationPage   {...pageProps} />}
            {page==='parti_etki'   && <PartiEtkiPage  profile={profile} setProfile={setProfile} parties={parties} setParties={setParties} showNotif={showNotif} gangs={gangs} />}
            {page==='citygov'        && <CityGovPage       {...pageProps} />}
            {page==='crime'          && <CrimePage         profile={profile} setProfile={setProfile} showNotif={showNotif} />}
            {page==='daily'          && <DailyTasksPage    {...pageProps} />}
            {page==='tournament'     && <TournamentPage    {...pageProps} />}
            {page==='yetkilerim'     && <YetkilerimPage    {...pageProps} />}
            {page==='election_events'&& <EventsPage        {...pageProps} />}
            {page==='teamwar'        && <TeamWarPage       {...pageProps} />}
            {page==='power_triangle' && window.PowerTriangleScreen && React.createElement(window.PowerTriangleScreen, {cu:profile||{},setCurrentPage:setPage,families:(()=>{try{return JSON.parse(localStorage.getItem('rep_families')||'[]');}catch{return [];}})(),gangs:gangs,parties:parties,allUsers:onlinePlayers||[]})}
            {page==='tenders' && window.TenderScreen && React.createElement(window.TenderScreen, {cu:profile||{},setCurrentPage:setPage,families:(()=>{try{return JSON.parse(localStorage.getItem('rep_families')||'[]');}catch{return [];}})(),allUsers:onlinePlayers||[]})}
            {page==='unions' && window.UnionScreen && React.createElement(window.UnionScreen, {cu:profile||{},setCurrentPage:setPage,allUsers:onlinePlayers||[],families:(()=>{try{return JSON.parse(localStorage.getItem('rep_families')||'[]');}catch{return [];}})()})}
            {page==='gang_treasury' && window.GangTreasuryScreen && React.createElement(window.GangTreasuryScreen, {cu:profile||{},setCurrentPage:setPage,gangs:gangs,allUsers:onlinePlayers||[]})}
            {page==='party_center' && window.PartyCenterScreen && React.createElement(window.PartyCenterScreen, {cu:profile||{},setCurrentPage:setPage,parties:parties,allUsers:onlinePlayers||[],families:(()=>{try{return JSON.parse(localStorage.getItem('rep_families')||'[]');}catch{return [];}})()})}
            {page==='army_system' && window.ArmyScreen && React.createElement(window.ArmyScreen, {cu:profile||{},setCurrentPage:setPage,allUsers:onlinePlayers||[]})}
            {page==='independent_army' && window.IndependentArmyScreen && React.createElement(window.IndependentArmyScreen, {cu:profile||{},setCurrentPage:setPage,allUsers:onlinePlayers||[],families:(()=>{try{return JSON.parse(localStorage.getItem('rep_families')||'[]');}catch{return [];}})(),gangs:gangs,parties:parties})}
            {page==='economic_empire' && window.EconomicEmpireScreen && React.createElement(window.EconomicEmpireScreen, {cu:profile||{},setCurrentPage:setPage,families:(()=>{try{return JSON.parse(localStorage.getItem('rep_families')||'[]');}catch{return [];}})(),gangs:gangs,parties:parties,allUsers:onlinePlayers||[]})}
            {page==='family_center' && window.FamilyCenterScreen && React.createElement(window.FamilyCenterScreen, {cu:profile||{},setCurrentPage:setPage,families:(()=>{try{return JSON.parse(localStorage.getItem('rep_families')||'[]');}catch{return [];}})(),gangs:gangs,parties:parties,allUsers:onlinePlayers||[]})}
            {page==='protection_deals' && window.ProtectionDealsScreen && React.createElement(window.ProtectionDealsScreen, {cu:profile||{},setCurrentPage:setPage,gangs:gangs,families:(()=>{try{return JSON.parse(localStorage.getItem('rep_families')||'[]');}catch{return [];}})(),allUsers:onlinePlayers||[]})}
          </div>

          <BottomNav page={page} onChange={setPage} items={navItems} notifMap={{ chat: notifications.filter(n=>n.type==='message'&&Date.now()-n.ts<300000).length }} />

          {toast && <Notif msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
          {notifOpen && <NotifPanel notifications={notifications} onClose={()=>setNotifOpen(false)} onClear={()=>setNotifications([])} />}
          {showWelcome && (
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
              <div style={{background:'linear-gradient(135deg,#0B1527,#0F1E38)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:'20px',padding:'1.5rem 1.25rem',maxWidth:'380px',width:'100%',maxHeight:'85vh',overflowY:'auto',boxShadow:'0 25px 80px rgba(0,0,0,0.8)'}}>
                <div style={{textAlign:'center',marginBottom:'1.25rem'}}>
                  <div style={{fontSize:'2.5rem',marginBottom:'0.4rem'}}>🏙️</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#E8EDF2'}}>UnderState'e Hoş Geldin!</div>
                  <div style={{fontSize:'0.78rem',color:'#5A7089',marginTop:'0.3rem'}}>{profile?.username||'Oyuncu'}, sana birkaç ipucu verelim 🎮</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'0.6rem',marginBottom:'1.25rem'}}>
                  {[
                    ['1️⃣','İlk İşini Yap','İşler sekmesinden Çöpçü veya Fırıncı ile para kazanmaya başla. Her 5 dakikada bir toplayabilirsin.'],
                    ['2️⃣','Eğitimini Tamamla','Eğitim sekmesinden okul bitir. Yüksek diploma → daha iyi işler ve siyasi haklar.'],
                    ['3️⃣','Şehrine Oy Ver','Siyaset sekmesinden devlet başkanlığı seçimlerine katıl. Oy katsayın arttıkça etkili olursun.'],
                    ['4️⃣','Parti veya Çete','Lise mezuniyeti sonrası parti kurabilir, yeterli parayla çete/aile oluşturabilirsin.'],
                    ['5️⃣','Günlük Görevleri Bitir','Görevler sekmesindeki günlük hedefleri tamamla — XP ve para kazan.'],
                    ['6️⃣','UC Kazan','Ekonomi → Dönüşüm sayfasından UnderCoin edinebilir, oy katsayısını artırabilirsin.'],
                  ].map(([num,title,desc])=>(
                    <div key={num} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'0.65rem 0.8rem',display:'flex',gap:'0.65rem',alignItems:'flex-start'}}>
                      <span style={{fontSize:'1.1rem',flexShrink:0}}>{num}</span>
                      <div>
                        <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.82rem',marginBottom:'0.15rem'}}>{title}</div>
                        <div style={{fontSize:'0.72rem',color:'#5A7089',lineHeight:1.45}}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'10px',padding:'0.6rem 0.8rem',marginBottom:'1rem',fontSize:'0.72rem',color:'#F59E0B',lineHeight:1.4}}>
                  💡 İpucu: Sağ üstteki destek butonuyla bize mesaj atabilirsin. Sorularını yanıtlıyoruz!
                </div>
                <button onClick={()=>setShowWelcome(false)} style={{width:'100%',padding:'0.85rem',borderRadius:'14px',border:'none',background:'linear-gradient(135deg,#3B82F6,#1D4ED8)',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:'0.92rem',cursor:'pointer'}}>
                  🚀 Oyuna Başla!
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ThemeCtx.Provider>
    </LangCtx.Provider>
  );
}

// ═══════════════════════════════════════════════════════
// KARİYER ÇALIŞMA SİSTEMİ
// ═══════════════════════════════════════════════════════

// GLOBAL STYLES
// ═══════════════════════════════════════════════════════
const styleEl = document.createElement('style');
styleEl.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #E5E7EB; color: #1A2233; font-family: 'DM Sans', sans-serif; overflow: hidden; -webkit-tap-highlight-color: transparent; }
  body.us-dark { color: #E8EDF2 !important; background: #060C18 !important; }
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.3); border-radius: 10px; }
  input, select, textarea { -webkit-appearance: none; font-size: 16px !important; }
  button { -webkit-tap-highlight-color: transparent; }
  .bnav { scroll-behavior: smooth; }
  .bnav::-webkit-scrollbar { display: none; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @keyframes notifIn { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes vipRainbow { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
  @keyframes vipFire { 0%,100%{box-shadow:0 0 8px #FF4500,0 0 16px rgba(255,69,0,0.4)} 50%{box-shadow:0 0 14px #FFD700,0 0 28px rgba(255,215,0,0.5)} }
  @keyframes vipIce { 0%,100%{box-shadow:0 0 8px #00BFFF,0 0 16px rgba(0,191,255,0.4)} 50%{box-shadow:0 0 14px #E0FFFF,0 0 28px rgba(224,255,255,0.6)} }
  @keyframes vipGold { 0%,100%{box-shadow:0 0 8px #FFD700,0 0 16px rgba(255,215,0,0.4)} 50%{box-shadow:0 0 16px #FFA500,0 0 32px rgba(255,165,0,0.5)} }
  @keyframes vipNeon { 0%,100%{box-shadow:0 0 8px #00FF64,0 0 16px rgba(0,255,100,0.4)} 50%{box-shadow:0 0 14px #00FF64,0 0 28px rgba(0,255,100,0.7)} }
  @keyframes vipViolet { 0%,100%{box-shadow:0 0 8px #8B5CF6,0 0 16px rgba(139,92,246,0.4)} 50%{box-shadow:0 0 14px #A78BFA,0 0 28px rgba(167,139,250,0.6)} }
  @keyframes vipHeart { 0%,100%{box-shadow:0 0 8px #EC4899,0 0 16px rgba(236,72,153,0.4)} 50%{box-shadow:0 0 14px #F43F5E,0 0 28px rgba(244,63,94,0.6)} }
`;
document.head.appendChild(styleEl);

// ═══════════════════════════════════════════════════════
// MOUNT
// ═══════════════════════════════════════════════════════
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// REACT ERROR BOUNDARY
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[UNDERSTATE ErrorBoundary] React hatas\u0131:', error, errorInfo);
    try {
      const jwt = localStorage.getItem('us_jwt');
      if (jwt) {
        fetch('/api/game/error-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
          body: JSON.stringify({
            message: String(error?.message || error).slice(0, 500),
            stack: String(errorInfo?.componentStack || '').slice(0, 1000),
            version: window.APP_V || '8.0',
            ts: Date.now()
          })
        }).catch(() => {});
      }
    } catch(_) {}
  }

  handleRetry() {
    this.setState(prev => ({ hasError: false, error: null, errorInfo: null, retryCount: prev.retryCount + 1 }));
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const dark = document.body.classList.contains('us-dark');
    const bg   = dark ? '#060C18' : '#0A1628';
    const card = dark ? '#0D1F3A' : '#0D2040';

    return React.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', background: bg,
        fontFamily: "'DM Sans', sans-serif", flexDirection: 'column', gap: '16px',
        padding: '24px', textAlign: 'center'
      }
    },
      React.createElement('img', {
        src: '/icon-192.png', alt: 'UNDERSTATE',
        style: { width: '72px', height: '72px', borderRadius: '18px', marginBottom: '8px', opacity: 0.8 }
      }),
      React.createElement('h2', {
        style: { color: '#e74c3c', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }
      }, '\u26a0\ufe0f Beklenmedik Bir Hata Olu\u015ftu'),
      React.createElement('p', {
        style: { color: '#8BA0B8', fontSize: '13px', maxWidth: '320px', lineHeight: 1.5 }
      }, 'Oyun ekran\u0131 y�klenirken bir sorun ya\u015fand\u0131. A\u015fa\u011f\u0131daki butona basarak tekrar deneyebilirsin.'),
      this.state.error && React.createElement('div', {
        style: {
          background: card, border: '1px solid rgba(231,76,60,0.3)', borderRadius: '10px',
          padding: '10px 14px', maxWidth: '340px', width: '100%'
        }
      },
        React.createElement('code', {
          style: { color: '#F87171', fontSize: '11px', wordBreak: 'break-word', display: 'block' }
        }, String(this.state.error?.message || this.state.error).slice(0, 200))
      ),
      React.createElement('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' } },
        React.createElement('button', {
          onClick: () => this.handleRetry(),
          style: {
            background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: '#fff',
            border: 'none', borderRadius: '10px', padding: '12px 24px',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer'
          }
        }, '\ud83d\udd04 Tekrar Dene'),
        React.createElement('button', {
          onClick: () => { localStorage.clear(); location.reload(); },
          style: {
            background: 'rgba(255,255,255,0.06)', color: '#8BA0B8',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
            padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
          }
        }, '\ud83d\uddd1\ufe0f �nbelle\u011fi Temizle & Yenile')
      ),
      this.state.retryCount > 0 && React.createElement('p', {
        style: { color: '#5A7089', fontSize: '11px' }
      }, `${this.state.retryCount}. deneme ba\u015far\u0131s\u0131z \u2014 tam yenileme deneyebilirsin`)
    );
  }
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// MOUNT
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(ErrorBoundary, null, React.createElement(App)));

// Loading screen kapat (auth yoksa da bir süre sonra kapat)
setTimeout(() => window._hideLoading?.(), 4000);
