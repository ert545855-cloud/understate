// ═══════════════════════════════════════════════════════
// TÜRKİYE İL HARİTASI — Aile & Çete Bölge Kontrolü
// ═══════════════════════════════════════════════════════

// 81 İl: [id, isim, svgX, svgY, bölge]
// ViewBox: 0 0 840 440
const TR_PROVINCES = [
  [0,  'Adana',          352, 268, 'akdeniz'],
  [1,  'Adıyaman',       445, 258, 'g_dogu'],
  [2,  'Afyonkarahisar', 202, 178, 'ege'],
  [3,  'Ağrı',           548, 122, 'd_anadolu'],
  [4,  'Amasya',         382, 110, 'karadeniz'],
  [5,  'Ankara',         282, 135, 'i_anadolu'],
  [6,  'Antalya',        208, 258, 'akdeniz'],
  [7,  'Artvin',         508, 65,  'karadeniz'],
  [8,  'Aydın',          100, 198, 'ege'],
  [9,  'Balıkesir',      118, 140, 'marmara'],
  [10, 'Bilecik',        218, 124, 'marmara'],
  [11, 'Bingöl',         490, 168, 'd_anadolu'],
  [12, 'Bitlis',         530, 182, 'd_anadolu'],
  [13, 'Bolu',           272, 95,  'karadeniz'],
  [14, 'Burdur',         190, 240, 'akdeniz'],
  [15, 'Bursa',          174, 108, 'marmara'],
  [16, 'Çanakkale',      72,  118, 'marmara'],
  [17, 'Çankırı',        295, 108, 'karadeniz'],
  [18, 'Çorum',          342, 112, 'karadeniz'],
  [19, 'Denizli',        148, 195, 'ege'],
  [20, 'Diyarbakır',     490, 225, 'g_dogu'],
  [21, 'Edirne',         48,  62,  'marmara'],
  [22, 'Elazığ',         462, 182, 'd_anadolu'],
  [23, 'Erzincan',       460, 142, 'd_anadolu'],
  [24, 'Erzurum',        498, 128, 'd_anadolu'],
  [25, 'Eskişehir',      232, 150, 'i_anadolu'],
  [26, 'Gaziantep',      400, 275, 'g_dogu'],
  [27, 'Giresun',        440, 85,  'karadeniz'],
  [28, 'Gümüşhane',      462, 112, 'karadeniz'],
  [29, 'Hakkari',        555, 242, 'd_anadolu'],
  [30, 'Hatay',          382, 298, 'akdeniz'],
  [31, 'Isparta',        208, 230, 'akdeniz'],
  [32, 'Mersin',         318, 280, 'akdeniz'],
  [33, 'İstanbul',       142, 70,  'marmara'],
  [34, 'İzmir',          85,  168, 'ege'],
  [35, 'Kars',           545, 98,  'karadeniz'],
  [36, 'Kastamonu',      312, 88,  'karadeniz'],
  [37, 'Kayseri',        362, 180, 'i_anadolu'],
  [38, 'Kırklareli',     100, 48,  'marmara'],
  [39, 'Kırşehir',       328, 162, 'i_anadolu'],
  [40, 'Kocaeli',        210, 88,  'marmara'],
  [41, 'Konya',          268, 200, 'i_anadolu'],
  [42, 'Kütahya',        188, 152, 'ege'],
  [43, 'Malatya',        450, 195, 'd_anadolu'],
  [44, 'Manisa',         115, 150, 'ege'],
  [45, 'Kahramanmaraş',  392, 250, 'akdeniz'],
  [46, 'Mardin',         500, 250, 'g_dogu'],
  [47, 'Muğla',          125, 228, 'ege'],
  [48, 'Muş',            518, 165, 'd_anadolu'],
  [49, 'Nevşehir',       332, 195, 'i_anadolu'],
  [50, 'Niğde',          335, 220, 'i_anadolu'],
  [51, 'Ordu',           418, 82,  'karadeniz'],
  [52, 'Rize',           488, 72,  'karadeniz'],
  [53, 'Sakarya',        238, 90,  'marmara'],
  [54, 'Samsun',         380, 78,  'karadeniz'],
  [55, 'Siirt',          528, 238, 'g_dogu'],
  [56, 'Sinop',          340, 72,  'karadeniz'],
  [57, 'Sivas',          405, 150, 'i_anadolu'],
  [58, 'Tekirdağ',       90,  82,  'marmara'],
  [59, 'Tokat',          392, 120, 'karadeniz'],
  [60, 'Trabzon',        468, 78,  'karadeniz'],
  [61, 'Tunceli',        475, 162, 'd_anadolu'],
  [62, 'Şanlıurfa',      435, 278, 'g_dogu'],
  [63, 'Uşak',           155, 175, 'ege'],
  [64, 'Van',            562, 180, 'd_anadolu'],
  [65, 'Yozgat',         360, 150, 'i_anadolu'],
  [66, 'Zonguldak',      285, 75,  'karadeniz'],
  [67, 'Aksaray',        305, 200, 'i_anadolu'],
  [68, 'Bayburt',        478, 102, 'karadeniz'],
  [69, 'Karaman',        285, 228, 'i_anadolu'],
  [70, 'Kırıkkale',      308, 138, 'i_anadolu'],
  [71, 'Batman',         515, 230, 'g_dogu'],
  [72, 'Şırnak',         540, 255, 'g_dogu'],
  [73, 'Bartın',         268, 68,  'karadeniz'],
  [74, 'Ardahan',        528, 65,  'karadeniz'],
  [75, 'Iğdır',          568, 118, 'd_anadolu'],
  [76, 'Yalova',         196, 106, 'marmara'],
  [77, 'Karabük',        292, 82,  'karadeniz'],
  [78, 'Kilis',          392, 288, 'g_dogu'],
  [79, 'Osmaniye',       368, 278, 'akdeniz'],
  [80, 'Düzce',          255, 85,  'karadeniz'],
];

