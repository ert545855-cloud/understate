// ═══════════════════════════════════════════════════════
// İSTİHBARAT / SPY SAYFASI
// ═══════════════════════════════════════════════════════
function SpyPage({ profile, setProfile, showNotif }) {
  const [spyOps, setSpyOps] = useLs('spyOps', []);
  const [spyCooldown, setSpyCooldown] = useLs('spyCooldown', {});
  const [tab, setTab] = useState('ops');
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

  const OPS = [
    {id:'recon',name:'Keşif Operasyonu',icon:'🔭',cost:10000,cd:3600000,successRate:0.85,reward:{money:25000,merit:5},desc:'Rakip bölgede keşif yap, bilgi topla.'},
    {id:'sabotage',name:'Sabotaj',icon:'💣',cost:50000,cd:6*3600000,successRate:0.6,reward:{money:100000,merit:15},desc:'Rakip altyapısına sabotaj yap.'},
    {id:'intel',name:'İstihbarat Toplama',icon:'📋',cost:25000,cd:4*3600000,successRate:0.75,reward:{money:60000,merit:10},desc:'Gizli bilgi topla.'},
    {id:'infiltrate',name:'Sızma',icon:'🕵️',cost:100000,cd:12*3600000,successRate:0.5,reward:{money:250000,merit:25},desc:'Düşman örgütüne sız.'},
    {id:'cyber',name:'Siber Saldırı',icon:'💻',cost:200000,cd:24*3600000,successRate:0.65,reward:{money:500000,merit:30},desc:'Dijital altyapıya saldır.'},
  ];

  const doOp = (op) => {
    const last = spyCooldown[cu.id+'_'+op.id]||0;
    const rem = op.cd-(now-last);
    if (rem>0) { showNotif(`⏳ ${op.name} için ${Math.ceil(rem/3600000)}sa bekle!`,'error'); return; }
    if ((cu.money||0)<op.cost) { showNotif(`❌ ₺${op.cost.toLocaleString()} gerekli!`,'error'); return; }
    const success = Math.random() < op.successRate;
    const entry = {id:Date.now(),op:op.name,icon:op.icon,result:success?'success':'fail',date:new Date().toLocaleDateString('tr-TR'),reward:success?op.reward:null};
    setSpyOps(prev=>[entry,...prev].slice(0,30));
    setSpyCooldown(prev=>({...prev,[cu.id+'_'+op.id]:now}));
    if (success) {
      updateUser({money:(cu.money||0)-op.cost+op.reward.money,meritPoints:(cu.meritPoints||0)+op.reward.merit});
      showNotif(`✅ ${op.name} başarılı! +₺${op.reward.money.toLocaleString()} +${op.reward.merit}🏅`,'success');
    } else {
      updateUser({money:(cu.money||0)-op.cost});
      showNotif(`💔 ${op.name} başarısız! Ajan ele geçirildi.`,'error');
    }
  };

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#A78BFA',marginBottom:'1rem'}}>🕵️ İstihbarat Servisi</div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem'}}>
        {[{k:'ops',l:'🕵️ Operasyonlar'},{k:'log',l:'📋 Geçmiş'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'0.4rem 1rem',borderRadius:'2rem',border:`1px solid ${tab===t.k?'#A78BFA':'rgba(255,255,255,0.12)'}`,background:tab===t.k?'rgba(167,139,250,0.15)':'transparent',color:tab===t.k?'#A78BFA':'#999',cursor:'pointer',fontWeight:tab===t.k?700:400,fontSize:'0.83rem',fontFamily:'inherit'}}>{t.l}</button>
        ))}
      </div>

      {tab==='ops'&&<div>
        {OPS.map(op=>{
          const last=spyCooldown[cu.id+'_'+op.id]||0;
          const rem=Math.max(0,op.cd-(now-last));
          const ready=rem===0;
          return (
            <div key={op.id} style={{background:'rgba(167,139,250,0.05)',border:`1px solid ${ready?'rgba(167,139,250,0.25)':'rgba(255,255,255,0.07)'}`,borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><span style={{fontSize:'1.4rem'}}>{op.icon}</span><div><div style={{fontWeight:700,fontSize:'0.9rem'}}>{op.name}</div><div style={{fontSize:'0.72rem',color:'#999'}}>{op.desc}</div></div></div>
                <div style={{textAlign:'right',flexShrink:0}}><div style={{color:'#A78BFA',fontWeight:700,fontSize:'0.85rem'}}>₺{op.cost.toLocaleString()}</div><div style={{fontSize:'0.65rem',color:'#10B981'}}>Başarı: %{Math.round(op.successRate*100)}</div></div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.4rem'}}>
                <div style={{fontSize:'0.72rem',color:'#FFD700'}}>Ödül: ₺{op.reward.money.toLocaleString()} +{op.reward.merit}🏅</div>
                {!ready&&<div style={{fontSize:'0.72rem',color:'#F59E0B'}}>⏳ {Math.ceil(rem/3600000)}sa</div>}
              </div>
              <button onClick={()=>doOp(op)} style={{width:'100%',padding:'0.5rem',background:ready?'rgba(167,139,250,0.12)':'rgba(255,255,255,0.03)',border:`1px solid ${ready?'rgba(167,139,250,0.35)':'rgba(255,255,255,0.07)'}`,borderRadius:'8px',color:ready?'#A78BFA':'#555',cursor:ready?'pointer':'not-allowed',fontWeight:700,fontFamily:'inherit',fontSize:'0.85rem'}}>🕵️ {ready?'Operasyonu Başlat':'Bekleniyor'}</button>
            </div>
          );
        })}
      </div>}

      {tab==='log'&&<div>
        {spyOps.filter(o=>(spyOps.find(x=>x.id===o.id)?.result)).length===0&&<div style={{textAlign:'center',padding:'2rem',color:'#555'}}>Henüz operasyon yok.</div>}
        {spyOps.map(op=>(
          <div key={op.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.6rem 0.75rem',background:'rgba(255,255,255,0.03)',border:`1px solid ${op.result==='success'?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}`,borderRadius:'8px',marginBottom:'0.35rem'}}>
            <div><span style={{fontSize:'1rem',marginRight:'0.5rem'}}>{op.icon}</span><span style={{fontWeight:600,fontSize:'0.85rem'}}>{op.op}</span><span style={{fontSize:'0.65rem',color:'#666',marginLeft:'0.4rem'}}>{op.date}</span></div>
            <div style={{color:op.result==='success'?'#10B981':'#EF4444',fontWeight:700,fontSize:'0.8rem'}}>{op.result==='success'?`✅ +₺${op.reward?.money?.toLocaleString()}`:'💔 Başarısız'}</div>
          </div>
        ))}
      </div>}
    </div>
  );
}

