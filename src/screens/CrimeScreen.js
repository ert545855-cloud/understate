const SUC_TYPES = [
  {
    id: 'vergi_kacakciligi', label: 'Vergi Kaçakçılığı', icon: '📋',
    desc: 'Şirket gelirlerini gizleyerek vergi ödemekten kaçınmak.',
    risk: 0.25, reward: 0.15, minMoney: 500000,
    cooldownMs: 4*60*60*1000,
    severity: 'orta',
    detail: (amt) => `${fmtWord(amt)} değerinde vergi beyannamesi eksik`,
    penalty: (amt) => Math.floor(amt * 0.4),
    color: '#F59E0B',
  },
  {
    id: 'rüşvet', label: 'Rüşvet', icon: '💵',
    desc: 'Kamu görevlisine para ya da menfaat sağlamak.',
    risk: 0.20, reward: 80000, minMoney: 100000,
    cooldownMs: 2*60*60*1000,
    severity: 'orta',
    detail: () => 'Kamu görevlisine usulsüz ödeme iddiası',
    penalty: () => 250000,
    color: '#10B981',
  },
  {
    id: 'zimmete_gecirme', label: 'Zimmete Para Geçirme', icon: '🏦',
    desc: 'Parti veya şirket kasasından kişisel hesaba para aktarımı.',
    risk: 0.35, reward: 0.20, minMoney: 1000000,
    cooldownMs: 8*60*60*1000,
    severity: 'yuksek',
    detail: (amt) => `${fmtWord(amt)} zimmete geçirildi iddiası`,
    penalty: (amt) => Math.floor(amt * 0.6),
    color: '#EF4444',
  },
  {
    id: 'kara_para', label: 'Kara Para Aklama', icon: '🌀',
    desc: 'Yasadışı kaynaklı parayı meşru işlemlere entegre etmek.',
    risk: 0.28, reward: 0.12, minMoney: 2000000,
    cooldownMs: 6*60*60*1000,
    severity: 'yuksek',
    detail: (amt) => `${fmtWord(amt)} şüpheli para hareketi`,
    penalty: (amt) => Math.floor(amt * 0.5),
    color: '#8B5CF6',
  },
  {
    id: 'ihale_yolsuzlugu', label: 'İhale Yolsuzluğu', icon: '🔨',
    desc: 'Kamu ihalelerini usulsüz yönlendirmek.',
    risk: 0.18, reward: 500000, minMoney: 300000,
    cooldownMs: 3*60*60*1000,
    severity: 'dusuk',
    detail: () => 'Kamu ihalesi manipülasyonu',
    penalty: () => 400000,
    color: '#3B82F6',
  },
];

const VERDICT_INFO = {
  beraat:  { label:'Beraat',        color:'#10B981', icon:'✅', desc:'Delil yetersizliğinden dava düşürüldü.' },
  para:    { label:'Para Cezası',   color:'#F59E0B', icon:'💸', desc:'Para cezasına hükmedildi.' },
  hapis:   { label:'Tutukluluk',    color:'#EF4444', icon:'🔒', desc:'İşlemler 1 saat donduruldu.' },
  agir:    { label:'Ağır Ceza',     color:'#7C3AED', icon:'⛓️', desc:'Büyük para cezası + 2 saat dondurma.' },
};

const SEVERITY_COLOR = { dusuk:'#F59E0B', orta:'#EF4444', yuksek:'#7C3AED' };
const SEVERITY_LABEL = { dusuk:'Düşük', orta:'Orta', yuksek:'Yüksek' };

