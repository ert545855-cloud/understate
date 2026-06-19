const FACTORY_JOB_ROLES = {
  textile:     [
    { id:'tekstil_isci',    name:'Tekstil İşçisi',        icon:'🧵', salary:15000,  duration:4*3600000,  level:1  },
    { id:'tekstil_usta',    name:'Usta Terzi',             icon:'✂️', salary:32000,  duration:8*3600000,  level:5  },
  ],
  food:        [
    { id:'gida_isci',       name:'Gıda İşçisi',           icon:'🍞', salary:18000,  duration:3*3600000,  level:1  },
    { id:'gida_sef',        name:'Üretim Şefi',            icon:'👨‍🍳', salary:42000, duration:8*3600000,  level:8  },
  ],
  steel:       [
    { id:'celik_kaynak',    name:'Kaynakçı',               icon:'🔥', salary:26000,  duration:4*3600000,  level:1  },
    { id:'celik_muhendis',  name:'Çelik Mühendisi',        icon:'⚙️', salary:58000,  duration:8*3600000,  level:12 },
  ],
  electronics: [
    { id:'elekt_tekn',      name:'Elektronik Teknisyeni',  icon:'🔧', salary:36000,  duration:4*3600000,  level:5  },
    { id:'elekt_usta',      name:'Elektronik Ustası',      icon:'💻', salary:75000,  duration:8*3600000,  level:15 },
  ],
  auto:        [
    { id:'oto_montaj',      name:'Montaj İşçisi',          icon:'🚗', salary:48000,  duration:6*3600000,  level:5  },
    { id:'oto_usta',        name:'Oto Ustası',              icon:'🏆', salary:95000,  duration:12*3600000, level:20 },
  ],
  mermi:       [
    { id:'mermi_isci',      name:'Mermi İşçisi',           icon:'🔴', salary:22000,  duration:4*3600000,  level:1  },
    { id:'mermi_kontrol',   name:'Kalite Kontrol',         icon:'🎯', salary:48000,  duration:6*3600000,  level:8  },
    { id:'mermi_usta',      name:'Balistik Uzmanı',        icon:'💥', salary:72000,  duration:8*3600000,  level:15 },
  ],
  weapon:      [
    { id:'silah_isci',      name:'Silah Montaj İşçisi',   icon:'🔫', salary:28000,  duration:4*3600000,  level:3  },
    { id:'silah_usta',      name:'Silah Ustası',           icon:'⚔️', salary:65000,  duration:8*3600000,  level:12 },
  ],
};

const KARIYER_ICONS  = { textile:'👕', food:'🍞', steel:'⚙️', electronics:'💻', auto:'🚗', mermi:'🔴', weapon:'🔫' };
const KARIYER_COLORS = { textile:'#8B5CF6', food:'#F59E0B', steel:'#6B7280', electronics:'#3B82F6', auto:'#EF4444', mermi:'#F97316', weapon:'#EF4444' };

