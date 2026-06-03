function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [f, setF] = useState({ username:'', password:'', email:'', city:'İstanbul', gender:'male', inviteCode:'' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  // ForgotPassword
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  // ResetPassword
  const [showReset, setShowReset] = useState(false);
  const [resetData, setResetData] = useState(null);
  const [resetPw, setResetPw] = useState('');
  const [resetPw2, setResetPw2] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const u = (k,v) => setF(p => ({...p,[k]:v}));

  useEffect(() => {
    window._USForgot = { open: () => { setForgotMsg(''); setForgotEmail(''); setShowForgot(true); } };
    if (window._resetTokenData) {
      setResetData(window._resetTokenData);
      window._resetTokenData = null;
      setShowReset(true);
    }
    return () => { window._USForgot = null; };
  }, []);

  const getUsers = () => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch{return [];} };
  const saveUsers = (arr) => localStorage.setItem('rep_users', JSON.stringify(arr));

  const _hashPass = (raw) => { try { return btoa(unescape(encodeURIComponent(raw + '_us_salt_2024'))); } catch(e) { return raw; } };

  const _setupSocket = (user) => {
    try {
      if (typeof io === 'undefined') return;
      const jwt = localStorage.getItem('us_jwt') || '';

      // Kullanıcı verisini global'e sakla — reconnect'te tekrar kullanılacak
      window._socketUser = user;

      // Her connect/reconnect'te playerJoin gönderen yardımcı
      const _doPlayerJoin = (s, u) => {
        if (!s || !u?.id) return;
        s.emit('playerJoin', {
          userId:   u.id || u.uid,
          username: u.username || 'Oyuncu',
          level:    u.level    || 1,
          city:     u.city     || '',
          gender:   u.gender   || 'erkek',
          money:    u.money    || 0,
          party:    u.party    || null,
          gang:     u.gang     || null,
        });
      };

      // index.html Socket Bridge zaten bağlantıyı kuruyor (window._gameSocket)
      // Çift bağlantı açmamak için önce onu kullan
      if (window._gameSocket && window._gameSocket.connected) {
        window._socket = window._gameSocket;
        _doPlayerJoin(window._socket, user);
        window._socket.emit('requestOnlinePlayers');
      } else if (!window._socket || !window._socket.connected) {
        // Fallback: bridge henüz hazır değilse bekle, hazır olunca al
        const onBridgeReady = () => {
          if (window._gameSocket) {
            window._socket = window._gameSocket;
            _doPlayerJoin(window._socket, window._socketUser);
            window._socket.emit('requestOnlinePlayers');
          }
        };
        window.addEventListener('socket-connected', onBridgeReady, { once: true });
      } else {
        _doPlayerJoin(window._socket, user);
        window._socket.emit('requestOnlinePlayers');
      }
    } catch(e) { console.warn('Socket init hatası:', e); }
  };
  window._setupSocket = _setupSocket;

  const _mapServerUser = (u, extra={}) => ({
    id:u.id, uid:u.id, username:u.username, email:u.email||'',
    emailVerified: u.emailVerified === true || u.email_verified === true,
    city:extra.city||u.city||'İstanbul', gender:extra.gender||u.gender||'erkek',
    money:extra.money!==undefined?extra.money:(u.money||10000),
    bankMoney:extra.bankMoney!==undefined?extra.bankMoney:(u.bankMoney||5000),
    bank:extra.bank!==undefined?extra.bank:(u.bankMoney||5000),
    underCoin:u.underCoin||50, xp:u.xp||0, level:u.level||1,
    meritPoints:u.meritPoints||0, loyaltyPoints:u.loyaltyPoints||100, hp:u.hp||100,
    health:u.hp||100, happiness:85, energy:100,
    role:u.role||'user', isAdmin:u.role==='admin', banned:u.banned||false,
    premium:false, vip:false,
    educationLevel:u.educationLevel||'ilkokul',
    educationCompleted:(u.educationProgress||0)>=100,
    educationProgress:u.educationProgress||0,
    education:u.gameData?.education || (u.educationLevel ? {diploma:u.educationLevel,activeLevel:null,clicksDone:0,lastClick:0} : {diploma:'ilkokul',activeLevel:null,clicksDone:0,lastClick:0}),
    packages:{}, achievements:u.gameData?.achievements||u.achievements||[],
    inventory:u.inventory||{}, badges:[],
    stats:u.gameData?.stats||u.stats||{trades:0,messages:0,crimes:0,votes:0,battles:0,farm:0},
    skills:u.skills||{trade:0,politics:0,crime:0,military:0,farming:0},
    registeredAt:u.createdAt?new Date(u.createdAt).getTime():Date.now(),
    lastOnline:Date.now(), loginStreak:1, lastLoginDate:new Date().toDateString(),
    createdAt:u.createdAt?new Date(u.createdAt).toLocaleDateString('tr-TR'):'',
    gameData:u.gameData||{}, ...extra
  });

  const doLogin = async () => {
    if (!f.username.trim() || !f.password) { setErr('Kullanıcı adı / e-posta ve şifre gerekli'); return; }
    setLoading(true); setErr('');
    const uname = f.username.trim();

    // ── Admin bypass (local) ──────────────────────────────────────────
    if (uname === 'admin' && f.password === 'admin123') {
      const users = getUsers();
      let adminUser = users.find(u => u.username==='admin'||u.role==='admin');
      if (!adminUser) adminUser = {
        id:'admin_001', uid:'admin_001', username:'admin', password:_hashPass('admin123'),
        email:'admin@understate.tr', city:'Ankara', gender:'erkek',
        money:999999999, bankMoney:999999999, bank:999999999, underCoin:99999,
        xp:999999, level:99, meritPoints:9999, loyaltyPoints:9999, hp:100,
        role:'admin', isAdmin:true, banned:false, premium:true, vip:true,
        educationLevel:'Profeör', educationCompleted:true, educationProgress:4000,
        eduPackage:true, packages:{edu:true}, registeredAt:Date.now(), lastOnline:Date.now(),
        loginStreak:1, lastLoginDate:new Date().toDateString(),
        createdAt:new Date().toLocaleDateString('tr-TR'),
        achievements:[], inventory:{}, badges:[],
        stats:{trades:0,messages:0,crimes:0,votes:0,battles:0,farm:0},
        skills:{trade:0,politics:0,crime:0,military:0,farming:0}
      };
      saveUsers(users.find(u=>u.username==='admin'||u.role==='admin')
        ? users.map(u=>(u.username==='admin'||u.role==='admin')?adminUser:u)
        : [...users, adminUser]);
      localStorage.setItem('userId', adminUser.id);
      localStorage.setItem('rep_userProfile', JSON.stringify(adminUser));
      _setupSocket(adminUser);
      setLoading(false); onLogin(adminUser); return;
    }

    // ── Server API login ─────────────────────────────────────────────────────────
    try {
      const res  = await fetch('/api/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ username:uname, password:f.password })
      });
      const data = await res.json();
      if (data.success) {
        const profile = _mapServerUser(data.user);
        localStorage.setItem('us_jwt', data.token);
        if (data.refreshToken) localStorage.setItem('us_refresh', data.refreshToken);
        localStorage.setItem('userId', profile.id);
        localStorage.setItem('rep_userProfile', JSON.stringify(profile));
        if (!profile.emailVerified) {
          setUnverifiedUser({ profile, token: data.token });
          setLoading(false); return;
        }
        _setupSocket(profile);
        setLoading(false); onLogin(profile); return;
      }
      setErr(data.message || 'Giriş başarısız');
      setLoading(false); return;
    } catch(netErr) {
      console.warn('[Login] Sunucu ulaşılamıyor, localStorage deneniyor:', netErr.message);
    }

    // ── localStorage fallback (ağ sor. / çevrimed.) ────────────────────────────────────────────────────────────
    const users  = getUsers();
    const hashed = _hashPass(f.password);
    const found  = users.find(u =>
      (u.username===uname || (u.email && u.email.toLowerCase()===uname.toLowerCase())) &&
      (u.password===hashed || u.password===f.password)
    );
    if (!found) { setErr('Kullanıcı adı veya şifre hatalı'); setLoading(false); return; }
    if (found.banned) { setErr('Bu hesap banlanmıştır: '+(found.banReason||'Kural ihlali')); setLoading(false); return; }
    let finalUser = { ...found, lastOnline:Date.now(), online:true };
    if (found.password===f.password) finalUser.password = hashed;
    saveUsers(users.map(u => u.id===found.id ? finalUser : u));
    localStorage.setItem('userId', found.id);
    localStorage.setItem('rep_userProfile', JSON.stringify(finalUser));
    _setupSocket(finalUser);
    setLoading(false);
    onLogin(finalUser);
  };

  const doRegister = async () => {
    if (!f.username.trim() || !f.password)    { setErr('Kullanıcı adı ve şifre gerekli'); return; }
    if (f.username.length < 3)                 { setErr('Kullanıcı adı en az 3 karakter'); return; }
    if (f.password.length < 6)                 { setErr('Şifre en az 6 karakter'); return; }
    if (!f.email.trim())                       { setErr('E-posta adresi zorunludur'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setErr('Geçerli bir e-posta adresi girin'); return; }
    setLoading(true); setErr('');
    const uname = f.username.trim();

    // ── Server API register ───────────────────────────────────────────────────────────
    try {
      const res  = await fetch('/api/auth/register', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ username:uname, email:f.email.trim(), password:f.password, inviteCode:(f.inviteCode||'').trim() })
      });
      const data = await res.json();
      if (data.success) {
        const profile = _mapServerUser(data.user, {
          city:f.city||'İstanbul',
          gender:f.gender==='female'?'kadin':'erkek',
          money:10000, bankMoney:5000, bank:5000, underCoin:50
        });
        localStorage.setItem('us_jwt', data.token);
        if (data.refreshToken) localStorage.setItem('us_refresh', data.refreshToken);
        localStorage.setItem('userId', profile.id);
        localStorage.setItem('rep_userProfile', JSON.stringify(profile));
        try {
          await fetch('/api/save', {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.token},
            body:JSON.stringify({ money:10000, bank:5000, level:1, xp:0,
              city:f.city||'İstanbul', under_coin:50, health:100,
              stats:profile.stats, inventory:{}, achievements:[] })
          });
        } catch(_) {}
        _setupSocket(profile);
        setLoading(false); onLogin(profile); return;
      }
      setErr(data.message || 'Kayıt başarısız');
      setLoading(false); return;
    } catch(netErr) {
      console.warn('[Register] Sunucu ulaşılamıyor, localStorage deneniyor:', netErr.message);
    }

    // ── localStorage fallback ────────────────────────────────────────────────────────────
    const users = getUsers();
    if (users.find(u => u.username===uname)) { setErr('Bu kullanıcı adı zaten alınmış'); setLoading(false); return; }
    const id = 'user_'+Date.now();
    const profile = {
      id, uid:id, username:uname, password:_hashPass(f.password),
      email:f.email.trim(), city:f.city, gender:f.gender==='female'?'kadin':'erkek',
      money:10000, bankMoney:5000, bank:5000, underCoin:50,
      xp:0, level:1, meritPoints:0, loyaltyPoints:100, hp:100,
      health:100, happiness:85, energy:100,
      role:'user', isAdmin:false, banned:false, premium:false, vip:false,
      registeredAt:Date.now(), lastOnline:Date.now(),
      loginStreak:1, lastLoginDate:new Date().toDateString(),
      createdAt:new Date().toLocaleDateString('tr-TR'),
      achievements:[], inventory:{}, badges:[],
      stats:{trades:0,messages:0,crimes:0,votes:0,battles:0,farm:0},
      skills:{trade:0,politics:0,crime:0,military:0,farming:0}
    };
    saveUsers([...users, profile]);
    localStorage.setItem('userId', id);
    localStorage.setItem('rep_userProfile', JSON.stringify(profile));
    _setupSocket(profile);
    setLoading(false);
    onLogin(profile);
  };

  const doResendVerify = async (token) => {
    setResendLoading(true); setResendMsg('');
    try {
      const res = await fetch('/api/auth/resend-verify', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}
      });
      const data = await res.json();
      setResendMsg(data.success ? '✅ Doğrulama maili gönderildi! Gelen kutunu kontrol et.' : ('⚠️ ' + (data.message||'Gönderim başarısız')));
    } catch {
      setResendMsg('⚠️ Bağlantı hatası, tekrar dene.');
    }
    setResendLoading(false);
  };

  const [barProgress, setBarProgress] = React.useState(0);
  useEffect(() => {
    if (!loading) { setBarProgress(0); return; }
    setBarProgress(0);
    const t = setTimeout(() => setBarProgress(100), 50);
    return () => clearTimeout(t);
  }, [loading]);

  const inputStyle = {
    width:'100%', padding:'0.85rem 1rem', borderRadius:'14px',
    border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.45)',
    color:'#E8EDF2', fontFamily:"'DM Sans',sans-serif", fontSize:'1rem',
    outline:'none', boxSizing:'border-box', backdropFilter:'blur(8px)',
    WebkitAppearance:'none'
  };

  if (unverifiedUser) {
    const { profile, token } = unverifiedUser;
    return (
      <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',overflowY:'auto',minHeight:'100dvh'}}>
        <div style={{position:'fixed',inset:0,backgroundImage:'url(understate-bg.jpg)',backgroundSize:'cover',backgroundPosition:'center top',backgroundRepeat:'no-repeat',zIndex:0}} />
        <div style={{position:'fixed',inset:0,background:'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 45%, rgba(0,0,0,0.92) 100%)',zIndex:1}} />
        <div style={{position:'relative',zIndex:2,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100dvh',padding:'2rem 1rem'}}>
          <div style={{width:'100%',maxWidth:'420px',background:'rgba(5,10,20,0.88)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'24px',padding:'2rem 1.5rem',backdropFilter:'blur(24px)',boxShadow:'0 24px 80px rgba(0,0,0,0.7)',textAlign:'center'}}>
            <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>📧</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.15rem',fontWeight:800,color:'#F59E0B',marginBottom:'0.5rem',letterSpacing:'0.04em'}}>E-POSTANI DOĞRULA</div>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:'0.85rem',lineHeight:1.6,marginBottom:'1.5rem'}}>
              <span style={{color:'#E8EDF2',fontWeight:600}}>{profile.email}</span> adresine bir doğrulama bağlantısı gönderdik.<br/>
              Maili açıp bağlantıya tıkladıktan sonra giriş yapabilirsin.
            </div>

            {resendMsg && (
              <div style={{background: resendMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${resendMsg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius:'10px', padding:'0.6rem 0.8rem', marginBottom:'1rem', fontSize:'0.82rem', color: resendMsg.startsWith('✅') ? '#6EE7B7' : '#FCA5A5'}}>
                {resendMsg}
              </div>
            )}

            <button
              onClick={() => doResendVerify(token)}
              disabled={resendLoading}
              style={{width:'100%',padding:'0.9rem',borderRadius:'12px',border:'none',background:resendLoading?'rgba(245,158,11,0.3)':'rgba(245,158,11,0.2)',color:'#F59E0B',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.95rem',cursor:resendLoading?'not-allowed':'pointer',marginBottom:'0.75rem',border:'1px solid rgba(245,158,11,0.35)',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',transition:'all 0.2s'}}>
              {resendLoading ? <><div style={{width:16,height:16,border:'2px solid rgba(245,158,11,0.3)',borderTopColor:'#F59E0B',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} /> Gönderiliyor...</> : '📨 Tekrar Gönder'}
            </button>

            <button
              onClick={() => { _setupSocket(profile); onLogin(profile); }}
              style={{width:'100%',padding:'0.9rem',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)',fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:'0.88rem',cursor:'pointer',marginBottom:'0.75rem',transition:'all 0.2s'}}>
              Şimdilik Atla →
            </button>

            <button
              onClick={() => { setUnverifiedUser(null); setResendMsg(''); }}
              style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',fontSize:'0.78rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",textDecoration:'underline',padding:'4px 8px'}}>
              ← Farklı hesapla giriş yap
            </button>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',overflowY:'auto',minHeight:'100dvh'}}>
      {/* City background image */}
      <div style={{position:'fixed',inset:0,backgroundImage:'url(understate-bg.jpg)',backgroundSize:'cover',backgroundPosition:'center top',backgroundRepeat:'no-repeat',zIndex:0}} />
      {/* Dark overlay */}
      <div style={{position:'fixed',inset:0,background:'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 45%, rgba(0,0,0,0.92) 100%)',zIndex:1}} />

      {/* Content */}
      <div style={{position:'relative',zIndex:2,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100dvh',padding:'env(safe-area-inset-top,1rem) 0 env(safe-area-inset-bottom,1rem)'}}>

        {/* Logo block */}
        <div style={{textAlign:'center',marginBottom:'1.5rem',width:'100%',padding:'0 1.5rem'}}>
          {/* Logo görseli */}
          <div style={{display:'flex',justifyContent:'center',marginBottom:'0.5rem'}}>
            <img src="favicon.jpg" alt="UnderState" style={{width:'clamp(90px,22vw,140px)',height:'clamp(90px,22vw,140px)',objectFit:'contain',borderRadius:'50%',boxShadow:'0 0 40px rgba(59,130,246,0.4)',border:'3px solid rgba(255,255,255,0.12)'}} />
          </div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(1.4rem,5vw,2.2rem)',fontWeight:900,letterSpacing:'0.15em',color:'#fff',textShadow:'0 2px 24px rgba(0,0,0,0.8)',textTransform:'uppercase',marginBottom:'0.4rem'}}>
            UNDERSTATE
          </div>
          {/* Animated loading bar */}
          <div style={{width:'100%',maxWidth:'320px',margin:'0 auto',height:'3px',background:'rgba(255,255,255,0.15)',borderRadius:'2px',overflow:'hidden'}}>
            <div style={{height:'100%',width:loading?`${barProgress}%`:'0%',background:'linear-gradient(90deg,#3B82F6,#fff,#3B82F6)',borderRadius:'2px',transition:loading?'width 1.8s cubic-bezier(0.4,0,0.2,1)':'none',boxShadow:'0 0 8px rgba(59,130,246,0.8)'}} />
          </div>
          <div style={{color:'rgba(255,255,255,0.35)',fontSize:'0.65rem',letterSpacing:'0.15em',textTransform:'uppercase',fontFamily:"'DM Sans',sans-serif",marginTop:'0.4rem'}}>
            Şehir & Devlet Simülasyonu • v{APP_V}
          </div>
        </div>

        {/* Panel — full width on mobile */}
        <div style={{width:'100%',maxWidth:'480px',padding:'0 1rem'}}>
          <form onSubmit={e=>{e.preventDefault();tab==='login'?doLogin():doRegister();}} autoComplete="on">
          <div style={{background:'rgba(5,10,20,0.82)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'24px',padding:'1.75rem 1.5rem',backdropFilter:'blur(24px)',boxShadow:'0 24px 80px rgba(0,0,0,0.7)'}}>

            {/* Tabs */}
            <div style={{display:'flex',gap:'8px',marginBottom:'1.5rem'}}>
              {[['login','→ Giriş Yap'],['register','Kayıt Ol']].map(([v,l]) => (
                <button key={v} type="button" onClick={() => {setTab(v);setErr('');}}
                  style={{
                    flex:1, padding:'0.7rem', borderRadius:'8px',
                    cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
                    fontWeight:700, fontSize:'0.88rem', letterSpacing:'0.03em',
                    position:'relative', overflow:'hidden',
                    border: tab===v ? '1.5px solid #00C9FF' : '1px solid rgba(255,255,255,0.1)',
                    background: tab===v ? 'rgba(0,201,255,0.12)' : 'rgba(255,255,255,0.04)',
                    color: tab===v ? '#00C9FF' : 'rgba(255,255,255,0.4)',
                    boxShadow: tab===v ? '0 2px 14px rgba(0,201,255,0.2)' : 'none',
                  }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Error */}
            {err && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'12px',padding:'0.7rem 1rem',color:'#FCA5A5',fontSize:'0.85rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>⚠️ {err}</div>}

            {/* Login fields */}
            <div style={{marginBottom:'1rem'}}>
              <input style={inputStyle} type="text" placeholder="Kullanıcı adı veya e-posta" value={f.username} onChange={e=>u('username',e.target.value)} autoComplete="username" />
            </div>
            <div style={{marginBottom:'1.25rem',position:'relative'}}>
              <input style={inputStyle} type={showPw?'text':'password'} placeholder={tab==='register'?'Şifre (en az 6 karakter)':'Şifre'} value={f.password} onChange={e=>u('password',e.target.value)} autoComplete={tab==='register'?'new-password':'current-password'} />
              <button type="button" onClick={()=>setShowPw(p=>!p)} style={{position:'absolute',right:'1rem',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'1rem',padding:'4px'}}>{showPw?'🙈':'👁️'}</button>
            </div>

            {tab==='register' && <>
              <div style={{marginBottom:'1rem'}}>
                <input style={inputStyle} type="email" placeholder="E-posta adresi (zorunlu)" value={f.email} onChange={e=>u('email',e.target.value)} autoComplete="email" />
              </div>
              <div style={{marginBottom:'1rem'}}>
                <select value={f.city} onChange={e=>u('city',e.target.value)}
                  style={{...inputStyle,color:f.city?'#E8EDF2':'rgba(255,255,255,0.4)'}}>
                  {CITIES.map(c=><option key={c} value={c} style={{background:'#0B1527'}}>{c}</option>)}
                </select>
              </div>
              <div style={{marginBottom:'1rem'}}>
                <input style={inputStyle} type="text" placeholder="🔑 Davet kodu (kapalı beta)" value={f.inviteCode||''} onChange={e=>u('inviteCode',e.target.value)} autoComplete="off" />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1.25rem'}}>
                {[['male','👨 Erkek'],['female','👩 Kadın']].map(([v,l])=>(
                  <button key={v} type="button" onClick={()=>u('gender',v)}
                    style={{padding:'0.75rem',borderRadius:'14px',border:`1px solid ${f.gender===v?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.08)'}`,background:f.gender===v?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.03)',color:f.gender===v?'#fff':'rgba(255,255,255,0.4)',fontFamily:"'DM Sans',sans-serif",fontWeight:700,cursor:'pointer',fontSize:'0.9rem',transition:'all 0.15s'}}>
                    {l}
                  </button>
                ))}
              </div>
            </>}

            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'1rem',borderRadius:'8px',border:'2px solid transparent',background:loading?'rgba(208,0,0,0.3)':'#D00000',color:'#fff',fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1rem',letterSpacing:'0.08em',cursor:loading?'not-allowed':'pointer',transition:'all 0.2s ease',textTransform:'uppercase',boxShadow:loading?'none':'0 4px 24px rgba(208,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem'}}>
              {loading ? <>
                <div style={{width:'18px',height:'18px',border:'2.5px solid rgba(255,255,255,0.2)',borderTopColor:'rgba(255,255,255,0.7)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
                <span>Lütfen bekleyin...</span>
              </> : (tab==='login' ? '→ Giriş Yap' : '→ Hesap Oluştur')}
            </button>

          
            {tab==='login' && (
              <div style={{textAlign:'center',marginTop:'1rem'}}>
                <button type="button"
                  onClick={()=>{ if(window._USForgot) window._USForgot.open(); }}
                  style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',fontSize:'0.8rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",textDecoration:'underline',textDecorationColor:'rgba(255,255,255,0.15)',letterSpacing:'0.02em',padding:'4px 8px'}}
                  onMouseOver={e=>e.target.style.color='rgba(255,255,255,0.7)'}
                  onMouseOut={e=>e.target.style.color='rgba(255,255,255,0.35)'}>
                  Sifremi unuttum?
                </button>
              </div>
            )}
</div>
          </form>
        </div>

        {/* Language Selector */}
        <div style={{marginTop:'1rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',position:'relative',zIndex:2}}>
          {[['🇹🇷','tr'],['🇬🇧','en'],['🇩🇪','de'],['🇦🇿','az']].map(([flag,code])=>(
            <button key={code} type="button"
              onClick={()=>{ try { const p=JSON.parse(localStorage.getItem('rep_userProfile')||'{}'); p.lang=code; localStorage.setItem('rep_userProfile',JSON.stringify(p)); } catch(e){} localStorage.setItem('rep_uiLang',code); window.dispatchEvent(new CustomEvent('lang-change',{detail:{lang:code}})); }}
              style={{width:'38px',height:'38px',borderRadius:'50%',border:'2px solid rgba(255,255,255,0.15)',background:'rgba(0,0,0,0.4)',fontSize:'1.3rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s',backdropFilter:'blur(4px)'}}
              title={code.toUpperCase()}
            >{flag}</button>
          ))}
        </div>
        <div style={{marginTop:'0.75rem',color:'rgba(255,255,255,0.2)',fontSize:'0.68rem',textAlign:'center',position:'relative',zIndex:1,letterSpacing:'0.08em'}}>
          🔒 UnderState • Güvenli Giriş
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Forgot Password Modal ─────────────────────────────────── */}
      {showForgot && (
        <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1.25rem',background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)'}}>
          <div style={{background:'linear-gradient(135deg,#0B1527,#0F1F36)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'20px',padding:'1.75rem 1.5rem',width:'100%',maxWidth:'380px',boxShadow:'0 24px 64px rgba(0,0,0,0.6)'}}>
            <div style={{textAlign:'center',marginBottom:'1.25rem'}}>
              <div style={{fontSize:'2rem',marginBottom:'0.35rem'}}>🔑</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,color:'#E8EDF2',fontSize:'1.2rem',marginBottom:'0.25rem'}}>Şifremi Unuttum</div>
              <div style={{fontSize:'0.78rem',color:'#5A7089'}}>E-posta adresinize sıfırlama bağlantısı göndereceğiz</div>
            </div>
            {forgotMsg && (
              <div style={{background:forgotMsg.startsWith('✅')?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${forgotMsg.startsWith('✅')?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,borderRadius:'10px',padding:'0.6rem 0.85rem',marginBottom:'0.85rem',fontSize:'0.82rem',color:forgotMsg.startsWith('✅')?'#6EE7B7':'#FCA5A5',textAlign:'center'}}>
                {forgotMsg}
              </div>
            )}
            <input
              type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)}
              placeholder="E-posta adresiniz"
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.75rem 1rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box',marginBottom:'0.75rem'}}
              onKeyDown={e=>{ if(e.key==='Enter') doForgot(); }}
            />
            <button disabled={forgotLoading || forgotMsg.startsWith('✅')} onClick={async()=>{
              if(!forgotEmail.trim()){setForgotMsg('⚠️ E-posta adresinizi girin');return;}
              setForgotLoading(true);
              try{
                const r=await fetch('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:forgotEmail.trim().toLowerCase()})});
                const d=await r.json();
                setForgotMsg(d.success?'✅ Sıfırlama bağlantısı gönderildi! E-postanı kontrol et.':'⚠️ '+(d.message||'Hata oluştu'));
              }catch{setForgotMsg('⚠️ Bağlantı hatası');}
              setForgotLoading(false);
            }} style={{width:'100%',padding:'0.85rem',borderRadius:'10px',border:'none',background:forgotLoading?'rgba(59,130,246,0.3)':'rgba(59,130,246,0.9)',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.95rem',cursor:forgotLoading?'not-allowed':'pointer',marginBottom:'0.5rem',transition:'all 0.2s'}}>
              {forgotLoading ? 'Gönderiliyor...' : '📨 Bağlantı Gönder'}
            </button>
            <button onClick={()=>setShowForgot(false)} style={{width:'100%',padding:'0.65rem',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:'0.9rem',cursor:'pointer'}}>
              İptal
            </button>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ──────────────────────────────────── */}
      {showReset && (
        <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1.25rem',background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)'}}>
          <div style={{background:'linear-gradient(135deg,#0B1527,#0F1F36)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'20px',padding:'1.75rem 1.5rem',width:'100%',maxWidth:'380px',boxShadow:'0 24px 64px rgba(0,0,0,0.6)'}}>
            <div style={{textAlign:'center',marginBottom:'1.25rem'}}>
              <div style={{fontSize:'2rem',marginBottom:'0.35rem'}}>🔒</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,color:'#E8EDF2',fontSize:'1.2rem',marginBottom:'0.25rem'}}>Yeni Şifre Belirle</div>
              <div style={{fontSize:'0.78rem',color:'#5A7089'}}>Güçlü bir şifre seçin (min 8 karakter)</div>
            </div>
            {resetMsg && (
              <div style={{background:resetMsg.startsWith('✅')?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${resetMsg.startsWith('✅')?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,borderRadius:'10px',padding:'0.6rem 0.85rem',marginBottom:'0.85rem',fontSize:'0.82rem',color:resetMsg.startsWith('✅')?'#6EE7B7':'#FCA5A5',textAlign:'center'}}>
                {resetMsg}
              </div>
            )}
            <input
              type="password" value={resetPw} onChange={e=>setResetPw(e.target.value)}
              placeholder="Yeni şifre" autoComplete="new-password"
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.75rem 1rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box',marginBottom:'0.5rem'}}
            />
            <input
              type="password" value={resetPw2} onChange={e=>setResetPw2(e.target.value)}
              placeholder="Yeni şifre (tekrar)" autoComplete="new-password"
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.75rem 1rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box',marginBottom:'0.75rem'}}
            />
            <button disabled={resetLoading||resetMsg.startsWith('✅')} onClick={async()=>{
              if(!resetPw||resetPw.length<6){setResetMsg('⚠️ Şifre en az 6 karakter olmalı');return;}
              if(resetPw!==resetPw2){setResetMsg('⚠️ Şifreler eşleşmiyor');return;}
              setResetLoading(true);
              try{
                const r=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:resetData?.token,userId:resetData?.userId,newPassword:resetPw})});
                const d=await r.json();
                if(d.success){setResetMsg('✅ Şifren güncellendi! Giriş yapabilirsin.'); setTimeout(()=>setShowReset(false),2000);}
                else setResetMsg('⚠️ '+(d.message||'Hata oluştu'));
              }catch{setResetMsg('⚠️ Bağlantı hatası');}
              setResetLoading(false);
            }} style={{width:'100%',padding:'0.85rem',borderRadius:'10px',border:'none',background:resetLoading?'rgba(59,130,246,0.3)':'rgba(59,130,246,0.9)',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.95rem',cursor:resetLoading?'not-allowed':'pointer',marginBottom:'0.5rem',transition:'all 0.2s'}}>
              {resetLoading ? 'Güncelleniyor...' : '🔒 Şifreyi Kaydet'}
            </button>
            <button onClick={()=>setShowReset(false)} style={{width:'100%',padding:'0.65rem',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:'0.9rem',cursor:'pointer'}}>
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

