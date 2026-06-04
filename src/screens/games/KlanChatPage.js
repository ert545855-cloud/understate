// ═══════════════════════════════════════════════════════
// SOSYAL MEDYA SAYFASI
// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// KLAN SOHBET SAYFASI — Firebase RTDB gerçek zamanlı
// ═══════════════════════════════════════════════════════
function KlanChatPage({ profile }) {
  const { dark } = useTheme();
  const cu = profile || {};
  const [msgs, setMsgs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rep_klanChat') || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [online, setOnline] = useState(false);
  const [sending, setSending] = useState(false);
  const [room, setRoom] = useState('Genel');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [giphyResults, setGiphyResults] = useState([]);
  const [giphyLoading, setGiphyLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const endRef = useRef(null);
  const rtdbRef = useRef(null);
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const rooms = ['Genel', 'Liderler', 'Savaş Planı', 'Ticaret'];

  const gangChannel = (cu.gang || cu.klan) ? `klan_${(cu.gang || cu.klan || '').toLowerCase().replace(/\s+/g,'_')}` : 'global';

  const loadHistory = React.useCallback(async (targetRoom) => {
    const channel = `${gangChannel}_${(targetRoom||room).toLowerCase().replace(/\s+/g,'_')}`;
    setHistoryLoading(true);
    try {
      const jwt = localStorage.getItem('us_jwt') || '';
      const r = await fetch(`/api/chat/history/${encodeURIComponent(channel)}?limit=50`, {
        headers: { Authorization: 'Bearer ' + jwt }
      });
      const d = await r.json();
      if (d.success && Array.isArray(d.messages) && d.messages.length > 0) {
        const serverMsgs = d.messages.map(m => ({
          id: m.id || m.msg_id,
          room: targetRoom || room,
          author: m.sender || 'Anonim',
          text: m.message || m.text,
          ts: m.ts || (m.created_at ? new Date(m.created_at).getTime() : Date.now()),
          city: m.city || '',
          photoUrl: m.photoUrl || null,
        }));
        setMsgs(prev => {
          const ids = new Set(prev.map(m => m.id));
          const merged = [...serverMsgs.filter(m => !ids.has(m.id)), ...prev].slice(-200);
          localStorage.setItem('rep_klanChat', JSON.stringify(merged));
          return merged;
        });
      }
    } catch {}
    setHistoryLoading(false);
  }, [gangChannel, room]);

  useEffect(() => { loadHistory(room); }, [room]);

  const POPULAR_GIFS_KLAN = [
    'https://media.giphy.com/media/l4FGGafcOHmrlQxG0/giphy.gif',
    'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
    'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    'https://media.giphy.com/media/xT9IgG50Lg7russbBO/giphy.gif',
    'https://media.giphy.com/media/l0HlFZ3HqbGrMTBQs/giphy.gif',
    'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    'https://media.giphy.com/media/3oEdv22bMDaqXkOIPS/giphy.gif',
    'https://media.giphy.com/media/TdfyKrN7HGTIY/giphy.gif',
  ];

  useEffect(() => {
    if (!showGifPicker) return;
    const q = gifSearch.trim();
    const timer = setTimeout(async () => {
      setGiphyLoading(true);
      try {
        const endpoint = q ? `/api/giphy-search?q=${encodeURIComponent(q)}&limit=20` : '/api/giphy-trending?limit=20';
        const r = await fetch(endpoint);
        const data = await r.json();
        if (data && Array.isArray(data.data)) {
          setGiphyResults(data.data.map(g => g.images?.fixed_height?.url || g.images?.downsized?.url || '').filter(Boolean));
        }
      } catch(e) { setGiphyResults([]); }
      setGiphyLoading(false);
    }, q ? 500 : 0);
    return () => clearTimeout(timer);
  }, [gifSearch, showGifPicker]);

  useEffect(() => {
    // Socket.IO üzerinden klanChat mesajlarını dinle
    const onChat = (data) => {
      if (!data?.channel?.startsWith('klan_')) return;
      const newMsg = {
        id: data.id,
        room: data.room || 'Genel',
        author: data.sender || 'Anonim',
        text: data.message,
        ts: data.timestamp || Date.now(),
        city: data.city || '',
        photoUrl: data.photoUrl || null,
      };
      setMsgs(prev => {
        if (prev.find(m => m.id === newMsg.id)) return prev;
        const next = [...prev, newMsg].slice(-200);
        localStorage.setItem('rep_klanChat', JSON.stringify(next));
        return next;
      });
      setOnline(true);
    };
    if (window._socket) {
      window._socket.on('chat', onChat);
    } else {
      const h = () => window._socket?.on('chat', onChat);
      window.addEventListener('socket-connected', h, { once: true });
      return () => window.removeEventListener('socket-connected', h);
    }
    setOnline(!!window._socket?.connected);
    return () => { window._socket?.off('chat', onChat); };
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.detail?.key === 'klanChat') setMsgs(e.detail.value || []); };
    window.addEventListener('fb-sync', h);
    return () => window.removeEventListener('fb-sync', h);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs, room]);

  const roomMsgs = msgs.filter(m => m.room === room);

  const send = async (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text || sending) return;
    setSending(true);
    const msg = { id: Date.now() + '_' + Math.random().toString(36).slice(2,6), room, author: cu.username||'Anonim', text, ts: Date.now(), city: cu.city||'', photoUrl: cu.avatarUrl||cu.photoUrl||null };
    if (!textOverride) setInput('');
    setShowGifPicker(false);
    // Optimistic local update
    setMsgs(prev => { const next = [...prev, msg].slice(-200); localStorage.setItem('rep_klanChat', JSON.stringify(next)); return next; });
    try {
      const _sockK = window._socket || window._gameSocket;
      if (_sockK?.connected) {
        _sockK.emit('chat', {
          id: msg.id,
          channel: `klan_${cu.gang || cu.klan || 'global'}`,
          room: msg.room,
          message: msg.text,
          sender: msg.author,
          userId: cu.uid || cu.id || null,
          city: msg.city,
          photoUrl: msg.photoUrl,
          timestamp: msg.ts,
        });
      } else {
        console.warn('[KlanChat] Socket bağlı değil');
      }
    } catch(e) { console.error('[KlanChat] emit hatası:', e); }
    setSending(false);
  };

  const sendGif = (gifUrl) => send(gifUrl);
  const displayGifs = giphyResults.length > 0 ? giphyResults : POPULAR_GIFS_KLAN;
  const gifRx = /(https?:\/\/(?:media\.giphy\.com|i\.giphy\.com|media\d*\.giphy\.com|tenor\.com|c\.tenor\.com)\S+)/i;

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:800,color:'#A78BFA',letterSpacing:'0.08em'}}>🔒 KLAN SOHBET</div>
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
          {historyLoading && <span style={{fontSize:'0.62rem',color:'#A78BFA'}}>⏳</span>}
          <button onClick={()=>loadHistory(room)} style={{background:'rgba(139,92,246,0.1)',border:'1px solid rgba(139,92,246,0.25)',borderRadius:'8px',padding:'0.25rem 0.6rem',color:'#A78BFA',fontSize:'0.65rem',fontWeight:700,cursor:'pointer'}}>🔄</button>
          <div style={{display:'flex',alignItems:'center',gap:'0.35rem',fontSize:'0.7rem',color:online?'#10B981':'#5A7089',fontWeight:700}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:online?'#10B981':'#5A7089',boxShadow:online?'0 0 6px #10B981':'none'}}/>
            {online?'Canlı':'Çevrimdışı'}
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
        {rooms.map(r => (
          <button key={r} onClick={()=>setRoom(r)}
            style={{padding:'0.35rem 0.85rem',borderRadius:'20px',border:`1px solid ${room===r?'rgba(139,92,246,0.5)':border}`,background:room===r?'rgba(139,92,246,0.15)':'transparent',color:room===r?'#A78BFA':dark?'#64748B':'#94A3B8',fontSize:'0.78rem',fontWeight:700,cursor:'pointer',transition:'all 0.15s'}}>
            {r}
          </button>
        ))}
      </div>
      <div style={{flex:1,background:card,border:`1px solid ${border}`,borderRadius:'16px',padding:'0.75rem',overflowY:'auto',maxHeight:'48vh',display:'flex',flexDirection:'column',gap:'0.5rem'}}>
        {roomMsgs.length===0 && <div style={{color:'#5A7089',fontSize:'0.85rem',textAlign:'center',marginTop:'2rem'}}>{online?'Bu odada henüz mesaj yok. İlk mesajı gönder!':'🔄 Bağlanıyor...'}</div>}
        {roomMsgs.map(m => {
          const isMe = m.author === cu.username;
          const gifMatch = m.text?.match(gifRx);
          const isGif = !!gifMatch;
          return (
            <div key={m.id} style={{display:'flex',flexDirection:isMe?'row-reverse':'row',gap:'0.4rem',alignItems:'flex-end'}}>
              {!isMe && (
                <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#5B21B6,#7C3AED)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.8rem',flexShrink:0,overflow:'hidden',border:'1px solid rgba(139,92,246,0.3)'}}>
                  {m.photoUrl ? <img src={m.photoUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={e=>e.target.style.display='none'}/> : '👤'}
                </div>
              )}
              <div style={{maxWidth:'78%'}}>
                {!isMe && <div style={{fontSize:'0.62rem',color:'#A78BFA',fontWeight:700,marginBottom:'2px',paddingLeft:'4px'}}>{m.author}{m.city&&` · ${m.city}`}</div>}
                {isGif ? (
                  <div style={{borderRadius:isMe?'12px 12px 3px 12px':'12px 12px 12px 3px',overflow:'hidden',border:`1px solid ${isMe?'rgba(139,92,246,0.3)':'rgba(255,255,255,0.08)'}`}}>
                    <img src={gifMatch[0]} alt="gif" style={{maxWidth:'220px',maxHeight:'200px',display:'block'}} onError={e=>e.target.parentElement.innerHTML='<div style="padding:0.5rem;color:#EF4444;font-size:0.75rem">⚠️ GIF yüklenemedi</div>'}/>
                  </div>
                ) : (
                  <div style={{padding:'0.5rem 0.75rem',borderRadius:isMe?'12px 12px 3px 12px':'12px 12px 12px 3px',background:isMe?'rgba(139,92,246,0.18)':'rgba(255,255,255,0.05)',border:`1px solid ${isMe?'rgba(139,92,246,0.3)':border}`,fontSize:'0.87rem',color:dark?'#E8EDF2':'#1E293B',lineHeight:1.5,wordBreak:'break-word'}}>
                    {m.text}
                  </div>
                )}
                <div style={{fontSize:'0.58rem',color:'#5A7089',marginTop:'2px',textAlign:isMe?'right':'left',paddingLeft:isMe?0:'4px'}}>{timeAgo(m.ts)}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>

      {/* GIF Picker */}
      {showGifPicker && (
        <div style={{background:'rgba(6,12,24,0.98)',border:'1px solid rgba(139,92,246,0.25)',borderRadius:'14px',padding:'0.65rem'}}>
          <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.5rem'}}>
            <input value={gifSearch} onChange={e=>setGifSearch(e.target.value)} placeholder="GIF ara... (örn: klan, savaş, zafer)"
              style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:'10px',padding:'0.45rem 0.75rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none'}} />
            <button onClick={()=>setShowGifPicker(false)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'0.45rem 0.6rem',color:'#5A7089',cursor:'pointer',fontSize:'0.8rem'}}>✕</button>
          </div>
          {giphyLoading && <div style={{textAlign:'center',color:'#A78BFA',fontSize:'0.75rem',padding:'0.3rem'}}>🔄 Yükleniyor...</div>}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.3rem',maxHeight:'150px',overflowY:'auto',scrollbarWidth:'none'}}>
            {displayGifs.map((g,i)=>(
              <img key={i} src={g} alt="gif" onClick={()=>sendGif(g)}
                style={{height:'68px',width:'100%',objectFit:'cover',borderRadius:'8px',cursor:'pointer',border:'1px solid rgba(139,92,246,0.15)'}}
                onError={e=>e.target.style.display='none'} />
            ))}
          </div>
          <div style={{fontSize:'0.56rem',color:'#5A7089',textAlign:'right',marginTop:'0.25rem'}}>Powered by GIPHY</div>
        </div>
      )}

      <div style={{display:'flex',gap:'0.5rem'}}>
        <button onClick={()=>setShowGifPicker(v=>!v)}
          style={{background:showGifPicker?'rgba(139,92,246,0.2)':'rgba(255,255,255,0.04)',border:`1px solid ${showGifPicker?'rgba(139,92,246,0.4)':'rgba(255,255,255,0.08)'}`,borderRadius:'12px',padding:'0.65rem 0.7rem',color:showGifPicker?'#A78BFA':'#8BA0B5',cursor:'pointer',fontSize:'0.95rem',flexShrink:0}}>
          🎞️
        </button>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder={`#${room} odasına mesaj yaz...`}
          style={{flex:1,background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'0.7rem 1rem',color:dark?'#E8EDF2':'#1E293B',fontSize:'0.88rem',outline:'none',fontFamily:"'DM Sans',sans-serif"}} />
        <button onClick={()=>send()} disabled={sending}
          style={{padding:'0.7rem 1rem',borderRadius:'12px',border:'none',background:sending?'rgba(139,92,246,0.08)':'rgba(139,92,246,0.2)',color:sending?'#5A7089':'#A78BFA',fontWeight:700,cursor:sending?'not-allowed':'pointer',fontSize:'0.9rem',transition:'all 0.15s'}}>
          {sending?'…':'↑'}
        </button>
      </div>
    </div>
  );
}

