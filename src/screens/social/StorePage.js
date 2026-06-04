// ═══════════════════════════════════════════════════════
// MARKET / MAĞAZA SAYFASI
// ═══════════════════════════════════════════════════════
const UC_PACKAGES = [
  { id:'uc_50',   uc:50,   bonus:0,   price:9.99,   badge:'🪙', popular:false },
  { id:'uc_150',  uc:150,  bonus:10,  price:24.99,  badge:'🪙', popular:false },
  { id:'uc_350',  uc:350,  bonus:30,  price:49.99,  badge:'⭐', popular:false },
  { id:'uc_750',  uc:750,  bonus:75,  price:99.99,  badge:'⭐', popular:true  },
  { id:'uc_1500', uc:1500, bonus:200, price:179.99, badge:'💎', popular:false },
  { id:'uc_3000', uc:3000, bonus:500, price:299.99, badge:'💎', popular:false },
];

function StorePage({ profile, setProfile, showNotif }) {
  const [tab, setTab] = useState('uc');
  const [buying, setBuying] = useState(null);
  const [history, setHistory] = useState([]);
  const card = {background:'rgba(11,21,39,0.9)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'0.85rem',marginBottom:'0.5rem'};

  useEffect(() => {
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt) return;
    fetch('/api/store/history', { headers:{'Authorization':'Bearer '+jwt} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.history) setHistory(d.history); })
      .catch(() => {});
  }, []);

  const handleBuyUC = async (pkg) => {
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt) { showNotif('Önce giriş yap!', 'error'); return; }
    setBuying(pkg.id);
    try {
      const res = await fetch('/api/store/purchase/uc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+jwt },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const d = await res.json();
      if (d.success) {
        const total = pkg.uc + (pkg.bonus || 0);
        setProfile(p => { const np={...p, underCoin:(p.underCoin||0)+total}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
        showNotif(`✅ ${total} UC hesabına yüklendi!`, 'success');
        setHistory(prev => [{ package_id:pkg.id, uc_amount:total, price_tl:pkg.price, status:'completed', created_at:new Date().toISOString() }, ...prev].slice(0,20));
      } else {
        showNotif(d.message || 'Satın alma başarısız', 'error');
      }
    } catch (e) {
      showNotif('Bağlantı hatası', 'error');
    }
    setBuying(null);
  };

  const handleBuyVIP = async (plan) => {
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt) { showNotif('Önce giriş yap!', 'error'); return; }
    setBuying(plan.id);
    try {
      const res = await fetch('/api/store/purchase/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+jwt },
        body: JSON.stringify({ packageId: plan.id }),
      });
      const d = await res.json();
      if (d.success) {
        setProfile(p => { const np={...p, premium:true, premiumExpiry:d.premiumExpiry, vip:true}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
        showNotif(`✅ ${plan.label} aktifleştirildi! ${plan.days} gün VIP.`, 'success');
      } else {
        showNotif(d.message || 'Satın alma başarısız', 'error');
      }
    } catch (e) {
      showNotif('Bağlantı hatası', 'error');
    }
    setBuying(null);
  };
  const vipPlans = [
    { id:'vip_30',  label:'Aylık VIP',  price:49.99,  days:30,  badge:'⭐', popular:true, features:['💎 VIP çerçeve','⚡ +50% XP','📈 %2 banka faizi','🎁 Özel rozet'] },
    { id:'vip_90',  label:'3 Aylık VIP', price:129.99, days:90,  badge:'💎', save:'%14 Tasarruf', features:['💎 VIP çerçeve','⚡ +50% XP','📈 %2 banka faizi','🪙 Aylık 100 UC'] },
    { id:'vip_365', label:'Yıllık VIP',  price:399.99, days:365, badge:'👑', save:'%25 Tasarruf', features:['💎 VIP çerçeve','⚡ +50% XP','📈 %2 banka faizi','🪙 Aylık 150 UC','🏆 Yıllık rozet'] },
  ];
  return (
    <div style={{padding:'0.7rem'}}>
      <div style={{background:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',border:'1px solid rgba(236,72,153,0.3)',borderRadius:'20px',padding:'1.25rem',textAlign:'center',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'2rem',marginBottom:'0.4rem'}}>🛒</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.2rem',fontWeight:900,color:'#fff'}}>UNDERSTATE MARKET</div>
        <div style={{fontSize:'0.72rem',color:'#C4B5FD',marginTop:'0.25rem'}}>VIP üyelik ve UnderCoin satın al</div>
        {profile?.premium && <div style={{marginTop:'0.5rem',display:'inline-block',background:'rgba(167,139,250,0.2)',border:'1px solid rgba(167,139,250,0.4)',borderRadius:'8px',padding:'0.25rem 0.75rem',fontSize:'0.7rem',color:'#A78BFA',fontWeight:700}}>✅ Aktif VIP Üye</div>}
      </div>

      <div style={{display:'flex',gap:'4px',marginBottom:'0.75rem'}}>
        {[['uc','🪙 UnderCoin'],['vip','💎 VIP'],['edu','📚 Eğitim']].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{flex:1,padding:'0.5rem',borderRadius:'10px',border:`1px solid ${tab===id?'rgba(236,72,153,0.5)':'rgba(255,255,255,0.08)'}`,background:tab===id?'rgba(236,72,153,0.12)':'rgba(255,255,255,0.03)',color:tab===id?'#F472B6':'#5A7089',fontWeight:700,fontSize:'0.78rem',cursor:'pointer'}}>
            {lbl}
          </button>
        ))}
      </div>

      {tab==='uc' && (
        <div>
          <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.5rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>🪙 UnderCoin Paketleri</div>
          <div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'12px',padding:'0.65rem',marginBottom:'0.65rem',fontSize:'0.72rem',color:'#6EE7B7'}}>
            💡 UnderCoin (UC), oyun içi özel para birimidir. Kozmetikler, avantajlar ve premium özellikler için kullanılır.
          </div>
          <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.4rem'}}>Mevcut UC: <span style={{color:'#F59E0B',fontWeight:700}}>{profile?.underCoin||0} UC</span></div>
          {UC_PACKAGES.map(pkg => (
            <div key={pkg.id} style={{...card,border:`1px solid ${pkg.popular?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.07)'}`,background:pkg.popular?'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(11,21,39,0.9))':'rgba(11,21,39,0.9)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <div style={{fontSize:'1.6rem',width:'40px',textAlign:'center',flexShrink:0}}>{pkg.badge}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{pkg.uc.toLocaleString('tr-TR')} UC {pkg.bonus>0 && <span style={{color:'#10B981',fontSize:'0.72rem',fontWeight:700}}>+{pkg.bonus} bonus</span>}</div>
                  <div style={{fontSize:'0.65rem',color:'#5A7089'}}>₺{pkg.price.toLocaleString('tr-TR')} ödeme • Toplam: {(pkg.uc+pkg.bonus).toLocaleString('tr-TR')} UC</div>
                  {pkg.popular && <div style={{display:'inline-block',marginTop:'0.2rem',background:'rgba(245,158,11,0.2)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:'6px',padding:'1px 6px',fontSize:'0.6rem',color:'#F59E0B',fontWeight:700}}>En Popüler</div>}
                </div>
                <button onClick={()=>handleBuyUC(pkg)} disabled={buying===pkg.id}
                  style={{padding:'0.45rem 0.85rem',borderRadius:'10px',border:`1px solid rgba(245,158,11,${pkg.popular?0.8:0.3})`,background:pkg.popular?'linear-gradient(135deg,#F59E0B,#D97706)':'rgba(245,158,11,0.15)',color:pkg.popular?'#000':'#F59E0B',fontWeight:700,fontSize:'0.78rem',cursor:buying?'not-allowed':'pointer',flexShrink:0,opacity:buying===pkg.id?0.6:1}}>
                  {buying===pkg.id ? '...' : 'Satın Al'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='vip' && (
        <div>
          <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.5rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>💎 VIP Üyelik Planları</div>
          {vipPlans.map(plan => (
            <div key={plan.id} style={{...card,border:`1px solid ${plan.popular?'rgba(167,139,250,0.45)':'rgba(255,255,255,0.07)'}`,background:plan.popular?'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(11,21,39,0.9))':'rgba(11,21,39,0.9)',marginBottom:'0.65rem'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',marginBottom:'0.65rem'}}>
                <div style={{fontSize:'1.8rem',flexShrink:0}}>{plan.badge}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.4rem',flexWrap:'wrap'}}>
                    <span style={{fontWeight:900,color:'#E8EDF2',fontSize:'0.95rem'}}>{plan.label}</span>
                    {plan.popular && <span style={{background:'rgba(139,92,246,0.25)',border:'1px solid rgba(167,139,250,0.4)',borderRadius:'6px',padding:'1px 6px',fontSize:'0.6rem',color:'#A78BFA',fontWeight:700}}>En Popüler</span>}
                    {plan.save && <span style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'6px',padding:'1px 6px',fontSize:'0.6rem',color:'#10B981',fontWeight:700}}>{plan.save}</span>}
                  </div>
                  <div style={{fontWeight:900,color:'#A78BFA',fontSize:'1.25rem',marginTop:'0.15rem'}}>₺{plan.price.toLocaleString('tr-TR', {minimumFractionDigits:2})}</div>
                  <div style={{fontSize:'0.65rem',color:'#5A7089'}}>{plan.days} gün VIP üyelik</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.3rem',marginBottom:'0.65rem'}}>
                {plan.features.map(f => (
                  <div key={f} style={{fontSize:'0.68rem',color:'#94A3B8',display:'flex',alignItems:'center',gap:'0.3rem'}}>
                    <span style={{color:'#A78BFA'}}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={()=>handleBuyVIP(plan)} disabled={buying===plan.id} style={{width:'100%',padding:'0.65rem',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#7C3AED,#A855F7)',color:'#fff',fontWeight:700,fontSize:'0.85rem',cursor:buying?'not-allowed':'pointer',letterSpacing:'0.03em',opacity:buying===plan.id?0.6:1}}>
                {buying===plan.id ? '⏳ İşleniyor...' : `💎 ${plan.label} Satın Al`}
              </button>
            </div>
          ))}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'0.75rem',fontSize:'0.7rem',color:'#5A7089'}}>
            500 UC harcayarak da 30 günlük VIP aktifleştirebilirsin. Mevcut UC: <span style={{color:'#F59E0B',fontWeight:700}}>{profile?.underCoin||0}</span>
            {(profile?.underCoin||0) >= 500 && (
              <button onClick={()=>{ setProfile(p=>{const np={...p,underCoin:(p.underCoin||0)-500,premium:true,premiumExpiry:Date.now()+30*24*3600000};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('✅ VIP aktifleştirildi! 30 gün','success'); }}
                style={{display:'block',marginTop:'0.5rem',width:'100%',padding:'0.5rem',borderRadius:'10px',border:'1px solid rgba(245,158,11,0.4)',background:'rgba(245,158,11,0.12)',color:'#F59E0B',fontWeight:700,fontSize:'0.78rem',cursor:'pointer'}}>
                🪙 500 UC ile Aktifleştir
              </button>
            )}
          </div>
        </div>
      )}

      {tab==='edu' && (
        <div>
          <div style={{background:'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(11,21,39,0.97))',border:'1px solid rgba(139,92,246,0.35)',borderRadius:'16px',padding:'1.25rem',textAlign:'center',marginBottom:'0.75rem'}}>
            <div style={{fontSize:'2rem',marginBottom:'0.4rem'}}>📚</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:900,color:'#C4B5FD'}}>EĞİTİM PAKETİ</div>
            <div style={{fontSize:'0.72rem',color:'#8B5CF6',marginTop:'0.2rem'}}>Eğitim tıklamalarında 12 saatlik bekleme süresi (normal: 5 dk)</div>
            {(profile?.packages?.edu || profile?.eduPackage) && (
              <div style={{marginTop:'0.5rem',display:'inline-block',background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.4)',borderRadius:'8px',padding:'0.25rem 0.75rem',fontSize:'0.7rem',color:'#10B981',fontWeight:700}}>✅ Aktif Paketiniz Var</div>
            )}
          </div>

          <div style={{background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(11,21,39,0.95))',border:'1px solid rgba(139,92,246,0.35)',borderRadius:'16px',padding:'1rem',marginBottom:'0.65rem'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',marginBottom:'0.75rem'}}>
              <div style={{fontSize:'2rem',flexShrink:0}}>📦</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.4rem',flexWrap:'wrap'}}>
                  <span style={{fontWeight:900,color:'#C4B5FD',fontSize:'1rem'}}>30 Günlük Eğitim Paketi</span>
                  <span style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'6px',padding:'1px 6px',fontSize:'0.62rem',color:'#10B981',fontWeight:700}}>🔥 Popüler</span>
                </div>
                <div style={{fontWeight:900,color:'#A78BFA',fontSize:'1.4rem',marginTop:'0.1rem'}}>₺1.199,99</div>
                <div style={{fontSize:'0.65rem',color:'#5A7089'}}>30 gün geçerli eğitim paketi</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.3rem',marginBottom:'0.75rem'}}>
              {['📚 Her tıklama: 12 saat bekle','⚡ Normal: 5 dakika bekleme','🎓 Daha hızlı diploma kazan','🏆 Ekstra XP bonusu yok'].map(f=>(
                <div key={f} style={{fontSize:'0.68rem',color:'#94A3B8',display:'flex',alignItems:'center',gap:'0.3rem'}}>
                  <span style={{color:'#A78BFA'}}>✓</span>{f}
                </div>
              ))}
            </div>
            <button onClick={()=>showNotif('💳 Eğitim Paketi (₺1.199,99) için ödeme sayfasına yönlendiriliyor...','gold')}
              style={{width:'100%',padding:'0.7rem',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#7C3AED,#A855F7)',color:'#fff',fontWeight:700,fontSize:'0.85rem',cursor:'pointer',letterSpacing:'0.03em'}}>
              📚 Eğitim Paketi Al — ₺1.199,99
            </button>
          </div>

          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'0.75rem',fontSize:'0.7rem',color:'#5A7089',lineHeight:1.7}}>
            💡 <strong style={{color:'#C4B5FD'}}>Eğitim Paketi</strong> ile her eğitim tıklaması sonrası <strong style={{color:'#A78BFA'}}>12 saat</strong> beklersin (5 dk yerine). Admin veya admin panelinden da verilebilir.
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// EĞİTİM SİSTEMİ SAYFASI
// ═══════════════════════════════════════════════════════
