// ═══════════════════════════════════════════════════════
// PVP DÖVÜŞ SAYFASI — server-side doğrulama + DB persist
// ═══════════════════════════════════════════════════════
function PvpPage({ profile, setProfile, showNotif }) {
  const [battles, setBattles] = useLs('pvpBattles', []);
  const [pvpCooldown, setPvpCooldown] = useLs('pvpCooldown', {});
  const [targets, setTargets] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};
  const now = Date.now();

  // Leaderboard'dan gerçek oyuncuları çek
  useEffect(() => {
    const load = async () => {
      setLoadingTargets(true);
      try {
        const r = await fetch('/api/leaderboard/all');
        const d = await r.json();
        if (d.success && d.leaderboard) {
          const all = d.leaderboard.level || d.leaderboard.score || [];
          setTargets(all.filter(u => u.username !== cu.username).slice(0, 20));
        }
      } catch(e) {
        // Fallback: online players from socket
        const sock = window._socket;
        if (sock) {
          sock.emit('requestOnlinePlayers');
          sock.once('onlinePlayers', (list) => {
            setTargets((list||[]).filter(u => u.username !== cu.username).slice(0,20));
          });
        }
      } finally {
        setLoadingTargets(false);
      }
    };
    load();
  }, [cu.username]);

  // Socket: server'dan gelen PvP sonuçlarını dinle
  useEffect(() => {
    const sock = window._socket;
    if (!sock) return;
    const onResult = (data) => {
      if (!data.ok) { showNotif(data.msg || 'Hata', 'error'); return; }
      const { won, stolen, hpLost, targetUsername, newMoney, newHp, newMerits } = data;
      const battle = { id:Date.now(), attacker:cu.username, defender:targetUsername, result:won?'win':'loss', stolen, date:new Date().toLocaleDateString('tr-TR') };
      setBattles(prev => [battle, ...prev].slice(0, 50));
      setProfile(prev => ({ ...prev, money:newMoney, hp:newHp, meritPoints:newMerits, merit_points:newMerits }));
      localStorage.setItem('rep_userProfile', JSON.stringify({ ...cu, money:newMoney, hp:newHp, meritPoints:newMerits }));
      try { const today=new Date().toDateString(); const dk=`day_${today}`; const s=JSON.parse(localStorage.getItem('rep_dailyTaskState')||'{}'); s[dk]={...(s[dk]||{}),dailyPvpCount:((s[dk]?.dailyPvpCount)||0)+1}; localStorage.setItem('rep_dailyTaskState',JSON.stringify(s)); } catch(e){}
      if (won) {
        showNotif(`⚔️ Saldırı başarılı! +₺${stolen.toLocaleString()} +10🏅 -${hpLost}❤️`, 'success');
        if (stolen > 50000) window._pushGameEvent?.('pvp_galibiyet', `⚔️ ${cu.username} → ${targetUsername} kazandı!`, `₺${stolen.toLocaleString()} ganimet.`, '⚔️', 'savaş');
      } else {
        showNotif(`💔 Saldırı başarısız! -${hpLost}❤️`, 'error');
      }
    };
    const onAttacked = (data) => {
      showNotif(`🛡️ ${data.attacker} sana saldırdı! ${data.won ? `₺${data.stolen?.toLocaleString()} çalındı!` : 'Saldırıyı püskürttün!'}`, data.won ? 'error' : 'info');
      if (data.won) {
        setProfile(prev => ({ ...prev, money: data.newMoney }));
        localStorage.setItem('rep_userProfile', JSON.stringify({ ...cu, money: data.newMoney }));
      }
    };
    sock.on('pvp:result', onResult);
    sock.on('pvp:attacked', onAttacked);
    return () => { sock.off('pvp:result', onResult); sock.off('pvp:attacked', onAttacked); };
  }, [cu.username, cu.money, cu.hp]);

  const attack = (target) => {
    const lastBattle = pvpCooldown[cu.id || cu.uid] || 0;
    if (now - lastBattle < 5 * 60 * 1000) { showNotif('⏳ PvP cooldown: 5 dakika!', 'error'); return; }
    if ((cu.hp || 100) < 20) { showNotif('❌ Canın çok az! İyileş önce.', 'error'); return; }
    const sock = window._socket;
    if (!sock?.connected) { showNotif('❌ Sunucuya bağlı değilsiniz', 'error'); return; }
    setPvpCooldown(prev => ({ ...prev, [cu.id || cu.uid]: now }));
    // Server-side attack — targetId is the leaderboard user id
    sock.emit('pvp:attack', { targetId: target.id || target.userId || target.username, targetUsername: target.username });
  };

  const myBattles = battles.filter(b => b.attacker === cu.username || b.defender === cu.username);
  const wins = myBattles.filter(b => b.attacker === cu.username && b.result === 'win').length;

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
        <div style={{fontWeight:700,color:'#aaa',marginBottom:'0.75rem',fontSize:'0.9rem'}}>🎯 Saldırı Hedefleri {loadingTargets && <span style={{fontSize:'0.7rem',color:'#666'}}>yükleniyor…</span>}</div>
        {targets.length===0 && !loadingTargets && <div style={{color:'#555',textAlign:'center',padding:'1rem'}}>Başka oyuncu bulunamadı.</div>}
        {targets.slice(0,15).map(t=>(
          <div key={t.id||t.username} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0.6rem',background:'rgba(255,255,255,0.03)',borderRadius:'8px',marginBottom:'0.3rem',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div>
              <div style={{fontWeight:600,fontSize:'0.85rem'}}>{t.username}</div>
              <div style={{fontSize:'0.7rem',color:'#999'}}>Lv.{t.level||1} · ₺{(((t.money||0))/1000).toFixed(0)}K</div>
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
