// ═══════════════════════════════════════════════════════
// TÜRKİYE İL HARİTASI — Aile & Çete Bölge Kontrolü
// ViewBox: 0 0 820 360  (PoliticsScreen TurkeyMap ile aynı sistem)
// ═══════════════════════════════════════════════════════

// Türkiye sınır yolu (820x360 koordinat sistemi)
const TR_OUTLINE_PATH = "M 27,122 L 27,92 L 34,39 L 62,35 L 74,76 L 100,68 L 140,55 L 140,75 L 178,92 L 197,88 L 229,84 L 257,51 L 280,41 L 292,65 L 341,55 L 400,19 L 429,60 L 450,60 L 516,77 L 537,81 L 594,76 L 628,75 L 684,66 L 721,70 L 738,98 L 778,135 L 778,160 L 765,264 L 749,260 L 711,266 L 688,244 L 654,246 L 638,278 L 554,287 L 494,292 L 483,311 L 447,291 L 443,330 L 420,318 L 378,306 L 355,312 L 210,301 L 193,280 L 111,283 L 89,249 L 59,217 L 27,180 Z";

// 81 İl: bölge bilgisi (pozisyon PROVINCE_MAP_DATA global'inden alınır)
const TR_REGION_MAP = {
  'Adana':'akdeniz','Adıyaman':'g_dogu','Afyonkarahisar':'ege',
  'Ağrı':'d_anadolu','Amasya':'karadeniz','Ankara':'i_anadolu',
  'Antalya':'akdeniz','Artvin':'karadeniz','Aydın':'ege',
  'Balıkesir':'marmara','Bilecik':'marmara','Bingöl':'d_anadolu',
  'Bitlis':'d_anadolu','Bolu':'karadeniz','Burdur':'akdeniz',
  'Bursa':'marmara','Çanakkale':'marmara','Çankırı':'karadeniz',
  'Çorum':'karadeniz','Denizli':'ege','Diyarbakır':'g_dogu',
  'Edirne':'marmara','Elazığ':'d_anadolu','Erzincan':'d_anadolu',
  'Erzurum':'d_anadolu','Eskişehir':'i_anadolu','Gaziantep':'g_dogu',
  'Giresun':'karadeniz','Gümüşhane':'karadeniz','Hakkari':'d_anadolu',
  'Hatay':'akdeniz','Isparta':'akdeniz','Mersin':'akdeniz',
  'İstanbul':'marmara','İzmir':'ege','Kars':'karadeniz',
  'Kastamonu':'karadeniz','Kayseri':'i_anadolu','Kırklareli':'marmara',
  'Kırşehir':'i_anadolu','Kocaeli':'marmara','Konya':'i_anadolu',
  'Kütahya':'ege','Malatya':'d_anadolu','Manisa':'ege',
  'Kahramanmaraş':'akdeniz','Mardin':'g_dogu','Muğla':'ege',
  'Muş':'d_anadolu','Nevşehir':'i_anadolu','Niğde':'i_anadolu',
  'Ordu':'karadeniz','Rize':'karadeniz','Sakarya':'marmara',
  'Samsun':'karadeniz','Siirt':'g_dogu','Sinop':'karadeniz',
  'Sivas':'i_anadolu','Tekirdağ':'marmara','Tokat':'karadeniz',
  'Trabzon':'karadeniz','Tunceli':'d_anadolu','Şanlıurfa':'g_dogu',
  'Uşak':'ege','Van':'d_anadolu','Yozgat':'i_anadolu',
  'Zonguldak':'karadeniz','Aksaray':'i_anadolu','Bayburt':'karadeniz',
  'Karaman':'i_anadolu','Kırıkkale':'i_anadolu','Batman':'g_dogu',
  'Şırnak':'g_dogu','Bartın':'karadeniz','Ardahan':'karadeniz',
  'Iğdır':'d_anadolu','Yalova':'marmara','Karabük':'karadeniz',
  'Kilis':'g_dogu','Osmaniye':'akdeniz','Düzce':'karadeniz',
};

const TR_REGION_COLORS = {
  marmara:   '#3B82F6',
  ege:       '#8B5CF6',
  akdeniz:   '#F59E0B',
  i_anadolu: '#6B7280',
  karadeniz: '#10B981',
  d_anadolu: '#EF4444',
  g_dogu:    '#F97316',
};

