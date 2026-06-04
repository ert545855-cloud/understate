// ═══════════════════════════════════════════════════════
// PVP DÖVÜŞ SAYFASI
// ═══════════════════════════════════════════════════════
function PvpPage({ profile, setProfile, showNotif }) {
  const [battles, setBattles] = useLs('pvpBattles', []);
  const [pvpCooldown, setPvpCooldown] = useLs('pvpCooldown', {});
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

  const allUsers = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch{return [];} })();
  const targets = allUsers.filter(u => u.id!==cu.id && !u.banned);

  const attack = (target) => {
    const lastBattle = pvpCooldown[cu.id]||0;
    if (now-lastBattle < 5*60*1000) { showNotif('⏳ PvP cooldown: 5 dakika!','error'); return; }
    if ((cu.hp||100) < 20) { showNotif('❌ Canın çok az! İyileş önce.','error'); return; }
    const myStr = (cu.level||1)*10 + (cu.meritPoints||0)/10;
    const oppStr = (target.level||1)*10 + (target.meritPoints||0)/10;
    const won = Math.random()*100 < Math.min(80,Math.max(20,(myStr/(myStr+oppStr))*100));
    const stolen = won ? Math.floor(Math.min(target.money||0, (target.money||0)*0.05)) : 0;
    const hpLost = won ? 5 : 15;
    const battle = {id:Date.now(),attacker:cu.username,defender:target.username,result:won?'win':'loss',stolen,date:new Date().toLocaleDateString('tr-TR')};
    setBattles(prev=>[battle,...prev].slice(0,50));
    setPvpCooldown(prev=>({...prev,[cu.id]:now}));
    try { const today=new Date().toDateString(); const dk=`day_${today}`; const s=JSON.parse(localStorage.getItem('rep_dailyTaskState')||'{}'); s[dk]={...(s[dk]||{}),dailyPvpCount:((s[dk]?.dailyPvpCount)||0)+1}; localStorage.setItem('rep_dailyTaskState',JSON.stringify(s)); } catch(e){}
    if (won) {
      updateUser({money:(cu.money||0)+stolen, hp:Math.max(0,(cu.hp||100)-hpLost), meritPoints:(cu.meritPoints||0)+10});
      const newUsers = allUsers.map(u => u.id===target.id ? {...u,money:Math.max(0,(u.money||0)-stolen)} : u);
      localStorage.setItem('rep_users', JSON.stringify(newUsers));
      showNotif(`⚔️ Saldırı başarılı! +₺${stolen.toLocaleString()} +10🏅 -${hpLost}❤️`,'success');
      try { if (stolen > 50000) window._pushGameEvent?.('pvp_galibiyet', `⚔️ ${cu.username} → ${target.username} savaşı kazandı!`, `₺${stolen.toLocaleString()} ganimet alındı.`, '⚔️', 'savaş'); } catch(e){}
    } else {
      updateUser({hp:Math.max(0,(cu.hp||100)-hpLost)});
      showNotif(`💔 Saldırı başarısız! -${hpLost}❤️`,'error');
    }
  };

  const myBattles = battles.filter(b=>b.attacker===cu.username||b.defender===cu.username);
  const wins = myBattles.filter(b=>b.attacker===cu.username&&b.result==='win').length;

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#EF4444',marginBottom:'1rem'}}>⚔️ PvP Savaş Alanı</div>
      <div style={{background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem'}}>
          {[{l:'Can',v:`${cu.hp||100}/100`,c:(cu.hp||100)>50?'#10B981':(cu.hp||100)>20?'#F59E0B':'#EF4444'},{l:'Galibiyet',v:wins,c:'#10B981'},{l:'Toplam Savaş',v:myBattles.length,c:'#60A5FA'}].map(s=>(
            <div key={s.l} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.5rem',textAlign:'center'}}><div style={{fontWeight:700,color:s.c,fontSize:'0.95rem'}}>{s.v}</div><div style={{fontSize:'0.62rem',color:'#666'}}>{s.l}</div></div>
          ))}
        </div>
      </div>
      <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
        <div style={{fontWeight:700,color:'#aaa',marginBottom:'0.75rem',fontSize:'0.9rem'}}>🎯 Saldırı Hedefleri</div>
        {targets.length===0&&<div style={{color:'#555',textAlign:'center',padding:'1rem'}}>Başka oyuncu bulunamadı.</div>}
        {targets.slice(0,15).map(t=>(
          <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0.6rem',background:'rgba(255,255,255,0.03)',borderRadius:'8px',marginBottom:'0.3rem',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div>
              <div style={{fontWeight:600,fontSize:'0.85rem'}}>{t.username}</div>
              <div style={{fontSize:'0.7rem',color:'#999'}}>Lv.{t.level||1} · ❤️{t.hp||100} · ₺{((t.money||0)/1000).toFixed(0)}K</div>
            </div>
            <button onClick={()=>attack(t)} style={{padding:'0.35rem 0.8rem',background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'6px',color:'#EF4444',cursor:'pointer',fontWeight:700,fontSize:'0.78rem',fontFamily:'inherit'}}>⚔️ Saldır</button>
          </div>
        ))}
      </div>
      {myBattles.length>0&&<div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
        <div style={{fontWeight:700,color:'#aaa',marginBottom:'0.5rem',fontSize:'0.9rem'}}>📋 Savaş Geçmişi</div>
        {myBattles.slice(0,10).map(b=>(
          <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.4rem 0.5rem',borderRadius:'6px',marginBottom:'0.25rem',background:'rgba(255,255,255,0.03)',border:`1px solid ${b.result==='win'&&b.attacker===cu.username?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.15)'}`}}>
            <div style={{fontSize:'0.8rem'}}>{b.attacker===cu.username?'⚔️':'🛡️'} <strong>{b.attacker===cu.username?b.defender:b.attacker}</strong></div>
            <div style={{fontSize:'0.78rem',fontWeight:700,color:(b.result==='win'&&b.attacker===cu.username)?'#10B981':'#EF4444'}}>{(b.result==='win'&&b.attacker===cu.username)?`+₺${(b.stolen||0).toLocaleString()}`:'💔'}</div>
          </div>
        ))}
      </div>}
    </div>
  );
}

