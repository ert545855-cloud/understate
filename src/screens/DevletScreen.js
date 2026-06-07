const EDU_LEVELS = [
  { id:'ilkokul',      label:'İlkokul',      icon:'📖', costPerClick:0,      clicksNeeded:50,   desc:'Temel okuma yazma',        grade:'4. Sınıf',  color:'#10B981' },
  { id:'ortaokul',     label:'Ortaokul',     icon:'📓', costPerClick:500,    clicksNeeded:100,  desc:'Temel bilimler',           grade:'8. Sınıf',  color:'#3B82F6' },
  { id:'lise',         label:'Lise',         icon:'🎒', costPerClick:1000,   clicksNeeded:200,  desc:'Sosyal ve fen bilimleri',  grade:'12. Sınıf', color:'#8B5CF6' },
  { id:'universite',   label:'Üniversite',   icon:'🎓', costPerClick:5000,   clicksNeeded:500,  desc:'Lisans eğitimi',           grade:'Lisans',    color:'#F59E0B' },
  { id:'yukseklisans', label:'Yüksek Lisans',icon:'📜', costPerClick:20000,  clicksNeeded:1000, desc:'Uzmanlık eğitimi',         grade:'MSc/MBA',   color:'#EC4899' },
  { id:'doktora',      label:'Doktora',      icon:'🔬', costPerClick:50000,  clicksNeeded:2000, desc:'Araştırma ve akademi',     grade:'PhD',       color:'#EF4444' },
  { id:'profesor',     label:'Profesör',     icon:'🏛️', costPerClick:75000,  clicksNeeded:3000, desc:'Akademik kariyer zirvesi', grade:'Prof.Dr.',  color:'#F97316' },
];
// Eğitim tıklamaları için bekleme süreleri (ms)
// Normal: 5 dakika, VIP: 2.5 dakika, Paket: 1 saniye
const EDU_COOLDOWN_NORMAL = 5 * 60 * 1000;
const EDU_COOLDOWN_VIP    = 2.5 * 60 * 1000;
const EDU_COOLDOWN_PKG    = 1000;

const EDU_POSITION_REQS = {
  'Muhtarlık':       'ilkokul',
  'Belediye Meclis': 'ortaokul',
  'Belediye Başkanı':'lise',
  'Milletvekili':    'lise',
  'Bakan':           'universite',
  'Başbakan':        'universite',
  'Devlet Başkanı':  'yukseklisans',
  'Cumhurbaşkanı':   'yukseklisans',
  'Parti Lideri':    'lise',
  'Çete Lideri':     'ortaokul',
  'Aile Lideri':     'lise',
  'Holding CEO':     'universite',
  'Akademisyen':     'doktora',
};

// ═══════════════════════════════════════════════════════
// PARTİ ETKİ PUANI SAYFASI
// ═══════════════════════════════════════════════════════
const EDU_INFLUENCE_BONUS = { ilkokul:1.0, ortaokul:1.1, lise:1.2, universite:1.5, yukseklisans:1.8, doktora:2.0, profesor:2.5 };
const PARTI_ETKI_ACTIONS = [
  { id:'kucuk_miting',     icon:'📣', label:'Küçük Miting',          desc:'Mahalle mitingi düzenle',             cost:10000,   inf:8,   xp:100,  cd:3000 },
  { id:'kampanya_konusma', icon:'🎙️', label:'Kampanya Konuşması',    desc:'Parti adına kamuoyu açıklaması',      cost:25000,   inf:15,  xp:200,  cd:3000 },
  { id:'sosyal_medya',     icon:'📱', label:'Sosyal Medya Atağı',    desc:'Sosyal medyada kampanya yürüt',       cost:5000,    inf:6,   xp:80,   cd:3000 },
  { id:'basin_bulteni',    icon:'🗞️', label:'Basın Bülteni',         desc:'Medyaya demeç ver',                   cost:40000,   inf:20,  xp:250,  cd:3000 },
  { id:'secim_turu',       icon:'🚌', label:'Seçim Turu',            desc:'Şehri dolaşarak seçmen kazan',        cost:80000,   inf:35,  xp:400,  cd:3000 },
  { id:'buyuk_miting',     icon:'🎤', label:'Büyük Parti Mitingi',   desc:'Büyük çaplı ulusal miting düzenle',   cost:200000,  inf:80,  xp:800,  cd:3000 },
  { id:'tv_roportaj',      icon:'📺', label:'TV Röportajı',          desc:'Ulusal kanalda canlı röportaj',       cost:350000,  inf:130, xp:1200, cd:3000 },
  { id:'kapi_kapi',        icon:'🚪', label:'Kapı Kapı Kampanya',    desc:'Vatandaşlarla birebir görüş',         cost:15000,   inf:10,  xp:150,  cd:3000 },
  { id:'genclik_kolu',     icon:'🎓', label:'Gençlik Kolu Etkinliği',desc:'Gençlere yönelik etkinlik',           cost:30000,   inf:18,  xp:300,  cd:3000 },
  { id:'ticaret_destegi',  icon:'🤝', label:'Ticaret Ağı Desteği',   desc:'İş dünyasıyla lobi (TP bonusu)',      cost:60000,   inf:25,  xp:350,  cd:3000, tpBonus:true },
  { id:'akademik_panel',   icon:'🔬', label:'Akademik Panel',        desc:'Üniversitede panel (Eğitim bonusu)',  cost:50000,   inf:22,  xp:400,  cd:3000, eduBonus:true },
  { id:'ulusal_kongre',    icon:'🏛️', label:'Ulusal Kongre',         desc:'Tüm partili üyelerin büyük buluşması',cost:500000,  inf:200, xp:2000, cd:3000 },
];

const LOBI_DONATION_TIERS = [
  { id:'kucuk', label:'Küçük Bağış',   amount:100000,    inf:10  },
  { id:'orta',  label:'Orta Bağış',    amount:500000,    inf:60  },
  { id:'buyuk', label:'Büyük Bağış',   amount:2000000,   inf:300 },
  { id:'dev',   label:'Dev Bağış',     amount:10000000,  inf:2000},
];

function useLobiStore() {
  const [lobiler, setLobiRaw] = useState(() => { try { return JSON.parse(localStorage.getItem('rep_lobiAnlasmalari')||'[]'); } catch{ return []; } });

  // Sunucudan gelen lobiUpdate olaylarını dinle (diğer oyuncuların güncellemeleri)
  useEffect(() => {
    const onLobiUpdate = (data) => {
      if (!Array.isArray(data?.lobiAnlasmalari)) return;
      setLobiRaw(data.lobiAnlasmalari);
      localStorage.setItem('rep_lobiAnlasmalari', JSON.stringify(data.lobiAnlasmalari));
    };
    const onGameStateInit = (data) => {
      if (!Array.isArray(data?.lobiAnlasmalari)) return;
      setLobiRaw(data.lobiAnlasmalari);
      localStorage.setItem('rep_lobiAnlasmalari', JSON.stringify(data.lobiAnlasmalari));
    };
    window._socket?.on('lobiUpdate', onLobiUpdate);
    window._socket?.on('gameStateInit', onGameStateInit);
    return () => {
      window._socket?.off('lobiUpdate', onLobiUpdate);
      window._socket?.off('gameStateInit', onGameStateInit);
    };
  }, []);

  const setLobiler = (fn) => {
    setLobiRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      localStorage.setItem('rep_lobiAnlasmalari', JSON.stringify(next));
      // Sunucuya bildir — server persist + broadcast yapar
      try { window._socket?.emit('lobi:sync', { lobiler: next }); } catch(e){}
      return next;
    });
  };
  return [lobiler, setLobiler];
}

