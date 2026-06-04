// ═══════════════════════════════════════════════════════
// SIRALAMA (LEADERBOARD) SAYFASI — sunucu taraflı
// ═══════════════════════════════════════════════════════
function LeaderboardPage({ profile, onNavigate }) {
  const { dark } = useTheme();
  const cu = profile || {};
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const TABS = [
    {id:'level',  label:'📈 Seviye',  apiKey:'level'},
    {id:'money',  label:'💰 Servet',  apiKey:'money'},
    {id:'score',  label:'⭐ Skor',    apiKey:'score'},
    {id:'gang',   label:'💀 Çete',    apiKey:'gang'},
  ];
  const [tab, setTab] = React.useState('level');
  const [data, setData] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [lastFetch, setLastFetch] = React.useState(0);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard/all');
      const d = await res.json();
      if (d.success) { setData(d.data); setLastFetch(Date.now()); }
    } catch {}
    setLoading(false);
  };

  React.useEffect(() => { fetchAll(); }, []);

  const sorted = (data[tab] || []).slice(0, 50);
  const myRank = sorted.findIndex(u => u.id === cu.id || u.username === cu.username) + 1;
  const medal = i => i===0?{icon:'🥇',color:'#FFD700',glow:'rgba(255,215,0,0.3)'}:i===1?{icon:'🥈',color:'#C0C0C0',glow:'rgba(192,192,192,0.3)'}:i===2?{icon:'🥉',color:'#CD7F32',glow:'rgba(205,127,50,0.3)'}:null;

  const fmtVal = (u) => {
    if (tab==='money') return fmtWord(u.money || 0);
    if (tab==='level') return `Seviye ${u.level || 1}`;
    if (tab==='score') return Number(u.score || 0).toLocaleString('tr-TR');
    if (tab==='gang')  return u.gang_name || '—';
    return '—';
  };

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:800,color:'#FFD700',letterSpacing:'0.08em'}}>🏆 SIRALAMA</div>
        <button onClick={fetchAll} style={{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.3)',borderRadius:'8px',padding:'0.3rem 0.65rem',color:'#FFD700',fontSize:'0.72rem',fontWeight:700,cursor:'pointer'}}>
          🔄 Yenile
        </button>
      </div>
      {lastFetch > 0 && <div style={{fontSize:'0.62rem',color:'#5A7089'}}>Son güncelleme: {new Date(lastFetch).toLocaleTimeString('tr-TR')}</div>}
      <div style={{display:'flex',background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'3px',gap:'3px'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:'0.45rem 0.2rem',borderRadius:'9px',border:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.72rem',transition:'all 0.15s',whiteSpace:'nowrap',
              background:tab===t.id?'rgba(255,215,0,0.15)':'transparent',
              color:tab===t.id?'#FFD700':dark?'#64748B':'#94A3B8'}}>
            {t.label}
          </button>
        ))}
      </div>
      {myRank>0&&(
        <div style={{background:'rgba(255,215,0,0.08)',border:'1px solid rgba(255,215,0,0.25)',borderRadius:'12px',padding:'0.65rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'0.8rem',color:'#FFD700',fontWeight:700}}>📍 Senin sıran</span>
          <span style={{fontSize:'0.85rem',fontWeight:800,color:'#FFD700'}}>#{myRank} / {sorted.length}</span>
        </div>
      )}
      {loading ? (
        <div style={{textAlign:'center',padding:'2rem',color:'#5A7089'}}>⏳ Yükleniyor...</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
          {sorted.length===0&&<div style={{color:'#5A7089',fontSize:'0.85rem',textAlign:'center',marginTop:'2rem'}}>Veri yok.</div>}
          {sorted.map((u,i)=>{
            const m=medal(i); const isMe=(u.id===cu.id||u.username===cu.username);
            return (
              <div key={u.id||i} style={{display:'flex',alignItems:'center',gap:'0.65rem',background:isMe?'rgba(255,215,0,0.07)':card,border:`1px solid ${isMe?'rgba(255,215,0,0.3)':border}`,borderRadius:'12px',padding:'0.65rem 0.85rem',boxShadow:m?`0 0 10px ${m.glow}`:'none'}}>
                <div style={{minWidth:'28px',textAlign:'center'}}>
                  {m?<span style={{fontSize:'1.3rem'}}>{m.icon}</span>:<span style={{fontSize:'0.78rem',fontWeight:800,color:'#5A7089'}}>#{i+1}</span>}
                </div>
                <div style={{width:'34px',height:'34px',borderRadius:'50%',background:`linear-gradient(135deg,${m?.color||'#3B82F6'},${m?.color||'#6366F1'}33)`,border:`2px solid ${m?.color||'rgba(255,255,255,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0}}>
                  {u.gender==='kadin'?'👩':'👨'}
                </div>
                <div style={{flex:1,overflow:'hidden'}}>
                  <div style={{fontSize:'0.85rem',fontWeight:700,color:isMe?'#FFD700':dark?'#E8EDF2':'#1E293B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.username}{isMe?' (Sen)':''}</div>
                  <div style={{fontSize:'0.67rem',color:'#5A7089'}}>{u.city||''} • Lv.{u.level||1}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:'0.82rem',fontWeight:800,color:m?m.color:dark?'#E8EDF2':'#334155'}}>{fmtVal(u)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

