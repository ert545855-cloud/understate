function WorldPage({ profile, onNavigate }) {
  const sections = [
    { title:'⚔️ SAVAŞ & GÜÇ', color:'#EF4444', items:[
      {icon:'⚔️',label:'PvP Savaş',page:'gang',sub:'Rakiple dövüş'},
      {icon:'💀',label:'Çeteler',page:'gang',sub:'Yeraltı dünyası'},
      {icon:'🏰',label:'Kale Sistemi',page:'gang',sub:'Kaleleri ele geçir'},
      {icon:'🔥',label:'Uluslar. Savaş',page:'gang',sub:'Global çatışma'},
      {icon:'🕵️',label:'Casusluk',page:'gang',sub:'Ajan operasyonları'},
      {icon:'⚖️',label:'Mahkeme',page:'gang',sub:'Hukuk sistemi'},
    ]},
    { title:'🤝 İTTİFAKLAR', color:'#3B82F6', items:[
      {icon:'🤝',label:'İttifak',page:'alliance',sub:'Güç birliği'},
      {icon:'👪',label:'Aileler',page:'gang',sub:'Aile sistemi'},
      {icon:'🗺️',label:'Arazi Savaşı',page:'gang',sub:'Toprak kontrolü'},
      {icon:'🌍',label:'Dünya Haritası',page:'alliance',sub:'Global görünüm'},
      {icon:'🚔',label:'Polis',page:'gang',sub:'Emniyet'},
      {icon:'⚔️',label:'Paralı Ordu',page:'gang',sub:'Özel kuvvetler'},
    ]},
    { title:'👥 OYUNCULAR', color:'#10B981', items:[
      {icon:'👥',label:'Tüm Oyuncular',page:'players',sub:'Topluluk'},
      {icon:'🏆',label:'Liderlik',page:'players',sub:'En iyiler'},
      {icon:'🌐',label:'Dünya Sohbeti',page:'chat',sub:'Global chat'},
      {icon:'📊',label:'İstatistikler',page:'profile',sub:'Sıralamalar'},
      {icon:'💎',label:'Premium',page:'premium',sub:'VIP üyelik'},
      {icon:'📰',label:'Gazete',page:'chat',sub:'Haberler'},
    ]},
  ];
  return (
    <div style={{padding:'0 0.75rem 1rem',background:'#F0F2F5',minHeight:'100%'}}>
      <div style={{paddingTop:'0.75rem'}}>
        {sections.map((sec,si)=>(
          <div key={si} style={{background:'#FFFFFF',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',padding:'1rem',marginBottom:'0.65rem',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:'0.75rem',fontWeight:800,color:sec.color,letterSpacing:'0.1em',marginBottom:'0.7rem'}}>{sec.title}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.45rem'}}>
              {sec.items.map((item,i)=>(
                <button key={i} onClick={()=>onNavigate(item.page)}
                  style={{background:'#F5F7FA',border:'1px solid rgba(0,0,0,0.07)',borderRadius:'12px',padding:'0.75rem 0.3rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.25rem',cursor:'pointer',WebkitTapHighlightColor:'transparent',transition:'all 0.15s'}}>
                  <span style={{fontSize:'1.5rem',lineHeight:1}}>{item.icon}</span>
                  <span style={{fontSize:'0.65rem',fontWeight:700,color:'#1A2233',textAlign:'center',lineHeight:1.2}}>{item.label}</span>
                  <span style={{fontSize:'0.55rem',color:'#9AABBA',textAlign:'center'}}>{item.sub}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CHAT SİSTEMİ
// ═══════════════════════════════════════════════════════
function ChatPage({ profile }) {
  const [tab, setTab] = useState('global');
  const [globalChat, setGlobalChat] = useLs('globalChat', []);
  const [cityChats, setCityChats] = useLs('cityChats', {});
  const [msg, setMsg] = useState('');
  const [dmTarget, setDmTarget] = useState(null);
  const [dmModal, setDmModal] = useState(false);
  const [dms, setDms] = useLs('privateDMs', {});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const cityKey = profile?.city || 'İstanbul';
  const cityMessages = (cityChats && cityChats[cityKey]) ? cityChats[cityKey] : [];

  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [giphyResults, setGiphyResults] = useState([]);
  const [giphyLoading, setGiphyLoading] = useState(false);

  useEffect(() => {
    if (!showGifPicker) return;
    const q = gifSearch.trim();
    const timer = setTimeout(async () => {
      setGiphyLoading(true);
      try {
        const endpoint = q ? `/api/giphy-search?q=${encodeURIComponent(q)}` : '/api/giphy-trending';
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

  const POPULAR_GIFS = [
    'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
    'https://media.giphy.com/media/l0HlFZ3HqbGrMTBQs/giphy.gif',
    'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    'https://media.giphy.com/media/xT9IgG50Lg7russbBO/giphy.gif',
    'https://media.giphy.com/media/l4FGGafcOHmrlQxG0/giphy.gif',
    'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
    'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif',
    'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    'https://media.giphy.com/media/3oEdv22bMDaqXkOIPS/giphy.gif',
    'https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif',
    'https://media.giphy.com/media/Vbtc9VG51NtzT1Qnv1/giphy.gif',
    'https://media.giphy.com/media/TdfyKrN7HGTIY/giphy.gif',
  ];
  const displayGifs = giphyResults.length > 0 ? giphyResults : POPULAR_GIFS;

  const sendMsg = (textOverride) => {
    const text = textOverride || msg;
    if (!text?.trim()) return;
    const newMsg = {
      id: genId(), userId: profile?.uid, username: profile?.username || 'Oyuncu',
      gender: profile?.gender, text: text.trim(), ts: Date.now(),
      level: profile?.level || 1, premium: profile?.premium,
      photoUrl: profile?.avatarUrl || profile?.photoUrl || null,
    };
    if (tab === 'global') {
      // Optimistic local update — socket.on('chat') bridge zaten rep_globalChat'i sync'ler
      // ama emit başarısız olursa kullanıcı mesajını yine görsün diye local'e ekle
      const updated = [...(globalChat||[]).slice(-199), newMsg];
      setGlobalChat(updated);
      // Socket.IO üzerinden gönder (sunucu tüm oyunculara broadcast eder)
      try {
        const _sock = window._socket || window._gameSocket;
        if (_sock?.connected) {
          _sock.emit('chat', {
            id: newMsg.id,
            channel: 'globalChat',
            message: newMsg.text,
            sender: newMsg.username,
            userId: newMsg.userId,
            level: newMsg.level,
            gender: newMsg.gender,
            premium: newMsg.premium,
            photoUrl: newMsg.photoUrl,
            timestamp: newMsg.ts,
          });
        } else {
          console.warn('[Chat] Socket bağlı değil, mesaj sadece local kaldı');
        }
      } catch(e) { console.error('[Chat] emit hatası:', e); }
    } else if (tab === 'city') {
      const upd = { ...(cityChats||{}), [cityKey]: [...(cityMessages||[]).slice(-99), newMsg] };
      setCityChats(upd);
      // Socket.IO üzerinden şehir kanalına gönder
      try {
        const _sock2 = window._socket || window._gameSocket;
        if (_sock2?.connected) {
          _sock2.emit('chat', {
            id: newMsg.id,
            channel: `city_${cityKey}`,
            message: newMsg.text,
            sender: newMsg.username,
            userId: newMsg.userId,
            level: newMsg.level,
            gender: newMsg.gender,
            premium: newMsg.premium,
            photoUrl: newMsg.photoUrl,
            timestamp: newMsg.ts,
          });
        } else {
          console.warn('[Chat] Socket bağlı değil (city), şehir mesajı sadece local kaldı');
        }
      } catch(e) { console.error('[Chat] city emit hatası:', e); }
    }
    if (!textOverride) setMsg('');
    setShowGifPicker(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
    try {
      const ds = JSON.parse(localStorage.getItem('rep_dailyTaskProgress')||'{}');
      const today = new Date().toDateString();
      const ts = ds[today]||{};
      const cur = ts['chat3']||0;
      if (cur < 3) {
        const ns = {...ds,[today]:{...ts,chat3:cur+1}};
        localStorage.setItem('rep_dailyTaskProgress', JSON.stringify(ns));
        window.dispatchEvent(new CustomEvent('daily-progress-updated'));
      }
    } catch(e){}
  };

  const sendGif = (gifUrl) => { sendMsg(gifUrl); };

  const messages = tab === 'global' ? (globalChat||[]) : tab === 'city' ? cityMessages : [];

  const chatTabs = [
    { id:'global', label:'🌍 Global' },
    { id:'city',   label:`🏙️ ${cityKey}` },
    { id:'dm',     label:'✉️ Özel' },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100dvh - 120px)'}}>
      {/* Tabs */}
      <div style={{display:'flex',gap:'4px',padding:'0.5rem 0.7rem',background:'rgba(6,12,24,0.97)',borderBottom:'1px solid rgba(255,255,255,0.04)',overflowX:'auto',scrollbarWidth:'none',flexShrink:0}}>
        {chatTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{padding:'0.4rem 0.85rem',borderRadius:'8px',border:`1px solid ${tab===t.id?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.07)'}`,background:tab===t.id?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.03)',color:tab===t.id?'#60A5FA':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.78rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
            {t.label}
          </button>
        ))}
        <div style={{flex:1}} />
        {tab==='dm' && (
          <button onClick={()=>setDmModal(true)} style={{padding:'0.4rem 0.75rem',borderRadius:'8px',border:'1px solid rgba(59,130,246,0.3)',background:'rgba(59,130,246,0.1)',color:'#60A5FA',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.75rem',cursor:'pointer'}}>+ Yeni DM</button>
        )}
      </div>

      {/* Mesajlar */}
      {tab !== 'dm' ? (
        <>
          <div style={{flex:1,overflowY:'auto',padding:'0.6rem 0.7rem',display:'flex',flexDirection:'column',gap:'0.4rem',WebkitOverflowScrolling:'touch'}}>
            {messages.slice(-80).map((m,i) => {
              const isMe = m.userId === profile?.uid;
              const imgRx = /(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|gifv)(\?\S*)?|https?:\/\/(?:media\.giphy\.com|i\.giphy\.com|media\d*\.giphy\.com|tenor\.com|c\.tenor\.com|media\.tenor\.com)\S+)/i;
              const imgMatch = m.text?.match(imgRx);
              const isGiphyUrl = imgMatch && /giphy\.com|tenor\.com/i.test(imgMatch[0]);
              const isImageOnly = imgMatch && (m.text.trim()===imgMatch[0] || isGiphyUrl);
              return (
                <div key={m.id||i} style={{display:'flex',flexDirection:isMe?'row-reverse':'row',gap:'0.45rem',alignItems:'flex-end'}}>
                  {!isMe && (
                    <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#1a3a5c,#0a1a2e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem',border:'1px solid rgba(59,130,246,0.2)',flexShrink:0,overflow:'hidden'}}>
                      {m.photoUrl ? <img src={m.photoUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={e=>e.target.style.display='none'}/> : m.gender==='female'?'👩':'👨'}
                    </div>
                  )}
                  <div style={{maxWidth:'78%'}}>
                    {!isMe && <div style={{fontSize:'0.63rem',color:m.premium?'#F59E0B':'#5A7089',fontWeight:700,marginBottom:'2px',paddingLeft:'4px'}}>{m.username} {m.premium&&'⭐'}</div>}
                    {isImageOnly ? (
                      <div style={{borderRadius:isMe?'12px 12px 3px 12px':'12px 12px 12px 3px',overflow:'hidden',border:`1px solid ${isMe?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.08)'}`}}>
                        <img src={imgMatch[0]} alt="foto" style={{maxWidth:'220px',maxHeight:'200px',display:'block',objectFit:'cover'}} onError={e=>{e.target.parentElement.innerHTML=`<div style="padding:0.5rem 0.75rem;color:#EF4444;font-size:0.75rem">⚠️ Resim yüklenemedi</div>`;}}/>
                      </div>
                    ) : (
                      <div style={{background:isMe?'rgba(59,130,246,0.15)':'rgba(255,255,255,0.05)',border:`1px solid ${isMe?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.08)'}`,borderRadius:isMe?'12px 12px 3px 12px':'12px 12px 12px 3px',padding:'0.5rem 0.75rem',fontSize:'0.87rem',color:'#D0E0F0',lineHeight:1.5,wordBreak:'break-word'}}>
                        {imgMatch ? (
                          <>
                            <span>{m.text.replace(imgMatch[0],'').trim()}</span>
                            {m.text.replace(imgMatch[0],'').trim() && <br/>}
                            <img src={imgMatch[0]} alt="foto" style={{maxWidth:'200px',maxHeight:'180px',borderRadius:'8px',marginTop:'4px',display:'block'}} onError={e=>e.target.style.display='none'}/>
                          </>
                        ) : m.text}
                      </div>
                    )}
                    <div style={{fontSize:'0.58rem',color:'#5A7089',marginTop:'2px',textAlign:isMe?'right':'left',paddingLeft:isMe?0:'4px'}}>{timeAgo(m.ts)}</div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>Henüz mesaj yok. İlk sen yaz! 💬</div>}
            <div ref={messagesEndRef} />
          </div>
          {/* GIF Picker */}
          {showGifPicker && (
            <div style={{background:'rgba(6,12,24,0.98)',borderTop:'1px solid rgba(255,255,255,0.08)',padding:'0.6rem',flexShrink:0}}>
              <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.5rem'}}>
                <input value={gifSearch} onChange={e=>setGifSearch(e.target.value)} placeholder="GIF ara... (örn: güzel, komik, siyaset)"
                  style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.45rem 0.75rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none'}} />
                <button onClick={()=>setShowGifPicker(false)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'0.45rem 0.6rem',color:'#5A7089',cursor:'pointer',fontSize:'0.8rem'}}>✕</button>
              </div>
              {giphyLoading && <div style={{textAlign:'center',color:'#5A7089',fontSize:'0.78rem',padding:'0.3rem'}}>🔄 Yükleniyor...</div>}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.35rem',maxHeight:'160px',overflowY:'auto',scrollbarWidth:'none'}}>
                {displayGifs.map((g,i)=>(
                  <img key={i} src={g} alt="gif" onClick={()=>sendGif(g)}
                    style={{height:'72px',width:'100%',objectFit:'cover',borderRadius:'8px',cursor:'pointer',border:'1px solid rgba(255,255,255,0.08)',transition:'transform 0.1s'}}
                    onMouseOver={e=>e.target.style.transform='scale(1.05)'}
                    onMouseOut={e=>e.target.style.transform='scale(1)'}
                    onError={e=>e.target.style.display='none'} />
                ))}
              </div>
              <div style={{fontSize:'0.58rem',color:'#5A7089',textAlign:'right',marginTop:'0.3rem'}}>Powered by GIPHY</div>
            </div>
          )}
          {/* Input */}
          <div style={{padding:'0.5rem 0.7rem',background:'rgba(6,12,24,0.97)',borderTop:'1px solid rgba(255,255,255,0.04)',paddingBottom:'calc(0.5rem + env(safe-area-inset-bottom, 0px))',flexShrink:0}}>
            <div style={{display:'flex',gap:'0.5rem',alignItems:'flex-end'}}>
              <button onClick={(e)=>{e.stopPropagation();setShowGifPicker(v=>!v);}} title="GIF Gönder"
                style={{background:showGifPicker?'rgba(59,130,246,0.2)':'rgba(255,255,255,0.05)',border:`1px solid ${showGifPicker?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.08)'}`,borderRadius:'12px',padding:'0.6rem 0.65rem',color:showGifPicker?'#60A5FA':'#8BA0B5',cursor:'pointer',fontSize:'1rem',flexShrink:0}}>
                🎞️
              </button>
              <input ref={inputRef} value={msg} onChange={e=>setMsg(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),sendMsg())}
                placeholder="Mesaj yaz veya URL yapıştır..." maxLength={500}
                style={{flex:1,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'0.6rem 1rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',resize:'none'}} />
              <button onClick={()=>sendMsg()} style={{background:'linear-gradient(135deg,#3B82F6,#2563EB)',border:'none',borderRadius:'12px',padding:'0.6rem 1rem',color:'#fff',fontWeight:700,fontSize:'1rem',cursor:'pointer',flexShrink:0}}>→</button>
            </div>
          </div>
        </>
      ) : (
        /* DM listesi */
        <div style={{flex:1,overflowY:'auto',padding:'0.7rem'}}>
          <div style={{color:'#5A7089',textAlign:'center',padding:'2rem',fontSize:'0.85rem'}}>
            Özel mesaj için kullanıcı arayın 🔍
            <br/>
            <button onClick={()=>setDmModal(true)} style={{marginTop:'1rem',background:'rgba(59,130,246,0.12)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:'10px',padding:'0.5rem 1rem',color:'#60A5FA',fontFamily:"'DM Sans',sans-serif",fontWeight:700,cursor:'pointer'}}>Kullanıcı Ara</button>
          </div>
        </div>
      )}

      {dmModal && (
        <Modal title="✉️ Özel Mesaj" onClose={()=>setDmModal(false)}>
          <div style={{color:'#8BA0B5',fontSize:'0.85rem',textAlign:'center',padding:'1rem'}}>
            Kullanıcı arama sistemi — Oyuncular sayfasından profil açarak DM gönderebilirsiniz.
          </div>
          <Btn variant='primary' size='full' onClick={()=>setDmModal(false)}>Tamam</Btn>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// EKONOMİ SAYFASI
// ═══════════════════════════════════════════════════════
function EconomyPage({ profile, setProfile, showNotif, initialSub }) {
  const [sub, setSub] = useState(initialSub||'overview');
  const [stocks, setStocks] = useLs('stockMarket', { TECH:145, ENERGY:88, FOOD:62, BANK:210, DEFENSE:175 });
  const [portfolio, setPortfolio] = useLs('stockPortfolio', {});
  const [farmModal, setFarmModal] = useState(null);
  const [farms, setFarms] = useLs('userFarms', []);
  const [casinoResult, setCasinoResult] = useState(null);
  const [stockBTab, setStockBTab] = useState('market');
  const [shortPos, setShortPos] = useLs('shortPositions', {});
  const [priceHist, setPriceHist] = useLs('stockPriceHist', {
    TECH:   [145,148,142,150,155,149,152,158,162,160],
    ENERGY: [88,85,90,87,92,95,89,93,91,96],
    FOOD:   [62,60,65,63,68,70,66,72,69,74],
    BANK:   [210,215,208,220,218,225,222,230,228,235],
    DEFENSE:[175,180,172,185,183,190,188,195,192,198],
  });

  const [ucConvertAmt, setUcConvertAmt] = useState('');
  const [tlConvertAmt, setTlConvertAmt] = useState('');
  const [katsayiAmt, setKatsayiAmt] = useState('');
  const UC_TO_TL = 1000000;

  const convertUcToTl = () => {
    const uc = parseInt(ucConvertAmt) || 0;
    if (uc <= 0) { showNotif('Geçerli bir UC miktarı girin', 'error'); return; }
    if ((profile?.underCoin||0) < uc) { showNotif('Yeterli UC yok!', 'error'); return; }
    const tl = uc * UC_TO_TL;
    const p = {...profile, underCoin:(profile.underCoin||0)-uc, money:(profile.money||0)+tl};
    setProfile(p); localStorage.setItem('rep_userProfile', JSON.stringify(p));
    setUcConvertAmt('');
    showNotif(`✅ ${uc} UC → ${fmtWord(tl)} dönüştürüldü!`, 'success');
  };

  const convertTlToUc = () => {
    const tl = parseInt(tlConvertAmt) || 0;
    if (tl <= 0) { showNotif('Geçerli bir TL miktarı girin', 'error'); return; }
    if ((profile?.money||0) < tl) { showNotif('Yeterli para yok!', 'error'); return; }
    const uc = Math.floor(tl / UC_TO_TL);
    if (uc <= 0) { showNotif(`En az ${fmtWord(UC_TO_TL)} TL gerekli`, 'error'); return; }
    const p = {...profile, money:(profile.money||0)-tl, underCoin:(profile.underCoin||0)+uc};
    setProfile(p); localStorage.setItem('rep_userProfile', JSON.stringify(p));
    setTlConvertAmt('');
    showNotif(`✅ ${fmtWord(tl)} → ${uc} UC dönüştürüldü!`, 'success');
  };

  const buyKatsayi = () => {
    const uc = parseInt(katsayiAmt) || 0;
    if (uc < 500) { showNotif('Minimum 500 UC gerekli!', 'error'); return; }
    if ((profile?.underCoin||0) < uc) { showNotif('Yeterli UC yok!', 'error'); return; }
    const bonus = Math.floor(uc * 0.01);
    const p = {...profile, underCoin:(profile.underCoin||0)-uc, voteMultiplier:(profile.voteMultiplier||0)+bonus};
    setProfile(p); localStorage.setItem('rep_userProfile', JSON.stringify(p));
    try { const users=JSON.parse(localStorage.getItem('rep_users')||'[]'); localStorage.setItem('rep_users',JSON.stringify(users.map(u=>u.id===p.id?p:u))); } catch(e){}
    setKatsayiAmt('');
    showNotif(`✅ ${uc} UC → +${bonus} oy katsayısı kazandın! (Toplam: ${p.voteMultiplier})`, 'success');
  };

  const subs = [
    { id:'overview',  label:'📊 Genel' },
    { id:'convert',   label:'🔄 Dönüşüm' },
    { id:'stocks',    label:'📈 Borsa' },
    { id:'farm',      label:'🌾 Tarım' },
    { id:'livestock', label:'🐄 Hayvancılık' },
    { id:'partjobs',  label:'🤝 Ortaklı' },
    { id:'casino',    label:'🎰 Kumarhane' },
    { id:'bank',      label:'🏦 Banka' },
    { id:'intltrade', label:'🌍 Dış Ticaret' },
  ];

  const buyStock = (sym) => {
    const price = Number(stocks[sym]) || 0;
    if (price <= 0) { showNotif('Fiyat bilgisi alınamadı, lütfen bekleyin', 'error'); return; }
    const cost = price * 10;
    if ((profile?.money||0) < cost) { showNotif('Yeterli paran yok!', 'error'); return; }
    const upd = { ...portfolio, [sym]: { qty: ((portfolio[sym]?.qty)||0)+10, avgCost: price } };
    setPortfolio(upd);
    const p = { ...profile, money: (profile.money||0) - cost };
    setProfile(p);
    localStorage.setItem('rep_userProfile', JSON.stringify(p));
    showNotif(`✅ 10 adet ${sym} satın alındı`, 'success');
  };

  const sellStock = (sym) => {
    if (!portfolio[sym]?.qty) { showNotif('Elinde bu hisse yok', 'error'); return; }
    const price = Number(stocks[sym]) || Number(portfolio[sym]?.avgCost) || 0;
    const earned = price * portfolio[sym].qty;
    const upd = { ...portfolio };
    delete upd[sym];
    setPortfolio(upd);
    const p = { ...profile, money: (profile.money||0) + earned };
    setProfile(p);
    localStorage.setItem('rep_userProfile', JSON.stringify(p));
    showNotif(`💰 ${fmtM(earned)} kazandın`, 'success');
  };

  const plantSeed = (type) => {
    const seeds = { wheat:{icon:'🌾',label:'Buğday',time:120,earn:500,cost:100}, corn:{icon:'🌽',label:'Mısır',time:180,earn:900,cost:150}, tomato:{icon:'🍅',label:'Domates',time:90,earn:350,cost:80}, grape:{icon:'🍇',label:'Üzüm',time:300,earn:1800,cost:250} };
    const s = seeds[type];
    if ((profile?.money||0) < s.cost) { showNotif('Yeterli paran yok', 'error'); return; }
    const newFarm = { id:genId(), type, ...s, plantedAt:Date.now(), harvestAt:Date.now()+s.time*1000, harvested:false };
    setFarms([...farms, newFarm]);
    setProfile(p => { const np={...p, money:(p.money||0)-s.cost}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`🌱 ${s.label} ekildi!`, 'success');
    setFarmModal(null);
  };

  const harvestFarm = (farm) => {
    if (Date.now() < farm.harvestAt) { showNotif('Henüz hasat zamanı değil!', 'error'); return; }
    setFarms(farms.map(f => f.id===farm.id ? {...f, harvested:true} : f));
    setProfile(p => { const np={...p, money:(p.money||0)+farm.earn, xp:(p.xp||0)+50}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    try { const today=new Date().toDateString(); const dk=`day_${today}`; const s=JSON.parse(localStorage.getItem('rep_dailyTaskState')||'{}'); s[dk]={...(s[dk]||{}),dailyFarmCount:((s[dk]?.dailyFarmCount)||0)+1}; localStorage.setItem('rep_dailyTaskState',JSON.stringify(s)); } catch(e){}
    showNotif(`🌾 +${fmtM(farm.earn)} hasat edildi!`, 'success');
  };

  const playSlot = (bet) => {
    if ((profile?.money||0) < bet) { showNotif('Yeterli paran yok!', 'error'); return; }
    const items = ['🍋','🍊','🍇','⭐','💎','🔔'];
    const spin = [items[Math.floor(Math.random()*items.length)], items[Math.floor(Math.random()*items.length)], items[Math.floor(Math.random()*items.length)]];
    let win = 0;
    if (spin[0]===spin[1]&&spin[1]===spin[2]) { win = spin[0]==='💎' ? bet*50 : spin[0]==='⭐' ? bet*20 : bet*10; }
    else if (spin[0]===spin[1]||spin[1]===spin[2]) win = bet*2;
    const net = win - bet;
    setProfile(p => { const np={...p, money:(p.money||0)+net}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setCasinoResult({ spin, win, bet });
    if (win > 0) showNotif(`🎰 KAZANDIN! +${fmtM(win)}`, 'gold');
  };

  return (
    <div>
      {/* Sub tabs */}
      <div style={{display:'flex',gap:'4px',padding:'0.5rem 0.7rem',overflowX:'auto',scrollbarWidth:'none',background:'rgba(6,12,24,0.97)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
        {subs.map(s => (
          <button key={s.id} onClick={()=>setSub(s.id)}
            style={{padding:'0.38rem 0.75rem',borderRadius:'8px',border:`1px solid ${sub===s.id?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.07)'}`,background:sub===s.id?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.03)',color:sub===s.id?'#60A5FA':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.76rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{padding:'0.7rem'}}>
        {sub==='convert' && (
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:'0.62rem',fontWeight:700,color:'#8B5CF6',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:'0.6rem'}}>🔄 DÖNÜŞÜM MERKEZİ</div>

            {/* Kur bilgisi */}
            <div style={{background:'rgba(139,92,246,0.07)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:'12px',padding:'0.8rem',marginBottom:'0.75rem',textAlign:'center'}}>
              <div style={{fontSize:'0.7rem',color:'#A78BFA',fontWeight:700,marginBottom:'0.2rem'}}>Döviz Kuru</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'1.1rem',fontWeight:800,color:'#8B5CF6'}}>1 UC = {fmtWord(1000000)}</div>
              <div style={{fontSize:'0.62rem',color:'#5A7089',marginTop:'0.2rem'}}>Undercoin (UC) ↔ Türk Lirası (TL)</div>
            </div>

            {/* UC → TL */}
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'0.85rem',marginBottom:'0.5rem'}}>
              <div style={{fontSize:'0.65rem',color:'#A78BFA',fontWeight:700,marginBottom:'0.5rem'}}>🪙 UC → TL</div>
              <div style={{display:'flex',gap:'0.4rem',alignItems:'center',marginBottom:'0.4rem'}}>
                <input type="number" value={ucConvertAmt} onChange={e=>setUcConvertAmt(e.target.value)} placeholder="UC miktarı..." min="1"
                  style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(139,92,246,0.3)',borderRadius:'8px',padding:'0.5rem 0.7rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'0.88rem',outline:'none'}} />
                <button onClick={convertUcToTl}
                  style={{padding:'0.5rem 0.9rem',borderRadius:'8px',border:'none',background:'linear-gradient(135deg,#8B5CF6,#6D28D9)',color:'#fff',fontWeight:700,fontSize:'0.8rem',cursor:'pointer',whiteSpace:'nowrap'}}>
                  Çevir
                </button>
              </div>
              {ucConvertAmt>0 && <div style={{fontSize:'0.65rem',color:'#10B981'}}>≈ {fmtWord((parseInt(ucConvertAmt)||0)*1000000)} alacaksın</div>}
              <div style={{fontSize:'0.62rem',color:'#5A7089',marginTop:'0.2rem'}}>Mevcut UC: <span style={{color:'#A78BFA',fontWeight:700}}>{fmt(profile?.underCoin||0)} UC</span></div>
            </div>

            {/* TL → UC */}
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'0.85rem',marginBottom:'0.5rem'}}>
              <div style={{fontSize:'0.65rem',color:'#10B981',fontWeight:700,marginBottom:'0.5rem'}}>💵 TL → UC</div>
              <div style={{display:'flex',gap:'0.4rem',alignItems:'center',marginBottom:'0.4rem'}}>
                <input type="number" value={tlConvertAmt} onChange={e=>setTlConvertAmt(e.target.value)} placeholder="TL miktarı..." min="1000000"
                  style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'8px',padding:'0.5rem 0.7rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'0.88rem',outline:'none'}} />
                <button onClick={convertTlToUc}
                  style={{padding:'0.5rem 0.9rem',borderRadius:'8px',border:'none',background:'linear-gradient(135deg,#10B981,#059669)',color:'#fff',fontWeight:700,fontSize:'0.8rem',cursor:'pointer',whiteSpace:'nowrap'}}>
                  Çevir
                </button>
              </div>
              {tlConvertAmt>0 && <div style={{fontSize:'0.65rem',color:'#A78BFA'}}>≈ {Math.floor((parseInt(tlConvertAmt)||0)/1000000)} UC alacaksın</div>}
              <div style={{fontSize:'0.62rem',color:'#5A7089',marginTop:'0.2rem'}}>Mevcut Para: <span style={{color:'#10B981',fontWeight:700}}>{fmtWord(profile?.money||0)}</span></div>
            </div>

            {/* UC → Katsayı */}
            <div style={{background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'12px',padding:'0.85rem'}}>
              <div style={{fontSize:'0.65rem',color:'#F59E0B',fontWeight:700,marginBottom:'0.3rem'}}>🗳️ UC → Oy Katsayısı</div>
              <div style={{fontSize:'0.62rem',color:'#5A7089',marginBottom:'0.5rem'}}>Min 500 UC • Çevirdiğin miktarın %1'i oy katsayısı olarak eklenir (seçimlerde etkili)</div>
              <div style={{background:'rgba(245,158,11,0.08)',borderRadius:'8px',padding:'0.5rem',marginBottom:'0.5rem',textAlign:'center'}}>
                <span style={{fontSize:'0.68rem',color:'#F59E0B',fontWeight:700}}>Mevcut Katsayı: +{profile?.voteMultiplier||0}</span>
              </div>
              <div style={{display:'flex',gap:'0.4rem',alignItems:'center'}}>
                <input type="number" value={katsayiAmt} onChange={e=>setKatsayiAmt(e.target.value)} placeholder="Min 500 UC..." min="500"
                  style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'8px',padding:'0.5rem 0.7rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'0.88rem',outline:'none'}} />
                <button onClick={buyKatsayi}
                  style={{padding:'0.5rem 0.9rem',borderRadius:'8px',border:'none',background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#000',fontWeight:700,fontSize:'0.8rem',cursor:'pointer',whiteSpace:'nowrap'}}>
                  Al
                </button>
              </div>
              {katsayiAmt>=500 && <div style={{fontSize:'0.65rem',color:'#F59E0B',marginTop:'0.3rem'}}>+{Math.floor((parseInt(katsayiAmt)||0)*0.01)} katsayı kazanacaksın</div>}
            </div>
          </div>
        )}

        {sub==='overview' && (
          <div>
            {/* Ekonomik Durum */}
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:'0.6rem',fontWeight:700,color:'#10B981',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:'0.45rem'}}>⚡ EKONOMİK DURUM</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.4rem',marginBottom:'0.75rem'}}>
              {[
                ['💵','Nakit',fmtM(profile?.money),'#10B981'],
                ['🏦','Mevduat',fmtM(profile?.bank),'#3B82F6'],
                ['🪙','Kripto (UCP)',fmtUC(profile?.underCoin),'#8B5CF6'],
                ['📊','Net Değer',fmtM((profile?.money||0)+(profile?.bank||0)),'#F59E0B'],
                ['🤝','Ticaret Puanı',`${fmt(profile?.tradePoints||0)} TP`,'#06B6D4'],
                ['💎','Liyakat (UC)',`${fmt(profile?.underCoin||0)} UC`,'#A78BFA'],
              ].map(([ic,lb,v,c])=>(
                <div key={lb} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${c}28`,borderRadius:'10px',padding:'0.55rem 0.35rem',textAlign:'center'}}>
                  <div style={{fontSize:'0.52rem',color:'#7A8FA6',textTransform:'uppercase',marginBottom:'0.15rem',letterSpacing:'0.04em',lineHeight:1.2}}>{ic} {lb}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'0.72rem',fontWeight:700,color:c,lineHeight:1.2}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Devlet Ekonomisi - CANLI VERİ */}
            {(() => {
              const _treasury = JSON.parse(localStorage.getItem('rep_treasury')||'{}');
              const _taxRates = JSON.parse(localStorage.getItem('rep_taxRates')||'{}');
              const _gangs = JSON.parse(localStorage.getItem('rep_gangs')||'[]');
              const _users = JSON.parse(localStorage.getItem('rep_users')||'[]');
              const _stocks = JSON.parse(localStorage.getItem('rep_stockMarket')||'{}');
              const hazine = _treasury.balance || 0;
              const milBudget = _treasury.militaryBudget || 0;
              const incomeTax = _taxRates.income || 15;
              const tradeTax = _taxRates.trade || 10;
              const gangCount = _gangs.length;
              const playerCount = _users.length;
              const avgStockPrice = Object.values(_stocks).length > 0 ? Math.round(Object.values(_stocks).reduce((a,b)=>a+b,0)/Object.values(_stocks).length) : 145;
              const _printedMoney = (() => { try { return JSON.parse(localStorage.getItem('rep_printedMoney')||'{"total":0}'); } catch{return {total:0};} })();
              const printedInflBonus = Math.min(40, Math.floor((_printedMoney.total||0)/1000000));
              const inflation = Math.min(99, 30 + gangCount * 3 + Math.max(0, incomeTax - 15) * 0.8 + printedInflBonus);
              const faiz = Math.min(80, 20 + Math.round(inflation * 0.6));
              const totalTax = incomeTax + tradeTax;
              const gdp = playerCount * 500000 + hazine;
              return (
                <div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:'0.6rem',fontWeight:700,color:'#F59E0B',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:'0.4rem'}}>🏛️ DEVLET EKONOMİSİ</div>
                  <div style={{background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.15)',borderRadius:'12px',padding:'0.7rem',marginBottom:'0.5rem'}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem'}}>
                      {[
                        ['🏛️','Hazine',`₺${fmtWord(hazine)}`,'#10B981'],
                        ['📉','Enflasyon',`%${inflation.toFixed(1)}`,'#EF4444'],
                        ['💹','Faiz Oranı',`%${faiz}`,'#F59E0B'],
                        ['💰','Vergi Oranı',`%${totalTax}`,'#8B5CF6'],
                        ['⚔️','Askeri Bütçe',`₺${fmtWord(milBudget)}`,'#EF4444'],
                        ['📊','GSYİH',`₺${fmtWord(gdp)}`,'#60A5FA'],
                      ].map(([ic,lb,v,c])=>(
                        <div key={lb} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.3rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                          <span style={{fontSize:'0.68rem',color:'#4A5A6A'}}>{ic} {lb}</span>
                          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'0.72rem',fontWeight:700,color:c}}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:'0.5rem',paddingTop:'0.4rem',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.62rem',color:'#5A7089',marginBottom:'3px'}}>
                        <span>Ekonomik İstikrar</span>
                        <span style={{color:inflation<40?'#10B981':inflation<70?'#F59E0B':'#EF4444'}}>{inflation<40?'İyi':inflation<70?'Orta':'Kritik'}</span>
                      </div>
                      <div style={{height:'4px',background:'rgba(239,68,68,0.2)',borderRadius:'100px',overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${Math.max(5,100-inflation)}%`,background:inflation<40?'#10B981':inflation<70?'#F59E0B':'#EF4444',borderRadius:'100px',transition:'width 0.5s'}} />
                      </div>
                      {printedInflBonus > 0 && <div style={{fontSize:'0.59rem',color:'#EF4444',marginTop:'0.25rem'}}>⚠️ Para basımı enflasyonu +{printedInflBonus.toFixed(0)} puan artırdı ({fmtWord(_printedMoney.total)} basıldı)</div>}
                      {inflation >= 70 && <div style={{fontSize:'0.6rem',color:'#EF4444',fontWeight:700,marginTop:'0.25rem',padding:'0.2rem 0.4rem',background:'rgba(239,68,68,0.1)',borderRadius:'6px'}}>🚨 DARBE ORTAMI — Gerginlik kritik seviyede!</div>}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Tüm Ekonomi Araçları */}
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:'0.6rem',fontWeight:700,color:'#3B82F6',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:'0.4rem'}}>🛠️ TÜM EKONOMİ ARAÇLARI</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.4rem'}}>
              {[
                {icon:'🏦',label:'Banka',fn:()=>setSub('bank')},
                {icon:'🛒',label:'Market',fn:()=>{}},
                {icon:'⛏️',label:'Madencilik',fn:()=>{}},
                {icon:'🏢',label:'Holdinglar',fn:()=>{}},
                {icon:'📈',label:'Borsa',fn:()=>setSub('stocks')},
                {icon:'🏭',label:'Fabrika',fn:()=>{}},
                {icon:'⚒️',label:'Crafting',fn:()=>{}},
                {icon:'🪨',label:'Hammadde',fn:()=>{}},
                {icon:'🔨',label:'Açık Artırma',fn:()=>{}},
                {icon:'🏘️',label:'Gayrimenkul',fn:()=>{}},
                {icon:'🌾',label:'Tarım',fn:()=>setSub('farm')},
                {icon:'🐄',label:'Hayvancılık',fn:()=>setSub('livestock')},
                {icon:'🛡️',label:'Sigorta',fn:()=>{}},
              ].map((item,i)=>(
                <button key={i} onClick={item.fn}
                  style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'0.65rem 0.3rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.25rem',cursor:'pointer',WebkitTapHighlightColor:'transparent',transition:'all 0.15s'}}>
                  <span style={{fontSize:'1.3rem',lineHeight:1}}>{item.icon}</span>
                  <span style={{fontSize:'0.6rem',fontWeight:700,color:'#6A7A8A',textAlign:'center',lineHeight:1.2}}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sub==='stocks' && (
          <div>
            <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'3px',marginBottom:'0.75rem'}}>
              {[['market','📊 Piyasa'],['portfolio','💼 Portföy'],['short','📉 Açığa Sat']].map(([k,l])=>(
                <button key={k} onClick={()=>setStockBTab(k)}
                  style={{flex:1,padding:'0.4rem',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.7rem',
                    background:stockBTab===k?'rgba(59,130,246,0.2)':'transparent',
                    color:stockBTab===k?'#60A5FA':'#5A7089'}}>
                  {l}
                </button>
              ))}
            </div>

            {stockBTab==='market' && Object.entries(stocks).map(([sym, price]) => {
              const held = portfolio[sym]?.qty || 0;
              const hist = priceHist[sym] || [price];
              const minH = Math.min(...hist); const maxH = Math.max(...hist);
              const prev = hist[hist.length-2] || price;
              const change = ((price - prev) / prev * 100);
              const pct = (v) => maxH===minH ? 50 : ((v-minH)/(maxH-minH))*100;
              const sectors = {TECH:'💻 Teknoloji',ENERGY:'⚡ Enerji',FOOD:'🌾 Gıda',BANK:'🏦 Finans',DEFENSE:'⚔️ Savunma'};
              return (
                <Card key={sym} style={{marginBottom:'0.5rem',padding:'0.85rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.6rem',marginBottom:'0.4rem'}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'baseline',gap:'0.4rem'}}>
                        <span style={{fontWeight:800,fontSize:'0.92rem',color:'#E8EDF2'}}>{sym}</span>
                        <span style={{fontSize:'0.62rem',color:'#5A7089'}}>{sectors[sym]||''}</span>
                      </div>
                      {held > 0 && <div style={{fontSize:'0.62rem',color:'#60A5FA'}}>{held} adet · ort. ₺{portfolio[sym]?.avgCost}</div>}
                    </div>
                    <div style={{display:'flex',alignItems:'flex-end',gap:'2px',height:'28px',width:'56px'}}>
                      {hist.slice(-10).map((v,i)=>(
                        <div key={i} style={{flex:1,background:change>=0?'rgba(16,185,129,0.55)':'rgba(239,68,68,0.55)',borderRadius:'1px',height:`${Math.max(8,pct(v))}%`}} />
                      ))}
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'1rem',fontWeight:700,color:'#E8EDF2'}}>₺{price}</div>
                      <div style={{fontSize:'0.63rem',color:change>=0?'#10B981':'#EF4444',fontWeight:700}}>{change>=0?'▲':'▼'}{Math.abs(change).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'0.4rem'}}>
                    <Btn variant='green' size='sm' onClick={()=>buyStock(sym)}>🛒 Al (10)</Btn>
                    {held > 0 && <Btn variant='danger' size='sm' onClick={()=>sellStock(sym)}>💸 Sat</Btn>}
                  </div>
                </Card>
              );
            })}

            {stockBTab==='portfolio' && (
              <div>
                {Object.keys(portfolio).length === 0 && <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>📊 Portföyünde henüz hisse yok.</div>}
                {Object.entries(portfolio).map(([sym, pos]) => {
                  const cur = stocks[sym] || pos.avgCost;
                  const val = cur * pos.qty;
                  const cost = pos.avgCost * pos.qty;
                  const pnl = val - cost;
                  const pnlPct = cost > 0 ? ((pnl/cost)*100).toFixed(1) : '0.0';
                  return (
                    <Card key={sym} style={{marginBottom:'0.5rem',padding:'0.85rem'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div>
                          <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.92rem'}}>{sym}</div>
                          <div style={{fontSize:'0.62rem',color:'#5A7089'}}>{pos.qty} adet · ort. ₺{pos.avgCost}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontWeight:700,color:'#E8EDF2',fontFamily:"'JetBrains Mono',monospace"}}>{fmtM(val)}</div>
                          <div style={{fontSize:'0.68rem',color:pnl>=0?'#10B981':'#EF4444',fontWeight:700}}>{pnl>=0?'+':''}{fmtM(pnl)} ({pnlPct}%)</div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {Object.keys(portfolio).length > 0 && (
                  <Card style={{padding:'0.75rem',background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.15)'}}>
                    <div style={{fontSize:'0.68rem',color:'#5A7089',marginBottom:'0.2rem'}}>📈 Toplam Portföy Değeri</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:'#60A5FA',fontSize:'1.15rem'}}>
                      {fmtM(Object.entries(portfolio).reduce((s,[sym,p])=>s+(stocks[sym]||p.avgCost)*p.qty, 0))}
                    </div>
                    <div style={{fontSize:'0.62rem',color:'#5A7089',marginTop:'0.2rem'}}>Kar/Zarar: {(()=>{const tot=Object.entries(portfolio).reduce((s,[sym,p])=>s+(stocks[sym]||p.avgCost)*p.qty-(p.avgCost*p.qty),0);return <span style={{color:tot>=0?'#10B981':'#EF4444',fontWeight:700}}>{tot>=0?'+':''}{fmtM(tot)}</span>;})()} </div>
                  </Card>
                )}
              </div>
            )}

            {stockBTab==='short' && (
              <div>
                <div style={{background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'12px',padding:'0.7rem',marginBottom:'0.6rem',fontSize:'0.72rem',color:'#FCA5A5',lineHeight:1.5}}>
                  ⚠️ Açığa satış: Fiyatın düşeceğine bahse girersin. Düşerse kâr, yükselirse zarar edersin.
                </div>
                {Object.entries(stocks).map(([sym, price]) => {
                  const myS = shortPos[sym];
                  return (
                    <Card key={sym} style={{marginBottom:'0.5rem',padding:'0.85rem'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div>
                          <div style={{fontWeight:800,color:'#E8EDF2'}}>{sym}</div>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'0.88rem',color:'#E8EDF2'}}>₺{price}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          {myS ? (
                            <div>
                              <div style={{fontSize:'0.62rem',color:'#5A7089'}}>Açık: ₺{myS.price} → ₺{price}</div>
                              <div style={{fontSize:'0.68rem',color:price<myS.price?'#10B981':'#EF4444',fontWeight:700}}>{price<myS.price?'📈 Kâr':'📉 Zarar'}: {fmtM(Math.abs((myS.price-price)*myS.qty))}</div>
                              <Btn variant='danger' size='sm' onClick={()=>{
                                const profit=(myS.price-price)*myS.qty;
                                setShortPos(prev=>{const n={...prev};delete n[sym];return n;});
                                setProfile(p=>{const np={...p,money:(p.money||0)+myS.stake+profit};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});
                                showNotif(profit>=0?`✅ Short kâr: +${fmtM(profit)}`:`❌ Short zarar: ${fmtM(profit)}`,'info');
                              }}>Kapat</Btn>
                            </div>
                          ) : (
                            <Btn variant='danger' size='sm' onClick={()=>{
                              const stake=price*5;
                              if((profile?.money||0)<stake){showNotif('Yeterli para yok','error');return;}
                              setShortPos(prev=>({...prev,[sym]:{price,qty:5,stake}}));
                              setProfile(p=>{const np={...p,money:(p.money||0)-stake};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});
                              showNotif(`📉 ${sym} açığa satıldı (5 adet)`, 'info');
                            }}>📉 Short Aç</Btn>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {sub==='farm' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
              <div style={{color:'#5A7089',fontSize:'0.78rem'}}>🌾 Tarla Durumu</div>
              <Btn variant='green' size='sm' onClick={()=>setFarmModal(true)}>+ Ek</Btn>
            </div>
            {farms.length === 0 && <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>Henüz tarlanız yok. Tohum ek!</div>}
            {farms.map(farm => {
              const ready = Date.now() >= farm.harvestAt;
              const pct = ready ? 100 : Math.min(100, ((Date.now()-farm.plantedAt)/(farm.harvestAt-farm.plantedAt))*100);
              return (
                <Card key={farm.id} style={{marginBottom:'0.5rem',padding:'0.85rem',opacity:farm.harvested?0.5:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                    <span style={{fontSize:'1.75rem'}}>{farm.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,marginBottom:'0.25rem'}}>{farm.label}</div>
                      <ProgressBar pct={pct} color={ready?'#10B981':'#F59E0B'} />
                      <div style={{fontSize:'0.63rem',color:'#5A7089',marginTop:'0.2rem'}}>{farm.harvested ? '✅ Hasat edildi' : ready ? '✅ Hasat hazır!' : `⏳ ${Math.ceil((farm.harvestAt-Date.now())/1000)}s kaldı`}</div>
                    </div>
                    {!farm.harvested && ready && (
                      <Btn variant='gold' size='sm' onClick={()=>harvestFarm(farm)}>Hasat</Btn>
                    )}
                  </div>
                </Card>
              );
            })}
            {farmModal && (
              <Modal title="🌱 Tohum Ek" onClose={()=>setFarmModal(null)}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                  {[['wheat','🌾','Buğday','₺100','2dk','₺500'],['corn','🌽','Mısır','₺150','3dk','₺900'],['tomato','🍅','Domates','₺80','1.5dk','₺350'],['grape','🍇','Üzüm','₺250','5dk','₺1800']].map(([t,ic,lb,cost,time,earn])=>(
                    <button key={t} onClick={()=>plantSeed(t)}
                      style={{padding:'1rem',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',cursor:'pointer',textAlign:'center'}}>
                      <div style={{fontSize:'1.75rem',marginBottom:'0.3rem'}}>{ic}</div>
                      <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.2rem'}}>{lb}</div>
                      <div style={{fontSize:'0.65rem',color:'#10B981'}}>{earn} kazanç</div>
                      <div style={{fontSize:'0.65rem',color:'#EF4444'}}>{cost} maliyet</div>
                      <div style={{fontSize:'0.62rem',color:'#5A7089'}}>⏱ {time}</div>
                    </button>
                  ))}
                </div>
              </Modal>
            )}
          </div>
        )}

        {sub==='partjobs' && (
          <PartnerJobsSection profile={profile} setProfile={setProfile} showNotif={showNotif} />
        )}

        {sub==='livestock' && (
          <LivestockSection profile={profile} setProfile={setProfile} showNotif={showNotif} />
        )}

        {sub==='casino' && (
          <div>
            <Card style={{textAlign:'center',marginBottom:'0.75rem',padding:'1.5rem'}}>
              <div style={{fontSize:'0.8rem',color:'#5A7089',marginBottom:'1rem'}}>🎰 Slot Makinesi</div>
              {casinoResult ? (
                <div>
                  <div style={{fontSize:'3rem',letterSpacing:'0.5rem',marginBottom:'0.75rem'}}>{casinoResult.spin.join(' ')}</div>
                  <div style={{fontSize:'1.2rem',fontWeight:800,color:casinoResult.win>0?'#10B981':'#EF4444'}}>
                    {casinoResult.win>0 ? `🎉 +${fmtM(casinoResult.win)} KAZANDIN!` : '😔 Kaybettin!'}
                  </div>
                </div>
              ) : (
                <div style={{fontSize:'3rem',letterSpacing:'0.5rem',marginBottom:'0.75rem',opacity:0.3}}>🎰 🎰 🎰</div>
              )}
            </Card>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem'}}>
              {[1000,5000,10000,25000,50000,100000].map(bet => (
                <Btn key={bet} variant='gold' size='sm' onClick={()=>playSlot(bet)}>{fmtM(bet)}</Btn>
              ))}
            </div>
          </div>
        )}

        {sub==='bank' && (
          <div>
            <BankPage profile={profile} setProfile={setProfile} showNotif={showNotif} />
          </div>
        )}
        {sub==='intltrade' && (
          <IntlTradePage profile={profile} setProfile={setProfile} showNotif={showNotif} />
        )}
      </div>

      {/* UC Katsayı Butonu */}
      {sub==='overview' && (() => {
        const hasBoost = !!(profile?.packages?.ucBoost || profile?.ucBoost);
        const boostExpiry = profile?.ucBoostExpiry || 0;
        const boostActive = hasBoost && boostExpiry > Date.now();
        const ucCost = 50;
        const activateBoost = () => {
          if ((profile?.underCoin||0) < ucCost) { showNotif(`UC Katsayı için ${ucCost} UC gerekli`, 'error'); return; }
          if (boostActive) { showNotif('UC Katsayı zaten aktif!', 'error'); return; }
          setProfile(p => {
            const np = {...p, underCoin:(p.underCoin||0)-ucCost, ucBoost:true, packages:{...(p.packages||{}),ucBoost:true}, ucBoostExpiry:Date.now()+24*60*60*1000};
            localStorage.setItem('rep_userProfile', JSON.stringify(np));
            return np;
          });
          showNotif('⚡ UC x2 Katsayı 24 saat aktifleşti!', 'success');
        };
        const rem = boostActive ? boostExpiry - Date.now() : 0;
        const remH = Math.floor(rem/3600000); const remM = Math.floor((rem%3600000)/60000);
        return (
          <div style={{marginTop:'0.75rem',padding:'0.75rem',background:'rgba(96,165,250,0.07)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:'14px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'0.5rem'}}>
              <div>
                <div style={{fontSize:'0.78rem',fontWeight:800,color:'#60A5FA'}}>⚡ UC x2 Kazanç Katsayısı</div>
                <div style={{fontSize:'0.65rem',color:'#5A7089',marginTop:'0.15rem'}}>
                  {boostActive ? `✅ Aktif — ${remH}sa ${remM}dk kaldı • İş başına 2x UC` : `${ucCost} UC harca → 24 saat boyunca iş yapınca 2x UC kazan`}
                </div>
              </div>
              <button onClick={activateBoost} disabled={boostActive}
                style={{padding:'0.45rem 0.85rem',borderRadius:'10px',border:'none',background:boostActive?'rgba(16,185,129,0.2)':'linear-gradient(135deg,#3B82F6,#2563EB)',color:boostActive?'#10B981':'#fff',fontWeight:800,fontSize:'0.75rem',cursor:boostActive?'default':'pointer',whiteSpace:'nowrap',flexShrink:0}}>
                {boostActive ? '✅ Aktif' : `⚡ ${ucCost} UC`}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const LOAN_TIERS = [
  { id:'micro',   label:'Mikro Kredi',   amount:10000,  interest:0.15, days:3,  icon:'💳', minLevel:1 },
  { id:'small',   label:'Küçük Kredi',   amount:50000,  interest:0.12, days:7,  icon:'🏦', minLevel:2 },
  { id:'medium',  label:'Orta Kredi',    amount:200000, interest:0.10, days:14, icon:'💰', minLevel:4 },
  { id:'large',   label:'Büyük Kredi',   amount:500000, interest:0.08, days:21, icon:'💎', minLevel:6 },
  { id:'premium', label:'Premium Kredi', amount:2000000,interest:0.06, days:30, icon:'🏆', minLevel:9 },
];

function BankPage({ profile, setProfile, showNotif }) {
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState('deposit');
  const [tab, setTab] = useState('account');
  const [loan, setLoan] = useLs('activeLoan', null);
  const [loanModal, setLoanModal] = useState(null);
  const [sendTo, setSendTo] = useState('');
  const [sendAmt, setSendAmt] = useState('');
  const [sendSearch, setSendSearch] = useState('');
  const [bankStatus, setBankStatus] = useState(null);
  const [txBusy, setTxBusy] = useState(false);

  const inp = {width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'0.7rem 1rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'};

  const jwt = () => localStorage.getItem('us_jwt') || '';

  const refreshStatus = async () => {
    try {
      const r = await fetch('/api/bank/status', { headers: { Authorization: 'Bearer ' + jwt() } });
      const d = await r.json();
      if (d.success) setBankStatus(d);
    } catch {}
  };

  useEffect(() => { refreshStatus(); }, [profile?.id]);

  const doTransfer = async () => {
    if (txBusy) return;
    const n = parseInt(amount);
    if (!n || n <= 0) { showNotif('Geçerli tutar girin', 'error'); return; }
    setTxBusy(true);
    try {
      const endpoint = action === 'deposit' ? 'deposit' : 'withdraw';
      const r = await fetch(`/api/bank/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt() },
        body: JSON.stringify({ amount: n }),
      });
      const d = await r.json();
      if (d.success) {
        setProfile(p => ({ ...p, money: d.money, bank: d.bank }));
        showNotif(action === 'deposit' ? `🏦 ${fmtM(n)} yatırıldı` : `💰 ${fmtM(n)} çekildi`, 'success');
        setAmount('');
        await refreshStatus();
      } else {
        showNotif(d.message || 'İşlem başarısız', 'error');
      }
    } catch { showNotif('Sunucu hatası', 'error'); }
    setTxBusy(false);
  };

  const doSendMoney = async () => {
    if (txBusy) return;
    const n = parseInt(sendAmt);
    if (!n || n <= 0) { showNotif('Geçerli tutar girin', 'error'); return; }
    if (!sendTo.trim()) { showNotif('Alıcı kullanıcı adı girin', 'error'); return; }
    setTxBusy(true);
    try {
      const r = await fetch('/api/bank/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt() },
        body: JSON.stringify({ toUsername: sendTo.trim(), amount: n }),
      });
      const d = await r.json();
      if (d.success) {
        setProfile(p => ({ ...p, money: (p.money || 0) - n - d.fee }));
        setSendAmt(''); setSendTo('');
        showNotif(`💸 ${fmtM(n)} → ${d.toUsername} gönderildi! (Komisyon: ${fmtM(d.fee)})`, 'success');
        await refreshStatus();
      } else {
        showNotif(d.message || 'Transfer başarısız', 'error');
      }
    } catch { showNotif('Sunucu hatası', 'error'); }
    setTxBusy(false);
  };

  const collectInterest = async () => {
    if (txBusy) return;
    setTxBusy(true);
    try {
      const r = await fetch('/api/bank/interest', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + jwt() },
      });
      const d = await r.json();
      if (d.success) {
        setProfile(p => ({ ...p, money: d.money }));
        showNotif(`💹 ${fmtM(d.interest)} faiz kazandın! (%${Math.round(d.rate * 100)})`, 'success');
        await refreshStatus();
      } else {
        showNotif(d.message || 'Faiz toplanamadı', 'error');
      }
    } catch { showNotif('Sunucu hatası', 'error'); }
    setTxBusy(false);
  };

  const takeLoan = (tier) => {
    if (loan) { showNotif('Mevcut kredinizi önce ödeyin', 'error'); return; }
    if ((profile?.level||1) < tier.minLevel) { showNotif(`Bu kredi için Seviye ${tier.minLevel} gerekli`, 'error'); return; }
    const repay = Math.floor(tier.amount * (1 + tier.interest));
    const newLoan = { ...tier, taken:Date.now(), repayAmount:repay, dueDate:Date.now()+tier.days*86400000 };
    setLoan(newLoan);
    setProfile(p => { const np={...p, money:(p.money||0)+tier.amount}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setLoanModal(null);
    showNotif(`✅ ${fmtM(tier.amount)} kredi hesabına yatırıldı`, 'success');
  };

  const repayLoan = () => {
    if (!loan) return;
    const repayAmt = loan.repayAmount || 0;
    if ((profile?.money||0) < repayAmt) { showNotif(`Yetersiz nakit. Gereken: ${fmtM(repayAmt)}`, 'error'); return; }
    setProfile(p => { const np={...p, money:(p.money||0)-repayAmt, xp:(p.xp||0)+200}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setLoan(null);
    showNotif(`✅ Kredi ödendi! +200 XP`, 'success');
  };

  const daysLeft = loan ? Math.max(0, Math.ceil((loan.dueDate - Date.now())/86400000)) : 0;
  const isOverdue = loan && Date.now() > loan.dueDate;

  return (
    <div style={{padding:'0'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.75rem'}}>
        <Card style={{textAlign:'center',padding:'1rem'}}>
          <div style={{color:'#10B981',fontWeight:900,fontSize:'1.05rem'}}>{fmtM(profile?.money)}</div>
          <div style={{fontSize:'0.6rem',color:'#5A7089',marginTop:'0.2rem',textTransform:'uppercase',fontWeight:700}}>💵 Nakit</div>
        </Card>
        <Card style={{textAlign:'center',padding:'1rem'}}>
          <div style={{color:'#3B82F6',fontWeight:900,fontSize:'1.05rem'}}>{fmtM(profile?.bank)}</div>
          <div style={{fontSize:'0.6rem',color:'#5A7089',marginTop:'0.2rem',textTransform:'uppercase',fontWeight:700}}>🏦 Banka</div>
        </Card>
      </div>

      {/* Faiz topla butonu */}
      {(bankStatus?.bank || profile?.bank || 0) > 0 && (() => {
        const canCollect = bankStatus ? bankStatus.canCollect : true;
        const proj = bankStatus ? bankStatus.projectedInterest : Math.floor((profile?.bank||0)*(profile?.premium?0.02:0.005));
        const rate  = bankStatus ? `%${Math.round((bankStatus.rate||0.005)*100)}` : (profile?.premium ? '%2' : '%0.5');
        const msLeft = bankStatus?.msUntil || 0;
        const hLeft  = msLeft > 0 ? Math.ceil(msLeft / 3600000) : 0;
        return (
          <button onClick={canCollect ? collectInterest : undefined}
            disabled={txBusy || !canCollect}
            style={{width:'100%',marginBottom:'0.65rem',padding:'0.65rem',borderRadius:'12px',border:`1px solid ${canCollect?'rgba(16,185,129,0.3)':'rgba(255,255,255,0.08)'}`,background:canCollect?'rgba(16,185,129,0.08)':'rgba(255,255,255,0.03)',color:canCollect?'#10B981':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.82rem',cursor:canCollect?'pointer':'default',transition:'all 0.2s'}}>
            {txBusy ? '⏳ İşleniyor...' : canCollect ? `💹 Günlük Faiz Topla (${rate} • ${fmtM(proj)})` : `⏰ ${hLeft} saat sonra tekrar toplanabilir`}
          </button>
        );
      })()}

      {/* Tab */}
      <div style={{display:'flex',gap:'4px',marginBottom:'0.75rem'}}>
        {[['account','🏦 Hesap'],['loans','💳 Krediler'],['send','💸 Gönder']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:'0.45rem',borderRadius:'8px',border:`1px solid ${tab===v?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.07)'}`,background:tab===v?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.03)',color:tab===v?'#60A5FA':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.8rem',cursor:'pointer'}}>
            {l}
          </button>
        ))}
      </div>

      {tab==='account' && (
        <Card>
          <div style={{display:'flex',background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'3px',marginBottom:'1rem',gap:'3px'}}>
            {[['deposit','💳 Yatır'],['withdraw','🏧 Çek']].map(([v,l])=>(
              <button key={v} onClick={()=>setAction(v)} style={{flex:1,padding:'0.5rem',borderRadius:'8px',border:'none',background:action===v?'rgba(59,130,246,0.15)':'transparent',color:action===v?'#60A5FA':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,cursor:'pointer'}}>
                {l}
              </button>
            ))}
          </div>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Tutar girin..."
            style={{...inp,marginBottom:'0.75rem'}} />
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.4rem',marginBottom:'0.75rem'}}>
            {[5000,10000,50000,100000].map(n=>(
              <button key={n} onClick={()=>setAmount(String(n))} style={{padding:'0.35rem',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',color:'#8BA0B5',fontSize:'0.68rem',cursor:'pointer',fontWeight:700}}>
                {fmtM(n)}
              </button>
            ))}
          </div>
          <Btn variant='primary' size='full' onClick={doTransfer}>{action==='deposit'?'💳 Yatır':'🏧 Çek'}</Btn>
          <div style={{fontSize:'0.68rem',color:'#5A7089',marginTop:'0.65rem',textAlign:'center'}}>
            💡 {profile?.premium?'Premium: %2':'%0.5'} günlük faiz • Her 24 saatte toplanır
          </div>
        </Card>
      )}

      {tab==='loans' && (
        <div>
          {/* Aktif kredi */}
          {loan && (
            <Card style={{marginBottom:'0.65rem',border:`1px solid ${isOverdue?'rgba(239,68,68,0.3)':'rgba(245,158,11,0.3)'}`,background:isOverdue?'rgba(239,68,68,0.06)':'rgba(245,158,11,0.06)'}}>
              <div style={{fontWeight:800,color:isOverdue?'#EF4444':'#F59E0B',marginBottom:'0.5rem',fontSize:'0.85rem'}}>
                {isOverdue?'⚠️ Vadesi Geçmiş Kredi':'💳 Aktif Kredi'} — {loan.label}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.4rem',marginBottom:'0.65rem'}}>
                {[['Alınan',fmtM(loan.amount)],['Geri Ödeme',fmtM(loan.repayAmount)],['Kalan Gün',isOverdue?'❌ Gecikti':`${daysLeft}g`]].map(([k,v])=>(
                  <div key={k} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.4rem',textAlign:'center'}}>
                    <div style={{fontSize:'0.58rem',color:'#5A7089',textTransform:'uppercase'}}>{k}</div>
                    <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.8rem'}}>{v}</div>
                  </div>
                ))}
              </div>
              <Btn variant='green' size='full' onClick={repayLoan}>
                ✅ Geri Öde ({fmtM(loan.repayAmount)})
              </Btn>
            </Card>
          )}

          {/* Kredi seçenekleri */}
          {!loan && (
            <div>
              <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.5rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>Kredi Seçenekleri</div>
              {LOAN_TIERS.map(tier => {
                const available = (profile?.level||1) >= tier.minLevel;
                const repay = Math.floor(tier.amount*(1+tier.interest));
                return (
                  <Card key={tier.id} style={{marginBottom:'0.5rem',opacity:available?1:0.5}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                      <div style={{fontSize:'1.5rem'}}>{tier.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.88rem'}}>{tier.label}</div>
                        <div style={{fontSize:'0.68rem',color:'#5A7089'}}>{fmtM(tier.amount)} • %{Math.round(tier.interest*100)} faiz • {tier.days} gün • Lv.{tier.minLevel}+</div>
                        <div style={{fontSize:'0.68rem',color:'#F59E0B'}}>Geri ödeme: {fmtM(repay)}</div>
                      </div>
                      <Btn variant='primary' size='sm' onClick={()=>available?takeLoan(tier):showNotif(`Seviye ${tier.minLevel} gerekli`,'error')}>
                        {available?'Al':'🔒'}
                      </Btn>
                    </div>
                  </Card>
                );
              })}
              <div style={{fontSize:'0.68rem',color:'#5A7089',textAlign:'center',padding:'0.5rem'}}>
                💡 Kredi geri ödemesi XP kazandırır. Zamanında öde, faiz düşer.
              </div>
            </div>
          )}
        </div>
      )}

      {tab==='send' && (
        <Card>
          <div style={{fontWeight:800,color:'#60A5FA',fontSize:'0.88rem',marginBottom:'0.5rem'}}>💸 Oyuncuya Para Gönder</div>
          <div style={{fontSize:'0.68rem',color:'#5A7089',marginBottom:'0.75rem'}}>%1 banka komisyonu alınır. Para direkt alıcının cüzdanına geçer.</div>
          {/* Oyuncu arama */}
          {(() => {
            const allU = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch{ return []; } })();
            const filtered = sendSearch.trim() ? allU.filter(u => u.username?.toLowerCase().includes(sendSearch.trim().toLowerCase()) && u.id !== profile?.id) : [];
            return (
              <div style={{marginBottom:'0.75rem'}}>
                <input value={sendSearch} onChange={e=>setSendSearch(e.target.value)}
                  placeholder="🔍 Kullanıcı adı ara..."
                  style={{...inp,marginBottom:'0.4rem',fontSize:'0.88rem'}} />
                {filtered.length>0 && (
                  <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)'}}>
                    {filtered.slice(0,6).map(u=>(
                      <div key={u.id} onClick={()=>{ setSendTo(u.username); setSendSearch(''); }}
                        style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.5rem 0.75rem',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)',background:sendTo===u.username?'rgba(59,130,246,0.1)':'transparent'}}>
                        <span style={{fontSize:'1rem'}}>{u.gender==='kadin'?'👩':'👨'}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:'0.82rem',fontWeight:700,color:'#E8EDF2'}}>{u.username}</div>
                          <div style={{fontSize:'0.62rem',color:'#5A7089'}}>{u.city||'?'} • Lv.{u.level||1}</div>
                        </div>
                        <span style={{fontSize:'0.62rem',color:'#10B981',fontWeight:700}}>{fmtM(u.money||0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          <div style={{marginBottom:'0.5rem'}}>
            <div style={{fontSize:'0.65rem',color:'#7A8FA6',marginBottom:'0.25rem'}}>Alıcı kullanıcı adı</div>
            <input value={sendTo} onChange={e=>setSendTo(e.target.value)} placeholder="Kullanıcı adı..."
              style={{...inp,borderColor:sendTo?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.1)'}} />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <div style={{fontSize:'0.65rem',color:'#7A8FA6',marginBottom:'0.25rem'}}>Tutar</div>
            <input type="number" value={sendAmt} onChange={e=>setSendAmt(e.target.value)} placeholder="Tutar girin..."
              style={inp} />
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.4rem',marginTop:'0.4rem'}}>
              {[1000,5000,10000,50000].map(n=>(
                <button key={n} onClick={()=>setSendAmt(String(n))} style={{padding:'0.35rem',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',color:'#8BA0B5',fontSize:'0.68rem',cursor:'pointer',fontWeight:700}}>
                  {fmtM(n)}
                </button>
              ))}
            </div>
          </div>
          {sendTo && sendAmt && parseInt(sendAmt)>0 && (
            <div style={{background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:'10px',padding:'0.6rem',marginBottom:'0.65rem',fontSize:'0.72rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'2px'}}>
                <span style={{color:'#5A7089'}}>Gönderilecek</span>
                <span style={{color:'#E8EDF2',fontWeight:700}}>{fmtM(parseInt(sendAmt)||0)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'2px'}}>
                <span style={{color:'#5A7089'}}>Komisyon (%1)</span>
                <span style={{color:'#F59E0B',fontWeight:700}}>-{fmtM(Math.max(100,Math.floor((parseInt(sendAmt)||0)*0.01)))}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'4px',marginTop:'2px'}}>
                <span style={{color:'#5A7089'}}>Toplam maliyet</span>
                <span style={{color:'#EF4444',fontWeight:800}}>{fmtM((parseInt(sendAmt)||0)+Math.max(100,Math.floor((parseInt(sendAmt)||0)*0.01)))}</span>
              </div>
            </div>
          )}
          <Btn variant='primary' size='full' onClick={doSendMoney}>💸 Gönder</Btn>
          <div style={{fontSize:'0.65rem',color:'#5A7089',marginTop:'0.5rem',textAlign:'center'}}>
            💡 Nakit bakiyenizden gönderilir. Banka mevduatından değil.
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PAZAR SAYFASI (Oyuncular arası ticaret)
// ═══════════════════════════════════════════════════════
function MarketPage({ profile, setProfile, showNotif }) {
  const [listings, setListings] = useLs('marketListings', []);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ item:'', qty:1, price:'' });

  const createListing = () => {
    if (!form.item || !form.price) { showNotif('Tüm alanları doldurun', 'error'); return; }
    const listing = { id:genId(), seller:profile?.uid, sellerName:profile?.username, item:form.item, qty:parseInt(form.qty)||1, price:parseInt(form.price)||0, ts:Date.now() };
    setListings([...listings, listing]);
    setCreateModal(false);
    setForm({ item:'', qty:1, price:'' });
    showNotif('✅ İlan oluşturuldu', 'success');
  };

  const buyListing = (listing) => {
    if ((profile?.money||0) < listing.price) { showNotif('Yetersiz para', 'error'); return; }
    if (listing.seller === profile?.uid) { showNotif('Kendi ilanını satın alamazsın', 'error'); return; }
    setListings(listings.filter(l => l.id !== listing.id));
    setProfile(p => { const np={...p, money:(p.money||0)-listing.price}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`✅ ${listing.item} satın alındı`, 'success');
  };

  return (
    <div style={{padding:'0.7rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
        <div style={{fontWeight:800,fontSize:'1rem',color:'#E8EDF2'}}>🏪 Açık Pazar</div>
        <Btn variant='primary' size='sm' onClick={()=>setCreateModal(true)}>+ İlan</Btn>
      </div>
      {listings.length === 0 && <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>Henüz ilan yok</div>}
      {listings.map(l => (
        <Card key={l.id} style={{marginBottom:'0.5rem',padding:'0.85rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:'#E8EDF2'}}>{l.item}</div>
              <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{l.sellerName} • {l.qty} adet • {timeAgo(l.ts)}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{color:'#10B981',fontWeight:800,fontSize:'1rem'}}>{fmtM(l.price)}</div>
              {l.seller !== profile?.uid && <Btn variant='green' size='sm' onClick={()=>buyListing(l)} style={{marginTop:'0.25rem'}}>Al</Btn>}
              {l.seller === profile?.uid && <Tag color='blue'>Benim</Tag>}
            </div>
          </div>
        </Card>
      ))}
      {createModal && (
        <Modal title="+ Yeni İlan" onClose={()=>setCreateModal(false)}>
          <div style={{marginBottom:'0.85rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Ürün Adı</div>
            <input value={form.item} onChange={e=>setForm(p=>({...p,item:e.target.value}))} placeholder="Ürün / Eşya adı"
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'}} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'1rem'}}>
            <div>
              <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Adet</div>
              <input type="number" value={form.qty} onChange={e=>setForm(p=>({...p,qty:e.target.value}))} min={1}
                style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'}} />
            </div>
            <div>
              <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Fiyat (₺)</div>
              <input type="number" value={form.price} onChange={e=>setForm(p=>({...p,price:e.target.value}))} placeholder="₺"
                style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'}} />
            </div>
          </div>
          <Btn variant='primary' size='full' onClick={createListing}>✅ İlan Oluştur</Btn>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SİYASET SAYFASI (TAM VERSİYON)
// ═══════════════════════════════════════════════════════
