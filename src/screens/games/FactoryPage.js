// ═══════════════════════════════════════════════════════
// FABRİKA SAYFASI
// ═══════════════════════════════════════════════════════
function FactoryPage({ profile, setProfile, showNotif }) {
  const [factories, setFactories] = useLs('factories', []);
  const [tab, setTab] = useState('my');
  const cu = profile || {};
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const updateUser = (upd) => {
    const next = { ...cu, ...upd };
    setProfile(next);
    localStorage.setItem('rep_userProfile', JSON.stringify(next));
    try { const u2 = JSON.parse(localStorage.getItem('rep_users')||'[]'); localStorage.setItem('rep_users', JSON.stringify(u2.map(u => u.id===next.id ? next : u))); } catch{}
  };

  const FACTORY_TYPES = [
    {id:'textile',name:'Tekstil Fabrikası',icon:'👕',cost:500000,income:3500,prodTime:3600000,product:'Kumaş'},
    {id:'food',name:'Gıda Fabrikası',icon:'🍞',cost:750000,income:5000,prodTime:4*3600000,product:'Ekmek'},
    {id:'steel',name:'Çelik Fabrikası',icon:'⚙️',cost:1500000,income:10000,prodTime:6*3600000,product:'Çelik'},
    {id:'electronics',name:'Elektronik Fabrikası',icon:'💻',cost:3000000,income:20000,prodTime:12*3600000,product:'Elektronik'},
    {id:'auto',name:'Otomobil Fabrikası',icon:'🚗',cost:5000000,income:35000,prodTime:24*3600000,product:'Araç'},
  ];

  const myFact = factories.find(f => f.owner===cu.username);
  const now = Date.now();

  const buildFactory = (type) => {
    if ((cu.money||0) < type.cost) { showNotif(`❌ ₺${type.cost.toLocaleString()} gerekli!`,'error'); return; }
    if (myFact) { showNotif('❌ Zaten bir fabrikan var!','error'); return; }
    const fact = {id:Date.now(),type:type.id,name:type.name,icon:type.icon,owner:cu.username,income:type.income,prodTime:type.prodTime,product:type.product,level:1,lastProd:now,totalProd:0};
    updateUser({money:(cu.money||0)-type.cost});
    setFactories(prev=>[...prev,fact]);
    showNotif(`✅ ${type.name} kuruldu!`,'success');
  };

  const collectIncome = () => {
    if (!myFact) return;
    const elapsed = now - myFact.lastProd;
    const cycles = Math.floor(elapsed/myFact.prodTime);
    if (cycles < 1) { const rem=myFact.prodTime-(elapsed%myFact.prodTime); showNotif(`⏳ ${Math.ceil(rem/3600000)} saat daha bekle!`,'error'); return; }
    const earned = cycles * myFact.income * myFact.level;
    updateUser({money:(cu.money||0)+earned});
    setFactories(prev=>prev.map(f=>f.id===myFact.id?{...f,lastProd:now,totalProd:(f.totalProd||0)+cycles}:f));
    showNotif(`✅ ${cycles}x üretim: +₺${earned.toLocaleString()}`,'success');
  };

  const upgradeFactory = () => {
    if (!myFact) return;
    const cost = myFact.level * 250000;
    if ((cu.money||0) < cost) { showNotif(`❌ Geliştirme maliyeti: ₺${cost.toLocaleString()}`,'error'); return; }
    updateUser({money:(cu.money||0)-cost});
    setFactories(prev=>prev.map(f=>f.id===myFact.id?{...f,level:f.level+1,income:Math.floor(f.income*1.4)}:f));
    showNotif(`✅ Fabrika Lv.${myFact.level+1}'e yükseldi! Gelir artışı +%40`,'success');
  };

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#F59E0B',marginBottom:'1rem'}}>🏭 Fabrika Yönetimi</div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem'}}>
        {[{k:'my',l:'🏭 Fabrikan'},{k:'build',l:'🏗️ Kur'},{k:'all',l:'🌐 Tüm Fabrikalar'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'0.4rem 1rem',borderRadius:'2rem',border:`1px solid ${tab===t.k?'#F59E0B':'rgba(255,255,255,0.12)'}`,background:tab===t.k?'rgba(245,158,11,0.15)':'transparent',color:tab===t.k?'#F59E0B':'#999',cursor:'pointer',fontWeight:tab===t.k?700:400,fontSize:'0.83rem',fontFamily:'inherit'}}>{t.l}</button>
        ))}
      </div>

      {tab==='my'&&<div>
        {!myFact&&<div style={{textAlign:'center',padding:'2rem',color:'#555'}}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>🏭</div>
          <div style={{marginBottom:'1rem'}}>Henüz bir fabrikan yok.</div>
          <button onClick={()=>setTab('build')} style={{padding:'0.6rem 1.4rem',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'8px',color:'#F59E0B',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>🏗️ Fabrika Kur</button>
        </div>}
        {myFact&&<div>
          <div style={{background:`rgba(245,158,11,0.07)`,border:'1px solid rgba(245,158,11,0.25)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
              <div><div style={{fontWeight:700,color:'#F59E0B',fontSize:'1.1rem'}}>{myFact.icon} {myFact.name}</div><div style={{fontSize:'0.75rem',color:'#999'}}>Seviye {myFact.level} · Ürün: {myFact.product}</div></div>
              <div style={{textAlign:'right'}}><div style={{fontWeight:700,color:'#10B981',fontSize:'1.1rem'}}>₺{myFact.income.toLocaleString()}</div><div style={{fontSize:'0.65rem',color:'#666'}}>her {myFact.prodTime/3600000}s</div></div>
            </div>
            <div style={{marginBottom:'0.75rem'}}>
              <div style={{fontSize:'0.72rem',color:'#999',marginBottom:'0.25rem'}}>Sonraki üretim:</div>
              {(()=>{
                const elapsed=now-myFact.lastProd, rem=Math.max(0,myFact.prodTime-elapsed%myFact.prodTime);
                const cycles=Math.floor(elapsed/myFact.prodTime);
                return <div style={{fontWeight:700,color:cycles>0?'#10B981':'#F59E0B',fontSize:'0.9rem'}}>{cycles>0?`✅ ${cycles}x hazır! (₺${(cycles*myFact.income*myFact.level).toLocaleString()})`:`⏳ ${Math.ceil(rem/3600000)}sa ${Math.ceil((rem%3600000)/60000)}dk`}</div>;
              })()}
            </div>
            <div style={{display:'flex',gap:'0.5rem'}}>
              <button onClick={collectIncome} style={{flex:1,padding:'0.6rem',background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'8px',color:'#10B981',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>💰 Topla</button>
              <button onClick={upgradeFactory} style={{flex:1,padding:'0.6rem',background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.25)',borderRadius:'8px',color:'#A78BFA',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>⬆️ Geliştir (₺{(myFact.level*250000).toLocaleString()})</button>
            </div>
          </div>
        </div>}
      </div>}

      {tab==='build'&&<div>
        {FACTORY_TYPES.map(type=>(
          <div key={type.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
              <div><div style={{fontWeight:700,fontSize:'1rem'}}>{type.icon} {type.name}</div><div style={{fontSize:'0.75rem',color:'#999'}}>Gelir: ₺{type.income.toLocaleString()}/{type.prodTime/3600000}sa · Ürün: {type.product}</div></div>
              <div style={{color:'#F59E0B',fontWeight:700,fontSize:'0.9rem'}}>₺{type.cost.toLocaleString()}</div>
            </div>
            <button onClick={()=>buildFactory(type)} disabled={!!myFact} style={{width:'100%',padding:'0.5rem',background:myFact?'rgba(255,255,255,0.04)':'rgba(245,158,11,0.12)',border:`1px solid ${myFact?'rgba(255,255,255,0.08)':'rgba(245,158,11,0.3)'}`,borderRadius:'8px',color:myFact?'#555':'#F59E0B',cursor:myFact?'not-allowed':'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'0.85rem'}}>{myFact?'Zaten bir fabrikan var':'🏗️ Kur'}</button>
          </div>
        ))}
      </div>}

      {tab==='all'&&<div>
        {factories.length===0&&<div style={{textAlign:'center',padding:'2rem',color:'#555'}}>Henüz fabrika yok.</div>}
        {factories.map(f=>(
          <div key={f.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.6rem 0.75rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',marginBottom:'0.35rem'}}>
            <div><div style={{fontWeight:600,fontSize:'0.85rem'}}>{f.icon} {f.name}</div><div style={{fontSize:'0.7rem',color:'#999'}}>{f.owner} · Lv.{f.level}</div></div>
            <div style={{color:'#10B981',fontWeight:700,fontSize:'0.85rem'}}>₺{f.income.toLocaleString()}/saat</div>
          </div>
        ))}
      </div>}
    </div>
  );
}

