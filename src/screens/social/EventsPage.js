// ═══════════════════════════════════════════════════════
// OLAYLAR / EVENTS SAYFASI
// ═══════════════════════════════════════════════════════
function EventsPage({ profile, setProfile, showNotif }) {
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [events, setEvents] = useLs('rep_gameEvents', []);
  const [myResponses, setMyResponses] = useLs('eventResponses', {});

  useEffect(() => {
    const h = (e) => {
      if (e.detail) setEvents(prev => [...prev.slice(-49), e.detail]);
    };
    window.addEventListener('game-event', h);
    return () => window.removeEventListener('game-event', h);
  }, []);

  const EVENT_ICONS = { security_crisis:'🚨', money_printed:'💸', war_declared:'⚔️', coup_rumors:'🎖️', monopoly:'🏭', corruption:'⚠️', election_win:'🏆', default:'📢' };
  const EVENT_COLORS = { security_crisis:'#EF4444', money_printed:'#F59E0B', war_declared:'#DC2626', coup_rumors:'#8B5CF6', monopoly:'#3B82F6', corruption:'#F59E0B', election_win:'#10B981', default:'#5A7089' };

  const respondToEvent = (eventId, response) => {
    setMyResponses(prev => ({ ...prev, [eventId]: response }));
    const xpMap = { support:100, oppose:100, neutral:50 };
    setProfile(p => { const np={...p, xp:(p.xp||0)+(xpMap[response]||50)}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`✅ Tutumun kaydedildi! +${xpMap[response]||50} XP`, 'success');
  };

  const sortedEvents = [...events].sort((a,b)=>(b.ts||0)-(a.ts||0));

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{background:'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(11,21,39,0.97))',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'14px',padding:'1rem',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'0.6rem',color:'#EF4444',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.2rem'}}>🚨 OYUN OLAYLARI</div>
        <div style={{fontWeight:900,color:'#E8EDF2',fontSize:'1rem',marginBottom:'0.1rem'}}>Canlı Olaylar</div>
        <div style={{fontSize:'0.72rem',color:'#5A7089'}}>Oyuncu eylemleri olayları tetikler. Tutumunu belirt, XP kazan!</div>
      </div>

      {sortedEvents.length === 0 && (
        <div style={{textAlign:'center',padding:'3rem',color:'#5A7089'}}>
          <div style={{fontSize:'2rem',marginBottom:'0.75rem'}}>📰</div>
          <div style={{fontSize:'0.85rem'}}>Henüz olay yok. Oyuncuların eylemleri olayları tetikleyecek!</div>
          <div style={{fontSize:'0.72rem',marginTop:'0.5rem',color:'#5A7089',lineHeight:1.6}}>
            Örnek: Çete çok fazla il alırsa → Güvenlik Krizi<br/>
            Şirket tekelleşirse → Meclis Soruşturması<br/>
            Parti 2 seçim kazanırsa → Darbe Söylentileri
          </div>
        </div>
      )}

      {sortedEvents.map(evt => {
        const myResp = myResponses[evt.id];
        const color = EVENT_COLORS[evt.type] || EVENT_COLORS.default;
        const icon = EVENT_ICONS[evt.type] || EVENT_ICONS.default;
        const timeAgoStr = evt.ts ? timeAgo(evt.ts) : '';
        return (
          <div key={evt.id} style={{background:card,border:`1px solid ${color}30`,borderRadius:'14px',padding:'1rem',marginBottom:'0.65rem'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',marginBottom:'0.5rem'}}>
              <span style={{fontSize:'1.75rem',flexShrink:0}}>{icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,color,fontSize:'0.9rem',marginBottom:'0.2rem'}}>{evt.title}</div>
                <div style={{fontSize:'0.75rem',color:'#8BA0B5',lineHeight:1.5}}>{evt.desc}</div>
                <div style={{fontSize:'0.62rem',color:'#5A7089',marginTop:'0.3rem'}}>{timeAgoStr}</div>
              </div>
            </div>
            {!myResp ? (
              <div style={{display:'flex',gap:'0.4rem'}}>
                <button onClick={()=>respondToEvent(evt.id,'support')} style={{flex:1,padding:'0.45rem',borderRadius:'8px',border:'1px solid rgba(16,185,129,0.3)',background:'rgba(16,185,129,0.08)',color:'#10B981',fontWeight:700,fontSize:'0.72rem',cursor:'pointer'}}>✅ Destekle (+100 XP)</button>
                <button onClick={()=>respondToEvent(evt.id,'neutral')} style={{flex:1,padding:'0.45rem',borderRadius:'8px',border:`1px solid ${border}`,background:'transparent',color:'#5A7089',fontWeight:700,fontSize:'0.72rem',cursor:'pointer'}}>😐 Tarafsız (+50 XP)</button>
                <button onClick={()=>respondToEvent(evt.id,'oppose')} style={{flex:1,padding:'0.45rem',borderRadius:'8px',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',color:'#F87171',fontWeight:700,fontSize:'0.72rem',cursor:'pointer'}}>❌ Karşı Çık (+100 XP)</button>
              </div>
            ) : (
              <div style={{textAlign:'center',fontSize:'0.72rem',color:'#5A7089',padding:'0.3rem',background:'rgba(255,255,255,0.03)',borderRadius:'8px'}}>
                Tutumun: <span style={{fontWeight:700,color:myResp==='support'?'#10B981':myResp==='oppose'?'#EF4444':'#5A7089'}}>{myResp==='support'?'✅ Destekliyorsun':myResp==='oppose'?'❌ Karşı çıkıyorsun':'😐 Tarafsızsın'}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