function KariyerCalismaPage({ profile, setProfile, showNotif }) {
  const { dark } = useTheme();
  const bg    = dark ? '#0F172A' : '#F8FAFC';
  const card  = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const bord  = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const [activeWork, setActiveWork] = useState(null);
  const [factories, setFactories] = useState([]);
  const [selFactory, setSelFactory] = useState(null);
  const [tick, setTick] = useState(0);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Fabrika listesi ve aktif çalışma seansını sunucudan yükle
  useEffect(() => {
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt) return;
    fetch('/api/factory', { headers: { Authorization: 'Bearer ' + jwt } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.success) return;
        setFactories(d.factories || []);
        setActiveWork(d.session || null);
      })
      .catch(() => {});
  }, []);

  // Socket: fabrika güncellemelerini dinle
  useEffect(() => {
    const s = window._socket;
    if (!s) return;
    const handler = (data) => { if (Array.isArray(data.factories)) setFactories(data.factories); };
    s.on('factory:sync', handler);
    return () => s.off('factory:sync', handler);
  }, []);

  const cu = profile || {};

  const fmtTime = (ms) => {
    if (ms <= 0) return '✅ Tamamlandı';
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}dk ${s % 60}s`;
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return `${h}sa ${m}dk`;
  };

  const startWork = async (factory, role) => {
    if (activeWork) { showNotif('⛔ Zaten aktif bir çalışman var! Önce tamamla.', 'error'); return; }
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt) return;
    setApiLoading(true);
    try {
      const res = await fetch('/api/factory/work/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt },
        body: JSON.stringify({ factoryId: factory.id, roleKey: role.id }),
      });
      const data = await res.json();
      if (!data.success) { showNotif(data.msg || '❌ Hata', 'error'); return; }
      setActiveWork(data.session);
      setSelFactory(null);
      showNotif(`✅ ${role.name} olarak çalışmaya başladın! Süre: ${fmtTime(role.duration)}`, 'success');
    } catch { showNotif('❌ Bağlantı hatası', 'error'); }
    finally { setApiLoading(false); }
  };

  const collectSalary = async () => {
    if (!activeWork) return;
    if (Date.now() < activeWork.endsAt) {
      showNotif(`⏳ Daha ${fmtTime(activeWork.endsAt - Date.now())} kaldı!`, 'error');
      return;
    }
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt) return;
    setApiLoading(true);
    try {
      const res = await fetch('/api/factory/work/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) { showNotif(data.msg || '❌ Hata', 'error'); return; }
      setProfile(p => {
        const np = { ...p, money: (p.money || 0) + data.earned, xp: (p.xp || 0) + data.xpGain };
        localStorage.setItem('rep_userProfile', JSON.stringify(np));
        return np;
      });
      try {
        const today = new Date().toDateString();
        const dk = `day_${today}`;
        const s = JSON.parse(localStorage.getItem('rep_dailyTaskState') || '{}');
        s[dk] = { ...(s[dk] || {}), dailyJobCount: ((s[dk]?.dailyJobCount) || 0) + 1 };
        localStorage.setItem('rep_dailyTaskState', JSON.stringify(s));
      } catch(e) {}
      setActiveWork(null);
      showNotif(`💰 ${fmtWord(data.earned)} maaş + ${data.xpGain} XP kazandın!`, 'success');
    } catch { showNotif('❌ Bağlantı hatası', 'error'); }
    finally { setApiLoading(false); }
  };

  const cancelWork = async () => {
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt) return;
    await fetch('/api/factory/work/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt },
      body: JSON.stringify({}),
    }).catch(() => {});
    setActiveWork(null);
    showNotif('❌ Çalışma iptal edildi.', 'info');
  };

  const availableFactories = factories.filter(f => f.ownerUsername !== cu.username && f.owner !== cu.username);
  const myFactory = factories.find(f => f.ownerUsername === cu.username || f.owner === cu.username);

  const pct = activeWork
    ? Math.min(100, Math.round(((now - activeWork.startedAt) / activeWork.duration) * 100))
    : 0;
  const done = activeWork && now >= activeWork.endsAt;

  return (
    <div style={{ padding: '1rem', background: bg, minHeight: '100%' }}>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.1rem', fontWeight: 800, color: '#F59E0B', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
        🏗️ KARİYER ÇALIŞMA
      </div>
      <div style={{ fontSize: '0.75rem', color: '#5A7089', marginBottom: '1.25rem' }}>
        Fabrikalarda iş al, maaş kazan. Aynı anda yalnızca bir işte çalışabilirsin.
      </div>

      {/* AKTİF İŞ KARTI */}
      {activeWork && (
        <div style={{ background: done ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.07)', border: `1px solid ${done ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.3)'}`, borderRadius: '18px', padding: '1.1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>{activeWork.factoryIcon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: dark ? '#E8EDF2' : '#1E293B', fontSize: '0.95rem' }}>{activeWork.roleName}</div>
              <div style={{ fontSize: '0.72rem', color: '#5A7089' }}>{activeWork.factoryName} · Sahip: {activeWork.factoryOwner}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, color: '#10B981', fontSize: '1rem' }}>{fmtWord(activeWork.salary)}</div>
              <div style={{ fontSize: '0.65rem', color: '#5A7089' }}>maaş</div>
            </div>
          </div>

          <div style={{ marginBottom: '0.7rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#5A7089', marginBottom: '4px' }}>
              <span>İlerleme</span>
              <span style={{ fontWeight: 700, color: done ? '#10B981' : '#F59E0B' }}>
                {done ? '✅ Tamamlandı!' : fmtTime(activeWork.endsAt - now) + ' kaldı'}
              </span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: done ? 'linear-gradient(90deg,#10B981,#34D399)' : 'linear-gradient(90deg,#F59E0B,#FBBF24)', borderRadius: '4px', transition: 'width 1s linear' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={collectSalary} disabled={!done}
              style={{ flex: 2, padding: '0.6rem', borderRadius: '12px', border: 'none', background: done ? 'linear-gradient(135deg,#10B981,#059669)' : 'rgba(255,255,255,0.05)', color: done ? '#fff' : '#3B4E63', fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: '0.85rem', cursor: done ? 'pointer' : 'not-allowed' }}>
              {done ? '💰 Maaşı Topla' : '⏳ Bekle...'}
            </button>
            <button onClick={cancelWork}
              style={{ flex: 1, padding: '0.6rem', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              İptal
            </button>
          </div>
        </div>
      )}

      {/* KENDİ FABRİKASI */}
      {myFactory && !activeWork && (
        <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.4rem' }}>{myFactory.icon || '🏭'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F59E0B' }}>{myFactory.name}</div>
            <div style={{ fontSize: '0.68rem', color: '#5A7089' }}>Bu senin fabrikandır — kendi fabrikanda çalışamazsın.</div>
          </div>
        </div>
      )}

      {/* FABRİKA LİSTESİ */}
      {!activeWork && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#5A7089', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
            {availableFactories.length === 0 ? 'Henüz başka fabrika yok' : `${availableFactories.length} Fabrika Mevcut`}
          </div>

          {availableFactories.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#3B4E63' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏭</div>
              <div style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>Oyunda başka fabrika yok.</div>
              <div style={{ fontSize: '0.72rem', color: '#2D3F54' }}>Diğer oyuncular fabrika kurduğunda buradan iş alabilirsin.</div>
            </div>
          )}

          {availableFactories.map(factory => {
            const roles = FACTORY_JOB_ROLES[factory.type] || [];
            const color = KARIYER_COLORS[factory.type] || '#5A7089';
            const expanded = selFactory === factory.id;
            return (
              <div key={factory.id} style={{ background: card, border: `1px solid ${expanded ? color + '44' : bord}`, borderRadius: '16px', marginBottom: '0.65rem', overflow: 'hidden' }}>
                <button onClick={() => setSelFactory(expanded ? null : factory.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.85rem', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: '1.7rem' }}>{factory.icon || KARIYER_ICONS[factory.type] || '🏭'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: dark ? '#E8EDF2' : '#1E293B', fontSize: '0.9rem' }}>{factory.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#5A7089', marginTop: '2px' }}>
                      <span>Sahip: {factory.owner}</span>
                      <span style={{ marginLeft: '0.5rem', color: color, fontWeight: 700 }}>Lv.{factory.level}</span>
                      <span style={{ marginLeft: '0.5rem' }}>{roles.length} iş rolü</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '1rem', color: color, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
                </button>

                {expanded && (
                  <div style={{ borderTop: `1px solid ${bord}`, padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.68rem', color: '#5A7089', marginBottom: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mevcut İş Rolleri</div>
                    {roles.map(role => {
                      const playerLevel = cu.level || 1;
                      const locked = playerLevel < role.level;
                      return (
                        <div key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.5rem', borderRadius: '10px', background: locked ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)', marginBottom: '0.4rem', opacity: locked ? 0.55 : 1 }}>
                          <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{role.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: dark ? '#E8EDF2' : '#1E293B' }}>{role.name}</div>
                            <div style={{ fontSize: '0.65rem', color: '#5A7089', marginTop: '2px', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                              <span style={{ color: '#10B981', fontWeight: 700 }}>💰 {fmtWord(role.salary)}</span>
                              <span>⏱ {fmtTime(role.duration)}</span>
                              {locked && <span style={{ color: '#EF4444', fontWeight: 700 }}>🔒 Lv.{role.level}</span>}
                            </div>
                          </div>
                          <button onClick={() => !locked && startWork(factory, role)} disabled={locked}
                            style={{ padding: '0.4rem 0.85rem', borderRadius: '10px', border: 'none', background: locked ? 'rgba(255,255,255,0.04)' : `${color}22`, color: locked ? '#3B4E63' : color, fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: '0.75rem', cursor: locked ? 'not-allowed' : 'pointer', flexShrink: 0, border: `1px solid ${locked ? 'transparent' : color + '44'}` }}>
                            {locked ? '🔒' : 'Başla'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* BİLGİ KUTUSU */}
      <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', padding: '0.8rem', marginTop: '1rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3B82F6', marginBottom: '0.35rem' }}>ℹ️ Nasıl Çalışır?</div>
        <div style={{ fontSize: '0.68rem', color: '#5A7089', lineHeight: 1.6 }}>
          • Bir fabrikayı seç ve iş rolü başlat<br/>
          • Aynı anda sadece bir iş yapabilirsin<br/>
          • Süre dolunca maaşını topla<br/>
          • Kendi fabrikanda çalışamazsın<br/>
          • Ticaret puanın maaşına bonus ekler
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// İŞLER SAYFASI
// ═══════════════════════════════════════════════════════
const JOBS_LIST = [
  { id:'collector',  emoji:'🗑️', svgIcon:'job-trash',     name:'Çöpçü',              earn:525,    cd:5*60*1000,    minLevel:1, desc:'Her 5 dakikada bir' },
  { id:'baker',      emoji:'🥖', svgIcon:'job-chef',      name:'Fırıncı',             earn:840,    cd:5*60*1000,    minLevel:1, desc:'Her 5 dakikada bir' },
  { id:'porter',     emoji:'💪', svgIcon:'job-porter',    name:'Hamal',               earn:1575,   cd:10*60*1000,   minLevel:1, desc:'Her 10 dakikada bir' },
  { id:'warehouse',  emoji:'📦', svgIcon:'job-warehouse', name:'Depo Görevlisi',      earn:4200,   cd:30*60*1000,   minLevel:2, req:'C Sınıfı Ehliyet', desc:'Her 30 dakikada bir' },
  { id:'tailor',     emoji:'🧵',                          name:'Terzi',               earn:8400,   cd:60*60*1000,   minLevel:3, desc:'Her 60 dakikada bir' },
  { id:'lumberjack', emoji:'🪓',                          name:'Oduncu',              earn:12600,  cd:120*60*1000,  minLevel:3, desc:'Her 2 saatte bir' },
  { id:'guard',      emoji:'💂',                          name:'Güvenlik Görevlisi',  earn:21000,  cd:240*60*1000,  minLevel:5, desc:'Her 4 saatte bir' },
  { id:'nurse',      emoji:'👩‍⚕️',                         name:'Hemşire',            earn:35000,  cd:480*60*1000,  minLevel:8, req:'Lise', desc:'Her 8 saatte bir' },
  { id:'officer',    emoji:'👮',                          name:'Polis Memuru',        earn:55000,  cd:720*60*1000,  minLevel:10, req:'Lise', desc:'Her 12 saatte bir' },
  { id:'teacher',    emoji:'👨‍🏫',                         name:'Öğretmen',           earn:80000,  cd:1440*60*1000, minLevel:15, req:'Üniversite', desc:'Her 24 saatte bir' },
  { id:'engineer',   emoji:'⚙️', svgIcon:'job-engineer', name:'Mühendis',           earn:150000, cd:1440*60*1000, minLevel:20, req:'Üniversite', desc:'Her 24 saatte bir' },
  { id:'doctor',     emoji:'🩺', svgIcon:'job-doctor',   name:'Doktor',              earn:350000, cd:1440*60*1000, minLevel:30, req:'Doktora', desc:'Her 24 saatte bir' },
];

function JobsPage({ profile, setProfile, showNotif }) {
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [cooldowns, setCooldowns] = useState({});
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setTick(p=>p+1), 1000); return () => clearInterval(t); }, []);

  // Sunucudan cooldown'ları yükle
  useEffect(() => {
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt) return;
    fetch('/api/jobs/cooldowns', { headers: { Authorization: 'Bearer ' + jwt } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success) setCooldowns(d.cooldowns || {}); })
      .catch(() => {});
  }, []);

  const fmtCd = (ms) => {
    const s = Math.ceil(ms/1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}dk ${s%60}s`;
    return `${Math.floor(s/3600)}sa ${Math.floor((s%3600)/60)}dk`;
  };

  const doWork = async (job) => {
    if (loading) return;
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt) { showNotif('⚠️ Giriş yapman gerekiyor', 'error'); return; }

    // Optimistik cooldown (UX için anlık güncelleme)
    const now = Date.now();
    const lastDone = cooldowns[job.id] || 0;
    const remaining = job.cd - (now - lastDone);
    if (remaining > 0) { showNotif(`⏳ ${fmtCd(remaining)} bekle!`, 'error'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/jobs/do', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();
      if (!data.success) {
        showNotif(data.msg || '❌ Bir hata oluştu', 'error');
        // Sunucudan güncel cooldown'ları al
        fetch('/api/jobs/cooldowns', { headers: { Authorization: 'Bearer ' + jwt } })
          .then(r => r.json()).then(d => { if (d?.success) setCooldowns(d.cooldowns || {}); }).catch(()=>{});
        return;
      }
      // Cooldown güncelle
      setCooldowns(prev => ({ ...prev, [job.id]: Date.now() }));
      // Profili güncelle
      setProfile(p => {
        const np = {
          ...p,
          money: data.newMoney ?? ((p.money||0) + data.earned),
          xp: data.newXp ?? ((p.xp||0) + data.xpGain),
          underCoin: data.newUc ?? ((p.underCoin||0) + (data.ucEarned||0)),
        };
        localStorage.setItem('rep_userProfile', JSON.stringify(np));
        return np;
      });
      // Günlük görev sayacı
      try {
        const today = new Date().toDateString();
        const dk = `day_${today}`;
        const s = JSON.parse(localStorage.getItem('rep_dailyTaskState')||'{}');
        s[dk] = {...(s[dk]||{}), dailyJobCount:((s[dk]?.dailyJobCount)||0)+1};
        localStorage.setItem('rep_dailyTaskState', JSON.stringify(s));
      } catch(e){}
      const ucMsg = data.ucEarned > 0 ? ` +${data.ucEarned} UC` : '';
      showNotif(`${job.emoji} +${fmtWord(data.earned)} kazandın! +${data.xpGain} XP${ucMsg}`, 'success');
    } catch (err) {
      showNotif('❌ Bağlantı hatası', 'error');
    } finally {
      setLoading(false);
    }
  };

  const playerLevel = profile?.level || 1;

  return (
    <div style={{padding:'1rem', background:bg, minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif", fontSize:'1.1rem', fontWeight:800, color:'#10B981', letterSpacing:'0.08em', marginBottom:'0.25rem'}}>💼 İŞLER</div>
      <div style={{fontSize:'0.75rem', color:'#5A7089', marginBottom:'1rem'}}>Butona bas, para kazan. Her iş için bekleme süresi var.</div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.65rem'}}>
        {JOBS_LIST.map(job => {
          const lastDone = cooldowns[job.id] || 0;
          const remaining = Math.max(0, job.cd - (Date.now() - lastDone));
          const onCd = remaining > 0;
          const locked = playerLevel < job.minLevel;
          const pct = onCd ? Math.round(((job.cd - remaining) / job.cd) * 100) : 100;
          return (
            <div key={job.id} style={{background:locked?'rgba(255,255,255,0.02)':card, border:`1px solid ${locked?border:onCd?'rgba(245,158,11,0.25)':'rgba(16,185,129,0.25)'}`, borderRadius:'16px', padding:'0.85rem', opacity:locked?0.5:1, display:'flex', flexDirection:'column', gap:'0.4rem', boxShadow:!locked&&!onCd?'0 2px 8px rgba(16,185,129,0.08)':'none'}}>
              <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                {job.svgIcon
                  ? <SvgIcon name={job.svgIcon} size={32} style={{filter:'drop-shadow(0 0 4px rgba(16,185,129,0.3))'}} />
                  : <span style={{fontSize:'1.75rem'}}>{job.emoji}</span>}
                <div style={{flex:1}}>
                  <div style={{fontSize:'0.83rem', fontWeight:800, color:dark?'#E8EDF2':'#1E293B'}}>{job.name}</div>
                  <div style={{fontSize:'0.7rem', color:'#10B981', fontWeight:700}}>+{fmtWord(job.earn)}</div>
                </div>
              </div>
              <div style={{fontSize:'0.62rem', color:'#5A7089', display:'flex', gap:'0.3rem', flexWrap:'wrap', alignItems:'center'}}>
                <span>⏱ {job.desc}</span>
                {job.req && <span style={{color:'#F59E0B', fontWeight:600}}>🔑 {job.req}</span>}
                {locked && <span style={{color:'#EF4444', fontWeight:700}}>🔒 Lv.{job.minLevel}</span>}
              </div>
              {onCd && (
                <div>
                  <div style={{height:'3px', background:'rgba(255,255,255,0.07)', borderRadius:'2px', overflow:'hidden', marginBottom:'2px'}}>
                    <div style={{height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#F59E0B,#FBBF24)', borderRadius:'2px', transition:'width 1s linear'}}/>
                  </div>
                  <div style={{fontSize:'0.62rem', color:'#F59E0B', fontWeight:700}}>⏳ {fmtCd(remaining)} kaldı</div>
                </div>
              )}
              <button onClick={() => !locked && doWork(job)} disabled={locked||onCd}
                style={{padding:'0.5rem', borderRadius:'10px', border:'none', background:locked?'rgba(255,255,255,0.04)':onCd?'rgba(245,158,11,0.1)':'linear-gradient(135deg,#10B981,#059669)', color:locked?'#3B4E63':onCd?'#F59E0B':'#fff', fontFamily:"'DM Sans',sans-serif", fontWeight:800, fontSize:'0.8rem', cursor:locked||onCd?'not-allowed':'pointer', transition:'all 0.15s', letterSpacing:'0.05em', opacity:onCd?0.8:1}}>
                {locked ? '🔒 KİLİTLİ' : onCd ? 'BEKLE...' : 'ÇALIŞ'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ORTAKLI İŞLER BÖLÜMü
// ═══════════════════════════════════════════════════════
const PARTNER_JOBS = [
  { cat:'LOJİSTİK', icon:'🚛', color:'#3B82F6', jobs:[
    { id:'city_log',  name:'Şehir İçi Lojistik',      dur:'Anında', cdLabel:'3 dk',  cdMs:3*60*1000,  slots:3, earn:50000,  tp:50,  minLevel:1 },
    { id:'inter_log', name:'Şehirlerarası Taşıma',    dur:'Anında', cdLabel:'5 dk',  cdMs:5*60*1000,  slots:2, earn:120000, tp:110, minLevel:1 },
  ]},
  { cat:'ÜRETİM', icon:'⚙️', color:'#F59E0B', jobs:[
    { id:'sub_prod',  name:'Taşeron Üretim Siparişi', dur:'Anında', cdLabel:'4 dk',  cdMs:4*60*1000,  slots:2, earn:125000, tp:120, minLevel:1 },
    { id:'factory_s', name:'Fabrika Vardiyası',        dur:'Anında', cdLabel:'8 dk',  cdMs:8*60*1000,  slots:2, earn:280000, tp:250, minLevel:1 },
  ]},
  { cat:'DIŞ TİCARET', icon:'🌐', color:'#10B981', jobs:[
    { id:'customs',   name:'Gümrük Beyannamesi Onayı', dur:'Anında', cdLabel:'6 dk',  cdMs:6*60*1000,  slots:2, earn:220000, tp:200, minLevel:1 },
    { id:'export',    name:'İhracat Anlaşması',         dur:'Anında', cdLabel:'10 dk', cdMs:10*60*1000, slots:1, earn:500000, tp:450, minLevel:1 },
  ]},
];

function PartnerJobsSection({ profile, setProfile, showNotif }) {
  const { dark } = useTheme();
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [cooldowns, setCooldowns] = useState(() => { try { return JSON.parse(localStorage.getItem('partnerJobCd')||'{}'); } catch { return {}; } });
  const [tick, setTick] = useState(0);
  const [partnerModal, setPartnerModal] = useState(null);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [allUsers] = useLs('users', []);
  useEffect(() => { const t = setInterval(() => setTick(p=>p+1), 1000); return () => clearInterval(t); }, []);

  const startJob = (job, partnerId) => {
    const lastDone = cooldowns[job.id] || 0;
    const remaining = job.cdMs - (Date.now() - lastDone);
    if (remaining > 0) {
      const s = Math.ceil(remaining/1000);
      const label = s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s/60)}dk` : `${Math.floor(s/3600)}sa`;
      showNotif(`⏳ ${label} kaldı!`, 'error');
      setPartnerModal(null);
      return;
    }
    const newCd = {...cooldowns, [job.id]: Date.now()};
    setCooldowns(newCd);
    localStorage.setItem('partnerJobCd', JSON.stringify(newCd));
    const shareEarn = Math.floor(job.earn * 0.5);
    const shareTP = Math.floor(job.tp * 0.5);
    setProfile(p => {
      const np = {...p, money:(p.money||0)+shareEarn, tradePoints:(p.tradePoints||0)+shareTP, xp:(p.xp||0)+30};
      localStorage.setItem('rep_userProfile', JSON.stringify(np));
      return np;
    });
    showNotif(`🤝 +${fmtWord(shareEarn)} + ${shareTP} TP kazandın!`, 'success');
    setPartnerModal(null);
  };

  const fmtRem = (ms) => {
    const s = Math.ceil(ms/1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}dk`;
    return `${Math.floor(s/3600)}sa`;
  };

  const allOtherUsers = (Array.isArray(allUsers) ? allUsers : []).filter(u => u.id !== profile?.id && !u.banned);
  const otherUsers = partnerSearch.trim()
    ? allOtherUsers.filter(u => u.username?.toLowerCase().includes(partnerSearch.trim().toLowerCase()) || (u.city||'').toLowerCase().includes(partnerSearch.trim().toLowerCase()))
    : allOtherUsers.slice(0, 20);

  return (
    <div style={{paddingBottom:'1rem'}}>
      <div style={{background:'linear-gradient(135deg,rgba(245,158,11,0.1),rgba(16,185,129,0.1))', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'14px', padding:'0.85rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.75rem'}}>
        <span style={{fontSize:'1.8rem'}}>🤝</span>
        <div>
          <div style={{fontWeight:800, color:'#F59E0B', fontSize:'0.9rem'}}>Ortaklı İşler</div>
          <div style={{fontSize:'0.72rem', color:'#5A7089'}}>Arkadaşlarınla iş yaparak karşılıklı para ve ticaret puanı kazan.</div>
        </div>
      </div>
      {PARTNER_JOBS.map(cat => (
        <div key={cat.cat} style={{marginBottom:'1.25rem'}}>
          <div style={{display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'0.6rem'}}>
            <span style={{fontSize:'1rem'}}>{cat.icon}</span>
            <span style={{fontSize:'0.68rem', fontWeight:800, color:cat.color, textTransform:'uppercase', letterSpacing:'0.1em'}}>{cat.cat}</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
            {cat.jobs.map(job => {
              const lastDone = cooldowns[job.id] || 0;
              const remaining = Math.max(0, job.cdMs - (Date.now() - lastDone));
              const onCd = remaining > 0;
              const locked = false; // Seviye gereksinimleri kaldırıldı
              return (
                <div key={job.id} style={{background:card, border:`1px solid ${border}`, borderRadius:'14px', padding:'0.85rem'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.5rem'}}>
                    <div>
                      <div style={{fontSize:'0.85rem', fontWeight:700, color:dark?'#E8EDF2':'#1E293B'}}>{job.name}</div>
                      <div style={{fontSize:'0.65rem', color:'#5A7089', marginTop:'2px', display:'flex', gap:'0.5rem'}}>
                        <span>⏱ {job.dur}</span>
                        <span>🔄 CD: {job.cdLabel}</span>
                        <span>👥 Kapasite: {job.slots}</span>
                      </div>
                    </div>
                    {onCd && <span style={{fontSize:'0.65rem', color:'#F59E0B', fontWeight:700, flexShrink:0}}>⏳ {fmtRem(remaining)}</span>}
                    {!onCd && !locked && <span style={{fontSize:'0.65rem', color:'#10B981', fontWeight:700, background:'rgba(16,185,129,0.1)', padding:'2px 7px', borderRadius:'6px', flexShrink:0}}>✓ Müsait</span>}
                    {locked && <span style={{fontSize:'0.65rem', color:'#EF4444', fontWeight:700, flexShrink:0}}>🔒 Kilitli</span>}
                  </div>
                  <div style={{display:'flex', gap:'0.75rem', marginBottom:'0.6rem'}}>
                    <span style={{fontSize:'0.75rem', color:'#10B981', fontWeight:700}}>💰 {fmtWord(job.earn)}</span>
                    <span style={{fontSize:'0.75rem', color:'#06B6D4', fontWeight:700}}>🤝 {job.tp} TP</span>
                  </div>
                  <button onClick={() => !locked && !onCd && setPartnerModal({job, cat})} disabled={locked||onCd}
                    style={{width:'100%', padding:'0.5rem', borderRadius:'10px', border:`1px solid ${locked||onCd?border:`${cat.color}44`}`, background:locked||onCd?'rgba(255,255,255,0.03)':`${cat.color}15`, color:locked||onCd?'#3B4E63':cat.color, fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'0.8rem', cursor:locked||onCd?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem'}}>
                    {locked ? '🔒 Kilitli' : onCd ? '⏳ Bekleniyor' : '👥 Ortak Seç & Gönder'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {partnerModal && (
        <div onClick={()=>setPartnerModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000,display:'flex',alignItems:'flex-end'}}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:'480px',margin:'0 auto',background:dark?'#1E293B':'#fff',borderRadius:'20px 20px 0 0',padding:'1.25rem',maxHeight:'70vh',overflowY:'auto'}}>
            <div style={{width:'32px',height:'3px',background:'rgba(255,255,255,0.1)',borderRadius:'2px',margin:'0 auto 1rem'}}/>
            <div style={{fontWeight:800,color:dark?'#E8EDF2':'#1E293B',marginBottom:'0.3rem'}}>👥 Ortak Seç</div>
            <div style={{fontSize:'0.75rem',color:'#5A7089',marginBottom:'0.65rem'}}>{partnerModal.job.name} — Her iki oyuncu da {fmtWord(Math.floor(partnerModal.job.earn/2))} + {Math.floor(partnerModal.job.tp/2)} TP kazanır.</div>
            <input
              value={partnerSearch}
              onChange={e=>setPartnerSearch(e.target.value)}
              placeholder="🔍 Oyuncu adı veya şehir ara..."
              style={{width:'100%',padding:'0.55rem 0.75rem',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'10px',color:dark?'#E8EDF2':'#1E293B',fontSize:'0.82rem',outline:'none',marginBottom:'0.65rem',fontFamily:"'DM Sans',sans-serif",boxSizing:'border-box'}}
            />
            {otherUsers.length === 0 && <div style={{color:'#5A7089',fontSize:'0.82rem',textAlign:'center',padding:'1rem'}}>{partnerSearch.trim() ? 'Sonuç bulunamadı.' : 'Kayıtlı başka oyuncu yok.'}</div>}
            {otherUsers.map(u => (
              <button key={u.id} onClick={() => startJob(partnerModal.job, u.id)}
                style={{width:'100%',display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.65rem',border:`1px solid ${border}`,borderRadius:'12px',background:'transparent',cursor:'pointer',marginBottom:'0.4rem',textAlign:'left'}}>
                <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'rgba(59,130,246,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0}}>
                  {u.gender==='kadin'?'👩':'👨'}
                </div>
                <div>
                  <div style={{fontSize:'0.85rem',fontWeight:700,color:dark?'#E8EDF2':'#1E293B'}}>{u.username}</div>
                  <div style={{fontSize:'0.67rem',color:'#5A7089'}}>Lv.{u.level||1} • {u.city||'?'}</div>
                </div>
                <span style={{marginLeft:'auto',fontSize:'0.72rem',color:'#10B981',fontWeight:700}}>→ Gönder</span>
              </button>
            ))}
            {otherUsers.length === 0 && (
              <button onClick={() => startJob(partnerModal.job, 'npc')}
                style={{width:'100%',padding:'0.65rem',border:'1px solid rgba(99,102,241,0.3)',borderRadius:'12px',background:'rgba(99,102,241,0.08)',color:'#818CF8',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.85rem',cursor:'pointer'}}>
                🤖 NPC ile Çalış
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ŞEHİR İNŞAAT SAYFASI
// ═══════════════════════════════════════════════════════
const CITY_BUILDINGS = [
  { id:'park',       emoji:'🌳', name:'Kent Parkı',          cost:50000,    time:5*60*1000,    effect:'happiness',     bonus:'+5 Mutluluk',   desc:'Şehir mutluluğunu artırır' },
  { id:'hospital',   emoji:'🏥', name:'Hastane',             cost:200000,   time:30*60*1000,   effect:'health',        bonus:'+10 Sağlık',    desc:'Şehir sağlık puanını artırır' },
  { id:'school',     emoji:'🏫', name:'İlköğretim Okulu',    cost:150000,   time:20*60*1000,   effect:'education',     bonus:'+8 Eğitim',     desc:'Eğitim skoru yükselir' },
  { id:'police',     emoji:'🚔', name:'Polis Karakolu',      cost:100000,   time:15*60*1000,   effect:'security',      bonus:'+7 Güvenlik',   desc:'Suç oranını düşürür' },
  { id:'market',     emoji:'🏪', name:'Çarşı',               cost:80000,    time:10*60*1000,   effect:'economy',       bonus:'+3% Gelir',     desc:'Ekonomiyi canlandırır' },
  { id:'library',    emoji:'📚', name:'Kütüphane',           cost:120000,   time:25*60*1000,   effect:'education',     bonus:'+6 Eğitim',     desc:'Eğitim ve XP artışı' },
  { id:'stadium',    emoji:'🏟️', name:'Stadyum',             cost:500000,   time:60*60*1000,   effect:'happiness',     bonus:'+15 Mutluluk',  desc:'Büyük mutluluk bonusu' },
  { id:'factory',    emoji:'🏭', name:'Fabrika',             cost:300000,   time:45*60*1000,   effect:'economy',       bonus:'+5% Gelir',     desc:'Üretim geliri sağlar' },
  { id:'university', emoji:'🎓', name:'Üniversite',          cost:800000,   time:120*60*1000,  effect:'education',     bonus:'+20 Eğitim',    desc:'Maksimum eğitim bonusu' },
  { id:'metro',      emoji:'🚇', name:'Metro Hattı',         cost:1000000,  time:180*60*1000,  effect:'infrastructure', bonus:'+10 Altyapı',  desc:'Şehir altyapısını geliştirir' },
  { id:'tower',      emoji:'🏗️', name:'Gökdelen',            cost:2000000,  time:240*60*1000,  effect:'economy',       bonus:'+25 Ekonomi',   desc:'Finans merkezi', minLevel:10 },
  { id:'airport',    emoji:'✈️', name:'Havalimanı',          cost:5000000,  time:480*60*1000,  effect:'economy',       bonus:'+50 Ekonomi',   desc:'Uluslararası ticaret', minLevel:20 },
];

function CityBuildPage({ profile, setProfile, showNotif }) {
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [buildings, setBuildings] = useLs('cityBuildings', {});
  const [constructions, setConstructions] = useLs('cityConstructions', {});
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(p=>p+1), 2000); return () => clearInterval(t); }, []);

  const effectColors = { happiness:'#EC4899', health:'#10B981', education:'#3B82F6', security:'#F59E0B', economy:'#10B981', infrastructure:'#8B5CF6' };
  const effectLabels = { happiness:'Mutluluk', health:'Sağlık', education:'Eğitim', security:'Güvenlik', economy:'Ekonomi', infrastructure:'Altyapı' };

  const cityStats = useMemo(() => {
    const stats = { happiness:40, health:40, education:40, security:40, economy:40, infrastructure:40 };
    Object.keys(buildings).forEach(bid => {
      const b = CITY_BUILDINGS.find(x=>x.id===bid);
      if (b) {
        const v = parseInt(b.bonus.replace(/[^0-9]/g,'')) || 5;
        stats[b.effect] = Math.min(100, (stats[b.effect]||40) + v);
      }
    });
    return stats;
  }, [buildings]);

  const overallScore = () => {
    const vals = Object.values(cityStats);
    const avg = Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
    if (avg>=90) return {grade:'S',color:'#FFD700'};
    if (avg>=80) return {grade:'A',color:'#10B981'};
    if (avg>=70) return {grade:'B',color:'#3B82F6'};
    if (avg>=60) return {grade:'C',color:'#F59E0B'};
    return {grade:'D',color:'#EF4444'};
  };
  const { grade, color } = overallScore();

  const build = (b) => {
    if ((profile?.money||0) < b.cost) { showNotif('Yeterli paran yok!', 'error'); return; }
    if (buildings[b.id]) { showNotif('Bu bina zaten inşa edildi!', 'error'); return; }
    if (constructions[b.id]) { showNotif('Bu bina zaten inşa ediliyor!', 'error'); return; }
    if (b.minLevel && (profile?.level||1) < b.minLevel) { showNotif(`Seviye ${b.minLevel} gerekli!`, 'error'); return; }
    setProfile(p => { const np={...p,money:(p.money||0)-b.cost}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setConstructions(prev => ({...prev, [b.id]:{startedAt:Date.now(), finishAt:Date.now()+b.time}}));
    showNotif(`🏗️ ${b.emoji} ${b.name} inşaatı başladı!`, 'success');
  };

  const collect = (b) => {
    const c = constructions[b.id];
    if (!c || Date.now() < c.finishAt) { showNotif('İnşaat henüz bitmedi!', 'error'); return; }
    setConstructions(prev => { const n={...prev}; delete n[b.id]; return n; });
    setBuildings(prev => ({...prev, [b.id]:true}));
    setProfile(p => { const np={...p,xp:(p.xp||0)+500}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`✅ ${b.emoji} ${b.name} tamamlandı! +500 XP`, 'success');
  };

  const fmtTime = (ms) => {
    const s = Math.ceil(ms/1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}dk`;
    return `${Math.floor(s/3600)}sa ${Math.floor((s%3600)/60)}dk`;
  };

  return (
    <div style={{padding:'1rem', background:bg, minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif", fontSize:'1.1rem', fontWeight:800, color:'#F59E0B', letterSpacing:'0.08em', marginBottom:'1rem'}}>🏗️ ŞEHİR İNŞAAT</div>

      {/* Şehir İstatistik Paneli */}
      <div style={{background:'linear-gradient(135deg,#1A2744,#0F1C38)', borderRadius:'16px', padding:'1rem', marginBottom:'1rem', border:'1px solid rgba(59,130,246,0.15)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem'}}>
          <div style={{fontSize:'0.72rem', color:'#60A5FA', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em'}}>📊 Şehir İstatistikleri</div>
          <div style={{background:`${color}20`, border:`1px solid ${color}50`, borderRadius:'10px', padding:'0.25rem 0.75rem', fontSize:'1.1rem', fontWeight:900, color}}>{grade} Sınıfı</div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.45rem'}}>
          {Object.entries(cityStats).map(([k,v]) => (
            <div key={k}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.62rem', marginBottom:'2px'}}>
                <span style={{color:'rgba(255,255,255,0.5)'}}>{effectLabels[k]||k}</span>
                <span style={{color:effectColors[k]||'#fff', fontWeight:700}}>{v}/100</span>
              </div>
              <div style={{height:'4px', background:'rgba(255,255,255,0.07)', borderRadius:'2px', overflow:'hidden'}}>
                <div style={{height:'100%', width:`${v}%`, background:effectColors[k]||'#3B82F6', borderRadius:'2px', transition:'width 0.5s'}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Binalar */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.65rem'}}>
        {CITY_BUILDINGS.map(b => {
          const built = !!buildings[b.id];
          const cons = constructions[b.id];
          const inProgress = cons && Date.now() < cons.finishAt;
          const done = cons && Date.now() >= cons.finishAt;
          const remaining = cons ? Math.max(0, cons.finishAt - Date.now()) : 0;
          const pct = cons ? Math.min(100, Math.round(((Date.now()-cons.startedAt)/(cons.finishAt-cons.startedAt))*100)) : 0;
          const locked = b.minLevel && (profile?.level||1) < b.minLevel;

          return (
            <div key={b.id} style={{background:built?`${effectColors[b.effect]}08`:card, border:`1px solid ${built?effectColors[b.effect]+'44':border}`, borderRadius:'16px', padding:'0.85rem', display:'flex', flexDirection:'column', gap:'0.4rem', opacity:locked&&!built?0.5:1}}>
              <div style={{display:'flex', alignItems:'center', gap:'0.4rem'}}>
                <span style={{fontSize:'1.6rem'}}>{b.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:'0.8rem', fontWeight:800, color:dark?'#E8EDF2':'#1E293B'}}>{b.name}</div>
                  <div style={{fontSize:'0.65rem', color:effectColors[b.effect]||'#10B981', fontWeight:700}}>{b.bonus}</div>
                </div>
              </div>
              <div style={{fontSize:'0.62rem', color:'#5A7089'}}>{b.desc}</div>

              {built && (
                <div style={{padding:'0.35rem 0.5rem', borderRadius:'8px', background:`${effectColors[b.effect]}15`, border:`1px solid ${effectColors[b.effect]}33`, fontSize:'0.7rem', fontWeight:700, color:effectColors[b.effect], textAlign:'center'}}>✅ İnşa Edildi</div>
              )}
              {inProgress && (
                <div>
                  <div style={{height:'4px', background:'rgba(255,255,255,0.07)', borderRadius:'2px', overflow:'hidden', marginBottom:'3px'}}>
                    <div style={{height:'100%', width:`${pct}%`, background:'#F59E0B', borderRadius:'2px', transition:'width 2s linear'}}/>
                  </div>
                  <div style={{fontSize:'0.62rem', color:'#F59E0B', fontWeight:700}}>🏗️ {fmtTime(remaining)} kaldı</div>
                </div>
              )}
              {done && (
                <button onClick={() => collect(b)} style={{padding:'0.45rem', borderRadius:'9px', border:'1px solid rgba(16,185,129,0.4)', background:'rgba(16,185,129,0.12)', color:'#10B981', fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'0.78rem', cursor:'pointer'}}>
                  ✅ Teslim Al
                </button>
              )}
              {!built && !cons && (
                <button onClick={() => !locked && build(b)} disabled={!!locked}
                  style={{padding:'0.45rem', borderRadius:'9px', border:`1px solid ${locked?border:'rgba(245,158,11,0.4)'}`, background:locked?'rgba(255,255,255,0.03)':'rgba(245,158,11,0.1)', color:locked?'#3B4E63':'#F59E0B', fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'0.72rem', cursor:locked?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.3rem'}}>
                  {locked ? `🔒 Lv.${b.minLevel}` : `🏗️ ${fmtWord(b.cost)}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// WİKİ SAYFASI
// ═══════════════════════════════════════════════════════
function WikiPage({ profile }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { dark } = useTheme();
  const articles = [
    { id:'basics', icon:'🎮', cat:'Temel', title:'Oyuna Başlangıç', content:`UNDERSTATE'e hoş geldin! Kullanıcı adın ve şifrenle giriş yap. Başlangıçta ₺10.000 nakit ve ₺5.000 banka bakiyen olur.\n\n• Görevleri tamamla → Para ve XP kazan\n• XP ile seviye atla → Yeni özellikler aç\n• Ticaret yap → Ticaret puanı kazan\n• Seçimlere katıl → Siyasi güç kazan\n\n📅 Günlük görevleri tamamla → Ekstra ödül kazan\n🏆 Başarımları tamamla → Özel rozetler kazan` },
    { id:'levels', icon:'⭐', cat:'Temel', title:'Seviye & XP Sistemi', content:`XP kazanarak seviye atlarsın.\n\n• İş yap → +10–50 XP\n• Görev tamamla → +50–250 XP\n• PvP kazanma → +100 XP\n• Fabrika üretimi → +200 XP\n• Günlük login → +50 XP\n\nSeviyeler:\nLv.1–5: Çaylak\nLv.6–15: Vatandaş\nLv.16–30: Girişimci\nLv.31–50: Lider\nLv.51–75: Elit\nLv.76–99: Efsane\nLv.100: Cumhurbaşkanı\n\n⚠️ Parti kurabilmek için Lise diploması gerekir.` },
    { id:'edu', icon:'🎓', cat:'Eğitim', title:'Eğitim Sistemi', content:`Eğitim tıklama tabanlı bir sistemdir.\n\n📚 Eğitim seviyeleri:\n• İlkokul → 50 tıklama (ücretsiz)\n• Ortaokul → 100 tıklama (₺500/tıklama)\n• Lise → 200 tıklama (₺1.000/tıklama)\n• Üniversite → 500 tıklama (₺5.000/tıklama)\n• Yüksek Lisans → 1000 tıklama (₺20.000/tıklama)\n• Doktora → 2000 tıklama (₺50.000/tıklama)\n\n⏱️ Bekleme süresi:\n• Normal: 5 dakika\n• VIP: 2.5 dakika\n• Eğitim Paketi: 1 saniye\n\n🎓 Diploma → Yüksek makamlara aday olma hakkı\n🏛️ Lise diploması → Parti kurabilme\n🎓 Üniversite → Bakanlık pozisyonu` },
    { id:'economy', icon:'💰', cat:'Ekonomi', title:'Ekonomi & Şirketler', content:`Ekonomi sisteminde:\n\n• Şirket kur → Günlük kâr kazan\n• Borsa → Hisse al/sat (5 sektör: Teknoloji, Enerji, Banka, Tarım, Savunma)\n• Banka → Faiz kazan, kredi al\n• Tarım → Ürün yetiştir (Buğday, Mısır, Domates...)\n• Hayvancılık → Hayvan besle ve sat\n• Fabrika → Hammadde işle, ürün sat\n• Maden → Kaynak çıkar\n\n💡 İpucu: Çeşitli sektörlere yatırım yap, riski dağıt!` },
    { id:'politics', icon:'🏛️', cat:'Siyaset', title:'Siyaset & Seçimler', content:`Siyaset bölümünde:\n\n• Parti kur (Lise diploması gerekir, ₺500.000 kuruluş ücreti)\n• Partiye üye ol\n• Yasalar için oy ver\n• Devlet başkanlığına aday ol\n\n🗳️ Oy ağırlığı ticaret sıralamasına göre artar:\n  - 1. sıra: 6x oy gücü\n  - 2. sıra: 4x oy gücü\n  - 3–5. sıra: 3x oy gücü\n  - 6–50. sıra: 2x oy gücü\n  - 51+. sıra: 1x oy gücü\n\n⭐ Liyakat puanı yüksek oyuncular seçimde avantajlı` },
    { id:'penalties', icon:'⚖️', cat:'Hukuk', title:'Ceza Sistemi', content:`UNDERSTATE'de suç ve ceza sistemi:\n\n🚔 Suçlar ve Cezalar:\n• Hırsızlık → ₺50.000 para cezası veya 2 saat hapis\n• Saldırı → ₺100.000 para cezası veya 4 saat hapis\n• Dolandırıcılık → ₺250.000 para cezası veya 8 saat hapis\n• Organize suç → ₺1.000.000 para cezası veya 24 saat hapis\n• Kara para aklama → Hesap dondurma + ₺5.000.000 ceza\n\n⚖️ Mahkeme Süreci:\n• Suçlama yapıldığında avukat tutulabilir\n• Avukat: Cezayı %50 azaltır (₺200.000 ücret)\n• İtiraz hakkı: 24 saat içinde kullanılabilir\n• Temyiz: Mahkeme kararını değiştirme şansı %30\n\n🏛️ Hapis:\n• Hapis süresince oyun aksiyonları kısıtlanır\n• Firar: %40 başarı şansı, başarısızda süre 2x\n• Rüşvet: ₺500.000 karşılığı serbest bırakılma\n\n💡 İpucu: Temiz sicil = Siyasi avantaj!` },
    { id:'court', icon:'🏛️', cat:'Hukuk', title:'Mahkeme & Hukuk', content:`Mahkeme sistemi:\n\n📋 Davalar:\n• Sivil davalar → Para ödeme kararı\n• Ceza davaları → Hapis veya para cezası\n• Ticari davalar → Şirket varlık el koyma riski\n\n⚖️ Avukat Sistemi:\n• Uzman avukat → %70 kazanma şansı (₺500.000)\n• Normal avukat → %50 kazanma şansı (₺150.000)\n• Kendi savunma → %25 kazanma şansı (ücretsiz)\n\n🏛️ Yargıtay:\n• En yüksek mahkeme\n• Başkan tarafından atanır\n• Anayasa değişikliklerini denetler\n\n📌 Önemli: Hukuk puanın yüksek olması yargıda avantaj sağlar!` },
    { id:'police', icon:'🚔', cat:'Hukuk', title:'Polis & Güvenlik', content:`Polis sistemi:\n\n👮 Polis Görevi:\n• Suçluları yakala → Ödül kazan\n• Çete operasyonları → Ekstra liyakat puanı\n• Uyuşturucu baskını → Büyük ödül\n\n🔍 Aranan Listesi:\n• Suç puanı 100+ → Aranan listesine girersin\n• Polisler seni yakalayabilir\n• Aranan iken bazı bölgelere giremezsin\n\n🛡️ Güvenlik Seviyeleri:\n• Yeşil → Normal vatandaş\n• Sarı → Şüpheli (1–50 suç puanı)\n• Turuncu → Aranan (51–100 suç puanı)\n• Kırmızı → En çok aranan (100+ suç puanı)\n\n💡 İpucu: Polisin içine sızabilirsin — ajan ol!` },
    { id:'football', icon:'⚽', cat:'Futbol', title:'Futbol Yönetimi', content:`Futbol bölümünde:\n\n• Kulüp kur (₺2.000.000)\n• Oyuncu satın al (transfer pazarı)\n• Antrenman yap → İstatistik artır\n• Taktik seç: 4-4-2, 4-3-3, 3-5-2...\n• Altyapı geliştir: Stadyum, akademi, sağlık merkezi\n• Lig maçları oyna → Para ve taraftar kazan\n• Şampiyon ol → Kupa & prestij kazan\n\n🏆 Lig Seviyeleri: 3. Lig → 2. Lig → 1. Lig → Süper Lig\n💡 Güçlü taktik + iyi oyuncular = Şampiyonluk!` },
    { id:'army', icon:'⚔️', cat:'Ordu', title:'Ordu & Savaş', content:`Ordu bölümünde:\n\n• Asker al (₺10.000/asker)\n• Silah satın al: Tüfek, Tank, Topçu, Uçak\n• Diğer şehirlere saldır → Kaynak ele geçir\n• Savunma hattı kur → Şehri koru\n• Konum puanı artır → Daha güçlü saldırılar\n\n⚔️ Savaş Mekanizması:\n• Saldırı = (Asker × Silah Gücü) × Rastgele[0.8–1.2]\n• Savunma güçlüyse → Saldırı başarısız\n• Başarılı saldırı → Para + Arazi kazan\n• Başarısız saldırı → Asker kaybı\n\n🛡️ NATO ve Birlikler için İttifak bölümüne bak!` },
    { id:'crime', icon:'🔫', cat:'Suç', title:'Çete & Suç Dünyası', content:`Çete bölümünde:\n\n• Çete kur veya üye ol (minimum 3 kişi)\n• Suç işle → Para kazan (riskli!)\n• Çete savaşları → Bölge kontrolü\n• Organize suç örgütü kur\n• Kara para akla → Meşru para haline getir (riskli)\n\n⚠️ Risk Tablosu:\n• Ufak hırsızlık: %30 yakalanma riski\n• Soygun: %50 yakalanma riski\n• Silahlı saldırı: %70 yakalanma riski\n• Cinayet: %90 yakalanma riski\n\n💡 Yüksek suç puanı → Polis tarafından aranırsın!` },
    { id:'premium', icon:'👑', cat:'Premium', title:'VIP & Paketler', content:`Premium özellikler:\n\n👑 VIP Üyelik:\n• Tüm bekleme sürelerinde %50 azalma\n• Profil çerçevesi\n• Ekstra ₺50.000 başlangıç\n• Özel VIP rozeti\n• Günlük 500 UC bonus\n\n📚 Eğitim Paketi:\n• Her tıklamada 1sn bekleme (normal: 5dk)\n• Sadece eğitim için geçerli\n• VIP ile birleştirilebilir\n\n🪙 UnderCoin (UC):\n• Özel para birimi\n• VIP alımı, özel eşyalar için kullanılır\n• Günlük görevlerden kazanılabilir` },
    { id:'alliance', icon:'🤝', cat:'Siyaset', title:'İttifaklar & Diplomasi', content:`İttifak sisteminde:\n\n• İttifak kur (minimum 5 üye)\n• Diğer şehirlerle ticaret anlaşması yap\n• Savunma paktı → Saldırıya uğrayan üyeyi koru\n• Ekonomik birlik → Ortak vergi indirimi\n\n🌍 Küresel İttifaklar:\n• G5 (5 büyük güç) → Dünya ekonomisini yönetir\n• Askeri İttifak → Ortak savaş gücü\n• Ticaret Birliği → Düşük tarifeler\n\n⚠️ İttifak bozulursa 7 gün soğuma süresi uygulanır!` },
  ];
  const filtered = articles.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase()) || a.cat.toLowerCase().includes(search.toLowerCase())
  );
  const cats = [...new Set(articles.map(a=>a.cat))];
  return (
    <div style={{padding:'0.7rem',paddingBottom:'5rem'}}>
      <div style={{background:'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(11,21,39,0.97))',border:'1px solid rgba(59,130,246,0.25)',borderRadius:'18px',padding:'1.2rem',marginBottom:'0.75rem',textAlign:'center'}}>
        <div style={{fontSize:'2rem',marginBottom:'0.3rem'}}>📚</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.15rem',fontWeight:900,color:'#E8EDF2'}}>WİKİ</div>
        <div style={{fontSize:'0.72rem',color:'#5A7089',marginTop:'0.2rem'}}>Oyun hakkında her şeyi öğren</div>
      </div>
      <div style={{marginBottom:'0.75rem'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Ara..."
          style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'0.65rem 1rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'}} />
      </div>
      {selected ? (
        <div>
          <button onClick={()=>setSelected(null)} style={{background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:'8px',padding:'0.4rem 0.8rem',color:'#60A5FA',cursor:'pointer',marginBottom:'0.75rem',fontSize:'0.82rem',fontWeight:700,fontFamily:'inherit'}}>← Geri</button>
          <div style={{background:'rgba(11,21,39,0.95)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'14px',padding:'1.1rem'}}>
            <div style={{fontSize:'2rem',marginBottom:'0.35rem'}}>{selected.icon}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,color:'#E8EDF2',fontSize:'1.05rem',marginBottom:'0.25rem'}}>{selected.title}</div>
            <div style={{display:'inline-block',background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:'6px',padding:'2px 8px',fontSize:'0.65rem',color:'#60A5FA',fontWeight:700,marginBottom:'0.75rem'}}>{selected.cat}</div>
            <div style={{fontSize:'0.85rem',color:'#CBD5E1',lineHeight:1.7,whiteSpace:'pre-line'}}>{selected.content}</div>
          </div>
        </div>
      ) : (
        <div>
          {cats.map(cat => {
            const catArticles = filtered.filter(a=>a.cat===cat);
            if (!catArticles.length) return null;
            return (
              <div key={cat} style={{marginBottom:'1rem'}}>
                <div style={{fontSize:'0.65rem',fontWeight:800,color:'#5A7089',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.4rem'}}>{cat}</div>
                {catArticles.map(a=>(
                  <button key={a.id} onClick={()=>setSelected(a)} style={{width:'100%',display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',cursor:'pointer',marginBottom:'0.35rem',textAlign:'left',fontFamily:"'DM Sans',sans-serif"}}>
                    <span style={{fontSize:'1.4rem',flexShrink:0}}>{a.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.88rem'}}>{a.title}</div>
                      <div style={{fontSize:'0.67rem',color:'#5A7089',marginTop:'1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.content.split('\n')[0]}</div>
                    </div>
                    <span style={{color:'#5A7089',flexShrink:0}}>›</span>
                  </button>
                ))}
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{textAlign:'center',color:'#5A7089',padding:'2rem'}}>Arama sonucu bulunamadı.</div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// HAYVANCILİK BİLEŞENİ
// ═══════════════════════════════════════════════════════
const LIVESTOCK_TYPES = [
  { id:'inek',   icon:'🐄', label:'İnek',     cost:5000,   feedCost:500,  sellPrice:15000,  growTime:10*60*1000, product:'🥛 Süt', productValue:2000  },
  { id:'tavuk',  icon:'🐔', label:'Tavuk',    cost:500,    feedCost:50,   sellPrice:2000,   growTime:3*60*1000,  product:'🥚 Yumurta', productValue:200 },
  { id:'koyun',  icon:'🐑', label:'Koyun',    cost:3000,   feedCost:300,  sellPrice:10000,  growTime:7*60*1000,  product:'🧶 Yün', productValue:1500  },
  { id:'domuz',  icon:'🐖', label:'Domuz',    cost:2000,   feedCost:200,  sellPrice:8000,   growTime:5*60*1000,  product:'🥩 Et', productValue:3000   },
  { id:'at',     icon:'🐴', label:'At',       cost:50000,  feedCost:5000, sellPrice:200000, growTime:30*60*1000, product:'🏇 Yarış', productValue:20000 },
];

const BARN_LEVELS = [
  { lvl:1, capacity:4,  upgradeCost:20000,  label:'Küçük Ahır' },
  { lvl:2, capacity:8,  upgradeCost:60000,  label:'Orta Ahır'  },
  { lvl:3, capacity:15, upgradeCost:150000, label:'Büyük Ahır' },
  { lvl:4, capacity:25, upgradeCost:400000, label:'Çiftlik'    },
  { lvl:5, capacity:40, upgradeCost:null,   label:'Mega Çiftlik (MAX)' },
];

function LivestockSection({ profile, setProfile, showNotif }) {
  const [animals, setAnimals] = useLs('rep_livestock', []);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(()=>setNow(Date.now()), 5000); return ()=>clearInterval(t); }, []);

  const barnLvl = Math.min(5, Math.max(1, profile?.barnLevel || 1));
  const barnInfo = BARN_LEVELS.find(b=>b.lvl===barnLvl) || BARN_LEVELS[0];
  const capacity = barnInfo.capacity;
  const nextBarn = BARN_LEVELS.find(b=>b.lvl===barnLvl+1);

  const upgradeBarn = () => {
    if (!nextBarn) { showNotif('Ahır zaten maksimum seviyede!', 'info'); return; }
    if ((profile?.money||0) < nextBarn.upgradeCost) { showNotif(`Geliştirmek için ${fmtWord(nextBarn.upgradeCost)} gerekli`, 'error'); return; }
    setProfile(p => { const np={...p, money:(p.money||0)-nextBarn.upgradeCost, barnLevel:(barnLvl+1)}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`🏚️ Ahır Lv.${barnLvl+1} oldu! Kapasite: ${nextBarn.capacity} hayvan`, 'success');
  };

  const buyAnimal = (type) => {
    if (animals.length >= capacity) { showNotif(`Ahır dolu! (${capacity}/${capacity}) Geliştir →`, 'error'); return; }
    if ((profile?.money||0) < type.cost) { showNotif(`${fmtWord(type.cost)} gerekli`, 'error'); return; }
    const animal = { id: Date.now(), typeId: type.id, boughtAt: Date.now(), fed: Date.now(), mature: Date.now() + type.growTime };
    setAnimals(prev => [...prev, animal]);
    setProfile(p => { const np={...p,money:(p.money||0)-type.cost}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`✅ ${type.icon} ${type.label} satın alındı!`, 'success');
  };

  const feedAnimal = (animal) => {
    const type = LIVESTOCK_TYPES.find(t=>t.id===animal.typeId);
    if (!type) return;
    if ((profile?.money||0) < type.feedCost) { showNotif(`Yem için ${fmtWord(type.feedCost)} gerekli`, 'error'); return; }
    setAnimals(prev => prev.map(a => a.id===animal.id ? {...a, fed: Date.now()} : a));
    setProfile(p => { const np={...p,money:(p.money||0)-type.feedCost}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`🌾 Beslendi!`, 'success');
  };

  const collectProduct = (animal) => {
    const type = LIVESTOCK_TYPES.find(t=>t.id===animal.typeId);
    if (!type) return;
    if (now < animal.mature) { showNotif('Hayvan henüz olgunlaşmadı!', 'error'); return; }
    setAnimals(prev => prev.map(a => a.id===animal.id ? {...a, mature: Date.now() + type.growTime} : a));
    setProfile(p => { const np={...p,money:(p.money||0)+type.productValue,tradePoints:(p.tradePoints||0)+10}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`${type.product} toplandı! +${fmtWord(type.productValue)}`, 'success');
  };

  const sellAnimal = (animal) => {
    const type = LIVESTOCK_TYPES.find(t=>t.id===animal.typeId);
    if (!type) return;
    setAnimals(prev => prev.filter(a => a.id !== animal.id));
    setProfile(p => { const np={...p,money:(p.money||0)+type.sellPrice}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`💰 ${type.icon} ${type.label} satıldı: +${fmtWord(type.sellPrice)}`, 'success');
  };

  return (
    <div>
      {/* Ahır Bilgi & Geliştirme */}
      <div style={{background:'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(11,21,39,0.97))',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'14px',padding:'0.9rem',marginBottom:'0.75rem'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.5rem'}}>
          <div>
            <div style={{fontWeight:800,color:'#10B981',fontSize:'0.9rem'}}>🏚️ {barnInfo.label}</div>
            <div style={{fontSize:'0.7rem',color:'#5A7089',marginTop:'0.1rem'}}>Kapasite: {animals.length} / {capacity} hayvan</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'0.6rem',color:'#5A7089',marginBottom:'0.2rem'}}>Ahır Lv.{barnLvl}</div>
            {nextBarn ? (
              <button onClick={upgradeBarn} style={{padding:'0.35rem 0.75rem',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.35)',borderRadius:'8px',color:'#F59E0B',cursor:'pointer',fontWeight:700,fontSize:'0.72rem',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                ⬆️ Lv.{barnLvl+1} • {fmtWord(nextBarn.upgradeCost)}
              </button>
            ) : (
              <span style={{fontSize:'0.65rem',color:'#10B981',fontWeight:700}}>✅ MAX</span>
            )}
          </div>
        </div>
        {/* Kapasite bar */}
        <div style={{height:'5px',background:'rgba(255,255,255,0.06)',borderRadius:'3px',overflow:'hidden'}}>
          <div style={{height:'100%',width:`${Math.min(100,Math.round(animals.length/capacity*100))}%`,background:animals.length>=capacity?'#EF4444':'#10B981',borderRadius:'3px',transition:'width 0.5s'}} />
        </div>
      </div>
      {/* Satın al */}
      <div style={{fontSize:'0.68rem',fontWeight:700,color:'#5A7089',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.4rem'}}>Hayvan Satın Al {animals.length>=capacity && <span style={{color:'#EF4444'}}>— Ahır Dolu!</span>}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem',marginBottom:'0.75rem'}}>
        {LIVESTOCK_TYPES.map(type=>(
          <button key={type.id} onClick={()=>buyAnimal(type)}
            style={{padding:'0.7rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',cursor:'pointer',textAlign:'center',fontFamily:"'DM Sans',sans-serif"}}>
            <div style={{fontSize:'1.5rem',marginBottom:'0.2rem'}}>{type.icon}</div>
            <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.8rem'}}>{type.label}</div>
            <div style={{fontSize:'0.65rem',color:'#EF4444'}}>{fmtWord(type.cost)}</div>
            <div style={{fontSize:'0.62rem',color:'#10B981'}}>{type.product}: {fmtWord(type.productValue)}</div>
          </button>
        ))}
      </div>
      {/* Ahır */}
      <div style={{fontSize:'0.68rem',fontWeight:700,color:'#5A7089',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.4rem'}}>Ahırım ({animals.length} hayvan)</div>
      {animals.length === 0 && <div style={{textAlign:'center',color:'#5A7089',padding:'1.5rem',fontSize:'0.85rem'}}>Henüz hayvanın yok. Yukarıdan satın al!</div>}
      {animals.map(animal => {
        const type = LIVESTOCK_TYPES.find(t=>t.id===animal.typeId);
        if (!type) return null;
        const isMature = now >= animal.mature;
        const pct = isMature ? 100 : Math.round((now - (animal.mature - type.growTime)) / type.growTime * 100);
        const rem = Math.max(0, animal.mature - now);
        const remStr = rem < 60000 ? `${Math.ceil(rem/1000)}sn` : `${Math.floor(rem/60000)}dk`;
        return (
          <div key={animal.id} style={{background:'rgba(11,21,39,0.9)',border:`1px solid ${isMature?'rgba(16,185,129,0.35)':'rgba(255,255,255,0.06)'}`,borderRadius:'12px',padding:'0.75rem',marginBottom:'0.4rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.65rem'}}>
              <div style={{fontSize:'1.75rem',flexShrink:0}}>{type.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.85rem'}}>{type.label}</div>
                <div style={{height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',margin:'0.3rem 0'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:isMature?'#10B981':'#F59E0B',borderRadius:'2px',transition:'width 0.5s'}} />
                </div>
                <div style={{fontSize:'0.65rem',color:'#5A7089'}}>{isMature ? `✅ ${type.product} hazır!` : `⏳ ${remStr} kaldı`}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.3rem'}}>
                {isMature && <button onClick={()=>collectProduct(animal)} style={{padding:'0.3rem 0.55rem',background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.35)',borderRadius:'7px',color:'#10B981',cursor:'pointer',fontWeight:700,fontSize:'0.7rem',fontFamily:'inherit',whiteSpace:'nowrap'}}>Topla</button>}
                <button onClick={()=>feedAnimal(animal)} style={{padding:'0.3rem 0.55rem',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:'7px',color:'#F59E0B',cursor:'pointer',fontWeight:700,fontSize:'0.7rem',fontFamily:'inherit'}}>🌾 Besle</button>
                <button onClick={()=>sellAnimal(animal)} style={{padding:'0.3rem 0.55rem',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'7px',color:'#F87171',cursor:'pointer',fontWeight:700,fontSize:'0.7rem',fontFamily:'inherit'}}>Sat</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ÖZEL MESAJLAŞMA SAYFASI
// ═══════════════════════════════════════════════════════
function DirectMessagesPage({ profile, setProfile, showNotif }) {
  const [messages, setMessages] = useLs('rep_directMessages', []);
  const [convWith, setConvWith] = useState(null);
  const [input, setInput] = useState('');
  const [dmSearch, setDmSearch] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [giphyResults, setGiphyResults] = useState([]);
  const [giphyLoading, setGiphyLoading] = useState(false);
  const cu = profile || {};
  const msgsEndRef = useRef(null);
  const allUsers = (()=>{try{return JSON.parse(localStorage.getItem('rep_users')||'[]');}catch{return[];}})();
  const contacts = allUsers.filter(u => u.id !== cu.id && !u.banned);

  const DM_POPULAR_GIFS = [
    'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
    'https://media.giphy.com/media/l0HlFZ3HqbGrMTBQs/giphy.gif',
    'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    'https://media.giphy.com/media/xT9IgG50Lg7russbBO/giphy.gif',
    'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    'https://media.giphy.com/media/TdfyKrN7HGTIY/giphy.gif',
    'https://media.giphy.com/media/3oEdv22bMDaqXkOIPS/giphy.gif',
    'https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif',
  ];
  const dmDisplayGifs = giphyResults.length > 0 ? giphyResults : DM_POPULAR_GIFS;
  const gifRx = /(https?:\/\/(?:media\.giphy\.com|i\.giphy\.com|media\d*\.giphy\.com|tenor\.com|c\.tenor\.com)\S+)/i;

  useEffect(() => {
    if (!showGifPicker) return;
    const q = gifSearch.trim();
    const timer = setTimeout(async () => {
      setGiphyLoading(true);
      try {
        const endpoint = q ? `/api/giphy-search?q=${encodeURIComponent(q)}&limit=20` : '/api/giphy-trending?limit=20';
        const r = await fetch(endpoint);
        const data = await r.json();
        if (data && Array.isArray(data.data)) {
          setGiphyResults(data.data.map(g => g.images?.fixed_height?.url || g.images?.downsized?.url || '').filter(Boolean));
        }
      } catch(e) { setGiphyResults([]); }
      setGiphyLoading(false);
    }, q ? 500 : 0);
    return () => clearTimeout(timer);
  }, [gifSearch, showGifPicker]);

  const getConvMsgs = (uid) => messages.filter(m=>(m.from===cu.id&&m.to===uid)||(m.from===uid&&m.to===cu.id)).sort((a,b)=>a.ts-b.ts);
  const unread = (uid) => messages.filter(m=>m.from===uid&&m.to===cu.id&&!m.read).length;
  const totalUnread = messages.filter(m=>m.to===cu.id&&!m.read).length;

  const openConv = (user) => {
    setConvWith(user);
    setMessages(prev=>prev.map(m=>m.from===user.id&&m.to===cu.id?{...m,read:true}:m));
  };

  const sendMessage = (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text || !convWith) return;
    const ts = Date.now();
    const msg = {id:ts, from:cu.id, to:convWith.id, fromName:cu.username, text, ts, read:false};
    setMessages(prev=>[...prev, msg]);
    try {
      if (window._socket) {
        window._socket.emit('dm', {
          fromUserId: cu.id||cu.uid,
          fromUsername: cu.username,
          toUserId: convWith.id||convWith.uid,
          text,
          ts
        });
      }
    } catch(e){}
    if (!textOverride) setInput('');
    setShowGifPicker(false);
    setTimeout(()=>msgsEndRef.current?.scrollIntoView({behavior:'smooth'}), 50);
    try { const today=new Date().toDateString(); const dk=`day_${today}`; const s=JSON.parse(localStorage.getItem('rep_dailyTaskState')||'{}'); s[dk]={...(s[dk]||{}),dailyChatCount:((s[dk]?.dailyChatCount)||0)+1}; localStorage.setItem('rep_dailyTaskState',JSON.stringify(s)); } catch(e){}
  };

  // Listen for incoming real-time DMs from socket and update local state
  useEffect(() => {
    const handler = (data) => {
      const myId = cu.id||cu.uid;
      if (data.toUserId !== myId) return;
      if (convWith && (data.fromUserId===convWith.id||data.fromUserId===convWith.uid)) {
        const newMsg = {id:data.ts||Date.now(), from:data.fromUserId, to:myId, fromName:data.fromUsername, text:data.text, ts:data.ts||Date.now(), read:true};
        setMessages(prev => prev.some(m=>m.id===newMsg.id) ? prev : [...prev, newMsg]);
        setTimeout(()=>msgsEndRef.current?.scrollIntoView({behavior:'smooth'}), 50);
      } else {
        try {
          const urd = JSON.parse(localStorage.getItem('rep_dmUnread')||'{}');
          urd[data.fromUsername] = (urd[data.fromUsername]||0) + 1;
          localStorage.setItem('rep_dmUnread', JSON.stringify(urd));
        } catch(e){}
        try {
          if(window.Notification && Notification.permission === 'granted'){
            new Notification(`💬 ${data.fromUsername} sana mesaj gönderdi`, {body: data.text?.slice(0,60), tag:'dm'});
          }
        } catch(e){}
      }
    };
    window._socket?.on('dm', handler);
    return () => { try { window._socket?.off('dm', handler); } catch(e){} };
  }, [convWith, cu.id, cu.uid]);

  const convMsgs = convWith ? getConvMsgs(convWith.id) : [];

  return (
    <div style={{padding:'0.7rem',paddingBottom:'5rem'}}>
      {convWith ? (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.75rem',padding:'0.65rem 0.85rem',background:'rgba(11,21,39,0.95)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'14px'}}>
            <button onClick={()=>setConvWith(null)} style={{background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:'8px',padding:'0.3rem 0.65rem',color:'#60A5FA',cursor:'pointer',fontWeight:700,fontSize:'0.78rem',fontFamily:'inherit',flexShrink:0}}>←</button>
            <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#3B82F6,#6366F1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0}}>{convWith.gender==='kadin'?'👩':'👨'}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.88rem'}}>{convWith.username}</div>
              <div style={{fontSize:'0.62rem',color:'#5A7089'}}>Lv.{convWith.level||1} · {convWith.city||'—'}</div>
            </div>
          </div>
          <div style={{minHeight:'240px',maxHeight:'42vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:'0.4rem',marginBottom:'0.5rem',padding:'0.1rem 0'}}>
            {convMsgs.length===0 && <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.82rem'}}>İlk mesajı sen gönder! 💬</div>}
            {convMsgs.map(m=>{
              const mine = m.from===cu.id;
              const gifMatch = m.text?.match(gifRx);
              return (
                <div key={m.id} style={{display:'flex',justifyContent:mine?'flex-end':'flex-start'}}>
                  {gifMatch ? (
                    <div style={{maxWidth:'78%',borderRadius:mine?'14px 14px 4px 14px':'14px 14px 14px 4px',overflow:'hidden',border:`1px solid ${mine?'rgba(59,130,246,0.3)':'rgba(255,255,255,0.08)'}`}}>
                      <img src={gifMatch[0]} alt="gif" style={{maxWidth:'220px',maxHeight:'200px',display:'block'}} onError={e=>e.target.parentElement.innerHTML='<div style="padding:0.5rem;color:#EF4444;font-size:0.75rem">⚠️ GIF yüklenemedi</div>'}/>
                      <div style={{fontSize:'0.55rem',color:'#5A7089',padding:'2px 6px',textAlign:mine?'right':'left'}}>{new Date(m.ts).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  ) : (
                    <div style={{maxWidth:'78%',padding:'0.55rem 0.85rem',borderRadius:mine?'14px 14px 4px 14px':'14px 14px 14px 4px',background:mine?'rgba(59,130,246,0.22)':'rgba(255,255,255,0.06)',border:`1px solid ${mine?'rgba(59,130,246,0.35)':'rgba(255,255,255,0.08)'}`,color:'#E8EDF2',fontSize:'0.85rem',lineHeight:1.45}}>
                      {m.text}
                      <div style={{fontSize:'0.58rem',color:'#5A7089',marginTop:'0.2rem',textAlign:mine?'right':'left'}}>{new Date(m.ts).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={msgsEndRef}/>
          </div>

          {/* GIF Picker - DM */}
          {showGifPicker && (
            <div style={{background:'rgba(6,12,24,0.98)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:'14px',padding:'0.6rem',marginBottom:'0.5rem'}}>
              <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.4rem'}}>
                <input value={gifSearch} onChange={e=>setGifSearch(e.target.value)} placeholder="GIF ara..."
                  style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'10px',padding:'0.4rem 0.7rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none'}} />
                <button onClick={()=>setShowGifPicker(false)} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'0.4rem 0.55rem',color:'#5A7089',cursor:'pointer',fontSize:'0.8rem'}}>✕</button>
              </div>
              {giphyLoading && <div style={{textAlign:'center',color:'#60A5FA',fontSize:'0.72rem'}}>🔄 Yükleniyor...</div>}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.3rem',maxHeight:'140px',overflowY:'auto',scrollbarWidth:'none'}}>
                {dmDisplayGifs.map((g,i)=>(
                  <img key={i} src={g} alt="gif" onClick={()=>sendMessage(g)}
                    style={{height:'64px',width:'100%',objectFit:'cover',borderRadius:'7px',cursor:'pointer',border:'1px solid rgba(59,130,246,0.15)'}}
                    onError={e=>e.target.style.display='none'} />
                ))}
              </div>
              <div style={{fontSize:'0.54rem',color:'#5A7089',textAlign:'right',marginTop:'0.2rem'}}>Powered by GIPHY</div>
            </div>
          )}

          <div style={{display:'flex',gap:'0.5rem'}}>
            <button onClick={()=>setShowGifPicker(v=>!v)}
              style={{background:showGifPicker?'rgba(59,130,246,0.18)':'rgba(255,255,255,0.04)',border:`1px solid ${showGifPicker?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.08)'}`,borderRadius:'12px',padding:'0.6rem 0.65rem',color:showGifPicker?'#60A5FA':'#8BA0B5',cursor:'pointer',fontSize:'0.95rem',flexShrink:0}}>
              🎞️
            </button>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()} placeholder="Mesaj yaz..."
              style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'0.65rem 1rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none'}} />
            <button onClick={()=>sendMessage()} style={{padding:'0.65rem 1rem',background:'rgba(59,130,246,0.2)',border:'1px solid rgba(59,130,246,0.35)',borderRadius:'12px',color:'#60A5FA',cursor:'pointer',fontWeight:700,fontSize:'1rem',fontFamily:'inherit',flexShrink:0}}>➤</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{background:'linear-gradient(135deg,rgba(96,165,250,0.12),rgba(11,21,39,0.97))',border:'1px solid rgba(96,165,250,0.25)',borderRadius:'18px',padding:'1.2rem',marginBottom:'0.75rem',textAlign:'center'}}>
            <div style={{fontSize:'2rem',marginBottom:'0.3rem'}}>📬</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:900,color:'#E8EDF2'}}>ÖZEL MESAJLAR</div>
            {totalUnread>0 && <div style={{background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:'20px',padding:'0.2rem 0.75rem',display:'inline-block',fontSize:'0.72rem',color:'#60A5FA',marginTop:'0.3rem',fontWeight:700}}>{totalUnread} okunmamış</div>}
          </div>
          {/* Kişi Arama */}
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.6rem',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'0 0.85rem'}}>
            <span style={{color:'#5A7089'}}>🔍</span>
            <input value={dmSearch} onChange={e=>setDmSearch(e.target.value)} placeholder="Oyuncu ara..."
              style={{flex:1,background:'none',border:'none',outline:'none',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'15px',padding:'0.6rem 0'}} />
            {dmSearch && <button onClick={()=>setDmSearch('')} style={{background:'none',border:'none',color:'#5A7089',cursor:'pointer',fontSize:'1rem',padding:'2px'}}>✕</button>}
          </div>
          {contacts.filter(u=>!dmSearch||u.username?.toLowerCase().includes(dmSearch.toLowerCase())||u.city?.toLowerCase().includes(dmSearch.toLowerCase())).length===0&&<div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>Oyuncu bulunamadı.</div>}
          {contacts.filter(u=>!dmSearch||u.username?.toLowerCase().includes(dmSearch.toLowerCase())||u.city?.toLowerCase().includes(dmSearch.toLowerCase())).map(user=>{
            const lastMsg = getConvMsgs(user.id).slice(-1)[0];
            const u = unread(user.id);
            return (
              <button key={user.id} onClick={()=>openConv(user)}
                style={{width:'100%',display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.8rem',background:u?'rgba(59,130,246,0.07)':'rgba(255,255,255,0.03)',border:`1px solid ${u?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.06)'}`,borderRadius:'13px',cursor:'pointer',marginBottom:'0.35rem',textAlign:'left',fontFamily:"'DM Sans',sans-serif"}}>
                <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#3B82F6,#6366F1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.15rem',flexShrink:0}}>{user.gender==='kadin'?'👩':'👨'}</div>
                <div style={{flex:1,overflow:'hidden'}}>
                  <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.88rem'}}>{user.username}</div>
                  <div style={{fontSize:'0.68rem',color:'#5A7089',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lastMsg?lastMsg.text:'Mesajlaşmaya başla...'}</div>
                </div>
                {u>0 && <div style={{background:'#3B82F6',borderRadius:'50%',minWidth:'22px',height:'22px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:800,color:'#fff',flexShrink:0,padding:'0 4px'}}>{u}</div>}
                <span style={{color:'#5A7089',flexShrink:0}}>›</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// VERGİ & BELEDİYE SAYFASI
// ═══════════════════════════════════════════════════════
function TaxMunicipalityPage({ profile, setProfile, showNotif }) {
  const cu = profile || {};
  const userCity = cu.city || 'İstanbul';
  const citySlug = userCity.toLowerCase().replace(/\s/g,'_').replace(/[^a-z0-9_]/g,'');
  const [treasury, setTreasury] = useLs(`cityTreasury_${citySlug}`, {balance:2500000, lastCollected:0});
  const [services, setServices] = useLs(`cityServices_${citySlug}`, {
    park:     {level:1, name:'Parklar',   icon:'🌳', cost:500000,  effect:'Mutluluk +5%'},
    hospital: {level:0, name:'Hastane',   icon:'🏥', cost:2000000, effect:'Sağlık +15%'},
    school:   {level:1, name:'Okullar',   icon:'🏫', cost:800000,  effect:'Eğitim +10%'},
    road:     {level:2, name:'Yollar',    icon:'🛣️', cost:300000,  effect:'Ulaşım +8%'},
    market:   {level:1, name:'Çarşı',     icon:'🏪', cost:400000,  effect:'Ticaret +5%'},
    police:   {level:1, name:'Emniyet',   icon:'🚔', cost:600000,  effect:'Güvenlik +10%'},
  });
  const [taxRate, setTaxRate] = useLs(`cityTaxRate_${citySlug}`, 22);
  const [taxLog, setTaxLog] = useLs(`cityTaxLog_${citySlug}`, []);
  const [now, setNow] = useState(Date.now());
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),5000);return()=>clearInterval(t);},[]);
  // Belediye başkanı tespiti: aynı şehirdeki belediye başkanı pozisyonlu kullanıcı
  const allUsersRaw = (()=>{try{return JSON.parse(localStorage.getItem('rep_users')||'[]');}catch{return[];}})();
  const cityMayor = allUsersRaw.find(u=>u.city===userCity&&(u.position==='Belediye Başkanı'||u.positions?.includes('belediye')));
  const isMayor = cu.role==='admin' || (cityMayor && cityMayor.id===cu.id) || cu.position==='Belediye Başkanı';
  const isCouncil = isMayor;
  const taxCD = 4*3600000;
  const canCollect = isMayor && (now - (treasury.lastCollected||0)) >= taxCD;
  const rem = Math.max(0, (treasury.lastCollected||0) + taxCD - now);
  const remH = Math.floor(rem/3600000); const remM = Math.floor((rem%3600000)/60000);

  const collectTaxes = () => {
    if (!canCollect) { showNotif('Henüz vergi toplanamaz', 'error'); return; }
    const allUsers = (()=>{try{return JSON.parse(localStorage.getItem('rep_users')||'[]');}catch{return[];}})();
    const cityResidents = allUsers.filter(u=>!u.banned && (u.city===userCity || cu.role==='admin'));
    const collected = cityResidents.reduce((s,u)=>s+Math.floor((u.money||0)*taxRate/100), 0);
    const cityShare = Math.floor(collected * 0.6);
    setTreasury(prev=>({...prev, balance:(prev.balance||0)+cityShare, lastCollected:Date.now()}));
    setTaxLog(prev=>[{id:Date.now(), amount:cityShare, date:new Date().toLocaleDateString('tr-TR'), collector:cu.username, rate:taxRate}, ...prev].slice(0,20));
    showNotif(`🏛️ Vergi toplandı! Hazineye: ${fmtM(cityShare)}`, 'success');
  };

  const upgradeService = (key) => {
    const svc = services[key];
    const cost = svc.cost * (svc.level+1);
    if (!isCouncil) { showNotif('Meclis üyesi veya başkan yetkisi gerekli', 'error'); return; }
    if ((treasury.balance||0) < cost) { showNotif(`Hazine yetersiz (${fmtM(cost)} gerekli)`, 'error'); return; }
    setServices(prev=>({...prev, [key]:{...svc, level:svc.level+1}}));
    setTreasury(prev=>({...prev, balance:prev.balance-cost}));
    showNotif(`✅ ${svc.name} Seviye ${svc.level+1}'e yükseltildi!`, 'success');
  };

  return (
    <div style={{padding:'0.7rem',paddingBottom:'5rem'}}>
      <div style={{background:'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(11,21,39,0.97))',border:'1px solid rgba(245,158,11,0.25)',borderRadius:'18px',padding:'1.2rem',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'0.6rem',color:'#F59E0B',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.2rem'}}>🏙️ {userCity.toUpperCase()} — ŞEHİR YÖNETİMİ</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:900,color:'#E8EDF2',marginBottom:'0.1rem'}}>Vergi & Belediye</div>
        <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{isMayor ? '👑 Belediye Başkanı olarak yönetiyorsunuz' : 'Hizmetleri görüntüleyin — yönetim için Belediye Başkanı gerekli'}</div>
        {cityMayor && <div style={{marginTop:'0.4rem',fontSize:'0.65rem',color:'#F59E0B'}}>Belediye Başkanı: <span style={{fontWeight:700}}>@{cityMayor.username}</span></div>}
      </div>

      {/* Hazine */}
      <div style={{background:'rgba(245,158,11,0.07)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'14px',padding:'0.9rem',marginBottom:'0.6rem'}}>
        <div style={{fontSize:'0.62rem',color:'#F59E0B',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.4rem'}}>🏦 ŞEHİR HAZİNESİ</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'1.6rem',fontWeight:800,color:'#F59E0B',marginBottom:'0.35rem'}}>{fmtM(treasury.balance||0)}</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.5rem'}}>
          <div style={{fontSize:'0.72rem',color:'#5A7089'}}>Vergi Oranı: <span style={{color:'#F59E0B',fontWeight:700}}>%{taxRate}</span></div>
          {isMayor ? (
            <button onClick={collectTaxes} disabled={!canCollect}
              style={{padding:'0.35rem 0.85rem',borderRadius:'9px',border:`1px solid ${canCollect?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.06)'}`,background:canCollect?'rgba(245,158,11,0.15)':'rgba(255,255,255,0.03)',color:canCollect?'#F59E0B':'#3B4E63',cursor:canCollect?'pointer':'default',fontWeight:700,fontSize:'0.75rem',fontFamily:'inherit'}}>
              {canCollect ? '💰 Vergi Topla' : `⏳ ${remH}s ${remM}dk`}
            </button>
          ) : (
            <div style={{fontSize:'0.65rem',color:'#5A7089'}}>🔒 Belediye Başkanı yetkisi gerekli</div>
          )}
        </div>
      </div>

      {/* Vergi oranı slider */}
      {isMayor && (
        <div style={{background:'rgba(11,21,39,0.9)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'0.75rem',marginBottom:'0.6rem'}}>
          <div style={{fontSize:'0.62rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',marginBottom:'0.5rem'}}>📊 VERGİ ORANI: %{taxRate}</div>
          <input type="range" min={5} max={50} value={taxRate} onChange={e=>setTaxRate(Number(e.target.value))}
            style={{width:'100%',marginBottom:'0.25rem',accentColor:'#F59E0B'}} />
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.62rem',color:'#5A7089'}}>
            <span>%5 Düşük</span><span>%50 Yüksek</span>
          </div>
        </div>
      )}

      {/* Şehir hizmetleri */}
      <div style={{fontSize:'0.62rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.4rem'}}>🏙️ ŞEHİR HİZMETLERİ</div>
      {Object.entries(services).map(([key, svc]) => {
        const upgCost = svc.cost * (svc.level+1);
        const canUpg = isCouncil && (treasury.balance||0) >= upgCost;
        const stars = Math.min(svc.level, 5);
        return (
          <div key={key} style={{background:'rgba(11,21,39,0.9)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'0.75rem',marginBottom:'0.35rem',display:'flex',alignItems:'center',gap:'0.75rem'}}>
            <div style={{fontSize:'1.6rem',flexShrink:0}}>{svc.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.85rem'}}>{svc.name}</div>
              <div style={{fontSize:'0.63rem',color:'#5A7089'}}>{svc.effect}</div>
              <div style={{display:'flex',gap:'1px',marginTop:'0.2rem'}}>
                {[...Array(5)].map((_,i)=><span key={i} style={{fontSize:'0.65rem',color:i<stars?'#F59E0B':'#3B4E63'}}>★</span>)}
                <span style={{fontSize:'0.6rem',color:'#5A7089',marginLeft:'4px'}}>Lv.{svc.level}</span>
              </div>
            </div>
            <button onClick={()=>upgradeService(key)}
              style={{padding:'0.3rem 0.6rem',borderRadius:'8px',border:`1px solid ${canUpg?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.06)'}`,background:canUpg?'rgba(245,158,11,0.12)':'rgba(255,255,255,0.03)',color:canUpg?'#F59E0B':'#3B4E63',cursor:canUpg?'pointer':'default',fontSize:'0.65rem',fontWeight:700,fontFamily:'inherit',flexShrink:0,whiteSpace:'nowrap'}}>
              {canUpg ? `↑ ${fmtM(upgCost)}` : '🔒'}
            </button>
          </div>
        );
      })}

      {/* Vergi geçmişi */}
      {taxLog.length > 0 && (
        <div style={{marginTop:'0.6rem'}}>
          <div style={{fontSize:'0.62rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.4rem'}}>📋 VERGİ GEÇMİŞİ</div>
          {taxLog.slice(0,5).map(log=>(
            <div key={log.id} style={{display:'flex',justifyContent:'space-between',padding:'0.4rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:'0.73rem'}}>
              <span style={{color:'#5A7089'}}>{log.date} · %{log.rate} · {log.collector}</span>
              <span style={{color:'#F59E0B',fontWeight:700}}>+{fmtM(log.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Maliye Bakanlığı Destek Talebi */}
      {isMayor && (
        <div style={{marginTop:'0.75rem',background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'14px',padding:'0.9rem'}}>
          <div style={{fontSize:'0.62rem',color:'#10B981',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.5rem'}}>🏦 MALİYE BAKANLIĞI — HAZİNE TALEBİ</div>
          <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.6rem'}}>
            Şehir geliştirme projeleri için Maliye Bakanlığı'ndan ek kaynak talep edebilirsiniz. Maliye Bakanı talebi inceleyip onaylayabilir.
          </div>
          {(()=>{
            const reqs = JSON.parse(localStorage.getItem('rep_treasuryRequests')||'[]');
            const pending = reqs.filter(r=>r.city===userCity&&r.status==='bekliyor');
            if(pending.length>0){
              return <div style={{fontSize:'0.72rem',color:'#F59E0B',padding:'0.5rem',background:'rgba(245,158,11,0.08)',borderRadius:'8px'}}>⏳ {pending.length} adet onay bekleyen talebiniz var.</div>;
            }
            return (
              <button onClick={()=>{
                const amt = prompt('Talep edilecek tutar (₺):');
                const reason = prompt('Talep sebebi (şehir geliştirme projesi):');
                if(!amt || !reason) return;
                const v = parseInt(amt);
                if(isNaN(v)||v<=0){showNotif('Geçersiz tutar','error');return;}
                const reqs2 = JSON.parse(localStorage.getItem('rep_treasuryRequests')||'[]');
                reqs2.unshift({id:Date.now(),city:userCity,mayor:cu.username,amount:v,reason,status:'bekliyor',date:new Date().toLocaleString('tr-TR')});
                localStorage.setItem('rep_treasuryRequests',JSON.stringify(reqs2.slice(0,50)));
                showNotif('✅ Maliye Bakanlığı\'na talep iletildi!','success');
              }} style={{width:'100%',padding:'0.55rem',borderRadius:'10px',border:'1px solid rgba(16,185,129,0.35)',background:'rgba(16,185,129,0.1)',color:'#10B981',fontWeight:700,fontSize:'0.78rem',cursor:'pointer'}}>
                💰 Maliye'den Para Talep Et
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// HARİTA / BÖLGE SAYFASI
// ═══════════════════════════════════════════════════════
function TerritoryMapPage({ profile, showNotif }) {
  const [districts] = useLs('rep_districts', DEFAULT_DISTRICTS);
  const [mapMode, setMapMode] = useState('political');
  const [selected, setSelected] = useState(null);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const dragRef = useRef(null);
  const touchRef = useRef(null);
  const pinchRef = useRef(null);
  const velRef = useRef({x:0, y:0});
  const rafRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const lastPosRef = useRef(null);

  const MAP_MODES = [
    {id:'political',label:'⚖️ Siyasi'}, {id:'crime',label:'🔪 Suç'},
    {id:'police',label:'👮 Polis'}, {id:'economic',label:'💰 Ekonomi'}, {id:'revolt',label:'🔥 İsyan'},
  ];

  const getColor = (d, mode) => {
    const a = 0.70;
    if (mode==='political') {
      if (d.controlBy==='Ordu') return `rgba(239,68,68,${a})`;
      if (d.controlBy==='Şirketler') return `rgba(16,185,129,${a})`;
      if (d.controlBy==='Aydınlar') return `rgba(59,130,246,${a})`;
      if (d.controlBy==='Tüccarlar') return `rgba(234,179,8,${a})`;
      if (d.controlBy==='Asi Grup') return `rgba(245,158,11,${a})`;
      return `rgba(55,65,81,${a})`;
    }
    if (mode==='crime') {
      if (d.crime>70) return `rgba(239,68,68,${a})`;
      if (d.crime>50) return `rgba(245,158,11,${a})`;
      if (d.crime>30) return `rgba(234,179,8,${a*0.75})`;
      return `rgba(16,185,129,${a})`;
    }
    if (mode==='police') {
      if (d.alarm>65) return `rgba(59,130,246,${a})`;
      if (d.alarm>40) return `rgba(96,165,250,${a*0.7})`;
      return `rgba(30,58,138,${a*0.45})`;
    }
    if (mode==='economic') {
      if (d.income>150000) return `rgba(16,185,129,${a})`;
      if (d.income>80000)  return `rgba(234,179,8,${a})`;
      if (d.income>50000)  return `rgba(245,158,11,${a*0.8})`;
      return `rgba(239,68,68,${a*0.65})`;
    }
    if (mode==='revolt') {
      const risk = (100-d.support)*0.6 + d.crime*0.4;
      if (risk>60) return `rgba(239,68,68,${a})`;
      if (risk>40) return `rgba(245,158,11,${a})`;
      return `rgba(16,185,129,${a})`;
    }
    return `rgba(55,65,81,${a})`;
  };

  const onTouchStart = React.useCallback((e) => {
    e.preventDefault();
    cancelAnimationFrame(rafRef.current);
    velRef.current = {x:0, y:0};
    if (e.touches.length===1) {
      touchRef.current = {x:e.touches[0].clientX, y:e.touches[0].clientY, t:Date.now()};
      lastPosRef.current = {x:e.touches[0].clientX, y:e.touches[0].clientY};
      setDragging(false);
    } else if (e.touches.length===2) {
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      pinchRef.current = Math.sqrt(dx*dx+dy*dy);
    }
  }, []);

  const onTouchMove = React.useCallback((e) => {
    e.preventDefault();
    if (e.touches.length===1 && touchRef.current) {
      const dx=e.touches[0].clientX-touchRef.current.x, dy=e.touches[0].clientY-touchRef.current.y;
      if (Math.abs(dx)>5||Math.abs(dy)>5) setDragging(true);
      const dt=Math.max(1,Date.now()-touchRef.current.t);
      velRef.current = {x:(dx/dt)*14, y:(dy/dt)*14};
      setTx(p=>p+dx); setTy(p=>p+dy);
      touchRef.current = {x:e.touches[0].clientX, y:e.touches[0].clientY, t:Date.now()};
    } else if (e.touches.length===2 && pinchRef.current) {
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      const d=Math.sqrt(dx*dx+dy*dy);
      setScale(p=>Math.min(3, Math.max(0.4, p*(d/pinchRef.current))));
      pinchRef.current=d;
    }
  }, []);

  const onTouchEnd = React.useCallback(() => {
    const inertia = () => {
      velRef.current = {x:velRef.current.x*0.88, y:velRef.current.y*0.88};
      if (Math.abs(velRef.current.x)>0.5||Math.abs(velRef.current.y)>0.5) {
        setTx(p=>p+velRef.current.x); setTy(p=>p+velRef.current.y);
        rafRef.current = requestAnimationFrame(inertia);
      } else { setDragging(false); }
    };
    rafRef.current = requestAnimationFrame(inertia);
    touchRef.current=null;
  }, []);

  const onMouseDown = React.useCallback((e) => {
    dragRef.current = {x:e.clientX, y:e.clientY, moved:false};
  }, []);
  const onMouseMove = React.useCallback((e) => {
    if (!dragRef.current) return;
    const dx=e.clientX-dragRef.current.x, dy=e.clientY-dragRef.current.y;
    if (Math.abs(dx)>4||Math.abs(dy)>4) { dragRef.current.moved=true; setDragging(true); }
    setTx(p=>p+dx); setTy(p=>p+dy);
    dragRef.current = {...dragRef.current, x:e.clientX, y:e.clientY};
  }, []);
  const onMouseUp = React.useCallback(() => { dragRef.current=null; }, []);
  const onWheel = React.useCallback((e) => {
    e.preventDefault();
    setScale(p=>Math.min(3, Math.max(0.4, p*(e.deltaY>0?0.88:1.13))));
  }, []);

  const clickDistrict = React.useCallback((d, e) => {
    e.stopPropagation();
    if (!dragRef.current?.moved) setSelected(d);
  }, []);

  React.useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const LEGEND = {
    political:[['#6B7280','Halk'],['#EF4444','Ordu/Güç'],['#10B981','Şirket'],['#3B82F6','Aydınlar'],['#EAB308','Tüccarlar'],['#F59E0B','İsyancı']],
    crime:[['#10B981','Düşük <30'],['#EAB308','Orta 30-50'],['#F59E0B','Yüksek 50-70'],['#EF4444','Kritik >70']],
    police:[['#1E3A8A','Güvenli'],['#60A5FA','Devriye'],['#3B82F6','Yüksek Alarm']],
    economic:[['#EF4444','Düşük <50K'],['#F59E0B','Orta 50-80K'],['#EAB308','İyi 80-150K'],['#10B981','Zengin >150K']],
    revolt:[['#10B981','Stabil'],['#F59E0B','Gergin'],['#EF4444','İsyan Riski']],
  };

  return (
    <div style={{position:'relative',width:'100%',height:'calc(100dvh - 120px)',background:'#020912',overflow:'hidden',userSelect:'none'}}>
      {/* Mode Bar */}
      <div style={{position:'absolute',top:0,left:0,right:0,zIndex:20,display:'flex',gap:'4px',padding:'0.4rem 0.5rem',background:'rgba(2,9,18,0.96)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(0,255,80,0.08)',overflowX:'auto',scrollbarWidth:'none',flexShrink:0}}>
        {MAP_MODES.map(m=>(
          <button key={m.id} onClick={()=>setMapMode(m.id)} style={{padding:'0.28rem 0.55rem',borderRadius:'8px',border:`1px solid ${mapMode===m.id?'rgba(0,255,80,0.5)':'rgba(255,255,255,0.06)'}`,background:mapMode===m.id?'rgba(0,255,80,0.1)':'rgba(255,255,255,0.02)',color:mapMode===m.id?'#00FF64':'#1A3028',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.64rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
            {m.label}
          </button>
        ))}
        <div style={{flex:1}}/>
        <button onClick={()=>{setTx(0);setTy(0);setScale(1);}} title="Sıfırla" style={{padding:'0.28rem 0.55rem',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.02)',color:'#1A3028',fontSize:'0.78rem',cursor:'pointer',flexShrink:0,fontFamily:"'DM Sans',sans-serif"}}>⊡</button>
      </div>

      {/* SVG Map */}
      <svg
        style={{position:'absolute',left:0,right:0,bottom:0,top:'37px',width:'100%',height:'calc(100% - 37px)',touchAction:'none',cursor:dragging?'grabbing':'grab'}}
        viewBox="0 0 360 480" preserveAspectRatio="xMidYMid meet"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <defs>
          <filter id="dGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="dGlowSm"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <pattern id="mGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0L0 0 0 40" fill="none" stroke="rgba(0,255,80,0.035)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <g transform={`translate(${tx},${ty}) scale(${scale})`}>
          <rect width="360" height="480" fill="#030F1B"/>
          <rect width="360" height="480" fill="url(#mGrid)"/>
          {/* district border lines for atmosphere */}
          {[60,120,180,240,300].map(y=><line key={y} x1="0" y1={y} x2="360" y2={y} stroke="rgba(0,100,50,0.06)" strokeWidth="0.5"/>)}
          {[90,180,270].map(x=><line key={x} x1={x} y1="0" x2={x} y2="480" stroke="rgba(0,100,50,0.06)" strokeWidth="0.5"/>)}

          {districts.map(d => {
            const pts = DISTRICT_POLYGONS[d.id];
            if (!pts) return null;
            const fill = getColor(d, mapMode);
            const isSel = selected?.id===d.id;
            const hasRiot = d.conflicts?.includes('riot');
            const hasCartel = d.conflicts?.includes('cartel');
            const hasPoliceDeploy = d.conflicts?.includes('police');
            const ctr = getCentroid(pts);
            return (
              <g key={d.id} onClick={(e)=>clickDistrict(d,e)} style={{cursor:'pointer'}}>
                <polygon points={pts} fill={fill}
                  stroke={isSel?'#00FF64':hasRiot?'rgba(239,68,68,0.7)':hasCartel?'rgba(245,158,11,0.5)':'rgba(0,180,60,0.22)'}
                  strokeWidth={isSel?2.5:1}
                  filter={isSel?'url(#dGlow)':undefined}
                />
                {isSel && <polygon points={pts} fill="rgba(0,255,80,0.07)" stroke="none"/>}
                {(hasRiot||hasCartel) && (
                  <polygon points={pts} fill="none" stroke={hasRiot?'rgba(239,68,68,0.7)':'rgba(245,158,11,0.6)'} strokeWidth="1.5">
                    <animate attributeName="stroke-opacity" values="0.15;0.9;0.15" dur="1.3s" repeatCount="indefinite"/>
                  </polygon>
                )}
                {hasPoliceDeploy && !hasRiot && (
                  <polygon points={pts} fill="rgba(59,130,246,0.08)" stroke="none">
                    <animate attributeName="fill-opacity" values="0.04;0.18;0.04" dur="2s" repeatCount="indefinite"/>
                  </polygon>
                )}
                <text x={ctr.x} y={ctr.y-1} textAnchor="middle" dominantBaseline="middle"
                  fill={isSel?'#00FF64':'rgba(190,225,230,0.88)'} fontSize="8.5" fontWeight="700"
                  fontFamily="DM Sans,sans-serif" style={{pointerEvents:'none',textShadow:'0 1px 3px #000'}}>
                  {d.name}
                </text>
                {isSel && <circle cx={ctr.x} cy={ctr.y+11} r="2.2" fill="#00FF64" filter="url(#dGlowSm)"><animate attributeName="r" values="1.5;3.5;1.5" dur="1s" repeatCount="indefinite"/></circle>}
                {(hasRiot||hasCartel) && !isSel && <text x={ctr.x+12} y={ctr.y-8} fontSize="8" style={{pointerEvents:'none'}}>{hasRiot?'🔥':hasCartel?'💀':''}</text>}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend overlay */}
      <div style={{position:'absolute',top:'45px',right:'6px',zIndex:15,background:'rgba(2,9,18,0.9)',backdropFilter:'blur(8px)',border:'1px solid rgba(0,255,80,0.1)',borderRadius:'8px',padding:'0.4rem 0.5rem',maxWidth:'88px',pointerEvents:'none'}}>
        <div style={{fontSize:'0.48rem',color:'#0A3020',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'3px'}}>Lejant</div>
        {(LEGEND[mapMode]||[]).map(([c,l])=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:'4px',marginBottom:'2px'}}>
            <div style={{width:'7px',height:'7px',borderRadius:'2px',background:c,flexShrink:0,boxShadow:`0 0 4px ${c}80`}}/>
            <span style={{fontSize:'0.48rem',color:'#1A4030',lineHeight:1.3}}>{l}</span>
          </div>
        ))}
      </div>

      {/* Selected district detail panel */}
      {selected && (
        <div onClick={()=>setSelected(null)} style={{position:'absolute',inset:0,zIndex:30,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(3px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(3,12,24,0.99)',backdropFilter:'blur(24px)',border:'1px solid rgba(0,255,80,0.18)',borderBottom:'none',borderRadius:'22px 22px 0 0',padding:'1rem',boxShadow:'0 -30px 80px rgba(0,0,0,0.65)',maxHeight:'70vh',overflowY:'auto',animation:'slideUp 0.22s ease'}}>
            <div style={{width:'32px',height:'3px',borderRadius:'2px',background:'rgba(255,255,255,0.08)',margin:'0 auto 0.7rem'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.7rem'}}>
              <div>
                <div style={{fontWeight:900,color:'#00FF64',fontSize:'1.05rem',fontFamily:"'Syne',sans-serif",textShadow:'0 0 12px rgba(0,255,80,0.5)',marginBottom:'0.12rem'}}>{selected.name}</div>
                <div style={{display:'flex',gap:'0.35rem',alignItems:'center'}}>
                  <div style={{width:'7px',height:'7px',borderRadius:'50%',background:selected.controlColor||'#6B7280',boxShadow:`0 0 5px ${selected.controlColor}`}}/>
                  <span style={{fontSize:'0.66rem',color:'#2A4A3A'}}>{selected.controlBy} • {(selected.population||0).toLocaleString('tr-TR')} nüfus</span>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'50%',width:'26px',height:'26px',color:'#2A4A3A',cursor:'pointer',fontSize:'0.8rem',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.35rem',marginBottom:'0.6rem'}}>
              {[
                ['💰','Yasal Gelir',fmtWord(selected.legalIncome||0),'#10B981'],
                ['🌑','Yeraltı',fmtWord(selected.illegalIncome||0),'#EF4444'],
                ['🔪','Suç Oranı',`%${selected.crime}`,'#F59E0B'],
                ['👮','Alarm Seviyesi',`%${selected.alarm}`,'#3B82F6'],
                ['❤️','Halk Desteği',`%${selected.support}`,'#EC4899'],
                ['⚡','Nüfuz Puanı',`%${selected.influence}`,'#8B5CF6'],
              ].map(([ic,lb,v,c])=>(
                <div key={lb} style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'0.45rem 0.5rem'}}>
                  <div style={{fontSize:'0.53rem',color:'#0A2A1A',textTransform:'uppercase',marginBottom:'1px'}}>{ic} {lb}</div>
                  <div style={{fontWeight:800,color:c,fontSize:'0.82rem',fontFamily:"'JetBrains Mono',monospace"}}>{v}</div>
                </div>
              ))}
            </div>
            {selected.conflicts?.length>0 && (
              <div style={{background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.18)',borderRadius:'8px',padding:'0.5rem',marginBottom:'0.5rem'}}>
                <div style={{fontSize:'0.65rem',fontWeight:800,color:'#FCA5A5',marginBottom:'0.2rem'}}>⚡ Aktif Olaylar</div>
                <div style={{display:'flex',gap:'0.3rem',flexWrap:'wrap'}}>
                  {selected.conflicts.map(c=>(
                    <span key={c} style={{padding:'2px 6px',borderRadius:'6px',background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.2)',color:'#FCA5A5',fontSize:'0.65rem',fontWeight:700}}>
                      {c==='riot'?'🔥 İsyan':c==='cartel'?'💀 Kartel':c==='police'?'👮 Operasyon':'⚡ '+c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {[['Halk Desteği',selected.support,'#EC4899'],['Güvenlik Skoru',100-selected.alarm,'#3B82F6'],['Ekonomik Güç',Math.min(100,Math.round((selected.income||0)/3000)),'#10B981']].map(([lb,v,c])=>(
              <div key={lb} style={{marginBottom:'0.28rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.55rem',color:'#0A2A1A',marginBottom:'2px'}}><span>{lb}</span><span>{v}%</span></div>
                <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px'}}>
                  <div style={{height:'100%',width:`${v}%`,background:`linear-gradient(90deg,${c}80,${c})`,borderRadius:'2px',transition:'width 0.5s'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selected && (
        <div style={{position:'absolute',bottom:'10px',left:'50%',transform:'translateX(-50%)',background:'rgba(2,9,18,0.85)',backdropFilter:'blur(8px)',border:'1px solid rgba(0,255,80,0.1)',borderRadius:'20px',padding:'0.28rem 0.85rem',fontSize:'0.6rem',color:'#0A3020',fontWeight:700,zIndex:10,pointerEvents:'none',whiteSpace:'nowrap'}}>
          👆 Bölgeye dokun → Detay &nbsp;•&nbsp; 🤏 Sıkıştır → Zoom
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// GÜNLÜK GÖREVLER SAYFASI
// ═══════════════════════════════════════════════════════
const DAILY_TASK_DEFS = [
  { id:'login',       icon:'🔑', title:'Günlük Giriş',          desc:'Oyuna giriş yap',                    reward:{money:5000,  xp:50,  uc:1},  auto:true },
  { id:'job5',        icon:'💼', title:'5 İş Tamamla',           desc:'Herhangi bir iş 5 kez yap',          reward:{money:15000, xp:100, uc:2},  target:5,  key:'dailyJobCount' },
  { id:'chat1',       icon:'💬', title:'Sohbet Et',              desc:'Sohbet sayfasında mesaj gönder',     reward:{money:3000,  xp:30,  uc:1},  target:1,  key:'dailyChatCount' },
  { id:'farm1',       icon:'🌾', title:'Tarım Hasatı',           desc:'Tarımda hasat yap',                  reward:{money:8000,  xp:60,  uc:1},  target:1,  key:'dailyFarmCount' },
  { id:'trade1',      icon:'🌍', title:'Ticaret Rotası',         desc:'Dış ticaret rotası başlat',          reward:{money:20000, xp:120, uc:3},  target:1,  key:'dailyTradeCount' },
  { id:'mine1',       icon:'⛏️', title:'Maden Çıkar',           desc:'Madende bir kez kazan',              reward:{money:10000, xp:80,  uc:2},  target:1,  key:'dailyMineCount' },
  { id:'vote1',       icon:'🗳️', title:'Siyasi Katılım',        desc:'Siyasette oy kullan veya başvur',    reward:{money:6000,  xp:50,  uc:1},  target:1,  key:'dailyVoteCount' },
  { id:'pvp1',        icon:'⚔️', title:'Dövüş Yap',             desc:'PvP sayfasında bir dövüş yap',       reward:{money:25000, xp:200, uc:4},  target:1,  key:'dailyPvpCount' },
  { id:'news1',       icon:'📰', title:'Haber Oku',              desc:'Gazete sayfasını ziyaret et',        reward:{money:2000,  xp:20,  uc:0},  auto:true },
  { id:'edu1',        icon:'🎓', title:'Eğitime Devam Et',       desc:'Eğitim sayfasında tıklama yap',     reward:{money:5000,  xp:75,  uc:1},  target:1,  key:'dailyEduCount' },
];

function DailyTasksPage({ profile, setProfile, showNotif, onNavigate }) {
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const today = new Date().toDateString();
  const [dailyState, setDailyState] = useLs('dailyTaskState', {});
  const [claimed, setClaimed] = useLs('dailyTasksClaimed', {});

  const dayKey = `day_${today}`;
  const todayClaimed = claimed[dayKey] || {};
  const todayProgress = dailyState[dayKey] || {};

  const getProgress = (task) => {
    if (task.auto) return 1;
    return Math.min(task.target, todayProgress[task.key] || 0);
  };

  const isComplete = (task) => getProgress(task) >= (task.target || 1);
  const isClaimed = (task) => !!todayClaimed[task.id];

  const claimTask = (task) => {
    if (!isComplete(task)) { showNotif('Görev henüz tamamlanmadı!', 'error'); return; }
    if (isClaimed(task)) { showNotif('Bu görev zaten alındı!', 'error'); return; }
    setClaimed(prev => ({...prev, [dayKey]:{...(prev[dayKey]||{}), [task.id]:true}}));
    setProfile(p => {
      const np = {...p,
        money:(p.money||0)+(task.reward.money||0),
        xp:(p.xp||0)+(task.reward.xp||0),
        underCoin:(p.underCoin||0)+(task.reward.uc||0)
      };
      localStorage.setItem('rep_userProfile', JSON.stringify(np));
      return np;
    });
    showNotif(`✅ ${task.title} ödülü: +${fmtWord(task.reward.money)} +${task.reward.xp}XP${task.reward.uc?` +${task.reward.uc}UC`:''}`, 'success');
  };

  // Otomatik login görevi tamamla + 3 saniyede bir localStorage yenile
  React.useEffect(() => {
    if (!todayProgress['login_done']) {
      setDailyState(prev => ({...prev, [dayKey]:{...(prev[dayKey]||{}), login_done:true}}));
    }
    const refresh = () => {
      try {
        const s = JSON.parse(localStorage.getItem('rep_dailyTaskState') || localStorage.getItem('dailyTaskState') || '{}');
        setDailyState(s);
      } catch(e) {}
    };
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, []);

  const completedCount = DAILY_TASK_DEFS.filter(t=>isComplete(t)&&isClaimed(t)).length;
  const totalReward = DAILY_TASK_DEFS.reduce((s,t)=>s+(t.reward.money||0),0);

  return (
    <div style={{padding:'1rem', background:bg, minHeight:'100%'}}>
      <div style={{background:'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(11,21,39,0.97))',border:'1px solid rgba(245,158,11,0.25)',borderRadius:'18px',padding:'1.2rem',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'0.6rem',color:'#F59E0B',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.2rem'}}>📅 GÜNLÜK GÖREVLER</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:900,color:'#E8EDF2',marginBottom:'0.2rem'}}>Her gün yenilenir</div>
        <div style={{fontSize:'0.7rem',color:'#5A7089'}}>
          <span style={{color:'#F59E0B',fontWeight:700}}>{completedCount}/{DAILY_TASK_DEFS.length}</span> görev tamamlandı •
          Toplam ödül: <span style={{color:'#10B981',fontWeight:700}}>{fmtWord(totalReward)}</span>
        </div>
        <div style={{marginTop:'0.6rem',height:'6px',background:'rgba(255,255,255,0.07)',borderRadius:'3px',overflow:'hidden'}}>
          <div style={{height:'100%',width:`${(completedCount/DAILY_TASK_DEFS.length)*100}%`,background:'linear-gradient(90deg,#F59E0B,#FBBF24)',borderRadius:'3px',transition:'width 0.4s'}} />
        </div>
      </div>

      {DAILY_TASK_DEFS.map(task => {
        const prog = getProgress(task);
        const target = task.target || 1;
        const done = isComplete(task);
        const got = isClaimed(task);
        const pct = Math.round((prog/target)*100);
        return (
          <div key={task.id} style={{background:got?`rgba(16,185,129,0.05)`:card,border:`1px solid ${got?'rgba(16,185,129,0.25)':done?'rgba(245,158,11,0.3)':border}`,borderRadius:'14px',padding:'0.85rem',marginBottom:'0.5rem',display:'flex',alignItems:'center',gap:'0.75rem'}}>
            <div style={{fontSize:'1.6rem',flexShrink:0}}>{task.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,color:dark?'#E8EDF2':'#1E293B',fontSize:'0.85rem'}}>{task.title}</div>
              <div style={{fontSize:'0.65rem',color:'#5A7089',marginBottom:'0.3rem'}}>{task.desc}</div>
              {!task.auto && (
                <div>
                  <div style={{height:'3px',background:'rgba(255,255,255,0.07)',borderRadius:'2px',overflow:'hidden',marginBottom:'2px'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:done?'#10B981':'#F59E0B',borderRadius:'2px',transition:'width 0.3s'}} />
                  </div>
                  <div style={{fontSize:'0.6rem',color:'#5A7089'}}>{prog}/{target}</div>
                </div>
              )}
              <div style={{fontSize:'0.62rem',color:'#10B981',fontWeight:700,marginTop:'0.2rem'}}>
                +{fmtWord(task.reward.money)} • +{task.reward.xp}XP{task.reward.uc?` • +${task.reward.uc}UC`:''}
              </div>
            </div>
            <button onClick={()=>claimTask(task)} disabled={got||!done}
              style={{padding:'0.4rem 0.7rem',borderRadius:'10px',border:'none',background:got?'rgba(16,185,129,0.15)':done?'linear-gradient(135deg,#F59E0B,#D97706)':'rgba(255,255,255,0.04)',color:got?'#10B981':done?'#000':'#3B4E63',fontWeight:800,fontSize:'0.72rem',cursor:got||!done?'default':'pointer',flexShrink:0}}>
              {got?'✅':'Al'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ULUSLARARASI TİCARET SAYFASI (Ekonomi sekmesi)
// ═══════════════════════════════════════════════════════
const TRADE_ROUTES = [
  { id:'tr_eu',    from:'🇹🇷 Türkiye', to:'🇪🇺 Avrupa',     duration:2*3600000,  cost:50000,   earn:120000, tp:80,  minLevel:3,  goods:'Tekstil, Gıda' },
  { id:'tr_mid',   from:'🇹🇷 Türkiye', to:'🌍 Orta Doğu',   duration:3*3600000,  cost:80000,   earn:200000, tp:130, minLevel:5,  goods:'İnşaat, Enerji' },
  { id:'tr_asia',  from:'🇹🇷 Türkiye', to:'🌏 Asya',         duration:6*3600000,  cost:150000,  earn:420000, tp:250, minLevel:8,  goods:'Makine, Kimya' },
  { id:'tr_us',    from:'🇹🇷 Türkiye', to:'🇺🇸 ABD',         duration:8*3600000,  cost:250000,  earn:700000, tp:400, minLevel:12, goods:'Savunma, Teknoloji' },
  { id:'tr_af',    from:'🇹🇷 Türkiye', to:'🌍 Afrika',        duration:4*3600000,  cost:100000,  earn:280000, tp:180, minLevel:6,  goods:'Gıda, İlaç' },
  { id:'tr_ru',    from:'🇹🇷 Türkiye', to:'🇷🇺 Rusya',        duration:1.5*3600000,cost:40000,   earn:95000,  tp:60,  minLevel:2,  goods:'Turizm, Gıda' },
  { id:'tr_cn',    from:'🇹🇷 Türkiye', to:'🇨🇳 Çin',          duration:10*3600000, cost:400000,  earn:1200000,tp:700, minLevel:18, goods:'Ham Madde, Lojistik' },
];

function IntlTradePage({ profile, setProfile, showNotif }) {
  const { dark } = useTheme();
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [activeRoutes, setActiveRoutes] = useLs('intlTradeRoutes', {});
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(()=>setTick(p=>p+1),5000); return ()=>clearInterval(t); }, []);

  const playerLevel = profile?.level || 1;

  const startRoute = (route) => {
    if ((profile?.money||0) < route.cost) { showNotif('Yeterli paran yok!','error'); return; }
    if (playerLevel < route.minLevel) { showNotif(`Seviye ${route.minLevel} gerekli!`,'error'); return; }
    if (activeRoutes[route.id]) { showNotif('Bu rota zaten aktif!','error'); return; }
    setProfile(p => { const np={...p,money:(p.money||0)-route.cost}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setActiveRoutes(prev => ({...prev,[route.id]:{startedAt:Date.now(),finishAt:Date.now()+route.duration}}));
    showNotif(`🚢 ${route.to} rotası başlatıldı!`,'success');
    // Günlük görev sayacı
    const today = new Date().toDateString();
    const dk = `day_${today}`;
    try { const s=JSON.parse(localStorage.getItem('rep_dailyTaskState')||'{}'); s[dk]={...(s[dk]||{}),dailyTradeCount:(s[dk]?.dailyTradeCount||0)+1}; localStorage.setItem('rep_dailyTaskState',JSON.stringify(s)); } catch(e){}
  };

  const collectRoute = (route) => {
    const r = activeRoutes[route.id];
    if (!r || Date.now() < r.finishAt) { showNotif('Rota henüz tamamlanmadı!','error'); return; }
    setActiveRoutes(prev => { const n={...prev}; delete n[route.id]; return n; });
    setProfile(p => {
      const np={...p, money:(p.money||0)+route.earn, tradePoints:(p.tradePoints||0)+route.tp, xp:(p.xp||0)+Math.floor(route.tp/2)};
      localStorage.setItem('rep_userProfile',JSON.stringify(np));
      return np;
    });
    showNotif(`✅ ${route.to} rotası tamamlandı! +${fmtWord(route.earn)} +${route.tp}TP`,'success');
  };

  const fmtTime = (ms) => {
    if (ms<=0) return 'Tamamlandı!';
    const h=Math.floor(ms/3600000); const m=Math.floor((ms%3600000)/60000);
    return h>0?`${h}sa ${m}dk`:`${m}dk`;
  };

  return (
    <div>
      <div style={{background:'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(11,21,39,0.95))',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'14px',padding:'1rem',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'0.72rem',color:'#10B981',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.2rem'}}>🌍 ULUSLARARASI TİCARET</div>
        <div style={{fontSize:'0.72rem',color:'#5A7089'}}>Ticaret Puanı: <span style={{color:'#06B6D4',fontWeight:700}}>{profile?.tradePoints||0} TP</span> • Her 100 TP → %1 oy katsayısı</div>
      </div>
      {TRADE_ROUTES.map(route => {
        const active = activeRoutes[route.id];
        const locked = playerLevel < route.minLevel;
        const remaining = active ? Math.max(0, active.finishAt - Date.now()) : 0;
        const done = active && remaining === 0;
        const pct = active ? Math.round(((active.duration-(active.finishAt-Date.now()))/active.duration)*100) : 0;
        return (
          <div key={route.id} style={{background:locked?'rgba(255,255,255,0.02)':done?'rgba(16,185,129,0.06)':card,border:`1px solid ${locked?border:done?'rgba(16,185,129,0.3)':active?'rgba(59,130,246,0.25)':border}`,borderRadius:'14px',padding:'0.85rem',marginBottom:'0.5rem',opacity:locked?0.5:1}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'0.5rem',marginBottom:'0.4rem'}}>
              <div>
                <div style={{fontWeight:800,color:dark?'#E8EDF2':'#1E293B',fontSize:'0.85rem'}}>{route.from} → {route.to}</div>
                <div style={{fontSize:'0.65rem',color:'#5A7089'}}>{route.goods} • Süre: {fmtTime(route.duration)}</div>
                <div style={{fontSize:'0.62rem',color:'#10B981',fontWeight:700,marginTop:'0.2rem'}}>
                  -{fmtWord(route.cost)} • +{fmtWord(route.earn)} • +{route.tp}TP
                </div>
              </div>
              {locked
                ? <span style={{color:'#EF4444',fontSize:'0.7rem',fontWeight:700,flexShrink:0}}>🔒 Lv.{route.minLevel}</span>
                : done
                  ? <button onClick={()=>collectRoute(route)} style={{padding:'0.4rem 0.75rem',borderRadius:'10px',border:'none',background:'linear-gradient(135deg,#10B981,#059669)',color:'#fff',fontWeight:800,fontSize:'0.75rem',cursor:'pointer',flexShrink:0}}>Topla!</button>
                  : active
                    ? <span style={{fontSize:'0.68rem',color:'#60A5FA',fontWeight:700,flexShrink:0}}>⏳ {fmtTime(remaining)}</span>
                    : <button onClick={()=>startRoute(route)} style={{padding:'0.4rem 0.75rem',borderRadius:'10px',border:'none',background:'linear-gradient(135deg,#3B82F6,#2563EB)',color:'#fff',fontWeight:800,fontSize:'0.75rem',cursor:'pointer',flexShrink:0}}>Başlat</button>
              }
            </div>
            {active && !done && (
              <div style={{height:'3px',background:'rgba(255,255,255,0.07)',borderRadius:'2px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min(100,pct)}%`,background:'linear-gradient(90deg,#3B82F6,#60A5FA)',borderRadius:'2px',transition:'width 5s linear'}} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TURNUVA / ETKİNLİK SAYFASI
// ═══════════════════════════════════════════════════════
const TOURNAMENTS = [
  { id:'wealth',   icon:'💰', title:'Servet Yarışması',      desc:'En fazla para biriktir',       reward:{money:500000, uc:100, xp:2000}, duration:7,  category:'Ekonomi',  key:'money',        type:'highest' },
  { id:'jobs_t',   icon:'💼', title:'Çalışkan Ödülü',        desc:'Bu hafta en fazla iş yap',     reward:{money:200000, uc:50,  xp:1000}, duration:7,  category:'İş',       key:'weeklyJobs',   type:'highest' },
  { id:'trade_t',  icon:'🌍', title:'Ticaret Şampiyonu',     desc:'En yüksek TP toplayan',        reward:{money:300000, uc:75,  xp:1500}, duration:7,  category:'Ticaret',  key:'tradePoints',  type:'highest' },
  { id:'xp_t',     icon:'⭐', title:'XP Ligi',               desc:'En fazla XP toplayan',        reward:{money:150000, uc:40,  xp:3000}, duration:7,  category:'Genel',    key:'xp',           type:'highest' },
  { id:'casino_t', icon:'🎰', title:'Şans Turnuvası',        desc:'En büyük tek oyun kazancı',   reward:{money:1000000,uc:200, xp:5000}, duration:3,  category:'Eğlence',  key:'bigWin',       type:'highest' },
  { id:'pvp_t',    icon:'⚔️', title:'Savaş Ligi',           desc:'En fazla PvP kazancı',        reward:{money:400000, uc:80,  xp:2000}, duration:7,  category:'Dövüş',    key:'pvpWins',      type:'highest' },
];

function TournamentPage({ profile, setProfile, showNotif }) {
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [allUsers] = useLs('rep_users', []);
  const [tab, setTab] = useState('active');
  const [joined, setJoined] = useLs('tournamentJoined', {});
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(()=>setTick(p=>p+1),10000); return ()=>clearInterval(t); }, []);

  const join = (t) => {
    if (joined[t.id]) { showNotif('Bu turnuvaya zaten katıldın!','error'); return; }
    setJoined(prev=>({...prev,[t.id]:{joinedAt:Date.now(),score:profile?.[t.key]||0}}));
    showNotif(`🎯 ${t.title} turnuvasına katıldın!`,'success');
  };

  const getLeaders = (t) => {
    const players = allUsers.length > 0 ? allUsers : [profile];
    return [...players].sort((a,b)=>(b[t.key]||0)-(a[t.key]||0)).slice(0,5);
  };

  const myRank = (t) => {
    const all = [...allUsers, profile].filter((u,i,arr)=>arr.findIndex(x=>x?.id===u?.id)===i);
    const sorted = all.sort((a,b)=>(b[t.key]||0)-(a[t.key]||0));
    return sorted.findIndex(u=>u?.id===profile?.id)+1;
  };

  const catColor = {Ekonomi:'#10B981',İş:'#3B82F6',Ticaret:'#06B6D4',Genel:'#F59E0B',Eğlence:'#8B5CF6',Dövüş:'#EF4444'};

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{background:'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(11,21,39,0.97))',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'18px',padding:'1.2rem',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'0.6rem',color:'#EF4444',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.2rem'}}>🎯 TURNUVALAR & ETKİNLİKLER</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:900,color:'#E8EDF2',marginBottom:'0.1rem'}}>Rekabet Et, Kazan</div>
        <div style={{fontSize:'0.7rem',color:'#5A7089'}}>Her hafta yenilenen turnuvalar • Birinci büyük ödül kazanır</div>
      </div>

      <div style={{display:'flex',gap:'4px',marginBottom:'0.75rem'}}>
        {[['active','⚡ Aktif'],['my','🏆 Katıldıklarım']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            style={{flex:1,padding:'0.5rem',borderRadius:'10px',border:`1px solid ${tab===v?'rgba(239,68,68,0.4)':border}`,background:tab===v?'rgba(239,68,68,0.12)':'transparent',color:tab===v?'#F87171':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.8rem',cursor:'pointer'}}>
            {l}
          </button>
        ))}
      </div>

      {TOURNAMENTS.filter(t => tab==='my'?!!joined[t.id]:true).map(t => {
        const isJoined = !!joined[t.id];
        const rank = myRank(t);
        const leaders = getLeaders(t);
        const cc = catColor[t.category]||'#5A7089';
        return (
          <div key={t.id} style={{background:card,border:`1px solid ${isJoined?'rgba(239,68,68,0.25)':border}`,borderRadius:'14px',padding:'0.9rem',marginBottom:'0.6rem'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'0.5rem'}}>
              <div style={{display:'flex',gap:'0.6rem',alignItems:'center'}}>
                <span style={{fontSize:'1.75rem'}}>{t.icon}</span>
                <div>
                  <div style={{fontWeight:800,color:dark?'#E8EDF2':'#1E293B',fontSize:'0.88rem'}}>{t.title}</div>
                  <div style={{fontSize:'0.65rem',color:'#5A7089'}}>{t.desc}</div>
                  <span style={{fontSize:'0.6rem',fontWeight:700,color:cc,background:`${cc}18`,border:`1px solid ${cc}30`,borderRadius:'6px',padding:'0.1rem 0.4rem'}}>{t.category}</span>
                </div>
              </div>
              <button onClick={()=>join(t)} disabled={isJoined}
                style={{padding:'0.35rem 0.7rem',borderRadius:'9px',border:'none',background:isJoined?'rgba(16,185,129,0.15)':'linear-gradient(135deg,#EF4444,#DC2626)',color:isJoined?'#10B981':'#fff',fontWeight:700,fontSize:'0.72rem',cursor:isJoined?'default':'pointer',flexShrink:0}}>
                {isJoined?'✅ Katıldın':'Katıl'}
              </button>
            </div>

            <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.5rem'}}>
              {[['💰',fmtWord(t.reward.money)],['💎',`${t.reward.uc}UC`],['⭐',`${t.reward.xp}XP`]].map(([ic,v])=>(
                <div key={ic} style={{flex:1,textAlign:'center',background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'8px',padding:'0.3rem 0'}}>
                  <div style={{fontSize:'0.6rem',color:'#F87171',fontWeight:700}}>{ic} {v}</div>
                </div>
              ))}
            </div>

            {isJoined && (
              <div>
                <div style={{fontSize:'0.65rem',color:'#5A7089',fontWeight:700,marginBottom:'0.3rem'}}>🏆 Liderler ({t.duration} gün)</div>
                {leaders.map((u,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.25rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <span style={{fontSize:'0.7rem',color:i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'#5A7089',fontWeight:800,width:'18px'}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
                    <span style={{flex:1,fontSize:'0.72rem',color:u?.id===profile?.id?'#60A5FA':'#E8EDF2',fontWeight:u?.id===profile?.id?800:400}}>{u?.username||'?'}</span>
                    <span style={{fontSize:'0.7rem',color:'#10B981',fontWeight:700}}>{fmt(u?.[t.key]||0)}</span>
                  </div>
                ))}
                <div style={{marginTop:'0.35rem',fontSize:'0.65rem',color:'#60A5FA',fontWeight:700}}>Sıran: #{rank}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
