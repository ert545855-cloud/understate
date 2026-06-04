// ═══════════════════════════════════════════════════════
// PROFİL SAYFASI
// ═══════════════════════════════════════════════════════
function ProfilePage({ profile, setProfile, onLogout, showNotif }) {
  const { dark, toggle } = useTheme();
  const lvl = getLevelInfo(profile?.xp || 0);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ username: profile?.username||'', city: profile?.city||'İstanbul' });
  const [tab, setTab] = useState('stats');
  const [photoUrlInput, setPhotoUrlInput] = useState(profile?.photoUrl||'');
  const [avatarUrlInput, setAvatarUrlInput] = useState(profile?.avatarUrl||'');
  const [bannerUrlInput, setBannerUrlInput] = useState(profile?.bannerUrl||'');
  const fileInputRef = useRef(null);

  // ── Yeni state'ler ───────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current:'', newPw:'', confirm:'' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [streak, setStreak] = useState(null);
  const [streakLoading, setStreakLoading] = useState(false);
  const [referralCode, setReferralCode] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [loanAmt, setLoanAmt] = useState('');
  const [twoFAStatus, setTwoFAStatus] = useState(null);
  const [twoFASetup, setTwoFASetup] = useState(null);
  const [twoFAToken, setTwoFAToken] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('us_jwt');
    if (!token) return;
    if (tab === 'settings') {
      fetch('/api/streak', { headers:{ Authorization:`Bearer ${token}` } })
        .then(r=>r.json()).then(d=>{ if(d.success) setStreak(d.streak); }).catch(()=>{});
      fetch('/api/profile/referral', { headers:{ Authorization:`Bearer ${token}` } })
        .then(r=>r.json()).then(d=>{ if(d.success) setReferralCode(d.referralCode); }).catch(()=>{});
      if (twoFAStatus === null)
        fetch('/api/auth/2fa/status', { headers:{ Authorization:`Bearer ${token}` } })
          .then(r=>r.json()).then(d=>{ if(d.success !== undefined) setTwoFAStatus(!!d.enabled); }).catch(()=>{});
    }
    if (tab === 'kredi') {
      setLoansLoading(true);
      fetch('/api/loans', { headers:{ Authorization:`Bearer ${token}` } })
        .then(r=>r.json()).then(d=>{ setLoans(d.loans||[]); setLoansLoading(false); })
        .catch(()=>setLoansLoading(false));
    }
  }, [tab]);

  const _fetchLoans = () => {
    const token = localStorage.getItem('us_jwt');
    if (!token) return;
    fetch('/api/loans', { headers:{ Authorization:`Bearer ${token}` } })
      .then(r=>r.json()).then(d=>setLoans(d.loans||[])).catch(()=>{});
  };

  const doChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw) { setPwMsg('⚠️ Tüm alanları doldurun'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg('⚠️ Şifreler eşleşmiyor'); return; }
    if (pwForm.newPw.length < 6) { setPwMsg('⚠️ En az 6 karakter'); return; }
    setPwLoading(true); setPwMsg('');
    try {
      const token = localStorage.getItem('us_jwt');
      const r = await fetch('/api/auth/change-password', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body: JSON.stringify({ currentPassword:pwForm.current, newPassword:pwForm.newPw })
      });
      const d = await r.json();
      setPwMsg(d.success ? '✅ Şifre güncellendi!' : '⚠️ '+(d.message||'Hata'));
      if (d.success) setPwForm({ current:'', newPw:'', confirm:'' });
    } catch { setPwMsg('⚠️ Bağlantı hatası'); }
    setPwLoading(false);
  };

  const doClaimStreak = async () => {
    setStreakLoading(true);
    try {
      const token = localStorage.getItem('us_jwt');
      const r = await fetch('/api/streak/claim', { method:'POST', headers:{ Authorization:`Bearer ${token}` } });
      const d = await r.json();
      if (d.success) {
        showNotif(`🎁 +${(d.reward?.money||0).toLocaleString('tr-TR')}₺ +${d.reward?.xp||0}XP!`, 'success');
        setStreak(prev => prev ? { ...prev, current_streak:d.streak, last_claim_date:new Date().toISOString().slice(0,10) } : prev);
        if (d.reward) setProfile(p => ({ ...p, money:(p.money||0)+(d.reward.money||0), xp:(p.xp||0)+(d.reward.xp||0) }));
      } else {
        showNotif(d.message || 'Ödül alınamadı', 'error');
      }
    } catch { showNotif('Bağlantı hatası', 'error'); }
    setStreakLoading(false);
  };

  const doSetup2FA = async () => {
    const token = localStorage.getItem('us_jwt');
    const r = await fetch('/api/auth/2fa/setup', { headers:{ Authorization:`Bearer ${token}` } });
    const d = await r.json();
    if (d.success) setTwoFASetup(d);
    else showNotif('⚠️ '+(d.message||'2FA kurulum hatası'), 'error');
  };

  const doEnable2FA = async () => {
    if (!twoFAToken || twoFAToken.length < 6) { showNotif('6 haneli kod girin', 'error'); return; }
    const token = localStorage.getItem('us_jwt');
    const r = await fetch('/api/auth/2fa/enable', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({ token: twoFAToken })
    });
    const d = await r.json();
    if (d.success) { setTwoFAStatus(true); setTwoFASetup(null); setTwoFAToken(''); showNotif('✅ 2FA etkinleştirildi!', 'success'); }
    else showNotif('⚠️ '+(d.message||'Hatalı kod'), 'error');
  };

  const doDisable2FA = async () => {
    if (!twoFAToken || twoFAToken.length < 6) { showNotif('6 haneli kod girin', 'error'); return; }
    const token = localStorage.getItem('us_jwt');
    const r = await fetch('/api/auth/2fa/disable', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({ token: twoFAToken })
    });
    const d = await r.json();
    if (d.success) { setTwoFAStatus(false); setTwoFAToken(''); showNotif('2FA devre dışı bırakıldı', 'info'); }
    else showNotif('⚠️ '+(d.message||'Hatalı kod'), 'error');
  };

  const doRequestLoan = async () => {
    const amt = parseInt(loanAmt);
    if (!amt || amt < 1000) { showNotif('Minimum 1.000₺ kredi alabilirsiniz', 'error'); return; }
    const token = localStorage.getItem('us_jwt');
    const r = await fetch('/api/loans/request', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({ amount: amt })
    });
    const d = await r.json();
    if (d.success) {
      showNotif(`✅ ${amt.toLocaleString('tr-TR')}₺ hesabınıza yüklendi!`, 'success');
      setProfile(p => ({ ...p, money:(p.money||0)+amt }));
      setLoanAmt('');
      _fetchLoans();
    } else {
      showNotif('⚠️ '+(d.message||'Kredi alınamadı'), 'error');
    }
  };

  const doRepayLoan = async (loanId, amount) => {
    const token = localStorage.getItem('us_jwt');
    const r = await fetch(`/api/loans/repay/${loanId}`, {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({ amount })
    });
    const d = await r.json();
    if (d.success) {
      showNotif(d.closed ? '✅ Krediniz kapatıldı!' : `✅ ${amount.toLocaleString('tr-TR')}₺ ödendi`, 'success');
      setProfile(p => ({ ...p, money:(p.money||0)-amount }));
      _fetchLoans();
    } else {
      showNotif('⚠️ '+(d.message||'Ödeme başarısız'), 'error');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showNotif('Sadece resim dosyaları desteklenir', 'error'); return; }
    if (file.size > 3 * 1024 * 1024) { showNotif('Dosya 3MB\'dan küçük olmalı', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const u = {...profile, avatarUrl: dataUrl};
      setProfile(u);
      localStorage.setItem('rep_userProfile', JSON.stringify(u));
      if (u.uid) { try { await saveUserProfile(u.uid, u); } catch {} }
      showNotif('✅ Profil fotoğrafı yüklendi!', 'success');
    };
    reader.readAsDataURL(file);
  };
  const inputSt = {width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'};
  const savePhotoUrl = async () => {
    const u = {...profile, photoUrl: photoUrlInput.trim()};
    setProfile(u); localStorage.setItem('rep_userProfile', JSON.stringify(u));
    if (u.uid) await saveUserProfile(u.uid, u);
    showNotif('✅ Profil fotoğrafı güncellendi', 'success');
  };
  const saveAvatarUrl = async () => {
    const u = {...profile, avatarUrl: avatarUrlInput.trim()};
    setProfile(u); localStorage.setItem('rep_userProfile', JSON.stringify(u));
    if (u.uid) await saveUserProfile(u.uid, u);
    showNotif('✅ GIF avatar güncellendi', 'success');
  };
  const saveVipFrame = async (frameId) => {
    const u = {...profile, vipFrame: frameId};
    setProfile(u); localStorage.setItem('rep_userProfile', JSON.stringify(u));
    if (u.uid) await saveUserProfile(u.uid, u);
    showNotif(`✅ Çerçeve seçildi: ${frameId||'Yok'}`, 'success');
  };
  const saveBannerUrl = async () => {
    const u = {...profile, bannerUrl: bannerUrlInput.trim()};
    setProfile(u); localStorage.setItem('rep_userProfile', JSON.stringify(u));
    if (u.uid) await saveUserProfile(u.uid, u);
    showNotif('✅ Banner güncellendi', 'success');
  };

  const saveProfile = async () => {
    if (!editForm.username.trim()) { showNotif('Kullanıcı adı boş olamaz', 'error'); return; }
    const updated = { ...profile, username:editForm.username.trim(), city:editForm.city };
    setProfile(updated);
    localStorage.setItem('rep_userProfile', JSON.stringify(updated));
    if (profile?.uid) await saveUserProfile(profile.uid, updated);
    setEditModal(false);
    showNotif('✅ Profil güncellendi', 'success');
  };

  const lsState = {};
  ['parties','holdings','stockPortfolio','gangs','laws','elections','userFarms','alliances'].forEach(k=>{
    try{const v=localStorage.getItem('rep_'+k);lsState[k]=v?JSON.parse(v):null;}catch{}
  });
  const achievements = ACHIEVEMENTS_LIST.map(a => {
    let done = false;
    try { done = a.check(profile||{}, lsState); } catch{}
    return { id:a.id, name:a.title, icon:a.icon, desc:a.desc, done:!!done };
  });
  const earnedCount = achievements.filter(a=>a.done).length;

  return (
    <div style={{padding:'0.7rem'}}>
      {/* Profil kartı */}
      <div style={{marginBottom:'0.75rem',borderRadius:'16px',overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)',boxShadow:'0 4px 24px rgba(0,0,0,0.35)'}}>
        {profile?.bannerUrl && (
          <div style={{height:'80px',backgroundImage:`url(${profile.bannerUrl})`,backgroundSize:'cover',backgroundPosition:'center',position:'relative'}}>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(11,21,39,0.7))'}}/>
          </div>
        )}
        <div style={{textAlign:'center',padding:'1.25rem 1rem',background:'linear-gradient(135deg,rgba(11,21,39,0.97),rgba(15,31,54,0.95))'}}>
          <div style={{marginBottom:'0.65rem',marginTop:profile?.bannerUrl?'-28px':'0',position:'relative',display:'inline-block'}}>
            <Avatar profile={profile} size={72} />
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem',marginBottom:'0.2rem'}}>
            <div style={{fontWeight:900,fontSize:'1.15rem',color:'#E8EDF2'}}>{profile?.username || 'Oyuncu'}</div>
            {profile?.premium && <span style={{background:'linear-gradient(90deg,#F59E0B,#D97706)',color:'#000',fontSize:'0.55rem',fontWeight:800,padding:'2px 6px',borderRadius:'8px'}}>VIP</span>}
          </div>
          <div style={{fontSize:'0.75rem',color:'#5A7089',marginBottom:'0.65rem'}}>{lvl.title} • {profile?.city} • Üye: {profile?.registeredAt ? new Date(profile.registeredAt).toLocaleDateString('tr-TR') : '-'}</div>
          <div style={{marginBottom:'0.4rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.65rem',color:'#5A7089',marginBottom:'0.25rem'}}>
              <span>Lv.{lvl.lvl}</span><span>{fmt(profile?.xp||0)} / {fmt(lvl.next.xp)} XP</span><span>Lv.{lvl.next.lvl}</span>
            </div>
            <ProgressBar pct={lvl.pct} color='#3B82F6' h={8} />
          </div>
          <div style={{display:'flex',gap:'0.4rem',justifyContent:'center',marginTop:'0.65rem'}}>
            <Btn variant='ghost' size='sm' onClick={()=>setEditModal(true)}>✏️ Düzenle</Btn>
            <Btn variant='danger' size='sm' onClick={onLogout}>🚪 Çıkış</Btn>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'4px',marginBottom:'0.75rem'}}>
        {[['stats','📊'],['achievements',`🏆(${earnedCount})`],['customize','📸'],['settings','⚙️ Ayarlar'],['kredi','💳 Kredi']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:'0.4rem 0.2rem',borderRadius:'8px',border:`1px solid ${tab===v?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.07)'}`,background:tab===v?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.03)',color:tab===v?'#60A5FA':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.65rem',cursor:'pointer',whiteSpace:'nowrap'}}>
            {l}
          </button>
        ))}
      </div>

      {tab==='stats' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.5rem'}}>
            {[
              ['💰','Nakit',fmtM(profile?.money),'#10B981'],
              ['🏦','Banka',fmtM(profile?.bank),'#3B82F6'],
              ['🪙','UnderCoin',fmtUC(profile?.underCoin),'#F59E0B'],
              ['🏅','Liyakat',fmt(profile?.meritPoints),'#8B5CF6'],
              ['🤝','Ticaret Puanı',fmt(profile?.tradePoints),'#06B6D4'],
              ['🎓','Eğitim',EDU_LEVELS.find(e=>e.id===(profile?.education?.diploma||'ilkokul'))?.label||'İlkokul','#3B82F6'],
              ['❤️','Sağlık',`${profile?.health||100}%`,'#EF4444'],
              ['😊','Mutluluk',`${profile?.happiness||80}%`,'#EC4899'],
              ['⚡','Enerji',`${profile?.energy||100}%`,'#F59E0B'],
              ['📊','Seviye',`Lv.${profile?.level||1}`,'#3B82F6'],
            ].map(([ic,lb,v,c])=>(
              <Card key={lb} style={{padding:'0.75rem'}}>
                <div style={{fontSize:'0.6rem',color:'#5A7089',textTransform:'uppercase',marginBottom:'0.2rem'}}>{ic} {lb}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:c,fontSize:'0.95rem'}}>{v}</div>
              </Card>
            ))}
          </div>
          <Card>
            <div style={{fontSize:'0.72rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',marginBottom:'0.6rem'}}>📈 Aktivite</div>
            {[['💬','Mesaj',profile?.stats?.messages||0],['🤝','Ticaret',profile?.stats?.trades||0],['⚔️','Savaş',profile?.stats?.battles||0],['🗳️','Oy',profile?.stats?.votes||0]].map(([ic,lb,v])=>(
              <div key={lb} style={{display:'flex',justifyContent:'space-between',padding:'0.45rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <span style={{color:'#8BA0B5',fontSize:'0.85rem'}}>{ic} {lb}</span>
                <span style={{color:'#E8EDF2',fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:'0.85rem'}}>{fmt(v)}</span>
              </div>
            ))}
          </Card>
          {/* Oy Katsayısı Kartı */}
          {(()=>{
            const allU=(()=>{try{return JSON.parse(localStorage.getItem('rep_users')||'[]');}catch{return[];}})();
            // Ticaret sıralaması
            const sortedTrade=[...allU].sort((a,b)=>(b.tradePoints||0)-(a.tradePoints||0));
            const tradeRank=sortedTrade.findIndex(u=>u.id===profile?.id)+1;
            const tradeBonus=tradeRank===1?6:tradeRank===2?4:tradeRank<=5?3:tradeRank<=50?2:1;
            const tradeColor=tradeBonus>=6?'#F59E0B':tradeBonus>=4?'#FB923C':tradeBonus>=3?'#A78BFA':tradeBonus>=2?'#60A5FA':'#5A7089';
            const tradeLabel=tradeBonus===6?'🏆 1. Sıra':tradeBonus===4?'🥈 2. Sıra':tradeBonus===3?'🥉 3-5. Sıra':tradeBonus===2?'📈 6-50. Sıra':'51+. Sıra';
            // Eğitim sıralaması
            const sortedEdu=[...allU].sort((a,b)=>(b.educationProgress||0)-(a.educationProgress||0));
            const eduRank=sortedEdu.findIndex(u=>u.id===profile?.id)+1;
            const eduBonus=eduRank===1?3:eduRank<=3?2:eduRank<=10?1:0;
            const eduColor=eduBonus>=3?'#F59E0B':eduBonus>=2?'#A78BFA':eduBonus>=1?'#60A5FA':'#5A7089';
            const eduLabel=eduBonus===3?'🏆 1. Sıra':eduBonus===2?'🥈 2-3. Sıra':eduBonus===1?'🥉 4-10. Sıra':'—';
            // UC katsayısı
            const ucBonus=profile?.voteMultiplier||0;
            // Toplam
            const total=tradeBonus+eduBonus+ucBonus;
            const totalColor=total>=8?'#F59E0B':total>=5?'#A78BFA':total>=3?'#60A5FA':'#10B981';
            return (
              <Card style={{marginTop:'0.5rem',background:'rgba(59,130,246,0.04)',border:'1px solid rgba(59,130,246,0.18)'}}>
                <div style={{fontSize:'0.72rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',marginBottom:'0.6rem'}}>🗳️ Oy Katsayısı Detayı</div>
                {/* Ticaret Sıralaması */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.38rem 0.4rem',borderRadius:'6px',background:'rgba(96,165,250,0.05)',marginBottom:'0.25rem'}}>
                  <div>
                    <span style={{color:'#8BA0B5',fontSize:'0.8rem'}}>📊 Ticaret Sıralaması</span>
                    <span style={{color:'#5A7089',fontSize:'0.68rem',marginLeft:'0.3rem'}}>#{tradeRank>0?tradeRank:'?'}</span>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span style={{color:tradeColor,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",fontSize:'0.78rem'}}>{tradeLabel}</span>
                    <span style={{color:tradeColor,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",fontSize:'0.82rem',marginLeft:'0.4rem'}}>{tradeBonus}x</span>
                  </div>
                </div>
                {/* Eğitim Sıralaması */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.38rem 0.4rem',borderRadius:'6px',background:'rgba(167,139,250,0.05)',marginBottom:'0.25rem'}}>
                  <div>
                    <span style={{color:'#8BA0B5',fontSize:'0.8rem'}}>🎓 Eğitim Sıralaması</span>
                    <span style={{color:'#5A7089',fontSize:'0.68rem',marginLeft:'0.3rem'}}>#{eduRank>0?eduRank:'?'}</span>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span style={{color:eduColor,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",fontSize:'0.78rem'}}>{eduLabel}</span>
                    <span style={{color:eduBonus>0?eduColor:'#3B4E63',fontWeight:900,fontFamily:"'JetBrains Mono',monospace",fontSize:'0.82rem',marginLeft:'0.4rem'}}>{eduBonus>0?`+${eduBonus}`:'—'}</span>
                  </div>
                </div>
                {/* UC Katsayısı */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.38rem 0.4rem',borderRadius:'6px',background:'rgba(245,158,11,0.05)',marginBottom:'0.3rem'}}>
                  <div>
                    <span style={{color:'#8BA0B5',fontSize:'0.8rem'}}>🪙 UnderCoin Katsayısı</span>
                    <span style={{color:'#5A7089',fontSize:'0.68rem',marginLeft:'0.3rem'}}>Ekonomi→UC</span>
                  </div>
                  <span style={{color:ucBonus>0?'#F59E0B':'#3B4E63',fontWeight:900,fontFamily:"'JetBrains Mono',monospace",fontSize:'0.82rem'}}>{ucBonus>0?`+${ucBonus}`:'—'}</span>
                </div>
                {/* Toplam */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.45rem 0.6rem',borderRadius:'8px',background:'rgba(16,185,129,0.08)',border:`1px solid ${totalColor}30`}}>
                  <span style={{color:'#E8EDF2',fontSize:'0.82rem',fontWeight:700}}>⚡ Toplam Oy Katsayısı</span>
                  <span style={{color:totalColor,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",fontSize:'1rem'}}>{total}x</span>
                </div>
                {/* Açıklama */}
                <div style={{fontSize:'0.59rem',color:'#5A7089',marginTop:'0.4rem',lineHeight:1.5}}>
                  <div>📊 Ticaret: 1.→6x · 2.→4x · 3-5.→3x · 6-50.→2x · 51+→1x</div>
                  <div>🎓 Eğitim: 1.→+3 · 2-3.→+2 · 4-10.→+1</div>
                  <div>🪙 UC: Her 500 UC → +1 katsayı (Ekonomi → Dönüşüm)</div>
                </div>
              </Card>
            );
          })()}
        </div>
      )}

      {tab==='achievements' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
          {achievements.map(a => (
            <Card key={a.id} style={{padding:'0.85rem',textAlign:'center',opacity:a.done?1:0.4,border:`1px solid ${a.done?'rgba(245,158,11,0.25)':'rgba(255,255,255,0.05)'}`}}>
              <div style={{fontSize:'1.75rem',marginBottom:'0.35rem'}}>{a.icon}</div>
              <div style={{fontWeight:800,color:a.done?'#F59E0B':'#5A7089',fontSize:'0.8rem',marginBottom:'0.2rem'}}>{a.name}</div>
              <div style={{fontSize:'0.63rem',color:'#5A7089'}}>{a.desc}</div>
              {a.done && <div style={{fontSize:'0.6rem',color:'#10B981',marginTop:'0.3rem'}}>✅ Tamamlandı</div>}
            </Card>
          ))}
        </div>
      )}

      {tab==='settings' && (
        <Card>
          <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.75rem'}}>⚙️ Hesap Ayarları</div>

          {/* Dil Seçimi */}
          <div style={{padding:'0.6rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)',marginBottom:'0.35rem'}}>
            <div style={{fontSize:'0.75rem',color:'#5A7089',marginBottom:'0.45rem'}}>🌐 Dil / Language / Sprache / Dil</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.35rem'}}>
              {[['tr','🇹🇷 Türkçe'],['en','🇬🇧 English'],['de','🇩🇪 Deutsch'],['az','🇦🇿 Azərbaycanca']].map(([code,label])=>(
                <button key={code} onClick={async()=>{ const u={...profile,lang:code}; setProfile(u); localStorage.setItem('rep_userProfile',JSON.stringify(u)); if(u.uid){try{await saveUserProfile(u.uid,u);}catch{}} showNotif(`✅ Dil değiştirildi: ${label}`,'success'); }}
                  style={{padding:'0.45rem 0.5rem',borderRadius:'8px',border:`1px solid ${(profile?.lang||'tr')===code?'rgba(59,130,246,0.5)':'rgba(255,255,255,0.08)'}`,background:(profile?.lang||'tr')===code?'rgba(59,130,246,0.15)':'rgba(255,255,255,0.03)',color:(profile?.lang||'tr')===code?'#60A5FA':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.75rem',cursor:'pointer',textAlign:'center'}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
            <span style={{color:'#5A7089',fontSize:'0.85rem'}}>{dark ? '☀️ Aydınlık Mod' : '🌙 Karanlık Mod'}</span>
            <button onClick={toggle} style={{background:dark?'#3B82F6':'rgba(255,255,255,0.08)',border:'none',borderRadius:'20px',padding:'0.3rem 0.85rem',color:'#fff',fontSize:'0.75rem',fontWeight:700,cursor:'pointer'}}>
              {dark ? 'Açık' : 'Kapalı'}
            </button>
          </div>
          {[
            ['📧','E-posta',profile?.email||'-'],
            ['🏙️','Şehir',profile?.city||'-'],
            ['👤','Cinsiyet',profile?.gender==='female'?'Kadın':'Erkek'],
            ['📅','Kayıt',profile?.registeredAt ? new Date(profile.registeredAt).toLocaleDateString('tr-TR') : '-'],
          ].map(([ic,lb,v])=>(
            <div key={lb} style={{display:'flex',justifyContent:'space-between',padding:'0.5rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <span style={{color:'#5A7089',fontSize:'0.85rem'}}>{ic} {lb}</span>
              <span style={{color:'#E8EDF2',fontWeight:600,fontSize:'0.85rem'}}>{v}</span>
            </div>
          ))}
          <div style={{marginTop:'0.75rem'}}>
            <Btn variant='primary' size='full' onClick={()=>setEditModal(true)}>✏️ Profili Düzenle</Btn>
          </div>

          {/* Streak */}
          <div style={{marginTop:'0.75rem',paddingTop:'0.75rem',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
            <div style={{fontSize:'0.7rem',color:'#5A7089',fontWeight:700,marginBottom:'0.4rem'}}>🔥 Günlük Streak</div>
            {streak ? (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <span style={{color:'#F59E0B',fontWeight:900,fontSize:'1.1rem',fontFamily:"'JetBrains Mono',monospace"}}>🔥 {streak.current_streak||0}</span>
                  <span style={{color:'#5A7089',fontSize:'0.7rem',marginLeft:'0.4rem'}}>gün · En iyi: {streak.longest_streak||0}</span>
                </div>
                <Btn variant={streak.last_claim_date===new Date().toISOString().slice(0,10)?'ghost':'primary'} size='sm'
                  onClick={streak.last_claim_date===new Date().toISOString().slice(0,10)?undefined:doClaimStreak}
                  disabled={streakLoading||streak.last_claim_date===new Date().toISOString().slice(0,10)}>
                  {streak.last_claim_date===new Date().toISOString().slice(0,10)?'✅ Alındı':streakLoading?'...':'🎁 Al'}
                </Btn>
              </div>
            ) : (
              <Btn variant='ghost' size='sm' onClick={doClaimStreak} disabled={streakLoading}>
                {streakLoading?'Yükleniyor...':'🎁 Günlük Ödül Al'}
              </Btn>
            )}
          </div>

          {/* Referral */}
          <div style={{marginTop:'0.6rem',paddingTop:'0.6rem',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
            <div style={{fontSize:'0.7rem',color:'#5A7089',fontWeight:700,marginBottom:'0.4rem'}}>🔗 Referans Kodun</div>
            <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
              <code style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.18)',borderRadius:'6px',padding:'0.3rem 0.55rem',color:'#60A5FA',fontFamily:"'JetBrains Mono',monospace",fontSize:'0.85rem',flex:1,textAlign:'center',letterSpacing:'0.08em'}}>
                {referralCode||'—'}
              </code>
              {referralCode && (
                <button onClick={()=>{navigator.clipboard?.writeText(referralCode).then(()=>showNotif('✅ Kopyalandı!','success')).catch(()=>{});}}
                  style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.18)',borderRadius:'7px',padding:'0.3rem 0.55rem',color:'#60A5FA',cursor:'pointer',fontSize:'0.72rem',fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>
                  📋
                </button>
              )}
            </div>
            <div style={{fontSize:'0.6rem',color:'#5A7089',marginTop:'0.25rem'}}>Arkadaşın kullanırsa +2.000₺ sen, +5.000₺ sen</div>
          </div>
        </Card>
      )}

      {/* ── Şifre Değiştir Kartı ──────────────────────────────────────── */}
      {tab==='settings' && (
        <Card style={{marginTop:'0.5rem'}}>
          <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.65rem',fontSize:'0.85rem'}}>🔑 Şifre Değiştir</div>
          {pwMsg && (
            <div style={{background:pwMsg.startsWith('✅')?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${pwMsg.startsWith('✅')?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,borderRadius:'8px',padding:'0.45rem 0.7rem',marginBottom:'0.55rem',fontSize:'0.78rem',color:pwMsg.startsWith('✅')?'#6EE7B7':'#FCA5A5'}}>
              {pwMsg}
            </div>
          )}
          <input type="password" value={pwForm.current} onChange={e=>setPwForm(p=>({...p,current:e.target.value}))}
            placeholder="Mevcut şifre" style={{...inputSt,marginBottom:'0.45rem'}} />
          <input type="password" value={pwForm.newPw} onChange={e=>setPwForm(p=>({...p,newPw:e.target.value}))}
            placeholder="Yeni şifre (min 6 karakter)" style={{...inputSt,marginBottom:'0.45rem'}} />
          <input type="password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))}
            placeholder="Yeni şifre (tekrar)" style={{...inputSt,marginBottom:'0.6rem'}} />
          <Btn variant='primary' size='full' onClick={doChangePassword} disabled={pwLoading}>
            {pwLoading?'Güncelleniyor...':'🔑 Şifreyi Güncelle'}
          </Btn>
        </Card>
      )}

      {/* ── 2FA Kartı ──────────────────────────────────────────────────── */}
      {tab==='settings' && (
        <Card style={{marginTop:'0.5rem'}}>
          <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.65rem',fontSize:'0.85rem'}}>🛡️ İki Faktörlü Doğrulama (2FA)</div>
          {twoFAStatus === null ? (
            <div style={{color:'#5A7089',fontSize:'0.8rem',textAlign:'center',padding:'0.5rem'}}>Yükleniyor...</div>
          ) : twoFAStatus ? (
            <div>
              <div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'8px',padding:'0.45rem 0.7rem',marginBottom:'0.55rem',fontSize:'0.78rem',color:'#6EE7B7'}}>
                ✅ 2FA etkin — Hesabınız korumalı
              </div>
              <input type="text" inputMode="numeric" value={twoFAToken} onChange={e=>setTwoFAToken(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="6 haneli kodu girin" style={{...inputSt,marginBottom:'0.5rem',textAlign:'center',letterSpacing:'0.2em',fontFamily:"'JetBrains Mono',monospace"}} />
              <Btn variant='danger' size='full' onClick={doDisable2FA}>2FA'yı Kapat</Btn>
            </div>
          ) : twoFASetup ? (
            <div>
              <div style={{fontSize:'0.73rem',color:'#5A7089',marginBottom:'0.5rem'}}>Authenticator uygulamasıyla QR kodu okutun:</div>
              <div style={{textAlign:'center',marginBottom:'0.6rem'}}>
                <img src={twoFASetup.qrCode} alt="QR" style={{width:'150px',height:'150px',borderRadius:'8px',background:'#fff',padding:'4px'}} />
              </div>
              <div style={{background:'rgba(0,0,0,0.3)',borderRadius:'6px',padding:'0.4rem 0.6rem',marginBottom:'0.6rem',fontFamily:"'JetBrains Mono',monospace",fontSize:'0.68rem',color:'#A78BFA',textAlign:'center',wordBreak:'break-all'}}>
                {twoFASetup.secret}
              </div>
              <input type="text" inputMode="numeric" value={twoFAToken} onChange={e=>setTwoFAToken(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="6 haneli kodu girin" style={{...inputSt,marginBottom:'0.45rem',textAlign:'center',letterSpacing:'0.2em',fontFamily:"'JetBrains Mono',monospace"}} />
              <Btn variant='primary' size='full' onClick={doEnable2FA} style={{marginBottom:'0.35rem'}}>✅ 2FA Etkinleştir</Btn>
              <Btn variant='ghost' size='full' onClick={()=>setTwoFASetup(null)}>İptal</Btn>
            </div>
          ) : (
            <div>
              <div style={{fontSize:'0.73rem',color:'#5A7089',marginBottom:'0.6rem'}}>Google Authenticator ile hesabınızı koruyun. Giriş sırasında 6 haneli kod gerekecek.</div>
              <Btn variant='ghost' size='full' onClick={doSetup2FA}>🛡️ 2FA Kurulumunu Başlat</Btn>
            </div>
          )}
        </Card>
      )}

      {tab==='customize' && (
        <div>
          <Card style={{marginBottom:'0.65rem'}}>
            <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.3rem',fontSize:'0.85rem'}}>📸 Profil Fotoğrafı</div>

            {/* Telefondan Yükle */}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{display:'none'}} />
            <button onClick={()=>fileInputRef.current?.click()} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',padding:'0.7rem',marginBottom:'0.6rem',borderRadius:'12px',border:'2px dashed rgba(59,130,246,0.35)',background:'rgba(59,130,246,0.06)',color:'#60A5FA',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.85rem',cursor:'pointer'}}>
              📱 Telefondan / Galeriden Seç
            </button>

            <div style={{fontSize:'0.65rem',color:'#5A7089',marginBottom:'0.4rem',textAlign:'center'}}>veya URL ile gir</div>
            <div style={{fontSize:'0.68rem',color:'#5A7089',marginBottom:'0.4rem'}}>URL gir (.jpg, .png, .gif, .webp)</div>
            <input value={photoUrlInput} onChange={e=>setPhotoUrlInput(e.target.value)} placeholder="https://resim-url.com/foto.jpg" style={inputSt}/>
            {photoUrlInput && <img src={photoUrlInput} alt="preview" style={{width:'52px',height:'52px',borderRadius:'50%',objectFit:'cover',marginTop:'0.5rem',border:'2px solid rgba(59,130,246,0.3)',display:'block'}} onError={e=>e.target.style.display='none'}/>}
            <Btn variant='primary' size='full' onClick={savePhotoUrl} style={{marginTop:'0.5rem'}}>✅ URL Kaydet</Btn>
          </Card>

          {profile?.premium ? (
            <>
              <Card style={{marginBottom:'0.65rem',background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(11,21,39,0.95))'}}>
                <div style={{fontWeight:700,color:'#A78BFA',marginBottom:'0.55rem',fontSize:'0.85rem'}}>💎 VIP Çerçeve Stili</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.35rem',marginBottom:'0.5rem'}}>
                  {[{id:'rainbow',label:'🌈 Gökkuşağı'},{id:'fire',label:'🔥 Ateş'},{id:'ice',label:'❄️ Buz'},{id:'gold',label:'✨ Altın'},{id:'neon',label:'💚 Neon'},{id:'violet',label:'💜 Mor'},{id:'heart',label:'💗 Kalp'},{id:'',label:'⭕ Yok'}].map(({id,label})=>(
                    <button key={id||'none'} onClick={()=>saveVipFrame(id)}
                      style={{padding:'0.4rem 0.15rem',borderRadius:'8px',border:`2px solid ${(profile?.vipFrame||'')===(id)?'#A78BFA':'rgba(255,255,255,0.08)'}`,background:(profile?.vipFrame||'')===(id)?'rgba(139,92,246,0.2)':'rgba(255,255,255,0.02)',color:(profile?.vipFrame||'')===(id)?'#A78BFA':'#5A7089',cursor:'pointer',fontSize:'0.6rem',fontWeight:700,fontFamily:"'DM Sans',sans-serif",textAlign:'center',lineHeight:1.3}}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:'0.65rem',color:'#5A7089'}}>Seçili: <span style={{color:'#A78BFA',fontWeight:700}}>{profile?.vipFrame||'Yok'}</span></div>
              </Card>

              <Card style={{marginBottom:'0.65rem',background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(11,21,39,0.95))'}}>
                <div style={{fontWeight:700,color:'#A78BFA',marginBottom:'0.3rem',fontSize:'0.85rem'}}>🎭 GIF / Animasyonlu Avatar URL</div>
                <div style={{fontSize:'0.68rem',color:'#5A7089',marginBottom:'0.5rem'}}>Animasyonlu avatar (GIF desteği mevcut)</div>
                <input value={avatarUrlInput} onChange={e=>setAvatarUrlInput(e.target.value)} placeholder="https://i.giphy.com/xxxx.gif" style={inputSt}/>
                <Btn variant='ghost' size='full' onClick={saveAvatarUrl} style={{marginTop:'0.5rem'}}>✅ Kaydet</Btn>
              </Card>

              <Card style={{background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(11,21,39,0.95))'}}>
                <div style={{fontWeight:700,color:'#A78BFA',marginBottom:'0.3rem',fontSize:'0.85rem'}}>🖼️ Profil Banner / Arka Plan</div>
                <div style={{fontSize:'0.68rem',color:'#5A7089',marginBottom:'0.5rem'}}>Profil kartı arka plan görseli (GIF veya resim URL)</div>
                <input value={bannerUrlInput} onChange={e=>setBannerUrlInput(e.target.value)} placeholder="https://example.com/banner.gif" style={inputSt}/>
                <Btn variant='ghost' size='full' onClick={saveBannerUrl} style={{marginTop:'0.5rem'}}>✅ Kaydet</Btn>
              </Card>
            </>
          ) : (
            <Card style={{textAlign:'center',padding:'1.75rem 1rem',background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(11,21,39,0.95))'}}>
              <div style={{fontSize:'2.2rem',marginBottom:'0.5rem'}}>💎</div>
              <div style={{fontWeight:800,color:'#A78BFA',fontSize:'0.95rem',marginBottom:'0.3rem'}}>VIP Özelleştirme</div>
              <div style={{fontSize:'0.75rem',color:'#5A7089',marginBottom:'0.75rem'}}>Çerçeve, GIF avatar ve profil banner için VIP üyelik gereklidir</div>
              <Btn variant='ghost' onClick={()=>showNotif('Premium sayfasına yönlendiriliyor... 💎','gold')}>💎 VIP Ol</Btn>
            </Card>
          )}
        </div>
      )}

      {/* ── Kredi / Loan Tabı ──────────────────────────────────────────── */}
      {tab==='kredi' && (
        <div>
          <Card style={{marginBottom:'0.5rem'}}>
            <div style={{fontSize:'0.7rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',marginBottom:'0.5rem'}}>📊 Kredi Skoru</div>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <div style={{fontSize:'2rem',fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:(profile?.creditScore||profile?.credit_score||500)>=700?'#10B981':(profile?.creditScore||profile?.credit_score||500)>=500?'#F59E0B':'#EF4444'}}>
                {profile?.creditScore||profile?.credit_score||500}
              </div>
              <div>
                <Tag color={(profile?.creditScore||500)>=700?'green':(profile?.creditScore||500)>=500?'gold':'red'}>
                  {(profile?.creditScore||500)>=700?'İyi':((profile?.creditScore||500)>=500?'Normal':'Kötü')}
                </Tag>
              </div>
            </div>
          </Card>

          <Card style={{marginBottom:'0.5rem'}}>
            <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.6rem',fontSize:'0.85rem'}}>💳 Kredi Talebi</div>
            <input type="number" value={loanAmt} onChange={e=>setLoanAmt(e.target.value)}
              placeholder="Tutar girin (min 1.000₺)" style={{...inputSt,marginBottom:'0.45rem'}} />
            {parseInt(loanAmt)>=1000 && (
              <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.45rem'}}>
                Tahmini faiz: %8 · Geri ödeme: ~{Math.ceil(parseInt(loanAmt)*1.08).toLocaleString('tr-TR')}₺ (30 gün)
              </div>
            )}
            <Btn variant='primary' size='full' onClick={doRequestLoan}>💳 Kredi Al</Btn>
          </Card>

          <Card>
            <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.6rem',fontSize:'0.85rem'}}>📋 Kredilerim</div>
            {loansLoading ? (
              <div style={{textAlign:'center',padding:'0.75rem',color:'#5A7089',fontSize:'0.8rem'}}>Yükleniyor...</div>
            ) : loans.length===0 ? (
              <div style={{textAlign:'center',padding:'0.75rem',color:'#5A7089',fontSize:'0.8rem'}}>Aktif kredi yok</div>
            ) : loans.map(loan=>(
              <div key={loan.id} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'0.6rem',marginBottom:'0.35rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.3rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
                    <span style={{color:'#E8EDF2',fontWeight:700,fontSize:'0.85rem'}}>{parseInt(loan.principal||loan.amount||0).toLocaleString('tr-TR')}₺</span>
                    <Tag color={loan.status==='active'?'blue':loan.status==='paid'?'green':'red'}>
                      {loan.status==='active'?'Aktif':loan.status==='paid'?'Ödendi':'Gecikmiş'}
                    </Tag>
                  </div>
                  <span style={{color:'#5A7089',fontSize:'0.68rem'}}>{loan.due_date?new Date(loan.due_date).toLocaleDateString('tr-TR'):'-'}</span>
                </div>
                {loan.status==='active' && (
                  <div>
                    <ProgressBar pct={Math.min(100,(parseInt(loan.amount_paid||0)/Math.max(1,parseInt(loan.amount_due||loan.total_due||loan.principal||1)))*100)} color='#10B981' h={4} />
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.67rem',color:'#5A7089',margin:'0.25rem 0 0.4rem'}}>
                      <span>Ödenen: {parseInt(loan.amount_paid||0).toLocaleString('tr-TR')}₺</span>
                      <span>Kalan: {(parseInt(loan.amount_due||loan.total_due||0)-parseInt(loan.amount_paid||0)).toLocaleString('tr-TR')}₺</span>
                    </div>
                    <Btn variant='ghost' size='sm' onClick={()=>doRepayLoan(loan.id,(parseInt(loan.amount_due||loan.total_due||0)-parseInt(loan.amount_paid||0)))}>
                      💰 Tamamını Öde
                    </Btn>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {editModal && (
        <Modal title="✏️ Profili Düzenle" onClose={()=>setEditModal(false)}>
          <div style={{marginBottom:'0.85rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Kullanıcı Adı</div>
            <input value={editForm.username} onChange={e=>setEditForm(p=>({...p,username:e.target.value}))}
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'}} />
          </div>
          <div style={{marginBottom:'1.25rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Şehir</div>
            <select value={editForm.city} onChange={e=>setEditForm(p=>({...p,city:e.target.value}))}
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'}}>
              {CITIES.map(c=><option key={c} value={c} style={{background:'#0B1527'}}>{c}</option>)}
            </select>
          </div>
          <Btn variant='primary' size='full' onClick={saveProfile}>✅ Kaydet</Btn>
        </Modal>
      )}
    </div>
  );
}