function PartiEtkiPage({ profile, setProfile, parties, setParties, showNotif, gangs: gangsFromProps }) {
  const { dark } = useTheme();
  const bg   = dark ? '#0B1527' : '#F0F4FF';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#fff';
  const bdr  = dark ? 'rgba(255,255,255,0.08)' : '#E5E7EB';

  const [cds, setCds] = useState(() => { try { return JSON.parse(localStorage.getItem('rep_partiEtkiCds')||'{}'); } catch{ return {}; } });
  const [now, setNow] = useState(Date.now());
  const [lobiler, setLobiler] = useLobiStore();
  const [showLobiModal, setShowLobiModal] = useState(false);
  const [lobiDonateModal, setLobiDonateModal] = useState(null);

  useEffect(() => { const t = setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(t); }, []);

  const saveCds = (next) => { setCds(next); localStorage.setItem('rep_partiEtkiCds', JSON.stringify(next)); };

  const uid = profile?.uid || profile?.id;
  const myPartyId = profile?.party || null;
  const allParties = [...parties].sort((a,b)=>(b.influencePoints||0)-(a.influencePoints||0));
  const myParty = parties.find(p=>p.id===myPartyId) || null;
  const isPartyLeader = myParty && (myParty.leaderId===uid);

  const allGangs = Array.isArray(gangsFromProps) && gangsFromProps.length > 0
    ? gangsFromProps
    : (() => { try { return JSON.parse(localStorage.getItem('rep_gangs')||'[]'); } catch{ return []; } })();
  const allFamilies = allGangs.filter(g=>g.type==='family');
  const myFamily = allFamilies.find(f=>f.leaderId===uid || (f.members||[]).includes(uid));
  const isFamilyLeader = myFamily && myFamily.leaderId===uid;

  const diploma = profile?.education?.diploma || 'ilkokul';
  const eduMult = EDU_INFLUENCE_BONUS[diploma] || 1.0;
  const tradePoints = profile?.tradePoints || 0;
  const tpMult = 1 + Math.floor(tradePoints / 500) * 0.05;

  const doAction = (act) => {
    if (!myParty) { showNotif('Önce bir partiye katıl!', 'error'); return; }
    const rem = Math.max(0, act.cd - (now - (cds[act.id]||0)));
    if (rem > 0) return;
    if ((profile?.money||0) < act.cost) { showNotif(`Yeterli para yok! ₺${act.cost.toLocaleString('tr-TR')} gerekli`, 'error'); return; }
    const mult = act.eduBonus ? eduMult : (act.tpBonus ? tpMult : 1.0);
    const finalInf = Math.round(act.inf * mult);
    const finalXp  = Math.round(act.xp * mult);
    // Optimistic local update
    setParties(prev => prev.map(p => p.id===myPartyId ? { ...p, influencePoints:(p.influencePoints||0)+finalInf } : p));
    // Atomic server-side update (CD enforced server-side, no race condition)
    try { window._socket?.emit('party:updateInfluence', { partyId: myPartyId, delta: finalInf }); } catch(e){}
    // CD violation callback
    try {
      window._socket?.once('party:influenceError', (err) => {
        if (err?.error === 'CD') showNotif(`⏳ Sunucu CD: ${err.remainingSecs}sn bekle`, 'error');
      });
    } catch(e){}
    setProfile(p => {
      const np = {...p, money:(p.money||0)-act.cost, xp:(p.xp||0)+finalXp};
      localStorage.setItem('rep_userProfile', JSON.stringify(np));
      try { const tk=localStorage.getItem('rep_token'); if(tk) fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tk},body:JSON.stringify({money:np.money,xp:np.xp,level:np.level||1})}).catch(()=>{}); } catch(e){}
      return np;
    });
    saveCds({...cds,[act.id]:now});
    const bonusText = mult>1.05 ? ` (×${mult.toFixed(1)} bonus!)` : '';
    showNotif(`${act.icon} ${act.label} → +${finalInf} Etki Puanı${bonusText}`, 'success');
  };

  const sendLobiInvite = (family) => {
    if (!myParty || !isPartyLeader) return;
    const already = lobiler.find(l=>l.partyId===myPartyId && l.familyId===family.id && l.status!=='rejected');
    if (already) { showNotif('Bu aileyle zaten bir lobi isteği var', 'error'); return; }
    const lobi = {
      id: 'lobi_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
      partyId: myPartyId, partyName: myParty.name, partyLeaderId: uid, partyLeaderName: profile?.username,
      familyId: family.id, familyName: family.name, familyLeaderId: family.leaderId, familyLeaderName: family.leaderName||'Lider',
      status: 'pending', createdAt: Date.now(), totalDonated: 0, totalInf: 0,
    };
    setLobiler(prev=>[...prev, lobi]);
    setShowLobiModal(false);
    showNotif(`📨 Lobi daveti ${family.name} ailesine gönderildi!`, 'success');
  };

  const acceptLobi = (lobi) => {
    if (!isFamilyLeader) return;
    setLobiler(prev=>prev.map(l=>l.id===lobi.id ? {...l, status:'active'} : l));
    showNotif(`🤝 Lobi anlaşması kabul edildi! ${lobi.partyName} ile lobi kuruldu.`, 'success');
  };

  const rejectLobi = (lobi) => {
    setLobiler(prev=>prev.map(l=>l.id===lobi.id ? {...l, status:'rejected'} : l));
    showNotif('Lobi daveti reddedildi', 'info');
  };

  const donatToParty = (lobi, tier) => {
    if ((profile?.money||0) < tier.amount) { showNotif(`Yeterli para yok! ₺${tier.amount.toLocaleString('tr-TR')} gerekli`, 'error'); return; }
    setLobiler(prev=>prev.map(l=>l.id===lobi.id ? {...l, totalDonated:(l.totalDonated||0)+tier.amount, totalInf:(l.totalInf||0)+tier.inf} : l));
    // Optimistic local update
    setParties(prev=>prev.map(p=>p.id===lobi.partyId?{...p,influencePoints:(p.influencePoints||0)+tier.inf}:p));
    // Atomic server-side update
    try{window._socket?.emit('party:updateInfluence',{partyId:lobi.partyId,delta:tier.inf});}catch(e){}
    setProfile(p=>{
      const np={...p,money:(p.money||0)-tier.amount};
      localStorage.setItem('rep_userProfile',JSON.stringify(np));
      try{const tk=localStorage.getItem('rep_token');if(tk)fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tk},body:JSON.stringify({money:np.money,xp:np.xp||0,level:np.level||1})}).catch(()=>{});}catch(e){}
      return np;
    });
    setLobiDonateModal(null);
    showNotif(`💰 ${tier.label}: ₺${tier.amount.toLocaleString('tr-TR')} bağışlandı → ${lobi.partyName} +${tier.inf} Etki Puanı`, 'success');
  };

  const fmtCd = (ms) => { if(ms<=0)return null; const s=Math.ceil(ms/1000); return `${s}sn`; };

  const activeLobiler = lobiler.filter(l=>l.status==='active');
  const pendingForMe  = lobiler.filter(l=>l.status==='pending' && isFamilyLeader && myFamily && l.familyId===myFamily.id);
  const myPartyLobiler= lobiler.filter(l=>l.status==='active' && l.partyId===myPartyId);
  const myFamilyLobiler=lobiler.filter(l=>l.status==='active' && myFamily && l.familyId===myFamily.id);
  const visibleLobiler = [...new Map([...myPartyLobiler,...myFamilyLobiler].map(l=>[l.id,l])).values()];
  const canDonate = myFamily && (myFamilyLobiler.length>0 || myPartyLobiler.length>0);

  return (
    <div style={{padding:'0.75rem',background:bg,minHeight:'100%'}}>
      <div style={{fontWeight:800,color:'#A78BFA',fontSize:'1.05rem',marginBottom:'0.15rem',letterSpacing:'0.03em'}}>⚡ Devlet Etki Puanı</div>
      <div style={{fontSize:'0.75rem',color:'#5A7089',marginBottom:'0.75rem'}}>Faaliyetlerle partine etki puanı kazan. Eğitim ve ticaret puanın bonus verir.</div>

      {/* Bonus kartları */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.75rem'}}>
        <div style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'10px',padding:'0.6rem',textAlign:'center'}}>
          <div style={{fontSize:'0.65rem',color:'#60A5FA',fontWeight:700,marginBottom:'2px'}}>🎓 Eğitim Bonusu</div>
          <div style={{fontSize:'1rem',fontWeight:800,color:'#93C5FD'}}>×{eduMult.toFixed(1)}</div>
          <div style={{fontSize:'0.6rem',color:'#5A7089'}}>{EDU_LEVELS.find(e=>e.id===diploma)?.label||'İlkokul'}</div>
        </div>
        <div style={{background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.2)',borderRadius:'10px',padding:'0.6rem',textAlign:'center'}}>
          <div style={{fontSize:'0.65rem',color:'#22D3EE',fontWeight:700,marginBottom:'2px'}}>🤝 Ticaret Bonusu</div>
          <div style={{fontSize:'1rem',fontWeight:800,color:'#67E8F9'}}>×{tpMult.toFixed(2)}</div>
          <div style={{fontSize:'0.6rem',color:'#5A7089'}}>{tradePoints} TP</div>
        </div>
      </div>

      {/* Parti bilgisi */}
      {myParty ? (
        <div style={{background:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.3)',borderRadius:'12px',padding:'0.65rem',marginBottom:'0.75rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:700,color:'#C4B5FD',fontSize:'0.85rem'}}>{myParty.name}</div>
            <div style={{fontSize:'0.65rem',color:'#5A7089'}}>Senin partin</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:800,color:'#A78BFA',fontSize:'1rem'}}>{(myParty.influencePoints||0).toLocaleString()} ⚡</div>
            <div style={{fontSize:'0.65rem',color:'#5A7089'}}>Etki Puanı</div>
          </div>
        </div>
      ) : (
        <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'12px',padding:'0.65rem',marginBottom:'0.75rem',textAlign:'center',fontSize:'0.8rem',color:'#FCA5A5'}}>
          ⚠️ Etki puanı kazanmak için önce bir partiye katılman gerekiyor.
        </div>
      )}

      {/* ── AİLE FONU — Bekleyen Davetler (sadece aile lideri) ── */}
      {pendingForMe.length>0 && (
        <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.35)',borderRadius:'12px',padding:'0.75rem',marginBottom:'0.75rem'}}>
          <div style={{fontWeight:700,color:'#FCD34D',fontSize:'0.82rem',marginBottom:'0.5rem'}}>📨 Lobi Daveti</div>
          {pendingForMe.map(lobi=>(
            <div key={lobi.id} style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'0.6rem',marginBottom:'0.4rem'}}>
              <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.82rem'}}>{lobi.partyName}</div>
              <div style={{fontSize:'0.65rem',color:'#5A7089',marginBottom:'0.5rem'}}>Lider: {lobi.partyLeaderName} • Lobi kurmak istiyor</div>
              <div style={{display:'flex',gap:'0.5rem'}}>
                <button onClick={()=>acceptLobi(lobi)} style={{flex:1,background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.4)',borderRadius:'8px',padding:'5px',color:'#6EE7B7',cursor:'pointer',fontWeight:700,fontSize:'0.72rem'}}>✅ Kabul Et</button>
                <button onClick={()=>rejectLobi(lobi)} style={{flex:1,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'8px',padding:'5px',color:'#FCA5A5',cursor:'pointer',fontWeight:700,fontSize:'0.72rem'}}>❌ Reddet</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── AİLE FONU — Aktif Lobiler (sadece taraflar görür) ── */}
      {visibleLobiler.length>0 && (
        <div style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:'12px',padding:'0.75rem',marginBottom:'0.75rem'}}>
          <div style={{fontWeight:700,color:'#FCD34D',fontSize:'0.82rem',marginBottom:'0.5rem'}}>💼 Aile Fonu Anlaşmaları</div>
          {visibleLobiler.map(lobi=>{
            const isMine = myFamily && lobi.familyId===myFamily.id;
            return (
              <div key={lobi.id} style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'0.65rem',marginBottom:'0.4rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.35rem'}}>
                  <div>
                    <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.82rem'}}>👨‍👩‍👧‍👦 {lobi.familyName} → 🏛️ {lobi.partyName}</div>
                    <div style={{fontSize:'0.62rem',color:'#5A7089'}}>Toplam bağış: ₺{(lobi.totalDonated||0).toLocaleString('tr-TR')} • +{(lobi.totalInf||0).toLocaleString()} Etki</div>
                  </div>
                </div>
                {isMine && (
                  <button onClick={()=>setLobiDonateModal(lobi)} style={{width:'100%',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:'8px',padding:'5px',color:'#FCD34D',cursor:'pointer',fontWeight:700,fontSize:'0.72rem'}}>
                    💰 Bağış Yap
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Lobi Kur butonu — sadece parti lideri ── */}
      {isPartyLeader && (
        <button onClick={()=>setShowLobiModal(true)} style={{width:'100%',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.35)',borderRadius:'12px',padding:'0.65rem',color:'#FCD34D',cursor:'pointer',fontWeight:700,fontSize:'0.8rem',marginBottom:'0.75rem',textAlign:'center'}}>
          🤝 Aile ile Lobi Kur
        </button>
      )}

      {/* Faaliyetler */}
      <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.82rem',marginBottom:'0.4rem'}}>🎯 Faaliyetler</div>
      <div style={{display:'flex',flexDirection:'column',gap:'0.4rem',marginBottom:'0.85rem'}}>
        {PARTI_ETKI_ACTIONS.map(act => {
          const rem = Math.max(0, act.cd - (now - (cds[act.id]||0)));
          const onCd = rem > 0;
          const canAfford = (profile?.money||0) >= act.cost;
          const hasParty = !!myParty;
          const mult = act.eduBonus ? eduMult : (act.tpBonus ? tpMult : 1.0);
          const finalInf = Math.round(act.inf * mult);
          const bonusActive = mult > 1.05;
          return (
            <div key={act.id} style={{background:card,border:`1px solid ${onCd?'rgba(255,255,255,0.06)':bonusActive?'rgba(251,191,36,0.3)':'rgba(167,139,250,0.2)'}`,borderRadius:'12px',padding:'0.6rem 0.75rem',display:'flex',alignItems:'center',gap:'0.6rem'}}>
              <div style={{fontSize:'1.4rem',flexShrink:0}}>{act.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,color:onCd?'#3B4E63':'#E8EDF2',fontSize:'0.82rem',display:'flex',alignItems:'center',gap:'0.3rem'}}>
                  {act.label}
                  {bonusActive&&<span style={{fontSize:'0.58rem',background:'rgba(251,191,36,0.2)',color:'#FCD34D',border:'1px solid rgba(251,191,36,0.3)',borderRadius:'4px',padding:'0px 4px',fontWeight:700}}>BONUS</span>}
                </div>
                <div style={{fontSize:'0.62rem',color:'#5A7089'}}>{act.desc}</div>
                <div style={{fontSize:'0.65rem',marginTop:'2px',display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                  <span style={{color:'#EF4444'}}>₺{act.cost.toLocaleString('tr-TR')}</span>
                  <span style={{color:bonusActive?'#FCD34D':'#A78BFA'}}>+{finalInf} Etki{bonusActive?` (×${mult.toFixed(1)})`:''}</span>
                  <span style={{color:'#6B7280'}}>+{Math.round(act.xp*mult)} XP</span>
                </div>
              </div>
              <div style={{flexShrink:0}}>
                {onCd ? (
                  <div style={{fontSize:'0.68rem',color:'#5A7089',textAlign:'center',minWidth:'40px'}}>⏳<div style={{fontWeight:700}}>{fmtCd(rem)}</div></div>
                ) : !hasParty ? (
                  <span style={{fontSize:'0.62rem',color:'#5A7089'}}>Parti yok</span>
                ) : !canAfford ? (
                  <span style={{fontSize:'0.62rem',color:'#EF4444',fontWeight:700}}>Yetersiz ₺</span>
                ) : (
                  <button onClick={()=>doAction(act)} style={{background:'rgba(167,139,250,0.15)',border:'1px solid rgba(167,139,250,0.4)',borderRadius:'8px',padding:'5px 12px',color:'#C4B5FD',cursor:'pointer',fontWeight:700,fontSize:'0.72rem',whiteSpace:'nowrap'}}>Yap</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Parti Sıralaması */}
      <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.82rem',marginBottom:'0.4rem'}}>🏆 Parti Etki Puanı Sıralaması</div>
      <div style={{background:card,border:`1px solid ${bdr}`,borderRadius:'12px',overflow:'hidden',marginBottom:'1.5rem'}}>
        {allParties.length===0 ? (
          <div style={{padding:'1.5rem',textAlign:'center',color:'#5A7089',fontSize:'0.8rem'}}>Henüz parti yok</div>
        ) : allParties.map((p,i) => {
          const isMe = p.id===myPartyId;
          const medals=['🥇','🥈','🥉'];
          return (
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.6rem 0.75rem',borderBottom:i<allParties.length-1?`1px solid ${bdr}`:'none',background:isMe?'rgba(167,139,250,0.07)':'transparent'}}>
              <div style={{width:'24px',textAlign:'center',fontWeight:800,fontSize:i<3?'1rem':'0.78rem',color:i<3?'inherit':'#5A7089',flexShrink:0}}>{i<3?medals[i]:`#${i+1}`}</div>
              <div style={{width:'10px',height:'10px',borderRadius:'50%',background:p.color||'#8B5CF6',flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:isMe?800:600,color:isMe?'#C4B5FD':'#E8EDF2',fontSize:'0.82rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}{isMe&&<span style={{fontSize:'0.6rem',color:'#A78BFA',marginLeft:'4px'}}>(Senin)</span>}</div>
                <div style={{fontSize:'0.62rem',color:'#5A7089'}}>{p.memberCount||1} üye • %{p.support||0} destek</div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontWeight:800,color:'#A78BFA',fontSize:'0.88rem'}}>{(p.influencePoints||0).toLocaleString()} ⚡</div>
                <div style={{fontSize:'0.6rem',color:'#5A7089'}}>etki puanı</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal: Lobi Kur (aile seç) ── */}
      {showLobiModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={()=>setShowLobiModal(false)}>
          <div style={{background:dark?'#131E30':'#fff',borderRadius:'16px',padding:'1.25rem',width:'100%',maxWidth:'360px',maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:800,color:'#FCD34D',fontSize:'0.95rem',marginBottom:'0.5rem'}}>🤝 Lobi Davet Gönder</div>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.75rem'}}>Bir aile seç ve lobi daveti gönder. Aile lideri kabul ederse lobi kurulur.</div>
            {allFamilies.length===0 ? (
              <div style={{textAlign:'center',color:'#5A7089',fontSize:'0.82rem',padding:'1rem'}}>Henüz kurulmuş aile yok</div>
            ) : allFamilies.map(f=>{
              const existing = lobiler.find(l=>l.partyId===myPartyId&&l.familyId===f.id&&l.status!=='rejected');
              return (
                <div key={f.id} style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.6rem',background:'rgba(255,255,255,0.04)',borderRadius:'10px',marginBottom:'0.4rem'}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.82rem'}}>👨‍👩‍👧‍👦 {f.name}</div>
                    <div style={{fontSize:'0.62rem',color:'#5A7089'}}>{f.memberCount||1} üye</div>
                  </div>
                  {existing ? (
                    <span style={{fontSize:'0.65rem',color:'#FCD34D',fontWeight:700}}>{existing.status==='pending'?'⏳ Bekliyor':'✅ Aktif'}</span>
                  ) : (
                    <button onClick={()=>sendLobiInvite(f)} style={{background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:'8px',padding:'4px 10px',color:'#FCD34D',cursor:'pointer',fontWeight:700,fontSize:'0.7rem'}}>Davet Et</button>
                  )}
                </div>
              );
            })}
            <button onClick={()=>setShowLobiModal(false)} style={{width:'100%',marginTop:'0.5rem',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'7px',color:'#5A7089',cursor:'pointer',fontSize:'0.75rem'}}>Kapat</button>
          </div>
        </div>
      )}

      {/* ── Modal: Bağış Yap ── */}
      {lobiDonateModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={()=>setLobiDonateModal(null)}>
          <div style={{background:dark?'#131E30':'#fff',borderRadius:'16px',padding:'1.25rem',width:'100%',maxWidth:'340px'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:800,color:'#FCD34D',fontSize:'0.95rem',marginBottom:'0.25rem'}}>💰 Bağış Yap</div>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.75rem'}}>→ {lobiDonateModal.partyName} • Bakiye: ₺{(profile?.money||0).toLocaleString('tr-TR')}</div>
            {LOBI_DONATION_TIERS.map(tier=>{
              const canAfford=(profile?.money||0)>=tier.amount;
              return (
                <button key={tier.id} onClick={()=>canAfford&&donatToParty(lobiDonateModal,tier)} disabled={!canAfford}
                  style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.65rem 0.75rem',marginBottom:'0.4rem',background:canAfford?'rgba(245,158,11,0.1)':'rgba(255,255,255,0.03)',border:`1px solid ${canAfford?'rgba(245,158,11,0.35)':'rgba(255,255,255,0.07)'}`,borderRadius:'10px',color:canAfford?'#FCD34D':'#3B4E63',cursor:canAfford?'pointer':'not-allowed',textAlign:'left'}}>
                  <span style={{fontWeight:700,fontSize:'0.8rem'}}>{tier.label}</span>
                  <span style={{fontSize:'0.75rem'}}>₺{tier.amount.toLocaleString('tr-TR')} → +{tier.inf} ⚡</span>
                </button>
              );
            })}
            <button onClick={()=>setLobiDonateModal(null)} style={{width:'100%',marginTop:'0.25rem',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'7px',color:'#5A7089',cursor:'pointer',fontSize:'0.75rem'}}>İptal</button>
          </div>
        </div>
      )}
    </div>
  );
}

function EducationPage({ profile, setProfile, showNotif }) {
  const edu = profile?.education || {};
  const diploma = edu.diploma || 'ilkokul';
  const activeLevel = edu.activeLevel || null;  // current level being studied
  const clicksDone = edu.clicksDone || 0;
  const lastClick = edu.lastClick || 0;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const eduOrder = EDU_LEVELS.map(e => e.id);
  const currentIdx = eduOrder.indexOf(diploma);

  const hasEduPackage = !!(profile?.packages?.edu || profile?.eduPackage);
  const isVip = !!(profile?.vip || profile?.premium);
  const getCooldown = () => {
    if (hasEduPackage) return EDU_COOLDOWN_PKG;
    if (isVip) return EDU_COOLDOWN_VIP;
    return EDU_COOLDOWN_NORMAL;
  };

  const educationCycles = edu.educationCycles || 0;

  const clickStudy = (lvl) => {
    const idx = eduOrder.indexOf(lvl.id);
    if (idx <= currentIdx) { showNotif('Bu diplomaya zaten sahipsin', 'error'); return; }
    if (idx !== currentIdx + 1) { showNotif('Önce bir önceki seviyeyi tamamla', 'error'); return; }
    if ((profile?.money||0) < lvl.costPerClick) { showNotif(`Her tıklama için ${fmtWord(lvl.costPerClick)} gerekli`, 'error'); return; }
    const cd = getCooldown();
    if (activeLevel === lvl.id && (now - lastClick) < cd) {
      const rem = Math.ceil((cd - (now - lastClick)) / 1000);
      const remStr = rem >= 60 ? `${Math.floor(rem/60)}dk ${rem%60}sn` : `${rem}sn`;
      showNotif(`⏳ ${remStr} bekle`, 'error');
      return;
    }
    const newClicks = (activeLevel === lvl.id ? clicksDone : 0) + 1;
    const isComplete = newClicks >= lvl.clicksNeeded;
    const isProfessor = lvl.id === 'profesor';
    setProfile(p => {
      let ne;
      if (isComplete && isProfessor) {
        const newCycles = (p.education?.educationCycles || 0) + 1;
        ne = { diploma: 'ilkokul', activeLevel: null, clicksDone: 0, lastClick: 0, educationCycles: newCycles };
      } else if (isComplete) {
        ne = { ...(p.education||{}), diploma: lvl.id, activeLevel: null, clicksDone: 0, lastClick: 0 };
      } else {
        ne = { ...(p.education||{}), activeLevel: lvl.id, clicksDone: newClicks, lastClick: Date.now() };
      }
      const np = {
        ...p,
        education: ne,
        diplomaLevel: isComplete && !isProfessor ? lvl.id : (isComplete && isProfessor ? 'ilkokul' : p.diplomaLevel),
        money: (p.money||0) - lvl.costPerClick,
        xp: (p.xp||0) + (isComplete ? 500 : 5),
        educationProgress: (p.educationProgress||0) + (isComplete ? 0 : (lvl.costPerClick + newClicks)),
        meritPoints: isComplete ? (p.meritPoints||0) + 50 : (p.meritPoints||0),
      };
      localStorage.setItem('rep_userProfile', JSON.stringify(np));
      return np;
    });
    try {
      const today = new Date().toDateString();
      const ds = JSON.parse(localStorage.getItem('rep_dailyTaskProgress')||'{}');
      const ts = ds[today]||{};
      localStorage.setItem('rep_dailyTaskProgress', JSON.stringify({...ds,[today]:{...ts, edu1:(ts.edu1||0)+1}}));
    } catch(e){}
    if (isComplete && isProfessor) {
      const cycles = (edu.educationCycles||0) + 1;
      showNotif(`🏛️ Profesör diploması kazandın! ${cycles}. döngü tamamlandı! Eğitim sıfırlandı. +500 XP +50 Liyakat`, 'success');
    } else if (isComplete) {
      showNotif(`🎓 Tebrikler! ${lvl.label} diploması kazandın! +500 XP +50 Liyakat`, 'success');
    } else {
      showNotif(`📚 ${newClicks}/${lvl.clicksNeeded} tıklama • -${fmtWord(lvl.costPerClick)}`, 'info');
    }
  };

  const resetEducation = () => {
    if ((profile?.money||0) < 100000) { showNotif('❌ Yeniden başlamak için ₺100.000 gerekli!','error'); return; }
    setProfile(p => {
      const np = {...p, money:(p.money||0)-100000, education:{diploma:'ilkokul', activeLevel:null, clicksDone:0, lastClick:0, educationCycles:p.education?.educationCycles||0}, diplomaLevel:'ilkokul'};
      localStorage.setItem('rep_userProfile', JSON.stringify(np));
      return np;
    });
    showNotif('🔄 Eğitim sıfırlandı! İlkokul seviyesinden başlıyorsun. -₺100.000','info');
  };

  const card = { background:'rgba(11,21,39,0.9)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'0.85rem', marginBottom:'0.5rem' };
  const cd = getCooldown();
  const cdStr = cd >= 60000 ? `${Math.floor(cd/60000)}dk` : `${Math.floor(cd/1000)}sn`;

  return (
    <div style={{padding:'0.7rem'}}>
      <div style={{background:'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(11,21,39,0.97))',border:'1px solid rgba(59,130,246,0.25)',borderRadius:'18px',padding:'1.2rem',marginBottom:'0.75rem',textAlign:'center'}}>
        <div style={{fontSize:'2rem',marginBottom:'0.3rem'}}>🎓</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.15rem',fontWeight:900,color:'#E8EDF2'}}>EĞİTİM SİSTEMİ</div>
        <div style={{fontSize:'0.72rem',color:'#5A7089',marginTop:'0.2rem'}}>Tıklayarak çalış, diploma kazan, yüksek makamlara ulaş</div>
        <div style={{marginTop:'0.6rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',flexWrap:'wrap'}}>
          <span style={{background:'rgba(167,139,250,0.2)',border:'1px solid rgba(167,139,250,0.4)',borderRadius:'8px',padding:'0.2rem 0.65rem',fontSize:'0.75rem',color:'#C4B5FD',fontWeight:800}}>
            {EDU_LEVELS.find(e=>e.id===diploma)?.icon} {EDU_LEVELS.find(e=>e.id===diploma)?.label}
          </span>
          <span style={{background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:'8px',padding:'0.2rem 0.65rem',fontSize:'0.72rem',color:'#60A5FA',fontWeight:700}}>
            ⏱ {cdStr} bekleme{hasEduPackage?' (Paket)':isVip?' (VIP)':''}
          </span>
          {educationCycles > 0 && (
            <span style={{background:'rgba(245,158,11,0.2)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:'8px',padding:'0.2rem 0.65rem',fontSize:'0.72rem',color:'#FCD34D',fontWeight:800}}>
              🔄 {educationCycles}. döngü tamamlandı
            </span>
          )}
        </div>
        {educationCycles > 0 && (
          <div style={{marginTop:'0.5rem',fontSize:'0.68rem',color:'#F59E0B',background:'rgba(245,158,11,0.08)',borderRadius:'8px',padding:'0.35rem 0.75rem',display:'inline-block'}}>
            🏛️ Profil rozetine "{educationCycles}× Profesör" eklendi
          </div>
        )}
      </div>

      {activeLevel && (() => {
        const lvl = EDU_LEVELS.find(e => e.id === activeLevel);
        if (!lvl) return null;
        const pct = Math.round(clicksDone / lvl.clicksNeeded * 100);
        const cooldownLeft = Math.max(0, cd - (now - lastClick));
        const cdSecs = Math.ceil(cooldownLeft/1000);
        return (
          <div style={{...card,border:'1px solid rgba(59,130,246,0.4)',background:'rgba(59,130,246,0.07)',marginBottom:'0.75rem'}}>
            <div style={{fontSize:'0.72rem',color:'#60A5FA',fontWeight:700,marginBottom:'0.4rem'}}>📚 Devam Eden Eğitim</div>
            <div style={{fontWeight:800,color:'#E8EDF2',marginBottom:'0.3rem'}}>{lvl.icon} {lvl.label}</div>
            <div style={{height:'6px',background:'rgba(255,255,255,0.07)',borderRadius:'3px',marginBottom:'0.3rem'}}>
              <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#3B82F6,#60A5FA)',borderRadius:'3px',transition:'width 0.3s'}} />
            </div>
            <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{clicksDone}/{lvl.clicksNeeded} tıklama ({pct}%) • {cooldownLeft > 0 ? `⏳ ${cdSecs}sn bekle` : '✅ Tıklayabilirsin'}</div>
            <button onClick={()=>clickStudy(lvl)} disabled={cooldownLeft>0}
              style={{marginTop:'0.6rem',width:'100%',padding:'0.6rem',borderRadius:'10px',border:'none',background:cooldownLeft>0?'rgba(255,255,255,0.06)':'linear-gradient(135deg,#3B82F6,#2563EB)',color:cooldownLeft>0?'#3B4E63':'#fff',fontWeight:800,fontSize:'0.85rem',cursor:cooldownLeft>0?'not-allowed':'pointer',transition:'all 0.2s'}}>
              {cooldownLeft>0 ? `⏳ ${cdSecs}sn` : `📖 Çalış (${fmtWord(lvl.costPerClick)})`}
            </button>
          </div>
        );
      })()}

      <div style={{fontSize:'0.7rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.5rem'}}>📋 Eğitim Seviyeleri</div>
      {EDU_LEVELS.map((lvl, i) => {
        const isDone = eduOrder.indexOf(lvl.id) <= currentIdx;
        const isActive = activeLevel === lvl.id;
        const isNext = eduOrder.indexOf(lvl.id) === currentIdx + 1;
        const cooldownLeft = isActive ? Math.max(0, cd - (now - lastClick)) : 0;
        const cdSecs = Math.ceil(cooldownLeft/1000);
        const pct = isActive ? Math.round(clicksDone / lvl.clicksNeeded * 100) : 0;
        return (
          <div key={lvl.id} style={{...card,border:`1px solid ${isDone?'rgba(16,185,129,0.3)':isActive?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.06)'}`,background:isDone?'rgba(16,185,129,0.05)':isActive?'rgba(59,130,246,0.05)':'rgba(11,21,39,0.9)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <div style={{fontSize:'1.6rem',flexShrink:0,opacity:isDone?1:0.6}}>{lvl.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.4rem',flexWrap:'wrap'}}>
                  <span style={{fontWeight:800,color:isDone?'#10B981':isActive?'#60A5FA':'#E8EDF2'}}>{lvl.label}</span>
                  {isDone && <span style={{background:'rgba(16,185,129,0.2)',border:'1px solid rgba(16,185,129,0.4)',borderRadius:'6px',padding:'1px 6px',fontSize:'0.6rem',color:'#10B981',fontWeight:700}}>✅ Mezun</span>}
                  {isActive && <span style={{background:'rgba(59,130,246,0.2)',border:'1px solid rgba(59,130,246,0.4)',borderRadius:'6px',padding:'1px 6px',fontSize:'0.6rem',color:'#60A5FA',fontWeight:700}}>📚 {clicksDone}/{lvl.clicksNeeded}</span>}
                </div>
                <div style={{fontSize:'0.65rem',color:'#5A7089'}}>{lvl.grade} • {lvl.desc}</div>
                {!isDone && lvl.clicksNeeded > 0 && (
                  <div style={{fontSize:'0.65rem',color:'#F59E0B',marginTop:'0.15rem'}}>
                    {fmtWord(lvl.costPerClick)}/tıklama • {lvl.clicksNeeded} tıklama • ~{fmtWord(lvl.costPerClick*lvl.clicksNeeded)} toplam
                  </div>
                )}
                {isActive && (
                  <div style={{marginTop:'0.3rem',height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:'#3B82F6',borderRadius:'2px',transition:'width 0.3s'}} />
                  </div>
                )}
                {lvl.id === 'ilkokul' && <div style={{fontSize:'0.65rem',color:'#10B981',marginTop:'0.15rem'}}>Ücretsiz • Herkeste var</div>}
              </div>
              {!isDone && isNext && !isActive && (
                <button onClick={()=>clickStudy(lvl)}
                  style={{padding:'0.4rem 0.75rem',borderRadius:'10px',border:'none',background:'linear-gradient(135deg,#3B82F6,#2563EB)',color:'#fff',fontWeight:700,fontSize:'0.75rem',cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>
                  Başla
                </button>
              )}
              {isActive && (
                <button onClick={()=>clickStudy(lvl)} disabled={cooldownLeft>0}
                  style={{padding:'0.4rem 0.75rem',borderRadius:'10px',border:'none',background:cooldownLeft>0?'rgba(255,255,255,0.06)':'linear-gradient(135deg,#3B82F6,#2563EB)',color:cooldownLeft>0?'#3B4E63':'#fff',fontWeight:700,fontSize:'0.75rem',cursor:cooldownLeft>0?'not-allowed':'pointer',flexShrink:0,whiteSpace:'nowrap'}}>
                  {cooldownLeft>0?`⏳${cdSecs}s`:'📖 Çalış'}
                </button>
              )}
              {!isDone && !isNext && !isActive && (
                <span style={{fontSize:'0.65rem',color:'#5A7089',flexShrink:0}}>🔒</span>
              )}
            </div>
          </div>
        );
      })}

      <div style={{...card,marginTop:'0.75rem',background:'rgba(139,92,246,0.06)',border:'1px solid rgba(139,92,246,0.2)'}}>
        <div style={{fontWeight:800,color:'#A78BFA',marginBottom:'0.65rem',fontSize:'0.85rem'}}>🏛️ Makam Gereksinimleri</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.35rem'}}>
          {Object.entries(EDU_POSITION_REQS).map(([pos, req]) => {
            const reqLvl = EDU_LEVELS.find(e=>e.id===req);
            const met = eduOrder.indexOf(diploma) >= eduOrder.indexOf(req);
            return (
              <div key={pos} style={{display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.3rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <span style={{fontSize:'0.65rem',color:met?'#10B981':'#EF4444',flexShrink:0}}>{met?'✅':'❌'}</span>
                <div>
                  <div style={{fontSize:'0.7rem',fontWeight:700,color:'#E8EDF2'}}>{pos}</div>
                  <div style={{fontSize:'0.58rem',color:'#5A7089'}}>{reqLvl?.icon} {reqLvl?.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{...card,marginTop:'0.75rem',border:'1px solid rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.04)'}}>
        <div style={{fontWeight:800,color:'#F87171',marginBottom:'0.4rem',fontSize:'0.85rem'}}>🔄 Eğitime Tekrar Başla</div>
        <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.75rem',lineHeight:1.5}}>
          Tüm eğitim ilerlemen sıfırlanır ve İlkokul seviyesinden yeniden başlarsın.<br/>
          Bu işlem geri alınamaz. Mevcut diploma: <strong style={{color:'#F87171'}}>{EDU_LEVELS.find(e=>e.id===diploma)?.label||'İlkokul'}</strong>
        </div>
        <button onClick={resetEducation}
          style={{width:'100%',padding:'0.6rem',borderRadius:'10px',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.1)',color:'#F87171',fontWeight:700,fontSize:'0.83rem',cursor:'pointer',fontFamily:'inherit'}}>
          🔄 Yeniden Başla (₺100.000)
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ŞEHİR YÖNETİMİ SAYFASI
// ═══════════════════════════════════════════════════════
const CITY_POSITIONS = [
  {
    id:'belediye_baskani', label:'Belediye Başkanı', icon:'🏙️', color:'#8B5CF6', eduReq:'lise',
    duties:[
      {id:'butce_onay',         label:'Bütçe Onayla',        cd:24*3600000, reward:{xp:500,  money:50000,  desc:'Yıllık bütçeyi onayla'}},
      {id:'insan_kaynagi',      label:'İK Yönetimi',         cd:12*3600000, reward:{xp:300,  money:25000,  desc:'Personel ata ve çıkar'}},
      {id:'kent_yatırım',       label:'Kent Yatırımı',       cd:18*3600000, reward:{xp:450,  money:40000,  desc:'Şehre yatırım çek'}},
      {id:'halk_toplantisi',    label:'Halk Toplantısı',     cd:8*3600000,  reward:{xp:200,  money:10000,  desc:'Halka hesap ver'}},
    ],
    perks:['Vergi oranı belirleme','İnşaat ruhsatı verme','Bütçe kontrolü'],
    minSupport:500,
  },
];

function CityGovPage({ profile, setProfile, showNotif }) {
  const [govCooldowns, setGovCooldowns] = useLs('cityGovCooldowns', {});
  const [now, setNow] = useState(Date.now());
  const [selectedPos, setSelectedPos] = useState(null);
  const [applyModal, setApplyModal] = useState(false);
  const [cityOfficials, setCityOfficials] = useLs('cityOfficials', {});

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const eduOrder = EDU_LEVELS.map(e => e.id);
  const myDiploma = profile?.education?.diploma || 'ilkokul';
  const myPositions = cityOfficials[profile?.uid] || [];

  const applyForPosition = (pos) => {
    const eduMet = eduOrder.indexOf(myDiploma) >= eduOrder.indexOf(pos.eduReq);
    if (!eduMet) { showNotif(`Bu makam için en az ${EDU_LEVELS.find(e=>e.id===pos.eduReq)?.label} diploması gerekli`, 'error'); return; }
    const supportMet = (profile?.meritPoints||0) >= pos.minSupport;
    if (!supportMet) { showNotif(`Bu makam için ${pos.minSupport} liyakat puanı gerekli`, 'error'); return; }
    if (myPositions.includes(pos.id)) { showNotif('Bu makama zaten sahipsin', 'error'); return; }
    setCityOfficials(prev => { const cur = prev[profile.uid]||[]; return {...prev,[profile.uid]:[...cur,pos.id]}; });
    showNotif(`🎉 ${pos.label} olarak atandın!`, 'success');
    setApplyModal(false);
  };

  const doduty = (pos, duty) => {
    const key = `citygov_${profile?.uid}_${pos.id}_${duty.id}`;
    const last = govCooldowns[key] || 0;
    const rem = duty.cd - (now - last);
    if (rem > 0) {
      const h = Math.floor(rem/3600000); const m = Math.floor((rem%3600000)/60000);
      showNotif(`⏳ ${h > 0 ? h+'s ' : ''}${m}dk sonra tekrar kullanılabilir`, 'error'); return;
    }
    setGovCooldowns(prev => ({...prev,[key]:Date.now()}));
    setProfile(p => {
      const np = { ...p, xp:(p.xp||0)+duty.reward.xp, money:(p.money||0)+duty.reward.money, meritPoints:(p.meritPoints||0)+Math.floor(duty.reward.xp/10) };
      localStorage.setItem('rep_userProfile', JSON.stringify(np));
      return np;
    });
    showNotif(`✅ ${duty.label} tamamlandı! +${duty.reward.xp} XP +${fmtWord(duty.reward.money)}`, 'success');
  };

  const getCooldownLabel = (pos, duty) => {
    const key = `citygov_${profile?.uid}_${pos.id}_${duty.id}`;
    const last = govCooldowns[key] || 0;
    const rem = duty.cd - (now - last);
    if (rem <= 0) return null;
    const h = Math.floor(rem/3600000); const m = Math.floor((rem%3600000)/60000); const s = Math.floor((rem%60000)/1000);
    return h > 0 ? `${h}s ${m}dk` : m > 0 ? `${m}dk ${s}sn` : `${s}sn`;
  };

  const card = { background:'rgba(11,21,39,0.9)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'0.9rem', marginBottom:'0.55rem' };

  return (
    <div style={{padding:'0.7rem'}}>
      <div style={{background:'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(11,21,39,0.97))',border:'1px solid rgba(99,102,241,0.25)',borderRadius:'18px',padding:'1.2rem',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'0.6rem',color:'#818CF8',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.2rem'}}>ŞEHİR YÖNETİMİ</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:900,color:'#E8EDF2',marginBottom:'0.1rem'}}>Makamlar & Görevler</div>
        <div style={{fontSize:'0.7rem',color:'#5A7089'}}>Liyakat: <span style={{color:'#A78BFA',fontWeight:700}}>{profile?.meritPoints||0}</span> puan • Diploma: <span style={{color:'#60A5FA',fontWeight:700}}>{EDU_LEVELS.find(e=>e.id===myDiploma)?.label}</span></div>
      </div>

      {CITY_POSITIONS.map(pos => {
        const hasPos = myPositions.includes(pos.id);
        const eduMet = eduOrder.indexOf(myDiploma) >= eduOrder.indexOf(pos.eduReq);
        const supportMet = (profile?.meritPoints||0) >= pos.minSupport;
        const canApply = eduMet && supportMet && !hasPos;

        return (
          <div key={pos.id} style={{...card,border:`1px solid ${hasPos?`rgba(${pos.color.match(/\d+/g)?.slice(0,3).join(',')},0.35)`:'rgba(255,255,255,0.07)'}`,background:hasPos?`rgba(${pos.color.match(/\d+/g)?.slice(0,3).join(',')},0.06)`:'rgba(11,21,39,0.9)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.55rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
                <div style={{fontSize:'1.5rem'}}>{pos.icon}</div>
                <div>
                  <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{pos.label}</div>
                  <div style={{fontSize:'0.62rem',color:'#5A7089'}}>{EDU_LEVELS.find(e=>e.id===pos.eduReq)?.icon} {EDU_LEVELS.find(e=>e.id===pos.eduReq)?.label} gerekli</div>
                </div>
              </div>
              {hasPos
                ? <span style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.35)',borderRadius:'8px',padding:'0.2rem 0.6rem',fontSize:'0.65rem',color:'#10B981',fontWeight:700}}>✅ Makam Sahibi</span>
                : <span style={{fontSize:'0.68rem',color:'#5A7089',fontWeight:700,textAlign:'right',maxWidth:'90px',lineHeight:1.2}}>🗳️ Seçimle Gelir</span>
              }
            </div>

            {!eduMet && <div style={{fontSize:'0.65rem',color:'#EF4444',marginBottom:'0.4rem'}}>❌ {EDU_LEVELS.find(e=>e.id===pos.eduReq)?.label} diploması gerekli</div>}
            {eduMet && !supportMet && pos.minSupport > 0 && <div style={{fontSize:'0.65rem',color:'#F59E0B',marginBottom:'0.4rem'}}>⚠️ {pos.minSupport} liyakat puanı gerekli (şu an: {profile?.meritPoints||0})</div>}

            {hasPos && (
              <div>
                <div style={{fontSize:'0.65rem',color:'#5A7089',fontWeight:700,marginBottom:'0.4rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>⚡ YETKİLER</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:'0.3rem',marginBottom:'0.6rem'}}>
                  {pos.perks.map(pk=>(
                    <span key={pk} style={{background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'6px',padding:'2px 7px',fontSize:'0.62rem',color:'#818CF8'}}>{pk}</span>
                  ))}
                </div>
                <div style={{fontSize:'0.65rem',color:'#5A7089',fontWeight:700,marginBottom:'0.4rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>📋 ZORUNLU GÖREVLER</div>
                {pos.duties.map(duty => {
                  const cdLabel = getCooldownLabel(pos, duty);
                  return (
                    <div key={duty.id} style={{background:'rgba(255,255,255,0.03)',borderRadius:'10px',padding:'0.55rem 0.7rem',marginBottom:'0.3rem',display:'flex',alignItems:'center',gap:'0.6rem',border:'1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.8rem'}}>{duty.label}</div>
                        <div style={{fontSize:'0.62rem',color:'#5A7089'}}>{duty.reward.desc} • +{duty.reward.xp} XP • +{fmtWord(duty.reward.money)}</div>
                      </div>
                      <button onClick={()=>doduty(pos,duty)}
                        disabled={!!cdLabel}
                        style={{padding:'0.35rem 0.7rem',borderRadius:'8px',border:'none',background:cdLabel?'rgba(255,255,255,0.05)':'rgba(16,185,129,0.15)',color:cdLabel?'#3B4E63':'#10B981',fontWeight:700,fontSize:'0.7rem',cursor:cdLabel?'default':'pointer',border:`1px solid ${cdLabel?'rgba(255,255,255,0.06)':'rgba(16,185,129,0.3)'}`,minWidth:'70px',textAlign:'center',flexShrink:0}}>
                        {cdLabel ? `⏳ ${cdLabel}` : '▶ Yap'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div style={{...card,background:'rgba(139,92,246,0.05)',border:'1px solid rgba(139,92,246,0.15)'}}>
        <div style={{fontWeight:800,color:'#A78BFA',marginBottom:'0.4rem',fontSize:'0.82rem'}}>📖 Makam Hakkında</div>
        <div style={{fontSize:'0.7rem',color:'#5A7089',lineHeight:1.6}}>
          UNDERSTATE'de şehir yönetimi gerçekçi bir hiyerarşi sistemiyle çalışır. Her makamın zorunlu görevleri vardır; bu görevler yapılmazsa makam kaybedilebilir. Daha yüksek makamlara çıkmak için hem eğitim diploması hem de liyakat puanı gerekmektedir. Holding sahipleri belirli makamlara gizlice destek verebilir.
        </div>
      </div>

      {applyModal && (
        <div onClick={()=>setApplyModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#0F172A',border:'1px solid rgba(99,102,241,0.35)',borderRadius:'20px',padding:'1.5rem',maxWidth:'340px',width:'100%',boxShadow:'0 25px 60px rgba(0,0,0,0.6)'}}>
            <div style={{textAlign:'center',marginBottom:'1.2rem'}}>
              <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>{applyModal.icon}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,color:'#E8EDF2',fontSize:'1.1rem',marginBottom:'0.3rem'}}>{applyModal.label}</div>
              <div style={{fontSize:'0.72rem',color:'#5A7089'}}>Bu makama başvurmak istediğini onaylıyor musun?</div>
            </div>
            <div style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'12px',padding:'0.85rem',marginBottom:'1rem'}}>
              <div style={{fontSize:'0.7rem',color:'#818CF8',fontWeight:700,marginBottom:'0.5rem'}}>📋 Gereksinimler</div>
              <div style={{fontSize:'0.68rem',color:'#5A7089',display:'flex',flexDirection:'column',gap:'0.3rem'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span>🎓 Diploma:</span>
                  <span style={{color:'#10B981',fontWeight:700}}>{EDU_LEVELS.find(e=>e.id===applyModal.eduReq)?.label} ✅</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span>⭐ Liyakat:</span>
                  <span style={{color:'#10B981',fontWeight:700}}>{profile?.meritPoints||0}/{applyModal.minSupport} ✅</span>
                </div>
              </div>
            </div>
            <div style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'12px',padding:'0.7rem',marginBottom:'1rem',fontSize:'0.68rem',color:'#5A7089'}}>
              <div style={{color:'#10B981',fontWeight:700,marginBottom:'0.3rem'}}>⚡ Makam Yetkileri</div>
              {applyModal.perks.map(p=><div key={p}>• {p}</div>)}
            </div>
            <div style={{display:'flex',gap:'0.5rem'}}>
              <button onClick={()=>setApplyModal(null)} style={{flex:1,padding:'0.65rem',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'#5A7089',fontWeight:700,fontSize:'0.82rem',cursor:'pointer'}}>İptal</button>
              <button onClick={()=>applyForPosition(applyModal)} style={{flex:2,padding:'0.65rem',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#6366F1,#4F46E5)',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:'0.85rem',cursor:'pointer'}}>✅ Başvuruyu Onayla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// GİZLİ FON KARTI (HOLDİNG → PARTİ)
// ═══════════════════════════════════════════════════════
function SecretFundingCard({ holding, holdings, setHoldings, parties, profile, setProfile, showNotif }) {
  const [targetPartyId, setTargetPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [fundLog, setFundLog] = useLs(`fundLog_${holding.id}`, []);

  const openCase = (amt, partyName) => {
    const existing = JSON.parse(localStorage.getItem('rep_sucDavalari')||'[]');
    const newCase = {
      id: genId(),
      uid: profile?.uid,
      username: profile?.username,
      type: 'gizli_fonlama',
      typeLabel: 'Gizli Parti Fonlaması',
      icon: '🕵️',
      detail: `${holding.name} şirketinden ${partyName} partisine ${fmtWord(amt)} gizli transfer`,
      amount: amt,
      stage: 'suclama',
      verdict: null,
      ts: Date.now(),
      defenseUsed: false,
      severity: 'yuksek',
    };
    localStorage.setItem('rep_sucDavalari', JSON.stringify([newCase, ...existing].slice(0,50)));
  };

  const doFund = () => {
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { showNotif('Geçerli miktar girin', 'error'); return; }
    if (!targetPartyId) { showNotif('Parti seçin', 'error'); return; }
    const maxFund = Math.floor((holding.value||0) * 0.1);
    if (amt > maxFund) { showNotif(`En fazla şirket değerinin %10'u (${fmtWord(maxFund)}) transfer edilebilir`, 'error'); return; }
    if ((profile?.money||0) < amt) { showNotif('Yetersiz bakiye', 'error'); return; }
    const party = parties.find(p=>p.id===targetPartyId);
    if (!party) { showNotif('Parti bulunamadı', 'error'); return; }

    const savedParties = JSON.parse(localStorage.getItem('rep_parties')||'[]');
    const updatedParties = savedParties.map(p => p.id===targetPartyId ? {...p, treasury:(p.treasury||0)+amt} : p);
    localStorage.setItem('rep_parties', JSON.stringify(updatedParties));

    const newLog = { id:genId(), partyName:party.name, amount:amt, ts:Date.now(), holdingName:holding.name };
    setFundLog(prev => [newLog, ...prev].slice(0,20));
    setProfile(p => { const np={...p,money:(p.money||0)-amt,xp:(p.xp||0)+50}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setAmount('');

    const detectionChance = amt > 1000000 ? 0.30 : 0.15;
    const detected = Math.random() < detectionChance;
    if (detected) {
      openCase(amt, party.name);
      showNotif(`🚔 UYARI: Transfer istihbarat birimlerine sızdı! Dava açıldı.`, 'error');
    } else {
      showNotif(`🕵️ ${fmtWord(amt)} gizlice ${party.name} partisine aktarıldı`, 'success');
    }
  };

  return (
    <div style={{background:'rgba(11,21,39,0.95)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'14px',padding:'0.85rem',marginBottom:'0.55rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:'0.6rem',marginBottom:'0.65rem'}}>
        <span style={{fontSize:'1.4rem'}}>{holding.sectorIcon}</span>
        <div>
          <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.88rem'}}>{holding.name}</div>
          <div style={{fontSize:'0.62rem',color:'#5A7089'}}>Değer: {fmtWord(holding.value)} • Maks. fon: {fmtWord(Math.floor((holding.value||0)*0.1))}</div>
        </div>
      </div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.4rem'}}>
        <select value={targetPartyId} onChange={e=>setTargetPartyId(e.target.value)}
          style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',padding:'0.5rem 0.7rem',color:targetPartyId?'#E8EDF2':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontSize:'0.8rem',outline:'none'}}>
          <option value=''>-- Hedef parti seç --</option>
          {parties.map(p=><option key={p.id} value={p.id} style={{background:'#0B1527'}}>{p.name} ({p.ideology})</option>)}
        </select>
      </div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.5rem'}}>
        <input type='number' value={amount} onChange={e=>setAmount(e.target.value)} placeholder='Transfer tutarı...'
          style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',padding:'0.5rem 0.7rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'0.8rem',outline:'none'}} />
        <button onClick={doFund} style={{padding:'0.5rem 0.85rem',borderRadius:'9px',border:'none',background:'rgba(239,68,68,0.15)',color:'#F87171',fontWeight:700,fontSize:'0.78rem',cursor:'pointer',border:'1px solid rgba(239,68,68,0.3)'}}>
          🕵️ Gönder
        </button>
      </div>
      {fundLog.length > 0 && (
        <div style={{borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'0.45rem'}}>
          <div style={{fontSize:'0.62rem',color:'#5A7089',fontWeight:700,marginBottom:'0.25rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>Son Transferler</div>
          {fundLog.slice(0,3).map(f=>(
            <div key={f.id} style={{fontSize:'0.65rem',color:'#5A7089',padding:'0.15rem 0'}}>
              🕵️ {fmtWord(f.amount)} → {f.partyName} • {timeAgo(f.ts)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SUÇ / CEZA / MAHKEME SİSTEMİ
// ═══════════════════════════════════════════════════════
