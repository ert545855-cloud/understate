// ═══════════════════════════════════════════════════════
// MADENCİLİK SAYFASI — server-side persist
// ═══════════════════════════════════════════════════════
function MiningPage({ profile, setProfile, showNotif }) {
  const [mineData, setMineData] = useLs('mineData', {});
  const [cooldowns, setCooldowns] = useLs('mineCooldowns', {});
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};
  const now = Date.now();

  const RESOURCES = [
    {id:'coal',   name:'Kömür', icon:'🪨', cd:1800000,   yield:[5,15],  price:500,   color:'#6B7280'},
    {id:'iron',   name:'Demir', icon:'⚙️',  cd:2*3600000, yield:[3,10],  price:1200,  color:'#9CA3AF'},
    {id:'gold',   name:'Altın', icon:'✨',  cd:4*3600000, yield:[1,5],   price:5000,  color:'#FFD700'},
    {id:'oil',    name:'Petrol',icon:'🛢️', cd:6*3600000, yield:[2,8],   price:3000,  color:'#1F2937'},
    {id:'diamond',name:'Elmas', icon:'💎', cd:12*3600000,yield:[1,3],   price:20000, color:'#7DD3FC'},
  ];
  const myResources = mineData[cu.id||cu.uid] || {};

  // Server'dan mevcut mining state'i yükle
  useEffect(() => {
    const sock = window._socket;
    if (!sock?.connected || !cu.id) return;
    const gd = cu.game_data || cu.gameData || {};
    const serverMining = gd.mining || {};
    if (serverMining.resources) {
      setMineData(prev => ({ ...prev, [cu.id]: serverMining.resources }));
    }
    if (serverMining.cooldowns) {
      const merged = {};
      Object.entries(serverMining.cooldowns).forEach(([k,v]) => { merged[`${cu.id}_${k}`] = v; });
      setCooldowns(prev => ({ ...prev, ...merged }));
    }
  }, [cu.id]);

  // Server'dan gelen mining sonuçlarını dinle
  useEffect(() => {
    const sock = window._socket;
    if (!sock) return;
    const onResult = (data) => {
      if (!data.ok) return;
      setMineData(prev => ({ ...prev, [cu.id||cu.uid]: data.resources }));
      const merged = {};
      Object.entries(data.cooldowns || {}).forEach(([k,v]) => { merged[`${cu.id||cu.uid}_${k}`] = v; });
      setCooldowns(prev => ({ ...prev, ...merged }));
    };
    const onSold = (data) => {
      if (!data.ok) { showNotif(data.msg || 'Hata', 'error'); return; }
      setMineData(prev => ({ ...prev, [cu.id||cu.uid]: data.resources }));
      setProfile(prev => ({ ...prev, money: data.newMoney }));
      localStorage.setItem('rep_userProfile', JSON.stringify({ ...cu, money: data.newMoney }));
      showNotif(`✅ Tüm kaynaklar satıldı! +₺${data.total.toLocaleString()}`, 'success');
    };
    sock.on('mining:result', onResult);
    sock.on('mining:sold', onSold);
    return () => { sock.off('mining:result', onResult); sock.off('mining:sold', onSold); };
  }, [cu.id, cu.money]);

  const mine = (res) => {
    const uid = cu.id || cu.uid;
    const last = cooldowns[uid+'_'+res.id] || 0;
    const rem  = res.cd - (now - last);
    if (rem > 0) { showNotif(`⏳ ${res.name} için ${Math.ceil(rem/60000)}dk bekle!`, 'error'); return; }
    // Optimistic UI update
    const amount = res.yield[0] + Math.floor(Math.random()*(res.yield[1]-res.yield[0]+1));
    setMineData(prev => ({ ...prev, [uid]: { ...(prev[uid]||{}), [res.id]: ((prev[uid]||{})[res.id]||0)+amount } }));
    setCooldowns(prev => ({ ...prev, [uid+'_'+res.id]: now }));
    try { const today=new Date().toDateString(); const dk=`day_${today}`; const s=JSON.parse(localStorage.getItem('rep_dailyTaskState')||'{}'); s[dk]={...(s[dk]||{}),dailyMineCount:((s[dk]?.dailyMineCount)||0)+1}; localStorage.setItem('rep_dailyTaskState',JSON.stringify(s)); } catch(e){}
    showNotif(`✅ ${amount}x ${res.name} kazandın! (${res.icon})`, 'success');
    // Server persist
    const sock = window._socket;
    if (sock?.connected) sock.emit('mining:mine', { resourceId: res.id, amount });
  };

  const sellAll = () => {
    const uid = cu.id || cu.uid;
    const sock = window._socket;
    if (sock?.connected) {
      sock.emit('mining:sell', { userId: uid });
      return;
    }
    // Fallback offline sell
    let total = 0;
    const newRes = {};
    RESOURCES.forEach(r => { const qty = (myResources[r.id]||0); total += qty * r.price; newRes[r.id] = 0; });
    if (total === 0) { showNotif('Satılacak kaynak yok!', 'error'); return; }
    setProfile(prev => ({ ...prev, money: (prev.money||0)+total }));
    setMineData(prev => ({ ...prev, [uid]: newRes }));
    localStorage.setItem('rep_userProfile', JSON.stringify({ ...cu, money: (cu.money||0)+total }));
    showNotif(`✅ Tüm kaynaklar satıldı! +₺${total.toLocaleString()}`, 'success');
  };

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#F59E0B',marginBottom:'0.5rem'}}>⛏️ Madencilik</div>
      <div style={{fontSize:'0.82rem',color:'#999',marginBottom:'1rem',background:'rgba(245,158,11,0.07)',borderRadius:'8px',padding:'0.5rem 0.75rem',border:'1px solid rgba(245,158,11,0.2)'}}>
        ⛏️ Her kaynak türünün bekleme süresi var. Kazıp satarak para kazan!
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1rem'}}>
        {RESOURCES.map(res=>{
          const uid = cu.id||cu.uid;
          const last = cooldowns[uid+'_'+res.id]||0;
          const rem = Math.max(0,res.cd-(now-last));
          const ready = rem===0;
          return (
            <div key={res.id} style={{background:`${res.color}11`,border:`1px solid ${res.color}33`,borderRadius:'12px',padding:'0.75rem'}}>
              <div style={{fontSize:'1.5rem',marginBottom:'0.25rem'}}>{res.icon}</div>
              <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:'0.15rem'}}>{res.name}</div>
              <div style={{fontSize:'0.7rem',color:'#888',marginBottom:'0.4rem'}}>Stok: {myResources[res.id]||0} · ₺{res.price.toLocaleString()}/adet</div>
              {!ready && <div style={{fontSize:'0.65rem',color:'#F59E0B',marginBottom:'0.3rem'}}>⏳ {Math.ceil(rem/60000)}dk</div>}
              <button onClick={()=>mine(res)} disabled={!ready} style={{width:'100%',padding:'0.35rem',borderRadius:'6px',border:'none',background:ready?res.color:'rgba(255,255,255,0.05)',color:ready?'#fff':'#555',cursor:ready?'pointer':'not-allowed',fontWeight:700,fontSize:'0.75rem',fontFamily:'inherit'}}>
                {ready?'⛏️ Kaz':'Bekle'}
              </button>
            </div>
          );
        })}
      </div>
      <div style={{background:'rgba(245,158,11,0.07)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'12px',padding:'0.75rem',marginBottom:'1rem'}}>
        <div style={{fontWeight:700,color:'#F59E0B',marginBottom:'0.4rem',fontSize:'0.85rem'}}>💰 Toplam Değer</div>
        <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:'1.2rem',fontWeight:900,color:'#F59E0B'}}>
          ₺{RESOURCES.reduce((a,r)=>(a+(myResources[r.id]||0)*r.price),0).toLocaleString()}
        </div>
      </div>
      <button onClick={sellAll} style={{width:'100%',padding:'0.75rem',borderRadius:'10px',border:'none',background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',fontWeight:900,fontSize:'0.9rem',cursor:'pointer',fontFamily:'Syne,sans-serif'}}>
        💰 Tümünü Sat
      </button>
    </div>
  );
}
