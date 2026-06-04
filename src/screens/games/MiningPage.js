// ═══════════════════════════════════════════════════════
// MADENCİLİK SAYFASI
// ═══════════════════════════════════════════════════════
function MiningPage({ profile, setProfile, showNotif }) {
  const [mineData, setMineData] = useLs('mineData', {});
  const [cooldowns, setCooldowns] = useLs('mineCooldowns', {});
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};
  const now = Date.now();
  const updateUser = (upd) => {
    const next = {...cu,...upd};
    setProfile(next);
    localStorage.setItem('rep_userProfile', JSON.stringify(next));
    try { const u2 = JSON.parse(localStorage.getItem('rep_users')||'[]'); localStorage.setItem('rep_users', JSON.stringify(u2.map(u => u.id===next.id ? next : u))); } catch{}
  };

  const RESOURCES = [
    {id:'coal',name:'Kömür',icon:'🪨',cd:1800000,yield:[5,15],price:500,color:'#6B7280'},
    {id:'iron',name:'Demir',icon:'⚙️',cd:2*3600000,yield:[3,10],price:1200,color:'#9CA3AF'},
    {id:'gold',name:'Altın',icon:'✨',cd:4*3600000,yield:[1,5],price:5000,color:'#FFD700'},
    {id:'oil',name:'Petrol',icon:'🛢️',cd:6*3600000,yield:[2,8],price:3000,color:'#1F2937'},
    {id:'diamond',name:'Elmas',icon:'💎',cd:12*3600000,yield:[1,3],price:20000,color:'#7DD3FC'},
  ];
  const myResources = mineData[cu.id] || {};

  const mine = (res) => {
    const last = cooldowns[cu.id+'_'+res.id] || 0;
    const rem = res.cd - (now-last);
    if (rem > 0) { showNotif(`⏳ ${res.name} için ${Math.ceil(rem/60000)}dk bekle!`,'error'); return; }
    const amount = res.yield[0] + Math.floor(Math.random()*(res.yield[1]-res.yield[0]+1));
    const newRes = {...myResources,[res.id]:(myResources[res.id]||0)+amount};
    setMineData(prev=>({...prev,[cu.id]:newRes}));
    setCooldowns(prev=>({...prev,[cu.id+'_'+res.id]:now}));
    try { const today=new Date().toDateString(); const dk=`day_${today}`; const s=JSON.parse(localStorage.getItem('rep_dailyTaskState')||'{}'); s[dk]={...(s[dk]||{}),dailyMineCount:((s[dk]?.dailyMineCount)||0)+1}; localStorage.setItem('rep_dailyTaskState',JSON.stringify(s)); } catch(e){}
    showNotif(`✅ ${amount}x ${res.name} kazandın! (${res.icon})`,'success');
  };

  const sellAll = () => {
    let total = 0;
    const newRes = {};
    RESOURCES.forEach(r => {
      const qty = myResources[r.id]||0;
      total += qty * r.price;
      newRes[r.id] = 0;
    });
    if (total === 0) { showNotif('Satılacak kaynak yok!','error'); return; }
    updateUser({money:(cu.money||0)+total});
    setMineData(prev=>({...prev,[cu.id]:newRes}));
    showNotif(`✅ Tüm kaynaklar satıldı! +₺${total.toLocaleString()}`,'success');
  };

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#F59E0B',marginBottom:'0.5rem'}}>⛏️ Madencilik</div>
      <div style={{fontSize:'0.82rem',color:'#999',marginBottom:'1rem',background:'rgba(245,158,11,0.07)',borderRadius:'8px',padding:'0.5rem 0.75rem',border:'1px solid rgba(245,158,11,0.2)'}}>
        ⛏️ Her kaynak türünün bekleme süresi var. Kazıp satarak para kazan!
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1rem'}}>
        {RESOURCES.map(res=>{
          const last = cooldowns[cu.id+'_'+res.id]||0;
          const rem = Math.max(0, res.cd-(now-last));
          const ready = rem===0;
          const qty = myResources[res.id]||0;
          return (
            <div key={res.id} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${ready?res.color+'55':'rgba(255,255,255,0.07)'}`,borderRadius:'12px',padding:'0.85rem'}}>
              <div style={{textAlign:'center',fontSize:'2.2rem',marginBottom:'0.3rem'}}>{res.icon}</div>
              <div style={{fontWeight:700,textAlign:'center',fontSize:'0.85rem',marginBottom:'0.15rem'}}>{res.name}</div>
              <div style={{fontSize:'0.68rem',color:'#999',textAlign:'center',marginBottom:'0.5rem'}}>Fiyat: ₺{res.price.toLocaleString()} · Stok: <strong style={{color:qty>0?'#10B981':'#666'}}>{qty}</strong></div>
              {!ready&&<div style={{fontSize:'0.7rem',color:'#F59E0B',textAlign:'center',marginBottom:'0.4rem'}}>⏳ {Math.ceil(rem/60000)} dakika</div>}
              <button onClick={()=>mine(res)} style={{width:'100%',padding:'0.4rem',background:ready?'rgba(245,158,11,0.12)':'rgba(255,255,255,0.03)',border:`1px solid ${ready?'rgba(245,158,11,0.35)':'rgba(255,255,255,0.07)'}`,borderRadius:'6px',color:ready?'#F59E0B':'#555',cursor:ready?'pointer':'not-allowed',fontWeight:700,fontSize:'0.78rem',fontFamily:'inherit'}}>⛏️ {ready?'Kaz!':'Bekle'}</button>
            </div>
          );
        })}
      </div>
      <div style={{background:'rgba(16,185,129,0.07)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'12px',padding:'1rem'}}>
        <div style={{fontWeight:700,color:'#10B981',marginBottom:'0.5rem'}}>💰 Kaynakları Sat</div>
        <div style={{marginBottom:'0.75rem'}}>
          {RESOURCES.map(r=>{
            const qty=myResources[r.id]||0;
            if(!qty) return null;
            return <div key={r.id} style={{display:'flex',justifyContent:'space-between',fontSize:'0.82rem',padding:'0.2rem 0'}}>
              <span>{r.icon} {r.name}: <strong>{qty}x</strong></span>
              <span style={{color:'#10B981'}}>₺{(qty*r.price).toLocaleString()}</span>
            </div>;
          })}
          {!Object.values(myResources).some(v=>v>0)&&<div style={{color:'#555',fontSize:'0.82rem'}}>Henüz kaynak yok. Kazmaya başla!</div>}
        </div>
        <button onClick={sellAll} style={{width:'100%',padding:'0.6rem',background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'8px',color:'#10B981',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>💰 Hepsini Sat</button>
      </div>
    </div>
  );
}