const REGION_COLORS = {
  marmara:   '#3B82F6',
  ege:       '#8B5CF6',
  akdeniz:   '#F59E0B',
  i_anadolu: '#6B7280',
  karadeniz: '#10B981',
  d_anadolu: '#EF4444',
  g_dogu:    '#F97316',
};

const REGION_LABELS = {
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
  const vbW = 840, vbH = compact ? 320 : 430;
  const R = compact ? 7 : 9;

  return (
    <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
      <svg
        viewBox={`0 0 ${vbW} ${compact ? 380 : vbH}`}
        style={{ width: '100%', maxWidth: 840, display: 'block', cursor: 'pointer' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width={vbW} height={vbH} fill="rgba(10,20,35,0.6)" rx="12"/>

        {/* Province circles */}
        {TR_PROVINCES.map(([id, name, px, py, region]) => {
          const ctrl = controlData?.[name];
          const owned = ctrl && ctrl.ownerType !== 'neutral';
          const fillColor = owned ? (ctrl.color || '#10B981') : REGION_COLORS[region] + '55';
          const strokeColor = owned ? ctrl.color || '#10B981' : REGION_COLORS[region];
          const isHighlighted = highlightOwner && ctrl?.ownerName === highlightOwner;
          const isHov = hovered === id;
          const r = isHov ? R + 3 : (isHighlighted ? R + 2 : R);
          const security = ctrl?.security ?? 50;
          const welfare = ctrl?.welfare ?? 50;
          const secColor = security >= 70 ? '#10B981' : security >= 40 ? '#F59E0B' : '#EF4444';

          return (
            <g key={id}
              onClick={() => onProvinceClick?.([id, name, px, py, region], ctrl)}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Glow for owned provinces */}
              {owned && (
                <circle cx={px} cy={py} r={r + 5} fill={strokeColor} opacity={0.12}/>
              )}
              {/* Main circle */}
              <circle
                cx={px} cy={py} r={r}
                fill={owned ? fillColor : REGION_COLORS[region] + '33'}
                stroke={strokeColor}
                strokeWidth={owned ? 1.8 : 0.8}
                opacity={isHov ? 1 : 0.9}
              />
              {/* Security dot (tiny) */}
              {owned && (
                <circle cx={px + r - 2} cy={py - r + 2} r={2.5} fill={secColor}/>
              )}
              {/* Province name on hover */}
              {isHov && (
                <text x={px} y={py - r - 5} textAnchor="middle" fontSize="8.5" fill="#E8EDF2" fontWeight="700"
                  style={{ pointerEvents: 'none', textShadow: '0 1px 4px #000' }}>
                  {name}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend */}
        {!compact && Object.entries(REGION_COLORS).map(([key, color], i) => (
          <g key={key} transform={`translate(${12 + (i % 4) * 200}, ${vbH - 36 + Math.floor(i / 4) * 16})`}>
            <circle cx={6} cy={6} r={5} fill={color + '66'} stroke={color} strokeWidth="1"/>
            <text x={14} y={10} fontSize="8" fill={color} fontWeight="600">{REGION_LABELS[key]}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ── Ana ekran ──────────────────────────────────────────────────────────────
window.TurkeyMapScreen = function TurkeyMapScreen({ profile, gangs, families, showNotif, setCurrentPage, mode }) {
  const STORAGE_KEY = 'rep_provinceControl';
  const readCtrl = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } };
  const [control, setControl] = React.useState(readCtrl);
  const [selected, setSelected] = React.useState(null);
  const [viewMode, setViewMode] = React.useState('all');

  React.useEffect(() => {
    const h = () => setControl(readCtrl());
    window.addEventListener('provinceControlUpdate', h);
    return () => window.removeEventListener('provinceControlUpdate', h);
  }, []);

  const uid   = profile?.uid || profile?.id;
  const uname = profile?.username;

  const famArr = Array.isArray(families) ? families : [];
  const gangArr = Array.isArray(gangs) ? gangs : [];

  const myFamily = famArr.find(f => (f.members||[]).includes(uname) || f.leader===uname);
  const myGang   = gangArr.find(g => g.type==='gang' && ((g.members||[]).includes(uid)||(g.members||[]).includes(uname)));

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
      if ((fam?.treasury || 0) < cost) return showNotif(`Kasada en az ₺${(cost/1e6).toFixed(0)}M gerekli`, 'error');
      const updated = fams.map(f => f.id === myFamily.id ? { ...f, treasury: (f.treasury||0) - cost } : f);
      localStorage.setItem('rep_families', JSON.stringify(updated));
    } else {
      if (!myGang) return showNotif('Çeteniz yok', 'error');
      if ((myGang.power||0) < 50) return showNotif('En az 50 çete gücü gerekli', 'error');
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
      const updated = fams.map(f => f.name === ctrl.ownerName ? { ...f, treasury: (f.treasury||0) - cost } : f);
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

  const myProvinces = TR_PROVINCES.filter(([,name]) => {
    const c = control[name];
    if (!c || c.ownerType === 'neutral') return false;
    if (c.ownerType === 'family' && myFamily && c.ownerName === myFamily.name) return true;
    if (c.ownerType === 'gang'   && myGang   && c.ownerName === myGang.name)   return true;
    return false;
  });

  const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '1rem', marginBottom: '0.75rem' };

  return (
    <div>
      <div className="ministry-header">🗺️ Türkiye Bölge Haritası</div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
        {[
          { l: 'Benim Bölgem', v: myProvinces.length, c: '#10B981' },
          { l: 'Aile Kontrolü', v: Object.values(control).filter(c => c.ownerType === 'family').length, c: '#A78BFA' },
          { l: 'Çete Kontrolü', v: Object.values(control).filter(c => c.ownerType === 'gang').length, c: '#EF4444' },
        ].map(s => (
          <div key={s.l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: s.c }}>{s.v}</div>
            <div style={{ fontSize: '0.6rem', color: '#5E7390' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* View filter */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.6rem' }}>
        {[['all','Tümü'],['family','👨‍👩‍👧‍👦 Aile'],['gang','⚔️ Çete']].map(([id,lbl]) => (
          <button key={id} onClick={() => setViewMode(id)} style={{ padding: '0.3rem 0.65rem', borderRadius: 8, border: 'none', background: viewMode === id ? 'var(--accent)' : 'rgba(255,255,255,0.06)', color: viewMode === id ? '#000' : '#8899AA', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>{lbl}</button>
        ))}
      </div>

      {/* Map */}
      <div style={{ ...card, padding: '0.5rem', marginBottom: '0.75rem' }}>
        <TurkeyProvinceMap
          controlData={filteredControl}
          highlightOwner={myFamily?.name || myGang?.name}
          onProvinceClick={([id, name, px, py, region], ctrl) => setSelected({ id, name, px, py, region, ctrl: ctrl || null })}
        />
      </div>

      {/* Province Detail Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 70px' }} onClick={() => setSelected(null)}>
          <div style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '1.25rem', paddingBottom: '1.5rem' }} onClick={e => e.stopPropagation()}>
            {/* Province header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#E8EDF2' }}>{selected.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#5E7390' }}>{REGION_LABELS[selected.region]} Bölgesi</div>
              </div>
              {selected.ctrl ? (
                <span style={{ background: (selected.ctrl.color || '#10B981') + '22', border: `1px solid ${(selected.ctrl.color || '#10B981')}44`, borderRadius: 8, padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, color: selected.ctrl.color || '#10B981' }}>
                  {selected.ctrl.ownerType === 'family' ? '👨‍👩‍👧‍👦' : '⚔️'} {selected.ctrl.ownerName}
                </span>
              ) : (
                <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '0.25rem 0.6rem', fontSize: '0.7rem', color: '#5E7390' }}>⬜ Bağımsız</span>
              )}
            </div>

            {/* Stats */}
            {selected.ctrl && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {[
                  { l: '🛡️ Güvenlik', v: selected.ctrl.security ?? 50, c: '#60A5FA' },
                  { l: '💚 Refah',    v: selected.ctrl.welfare  ?? 50, c: '#10B981' },
                ].map(s => (
                  <div key={s.l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.5rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#8899AA', marginBottom: '0.25rem' }}>{s.l}</div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.v}%`, background: s.c, borderRadius: 3, transition: 'width 0.4s' }}/>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: s.c, fontWeight: 700, marginTop: '0.2rem' }}>{s.v}%</div>
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
                      👨‍👩‍👧‍👦 Aile Adına Talep Et (₺2M kasadan)
                    </button>
                  )}
                  {myGang && (
                    <button className="btn btn-red" style={{ width: '100%' }}
                      onClick={() => claimProvince(selected.name, myGang.name, 'gang', '#EF4444')}>
                      ⚔️ Çete Adına Ele Geçir (50 Güç)
                    </button>
                  )}
                </>
              )}
              {selected.ctrl && isOwner(selected.ctrl) && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem' }}
                      onClick={() => investProvince(selected.name, 'security')}>
                      🛡️ Güvenliği Artır (+10) ₺500K
                    </button>
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem' }}
                      onClick={() => investProvince(selected.name, 'welfare')}>
                      💚 Refahı Artır (+10) ₺300K
                    </button>
                  </div>
                  <button className="btn" style={{ width: '100%', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: '0.8rem' }}
                    onClick={() => releaseProvince(selected.name)}>
                    🏳️ Bölgeyi Bırak
                  </button>
                </>
              )}
              {selected.ctrl && !isOwner(selected.ctrl) && myGang && (
                <button className="btn btn-red" style={{ width: '100%', fontSize: '0.8rem' }}
                  onClick={() => {
                    const s = selected.ctrl.security ?? 50;
                    if ((myGang.power||0) < 30 + s) return showNotif(`Bu bölge için ${30 + s} çete gücü gerekli`, 'error');
                    const updated = {
                      ...control,
                      [selected.name]: { ownerName: myGang.name, ownerType: 'gang', color: '#EF4444', security: Math.max(20, s - 20), welfare: selected.ctrl.welfare ?? 50, claimedAt: Date.now() }
                    };
                    saveControl(updated);
                    showNotif(`⚔️ ${selected.name} çetenize geçti!`, 'success');
                    setSelected(null);
                  }}>
                  ⚔️ Bölgeye Saldır ({30 + (selected.ctrl.security ?? 50)} Güç)
                </button>
              )}
              <button className="btn" style={{ width: '100%', border: '1px solid rgba(255,255,255,0.1)', color: '#8899AA', fontSize: '0.8rem' }} onClick={() => setSelected(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My provinces list */}
      {myProvinces.length > 0 && (
        <div style={card}>
          <div className="card-title">🏴 Kontrol Ettiğin Bölgeler ({myProvinces.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
            {myProvinces.map(([id, name,,, region]) => {
              const c = control[name];
              return (
                <button key={id} onClick={() => setSelected({ id, name, region, ctrl: c })}
                  style={{ background: (c.color||'#10B981') + '18', border: `1px solid ${(c.color||'#10B981')}44`, borderRadius: 8, padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700, color: c.color||'#10B981', cursor: 'pointer' }}>
                  {name} 🛡️{c.security??50}%
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
