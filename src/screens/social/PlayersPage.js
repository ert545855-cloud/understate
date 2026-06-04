// ═══════════════════════════════════════════════════════
// OYUNCULAR SAYFASI
// ═══════════════════════════════════════════════════════
function PlayersPage({ profile, onNavigate, onlinePlayers = [] }) {
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [tab, setTab] = useState('all');
  const [cityFilterActive, setCityFilterActive] = useState(false);
  const [parties] = useLs('parties', []);
  const [gangs] = useLs('gangs', []);
  const [lbSub, setLbSub] = useState('money');
  const socketOnlineCnt = useOnlineCount();
  const onlineCnt = onlinePlayers.length || socketOnlineCnt;
  const onlineIds = new Set(onlinePlayers.map(p => p.userId||p.id||p.username));
  const [allUsers] = useState(() => {
    try { const v=localStorage.getItem('rep_users'); return v?JSON.parse(v):[]; } catch{return [];}
  });

  const me = profile;
  const selfEntry = me ? {
    id: me.uid||me.id||'me', username:me.username, city:me.city||'?',
    level:me.level||1, xp:me.xp||0, gender:me.gender||'male',
    premium:!!me.premium, money:me.money||0, email:me.email, role:me.role
  } : null;
  const combined = selfEntry
    ? [selfEntry, ...allUsers.filter(u=>u.id!==selfEntry.id && u.username!==selfEntry.username)]
    : allUsers;

  const filtered = combined.filter(p => !search ||
    p.username?.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase())
  );
  const topByMoney = [...combined].sort((a,b)=>(b.money||0)-(a.money||0));
  const topByXp = [...combined].sort((a,b)=>(b.xp||0)-(a.xp||0));
  const topByLevel = [...combined].sort((a,b)=>(b.level||1)-(a.level||1));

  const leaderboardData = lbSub==='money'?topByMoney:lbSub==='xp'?topByXp:topByLevel;
  const lbIcon = lbSub==='money'?'💰':lbSub==='xp'?'📊':'⭐';

  const rankIcon = i => ['🥇','🥈','🥉'][i] || `${i+1}.`;

  return (
    <div style={{padding:'0.7rem'}}>
      {/* Arama */}
      <div style={{display:'flex',alignItems:'center',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'0 0.85rem',marginBottom:'0.75rem'}}>
        <span style={{color:'#5A7089',marginRight:'0.5rem'}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Oyuncu / şehir ara..."
          style={{flex:1,background:'none',border:'none',outline:'none',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',padding:'0.6rem 0'}} />
      </div>

      {/* Tab */}
      <div style={{display:'flex',gap:'4px',marginBottom:'0.75rem'}}>
        {[['all',`👥 Tümü (${combined.length})`],['online',`🟢 Çevrimiçi (${onlinePlayers.length||onlineCnt})`],['top','🏆 Liderlik']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:'0.38rem 0.5rem',borderRadius:'8px',border:`1px solid ${tab===v?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.07)'}`,background:tab===v?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.03)',color:tab===v?'#60A5FA':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.7rem',cursor:'pointer',whiteSpace:'nowrap'}}>
            {l}
          </button>
        ))}
      </div>

      {/* Online badge */}
      <div style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:'20px',padding:'4px 12px',marginBottom:'0.75rem',fontSize:'0.72rem',fontWeight:700,color:'#10B981'}}>
        <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#10B981',animation:'pulse 2s infinite'}} />
        {onlinePlayers.length||onlineCnt} çevrimiçi oyuncu
      </div>

      {/* Liderlik alt tablar */}
      {tab==='top' && (
        <div style={{display:'flex',gap:'4px',marginBottom:'0.75rem'}}>
          {[['money','💰 En Zengin'],['xp','📊 En Çok XP'],['level','⭐ En Yüksek Seviye']].map(([v,l])=>(
            <button key={v} onClick={()=>setLbSub(v)} style={{flex:1,padding:'0.3rem 0.4rem',borderRadius:'7px',border:`1px solid ${lbSub===v?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.07)'}`,background:lbSub===v?'rgba(245,158,11,0.1)':'rgba(255,255,255,0.03)',color:lbSub===v?'#F59E0B':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.65rem',cursor:'pointer'}}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Çevrimiçi tab — şehir filtresi */}
      {tab==='online' && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.5rem'}}>
          <span style={{fontSize:'0.68rem',color:'#5A7089'}}>
            {cityFilterActive && profile?.city ? `📍 ${profile.city} şehri` : 'Tüm şehirler'}
          </span>
          <button onClick={()=>setCityFilterActive(v=>!v)}
            style={{background:cityFilterActive?'rgba(59,130,246,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${cityFilterActive?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.1)'}`,borderRadius:'8px',padding:'3px 10px',color:cityFilterActive?'#60A5FA':'#5A7089',fontSize:'0.65rem',fontWeight:700,cursor:'pointer'}}>
            {cityFilterActive?'🌍 Tümü Göster':'📍 Şehrimde'}
          </button>
        </div>
      )}
      {tab==='online' && (() => {
        const filtered = cityFilterActive && profile?.city
          ? onlinePlayers.filter(op => (op.city||'') === profile.city)
          : onlinePlayers;
        if (filtered.length === 0) return React.createElement('div',{style:{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}},
          React.createElement('div',{style:{fontSize:'2rem',marginBottom:'0.5rem'}},'👤'),
          cityFilterActive ? `${profile?.city||''} şehrinde başka çevrimiçi oyuncu yok` : 'Şu an başka çevrimiçi oyuncu yok');
        return null;
      })()}
      {tab==='online' && (cityFilterActive && profile?.city ? onlinePlayers.filter(op=>(op.city||'')===profile.city) : onlinePlayers).map((op,i) => {
        const pData = combined.find(u => u.id===op.userId||u.username===op.username) || {username:op.username, city:op.city||'?', level:op.level||1, xp:0};
        return (
          <button key={op.userId||op.username||i} onClick={()=>setSelectedPlayer(pData)}
            style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.18)',borderRadius:'12px',width:'100%',marginBottom:'0.4rem',cursor:'pointer',WebkitTapHighlightColor:'transparent',transition:'all 0.15s',textAlign:'left'}}>
            <div style={{position:'relative',flexShrink:0}}>
              <Avatar profile={pData} size={42} />
              <div style={{position:'absolute',bottom:0,right:0,width:'10px',height:'10px',borderRadius:'50%',background:'#10B981',border:'2px solid #0F172A'}} />
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.35rem'}}>
                <span style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{op.username}</span>
                <span style={{background:'rgba(16,185,129,0.15)',color:'#10B981',fontSize:'0.5rem',fontWeight:800,padding:'1px 5px',borderRadius:'8px'}}>CANLI</span>
                {pData.premium && <span style={{background:'linear-gradient(90deg,#A78BFA,#7C3AED)',color:'#fff',fontSize:'0.5rem',fontWeight:800,padding:'1px 5px',borderRadius:'8px'}}>VIP</span>}
              </div>
              <div style={{fontSize:'0.68rem',color:'#5A7089'}}>{op.city||'?'} • Lv.{op.level||1}</div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontSize:'0.72rem',color:'#10B981',fontWeight:700}}>{fmtM(op.money||0)}</div>
              <span style={{color:'#5A7089',fontSize:'0.85rem'}}>›</span>
            </div>
          </button>
        );
      })}

      {/* Oyuncu listesi (all/top) */}
      {tab!=='online' && (tab==='top'?leaderboardData:filtered).map((p,i) => {
        const isOnline = onlineIds.has(p.id)||onlineIds.has(p.username);
        const lastOnlineTs = p.lastOnline || p.lastSeen || p.registeredAt || 0;
        const lastOnlineStr = (() => {
          if (!lastOnlineTs) return '';
          const diff = Date.now() - lastOnlineTs;
          if (diff < 60000)      return 'az önce';
          if (diff < 3600000)    return `${Math.floor(diff/60000)} dk önce`;
          if (diff < 86400000)   return `${Math.floor(diff/3600000)} sa önce`;
          if (diff < 604800000)  return `${Math.floor(diff/86400000)} gün önce`;
          return `${Math.floor(diff/604800000)} hafta önce`;
        })();
        return (
        <button key={p.id||p.username} onClick={()=>setSelectedPlayer(p)}
          style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background: p.username===profile?.username?'rgba(59,130,246,0.08)':'rgba(15,28,48,0.85)',border:`1px solid ${p.username===profile?.username?'rgba(59,130,246,0.2)':isOnline?'rgba(16,185,129,0.18)':'rgba(255,255,255,0.05)'}`,borderRadius:'12px',width:'100%',marginBottom:'0.4rem',cursor:'pointer',WebkitTapHighlightColor:'transparent',transition:'all 0.15s',textAlign:'left'}}>
          {tab==='top' && (
            <div style={{width:'28px',textAlign:'center',fontSize:'1rem',flexShrink:0}}>{rankIcon(i)}</div>
          )}
          <div style={{position:'relative',flexShrink:0}}>
            <Avatar profile={p} size={42} />
            {isOnline
              ? <div style={{position:'absolute',bottom:0,right:0,width:'10px',height:'10px',borderRadius:'50%',background:'#10B981',border:'2px solid #0F172A'}} />
              : <div style={{position:'absolute',bottom:0,right:0,width:'10px',height:'10px',borderRadius:'50%',background:'#374151',border:'2px solid #0F172A'}} />
            }
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.35rem',flexWrap:'wrap'}}>
              <span style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{p.username}</span>
              {isOnline
                ? <span style={{background:'rgba(16,185,129,0.15)',color:'#10B981',fontSize:'0.5rem',fontWeight:800,padding:'1px 5px',borderRadius:'8px'}}>● ÇEVRİMİÇİ</span>
                : <span style={{background:'rgba(255,255,255,0.05)',color:'#5A7089',fontSize:'0.5rem',fontWeight:700,padding:'1px 5px',borderRadius:'8px'}}>ÇEVRİMDIŞI</span>
              }
              {p.premium && <span style={{background:'linear-gradient(90deg,#A78BFA,#7C3AED)',color:'#fff',fontSize:'0.5rem',fontWeight:800,padding:'1px 5px',borderRadius:'8px'}}>VIP</span>}
              {p.role==='admin' && <span style={{background:'rgba(245,158,11,0.15)',color:'#F59E0B',fontSize:'0.5rem',fontWeight:800,padding:'1px 5px',borderRadius:'8px'}}>ADMIN</span>}
              {p.username===profile?.username && <span style={{background:'rgba(59,130,246,0.15)',color:'#60A5FA',fontSize:'0.5rem',fontWeight:800,padding:'1px 5px',borderRadius:'8px'}}>SEN</span>}
            </div>
            <div style={{fontSize:'0.68rem',color:'#5A7089'}}>
              {p.city||'?'} • Lv.{p.level||1} • {getLevelInfo(p.xp||0).title}
              {!isOnline && lastOnlineStr && <span style={{color:'#374151',marginLeft:'0.3rem'}}>• {lastOnlineStr}</span>}
            </div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            {tab==='top' ? (
              <div style={{fontSize:'0.78rem',color:lbIcon==='💰'?'#10B981':lbIcon==='📊'?'#3B82F6':'#F59E0B',fontWeight:800}}>
                {lbSub==='money'?fmtM(p.money||0):lbSub==='xp'?`${fmt(p.xp||0)} XP`:`Lv.${p.level||1}`}
              </div>
            ) : (
              <div style={{fontSize:'0.72rem',color:'#10B981',fontWeight:700}}>{fmtM(p.money||0)}</div>
            )}
            <span style={{color:'#5A7089',fontSize:'0.85rem'}}>›</span>
          </div>
        </button>
        );
      })}
      {tab!=='online' && (tab==='top'?leaderboardData:filtered).length===0 && (
        <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>
          {search ? 'Oyuncu bulunamadı' : 'Henüz kayıtlı oyuncu yok'}
        </div>
      )}

      {selectedPlayer && (() => {
        const sp = selectedPlayer;
        const spLvl = getLevelInfo(sp.xp||0);
        const spParty = parties.find(p => p.leaderId===sp.id || p.leaderId===sp.uid || (p.members||[]).includes(sp.id) || (p.members||[]).includes(sp.uid));
        const spGang  = gangs.find(g => g.leaderId===sp.id || g.leaderId===sp.uid || (g.members||[]).includes(sp.id) || (g.members||[]).includes(sp.uid));
        const isMe = sp.username === profile?.username;
        return (
          <Modal title={`👤 ${sp.username}`} onClose={()=>setSelectedPlayer(null)}>
            {/* Banner & Avatar */}
            {sp.bannerUrl && <div style={{height:'80px',borderRadius:'12px',overflow:'hidden',marginBottom:'-30px',background:`url(${sp.bannerUrl}) center/cover no-repeat`,position:'relative'}}><div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 40%,rgba(15,23,42,0.9))'}} /></div>}
            <div style={{textAlign:'center',marginBottom:'0.85rem',paddingTop: sp.bannerUrl ? '0.4rem' : '0'}}>
              <div style={{display:'inline-block',borderRadius:'50%',border:'3px solid #1E3A5F',background:'#0F172A'}}>
                <Avatar profile={sp} size={68} />
              </div>
              <div style={{fontWeight:800,fontSize:'1.05rem',color:'#E8EDF2',marginTop:'0.4rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem'}}>
                {sp.username}
                {sp.premium && <span style={{background:'linear-gradient(90deg,#A78BFA,#7C3AED)',color:'#fff',fontSize:'0.5rem',fontWeight:800,padding:'2px 6px',borderRadius:'8px'}}>VIP</span>}
                {sp.role==='admin' && <span style={{background:'rgba(245,158,11,0.15)',color:'#F59E0B',fontSize:'0.5rem',fontWeight:800,padding:'2px 6px',borderRadius:'8px'}}>ADMIN</span>}
                {isMe && <span style={{background:'rgba(59,130,246,0.15)',color:'#60A5FA',fontSize:'0.5rem',fontWeight:800,padding:'2px 6px',borderRadius:'8px'}}>SEN</span>}
              </div>
              <div style={{fontSize:'0.72rem',color:'#F59E0B',fontWeight:700,marginTop:'0.15rem'}}>{spLvl.title}</div>
              <div style={{fontSize:'0.68rem',color:'#5A7089',marginTop:'0.08rem'}}>{sp.city||'?'} • Lv.{spLvl.lvl}</div>
            </div>

            {/* Parti / Çete */}
            {(spParty||spGang) && (
              <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.75rem',justifyContent:'center'}}>
                {spParty && <div style={{background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:'10px',padding:'0.3rem 0.75rem',fontSize:'0.7rem',color:'#60A5FA',fontWeight:700}}>🏛️ {spParty.name}</div>}
                {spGang  && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'10px',padding:'0.3rem 0.75rem',fontSize:'0.7rem',color:'#FCA5A5',fontWeight:700}}>💀 {spGang.name}</div>}
              </div>
            )}

            {/* İstatistikler */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.45rem',marginBottom:'0.75rem'}}>
              {[
                ['💰','Para',fmtM(sp.money||0),'#10B981'],
                ['🪙','UnderCoin',fmt(sp.underCoin||0)+' UC','#A78BFA'],
                ['📊','XP',fmt(sp.xp||0)+' XP','#3B82F6'],
                ['🏙️','Şehir',sp.city||'?','#94A3B8'],
              ].map(([ic,lb,v,clr])=>(
                <div key={lb} style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'0.6rem',textAlign:'center'}}>
                  <div style={{fontSize:'0.58rem',color:'#5A7089',textTransform:'uppercase',marginBottom:'0.2rem'}}>{ic} {lb}</div>
                  <div style={{fontWeight:700,color:clr,fontSize:'0.88rem'}}>{v}</div>
                </div>
              ))}
            </div>

            {/* XP ilerleme çubuğu */}
            <div style={{marginBottom:'0.75rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.6rem',color:'#5A7089',marginBottom:'4px'}}>
                <span>Lv.{spLvl.lvl} — {spLvl.title}</span>
                <span>{spLvl.pct}%</span>
              </div>
              <div style={{height:'5px',background:'rgba(255,255,255,0.06)',borderRadius:'3px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${spLvl.pct}%`,background:'linear-gradient(90deg,#3B82F6,#8B5CF6)',borderRadius:'3px',transition:'width 0.5s'}} />
              </div>
            </div>

            {/* Cinsiyet & Kayıt */}
            {sp.registeredAt && (
              <div style={{textAlign:'center',fontSize:'0.63rem',color:'#5A7089',marginBottom:'0.6rem'}}>
                Üye: {new Date(sp.registeredAt).toLocaleDateString('tr-TR')}
              </div>
            )}
            {!isMe && onNavigate && (
              <button onClick={()=>{ setSelectedPlayer(null); onNavigate('dm'); }} style={{width:'100%',padding:'0.7rem',background:'linear-gradient(135deg,rgba(59,130,246,0.18),rgba(99,102,241,0.12))',border:'1px solid rgba(59,130,246,0.35)',borderRadius:'12px',color:'#60A5FA',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.88rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem'}}>
                💬 Mesaj Gönder
              </button>
            )}
          </Modal>
        );
      })()}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

