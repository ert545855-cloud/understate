// ═══════════════════════════════════════════════════════
// İSTİHBARAT / SPY SAYFASI — server-side persist
// ═══════════════════════════════════════════════════════
function SpyPage({ profile, setProfile, showNotif }) {
  const [spyOps, setSpyOps] = useLs('spyOps', []);
  const [spyCooldown, setSpyCooldown] = useLs('spyCooldown', {});
  const [tab, setTab] = useState('ops');
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};
  const now = Date.now();

  const OPS = [
    {id:'recon',     name:'Keşif Operasyonu',   icon:'🔭', cost:10000,  cd:3600000,    successRate:0.85, reward:{money:25000,  merit:5},  desc:'Rakip bölgede keşif yap, bilgi topla.'},
    {id:'sabotage',  name:'Sabotaj',             icon:'💣', cost:50000,  cd:6*3600000,  successRate:0.60, reward:{money:100000, merit:15}, desc:'Rakip altyapısına sabotaj yap.'},
    {id:'intel',     name:'İstihbarat Toplama',  icon:'📋', cost:25000,  cd:4*3600000,  successRate:0.75, reward:{money:60000,  merit:10}, desc:'Gizli bilgi topla.'},
    {id:'infiltrate',name:'Sızma',               icon:'🕵️',cost:100000, cd:12*3600000, successRate:0.50, reward:{money:250000, merit:25}, desc:'Düşman örgütüne sız.'},
    {id:'cyber',     name:'Siber Saldırı',       icon:'💻', cost:200000, cd:24*3600000, successRate:0.65, reward:{money:500000, merit:30}, desc:'Dijital altyapıya saldır.'},
  ];

  // Server'dan gelen spy sonuçlarını dinle
  useEffect(() => {
    const sock = window._socket;
    if (!sock) return;
    const onResult = (data) => {
      if (!data.ok) { showNotif(data.msg || 'Hata', 'error'); return; }
      const op = OPS.find(o => o.id === data.opId);
      const entry = { id:Date.now(), op:op?.name||data.opId, icon:op?.icon||'🕵️', result:data.success?'success':'fail', date:new Date().toLocaleDateString('tr-TR'), reward:data.success?{money:data.moneyDelta,merit:data.merit}:null };
      setSpyOps(prev => [entry, ...prev].slice(0, 30));
      setProfile(prev => ({ ...prev, money:data.newMoney, meritPoints:data.newMerits, merit_points:data.newMerits }));
      localStorage.setItem('rep_userProfile', JSON.stringify({ ...cu, money:data.newMoney, meritPoints:data.newMerits }));
      if (data.success) showNotif(`✅ ${op?.name||'Operasyon'} başarılı! +₺${data.moneyDelta?.toLocaleString()} +${data.merit}🏅`, 'success');
      else              showNotif(`💔 ${op?.name||'Operasyon'} başarısız! Ajan ele geçirildi.`, 'error');
    };
    sock.on('spy:result', onResult);
    return () => sock.off('spy:result', onResult);
  }, [cu.money, cu.meritPoints]);

  const doOp = (op) => {
    const uid = cu.id || cu.uid;
    const last = spyCooldown[uid+'_'+op.id] || 0;
    const rem  = op.cd - (now - last);
    if (rem > 0) { showNotif(`⏳ ${op.name} için ${Math.ceil(rem/3600000)}sa bekle!`, 'error'); return; }
    if ((cu.money||0) < op.cost) { showNotif(`❌ ₺${op.cost.toLocaleString()} gerekli!`, 'error'); return; }
    const sock = window._socket;
    if (!sock?.connected) { showNotif('❌ Sunucuya bağlı değilsiniz', 'error'); return; }
    setSpyCooldown(prev => ({ ...prev, [uid+'_'+op.id]: now }));
    sock.emit('spy:op', { opId: op.id });
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
          const uid = cu.id||cu.uid;
          const last = spyCooldown[uid+'_'+op.id]||0;
          const rem  = Math.max(0,op.cd-(now-last));
          const ready = rem===0;
          return (
            <div key={op.id} style={{background:'rgba(167,139,250,0.05)',border:`1px solid ${ready?'rgba(167,139,250,0.25)':'rgba(255,255,255,0.07)'}`,borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.4rem'}}>
                <div>
                  <span style={{fontSize:'1.2rem',marginRight:'0.4rem'}}>{op.icon}</span>
                  <span style={{fontWeight:700,fontSize:'0.9rem'}}>{op.name}</span>
                </div>
                <div style={{textAlign:'right',fontSize:'0.72rem',color:'#888'}}>
                  <div>Maliyet: ₺{op.cost.toLocaleString()}</div>
                  <div style={{color:'#10B981'}}>Ödül: ₺{op.reward.money.toLocaleString()}</div>
                </div>
              </div>
              <div style={{fontSize:'0.75rem',color:'#888',marginBottom:'0.5rem'}}>{op.desc}</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:'0.7rem',color:'#A78BFA'}}>Başarı: %{Math.round(op.successRate*100)} · +{op.reward.merit}🏅</div>
                {!ready && <span style={{fontSize:'0.68rem',color:'#F59E0B'}}>⏳ {rem>3600000?`${Math.ceil(rem/3600000)}sa`:`${Math.ceil(rem/60000)}dk`}</span>}
              </div>
              <button onClick={()=>doOp(op)} disabled={!ready||(cu.money||0)<op.cost} style={{width:'100%',marginTop:'0.5rem',padding:'0.45rem',borderRadius:'8px',border:'none',background:ready&&(cu.money||0)>=op.cost?'rgba(167,139,250,0.2)':'rgba(255,255,255,0.04)',color:ready&&(cu.money||0)>=op.cost?'#A78BFA':'#555',cursor:ready&&(cu.money||0)>=op.cost?'pointer':'not-allowed',fontWeight:700,fontSize:'0.8rem',fontFamily:'inherit'}}>
                {ready?`${op.icon} Operasyonu Başlat`:'Bekleniyor…'}
              </button>
            </div>
          );
        })}
      </div>}

      {tab==='log'&&<div>
        {spyOps.length===0&&<div style={{textAlign:'center',color:'#555',padding:'2rem'}}>Henüz operasyon yok.</div>}
        {spyOps.map(op=>(
          <div key={op.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.6rem',background:'rgba(255,255,255,0.03)',borderRadius:'8px',marginBottom:'0.4rem',border:`1px solid ${op.result==='success'?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.15)'}`}}>
            <div>
              <div style={{fontWeight:600,fontSize:'0.85rem'}}>{op.icon} {op.op}</div>
              <div style={{fontSize:'0.68rem',color:'#888'}}>{op.date}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:700,color:op.result==='success'?'#10B981':'#EF4444',fontSize:'0.82rem'}}>{op.result==='success'?'✅ Başarılı':'💔 Başarısız'}</div>
              {op.reward&&<div style={{fontSize:'0.68rem',color:'#10B981'}}>+₺{op.reward.money?.toLocaleString()}</div>}
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