const TR_REGION_LABELS = {
  marmara:   'Marmara',
  ege:       'Ege',
  akdeniz:   'Akdeniz',
  i_anadolu: 'İç Anadolu',
  karadeniz: 'Karadeniz',
  d_anadolu: 'D. Anadolu',
  g_dogu:    'G.D. Anadolu',
};

// ── Paylaşılan harita bileşeni ─────────────────────────────────────────────
window.TurkeyProvinceMap = function TurkeyProvinceMap({ controlData, highlightOwner, onProvinceClick, compact }) {
  const [hovered, setHovered] = React.useState(null);

  // PROVINCE_MAP_DATA global (app.js'den) — {n, x, y} formatı
  const provinces = (typeof PROVINCE_MAP_DATA !== 'undefined' ? PROVINCE_MAP_DATA : []);

  const vbH = compact ? 300 : 360;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg
        viewBox={`0 0 820 ${vbH}`}
        style={{ width: '100%', display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="trSeaGrad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#0B1D33"/>
            <stop offset="100%" stopColor="#060D18"/>
          </radialGradient>
          <filter id="trGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="trDotShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.6)"/>
          </filter>
        </defs>

        {/* Sea background */}
        <rect width="820" height={vbH} fill="url(#trSeaGrad)"/>

        {/* Subtle grid */}
        {[80,160,240,320].map(y => <line key={y} x1="0" y1={y} x2="820" y2={y} stroke="rgba(255,255,255,0.015)" strokeWidth="0.5"/>)}
        {[164,328,492,656].map(x => <line key={x} x1={x} y1="0" x2={x} y2={vbH} stroke="rgba(255,255,255,0.015)" strokeWidth="0.5"/>)}

        {/* Turkey land outline */}
        <path d={TR_OUTLINE_PATH}
          fill="rgba(20,35,60,0.95)"
          stroke="rgba(80,140,220,0.35)"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Subtle inner glow on land border */}
        <path d={TR_OUTLINE_PATH}
          fill="none"
          stroke="rgba(100,180,255,0.1)"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Province circles */}
        {provinces.map(({ n, x, y }) => {
          const ctrl = controlData?.[n];
          const owned = ctrl && ctrl.ownerType !== 'neutral';
          const region = TR_REGION_MAP[n] || 'i_anadolu';
          const regionColor = TR_REGION_COLORS[region] || '#6B7280';
          const fillColor = owned ? (ctrl.color || regionColor) : regionColor;
          const isHighlighted = highlightOwner && ctrl?.ownerName === highlightOwner;
          const isHov = hovered === n;
          const r = isHov ? 12 : isHighlighted ? 11 : owned ? 9 : 6;
          const security = ctrl?.security ?? 50;
          const secColor = security >= 70 ? '#10B981' : security >= 40 ? '#F59E0B' : '#EF4444';

          return (
            <g key={n}
              style={{ cursor: onProvinceClick ? 'pointer' : 'default' }}
              onClick={() => onProvinceClick?.(n, ctrl)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Outer glow for controlled or hovered */}
              {(owned || isHov) && (
                <circle cx={x} cy={y} r={r + 7} fill={fillColor} opacity={isHov ? 0.2 : 0.1}/>
              )}
              {/* Main circle */}
              <circle
                cx={x} cy={y} r={r}
                fill={owned ? fillColor + 'CC' : regionColor + '44'}
                stroke={owned ? fillColor : regionColor + '99'}
                strokeWidth={owned ? 1.8 : 0.9}
                filter={owned ? 'url(#trDotShadow)' : undefined}
              />
              {/* Security indicator dot */}
              {owned && (
                <circle cx={x + r - 1} cy={y - r + 1} r={2.2} fill={secColor} stroke="rgba(0,0,0,0.5)" strokeWidth="0.5"/>
              )}
              {/* Province name — always visible if owned or hovered */}
              {(isHov || (owned && r >= 9)) && (
                <text
                  x={x} y={y - r - 4}
                  textAnchor="middle"
                  fontSize={isHov ? 9 : 7.5}
                  fill={owned ? fillColor : '#C8D8E8'}
                  fontWeight="800"
                  style={{ pointerEvents: 'none' }}
                  stroke="rgba(5,15,30,0.9)"
                  strokeWidth="2.5"
                  paintOrder="stroke"
                >
                  {n}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend — regions */}
        {!compact && Object.entries(TR_REGION_COLORS).map(([key, color], i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          return (
            <g key={key} transform={`translate(${8 + col * 200}, ${vbH - 30 + row * 14})`}>
              <circle cx={5} cy={5} r={4} fill={color + '66'} stroke={color} strokeWidth="1"/>
              <text x={13} y={9} fontSize="7.5" fill={color} fontWeight="600">{TR_REGION_LABELS[key]}</text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(8,18,35,0.95)', border: '1px solid rgba(100,160,255,0.25)',
          borderRadius: 8, padding: '4px 10px', pointerEvents: 'none', whiteSpace: 'nowrap',
          fontSize: '0.72rem', color: '#C8D8E8', fontWeight: 700,
        }}>
          {hovered}
          {controlData?.[hovered] && (
            <span style={{ color: controlData[hovered].color || '#10B981', marginLeft: 6 }}>
              — {controlData[hovered].ownerName}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ── Ana ekran ──────────────────────────────────────────────────────────────
window.TurkeyMapScreen = function TurkeyMapScreen({ profile, gangs, families, showNotif, setCurrentPage, mode }) {
  const STORAGE_KEY = 'rep_provinceControl';
  const readCtrl = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } };
  const [control, setControl]   = React.useState(readCtrl);
  const [selected, setSelected] = React.useState(null);
  const [viewMode, setViewMode] = React.useState('all');

  React.useEffect(() => {
    const h = () => setControl(readCtrl());
    window.addEventListener('provinceControlUpdate', h);
    return () => window.removeEventListener('provinceControlUpdate', h);
  }, []);

  const uid   = profile?.uid || profile?.id;
  const uname = profile?.username;

  const famArr  = Array.isArray(families) ? families : [];
  const gangArr = Array.isArray(gangs) ? gangs : [];

  const myFamily = famArr.find(f => (f.members || []).includes(uname) || f.leader === uname);
  const myGang   = gangArr.find(g => g.type === 'gang' && ((g.members || []).includes(uid) || (g.members || []).includes(uname)));

  const isOwner = (ctrl) => {
    if (!ctrl || ctrl.ownerType === 'neutral') return false;
    if (ctrl.ownerType === 'family' && myFamily && ctrl.ownerName === myFamily.name) return true;
    if (ctrl.ownerType === 'gang'   && myGang   && ctrl.ownerName === myGang.name)   return true;
    return false;
  };

  const saveControl = (updated) => {
    setControl(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('provinceControlUpdate'));
    try { window._socket?.emit('province:sync', { control: updated }); } catch(e) {}
  };

  const claimProvince = (name, ownerName, ownerType, color) => {
    const cost = 2000000;
    if (ownerType === 'family') {
      if (!myFamily) return showNotif('Aileniz yok', 'error');
      const fams = JSON.parse(localStorage.getItem('rep_families') || '[]');
      const fam = fams.find(f => f.id === myFamily.id);
      if ((fam?.treasury || 0) < cost) return showNotif(`Kasada en az ₺${(cost / 1e6).toFixed(0)}M gerekli`, 'error');
      const updated = fams.map(f => f.id === myFamily.id ? { ...f, treasury: (f.treasury || 0) - cost } : f);
      localStorage.setItem('rep_families', JSON.stringify(updated));
    } else {
      if (!myGang) return showNotif('Çeteniz yok', 'error');
      const totalPower = (myGang.power || 10) + ((myGang.weapons || 0) * 5) + ((myGang.ammo || 0) * 3);
      if (totalPower < 50) return showNotif('En az 50 çete gücü gerekli', 'error');
    }
    const updated = {
      ...control,
      [name]: { ownerName, ownerType, color, security: 60, welfare: 55, claimedAt: Date.now() }
    };
    saveControl(updated);
    showNotif(`🗺️ ${name} ${ownerType === 'family' ? 'aile' : 'çete'} kontrolüne geçti!`, 'success');
    setSelected(null);
  };

  const investProvince = (name, field) => {
    const cost = field === 'security' ? 500000 : 300000;
    const ctrl = control[name];
    if (!ctrl || !isOwner(ctrl)) return;
    if (ctrl.ownerType === 'family') {
      const fams = JSON.parse(localStorage.getItem('rep_families') || '[]');
      const fam = fams.find(f => f.name === ctrl.ownerName);
      if ((fam?.treasury || 0) < cost) return showNotif('Kasada yeterli para yok', 'error');
      const updated = fams.map(f => f.name === ctrl.ownerName ? { ...f, treasury: (f.treasury || 0) - cost } : f);
      localStorage.setItem('rep_families', JSON.stringify(updated));
    }
    const cur = ctrl[field] ?? 50;
    const updated = { ...control, [name]: { ...ctrl, [field]: Math.min(100, cur + 10) } };
    saveControl(updated);
    showNotif(`✅ ${name} ${field === 'security' ? 'güvenlik' : 'refah'} +10`, 'success');
    setSelected(prev => prev ? { ...prev, ctrl: updated[name] } : prev);
  };

  const releaseProvince = (name) => {
    const { [name]: _, ...rest } = control;
    saveControl(rest);
    showNotif(`${name} serbest bırakıldı`, 'info');
    setSelected(null);
  };

  const filteredControl = viewMode === 'family'
    ? Object.fromEntries(Object.entries(control).filter(([, v]) => v.ownerType === 'family'))
    : viewMode === 'gang'
    ? Object.fromEntries(Object.entries(control).filter(([, v]) => v.ownerType === 'gang'))
    : control;

  const allProvinceNames = typeof PROVINCE_MAP_DATA !== 'undefined' ? PROVINCE_MAP_DATA.map(p => p.n) : [];
  const myProvinces = allProvinceNames.filter(name => {
    const c = control[name];
    if (!c || c.ownerType === 'neutral') return false;
    if (c.ownerType === 'family' && myFamily && c.ownerName === myFamily.name) return true;
    if (c.ownerType === 'gang'   && myGang   && c.ownerName === myGang.name)   return true;
    return false;
  });

  const familyCtrl = Object.values(control).filter(c => c.ownerType === 'family').length;
  const gangCtrl   = Object.values(control).filter(c => c.ownerType === 'gang').length;

  return (
    <div style={{ padding: '0.75rem' }}>
      {/* Header */}
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1.15rem', color: '#60A5FA', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
        🗺️ Türkiye Bölge Haritası
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '0.7rem' }}>
        {[
          { l: 'Benim Bölgem', v: myProvinces.length, c: '#10B981', ic: '🏴' },
          { l: 'Aile Bölgesi', v: familyCtrl,         c: '#A78BFA', ic: '👨‍👩‍👧' },
          { l: 'Çete Bölgesi', v: gangCtrl,            c: '#EF4444', ic: '⚔️' },
        ].map(s => (
          <div key={s.l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: '1.15rem', color: s.c }}>{s.ic} {s.v}</div>
            <div style={{ fontSize: '0.58rem', color: '#5E7390', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* View filter */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.55rem' }}>
        {[['all', '🌍 Tümü'], ['family', '👨‍👩‍👧 Aile'], ['gang', '⚔️ Çete']].map(([id, lbl]) => (
          <button key={id} onClick={() => setViewMode(id)} style={{
            padding: '0.3rem 0.75rem', borderRadius: 8, border: 'none',
            background: viewMode === id ? '#3B82F6' : 'rgba(255,255,255,0.06)',
            color: viewMode === id ? '#fff' : '#6B84A0',
            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>{lbl}</button>
        ))}
      </div>

      {/* Map */}
      <div style={{ background: 'rgba(4,9,20,0.97)', border: '1px solid rgba(60,120,200,0.2)', borderRadius: 14, overflow: 'hidden', marginBottom: '0.75rem', position: 'relative' }}>
        <TurkeyProvinceMap
          controlData={filteredControl}
          highlightOwner={myFamily?.name || myGang?.name}
          onProvinceClick={(name, ctrl) => setSelected({ name, ctrl: ctrl || null })}
        />
      </div>

      {/* Province Detail Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 70px' }}
          onClick={() => setSelected(null)}>
          <div style={{ background: '#0D1B2A', border: '1px solid rgba(100,160,255,0.18)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '1.25rem 1.25rem 1.5rem' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
              <div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 900, fontSize: '1.15rem', color: '#E8EDF2' }}>{selected.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#5E7390', marginTop: 2 }}>
                  {TR_REGION_LABELS[TR_REGION_MAP[selected.name] || 'i_anadolu'] || ''} Bölgesi
                </div>
              </div>
              {selected.ctrl ? (
                <span style={{ background: (selected.ctrl.color || '#10B981') + '22', border: `1px solid ${(selected.ctrl.color || '#10B981')}44`, borderRadius: 8, padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, color: selected.ctrl.color || '#10B981' }}>
                  {selected.ctrl.ownerType === 'family' ? '👨‍👩‍👧' : '⚔️'} {selected.ctrl.ownerName}
                </span>
              ) : (
                <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '0.25rem 0.6rem', fontSize: '0.7rem', color: '#5E7390' }}>⬜ Bağımsız</span>
              )}
            </div>

            {/* Stats bars */}
            {selected.ctrl && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                {[
                  { l: '🛡️ Güvenlik', v: selected.ctrl.security ?? 50, c: '#60A5FA' },
                  { l: '💚 Refah',    v: selected.ctrl.welfare  ?? 50, c: '#10B981' },
                ].map(s => (
                  <div key={s.l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#8899AA', marginBottom: '0.25rem' }}>{s.l}</div>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.v}%`, background: s.c, borderRadius: 3, transition: 'width 0.4s' }}/>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: s.c, fontWeight: 700, marginTop: 3 }}>{s.v}%</div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {!selected.ctrl && (
                <>
                  {myFamily && (
                    <button className="btn btn-primary" style={{ width: '100%' }}
                      onClick={() => claimProvince(selected.name, myFamily.name, 'family', '#A78BFA')}>
                      👨‍👩‍👧 Aile Adına Talep Et (₺2M kasadan)
                    </button>
                  )}
                  {myGang && (
                    <button className="btn btn-red" style={{ width: '100%' }}
                      onClick={() => claimProvince(selected.name, myGang.name, 'gang', '#EF4444')}>
                      ⚔️ Çete Adına Ele Geçir (50 Güç)
                    </button>
                  )}
                  {!myFamily && !myGang && (
                    <div style={{ textAlign: 'center', color: '#5E7390', fontSize: '0.8rem', padding: '0.5rem' }}>Bölge talep etmek için bir aile veya çeteye katıl.</div>
                  )}
                </>
              )}
              {selected.ctrl && isOwner(selected.ctrl) && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <button className="btn btn-primary" style={{ fontSize: '0.78rem' }}
                      onClick={() => investProvince(selected.name, 'security')}>
                      🛡️ Güvenlik +10 (₺500K)
                    </button>
                    <button className="btn btn-primary" style={{ fontSize: '0.78rem' }}
                      onClick={() => investProvince(selected.name, 'welfare')}>
                      💚 Refah +10 (₺300K)
                    </button>
                  </div>
                  <button onClick={() => releaseProvince(selected.name)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'inherit' }}>
                    🏳️ Bölgeyi Bırak
                  </button>
                </>
              )}
              {selected.ctrl && !isOwner(selected.ctrl) && myGang && (
                <button className="btn btn-red" style={{ width: '100%', fontSize: '0.8rem' }}
                  onClick={() => {
                    const s = selected.ctrl.security ?? 50;
                    const totalPower = (myGang.power || 10) + ((myGang.weapons || 0) * 5) + ((myGang.ammo || 0) * 3);
                    if (totalPower < 30 + s) return showNotif(`Bu bölge için ${30 + s} çete gücü gerekli (şu an: ${totalPower})`, 'error');
                    const updated = {
                      ...control,
                      [selected.name]: { ownerName: myGang.name, ownerType: 'gang', color: '#EF4444', security: Math.max(20, s - 20), welfare: selected.ctrl.welfare ?? 50, claimedAt: Date.now() }
                    };
                    saveControl(updated);
                    showNotif(`⚔️ ${selected.name} çetenize geçti!`, 'success');
                    setSelected(null);
                  }}>
                  ⚔️ Saldır ({30 + (selected.ctrl.security ?? 50)} Güç gerekli)
                </button>
              )}
              <button onClick={() => setSelected(null)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#6B84A0', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', fontFamily: 'inherit' }}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My provinces list */}
      {myProvinces.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '0.85rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            🏴 Kontrolündeki Bölgeler ({myProvinces.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {myProvinces.map(name => {
              const c = control[name];
              return (
                <button key={name}
                  onClick={() => setSelected({ name, ctrl: c })}
                  style={{ background: (c.color || '#10B981') + '18', border: `1px solid ${(c.color || '#10B981')}44`, borderRadius: 8, padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700, color: c.color || '#10B981', cursor: 'pointer' }}>
                  {name} 🛡️{c.security ?? 50}%
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
