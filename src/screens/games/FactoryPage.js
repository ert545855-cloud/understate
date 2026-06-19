// ═══════════════════════════════════════════════════════
// FABRİKA YÖNETİMİ — Devlet & Özel Fabrikalar
// ═══════════════════════════════════════════════════════
function FactoryPage({ profile, setProfile, showNotif }) {
  const [factories, setFactories] = useLs('factories', []);
  const [tab, setTab] = useState('my');
  const [buildCat, setBuildCat] = useState('devlet');
  const cu = profile || {};
  const { dark } = useTheme();
  const bg   = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#fff';
  const bord = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const updateUser = (upd) => {
    const next = { ...cu, ...upd };
    setProfile(next);
    localStorage.setItem('rep_userProfile', JSON.stringify(next));
  };

  const DEVLET_TYPES = [
    { id:'d_tekstil',  name:'Devlet Tekstil',    icon:'🏛️', cat:'devlet', cost:350000,  income:2800,  prodTime:3*3600000,  product:'Kumaş',       desc:'Düşük başlangıç maliyeti' },
    { id:'d_gida',     name:'Devlet Gıda',        icon:'🏛️', cat:'devlet', cost:450000,  income:3500,  prodTime:4*3600000,  product:'Erzak',       desc:'Devlet sübvansiyonu' },
    { id:'d_celik',    name:'Devlet Çelikhane',   icon:'🏗️', cat:'devlet', cost:800000,  income:6500,  prodTime:6*3600000,  product:'Çelik',       desc:'Altyapı malzemesi' },
    { id:'d_mermi',    name:'Devlet Cephaneliği', icon:'🔴', cat:'devlet', cost:1200000, income:9000,  prodTime:8*3600000,  product:'Mermi',       desc:'Devlet silah üretimi' },
  ];

  const OZEL_TYPES = [
    { id:'o_tekstil',  name:'Özel Tekstil',       icon:'👕', cat:'ozel',   cost:500000,  income:3500,  prodTime:3*3600000,  product:'Kumaş',       desc:'Hızlı üretim' },
    { id:'o_gida',     name:'Özel Gıda',           icon:'🍞', cat:'ozel',   cost:750000,  income:5000,  prodTime:4*3600000,  product:'Ekmek',       desc:'Premium ürünler' },
    { id:'o_celik',    name:'Özel Çelik',          icon:'⚙️', cat:'ozel',   cost:1500000, income:10000, prodTime:6*3600000,  product:'Çelik',       desc:'Yüksek kalite' },
    { id:'o_elektro',  name:'Elektronik Fabrika',  icon:'💻', cat:'ozel',   cost:3000000, income:20000, prodTime:12*3600000, product:'Elektronik',  desc:'Yüksek teknoloji' },
    { id:'o_oto',      name:'Otomobil Fabrika',    icon:'🚗', cat:'ozel',   cost:5000000, income:35000, prodTime:24*3600000, product:'Araç',        desc:'Büyük sanayi' },
    { id:'o_mermi',    name:'Özel Mermi Fabrikası',icon:'💥', cat:'ozel',   cost:2500000, income:18000, prodTime:10*3600000, product:'Mermi',       desc:'Sivil silah üretimi' },
    { id:'o_silah',    name:'Silah Fabrikası',     icon:'🔫', cat:'ozel',   cost:4000000, income:28000, prodTime:18*3600000, product:'Silah',       desc:'Lisanslı silah üretimi' },
  ];

  const ALL_TYPES = [...DEVLET_TYPES, ...OZEL_TYPES];

  const myFact = factories.find(f => f.owner === cu.username);
  const now = Date.now();

  const buildFactory = (type) => {
    if ((cu.money || 0) < type.cost) { showNotif(`❌ ₺${type.cost.toLocaleString()} gerekli!`, 'error'); return; }
    if (myFact) { showNotif('❌ Zaten bir fabrikan var!', 'error'); return; }
    const fact = {
      id: Date.now(),
      type: type.id,
      typeBase: type.cat === 'devlet' ? type.id.replace('d_','') : type.id.replace('o_',''),
      category: type.cat,
      name: type.name,
      icon: type.icon,
      owner: cu.username,
      income: type.income,
      prodTime: type.prodTime,
      product: type.product,
      level: 1,
      lastProd: now,
      totalProd: 0,
    };
    updateUser({ money: (cu.money || 0) - type.cost });
    setFactories(prev => [...prev, fact]);
    showNotif(`✅ ${type.name} kuruldu!`, 'success');
  };

  const collectIncome = () => {
    if (!myFact) return;
    const elapsed = now - myFact.lastProd;
    const cycles  = Math.floor(elapsed / myFact.prodTime);
    if (cycles < 1) {
      const rem = myFact.prodTime - (elapsed % myFact.prodTime);
      showNotif(`⏳ ${Math.ceil(rem / 3600000)}sa ${Math.ceil((rem % 3600000) / 60000)}dk daha bekle!`, 'error');
      return;
    }
    const earned = cycles * myFact.income * myFact.level;
    updateUser({ money: (cu.money || 0) + earned });
    setFactories(prev => prev.map(f => f.id === myFact.id ? { ...f, lastProd: now, totalProd: (f.totalProd || 0) + cycles } : f));
    showNotif(`✅ ${cycles}x üretim tamamlandı: +₺${earned.toLocaleString()}`, 'success');
  };

  const upgradeFactory = () => {
    if (!myFact) return;
    const cost = myFact.level * 250000;
    if ((cu.money || 0) < cost) { showNotif(`❌ Geliştirme maliyeti: ₺${cost.toLocaleString()}`, 'error'); return; }
    updateUser({ money: (cu.money || 0) - cost });
    setFactories(prev => prev.map(f => f.id === myFact.id ? { ...f, level: f.level + 1, income: Math.floor(f.income * 1.4) } : f));
    showNotif(`✅ Fabrika Lv.${myFact.level + 1}'e yükseldi! Gelir +%40`, 'success');
  };

  const demolish = () => {
    if (!myFact) return;
    const refund = Math.floor((ALL_TYPES.find(t => t.id === myFact.type)?.cost || 0) * 0.4);
    updateUser({ money: (cu.money || 0) + refund });
    setFactories(prev => prev.filter(f => f.id !== myFact.id));
    showNotif(`🏚️ Fabrika yıkıldı. +₺${refund.toLocaleString()} iade`, 'info');
  };

  const CAT_COLOR = { devlet: '#60A5FA', ozel: '#A78BFA' };
  const CAT_LABEL = { devlet: '🏛️ Devlet Fabrikaları', ozel: '⚙️ Özel Fabrikalar' };

  return (
    <div style={{ padding: '1rem', background: bg, minHeight: '100%' }}>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.25rem', fontWeight: 900, color: '#F59E0B', marginBottom: '0.9rem' }}>🏭 Fabrika Yönetimi</div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
        {[
          { k:'my',    l:'🏭 Fabrikan' },
          { k:'build', l:'🏗️ Kur' },
          { k:'all',   l:'🌐 Tümü' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: '0.4rem 1rem', borderRadius: '2rem',
            border: `1px solid ${tab === t.k ? '#F59E0B' : bord}`,
            background: tab === t.k ? 'rgba(245,158,11,0.15)' : 'transparent',
            color: tab === t.k ? '#F59E0B' : '#666',
            cursor: 'pointer', fontWeight: tab === t.k ? 700 : 400,
            fontSize: '0.83rem', fontFamily: 'inherit',
          }}>{t.l}</button>
        ))}
      </div>

      {/* ── Benim Fabrikan ── */}
      {tab === 'my' && (
        <div>
          {!myFact && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#555' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏭</div>
              <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Henüz bir fabrikan yok.</div>
              <button onClick={() => setTab('build')} style={{ padding: '0.6rem 1.4rem', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, color: '#F59E0B', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>🏗️ Fabrika Kur</button>
            </div>
          )}
          {myFact && (() => {
            const elapsed = now - myFact.lastProd;
            const cycles  = Math.floor(elapsed / myFact.prodTime);
            const rem     = Math.max(0, myFact.prodTime - (elapsed % myFact.prodTime));
            const pct     = cycles > 0 ? 100 : Math.round(((elapsed % myFact.prodTime) / myFact.prodTime) * 100);
            const catColor = myFact.category === 'devlet' ? '#60A5FA' : '#A78BFA';
            const isMermi  = myFact.product === 'Mermi';
            return (
              <div>
                {/* Factory header card */}
                <div style={{ background: `linear-gradient(135deg,${catColor}11,rgba(11,21,39,0.95))`, border: `1px solid ${catColor}33`, borderRadius: 14, padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.58rem', color: catColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        {myFact.category === 'devlet' ? '🏛️ Devlet Fabrikası' : '⚙️ Özel Fabrika'}
                      </div>
                      <div style={{ fontWeight: 900, color: '#F59E0B', fontSize: '1.05rem' }}>{myFact.icon} {myFact.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#888', marginTop: 2 }}>Seviye {myFact.level} · Ürün: {myFact.product}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#10B981', fontSize: '1rem' }}>₺{myFact.income.toLocaleString()}</div>
                      <div style={{ fontSize: '0.62rem', color: '#666' }}>her {myFact.prodTime / 3600000}sa</div>
                    </div>
                  </div>

                  {/* Production progress */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: '0.68rem', color: '#888' }}>Üretim Durumu</div>
                      <div style={{ fontSize: '0.68rem', color: cycles > 0 ? '#10B981' : '#F59E0B', fontWeight: 700 }}>{pct}%</div>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: cycles > 0 ? 'linear-gradient(90deg,#10B981,#34D399)' : 'linear-gradient(90deg,#F59E0B,#FBBF24)', borderRadius: 3, transition: 'width 1s' }}/>
                    </div>
                    <div style={{ fontWeight: 700, color: cycles > 0 ? '#10B981' : '#F59E0B', fontSize: '0.85rem' }}>
                      {cycles > 0 ? `✅ ${cycles}x hazır! (₺${(cycles * myFact.income * myFact.level).toLocaleString()})` : `⏳ ${Math.ceil(rem / 3600000)}sa ${Math.ceil((rem % 3600000) / 60000)}dk`}
                    </div>
                  </div>

                  {/* Mermi fabrikası note */}
                  {isMermi && (
                    <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '0.4rem 0.65rem', marginBottom: '0.65rem', fontSize: '0.65rem', color: '#FB923C' }}>
                      🔴 Mermi fabrikası — Çeteler silah bölümünden mermi satın alabilir. Bu fabrika üretim geliri sağlar.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={collectIncome} style={{ flex: 1, padding: '0.55rem', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10B981', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.82rem' }}>💰 Topla</button>
                    <button onClick={upgradeFactory} style={{ flex: 1, padding: '0.55rem', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, color: '#A78BFA', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.82rem' }}>⬆️ Geliştir (₺{(myFact.level * 250000).toLocaleString()})</button>
                  </div>
                </div>

                {/* Total production stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {[
                    { l: 'Toplam Üretim', v: myFact.totalProd || 0, ic: '📦' },
                    { l: 'Seviye', v: myFact.level, ic: '⬆️' },
                    { l: 'Günlük Gelir', v: `₺${Math.floor(myFact.income * myFact.level * (24 * 3600000 / myFact.prodTime)).toLocaleString()}`, ic: '💸' },
                  ].map(s => (
                    <div key={s.l} style={{ background: 'rgba(255,255,255,0.04)', border: bord, borderRadius: 10, padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', marginBottom: 2 }}>{s.ic}</div>
                      <div style={{ fontWeight: 800, color: '#E8EDF2', fontSize: '0.85rem' }}>{s.v}</div>
                      <div style={{ fontSize: '0.58rem', color: '#5A7089' }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                <button onClick={demolish} style={{ width: '100%', padding: '0.45rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#EF4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', fontFamily: 'inherit' }}>
                  🏚️ Yık (₺{Math.floor((ALL_TYPES.find(t => t.id === myFact.type)?.cost || 0) * 0.4).toLocaleString()} iade)
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Fabrika Kur ── */}
      {tab === 'build' && (
        <div>
          {myFact && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '0.65rem', marginBottom: '0.85rem', fontSize: '0.78rem', color: '#F59E0B', textAlign: 'center' }}>
              Zaten bir fabrikan var. Yeni fabrika kurmak için önce mevcut fabrikayı yık.
            </div>
          )}

          {/* Category selector */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
            {['devlet','ozel'].map(c => (
              <button key={c} onClick={() => setBuildCat(c)} style={{
                flex: 1, padding: '0.6rem', borderRadius: 10,
                border: `1px solid ${buildCat === c ? CAT_COLOR[c] + '66' : bord}`,
                background: buildCat === c ? CAT_COLOR[c] + '18' : 'rgba(255,255,255,0.03)',
                color: buildCat === c ? CAT_COLOR[c] : '#666',
                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {CAT_LABEL[c]}
              </button>
            ))}
          </div>

          {/* Description */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${CAT_COLOR[buildCat]}22`, borderRadius: 10, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.7rem', color: '#8BA0B5', lineHeight: 1.6 }}>
            {buildCat === 'devlet'
              ? '🏛️ Devlet fabrikaları daha ucuz ama gelir özel fabrikalardan azdır. Güvenli ve sabittir.'
              : '⚙️ Özel fabrikalar daha pahalı ama çok daha yüksek gelir sağlar. Girişimci ruhu gerektirir.'}
          </div>

          {/* Factory type list */}
          {(buildCat === 'devlet' ? DEVLET_TYPES : OZEL_TYPES).map(type => {
            const canAfford = (cu.money || 0) >= type.cost;
            const accentCol = buildCat === 'devlet' ? '#60A5FA' : '#A78BFA';
            const isMermi   = type.product === 'Mermi';
            return (
              <div key={type.id} style={{
                background: card,
                border: `1px solid ${isMermi ? 'rgba(249,115,22,0.25)' : bord}`,
                borderRadius: 12, padding: '0.85rem', marginBottom: '0.65rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: dark ? '#E8EDF2' : '#1E293B' }}>
                      {type.icon} {type.name}
                      {isMermi && <span style={{ marginLeft: 6, fontSize: '0.6rem', background: 'rgba(249,115,22,0.2)', color: '#F97316', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>MERMİ</span>}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#888', marginTop: 2 }}>
                      {type.desc} · Ürün: {type.product}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#5A7089', marginTop: 2 }}>
                      💰 ₺{type.income.toLocaleString()}/üretim · ⏱ {type.prodTime / 3600000}sa
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: canAfford ? '#10B981' : '#EF4444', fontWeight: 800, fontSize: '0.9rem' }}>₺{type.cost.toLocaleString()}</div>
                    <div style={{ fontSize: '0.58rem', color: '#5A7089' }}>maliyet</div>
                  </div>
                </div>
                <button onClick={() => buildFactory(type)} disabled={!!myFact || !canAfford}
                  style={{
                    width: '100%', padding: '0.5rem', borderRadius: 8,
                    background: (myFact || !canAfford) ? 'rgba(255,255,255,0.04)' : `${accentCol}18`,
                    border: `1px solid ${(myFact || !canAfford) ? bord : accentCol + '44'}`,
                    color: (myFact || !canAfford) ? '#555' : accentCol,
                    cursor: (myFact || !canAfford) ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontFamily: 'inherit', fontSize: '0.82rem',
                  }}>
                  {myFact ? 'Zaten bir fabrikan var' : !canAfford ? `❌ ₺${type.cost.toLocaleString()} gerekli` : '🏗️ Kur'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tüm Fabrikalar ── */}
      {tab === 'all' && (
        <div>
          {factories.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#555' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🌐</div>
              <div>Henüz fabrika yok.</div>
            </div>
          )}
          {factories.map(f => {
            const isDevlet  = f.category === 'devlet';
            const catColor  = isDevlet ? '#60A5FA' : '#A78BFA';
            const isMermi   = f.product === 'Mermi';
            const elapsed   = now - f.lastProd;
            const cycles    = Math.floor(elapsed / f.prodTime);
            return (
              <div key={f.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', padding: '0.65rem 0.75rem', background: card, border: `1px solid ${isMermi ? 'rgba(249,115,22,0.2)' : bord}`, borderRadius: 10, marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{f.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: dark ? '#E8EDF2' : '#1E293B' }}>{f.name}</div>
                  <div style={{ fontSize: '0.65rem', color: '#888' }}>
                    {f.owner} · Lv.{f.level}
                    <span style={{ marginLeft: 6, color: catColor, fontWeight: 700 }}>{isDevlet ? '🏛️ Devlet' : '⚙️ Özel'}</span>
                    {isMermi && <span style={{ marginLeft: 6, color: '#F97316' }}>🔴 Mermi</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#10B981', fontWeight: 700, fontSize: '0.82rem' }}>₺{f.income.toLocaleString()}/üretim</div>
                  {cycles > 0 && <div style={{ fontSize: '0.6rem', color: '#10B981' }}>✅ {cycles}x hazır</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
