function FootballPage({ profile, setProfile, showNotif }) {
  const [clubs, setClubs] = useLs('footballClubs', []);
  const [matches, setMatches] = useLs('footballMatches', []);
  const [socialPosts, setSocialPosts] = useLs('footballSocialPosts', []);
  const [sponsors, setSponsors] = useLs('footballSponsors', []);
  const [newSocialPost, setNewSocialPost] = useState('');
  const [tab, setTab] = useState('clubs');
  const [cooldown, setCooldown] = useLs('footballCooldown', {});
  const now = Date.now();
  const cu = profile || {};
  const updateUser = (upd) => {
    const next = { ...cu, ...upd };
    setProfile(next);
    localStorage.setItem('rep_userProfile', JSON.stringify(next));
    try {
      const users = JSON.parse(localStorage.getItem('rep_users')||'[]');
      localStorage.setItem('rep_users', JSON.stringify(users.map(u => u.id===next.id ? next : u)));
    } catch{}
  };
  const myClub = clubs.find(c => c.owner === cu.username);

  const createClub = async () => {
    if ((cu.money||0) < 2000000) { showNotif('❌ ₺2,000,000 gerekli!','error'); return; }
    const name = prompt('⚽ Kulüp adını girin:');
    if (!name) return;
    const club = {
      id: Date.now(), name, owner: cu.username, city: cu.city||'İstanbul',
      color: ['#D00000','#003DA5','#FFD700','#008000','#FF6B00'][Math.floor(Math.random()*5)],
      budget: 500000, fans: Math.floor(Math.random()*5000)+1000,
      rating: Math.floor(Math.random()*20)+60,
      attack: Math.floor(Math.random()*15)+55, defense: Math.floor(Math.random()*15)+55,
      players: [
        {name:'Ahmet Yılmaz',pos:'Kaleci',rating:72},{name:'Mehmet Kaya',pos:'Defans',rating:68},
        {name:'Ali Demir',pos:'Orta Saha',rating:75},{name:'Ömer Şahin',pos:'Forvet',rating:78},
        {name:'Hasan Çelik',pos:'Defans',rating:71}
      ],
      wins:0, draws:0, losses:0, goals:0, conceded:0, points:0, season:1,
      founded: new Date().toLocaleDateString('tr-TR')
    };
    updateUser({ money: (cu.money||0) - 2000000 });
    setClubs(prev => [...prev, club]);
    showNotif(`✅ ${name} kuruldu! ₺500,000 başlangıç bütçesi.`, 'success');
  };

  const playMatch = (opp) => {
    const lastMatch = cooldown[cu.username] || 0;
    if (now - lastMatch < 5*60*1000) { showNotif('⏳ Maç cooldown: 5 dakika bekle!', 'error'); return; }
    const myStr = myClub.attack + myClub.defense + (myClub.players||[]).reduce((s,p)=>s+p.rating,0)/10;
    const oppStr = opp.attack + opp.defense + (opp.players||[]).reduce((s,p)=>s+p.rating,0)/10;
    const winP = Math.min(80, Math.max(20, (myStr/(myStr+oppStr))*100));
    const won = Math.random()*100 < winP;
    const drew = !won && Math.random() < 0.25;
    const myG = Math.floor(Math.random()*4)+(won?1:0);
    const oppG = won ? Math.max(0,myG-Math.floor(Math.random()*2)-1) : myG+(drew?0:Math.floor(Math.random()*2)+1);
    const prize = won?150000:drew?50000:0;
    const fanChg = won?Math.floor(Math.random()*500)+200:drew?50:-100;
    const match = {id:Date.now(),home:myClub.name,away:opp.name,homeGoals:myG,awayGoals:oppG,date:new Date().toLocaleDateString('tr-TR'),result:won?'win':drew?'draw':'loss'};
    setMatches(prev => [match, ...prev].slice(0,50));
    setClubs(prev => prev.map(c => {
      if (c.id===myClub.id) return {...c,wins:c.wins+(won?1:0),draws:c.draws+(drew?1:0),losses:c.losses+(!won&&!drew?1:0),goals:c.goals+myG,conceded:c.conceded+oppG,points:c.points+(won?3:drew?1:0),fans:Math.max(0,(c.fans||0)+fanChg),budget:(c.budget||0)+prize};
      if (c.id===opp.id) return {...c,wins:c.wins+(!won&&!drew?1:0),draws:c.draws+(drew?1:0),losses:c.losses+(won?1:0),goals:c.goals+oppG,conceded:c.conceded+myG,points:c.points+(!won&&!drew?3:drew?1:0)};
      return c;
    }));
    if (prize) updateUser({ money: (cu.money||0)+prize });
    setCooldown(prev => ({...prev,[cu.username]:now}));
    const res = won?`🏆 GALİBİYET! ${myG}-${oppG}`:drew?`🤝 BERABERLİK! ${myG}-${oppG}`:`💔 MAĞLUBIYET! ${myG}-${oppG}`;
    showNotif(res + (prize ? ' +₺'+prize.toLocaleString() : '') + (fanChg>0 ? ' +'+fanChg+' taraftar' : fanChg<0 ? ' '+fanChg+' taraftar' : ''), won?'success':drew?'info':'error');

    const autoMessages = won ? [
      `⚽ ${myClub.name} bugün ${opp.name}'ı ${myG}-${oppG} mağlup etti! Muhteşem bir performans! 🏆🔥`,
      `${myG}-${oppG} ile galip gelindik! ${myClub.name} taraftarları çılgına döndü! 🎉⚽`,
      `Harika bir galibiyet! ${myClub.name} sahadan başı dik çıktı. ${myG}-${oppG} 💪`,
    ] : drew ? [
      `Beraberlikle ayrıldık: ${myClub.name} ${myG}-${oppG} ${opp.name}. Güzel bir maçtı! 🤝⚽`,
      `${myG}-${oppG} beraberlik. Puan alındı, devam edelim! ${myClub.name} 💪`,
    ] : [
      `Bugün mağlup olduk: ${myClub.name} ${myG}-${oppG} ${opp.name}. Başka gün 💙`,
      `${myG}-${oppG}... Hayal kırıklığı ama daha iyisini yapacağız! ${myClub.name} 💪`,
    ];
    const autoMsg = autoMessages[Math.floor(Math.random()*autoMessages.length)];
    const autoPost = {id:Date.now(),author:cu.username||'Taraftar',club:myClub.name,content:autoMsg,date:new Date().toLocaleDateString('tr-TR'),time:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}),result:won?'win':drew?'draw':'loss',auto:true,likes:[]};
    setSocialPosts(prev => [autoPost,...prev].slice(0,100));

    const mySponsorIncome = sponsors.filter(s=>s.club===myClub.name&&(s.duration||0)>0).reduce((sum,s)=>sum+(s.perMatch||0),0);
    if (mySponsorIncome > 0) {
      updateUser({ money: (cu.money||0) + prize + mySponsorIncome });
      setSponsors(prev => prev.map(s => s.club===myClub.name ? {...s, duration:Math.max(0,(s.duration||0)-1), total:(s.total||0)+s.perMatch} : s).filter(s=>s.duration>0 || s.club!==myClub.name));
      showNotif(`💰 Sponsor geliri: +₺${mySponsorIncome.toLocaleString()}`, 'info');
    }
  };

  const transferPlayer = () => {
    if (!myClub) return;
    if ((myClub.budget||0)<250000) { showNotif('❌ Transfer için ₺250,000 bütçe gerekli!','error'); return; }
    const names=['Kemal Aydın','Burak Doğan','Serkan Polat','Emre Güzel','Tolga Arslan','Cem Yıldız','Ferhat Korkmaz'];
    const positions=['Kaleci','Defans','Orta Saha','Forvet','Kanat'];
    const newP={name:names[Math.floor(Math.random()*names.length)],pos:positions[Math.floor(Math.random()*positions.length)],rating:Math.floor(Math.random()*20)+65};
    setClubs(prev=>prev.map(c=>c.id===myClub.id?{...c,players:[...(c.players||[]),newP],budget:(c.budget||0)-250000,rating:Math.floor((c.rating*((c.players||[]).length)+newP.rating)/((c.players||[]).length+1))}:c));
    showNotif(`✅ ${newP.name} transfer edildi! (${newP.rating} puan) -₺250,000`, 'success');
  };

  const sortedLeague = [...clubs].sort((a,b)=>(b.points||0)-(a.points||0));
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#10B981',marginBottom:'1rem',letterSpacing:'0.05em'}}>⚽ Futbol Yönetimi</div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem',flexWrap:'wrap'}}>
        {[{k:'clubs',l:'⚽ Kulübüm'},{k:'league',l:'🏆 Lig'},{k:'matches',l:'📅 Maçlar'},{k:'sponsor',l:'💰 Sponsor'},{k:'sosyal',l:'📱 Sosyal'},{k:'transfer',l:'🔄 Transfer'},{k:'training',l:'🏃 Antrenman'},{k:'tactics',l:'🧠 Taktik'},{k:'infrastructure',l:'🏟 Altyapı'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'0.4rem 1rem',borderRadius:'2rem',border:`1px solid ${tab===t.k?'#10B981':'rgba(255,255,255,0.12)'}`,background:tab===t.k?'rgba(16,185,129,0.15)':'transparent',color:tab===t.k?'#10B981':'#999',cursor:'pointer',fontWeight:tab===t.k?700:400,fontSize:'0.83rem',fontFamily:'inherit'}}>{t.l}</button>
        ))}
      </div>

      {tab==='clubs'&&(<div>
        {!myClub&&<div style={{background:'rgba(16,185,129,0.07)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:'12px',padding:'1.25rem',marginBottom:'1rem'}}>
          <div style={{fontWeight:700,color:'#10B981',marginBottom:'0.5rem'}}>⚽ Kulüp Kur</div>
          <p style={{fontSize:'0.85rem',color:'#999',marginBottom:'0.75rem'}}>Kendi futbol kulübünü kur, oyuncular al, liglerde şampiyon ol! Kurulum ücreti: ₺2,000,000</p>
          <button onClick={createClub} style={{padding:'0.6rem 1.2rem',background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.4)',borderRadius:'8px',color:'#10B981',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>⚽ Kulüp Kur (₺2,000,000)</button>
        </div>}
        {myClub&&<div>
          <div style={{background:`linear-gradient(135deg,${myClub.color||'#10B981'}22,rgba(0,0,0,0))`,border:`1px solid ${myClub.color||'#10B981'}44`,borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
              <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.2rem',color:myClub.color||'#10B981'}}>{myClub.name}</div><div style={{fontSize:'0.78rem',color:'#999'}}>📍 {myClub.city} · Kuruluş: {myClub.founded}</div></div>
              <div style={{textAlign:'center'}}><div style={{fontSize:'1.8rem'}}>⭐</div><div style={{fontWeight:900,fontSize:'1.3rem',color:'#FFD700'}}>{myClub.rating}</div></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.5rem',marginBottom:'0.75rem'}}>
              {[{l:'Bütçe',v:`₺${((myClub.budget||0)/1000).toFixed(0)}K`,c:'#10B981'},{l:'Taraftar',v:(myClub.fans||0).toLocaleString(),c:'#60A5FA'},{l:'Hücum',v:myClub.attack||65,c:'#EF4444'},{l:'Savunma',v:myClub.defense||65,c:'#3B82F6'}].map(s=>(
                <div key={s.l} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.5rem',textAlign:'center'}}><div style={{fontWeight:700,color:s.c,fontSize:'0.9rem'}}>{s.v}</div><div style={{fontSize:'0.62rem',color:'#666'}}>{s.l}</div></div>
              ))}
            </div>
            <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',marginBottom:'0.75rem'}}>
              {[{l:'G',v:myClub.wins||0,c:'#10B981'},{l:'B',v:myClub.draws||0,c:'#F59E0B'},{l:'M',v:myClub.losses||0,c:'#EF4444'},{l:'Gol',v:myClub.goals||0,c:'#60A5FA'},{l:'Puan',v:myClub.points||0,c:'#FFD700'}].map(s=>(
                <div key={s.l} style={{padding:'0.2rem 0.6rem',background:'rgba(255,255,255,0.04)',borderRadius:'4px',fontSize:'0.75rem'}}><span style={{color:s.c,fontWeight:700}}>{s.v}</span> <span style={{color:'#aaa'}}>{s.l}</span></div>
              ))}
            </div>
          </div>
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
            <div style={{fontWeight:700,color:'#60A5FA',marginBottom:'0.5rem',fontSize:'0.9rem'}}>👕 Kadro</div>
            {(myClub.players||[]).map((p,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.35rem 0.5rem',borderRadius:'6px',marginBottom:'0.25rem',background:'rgba(255,255,255,0.03)'}}>
                <div><span style={{fontWeight:600,fontSize:'0.85rem'}}>{p.name}</span><span style={{fontSize:'0.7rem',color:'#999',marginLeft:'0.4rem'}}>{p.pos}</span></div>
                <div style={{fontWeight:700,color:p.rating>=80?'#FFD700':p.rating>=70?'#10B981':'#999',fontSize:'0.85rem'}}>{p.rating}</div>
              </div>
            ))}
          </div>
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
            <div style={{fontWeight:700,color:'#F59E0B',marginBottom:'0.5rem',fontSize:'0.9rem'}}>⚽ Lig Maçı</div>
            {clubs.filter(c=>c.id!==myClub.id).length===0&&<div style={{color:'#555',fontSize:'0.85rem'}}>Henüz rakip kulüp yok. Başka oyuncular kulüp kurmasını bekle!</div>}
            {clubs.filter(c=>c.id!==myClub.id).map(opp=>{
              const myStr=myClub.attack+myClub.defense+(myClub.players||[]).reduce((s,p)=>s+p.rating,0)/10;
              const oppStr=opp.attack+opp.defense+(opp.players||[]).reduce((s,p)=>s+p.rating,0)/10;
              const winP=Math.round(Math.min(80,Math.max(20,(myStr/(myStr+oppStr))*100)));
              return (
                <div key={opp.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem',background:'rgba(255,255,255,0.03)',borderRadius:'8px',marginBottom:'0.3rem',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div><div style={{fontWeight:700,fontSize:'0.85rem'}}>{opp.name}</div><div style={{fontSize:'0.7rem',color:'#999'}}>{opp.city} · Rating: {opp.rating} · Şans: <span style={{color:winP>=60?'#10B981':winP>=40?'#F59E0B':'#EF4444'}}>%{winP}</span></div></div>
                  <button onClick={()=>playMatch(opp)} style={{padding:'0.4rem 0.8rem',background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:'8px',color:'#60A5FA',cursor:'pointer',fontWeight:700,fontSize:'0.8rem',fontFamily:'inherit'}}>⚽ Oyna</button>
                </div>
              );
            })}
          </div>
        </div>}
        {clubs.filter(c=>c.owner!==cu.username).length>0&&<div style={{marginTop:'1rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
          <div style={{fontWeight:700,color:'#aaa',marginBottom:'0.5rem',fontSize:'0.9rem'}}>🏟️ Diğer Kulüpler</div>
          {clubs.filter(c=>c.owner!==cu.username).map(c=>(
            <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.4rem 0.5rem',background:'rgba(255,255,255,0.03)',borderRadius:'6px',marginBottom:'0.25rem'}}>
              <div><span style={{fontWeight:700,color:c.color||'#10B981',fontSize:'0.85rem'}}>{c.name}</span><span style={{fontSize:'0.7rem',color:'#999',marginLeft:'0.4rem'}}>{c.city} · {c.owner}</span></div>
              <div style={{display:'flex',gap:'0.5rem',fontSize:'0.75rem'}}>
                <span style={{color:'#FFD700'}}>⭐{c.rating}</span><span style={{color:'#10B981'}}>{c.wins||0}G</span><span style={{color:'#EF4444'}}>{c.losses||0}M</span><span style={{color:'#A78BFA',fontWeight:700}}>{c.points||0}P</span>
              </div>
            </div>
          ))}
        </div>}
      </div>)}

      {tab==='league'&&(<div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
          <div style={{fontWeight:700,color:'#FFD700',marginBottom:'0.75rem',fontSize:'0.95rem'}}>🏆 Lig Tablosu</div>
          {clubs.length===0&&<div style={{color:'#555',textAlign:'center',padding:'1rem'}}>Henüz kulüp yok.</div>}
          {sortedLeague.map((c,i)=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.5rem 0.5rem',borderRadius:'8px',marginBottom:'0.3rem',background:c.owner===cu.username?'rgba(16,185,129,0.08)':'rgba(255,255,255,0.02)',border:`1px solid ${c.owner===cu.username?'rgba(16,185,129,0.25)':'rgba(255,255,255,0.05)'}`}}>
              <div style={{width:'24px',textAlign:'center',fontWeight:700,color:i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'#777',fontSize:'0.85rem'}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,color:c.color||'#10B981',fontSize:'0.85rem'}}>{c.name}</div><div style={{fontSize:'0.65rem',color:'#666'}}>{c.owner}</div></div>
              <div style={{display:'flex',gap:'0.6rem',fontSize:'0.78rem'}}>
                <span style={{color:'#10B981'}}>{c.wins||0}G</span><span style={{color:'#F59E0B'}}>{c.draws||0}B</span><span style={{color:'#EF4444'}}>{c.losses||0}M</span>
                <span style={{color:'#60A5FA'}}>{c.goals||0}-{c.conceded||0}</span>
                <span style={{fontWeight:700,color:'#FFD700',minWidth:'25px',textAlign:'right'}}>{c.points||0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>)}

      {tab==='matches'&&(<div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
          <div style={{fontWeight:700,color:'#60A5FA',marginBottom:'0.75rem'}}>📅 Son Maçlar</div>
          {matches.length===0&&<div style={{color:'#555',textAlign:'center',padding:'1rem'}}>Henüz maç oynanmadı.</div>}
          {matches.map(m=>(
            <div key={m.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0.75rem',background:'rgba(255,255,255,0.03)',borderRadius:'8px',marginBottom:'0.3rem',border:`1px solid ${m.result==='win'?'rgba(16,185,129,0.2)':m.result==='loss'?'rgba(239,68,68,0.2)':'rgba(245,158,11,0.2)'}`}}>
              <div style={{fontSize:'0.82rem'}}><span style={{fontWeight:600}}>{m.home}</span><span style={{color:'#777',margin:'0 0.4rem'}}>vs</span><span style={{fontWeight:600}}>{m.away}</span></div>
              <div style={{display:'flex',gap:'0.75rem',alignItems:'center'}}>
                <span style={{fontWeight:900,fontSize:'1rem',color:m.result==='win'?'#10B981':m.result==='loss'?'#EF4444':'#F59E0B'}}>{m.homeGoals}-{m.awayGoals}</span>
                <span style={{fontSize:'0.65rem',color:'#666'}}>{m.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>)}

      {tab==='transfer'&&(<div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
          <div style={{fontWeight:700,color:'#F59E0B',marginBottom:'0.5rem'}}>🔄 Transfer Pazarı</div>
          {!myClub&&<div style={{color:'#EF4444',fontSize:'0.85rem'}}>Önce bir kulüp kurman gerekiyor!</div>}
          {myClub&&<div>
            <div style={{fontSize:'0.85rem',color:'#bbb',marginBottom:'0.75rem'}}>Kulüp Bütçesi: <strong style={{color:'#10B981'}}>₺{(myClub.budget||0).toLocaleString()}</strong></div>
            <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
              {[
                {name:'Yusuf Erdoğan',  pos:'Forvet',    rating:88, price:1500000, nat:'🇹🇷'},
                {name:'Lucas Silva',    pos:'Orta Saha', rating:85, price:1200000, nat:'🇧🇷'},
                {name:'Kerem Aktaş',    pos:'Defans',    rating:82, price:900000,  nat:'🇹🇷'},
                {name:'Ivan Petrov',    pos:'Kaleci',    rating:80, price:750000,  nat:'🇷🇺'},
                {name:'Marco Bianchi',  pos:'Kanat',     rating:79, price:700000,  nat:'🇮🇹'},
                {name:'Emre Güneş',    pos:'Defans',    rating:77, price:500000,  nat:'🇹🇷'},
                {name:'Carlos Mendez', pos:'Forvet',    rating:75, price:450000,  nat:'🇦🇷'},
                {name:'Burak Yıldız', pos:'Orta Saha', rating:73, price:350000,  nat:'🇹🇷'},
                {name:'Ahmed Hassan',   pos:'Defans',    rating:71, price:300000,  nat:'🇪🇬'},
                {name:'Cem Polat',      pos:'Kaleci',    rating:69, price:200000,  nat:'🇹🇷'},
                {name:'Deniz Arslan',   pos:'Kanat',     rating:67, price:150000,  nat:'🇹🇷'},
                {name:'Faruk Yılmaz',  pos:'Forvet',    rating:65, price:100000,  nat:'🇹🇷'},
              ].map((p,i)=>{
                const alreadyOwned = (myClub.players||[]).some(pl=>pl.name===p.name);
                const canAfford = (myClub.budget||0) >= p.price;
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.6rem 0.75rem',background:'rgba(255,255,255,0.03)',border:`1px solid ${alreadyOwned?'rgba(16,185,129,0.3)':'rgba(255,255,255,0.07)'}`,borderRadius:'10px'}}>
                    <div style={{fontSize:'1.1rem'}}>{p.nat}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.85rem'}}>{p.name}</div>
                      <div style={{fontSize:'0.65rem',color:'#5A7089'}}>{p.pos} • <span style={{color:p.rating>=85?'#FFD700':p.rating>=75?'#10B981':'#60A5FA',fontWeight:700}}>{p.rating} puan</span></div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:'0.72rem',color:'#F59E0B',fontWeight:700}}>₺{(p.price/1000).toFixed(0)}K</div>
                      {alreadyOwned
                        ? <div style={{fontSize:'0.62rem',color:'#10B981',fontWeight:700}}>✅ Kadroda</div>
                        : <button onClick={()=>{
                            if(!canAfford){showNotif('Yetersiz bütçe!','error');return;}
                            setClubs(prev=>prev.map(c=>c.id===myClub.id?{...c,players:[...(c.players||[]),{name:p.name,pos:p.pos,rating:p.rating}],budget:(c.budget||0)-p.price,rating:Math.round(((c.rating||70)*Math.max(1,(c.players||[]).length)+p.rating)/(Math.max(1,(c.players||[]).length)+1))}:c));
                            showNotif(`✅ ${p.name} transfer edildi! (${p.rating} puan) -₺${(p.price/1000).toFixed(0)}K`,'success');
                          }}
                          style={{padding:'0.25rem 0.6rem',background:canAfford?'rgba(245,158,11,0.15)':'rgba(255,255,255,0.03)',border:`1px solid ${canAfford?'rgba(245,158,11,0.35)':'rgba(255,255,255,0.08)'}`,borderRadius:'6px',color:canAfford?'#F59E0B':'#3B4E63',cursor:canAfford?'pointer':'default',fontWeight:700,fontSize:'0.7rem',fontFamily:'inherit'}}>
                          Satın Al
                        </button>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>}
        </div>
      </div>)}

      {tab==='training'&&(<div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
          <div style={{fontWeight:700,color:'#10B981',marginBottom:'0.75rem'}}>🏃 Antrenman Programı</div>
          {!myClub&&<div style={{color:'#EF4444',fontSize:'0.85rem'}}>Önce bir kulüp kurman gerekiyor!</div>}
          {myClub&&(<div>
            <div style={{fontSize:'0.82rem',color:'#999',marginBottom:'0.75rem'}}>Bütçe: <strong style={{color:'#10B981'}}>₺{(myClub.budget||0).toLocaleString()}</strong></div>
            {[
              {id:'kondisyon',label:'Kondisyon Antrenmanı',cost:50000,bonus:'Hücum +2',icon:'🏃'},
              {id:'defans',label:'Defans Drilleri',cost:75000,bonus:'Savunma +2',icon:'🛡️'},
              {id:'takim',label:'Takım Çalışması',cost:100000,bonus:'Rating +3',icon:'🤝'},
              {id:'taktikEg',label:'Taktik Eğitimi',cost:120000,bonus:'Hücum +2, Savunma +2',icon:'📋'},
            ].map(tr=>(
              <div key={tr.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.6rem 0.7rem',background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:'8px',marginBottom:'0.4rem'}}>
                <div>
                  <div style={{fontWeight:700,fontSize:'0.85rem'}}>{tr.icon} {tr.label}</div>
                  <div style={{fontSize:'0.7rem',color:'#10B981'}}>{tr.bonus}</div>
                </div>
                <button onClick={()=>{
                  if((myClub.budget||0)<tr.cost){showNotif('Yetersiz bütçe!','error');return;}
                  setClubs(prev=>prev.map(c=>{
                    if(c.id!==myClub.id)return c;
                    const u={...c,budget:(c.budget||0)-tr.cost};
                    if(tr.id==='kondisyon')u.attack=(c.attack||65)+2;
                    else if(tr.id==='defans')u.defense=(c.defense||65)+2;
                    else if(tr.id==='takim')u.rating=Math.min(99,(c.rating||65)+3);
                    else if(tr.id==='taktikEg'){u.attack=(c.attack||65)+2;u.defense=(c.defense||65)+2;}
                    return u;
                  }));
                  showNotif(`✅ ${tr.label} tamamlandı! ${tr.bonus}`,'success');
                }} style={{padding:'0.35rem 0.7rem',background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'7px',color:'#10B981',cursor:'pointer',fontWeight:700,fontSize:'0.78rem',fontFamily:'inherit'}}>
                  ₺{(tr.cost/1000).toFixed(0)}K
                </button>
              </div>
            ))}
          </div>)}
        </div>
      </div>)}

      {tab==='tactics'&&(<div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
          <div style={{fontWeight:700,color:'#A78BFA',marginBottom:'0.75rem'}}>🧠 Taktik Seç</div>
          {!myClub&&<div style={{color:'#EF4444',fontSize:'0.85rem'}}>Önce bir kulüp kurman gerekiyor!</div>}
          {myClub&&(<div>
            {[
              {id:'4-4-2',label:'4-4-2 Klasik',desc:'Dengeli diziliş',attackBonus:0,defenseBonus:0},
              {id:'4-3-3',label:'4-3-3 Taarruz',desc:'Hücum odaklı',attackBonus:5,defenseBonus:-3},
              {id:'5-3-2',label:'5-3-2 Savunma',desc:'Savunma odaklı',attackBonus:-3,defenseBonus:5},
              {id:'3-5-2',label:'3-5-2 Orta Saha',desc:'Orta saha kontrolü',attackBonus:3,defenseBonus:3},
            ].map(tc=>{
              const active=myClub.tactic===tc.id;
              return(
                <div key={tc.id} onClick={()=>{
                  setClubs(prev=>prev.map(c=>c.id===myClub.id?{...c,tactic:tc.id}:c));
                  showNotif(`🧠 ${tc.label} taktiği seçildi!`,'success');
                }} style={{cursor:'pointer',padding:'0.75rem',borderRadius:'10px',border:`1px solid ${active?'rgba(167,139,250,0.5)':'rgba(255,255,255,0.07)'}`,background:active?'rgba(167,139,250,0.1)':'rgba(255,255,255,0.03)',marginBottom:'0.4rem',transition:'all 0.15s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontWeight:700,color:active?'#A78BFA':'#E8EDF2',fontSize:'0.88rem'}}>{tc.label}</div>
                      <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{tc.desc}</div>
                    </div>
                    <div style={{textAlign:'right',fontSize:'0.72rem'}}>
                      {tc.attackBonus!==0&&<div style={{color:tc.attackBonus>0?'#EF4444':'#60A5FA'}}>Hücum {tc.attackBonus>0?'+':''}{tc.attackBonus}</div>}
                      {tc.defenseBonus!==0&&<div style={{color:tc.defenseBonus>0?'#60A5FA':'#EF4444'}}>Savunma {tc.defenseBonus>0?'+':''}{tc.defenseBonus}</div>}
                      {active&&<div style={{color:'#A78BFA',fontWeight:700}}>✅ Aktif</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>)}
        </div>
      </div>)}

      {tab==='infrastructure'&&(<div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
          <div style={{fontWeight:700,color:'#F59E0B',marginBottom:'0.75rem'}}>🏟️ Altyapı Geliştirme</div>
          {!myClub&&<div style={{color:'#EF4444',fontSize:'0.85rem'}}>Önce bir kulüp kurman gerekiyor!</div>}
          {myClub&&(<div>
            <div style={{fontSize:'0.82rem',color:'#999',marginBottom:'0.75rem'}}>Bütçe: <strong style={{color:'#10B981'}}>₺{(myClub.budget||0).toLocaleString()}</strong></div>
            {[
              {id:'stadyum',label:'Stadyum Genişletme',cost:500000,bonus:'Taraftar +2000',icon:'🏟️'},
              {id:'akademi',label:'Genç Akademi',cost:750000,bonus:'Oyuncu kalitesi +5',icon:'🎓'},
              {id:'saglik',label:'Sağlık Merkezi',cost:300000,bonus:'Oyuncu kondisyon +10',icon:'🏥'},
              {id:'teknoloji',label:'Video Analiz Sistemi',cost:400000,bonus:'Rating +5',icon:'💻'},
            ].map(inf=>(
              <div key={inf.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.65rem 0.7rem',background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.15)',borderRadius:'8px',marginBottom:'0.4rem'}}>
                <div>
                  <div style={{fontWeight:700,fontSize:'0.85rem'}}>{inf.icon} {inf.label}</div>
                  <div style={{fontSize:'0.7rem',color:'#F59E0B'}}>{inf.bonus}</div>
                </div>
                <button onClick={()=>{
                  if((myClub.budget||0)<inf.cost){showNotif('Yetersiz bütçe!','error');return;}
                  setClubs(prev=>prev.map(c=>{
                    if(c.id!==myClub.id)return c;
                    const u={...c,budget:(c.budget||0)-inf.cost};
                    if(inf.id==='stadyum')u.fans=(c.fans||0)+2000;
                    else if(inf.id==='akademi')u.rating=Math.min(99,(c.rating||65)+5);
                    else if(inf.id==='teknoloji')u.rating=Math.min(99,(c.rating||65)+5);
                    return u;
                  }));
                  showNotif(`✅ ${inf.label} tamamlandı! ${inf.bonus}`,'success');
                }} style={{padding:'0.35rem 0.7rem',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'7px',color:'#F59E0B',cursor:'pointer',fontWeight:700,fontSize:'0.78rem',fontFamily:'inherit'}}>
                  ₺{(inf.cost/1000).toFixed(0)}K
                </button>
              </div>
            ))}
          </div>)}
        </div>
      </div>)}

      {tab==='sponsor'&&(<div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
          <div style={{fontWeight:700,color:'#F59E0B',marginBottom:'0.75rem',fontSize:'0.95rem'}}>💰 Aktif Sponsorlar</div>
          {!myClub&&<div style={{color:'#EF4444',fontSize:'0.85rem',marginBottom:'0.5rem'}}>Sponsor almak için önce bir kulüp kur!</div>}
          {sponsors.filter(s=>s.club===myClub?.name).length===0 && myClub && (
            <div style={{color:'#555',textAlign:'center',padding:'0.75rem',fontSize:'0.82rem'}}>Henüz sponsor yok. Aşağıdan anlaşma yap!</div>
          )}
          {sponsors.filter(s=>s.club===myClub?.name).map(s=>(
            <div key={s.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.55rem 0.7rem',background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'8px',marginBottom:'0.35rem'}}>
              <div>
                <div style={{fontWeight:700,fontSize:'0.85rem',color:'#F59E0B'}}>{s.logo} {s.name}</div>
                <div style={{fontSize:'0.68rem',color:'#5A7089'}}>Seviye: {s.tier} · Sözleşme: {s.duration} maç kaldı</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:700,color:'#10B981',fontSize:'0.82rem'}}>+₺{(s.perMatch||0).toLocaleString()}/maç</div>
                <div style={{fontSize:'0.65rem',color:'#5A7089'}}>Toplam: ₺{(s.total||0).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
          <div style={{fontWeight:700,color:'#60A5FA',marginBottom:'0.75rem',fontSize:'0.95rem'}}>📋 Sponsor Teklifleri</div>
          {!myClub&&<div style={{color:'#EF4444',fontSize:'0.85rem'}}>Önce kulüp kur!</div>}
          {myClub&&[
            {id:'nike',name:'NiKick Spor',logo:'👟',tier:'Platin',perMatch:200000,duration:10,cost:500000},
            {id:'energy',name:'TurkBoost Enerji',logo:'⚡',tier:'Altın',perMatch:100000,duration:15,cost:0},
            {id:'bank',name:'MegaBank',logo:'🏦',tier:'Gümüş',perMatch:50000,duration:20,cost:0},
            {id:'telecom',name:'UltraGSM',logo:'📱',tier:'Bronz',perMatch:25000,duration:25,cost:0},
            {id:'airline',name:'AkdenizAir',logo:'✈️',tier:'Platin',perMatch:300000,duration:8,cost:1000000},
          ].filter(sp=>!sponsors.find(s=>s.id===sp.id&&s.club===myClub.name)).map(sp=>(
            <div key={sp.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.6rem 0.7rem',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',marginBottom:'0.4rem'}}>
              <div>
                <div style={{fontWeight:700,fontSize:'0.85rem'}}>{sp.logo} {sp.name}</div>
                <div style={{fontSize:'0.7rem',color:sp.tier==='Platin'?'#A78BFA':sp.tier==='Altın'?'#FFD700':sp.tier==='Gümüş'?'#C0C0C0':'#CD7F32'}}>
                  {sp.tier} Sponsor · +₺{(sp.perMatch/1000).toFixed(0)}K/maç · {sp.duration} maç
                </div>
                {sp.cost>0&&<div style={{fontSize:'0.65rem',color:'#EF4444'}}>Anlaşma bedeli: ₺{(sp.cost/1000).toFixed(0)}K</div>}
              </div>
              <button onClick={()=>{
                if(sp.cost>(myClub.budget||0)){showNotif('Yetersiz bütçe!','error');return;}
                const newSp={...sp,club:myClub.name,total:0};
                setSponsors(prev=>[...prev,newSp]);
                if(sp.cost>0)setClubs(prev=>prev.map(c=>c.id===myClub.id?{...c,budget:(c.budget||0)-sp.cost}:c));
                showNotif(`✅ ${sp.name} ile sponsorluk anlaşması imzalandı! +₺${(sp.perMatch/1000).toFixed(0)}K/maç`,'success');
              }} style={{padding:'0.35rem 0.75rem',background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'7px',color:'#10B981',cursor:'pointer',fontWeight:700,fontSize:'0.78rem',fontFamily:'inherit',flexShrink:0}}>
                İmzala
              </button>
            </div>
          ))}
        </div>
      </div>)}

      {tab==='sosyal'&&(<div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
          <div style={{fontWeight:700,color:'#A78BFA',marginBottom:'0.65rem',fontSize:'0.95rem'}}>📱 Futbol Sosyal Medya</div>
          <textarea value={newSocialPost} onChange={e=>setNewSocialPost(e.target.value)}
            placeholder={`${cu.username||'Taraftar'} olarak futbol düşüncelerini paylaş...`} rows={2}
            style={{width:'100%',background:'rgba(167,139,250,0.05)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:'8px',padding:'0.5rem 0.7rem',color:'#E8EDF2',fontFamily:'inherit',fontSize:'0.85rem',resize:'none',outline:'none',boxSizing:'border-box',marginBottom:'0.5rem'}} />
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <button onClick={()=>{
              if(!newSocialPost.trim()){return;}
              const post={id:Date.now(),author:cu.username||'Taraftar',club:myClub?.name||'',content:newSocialPost.trim(),date:new Date().toLocaleDateString('tr-TR'),time:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}),auto:false,likes:[]};
              setSocialPosts(prev=>[post,...prev].slice(0,100));
              setNewSocialPost('');
              showNotif('📱 Paylaşıldı!','success');
            }} style={{padding:'0.4rem 1rem',background:'rgba(167,139,250,0.15)',border:'1px solid rgba(167,139,250,0.35)',borderRadius:'8px',color:'#A78BFA',cursor:'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'0.82rem'}}>📢 Paylaş</button>
          </div>
        </div>

        {socialPosts.length===0&&<div style={{textAlign:'center',padding:'2rem',color:'#555'}}>
          <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>⚽📱</div>
          <div style={{fontSize:'0.85rem'}}>Maç oyna, otomatik paylaşımlar burada görünecek!</div>
        </div>}
        {socialPosts.map(p=>(
          <div key={p.id} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${p.result==='win'?'rgba(16,185,129,0.2)':p.result==='loss'?'rgba(239,68,68,0.15)':p.result==='draw'?'rgba(245,158,11,0.15)':'rgba(255,255,255,0.06)'}`,borderRadius:'12px',padding:'0.85rem',marginBottom:'0.55rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.4rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.45rem'}}>
                <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'rgba(167,139,250,0.15)',border:'1px solid rgba(167,139,250,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.8rem'}}>⚽</div>
                <div>
                  <div style={{fontWeight:700,color:'#A78BFA',fontSize:'0.82rem'}}>{p.author}{p.club?' · '+p.club:''}</div>
                  <div style={{fontSize:'0.62rem',color:'#555'}}>{p.date} {p.time}</div>
                </div>
                {p.auto&&<span style={{fontSize:'0.62rem',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'4px',padding:'0 0.3rem',color:'#6EE7B7'}}>Otomatik</span>}
              </div>
              {p.result&&<span style={{fontSize:'0.75rem',fontWeight:700,color:p.result==='win'?'#10B981':p.result==='loss'?'#EF4444':'#F59E0B'}}>{p.result==='win'?'🏆 Galibiyet':p.result==='loss'?'💔 Mağlubiyet':'🤝 Beraberlik'}</span>}
            </div>
            <div style={{fontSize:'0.87rem',color:'#ccc',lineHeight:1.5}}>{p.content}</div>
            <div style={{display:'flex',gap:'0.5rem',marginTop:'0.45rem'}}>
              <button onClick={()=>setSocialPosts(prev=>prev.map(x=>x.id===p.id?{...x,likes:[...(x.likes||[]).filter(l=>l!==cu.username),(x.likes||[]).includes(cu.username)?null:cu.username].filter(Boolean)}:x))}
                style={{padding:'0.2rem 0.6rem',background:(p.likes||[]).includes(cu.username)?'rgba(239,68,68,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${(p.likes||[]).includes(cu.username)?'rgba(239,68,68,0.4)':'rgba(255,255,255,0.08)'}`,borderRadius:'6px',color:(p.likes||[]).includes(cu.username)?'#EF4444':'#999',cursor:'pointer',fontSize:'0.75rem',fontFamily:'inherit'}}>
                ❤️ {(p.likes||[]).length}
              </button>
            </div>
          </div>
        ))}
      </div>)}

    </div>
  );
}

