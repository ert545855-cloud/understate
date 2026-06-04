// ═══════════════════════════════════════════════════════
// PREMİUM SAYFASI
// ═══════════════════════════════════════════════════════
function PremiumPage({ profile, setProfile, showNotif }) {
  const benefits = [
    ['💎','VIP Çerçeve','Özel profil çerçevesi'],
    ['⚡','2x XP','Tüm aktivitelerden 2 kat XP'],
    ['📈','5x Çiftlik','Tarım geliri 5 kat daha fazla'],
    ['🚫','Reklamsız','Hiçbir reklam görmezsin'],
    ['💬','Premium Chat','Özel renk ve rozet'],
    ['🎁','Günlük Kutu','Her gün özel ödül kutusu'],
    ['🏦','Yüksek Faiz','%2 günlük faiz (normal %0.5)'],
    ['🤝','Sonsuz İttifak','Sınırsız ittifak etkinliği'],
  ];

  const plans = [
    { id:'month', label:'Aylık VIP', price:249.99, uc:0, days:30, badge:'⭐', popular:true },
    { id:'year',  label:'Yıllık VIP', price:2499.99, uc:0, days:365, badge:'💎', save:'%17 Tasarruf' },
    { id:'uc',   label:'UC ile Al', price:0, uc:500, days:30, badge:'🪙', desc:'500 UC ile 1 aylık VIP' },
  ];

  return (
    <div style={{padding:'0.7rem'}}>
      {/* Hero */}
      <div style={{background:'linear-gradient(135deg,#1a0a2e,#2d1060)',border:'1px solid rgba(167,139,250,0.3)',borderRadius:'20px',padding:'1.5rem',textAlign:'center',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>💎</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#fff',marginBottom:'0.25rem'}}>UNDERSTATE VIP</div>
        <div style={{fontSize:'0.78rem',color:'#C4B5FD'}}>Premium üyelik ile tüm avantajların kilidini aç</div>
        {profile?.premium && <Tag color='violet' style={{marginTop:'0.5rem'}}>✅ Aktif VIP Üye</Tag>}
      </div>

      {/* Avantajlar */}
      <Card style={{marginBottom:'0.75rem'}}>
        <div style={{fontSize:'0.72rem',color:'#A78BFA',fontWeight:800,textTransform:'uppercase',marginBottom:'0.7rem',letterSpacing:'0.08em'}}>💎 VIP Avantajları</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem'}}>
          {benefits.map(([ic,name,desc])=>(
            <div key={name} style={{background:'rgba(139,92,246,0.07)',border:'1px solid rgba(139,92,246,0.15)',borderRadius:'10px',padding:'0.65rem',display:'flex',flexDirection:'column',gap:'0.2rem'}}>
              <span style={{fontSize:'1.1rem'}}>{ic}</span>
              <span style={{fontSize:'0.78rem',fontWeight:700,color:'#E8EDF2'}}>{name}</span>
              <span style={{fontSize:'0.62rem',color:'#5A7089'}}>{desc}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Planlar */}
      <div style={{fontSize:'0.72rem',color:'#5A7089',fontWeight:800,textTransform:'uppercase',marginBottom:'0.5rem',letterSpacing:'0.08em'}}>💳 Planlar</div>
      {plans.map(p => (
        <div key={p.id} style={{background:p.popular?'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(11,21,39,0.9))':'rgba(11,21,39,0.85)',border:`1px solid ${p.popular?'rgba(167,139,250,0.4)':'rgba(255,255,255,0.06)'}`,borderRadius:'14px',padding:'0.85rem',marginBottom:'0.4rem',display:'flex',alignItems:'center',gap:'0.75rem'}}>
          <div style={{fontSize:'1.5rem',width:'36px',textAlign:'center',flexShrink:0}}>{p.badge}</div>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
              <span style={{fontWeight:800,color:'#E8EDF2'}}>{p.label}</span>
              {p.popular && <Tag color='violet'>En Popüler</Tag>}
              {p.save && <Tag color='green'>{p.save}</Tag>}
            </div>
            <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{p.days} gün VIP</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:900,color:'#A78BFA',fontSize:'1rem'}}>{p.price>0 ? `₺${p.price}` : `${p.uc} UC`}</div>
            <Btn variant='ghost' size='sm' onClick={()=>showNotif('Ödeme sistemi yakında aktif! 💎','gold')} style={{marginTop:'0.25rem'}}>Satın Al</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