function GangCrimePage({ profile, setProfile, showNotif }) {
  const [ops, setOps] = React.useState([]);
  const [log, setLog] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(null);
  const [tick, setTick] = React.useState(0);

  const jwt = () => localStorage.getItem('us_jwt') || '';
  const myGangId = (() => {
    try {
      const gangs = JSON.parse(localStorage.getItem('rep_gangs') || '[]');
      const uid = profile?.id || profile?.uid;
      const g = gangs.find(g => g.leaderId === uid || (g.members || []).includes(uid));
      return g ? g.id : null;
    } catch { return null; }
  })();

  const loadOps = () => {
    fetch('/api/gang-crime/operations', { headers: { 'Authorization': 'Bearer ' + jwt() } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.operations) setOps(d.operations); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const loadLog = () => {
    if (!myGangId) return;
    fetch(`/api/gang-crime/log/${myGangId}`, { headers: { 'Authorization': 'Bearer ' + jwt() } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.log) setLog(d.log); })
      .catch(() => {});
  };

  React.useEffect(() => { loadOps(); loadLog(); }, []);

  // Countdown tick
  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const execute = async (op) => {
    if (!op.ready) return;
    setRunning(op.id);
    try {
      const res = await fetch('/api/gang-crime/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt() },
        body: JSON.stringify({ operationId: op.id, gangId: myGangId }),
      });
      const d = await res.json();
      if (!d.success) { showNotif(d.error || 'Hata', 'error'); setRunning(null); return; }
      if (d.operationSuccess) {
        const r = d.rewards;
        setProfile(p => {
          const np = { ...p, money: (p.money || 0) + (r.playerMoney || 0), xp: (p.xp || 0) + (r.xp || 0), hp: Math.max(1, (p.hp || 100) - (r.hpCost || 0)) };
          localStorage.setItem('rep_userProfile', JSON.stringify(np));
          return np;
        });
        showNotif(d.message, 'success');
      } else {
        setProfile(p => {
          const np = { ...p, hp: Math.max(1, (p.hp || 100) - (d.rewards?.hpCost || 10)) };
          localStorage.setItem('rep_userProfile', JSON.stringify(np));
          return np;
        });
        showNotif(d.message, 'error');
      }
      loadOps();
      loadLog();
    } catch { showNotif('Bağlantı hatası', 'error'); }
    setRunning(null);
  };

  const fmtMs = (ms) => {
    if (ms <= 0) return 'Hazır';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}s ${m}dk`;
    if (m > 0) return `${m}dk ${s}s`;
    return `${s}s`;
  };

  const riskColor = { low: '#10B981', medium: '#F59E0B', high: '#EF4444', extreme: '#7C3AED' };
  const riskLabel = { low: 'Düşük', medium: 'Orta', high: 'Yüksek', extreme: 'Ekstrm' };

  if (loading) return <div style={{textAlign:'center',padding:'2rem',color:'#5A7089'}}>⏳ Yükleniyor...</div>;

  return (
    <div style={{padding:'0.75rem'}}>
      <div style={{background:'linear-gradient(135deg,#1a0505,#3d0000)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'16px',padding:'1rem',textAlign:'center',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'1.75rem',marginBottom:'0.25rem'}}>🔫</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1rem',fontWeight:900,color:'#fff'}}>ÇETE SUÇ OPERASYONLARI</div>
        <div style={{fontSize:'0.68rem',color:'#94A3B8',marginTop:'0.2rem'}}>
          HP: <span style={{color:'#EF4444',fontWeight:700}}>{profile?.hp || 100}</span>
          &nbsp;•&nbsp;Çete: <span style={{color: myGangId ? '#10B981' : '#5A7089',fontWeight:700}}>{myGangId ? 'Aktif' : 'Yok'}</span>
        </div>
      </div>

      {ops.map(op => {
        const remaining = op.remainingMs > 0 ? Math.max(0, op.remainingMs - (tick * 1000 - tick * 0)) : 0;
        const liveRemaining = op.lastDone
          ? Math.max(0, op.lastDone + op.cooldownMs - Date.now())
          : 0;
        const ready = liveRemaining <= 0;
        const isRunning = running === op.id;
        const rc = riskColor[op.riskLevel] || '#F59E0B';
        return (
          <div key={op.id} style={{background:'rgba(11,21,39,0.9)',border:`1px solid ${ready?'rgba(239,68,68,0.25)':'rgba(255,255,255,0.05)'}`,borderRadius:'14px',padding:'0.85rem',marginBottom:'0.5rem',opacity:ready?1:0.75}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:'0.65rem'}}>
              <div style={{fontSize:'1.6rem',flexShrink:0}}>{op.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.4rem',flexWrap:'wrap',marginBottom:'0.2rem'}}>
                  <span style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.88rem'}}>{op.name}</span>
                  <span style={{fontSize:'0.58rem',background:`${rc}20`,color:rc,border:`1px solid ${rc}40`,borderRadius:'5px',padding:'1px 5px',fontWeight:700}}>{riskLabel[op.riskLevel]}</span>
                  {op.minLevel > 1 && <span style={{fontSize:'0.58rem',color:'#5A7089'}}>Lv{op.minLevel}+</span>}
                </div>
                <div style={{fontSize:'0.67rem',color:'#5A7089',marginBottom:'0.4rem'}}>{op.description}</div>
                <div style={{display:'flex',gap:'0.75rem',fontSize:'0.65rem',color:'#94A3B8',flexWrap:'wrap'}}>
                  <span>💰 ₺{(op.rewards.money[0]/1000).toFixed(0)}K–{(op.rewards.money[1]/1000).toFixed(0)}K</span>
                  <span>⚡ {op.rewards.xp[0]}–{op.rewards.xp[1]} XP</span>
                  <span>🏅 {op.rewards.merit[0]}–{op.rewards.merit[1]}</span>
                  <span>❤️ -{op.rewards.hpCost[0]}–{op.rewards.hpCost[1]} HP</span>
                  <span>✅ %{Math.round(op.successBase * 100)}</span>
                </div>
              </div>
              <button
                onClick={() => execute(op)}
                disabled={!ready || !!running}
                style={{flexShrink:0,padding:'0.45rem 0.75rem',borderRadius:'10px',border:'none',background:ready?'linear-gradient(135deg,#EF4444,#DC2626)':'rgba(255,255,255,0.05)',color:ready?'#fff':'#5A7089',fontWeight:700,fontSize:'0.75rem',cursor:ready&&!running?'pointer':'not-allowed',minWidth:'64px',textAlign:'center',opacity:isRunning?0.6:1}}>
                {isRunning ? '⏳' : ready ? '▶ Yap' : fmtMs(liveRemaining)}
              </button>
            </div>
          </div>
        );
      })}

      {log.length > 0 && (
        <div style={{marginTop:'0.75rem'}}>
          <div style={{fontSize:'0.7rem',color:'#5A7089',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.4rem'}}>📜 Son Operasyonlar</div>
          {log.slice(0, 8).map((l, i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.45rem 0.6rem',background:'rgba(255,255,255,0.03)',borderRadius:'8px',marginBottom:'0.25rem',border:'1px solid rgba(255,255,255,0.05)'}}>
              <span style={{fontSize:'0.9rem'}}>{l.success ? '✅' : '❌'}</span>
              <div style={{flex:1,minWidth:0}}>
                <span style={{fontSize:'0.73rem',fontWeight:700,color:'#E8EDF2'}}>{l.username}</span>
                <span style={{fontSize:'0.65rem',color:'#5A7089',marginLeft:'0.4rem'}}>{l.operation_id}</span>
              </div>
              <span style={{fontSize:'0.68rem',color:l.success?'#10B981':'#EF4444',fontWeight:700}}>
                {l.success ? `+₺${Number(l.reward_money||0).toLocaleString('tr-TR')}` : 'Başarısız'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CrimePage({ profile, setProfile, showNotif }) {
  const [tab, setTab] = useState('mahkeme');
  const [cases, setCases] = useLs('sucDavalari', []);
  const [cooldowns, setCooldowns] = useLs('sucCooldowns', {});
  const [selectedCase, setSelectedCase] = useState(null);

  const myCases = cases.filter(c => c.uid === profile?.uid || !c.uid);
  const activeCases = myCases.filter(c => c.stage !== 'kapandi');
  const closedCases = myCases.filter(c => c.stage === 'kapandi');

  const doCommitCrime = (suc) => {
    const money = profile?.money || 0;
    if (money < suc.minMoney) { showNotif(`Bu suçu işlemek için en az ${fmtWord(suc.minMoney)} gerekiyor`, 'error'); return; }
    const cd = cooldowns[suc.id];
    if (cd && Date.now() < cd) { showNotif(`Bekleme süresi: ${Math.ceil((cd-Date.now())/60000)} dk`, 'error'); return; }

    const amt = typeof suc.reward === 'number' ? suc.reward : Math.floor(money * suc.reward);
    const detected = Math.random() < suc.risk;

    setCooldowns(prev => ({...prev, [suc.id]: Date.now() + suc.cooldownMs}));

    if (detected) {
      const newCase = {
        id: genId(),
        uid: profile?.uid,
        username: profile?.username,
        type: suc.id,
        typeLabel: suc.label,
        icon: suc.icon,
        detail: suc.detail(money),
        amount: money,
        stage: 'suclama',
        verdict: null,
        ts: Date.now(),
        defenseUsed: false,
        severity: suc.severity,
        penalty: suc.penalty(money),
      };
      setCases(prev => [newCase, ...prev].slice(0,50));
      showNotif(`🚔 ${suc.label} suçundan dava açıldı! Mahkemeye çık.`, 'error');
    } else {
      setProfile(p => { const np={...p, money:(p.money||0)+amt, xp:(p.xp||0)+30}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
      showNotif(`✅ ${suc.label} başarıyla gizlendi. +${fmtWord(amt)} kazandın.`, 'success');
    }
  };

  const doDefend = (caseId) => {
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const defenseSuccess = Math.random() < 0.45;
      const verdict = defenseSuccess ? 'beraat' : (c.severity === 'yuksek' ? 'agir' : 'para');
      const penalty = (verdict === 'para' || verdict === 'agir') ? (c.penalty || 200000) : 0;
      const freeze = verdict === 'hapis' || verdict === 'agir';
      if (penalty > 0) {
        setProfile(p => { const np={...p, money:Math.max(0,(p.money||0)-penalty), rep:Math.max(0,(p.rep||0)-15)}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
        if (freeze) {
          localStorage.setItem('crimeFreeze', (Date.now() + (verdict==='agir' ? 7200000 : 3600000)).toString());
        }
        showNotif(VERDICT_INFO[verdict].desc + (penalty ? ` -${fmtWord(penalty)} ceza` : ''), verdict==='beraat'?'success':'error');
      } else {
        showNotif('🎉 Beraat! Tüm suçlamalar düşürüldü.', 'success');
      }
      return {...c, stage:'kapandi', verdict, defenseUsed:true, closedTs:Date.now()};
    }));
    setSelectedCase(null);
  };

  const doPlead = (caseId) => {
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const penalty = Math.floor((c.penalty||200000) * 0.6);
      setProfile(p => { const np={...p, money:Math.max(0,(p.money||0)-penalty), rep:Math.max(0,(p.rep||0)-8)}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
      showNotif(`💸 Suç kabul edildi. -${fmtWord(penalty)} indirimli ceza ödendi.`, 'error');
      return {...c, stage:'kapandi', verdict:'para', defenseUsed:false, closedTs:Date.now(), penalty};
    }));
    setSelectedCase(null);
  };

  const freezeUntil = parseInt(localStorage.getItem('crimeFreeze')||'0');
  const isFrozen = Date.now() < freezeUntil;

  const tabStyle = (t) => ({
    padding:'0.5rem 1rem', borderRadius:'10px', border:'none', fontWeight:700,
    fontSize:'0.78rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
    background: tab===t ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)',
    color: tab===t ? '#F87171' : '#5A7089',
    border: tab===t ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(255,255,255,0.06)',
    transition:'all 0.2s',
  });

  return (
    <div style={{padding:'1rem',maxWidth:'520px',margin:'0 auto'}}>
      <div style={{textAlign:'center',marginBottom:'1.2rem'}}>
        <div style={{fontSize:'2rem',marginBottom:'0.2rem'}}>⚖️</div>
        <div style={{fontWeight:900,fontSize:'1.1rem',color:'#E8EDF2',letterSpacing:'0.04em'}}>MAHKEME & SUÇ SİSTEMİ</div>
        <div style={{fontSize:'0.72rem',color:'#5A7089',marginTop:'0.2rem'}}>Yasal sınırı zorlayan oyuncular burada yargılanır</div>
      </div>

      {isFrozen && (
        <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'12px',padding:'0.7rem 1rem',marginBottom:'0.8rem',textAlign:'center',color:'#F87171',fontWeight:700,fontSize:'0.82rem'}}>
          🔒 İşlemlerin {Math.ceil((freezeUntil-Date.now())/60000)} dakika daha kısıtlı! (Mahkeme kararı)
        </div>
      )}

      <div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem',flexWrap:'wrap'}}>
        <button style={tabStyle('mahkeme')} onClick={()=>setTab('mahkeme')}>⚖️ Davalar {activeCases.length>0&&<span style={{background:'rgba(239,68,68,0.3)',borderRadius:'6px',padding:'0 5px',marginLeft:'4px'}}>{activeCases.length}</span>}</button>
        <button style={tabStyle('suclar')} onClick={()=>setTab('suclar')}>🎭 Suç İşle</button>
        <button style={tabStyle('gang')} onClick={()=>setTab('gang')}>🔫 Çete Ops</button>
        <button style={tabStyle('gecmis')} onClick={()=>setTab('gecmis')}>📜 Geçmiş</button>
      </div>

      {tab==='mahkeme' && (
        <div>
          {activeCases.length === 0 ? (
            <div style={{textAlign:'center',padding:'2.5rem 1rem',color:'#5A7089',fontSize:'0.85rem'}}>
              <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>🕊️</div>
              Aktif davanız bulunmuyor. Temiz sicil!
            </div>
          ) : activeCases.map(c => {
            const sv = SEVERITY_COLOR[c.severity] || '#F59E0B';
            return (
              <div key={c.id} style={{background:'rgba(11,21,39,0.9)',border:`1px solid ${sv}33`,borderRadius:'14px',padding:'0.85rem',marginBottom:'0.6rem'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'0.5rem'}}>
                  <div style={{display:'flex',gap:'0.5rem',alignItems:'flex-start',flex:1}}>
                    <span style={{fontSize:'1.4rem'}}>{c.icon}</span>
                    <div>
                      <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.85rem'}}>{c.typeLabel}</div>
                      <div style={{fontSize:'0.67rem',color:'#5A7089',marginTop:'0.1rem'}}>{c.detail}</div>
                      <div style={{display:'flex',gap:'0.4rem',marginTop:'0.35rem',flexWrap:'wrap'}}>
                        <span style={{fontSize:'0.6rem',background:`${sv}20`,color:sv,borderRadius:'6px',padding:'2px 6px',fontWeight:700,border:`1px solid ${sv}40`}}>
                          {SEVERITY_LABEL[c.severity]} Ağırlık
                        </span>
                        <span style={{fontSize:'0.6rem',background:'rgba(255,255,255,0.04)',color:'#8899AA',borderRadius:'6px',padding:'2px 6px',border:'1px solid rgba(255,255,255,0.06)'}}>
                          {timeAgo(c.ts)}
                        </span>
                        {c.penalty && <span style={{fontSize:'0.6rem',background:'rgba(239,68,68,0.1)',color:'#F87171',borderRadius:'6px',padding:'2px 6px',border:'1px solid rgba(239,68,68,0.2)'}}>
                          Tahmini ceza: {fmtWord(c.penalty)}
                        </span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:'0.4rem',marginTop:'0.75rem'}}>
                  <button onClick={()=>doDefend(c.id)}
                    style={{flex:1,padding:'0.48rem',borderRadius:'9px',border:'1px solid rgba(16,185,129,0.3)',background:'rgba(16,185,129,0.1)',color:'#34D399',fontWeight:700,fontSize:'0.75rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>
                    🛡️ Savunma Yap (%45)
                  </button>
                  <button onClick={()=>doPlead(c.id)}
                    style={{flex:1,padding:'0.48rem',borderRadius:'9px',border:'1px solid rgba(245,158,11,0.3)',background:'rgba(245,158,11,0.1)',color:'#FCD34D',fontWeight:700,fontSize:'0.75rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>
                    🤝 Suçu Kabul Et (-%40 ceza)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab==='suclar' && (
        <div>
          <div style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'10px',padding:'0.6rem 0.8rem',marginBottom:'0.8rem',fontSize:'0.72rem',color:'#F87171'}}>
            ⚠️ Suç işlemek tespit riskini beraberinde getirir. Yakalanırsanız otomatik dava açılır.
          </div>
          {SUC_TYPES.map(suc => {
            const cd = cooldowns[suc.id];
            const cdLeft = cd && Date.now() < cd ? Math.ceil((cd-Date.now())/60000) : 0;
            const canAfford = (profile?.money||0) >= suc.minMoney;
            return (
              <div key={suc.id} style={{background:'rgba(11,21,39,0.9)',border:`1px solid ${suc.color}22`,borderRadius:'14px',padding:'0.85rem',marginBottom:'0.55rem'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:'0.6rem'}}>
                  <span style={{fontSize:'1.5rem'}}>{suc.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.86rem'}}>{suc.label}</div>
                      <div style={{fontSize:'0.62rem',color:SEVERITY_COLOR[suc.severity],fontWeight:700}}>Risk: %{Math.round(suc.risk*100)}</div>
                    </div>
                    <div style={{fontSize:'0.68rem',color:'#5A7089',margin:'0.2rem 0 0.45rem'}}>{suc.desc}</div>
                    <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',marginBottom:'0.5rem'}}>
                      <span style={{fontSize:'0.6rem',background:'rgba(16,185,129,0.1)',color:'#34D399',borderRadius:'6px',padding:'2px 6px',border:'1px solid rgba(16,185,129,0.2)'}}>
                        Kazanç: {typeof suc.reward==='number' ? fmtWord(suc.reward) : `Varlığın %${Math.round(suc.reward*100)}'i`}
                      </span>
                      <span style={{fontSize:'0.6rem',background:'rgba(255,255,255,0.04)',color:'#8899AA',borderRadius:'6px',padding:'2px 6px',border:'1px solid rgba(255,255,255,0.06)'}}>
                        Min: {fmtWord(suc.minMoney)}
                      </span>
                      <span style={{fontSize:'0.6rem',background:'rgba(255,255,255,0.04)',color:'#8899AA',borderRadius:'6px',padding:'2px 6px',border:'1px solid rgba(255,255,255,0.06)'}}>
                        Bekleme: {suc.cooldownMs/3600000}s
                      </span>
                    </div>
                    <button onClick={()=>doCommitCrime(suc)} disabled={!!cdLeft||!canAfford||isFrozen}
                      style={{width:'100%',padding:'0.45rem',borderRadius:'9px',border:`1px solid ${suc.color}44`,
                        background: (cdLeft||!canAfford||isFrozen) ? 'rgba(255,255,255,0.03)' : `${suc.color}18`,
                        color: (cdLeft||!canAfford||isFrozen) ? '#3B4E63' : suc.color,
                        fontWeight:700,fontSize:'0.75rem',cursor:(cdLeft||!canAfford||isFrozen)?'not-allowed':'pointer',
                        fontFamily:"'DM Sans',sans-serif",transition:'all 0.2s'}}>
                      {isFrozen ? '🔒 İşlemler Donduruldu' : cdLeft ? `⏳ ${cdLeft} dk bekleniyor` : !canAfford ? `💰 Yetersiz bakiye (min ${fmtWord(suc.minMoney)})` : `${suc.icon} Uygula`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab==='gang' && (
        <GangCrimePage profile={profile} setProfile={setProfile} showNotif={showNotif} />
      )}

      {tab==='gecmis' && (
        <div>
          {closedCases.length === 0 ? (
            <div style={{textAlign:'center',padding:'2.5rem 1rem',color:'#5A7089',fontSize:'0.85rem'}}>
              <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>📂</div>
              Kapalı dava kaydı yok.
            </div>
          ) : closedCases.map(c => {
            const vi = VERDICT_INFO[c.verdict] || VERDICT_INFO.para;
            return (
              <div key={c.id} style={{background:'rgba(11,21,39,0.85)',border:`1px solid ${vi.color}33`,borderRadius:'12px',padding:'0.75rem',marginBottom:'0.5rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                    <span style={{fontSize:'1.2rem'}}>{c.icon}</span>
                    <div>
                      <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.82rem'}}>{c.typeLabel}</div>
                      <div style={{fontSize:'0.63rem',color:'#5A7089'}}>{c.detail}</div>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'0.7rem',color:vi.color,fontWeight:800}}>{vi.icon} {vi.label}</div>
                    <div style={{fontSize:'0.6rem',color:'#5A7089'}}>{timeAgo(c.closedTs||c.ts)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// HOLDİNG / ŞİRKETLER SAYFASI
// ═══════════════════════════════════════════════════════
const HOLDING_SECTORS = [
  { id:'tech',    label:'Teknoloji',    icon:'💻', baseCost:500000,  profit:18000, maint:5000  },
  { id:'food',    label:'Gıda Sanayi',  icon:'🍔', baseCost:250000,  profit:9000,  maint:2500  },
  { id:'energy',  label:'Enerji',       icon:'⚡', baseCost:800000,  profit:30000, maint:8000  },
  { id:'const',   label:'İnşaat',       icon:'🏗️', baseCost:400000,  profit:14000, maint:4000  },
  { id:'finance', label:'Finans',       icon:'🏦', baseCost:1000000, profit:40000, maint:12000 },
  { id:'media',   label:'Medya',        icon:'📺', baseCost:350000,  profit:12000, maint:3500  },
  { id:'health',  label:'Sağlık',       icon:'🏥', baseCost:600000,  profit:22000, maint:7000  },
  { id:'retail',  label:'Perakende',    icon:'🛒', baseCost:200000,  profit:7000,  maint:2000  },
  { id:'tourism', label:'Turizm',       icon:'✈️', baseCost:450000,  profit:16000, maint:4500  },
  { id:'auto',    label:'Otomotiv',     icon:'🚗', baseCost:700000,  profit:26000, maint:7000  },
];

function HoldingsPage({ profile, setProfile, showNotif }) {
  const [holdings, setHoldings] = useLs('holdings', []);
  const [pendingCompanies, setPendingCompanies] = useLs('pendingCompanies', []);
  const [companyShares, setCompanyShares] = useLs('companyShares', {}); // {companyId: {myQty, avgPrice}}
  const [sub, setSub] = useState('list');
  const [createModal, setCreateModal] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [holdingName, setHoldingName] = useState('');
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [manageModal, setManageModal] = useState(false);
  const [buyShareModal, setBuyShareModal] = useState(null); // holding being bought
  const [buyQty, setBuyQty] = useState('');

  // Auto-approve pending companies after 24 hours
  useEffect(() => {
    const now = Date.now();
    const toApprove = pendingCompanies.filter(c => c.owner === profile?.uid && now - c.pendingAt > 24*3600000);
    if (toApprove.length > 0) {
      setPendingCompanies(prev => prev.filter(c => !toApprove.find(x => x.id === c.id)));
      setHoldings(prev => [...prev, ...toApprove.map(c => { const {pendingAt,...rest}=c; return rest; })]);
      showNotif(`✅ ${toApprove.length} şirket otomatik onaylandı (24s geçti)`, 'info');
    }
  }, []);

  // Random price fluctuation every 30 seconds
  useEffect(() => {
    const t = setInterval(() => {
      setHoldings(prev => prev.map(h => {
        if (!h.listedOnStock) return h;
        const pct = (Math.random() * 0.1) - 0.05; // ±5%
        const newPrice = Math.max(1, Math.round(h.sharePrice * (1 + pct)));
        return { ...h, sharePrice: newPrice, priceChange: pct };
      }));
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const myHoldings = holdings.filter(h => h.owner === profile?.uid);
  const totalProfit = myHoldings.reduce((s, h) => s + (h.dailyProfit || 0), 0);
  const totalAssets = myHoldings.reduce((s, h) => s + (h.value || 0), 0);

  const createHolding = () => {
    if (!selectedSector) { showNotif('Sektör seçin', 'error'); return; }
    if (!holdingName.trim()) { showNotif('Şirket adı girin', 'error'); return; }
    const sec = HOLDING_SECTORS.find(s => s.id === selectedSector);
    if ((profile?.money || 0) < sec.baseCost) {
      showNotif(`Yetersiz sermaye! ${fmtWord(sec.baseCost)} gerekli`, 'error'); return;
    }
    const cabinet = JSON.parse(localStorage.getItem('rep_cabinet') || '{}');
    const tradeMin = cabinet['Ticaret Bakanı'];
    const h = {
      id: genId(), name: holdingName.trim(), sector: sec.id, sectorLabel: sec.label,
      sectorIcon: sec.icon, owner: profile?.uid, ownerName: profile?.username,
      value: sec.baseCost, dailyProfit: sec.profit, maintenance: sec.maint,
      level: 1, experience: 0, lastProfit: 0, employees: Math.floor(sec.baseCost / 50000),
      listedOnStock: false, shares: [], createdAt: Date.now(),
    };
    setProfile(p => {
      const np = { ...p, money: (p.money||0) - sec.baseCost };
      localStorage.setItem('rep_userProfile', JSON.stringify(np));
      return np;
    });
    if (!tradeMin) {
      setHoldings(prev => [...prev, h]);
      showNotif(`🏢 ${h.name} kuruldu! (Ticaret Bakanı atanmadığı için otomatik onaylandı)`, 'success');
    } else {
      setPendingCompanies(prev => [...prev, {...h, pendingAt: Date.now(), tradeMin}]);
      showNotif(`📋 ${h.name} kurulum talebi Ticaret Bakanı'na iletildi. 24 saat içinde yanıt gelmezse otomatik onaylanır.`, 'info');
    }
    setCreateModal(false);
    setHoldingName('');
    setSelectedSector(null);
  };

  const collectProfit = (h) => {
    const elapsed = Date.now() - (h.lastProfit || h.createdAt || Date.now());
    const hours = elapsed / 3600000;
    if (hours < 1) { showNotif('Kar toplama için en az 1 saat bekle', 'error'); return; }
    const earned = Math.floor(h.dailyProfit * Math.min(hours, 24) / 24);
    const newXP = (h.experience || 0) + Math.floor(earned / 10000);
    const leveled = newXP >= 1000;
    const newLevel = h.level + (leveled ? 1 : 0);
    const profitBonus = leveled ? Math.floor(h.dailyProfit * 0.1) : 0;
    setHoldings(prev => prev.map(x => x.id === h.id ? {
      ...x, lastProfit: Date.now(),
      experience: leveled ? 0 : newXP,
      level: newLevel,
      dailyProfit: x.dailyProfit + profitBonus,
      value: x.value + Math.floor(earned * 0.5),
    } : x));
    setProfile(p => {
      const np = { ...p, money: (p.money||0) + earned, xp: (p.xp||0) + 100 };
      localStorage.setItem('rep_userProfile', JSON.stringify(np));
      return np;
    });
    showNotif(`💰 ${fmtWord(earned)} kar toplandı!${leveled ? ` 🎉 Seviye ${newLevel}!` : ''}`, 'success');
  };

  const upgradeHolding = (h) => {
    const cost = Math.floor(h.value * 0.5);
    if ((profile?.money || 0) < cost) { showNotif(`Yükseltme için ${fmtWord(cost)} gerekli`, 'error'); return; }
    setHoldings(prev => prev.map(x => x.id === h.id ? {
      ...x, level: x.level + 1, value: x.value + cost,
      dailyProfit: Math.floor(x.dailyProfit * 1.25),
      employees: Math.floor(x.employees * 1.2),
    } : x));
    setProfile(p => {
      const np = { ...p, money: (p.money||0) - cost };
      localStorage.setItem('rep_userProfile', JSON.stringify(np));
      return np;
    });
    showNotif(`🏢 ${h.name} yükseltildi! Kâr +%25`, 'success');
    setManageModal(false);
  };

  const sellHolding = (h) => {
    const sellVal = Math.floor(h.value * 0.7);
    setHoldings(prev => prev.filter(x => x.id !== h.id));
    setProfile(p => {
      const np = { ...p, money: (p.money||0) + sellVal };
      localStorage.setItem('rep_userProfile', JSON.stringify(np));
      return np;
    });
    showNotif(`💸 ${h.name} satıldı: ${fmtWord(sellVal)}`, 'info');
    setManageModal(false);
    setSelectedHolding(null);
  };

  const getReadyToCollect = (h) => {
    const hours = (Date.now() - (h.lastProfit || h.createdAt || 0)) / 3600000;
    return hours >= 1;
  };

  const getTimeLeft = (h) => {
    const elapsed = (Date.now() - (h.lastProfit || h.createdAt || 0));
    const left = 3600000 - elapsed;
    if (left <= 0) return null;
    const mins = Math.ceil(left / 60000);
    return `${mins}dk`;
  };

  const listOnStock = (h) => {
    const TOTAL_SHARES = 1000000;
    const pricePerShare = Math.max(1, Math.round(h.value / TOTAL_SHARES));
    setHoldings(prev => prev.map(x => x.id === h.id ? {
      ...x, listedOnStock: true, totalShares: TOTAL_SHARES,
      sharePrice: pricePerShare, priceChange: 0, ipoDate: Date.now(),
    } : x));
    showNotif(`📈 ${h.name} borsaya açıldı! Hisse fiyatı: ${fmtWord(pricePerShare)}`, 'success');
    setManageModal(false);
    setSelectedHolding(null);
    setSub('market');
  };

  const buyShares = (h) => {
    const qty = parseInt(buyQty) || 0;
    if (qty <= 0) { showNotif('Geçerli bir adet girin', 'error'); return; }
    const cost = qty * h.sharePrice;
    if ((profile?.money||0) < cost) { showNotif(`Yetersiz para! Gerekli: ${fmtWord(cost)}`, 'error'); return; }
    const existing = companyShares[h.id] || { qty: 0, avgPrice: 0 };
    const newQty = existing.qty + qty;
    const newAvg = Math.round((existing.qty * existing.avgPrice + cost) / newQty);
    setCompanyShares(prev => ({ ...prev, [h.id]: { qty: newQty, avgPrice: newAvg } }));
    const priceIncrease = Math.round(h.sharePrice * 0.001 * qty / 1000 + 1);
    const valueIncrease = cost * 0.3;
    setHoldings(prev => prev.map(x => x.id === h.id ? {
      ...x, sharePrice: x.sharePrice + priceIncrease, value: x.value + valueIncrease,
    } : x));
    setProfile(p => {
      const np = { ...p, money: (p.money||0) - cost };
      localStorage.setItem('rep_userProfile', JSON.stringify(np));
      return np;
    });
    setBuyShareModal(null);
    setBuyQty('');
    showNotif(`✅ ${qty.toLocaleString()} hisse alındı! -${fmtWord(cost)} • Hisse fiyatı yükseldi`, 'success');
  };

  const sellMyShares = (h) => {
    const myPos = companyShares[h.id];
    if (!myPos?.qty) { showNotif('Elinde bu şirketin hissesi yok', 'error'); return; }
    const revenue = myPos.qty * h.sharePrice;
    const profit = revenue - myPos.qty * myPos.avgPrice;
    const priceDecrease = Math.max(1, Math.round(h.sharePrice * 0.01));
    setHoldings(prev => prev.map(x => x.id === h.id ? {
      ...x, sharePrice: Math.max(1, x.sharePrice - priceDecrease),
      value: Math.max(0, x.value - revenue * 0.2),
    } : x));
    setCompanyShares(prev => { const n = {...prev}; delete n[h.id]; return n; });
    setProfile(p => {
      const np = { ...p, money: (p.money||0) + revenue };
      localStorage.setItem('rep_userProfile', JSON.stringify(np));
      return np;
    });
    showNotif(`💸 ${myPos.qty.toLocaleString()} hisse satıldı! +${fmtWord(revenue)} • ${profit >= 0 ? '+' : ''}${fmtWord(profit)} kâr`, profit >= 0 ? 'success' : 'info');
  };

  return (
    <div>
      <div style={{display:'flex',gap:'4px',padding:'0.5rem 0.7rem',overflowX:'auto',scrollbarWidth:'none',background:'rgba(6,12,24,0.97)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
        {[{id:'list',label:'🏢 Şirketlerim'},{id:'market',label:'🌐 Piyasa'},{id:'sectors',label:'📊 Sektörler'},{id:'fon',label:'🕵️ Gizli Fon'}].map(s=>(
          <button key={s.id} onClick={()=>setSub(s.id)}
            style={{padding:'0.38rem 0.75rem',borderRadius:'8px',border:`1px solid ${sub===s.id?'rgba(16,185,129,0.4)':'rgba(255,255,255,0.07)'}`,background:sub===s.id?'rgba(16,185,129,0.12)':'rgba(255,255,255,0.03)',color:sub===s.id?'#10B981':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.76rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{padding:'0.7rem'}}>
        {sub === 'list' && (
          <div>
            {/* Overview stats */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem',marginBottom:'0.75rem'}}>
              {[
                ['🏢', 'Şirketler', myHoldings.length, '#60A5FA'],
                ['💰', 'Günlük Kâr', fmtWord(totalProfit), '#10B981'],
                ['📊', 'Toplam Değer', fmtWord(totalAssets), '#F59E0B'],
              ].map(([ic, lb, v, c]) => (
                <Card key={lb} style={{padding:'0.7rem',textAlign:'center'}}>
                  <div style={{fontSize:'1.1rem',marginBottom:'0.15rem'}}>{ic}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:c,fontSize:'0.8rem'}}>{v}</div>
                  <div style={{fontSize:'0.55rem',color:'#5A7089',textTransform:'uppercase',fontWeight:700}}>{lb}</div>
                </Card>
              ))}
            </div>

            {/* Pending company cards */}
            {pendingCompanies.filter(c => c.owner === profile?.uid).map(c => {
              const rem = Math.max(0, (c.pendingAt + 24*3600000) - Date.now());
              const h2 = Math.floor(rem/3600000); const m2 = Math.floor((rem%3600000)/60000);
              return (
                <Card key={c.id} style={{marginBottom:'0.5rem',padding:'1rem',border:'1px solid rgba(245,158,11,0.35)',background:'rgba(245,158,11,0.05)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                    <div style={{fontSize:'2rem',flexShrink:0}}>{c.sectorIcon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,color:'#F59E0B',fontSize:'0.95rem'}}>{c.name}</div>
                      <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{c.sectorLabel} • Onay bekleniyor</div>
                      <div style={{fontSize:'0.65rem',color:'#F59E0B',marginTop:'0.25rem'}}>
                        ⏳ {rem > 0 ? `${h2}s ${m2}dk sonra otomatik onaylanır` : 'Onay süresi doldu, yenile'}
                      </div>
                    </div>
                    <div style={{background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'8px',padding:'3px 10px',fontSize:'0.65rem',color:'#F59E0B',fontWeight:700}}>ONAY BEKLİYOR</div>
                  </div>
                </Card>
              );
            })}

            {!myHoldings.length && !pendingCompanies.filter(c=>c.owner===profile?.uid).length && (
              <Card style={{textAlign:'center',padding:'2rem',marginBottom:'0.75rem'}}>
                <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>🏢</div>
                <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.3rem'}}>Henüz şirketin yok</div>
                <div style={{fontSize:'0.78rem',color:'#5A7089',marginBottom:'1rem'}}>Bir sektör seç ve ilk şirketini kur</div>
                <Btn variant='green' size='md' onClick={()=>setCreateModal(true)}>+ Şirket Kur</Btn>
              </Card>
            )}

            {myHoldings.map(h => {
              const ready = getReadyToCollect(h);
              const timeLeft = getTimeLeft(h);
              const pendingHours = Math.min((Date.now()-(h.lastProfit||h.createdAt||Date.now()))/3600000, 24);
              const pendingProfit = Math.floor(h.dailyProfit * pendingHours / 24);
              return (
                <Card key={h.id} style={{marginBottom:'0.5rem',padding:'1rem',border:`1px solid ${ready?'rgba(16,185,129,0.3)':'rgba(255,255,255,0.06)'}`}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:'0.75rem'}}>
                    <div style={{fontSize:'2rem',flexShrink:0,lineHeight:1}}>{h.sectorIcon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'0.2rem'}}>
                        <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.95rem'}}>{h.name}</div>
                        <Tag color='blue'>Lv.{h.level}</Tag>
                        {h.listedOnStock && <Tag color='gold'>📈 Borsada</Tag>}
                      </div>
                      <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.4rem'}}>{h.sectorLabel} • {h.employees?.toLocaleString()} çalışan</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.3rem',marginBottom:'0.5rem'}}>
                        <div style={{fontSize:'0.7rem'}}><span style={{color:'#5A7089'}}>Değer: </span><span style={{color:'#E8EDF2',fontWeight:700}}>{fmtWord(h.value)}</span></div>
                        <div style={{fontSize:'0.7rem'}}><span style={{color:'#5A7089'}}>Günlük: </span><span style={{color:'#10B981',fontWeight:700}}>{fmtWord(h.dailyProfit)}</span></div>
                      </div>
                      {/* XP bar */}
                      <div style={{marginBottom:'0.5rem'}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.58rem',color:'#5A7089',marginBottom:'2px'}}>
                          <span>Deneyim</span><span>{h.experience||0}/1000</span>
                        </div>
                        <ProgressBar pct={((h.experience||0)/1000)*100} color='#8B5CF6' h={4} />
                      </div>
                      {/* Pending profit */}
                      {pendingProfit > 0 && (
                        <div style={{fontSize:'0.7rem',color:ready?'#10B981':'#F59E0B',marginBottom:'0.4rem',fontWeight:600}}>
                          {ready ? `✅ ${fmtWord(pendingProfit)} toplanmayı bekliyor` : `⏳ ${fmtWord(pendingProfit)} birikiyor (${timeLeft} kaldı)`}
                        </div>
                      )}
                      <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                        {ready && <Btn variant='green' size='sm' onClick={()=>collectProfit(h)}>💰 Kar Topla</Btn>}
                        <Btn variant='ghost' size='sm' onClick={()=>{setSelectedHolding(h);setManageModal(true);}}>⚙️ Yönet</Btn>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            {myHoldings.length > 0 && (
              <Btn variant='primary' size='full' onClick={()=>setCreateModal(true)} style={{marginTop:'0.5rem'}}>+ Yeni Şirket Kur</Btn>
            )}
          </div>
        )}

        {sub === 'market' && (() => {
          const listedHoldings = holdings.filter(h => h.listedOnStock);
          const myShareHoldings = Object.entries(companyShares).filter(([,v])=>v?.qty>0);
          return (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.75rem'}}>
              <Card style={{padding:'0.7rem',textAlign:'center'}}>
                <div style={{fontSize:'1.1rem',marginBottom:'0.15rem'}}>📈</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#10B981',fontSize:'0.8rem'}}>{listedHoldings.length}</div>
                <div style={{fontSize:'0.55rem',color:'#5A7089',textTransform:'uppercase',fontWeight:700}}>Borsada Şirket</div>
              </Card>
              <Card style={{padding:'0.7rem',textAlign:'center'}}>
                <div style={{fontSize:'1.1rem',marginBottom:'0.15rem'}}>💼</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#60A5FA',fontSize:'0.8rem'}}>{myShareHoldings.length}</div>
                <div style={{fontSize:'0.55rem',color:'#5A7089',textTransform:'uppercase',fontWeight:700}}>Hissem Olan</div>
              </Card>
            </div>

            {myShareHoldings.length > 0 && (
              <div style={{marginBottom:'0.75rem'}}>
                <div style={{fontSize:'0.7rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.4rem'}}>💼 Portföyüm</div>
                {myShareHoldings.map(([hId, pos]) => {
                  const h = holdings.find(x => x.id === hId);
                  if (!h) return null;
                  const currVal = pos.qty * h.sharePrice;
                  const costVal = pos.qty * pos.avgPrice;
                  const pnl = currVal - costVal;
                  return (
                    <Card key={hId} style={{marginBottom:'0.4rem',padding:'0.75rem',border:`1px solid ${pnl>=0?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.85rem'}}>{h.sectorIcon} {h.name}</div>
                          <div style={{fontSize:'0.65rem',color:'#5A7089'}}>{pos.qty.toLocaleString()} hisse • Ort. {fmtWord(pos.avgPrice)}/hisse</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontWeight:800,color:pnl>=0?'#10B981':'#EF4444',fontSize:'0.85rem'}}>{pnl>=0?'+':''}{fmtWord(pnl)}</div>
                          <div style={{fontSize:'0.62rem',color:'#5A7089'}}>{fmtWord(h.sharePrice)}/hisse</div>
                          <button onClick={()=>sellMyShares(h)} style={{marginTop:'0.3rem',padding:'2px 8px',borderRadius:'6px',border:'none',background:'rgba(239,68,68,0.2)',color:'#F87171',fontSize:'0.62rem',fontWeight:700,cursor:'pointer'}}>
                            💸 Sat
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Borsa Lider Tablosu */}
            {listedHoldings.length > 1 && (() => {
              const sortedByVal = [...listedHoldings].sort((a,b)=>(b.value||0)-(a.value||0));
              return (
                <div style={{marginBottom:'0.75rem'}}>
                  <div style={{fontSize:'0.7rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.4rem'}}>🏆 Borsa Lider Tablosu</div>
                  {sortedByVal.slice(0,5).map((h,i)=>{
                    const chg = h.priceChange||0;
                    return (
                      <div key={h.id} style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.55rem 0.65rem',background:'rgba(255,255,255,0.03)',border:`1px solid ${i===0?'rgba(245,158,11,0.25)':'rgba(255,255,255,0.05)'}`,borderRadius:'10px',marginBottom:'0.3rem'}}>
                        <div style={{width:'24px',textAlign:'center',fontWeight:800,fontSize:'0.85rem',flexShrink:0,color:i===0?'#F59E0B':i===1?'#94A3B8':i===2?'#B45309':'#5A7089'}}>{['🥇','🥈','🥉'][i]||`${i+1}.`}</div>
                        <div style={{fontSize:'1.1rem',flexShrink:0}}>{h.sectorIcon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.82rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.name}</div>
                          <div style={{fontSize:'0.62rem',color:'#5A7089'}}>{h.ownerName}</div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontWeight:800,color:'#F59E0B',fontSize:'0.78rem'}}>{fmtWord(h.sharePrice)}</div>
                          <div style={{fontSize:'0.62rem',color:chg>=0?'#10B981':'#EF4444',fontWeight:700}}>{chg>=0?'▲':'▼'}{Math.abs((chg*100).toFixed(1))}%</div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0,borderLeft:'1px solid rgba(255,255,255,0.06)',paddingLeft:'0.5rem'}}>
                          <div style={{fontWeight:700,color:'#60A5FA',fontSize:'0.78rem'}}>{fmtWord(h.value)}</div>
                          <div style={{fontSize:'0.6rem',color:'#5A7089'}}>değer</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div style={{fontSize:'0.7rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.4rem'}}>📊 Tüm Hisseler</div>
            {listedHoldings.length === 0 && (
              <Card style={{textAlign:'center',padding:'2rem'}}>
                <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>📈</div>
                <div style={{color:'#5A7089',fontSize:'0.85rem'}}>Henüz borsa'ya açılmış şirket yok</div>
                <div style={{color:'#5A7089',fontSize:'0.72rem',marginTop:'0.4rem'}}>Şirketlerinden birini Yönet menüsünden piyasaya açabilirsin</div>
              </Card>
            )}
            {listedHoldings.map(h => {
              const myPos = companyShares[h.id];
              const isOwner = h.owner === profile?.uid;
              const chg = h.priceChange || 0;
              const chgPct = (chg * 100).toFixed(1);
              return (
                <Card key={h.id} style={{marginBottom:'0.5rem',padding:'0.85rem',border:'1px solid rgba(16,185,129,0.15)'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:'0.75rem'}}>
                    <div style={{fontSize:'1.75rem',flexShrink:0,lineHeight:1}}>{h.sectorIcon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'0.2rem'}}>
                        <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{h.name}</div>
                        {isOwner && <Tag color='gold'>CEO</Tag>}
                        <Tag color='green'>📈 HALKA AÇIK</Tag>
                      </div>
                      <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.4rem'}}>{h.sectorLabel} • {h.ownerName} • Lv.{h.level}</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.3rem',marginBottom:'0.5rem'}}>
                        <div style={{fontSize:'0.68rem'}}>
                          <span style={{color:'#5A7089'}}>Fiyat </span>
                          <span style={{color:'#F59E0B',fontWeight:800}}>{fmtWord(h.sharePrice)}</span>
                        </div>
                        <div style={{fontSize:'0.68rem'}}>
                          <span style={{color:chg>=0?'#10B981':'#EF4444',fontWeight:700}}>{chg>=0?'▲':'▼'} %{Math.abs(chgPct)}</span>
                        </div>
                        <div style={{fontSize:'0.68rem'}}>
                          <span style={{color:'#5A7089'}}>Değer </span>
                          <span style={{color:'#E8EDF2',fontWeight:700}}>{fmtWord(h.value)}</span>
                        </div>
                      </div>
                      {myPos?.qty > 0 && (
                        <div style={{fontSize:'0.65rem',color:'#60A5FA',marginBottom:'0.4rem',background:'rgba(59,130,246,0.08)',borderRadius:'6px',padding:'0.2rem 0.5rem'}}>
                          💼 Elinde: {myPos.qty.toLocaleString()} hisse • Değer: {fmtWord(myPos.qty * h.sharePrice)}
                        </div>
                      )}
                      {!isOwner && (
                        <div style={{display:'flex',gap:'0.4rem'}}>
                          <Btn variant='green' size='sm' onClick={()=>{setBuyShareModal(h);setBuyQty('');}}>📈 Hisse Al</Btn>
                          {myPos?.qty > 0 && <Btn variant='danger' size='sm' onClick={()=>sellMyShares(h)}>💸 Sat</Btn>}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          );
        })()}

        {sub === 'fon' && (
          <div>
            <div style={{background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'14px',padding:'0.85rem',marginBottom:'0.75rem'}}>
              <div style={{fontSize:'0.65rem',color:'#F87171',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.3rem'}}>🕵️ GİZLİ FİNANSMAN</div>
              <div style={{fontSize:'0.75rem',color:'#E8EDF2',fontWeight:700,marginBottom:'0.3rem'}}>Holdingler → Parti Gizli Fon Transferi</div>
              <div style={{fontSize:'0.68rem',color:'#5A7089',lineHeight:1.6}}>
                Holding sahipleri, ellerindeki şirket kasasından siyasi partilere <span style={{color:'#F87171',fontWeight:700}}>gizlice</span> para transfer edebilir. Bu işlem kayıtlara geçmez, ancak parti hazinesini güçlendirir. Gerçek hayatta olduğu gibi, bu işlem yasal gri alandadır.
              </div>
            </div>

            {myHoldings.length === 0 ? (
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'14px',padding:'2rem',textAlign:'center'}}>
                <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>🏢</div>
                <div style={{color:'#5A7089',fontSize:'0.82rem'}}>Gizli fon için önce bir şirket kur</div>
              </div>
            ) : (() => {
              const allParties = JSON.parse(localStorage.getItem('rep_parties')||'[]');
              return (
                <div>
                  {myHoldings.map(h => (
                    <SecretFundingCard key={h.id} holding={h} holdings={holdings} setHoldings={setHoldings} parties={allParties} profile={profile} setProfile={setProfile} showNotif={showNotif} />
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {sub === 'sectors' && (
          <div>
            <div style={{color:'#5A7089',fontSize:'0.78rem',marginBottom:'0.75rem'}}>📊 Sektörlere göre şirket kuruluş maliyetleri</div>
            {HOLDING_SECTORS.map(sec => {
              const owned = holdings.filter(h => h.sector === sec.id).length;
              const canAfford = (profile?.money||0) >= sec.baseCost;
              return (
                <Card key={sec.id} style={{marginBottom:'0.5rem',padding:'0.85rem',opacity:canAfford?1:0.6}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                    <span style={{fontSize:'1.75rem',flexShrink:0}}>{sec.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{sec.label}</div>
                      <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{owned} aktif şirket • {fmtWord(owned*sec.profit)}/gün toplam kâr</div>
                      <div style={{display:'flex',gap:'1rem',marginTop:'0.3rem',fontSize:'0.68rem'}}>
                        <span style={{color:'#10B981'}}>Kâr: {fmtWord(sec.profit)}/gün</span>
                        <span style={{color:'#EF4444'}}>Bakım: {fmtWord(sec.maint)}/gün</span>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{color:'#F59E0B',fontWeight:800,fontSize:'0.85rem'}}>{fmtWord(sec.baseCost)}</div>
                      <Btn variant={canAfford?'green':'ghost'} size='sm' onClick={()=>{if(canAfford){setSelectedSector(sec.id);setCreateModal(true);}else{showNotif('Yetersiz sermaye','error');}}} style={{marginTop:'0.25rem'}}>
                        {canAfford ? '+ Kur' : '🔒'}
                      </Btn>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createModal && (
        <Modal title="🏢 Şirket Kur" onClose={()=>{setCreateModal(false);setSelectedSector(null);setHoldingName('');}}>
          <div style={{marginBottom:'0.85rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Şirket Adı</div>
            <input value={holdingName} onChange={e=>setHoldingName(e.target.value)} placeholder="Şirket adını girin"
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'}} />
          </div>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Sektör Seç</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.35rem',maxHeight:'280px',overflowY:'auto'}}>
              {HOLDING_SECTORS.map(sec => {
                const canAfford = (profile?.money||0) >= sec.baseCost;
                return (
                  <button key={sec.id} onClick={()=>canAfford&&setSelectedSector(sec.id)}
                    style={{padding:'0.65rem',borderRadius:'10px',border:`1px solid ${selectedSector===sec.id?'rgba(16,185,129,0.5)':'rgba(255,255,255,0.08)'}`,background:selectedSector===sec.id?'rgba(16,185,129,0.12)':'rgba(255,255,255,0.03)',cursor:canAfford?'pointer':'not-allowed',opacity:canAfford?1:0.45,textAlign:'left'}}>
                    <div style={{fontSize:'1.2rem',marginBottom:'0.15rem'}}>{sec.icon}</div>
                    <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.78rem'}}>{sec.label}</div>
                    <div style={{fontSize:'0.62rem',color:'#10B981'}}>{fmtWord(sec.profit)}/gün</div>
                    <div style={{fontSize:'0.62rem',color:canAfford?'#5A7089':'#EF4444'}}>{fmtWord(sec.baseCost)}</div>
                  </button>
                );
              })}
            </div>
          </div>
          {selectedSector && (
            <div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#10B981',marginBottom:'1rem'}}>
              💡 Sermaye: {fmtWord(HOLDING_SECTORS.find(s=>s.id===selectedSector)?.baseCost)} • Bakiye: {fmtWord(profile?.money)}
            </div>
          )}
          <Btn variant='green' size='full' onClick={createHolding} disabled={!selectedSector||!holdingName.trim()}>🏢 Şirketi Kur</Btn>
        </Modal>
      )}

      {/* Manage Modal */}
      {manageModal && selectedHolding && (
        <Modal title={`⚙️ ${selectedHolding.name}`} onClose={()=>{setManageModal(false);setSelectedHolding(null);}}>
          <div style={{marginBottom:'1rem'}}>
            {[
              ['Sektör', selectedHolding.sectorLabel],
              ['Seviye', `Lv.${selectedHolding.level}`],
              ['Değer', fmtWord(selectedHolding.value)],
              ['Günlük Kâr', fmtWord(selectedHolding.dailyProfit)],
              ['Bakım Maliyeti', fmtWord(selectedHolding.maintenance)],
              ['Net Kâr', fmtWord(selectedHolding.dailyProfit - selectedHolding.maintenance)],
              ['Çalışan', selectedHolding.employees?.toLocaleString()],
              ...(selectedHolding.listedOnStock ? [
                ['Hisse Fiyatı', fmtWord(selectedHolding.sharePrice)],
                ['Toplam Hisse', (selectedHolding.totalShares||0).toLocaleString()],
              ] : []),
            ].map(([k,v]) => (
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'0.4rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:'0.82rem'}}>
                <span style={{color:'#5A7089'}}>{k}</span>
                <span style={{color:'#E8EDF2',fontWeight:700}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.5rem'}}>
            <Btn variant='primary' size='sm' onClick={()=>upgradeHolding(selectedHolding)}>
              ⬆️ Yükselt ({fmtWord(Math.floor(selectedHolding.value*0.5))})
            </Btn>
            <Btn variant='danger' size='sm' onClick={()=>sellHolding(selectedHolding)}>
              💸 Sat ({fmtWord(Math.floor(selectedHolding.value*0.7))})
            </Btn>
          </div>
          {!selectedHolding.listedOnStock && (
            <Btn variant='ghost' size='full' onClick={()=>listOnStock(selectedHolding)} style={{marginBottom:'0.5rem',border:'1px solid rgba(16,185,129,0.3)',color:'#10B981'}}>
              📈 Halka Aç (IPO) — Borsaya Listele
            </Btn>
          )}
          {selectedHolding.listedOnStock && (
            <div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'10px',padding:'0.55rem',textAlign:'center',marginBottom:'0.5rem',fontSize:'0.75rem',color:'#10B981',fontWeight:700}}>
              ✅ Borsa'da listelendi • Hisse: {fmtWord(selectedHolding.sharePrice)}/adet
            </div>
          )}
          {getReadyToCollect(selectedHolding) && (
            <Btn variant='green' size='full' onClick={()=>{collectProfit(selectedHolding);setManageModal(false);setSelectedHolding(null);}}>
              💰 Kar Topla
            </Btn>
          )}
        </Modal>
      )}

      {/* Buy Shares Modal */}
      {buyShareModal && (
        <Modal title={`📈 ${buyShareModal.name} Hisse Al`} onClose={()=>{setBuyShareModal(null);setBuyQty('');}}>
          <div style={{marginBottom:'1rem'}}>
            {[
              ['Güncel Hisse Fiyatı', fmtWord(buyShareModal.sharePrice)],
              ['Şirket Değeri', fmtWord(buyShareModal.value)],
              ['Günlük Kâr', fmtWord(buyShareModal.dailyProfit)],
              ['Bakiye', fmtWord(profile?.money||0)],
            ].map(([k,v]) => (
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'0.35rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:'0.8rem'}}>
                <span style={{color:'#5A7089'}}>{k}</span>
                <span style={{color:'#E8EDF2',fontWeight:700}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Kaç Hisse Almak İstiyorsun?</div>
            <input type='number' value={buyQty} onChange={e=>setBuyQty(e.target.value)} placeholder='örn. 1000'
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'}} />
            {buyQty && parseInt(buyQty) > 0 && (
              <div style={{marginTop:'0.5rem',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'8px',padding:'0.45rem 0.75rem',fontSize:'0.75rem',color:'#10B981',fontWeight:700}}>
                💰 Toplam maliyet: {fmtWord(parseInt(buyQty) * buyShareModal.sharePrice)}
                {parseInt(buyQty) * buyShareModal.sharePrice > (profile?.money||0) && (
                  <span style={{color:'#EF4444'}}> — YETERSİZ BAKİYE!</span>
                )}
              </div>
            )}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.35rem',marginBottom:'0.75rem'}}>
            {[100, 1000, 10000].map(n => (
              <button key={n} onClick={()=>setBuyQty(String(n))}
                style={{padding:'0.4rem',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'#E8EDF2',fontSize:'0.72rem',cursor:'pointer',fontWeight:700}}>
                {n.toLocaleString()}
              </button>
            ))}
          </div>
          <Btn variant='green' size='full' onClick={()=>buyShares(buyShareModal)} disabled={!buyQty||parseInt(buyQty)<=0}>
            ✅ Satın Al — {buyQty && parseInt(buyQty)>0 ? fmtWord(parseInt(buyQty)*buyShareModal.sharePrice) : '₺0'}
          </Btn>
          <div style={{marginTop:'0.5rem',fontSize:'0.65rem',color:'#5A7089',textAlign:'center'}}>
            Hisse alımı şirket değerini ve hisse fiyatını yükseltir
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// BİLDİRİM PANELİ
// ═══════════════════════════════════════════════════════
function NotifPanel({ notifications, onClose, onClear }) {
  return (
    <Modal title="🔔 Bildirimler" onClose={onClose}>
      {notifications.length === 0 ? (
        <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>Bildirim yok</div>
      ) : (
        <>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'0.5rem'}}>
            <Btn variant='ghost' size='sm' onClick={onClear}>Hepsini Sil</Btn>
          </div>
          {notifications.slice().reverse().map((n,i) => (
            <div key={i} style={{display:'flex',gap:'0.65rem',padding:'0.65rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'10px',marginBottom:'0.35rem'}}>
              <span style={{fontSize:'1.1rem',flexShrink:0}}>{n.icon||'🔔'}</span>
              <div>
                <div style={{fontSize:'0.85rem',color:'#D0E0F0',fontWeight:600}}>{n.msg}</div>
                <div style={{fontSize:'0.62rem',color:'#5A7089',marginTop:'2px'}}>{timeAgo(n.ts)}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════
// FUTBOL SAYFASI
// ═══════════════════════════════════════════════════════
