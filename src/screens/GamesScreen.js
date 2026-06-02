function FootballPage({ profile, setProfile, showNotif }) {
  const [clubs, setClubs] = useLs('footballClubs', []);
  const [matches, setMatches] = useLs('footballMatches', []);
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
        {[{k:'clubs',l:'⚽ Kulübüm'},{k:'league',l:'🏆 Lig'},{k:'matches',l:'📅 Maçlar'},{k:'transfer',l:'🔄 Transfer'},{k:'training',l:'🏃 Antrenman'},{k:'tactics',l:'🧠 Taktik'},{k:'infrastructure',l:'🏟 Altyapı'}].map(t=>(
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FABRİKA SAYFASI
// ═══════════════════════════════════════════════════════
function FactoryPage({ profile, setProfile, showNotif }) {
  const [factories, setFactories] = useLs('factories', []);
  const [tab, setTab] = useState('my');
  const cu = profile || {};
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const updateUser = (upd) => {
    const next = { ...cu, ...upd };
    setProfile(next);
    localStorage.setItem('rep_userProfile', JSON.stringify(next));
    try { const u2 = JSON.parse(localStorage.getItem('rep_users')||'[]'); localStorage.setItem('rep_users', JSON.stringify(u2.map(u => u.id===next.id ? next : u))); } catch{}
  };

  const FACTORY_TYPES = [
    {id:'textile',name:'Tekstil Fabrikası',icon:'👕',cost:500000,income:3500,prodTime:3600000,product:'Kumaş'},
    {id:'food',name:'Gıda Fabrikası',icon:'🍞',cost:750000,income:5000,prodTime:4*3600000,product:'Ekmek'},
    {id:'steel',name:'Çelik Fabrikası',icon:'⚙️',cost:1500000,income:10000,prodTime:6*3600000,product:'Çelik'},
    {id:'electronics',name:'Elektronik Fabrikası',icon:'💻',cost:3000000,income:20000,prodTime:12*3600000,product:'Elektronik'},
    {id:'auto',name:'Otomobil Fabrikası',icon:'🚗',cost:5000000,income:35000,prodTime:24*3600000,product:'Araç'},
  ];

  const myFact = factories.find(f => f.owner===cu.username);
  const now = Date.now();

  const buildFactory = (type) => {
    if ((cu.money||0) < type.cost) { showNotif(`❌ ₺${type.cost.toLocaleString()} gerekli!`,'error'); return; }
    if (myFact) { showNotif('❌ Zaten bir fabrikan var!','error'); return; }
    const fact = {id:Date.now(),type:type.id,name:type.name,icon:type.icon,owner:cu.username,income:type.income,prodTime:type.prodTime,product:type.product,level:1,lastProd:now,totalProd:0};
    updateUser({money:(cu.money||0)-type.cost});
    setFactories(prev=>[...prev,fact]);
    showNotif(`✅ ${type.name} kuruldu!`,'success');
  };

  const collectIncome = () => {
    if (!myFact) return;
    const elapsed = now - myFact.lastProd;
    const cycles = Math.floor(elapsed/myFact.prodTime);
    if (cycles < 1) { const rem=myFact.prodTime-(elapsed%myFact.prodTime); showNotif(`⏳ ${Math.ceil(rem/3600000)} saat daha bekle!`,'error'); return; }
    const earned = cycles * myFact.income * myFact.level;
    updateUser({money:(cu.money||0)+earned});
    setFactories(prev=>prev.map(f=>f.id===myFact.id?{...f,lastProd:now,totalProd:(f.totalProd||0)+cycles}:f));
    showNotif(`✅ ${cycles}x üretim: +₺${earned.toLocaleString()}`,'success');
  };

  const upgradeFactory = () => {
    if (!myFact) return;
    const cost = myFact.level * 250000;
    if ((cu.money||0) < cost) { showNotif(`❌ Geliştirme maliyeti: ₺${cost.toLocaleString()}`,'error'); return; }
    updateUser({money:(cu.money||0)-cost});
    setFactories(prev=>prev.map(f=>f.id===myFact.id?{...f,level:f.level+1,income:Math.floor(f.income*1.4)}:f));
    showNotif(`✅ Fabrika Lv.${myFact.level+1}'e yükseldi! Gelir artışı +%40`,'success');
  };

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#F59E0B',marginBottom:'1rem'}}>🏭 Fabrika Yönetimi</div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem'}}>
        {[{k:'my',l:'🏭 Fabrikan'},{k:'build',l:'🏗️ Kur'},{k:'all',l:'🌐 Tüm Fabrikalar'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'0.4rem 1rem',borderRadius:'2rem',border:`1px solid ${tab===t.k?'#F59E0B':'rgba(255,255,255,0.12)'}`,background:tab===t.k?'rgba(245,158,11,0.15)':'transparent',color:tab===t.k?'#F59E0B':'#999',cursor:'pointer',fontWeight:tab===t.k?700:400,fontSize:'0.83rem',fontFamily:'inherit'}}>{t.l}</button>
        ))}
      </div>

      {tab==='my'&&<div>
        {!myFact&&<div style={{textAlign:'center',padding:'2rem',color:'#555'}}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>🏭</div>
          <div style={{marginBottom:'1rem'}}>Henüz bir fabrikan yok.</div>
          <button onClick={()=>setTab('build')} style={{padding:'0.6rem 1.4rem',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'8px',color:'#F59E0B',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>🏗️ Fabrika Kur</button>
        </div>}
        {myFact&&<div>
          <div style={{background:`rgba(245,158,11,0.07)`,border:'1px solid rgba(245,158,11,0.25)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
              <div><div style={{fontWeight:700,color:'#F59E0B',fontSize:'1.1rem'}}>{myFact.icon} {myFact.name}</div><div style={{fontSize:'0.75rem',color:'#999'}}>Seviye {myFact.level} · Ürün: {myFact.product}</div></div>
              <div style={{textAlign:'right'}}><div style={{fontWeight:700,color:'#10B981',fontSize:'1.1rem'}}>₺{myFact.income.toLocaleString()}</div><div style={{fontSize:'0.65rem',color:'#666'}}>her {myFact.prodTime/3600000}s</div></div>
            </div>
            <div style={{marginBottom:'0.75rem'}}>
              <div style={{fontSize:'0.72rem',color:'#999',marginBottom:'0.25rem'}}>Sonraki üretim:</div>
              {(()=>{
                const elapsed=now-myFact.lastProd, rem=Math.max(0,myFact.prodTime-elapsed%myFact.prodTime);
                const cycles=Math.floor(elapsed/myFact.prodTime);
                return <div style={{fontWeight:700,color:cycles>0?'#10B981':'#F59E0B',fontSize:'0.9rem'}}>{cycles>0?`✅ ${cycles}x hazır! (₺${(cycles*myFact.income*myFact.level).toLocaleString()})`:`⏳ ${Math.ceil(rem/3600000)}sa ${Math.ceil((rem%3600000)/60000)}dk`}</div>;
              })()}
            </div>
            <div style={{display:'flex',gap:'0.5rem'}}>
              <button onClick={collectIncome} style={{flex:1,padding:'0.6rem',background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'8px',color:'#10B981',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>💰 Topla</button>
              <button onClick={upgradeFactory} style={{flex:1,padding:'0.6rem',background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.25)',borderRadius:'8px',color:'#A78BFA',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>⬆️ Geliştir (₺{(myFact.level*250000).toLocaleString()})</button>
            </div>
          </div>
        </div>}
      </div>}

      {tab==='build'&&<div>
        {FACTORY_TYPES.map(type=>(
          <div key={type.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
              <div><div style={{fontWeight:700,fontSize:'1rem'}}>{type.icon} {type.name}</div><div style={{fontSize:'0.75rem',color:'#999'}}>Gelir: ₺{type.income.toLocaleString()}/{type.prodTime/3600000}sa · Ürün: {type.product}</div></div>
              <div style={{color:'#F59E0B',fontWeight:700,fontSize:'0.9rem'}}>₺{type.cost.toLocaleString()}</div>
            </div>
            <button onClick={()=>buildFactory(type)} disabled={!!myFact} style={{width:'100%',padding:'0.5rem',background:myFact?'rgba(255,255,255,0.04)':'rgba(245,158,11,0.12)',border:`1px solid ${myFact?'rgba(255,255,255,0.08)':'rgba(245,158,11,0.3)'}`,borderRadius:'8px',color:myFact?'#555':'#F59E0B',cursor:myFact?'not-allowed':'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'0.85rem'}}>{myFact?'Zaten bir fabrikan var':'🏗️ Kur'}</button>
          </div>
        ))}
      </div>}

      {tab==='all'&&<div>
        {factories.length===0&&<div style={{textAlign:'center',padding:'2rem',color:'#555'}}>Henüz fabrika yok.</div>}
        {factories.map(f=>(
          <div key={f.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.6rem 0.75rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',marginBottom:'0.35rem'}}>
            <div><div style={{fontWeight:600,fontSize:'0.85rem'}}>{f.icon} {f.name}</div><div style={{fontSize:'0.7rem',color:'#999'}}>{f.owner} · Lv.{f.level}</div></div>
            <div style={{color:'#10B981',fontWeight:700,fontSize:'0.85rem'}}>₺{f.income.toLocaleString()}/saat</div>
          </div>
        ))}
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MADENCİLİK SAYFASI
// ═══════════════════════════════════════════════════════
function MiningPage({ profile, setProfile, showNotif }) {
  const [mineData, setMineData] = useLs('mineData', {});
  const [cooldowns, setCooldowns] = useLs('mineCooldowns', {});
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};
  const now = Date.now();
  const updateUser = (upd) => {
    const next = {...cu,...upd};
    setProfile(next);
    localStorage.setItem('rep_userProfile', JSON.stringify(next));
    try { const u2 = JSON.parse(localStorage.getItem('rep_users')||'[]'); localStorage.setItem('rep_users', JSON.stringify(u2.map(u => u.id===next.id ? next : u))); } catch{}
  };

  const RESOURCES = [
    {id:'coal',name:'Kömür',icon:'🪨',cd:1800000,yield:[5,15],price:500,color:'#6B7280'},
    {id:'iron',name:'Demir',icon:'⚙️',cd:2*3600000,yield:[3,10],price:1200,color:'#9CA3AF'},
    {id:'gold',name:'Altın',icon:'✨',cd:4*3600000,yield:[1,5],price:5000,color:'#FFD700'},
    {id:'oil',name:'Petrol',icon:'🛢️',cd:6*3600000,yield:[2,8],price:3000,color:'#1F2937'},
    {id:'diamond',name:'Elmas',icon:'💎',cd:12*3600000,yield:[1,3],price:20000,color:'#7DD3FC'},
  ];
  const myResources = mineData[cu.id] || {};

  const mine = (res) => {
    const last = cooldowns[cu.id+'_'+res.id] || 0;
    const rem = res.cd - (now-last);
    if (rem > 0) { showNotif(`⏳ ${res.name} için ${Math.ceil(rem/60000)}dk bekle!`,'error'); return; }
    const amount = res.yield[0] + Math.floor(Math.random()*(res.yield[1]-res.yield[0]+1));
    const newRes = {...myResources,[res.id]:(myResources[res.id]||0)+amount};
    setMineData(prev=>({...prev,[cu.id]:newRes}));
    setCooldowns(prev=>({...prev,[cu.id+'_'+res.id]:now}));
    try { const today=new Date().toDateString(); const dk=`day_${today}`; const s=JSON.parse(localStorage.getItem('rep_dailyTaskState')||'{}'); s[dk]={...(s[dk]||{}),dailyMineCount:((s[dk]?.dailyMineCount)||0)+1}; localStorage.setItem('rep_dailyTaskState',JSON.stringify(s)); } catch(e){}
    showNotif(`✅ ${amount}x ${res.name} kazandın! (${res.icon})`,'success');
  };

  const sellAll = () => {
    let total = 0;
    const newRes = {};
    RESOURCES.forEach(r => {
      const qty = myResources[r.id]||0;
      total += qty * r.price;
      newRes[r.id] = 0;
    });
    if (total === 0) { showNotif('Satılacak kaynak yok!','error'); return; }
    updateUser({money:(cu.money||0)+total});
    setMineData(prev=>({...prev,[cu.id]:newRes}));
    showNotif(`✅ Tüm kaynaklar satıldı! +₺${total.toLocaleString()}`,'success');
  };

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#F59E0B',marginBottom:'0.5rem'}}>⛏️ Madencilik</div>
      <div style={{fontSize:'0.82rem',color:'#999',marginBottom:'1rem',background:'rgba(245,158,11,0.07)',borderRadius:'8px',padding:'0.5rem 0.75rem',border:'1px solid rgba(245,158,11,0.2)'}}>
        ⛏️ Her kaynak türünün bekleme süresi var. Kazıp satarak para kazan!
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1rem'}}>
        {RESOURCES.map(res=>{
          const last = cooldowns[cu.id+'_'+res.id]||0;
          const rem = Math.max(0, res.cd-(now-last));
          const ready = rem===0;
          const qty = myResources[res.id]||0;
          return (
            <div key={res.id} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${ready?res.color+'55':'rgba(255,255,255,0.07)'}`,borderRadius:'12px',padding:'0.85rem'}}>
              <div style={{textAlign:'center',fontSize:'2.2rem',marginBottom:'0.3rem'}}>{res.icon}</div>
              <div style={{fontWeight:700,textAlign:'center',fontSize:'0.85rem',marginBottom:'0.15rem'}}>{res.name}</div>
              <div style={{fontSize:'0.68rem',color:'#999',textAlign:'center',marginBottom:'0.5rem'}}>Fiyat: ₺{res.price.toLocaleString()} · Stok: <strong style={{color:qty>0?'#10B981':'#666'}}>{qty}</strong></div>
              {!ready&&<div style={{fontSize:'0.7rem',color:'#F59E0B',textAlign:'center',marginBottom:'0.4rem'}}>⏳ {Math.ceil(rem/60000)} dakika</div>}
              <button onClick={()=>mine(res)} style={{width:'100%',padding:'0.4rem',background:ready?'rgba(245,158,11,0.12)':'rgba(255,255,255,0.03)',border:`1px solid ${ready?'rgba(245,158,11,0.35)':'rgba(255,255,255,0.07)'}`,borderRadius:'6px',color:ready?'#F59E0B':'#555',cursor:ready?'pointer':'not-allowed',fontWeight:700,fontSize:'0.78rem',fontFamily:'inherit'}}>⛏️ {ready?'Kaz!':'Bekle'}</button>
            </div>
          );
        })}
      </div>
      <div style={{background:'rgba(16,185,129,0.07)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'12px',padding:'1rem'}}>
        <div style={{fontWeight:700,color:'#10B981',marginBottom:'0.5rem'}}>💰 Kaynakları Sat</div>
        <div style={{marginBottom:'0.75rem'}}>
          {RESOURCES.map(r=>{
            const qty=myResources[r.id]||0;
            if(!qty) return null;
            return <div key={r.id} style={{display:'flex',justifyContent:'space-between',fontSize:'0.82rem',padding:'0.2rem 0'}}>
              <span>{r.icon} {r.name}: <strong>{qty}x</strong></span>
              <span style={{color:'#10B981'}}>₺{(qty*r.price).toLocaleString()}</span>
            </div>;
          })}
          {!Object.values(myResources).some(v=>v>0)&&<div style={{color:'#555',fontSize:'0.82rem'}}>Henüz kaynak yok. Kazmaya başla!</div>}
        </div>
        <button onClick={sellAll} style={{width:'100%',padding:'0.6rem',background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'8px',color:'#10B981',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>💰 Hepsini Sat</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ORDU SAYFASI
// ═══════════════════════════════════════════════════════
function ArmyPage({ profile, setProfile, showNotif }) {
  const [army, setArmy] = useLs('playerArmy', {});
  const [tab, setTab] = useState('overview');
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};
  const [cabinet] = useLs('cabinet', {});
  const isGeneral = cabinet['Genelkurmay Başkanı'] === profile?.username;

  if (!isGeneral) {
    return (
      <div style={{padding:'1rem',background:bg,minHeight:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
        <div style={{fontSize:'4rem',marginBottom:'1rem'}}>🔒</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,color:'#EF4444',fontSize:'1.2rem',marginBottom:'0.5rem'}}>Erişim Kısıtlı</div>
        <div style={{color:'#5A7089',fontSize:'0.85rem',lineHeight:1.6,maxWidth:'280px'}}>
          Ordu Yönetim Merkezi yalnızca <strong style={{color:'#F59E0B'}}>Genelkurmay Başkanı</strong> tarafından erişilebilir.
          <br/><br/>Seçimlerle Genelkurmay Başkanlığına seçildiğinde bu ekranı görebilirsin.
        </div>
        <div style={{marginTop:'1.5rem',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'12px',padding:'0.85rem 1.5rem'}}>
          <div style={{fontSize:'0.72rem',color:'#F87171',fontWeight:700}}>⚔️ Mevcut Genelkurmay Başkanı</div>
          <div style={{fontWeight:800,color:'#E8EDF2',marginTop:'0.25rem'}}>{cabinet['Genelkurmay Başkanı'] || '— Atanmamış —'}</div>
        </div>
      </div>
    );
  }
  const updateUser = (upd) => {
    const next = {...cu,...upd};
    setProfile(next);
    localStorage.setItem('rep_userProfile', JSON.stringify(next));
    try { const u2 = JSON.parse(localStorage.getItem('rep_users')||'[]'); localStorage.setItem('rep_users', JSON.stringify(u2.map(u => u.id===next.id ? next : u))); } catch{}
  };
  const myArmy = army[cu.id] || {infantry:0,cavalry:0,artillery:0,navy:0,airforce:0,rank:'Onbaşı',battles:0,wins:0};

  const UNITS = [
    {id:'infantry',name:'Piyade',icon:'🪖',cost:5000,strength:10,upkeep:500},
    {id:'cavalry',name:'Süvari',icon:'🐴',cost:15000,strength:25,upkeep:1500},
    {id:'artillery',name:'Topçu',icon:'💣',cost:50000,strength:80,upkeep:5000},
    {id:'navy',name:'Deniz Kuvveti',icon:'⚓',cost:200000,strength:200,upkeep:20000},
    {id:'airforce',name:'Hava Kuvveti',icon:'✈️',cost:500000,strength:500,upkeep:50000},
  ];

  const ARMY_WEAPONS = [
    {id:'rifles',name:'Tüfek Takımı',icon:'🔫',cost:50000,strength:50,desc:'Her tüfek takımı +50 güç'},
    {id:'tanks',name:'Tank',icon:'🛡️',cost:500000,strength:500,desc:'Her tank +500 güç'},
    {id:'aircraft',name:'Savaş Uçağı',icon:'✈️',cost:2000000,strength:2000,desc:'Her uçak +2000 güç'},
  ];

  const RANKS = ['Onbaşı','Çavuş','Astsubay','Teğmen','Yüzbaşı','Binbaşı','Albay','General','Mareşal'];
  const armyWeapons = myArmy.armyWeapons || {};
  const weaponStrength = ARMY_WEAPONS.reduce((s,w) => s + (armyWeapons[w.id]||0)*w.strength, 0);
  const totalStrength = UNITS.reduce((s,u2) => s + (myArmy[u2.id]||0)*u2.strength, 0) + weaponStrength;
  const rankIdx = Math.min(RANKS.length-1, Math.floor(myArmy.wins/5));
  const currentRank = RANKS[rankIdx];

  const buyArmyWeapon = (weapon) => {
    if ((cu.money||0) < weapon.cost) { showNotif(`❌ ${weapon.name} için ₺${weapon.cost.toLocaleString()} gerekli!`,'error'); return; }
    updateUser({money:(cu.money||0)-weapon.cost});
    const newWeapons = {...armyWeapons, [weapon.id]:(armyWeapons[weapon.id]||0)+1};
    const newArmy = {...myArmy, armyWeapons:newWeapons};
    setArmy(prev=>({...prev,[cu.id]:newArmy}));
    showNotif(`✅ ${weapon.icon} ${weapon.name} alındı! +${weapon.strength} güç`,'success');
  };

  const recruit = (unit) => {
    if ((cu.money||0) < unit.cost) { showNotif(`❌ ${unit.name} için ₺${unit.cost.toLocaleString()} gerekli!`,'error'); return; }
    updateUser({money:(cu.money||0)-unit.cost});
    const newArmy = {...myArmy,[unit.id]:(myArmy[unit.id]||0)+1};
    setArmy(prev=>({...prev,[cu.id]:newArmy}));
    showNotif(`✅ 1x ${unit.name} askere alındı!`,'success');
  };

  const battle = () => {
    if (totalStrength < 10) { showNotif('❌ Yeterli askeri güç yok! En az 1 piyade gerekli.','error'); return; }
    const won = Math.random() < 0.55;
    const prize = won ? Math.floor(totalStrength * 100) : 0;
    const losses = won ? Math.floor(Math.random()*2) : Math.floor(Math.random()*3)+1;
    const newBattles = (myArmy.battles||0)+1;
    const newWins = (myArmy.wins||0)+(won?1:0);
    const newInfantry = Math.max(0,(myArmy.infantry||0)-losses);
    const newArmy = {...myArmy,infantry:newInfantry,battles:newBattles,wins:newWins};
    setArmy(prev=>({...prev,[cu.id]:newArmy}));
    if (prize) updateUser({money:(cu.money||0)+prize,meritPoints:(cu.meritPoints||0)+(won?15:0)});
    showNotif(won?`🏆 Savaş kazanıldı! +₺${prize.toLocaleString()} +15🏅`:`💔 Savaş kaybedildi! ${losses}x asker kayıp`);
  };

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#EF4444',marginBottom:'1rem'}}>⚔️ Ordu Yönetimi</div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem',flexWrap:'wrap'}}>
        {[{k:'overview',l:'📊 Genel Bakış'},{k:'recruit',l:'🪖 Asker Al'},{k:'weapons',l:'🔫 Silahlar'},{k:'battle',l:'⚔️ Savaş'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'0.4rem 0.9rem',borderRadius:'2rem',border:`1px solid ${tab===t.k?'#EF4444':'rgba(255,255,255,0.12)'}`,background:tab===t.k?'rgba(239,68,68,0.15)':'transparent',color:tab===t.k?'#EF4444':'#999',cursor:'pointer',fontWeight:tab===t.k?700:400,fontSize:'0.83rem',fontFamily:'inherit'}}>{t.l}</button>
        ))}
      </div>

      {tab==='overview'&&<div>
        <div style={{background:'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(0,0,0,0))',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.75rem'}}>
            <div><div style={{fontWeight:700,color:'#EF4444',fontSize:'1.1rem'}}>🪖 {cu.username} Ordusu</div><div style={{fontSize:'0.78rem',color:'#F59E0B',marginTop:'0.1rem'}}>🎖️ {currentRank}</div></div>
            <div style={{textAlign:'right'}}><div style={{fontWeight:700,color:'#60A5FA',fontSize:'1.2rem'}}>{totalStrength}</div><div style={{fontSize:'0.65rem',color:'#666'}}>TOPLAM GÜÇ</div></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem',marginBottom:'0.5rem'}}>
            {[{l:'Savaş',v:myArmy.battles||0},{l:'Galibiyet',v:myArmy.wins||0},{l:'Mağlubiyet',v:(myArmy.battles||0)-(myArmy.wins||0)}].map(s=>(
              <div key={s.l} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.5rem',textAlign:'center'}}><div style={{fontWeight:700,fontSize:'1rem'}}>{s.v}</div><div style={{fontSize:'0.62rem',color:'#666'}}>{s.l}</div></div>
            ))}
          </div>
        </div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
          <div style={{fontWeight:700,marginBottom:'0.5rem',color:'#aaa'}}>🪖 Birlikler</div>
          {UNITS.map(u2=>(
            <div key={u2.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.4rem 0.5rem',borderRadius:'6px',marginBottom:'0.25rem',background:'rgba(255,255,255,0.03)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><span style={{fontSize:'1.1rem'}}>{u2.icon}</span><span style={{fontWeight:600,fontSize:'0.85rem'}}>{u2.name}</span></div>
              <div style={{display:'flex',gap:'0.75rem',alignItems:'center'}}><span style={{fontWeight:700,color:'#60A5FA',fontSize:'0.9rem'}}>{myArmy[u2.id]||0}x</span><span style={{fontSize:'0.7rem',color:'#999'}}>Güç: {(myArmy[u2.id]||0)*u2.strength}</span></div>
            </div>
          ))}
        </div>
      </div>}

      {tab==='recruit'&&<div>
        {UNITS.map(unit=>(
          <div key={unit.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><span style={{fontSize:'1.5rem'}}>{unit.icon}</span><div><div style={{fontWeight:700,fontSize:'0.9rem'}}>{unit.name}</div><div style={{fontSize:'0.7rem',color:'#999'}}>Güç: {unit.strength} · Bakım: ₺{unit.upkeep.toLocaleString()}/gün · Adet: {myArmy[unit.id]||0}</div></div></div>
              <div style={{color:'#EF4444',fontWeight:700}}>₺{unit.cost.toLocaleString()}</div>
            </div>
            <button onClick={()=>recruit(unit)} style={{width:'100%',padding:'0.5rem',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'8px',color:'#EF4444',cursor:'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'0.85rem'}}>🪖 Askere Al (₺{unit.cost.toLocaleString()})</button>
          </div>
        ))}
      </div>}

      {tab==='weapons'&&<div>
        <div style={{background:'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(0,0,0,0))',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
          <div style={{fontWeight:700,color:'#EF4444',marginBottom:'0.4rem',fontSize:'0.9rem'}}>🔫 Ordu Silah Deposu</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'0.4rem',marginBottom:'0.5rem'}}>
            {[['⚡','Silah Gücü',weaponStrength],['🗡️','Toplam Güç',totalStrength]].map(([ic,lb,v])=>(
              <div key={lb} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.5rem',textAlign:'center'}}>
                <div style={{fontSize:'0.85rem'}}>{ic}</div>
                <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{v}</div>
                <div style={{fontSize:'0.58rem',color:'#5A7089',textTransform:'uppercase'}}>{lb}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:'0.68rem',color:'#5A7089'}}>⚡ Silah gücü şehir savunmasına ve savaşa doğrudan yansır — sınırsız</div>
        </div>
        {ARMY_WEAPONS.map(weapon=>(
          <div key={weapon.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                <span style={{fontSize:'1.5rem'}}>{weapon.icon}</span>
                <div>
                  <div style={{fontWeight:700,fontSize:'0.9rem'}}>{weapon.name}</div>
                  <div style={{fontSize:'0.7rem',color:'#999'}}>+{weapon.strength} güç · Adet: {armyWeapons[weapon.id]||0} · Toplam: +{(armyWeapons[weapon.id]||0)*weapon.strength}</div>
                  <div style={{fontSize:'0.65rem',color:'#5A7089'}}>{weapon.desc}</div>
                </div>
              </div>
              <div style={{color:'#EF4444',fontWeight:700,fontSize:'0.9rem'}}>₺{weapon.cost.toLocaleString()}</div>
            </div>
            <button onClick={()=>buyArmyWeapon(weapon)} style={{width:'100%',padding:'0.5rem',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'8px',color:'#EF4444',cursor:'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'0.85rem'}}>
              {weapon.icon} Satın Al (₺{weapon.cost.toLocaleString()})
            </button>
          </div>
        ))}
      </div>}

      {tab==='battle'&&<div>
        <div style={{background:'linear-gradient(135deg,rgba(239,68,68,0.07),rgba(0,0,0,0))',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'12px',padding:'1.25rem',marginBottom:'1rem',textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>⚔️</div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.2rem',fontWeight:700,color:'#EF4444',marginBottom:'0.25rem'}}>Savaş Meydanı</div>
          <div style={{fontSize:'0.82rem',color:'#999',marginBottom:'1rem'}}>Toplam Gücün: <strong style={{color:'#60A5FA'}}>{totalStrength}</strong> · Kazanma şansın: <strong style={{color:'#10B981'}}>~%55</strong></div>
          <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.75rem',marginBottom:'1rem',textAlign:'left'}}>
            <div style={{fontSize:'0.78rem',color:'#999',marginBottom:'0.25rem'}}>💰 Kazanç: Güç × ₺100</div>
            <div style={{fontSize:'0.78rem',color:'#999'}}>💔 Kayıp: Kaybedince bazı piyadeler düşer</div>
          </div>
          <button onClick={battle} style={{width:'100%',padding:'0.8rem',background:'linear-gradient(135deg,#DC2626,#EF4444)',border:'none',borderRadius:'10px',color:'#fff',cursor:'pointer',fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1rem'}}>⚔️ SAVAŞA GİR!</button>
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// İSTİHBARAT / SPY SAYFASI
// ═══════════════════════════════════════════════════════
function SpyPage({ profile, setProfile, showNotif }) {
  const [spyOps, setSpyOps] = useLs('spyOps', []);
  const [spyCooldown, setSpyCooldown] = useLs('spyCooldown', {});
  const [tab, setTab] = useState('ops');
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};
  const now = Date.now();
  const updateUser = (upd) => {
    const next = {...cu,...upd};
    setProfile(next);
    localStorage.setItem('rep_userProfile', JSON.stringify(next));
    try { const u2 = JSON.parse(localStorage.getItem('rep_users')||'[]'); localStorage.setItem('rep_users', JSON.stringify(u2.map(u => u.id===next.id ? next : u))); } catch{}
  };

  const OPS = [
    {id:'recon',name:'Keşif Operasyonu',icon:'🔭',cost:10000,cd:3600000,successRate:0.85,reward:{money:25000,merit:5},desc:'Rakip bölgede keşif yap, bilgi topla.'},
    {id:'sabotage',name:'Sabotaj',icon:'💣',cost:50000,cd:6*3600000,successRate:0.6,reward:{money:100000,merit:15},desc:'Rakip altyapısına sabotaj yap.'},
    {id:'intel',name:'İstihbarat Toplama',icon:'📋',cost:25000,cd:4*3600000,successRate:0.75,reward:{money:60000,merit:10},desc:'Gizli bilgi topla.'},
    {id:'infiltrate',name:'Sızma',icon:'🕵️',cost:100000,cd:12*3600000,successRate:0.5,reward:{money:250000,merit:25},desc:'Düşman örgütüne sız.'},
    {id:'cyber',name:'Siber Saldırı',icon:'💻',cost:200000,cd:24*3600000,successRate:0.65,reward:{money:500000,merit:30},desc:'Dijital altyapıya saldır.'},
  ];

  const doOp = (op) => {
    const last = spyCooldown[cu.id+'_'+op.id]||0;
    const rem = op.cd-(now-last);
    if (rem>0) { showNotif(`⏳ ${op.name} için ${Math.ceil(rem/3600000)}sa bekle!`,'error'); return; }
    if ((cu.money||0)<op.cost) { showNotif(`❌ ₺${op.cost.toLocaleString()} gerekli!`,'error'); return; }
    const success = Math.random() < op.successRate;
    const entry = {id:Date.now(),op:op.name,icon:op.icon,result:success?'success':'fail',date:new Date().toLocaleDateString('tr-TR'),reward:success?op.reward:null};
    setSpyOps(prev=>[entry,...prev].slice(0,30));
    setSpyCooldown(prev=>({...prev,[cu.id+'_'+op.id]:now}));
    if (success) {
      updateUser({money:(cu.money||0)-op.cost+op.reward.money,meritPoints:(cu.meritPoints||0)+op.reward.merit});
      showNotif(`✅ ${op.name} başarılı! +₺${op.reward.money.toLocaleString()} +${op.reward.merit}🏅`,'success');
    } else {
      updateUser({money:(cu.money||0)-op.cost});
      showNotif(`💔 ${op.name} başarısız! Ajan ele geçirildi.`,'error');
    }
  };

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#A78BFA',marginBottom:'1rem'}}>🕵️ İstihbarat Servisi</div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem'}}>
        {[{k:'ops',l:'🕵️ Operasyonlar'},{k:'log',l:'📋 Geçmiş'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'0.4rem 1rem',borderRadius:'2rem',border:`1px solid ${tab===t.k?'#A78BFA':'rgba(255,255,255,0.12)'}`,background:tab===t.k?'rgba(167,139,250,0.15)':'transparent',color:tab===t.k?'#A78BFA':'#999',cursor:'pointer',fontWeight:tab===t.k?700:400,fontSize:'0.83rem',fontFamily:'inherit'}}>{t.l}</button>
        ))}
      </div>

      {tab==='ops'&&<div>
        {OPS.map(op=>{
          const last=spyCooldown[cu.id+'_'+op.id]||0;
          const rem=Math.max(0,op.cd-(now-last));
          const ready=rem===0;
          return (
            <div key={op.id} style={{background:'rgba(167,139,250,0.05)',border:`1px solid ${ready?'rgba(167,139,250,0.25)':'rgba(255,255,255,0.07)'}`,borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><span style={{fontSize:'1.4rem'}}>{op.icon}</span><div><div style={{fontWeight:700,fontSize:'0.9rem'}}>{op.name}</div><div style={{fontSize:'0.72rem',color:'#999'}}>{op.desc}</div></div></div>
                <div style={{textAlign:'right',flexShrink:0}}><div style={{color:'#A78BFA',fontWeight:700,fontSize:'0.85rem'}}>₺{op.cost.toLocaleString()}</div><div style={{fontSize:'0.65rem',color:'#10B981'}}>Başarı: %{Math.round(op.successRate*100)}</div></div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.4rem'}}>
                <div style={{fontSize:'0.72rem',color:'#FFD700'}}>Ödül: ₺{op.reward.money.toLocaleString()} +{op.reward.merit}🏅</div>
                {!ready&&<div style={{fontSize:'0.72rem',color:'#F59E0B'}}>⏳ {Math.ceil(rem/3600000)}sa</div>}
              </div>
              <button onClick={()=>doOp(op)} style={{width:'100%',padding:'0.5rem',background:ready?'rgba(167,139,250,0.12)':'rgba(255,255,255,0.03)',border:`1px solid ${ready?'rgba(167,139,250,0.35)':'rgba(255,255,255,0.07)'}`,borderRadius:'8px',color:ready?'#A78BFA':'#555',cursor:ready?'pointer':'not-allowed',fontWeight:700,fontFamily:'inherit',fontSize:'0.85rem'}}>🕵️ {ready?'Operasyonu Başlat':'Bekleniyor'}</button>
            </div>
          );
        })}
      </div>}

      {tab==='log'&&<div>
        {spyOps.filter(o=>(spyOps.find(x=>x.id===o.id)?.result)).length===0&&<div style={{textAlign:'center',padding:'2rem',color:'#555'}}>Henüz operasyon yok.</div>}
        {spyOps.map(op=>(
          <div key={op.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.6rem 0.75rem',background:'rgba(255,255,255,0.03)',border:`1px solid ${op.result==='success'?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}`,borderRadius:'8px',marginBottom:'0.35rem'}}>
            <div><span style={{fontSize:'1rem',marginRight:'0.5rem'}}>{op.icon}</span><span style={{fontWeight:600,fontSize:'0.85rem'}}>{op.op}</span><span style={{fontSize:'0.65rem',color:'#666',marginLeft:'0.4rem'}}>{op.date}</span></div>
            <div style={{color:op.result==='success'?'#10B981':'#EF4444',fontWeight:700,fontSize:'0.8rem'}}>{op.result==='success'?`✅ +₺${op.reward?.money?.toLocaleString()}`:'💔 Başarısız'}</div>
          </div>
        ))}
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// GAZETE SAYFASI
// ═══════════════════════════════════════════════════════
function NewspaperPage({ profile, setProfile, showNotif }) {
  const [papers, setPapers] = useLs('newspapers', []);
  const [tab, setTab] = useState('read');
  const [form, setForm] = useState({title:'',content:'',category:'Gündem'});
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};
  const updateUser = (upd) => {
    const next = {...cu,...upd};
    setProfile(next);
    localStorage.setItem('rep_userProfile', JSON.stringify(next));
    try { const u2 = JSON.parse(localStorage.getItem('rep_users')||'[]'); localStorage.setItem('rep_users', JSON.stringify(u2.map(u => u.id===next.id ? next : u))); } catch{}
  };
  const CATS = ['Gündem','Ekonomi','Siyaset','Spor','Suç','Özel'];

  const publish = () => {
    if (!form.title.trim()||!form.content.trim()) { showNotif('❌ Başlık ve içerik gerekli!','error'); return; }
    if ((cu.money||0)<5000) { showNotif('❌ Yayın ücreti: ₺5,000','error'); return; }
    const paper = {id:Date.now(),title:form.title.trim(),content:form.content.trim(),category:form.category,author:cu.username,date:new Date().toLocaleDateString('tr-TR'),likes:0,views:0};
    setPapers(prev=>[paper,...prev].slice(0,100));
    updateUser({money:(cu.money||0)-5000,meritPoints:(cu.meritPoints||0)+5});
    setForm({title:'',content:'',category:'Gündem'});
    setTab('read');
    showNotif('✅ Makale yayınlandı! +5🏅','success');
  };

  const likeArticle = (id) => {
    const paper = papers.find(p=>p.id===id);
    setPapers(prev=>prev.map(p=>p.id===id?{...p,likes:(p.likes||0)+1}:p));
    if (paper?.author) {
      try {
        const inf = JSON.parse(localStorage.getItem('rep_mediaInfluence')||'{}');
        inf[paper.author] = (inf[paper.author]||0) + 1;
        localStorage.setItem('rep_mediaInfluence', JSON.stringify(inf));
      } catch{}
    }
  };

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#60A5FA',marginBottom:'1rem'}}>📰 Gazete & Medya</div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem'}}>
        {[{k:'read',l:'📰 Haberler'},{k:'eco',l:'📊 Ekonomi Bülteni'},{k:'write',l:'✍️ Yaz'},{k:'influence',l:'🏆 Yazarlar'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'0.4rem 1rem',borderRadius:'2rem',border:`1px solid ${tab===t.k?'#60A5FA':'rgba(255,255,255,0.12)'}`,background:tab===t.k?'rgba(96,165,250,0.15)':'transparent',color:tab===t.k?'#60A5FA':'#999',cursor:'pointer',fontWeight:tab===t.k?700:400,fontSize:'0.83rem',fontFamily:'inherit'}}>{t.l}</button>
        ))}
      </div>

      {tab==='read'&&<div>
        {papers.filter(p=>!p.isAuto).length===0&&<div style={{textAlign:'center',padding:'2rem',color:'#555'}}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>📰</div>
          Henüz oyuncu haberi yok. İlk makaleyi sen yaz!
        </div>}
        {papers.filter(p=>!p.isAuto).map(p=>(
          <div key={p.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.4rem'}}>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:'0.95rem',color:'#E8EDF2',marginBottom:'0.15rem',lineHeight:1.3}}>{p.title}</div><div style={{fontSize:'0.68rem',color:'#999'}}>{p.author} · {p.date} · <span style={{background:'rgba(96,165,250,0.1)',color:'#60A5FA',padding:'1px 6px',borderRadius:'4px'}}>{p.category}</span></div></div>
            </div>
            <div style={{fontSize:'0.82rem',color:'#bbb',lineHeight:1.6,marginBottom:'0.5rem'}}>{p.content}</div>
            <div style={{display:'flex',gap:'0.5rem'}}>
              <button onClick={()=>likeArticle(p.id)} style={{padding:'0.25rem 0.7rem',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'6px',color:'#EF4444',cursor:'pointer',fontSize:'0.78rem',fontFamily:'inherit'}}>❤️ {p.likes||0}</button>
              <span style={{fontSize:'0.72rem',color:'#555',lineHeight:'26px'}}>👁 {(p.views||0)+1} okuma</span>
            </div>
          </div>
        ))}
      </div>}

      {tab==='eco'&&<div>
        <div style={{background:'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.03))',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'12px',padding:'0.7rem',marginBottom:'0.75rem'}}>
          <div style={{fontWeight:700,color:'#10B981',fontSize:'0.8rem',marginBottom:'0.2rem'}}>📊 Ekonomi Bülteni — Otomatik Haberler</div>
          <div style={{fontSize:'0.68rem',color:'#5A7089',lineHeight:1.4}}>Enflasyon, faiz, döviz ve piyasa verilerine göre her 5 dakikada bir otomatik oluşturulan ekonomi haberleri.</div>
        </div>
        {papers.filter(p=>p.isAuto).length===0&&<div style={{textAlign:'center',padding:'2rem',color:'#555',fontSize:'0.82rem'}}>Henüz otomatik haber üretilmedi. Bir süre bekleyin...</div>}
        {papers.filter(p=>p.isAuto).map(p=>(
          <div key={p.id} style={{background:'rgba(16,185,129,0.04)',border:'1px solid rgba(16,185,129,0.14)',borderRadius:'12px',padding:'0.9rem',marginBottom:'0.6rem'}}>
            <div style={{fontWeight:700,fontSize:'0.88rem',color:'#E8EDF2',marginBottom:'0.3rem',lineHeight:1.35}}>{p.title}</div>
            <div style={{fontSize:'0.65rem',color:'#5A7089',marginBottom:'0.5rem',display:'flex',gap:'0.5rem',alignItems:'center'}}>
              <span style={{background:'rgba(16,185,129,0.12)',color:'#10B981',padding:'1px 7px',borderRadius:'4px',fontWeight:700}}>{p.category}</span>
              <span>{p.author}</span>
              <span>·</span>
              <span>{p.date}</span>
            </div>
            <div style={{fontSize:'0.78rem',color:'#8899AA',lineHeight:1.55,marginBottom:'0.4rem'}}>{p.content}</div>
            <div style={{fontSize:'0.65rem',color:'#5A7089'}}>👁 {p.views||0} okuma · 🤖 Yapay Zeka Üretimi</div>
          </div>
        ))}
      </div>}

      {tab==='influence'&&<div>
        <div style={{background:'rgba(96,165,250,0.06)',border:'1px solid rgba(96,165,250,0.15)',borderRadius:'12px',padding:'0.75rem',marginBottom:'0.75rem'}}>
          <div style={{fontSize:'0.68rem',color:'#60A5FA',fontWeight:700,textTransform:'uppercase',marginBottom:'0.4rem'}}>📡 Etki Puanı Sıralaması</div>
          <div style={{fontSize:'0.72rem',color:'#5A7089',lineHeight:1.4}}>Makalelerine beğeni aldıkça etki puanın artar. Yüksek etki puanı → daha fazla siyasi güç.</div>
        </div>
        {(()=>{
          const inf = (() => { try { return JSON.parse(localStorage.getItem('rep_mediaInfluence')||'{}'); } catch{return {};} })();
          const myInf = inf[cu.username] || 0;
          const sorted = Object.entries(inf).sort((a,b)=>b[1]-a[1]).slice(0,10);
          return (
            <div>
              <div style={{background:'rgba(245,158,11,0.07)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'12px',padding:'0.7rem',marginBottom:'0.6rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:'0.8rem',color:'#E8EDF2',fontWeight:700}}>📡 Etki Puanım</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:'#F59E0B',fontSize:'1.1rem'}}>{myInf}</div>
              </div>
              {sorted.length === 0 && <div style={{textAlign:'center',color:'#5A7089',padding:'1.5rem',fontSize:'0.82rem'}}>Henüz kimse beğeni almadı.</div>}
              {sorted.map(([author, pts], i) => (
                <div key={author} style={{display:'flex',alignItems:'center',gap:'0.65rem',padding:'0.55rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <div style={{minWidth:'22px',textAlign:'center',fontWeight:800,color:i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'#5A7089',fontSize:'0.82rem'}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</div>
                  <div style={{flex:1,fontWeight:700,color:author===cu.username?'#60A5FA':'#E8EDF2',fontSize:'0.85rem'}}>{author}{author===cu.username?' (Sen)':''}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#F59E0B',fontSize:'0.88rem'}}>📡 {pts}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>}

      {tab==='write'&&<div>
        <div style={{background:'rgba(96,165,250,0.05)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem'}}>
          <div style={{fontSize:'0.8rem',color:'#60A5FA',marginBottom:'0.5rem',fontWeight:700}}>📝 Makale Yayınla (₺5,000)</div>
          <div style={{marginBottom:'0.5rem'}}>
            <div style={{fontSize:'0.72rem',color:'#999',marginBottom:'0.25rem'}}>Kategori</div>
            <div style={{display:'flex',gap:'0.3rem',flexWrap:'wrap'}}>
              {CATS.map(c=><button key={c} onClick={()=>setForm(prev=>({...prev,category:c}))} style={{padding:'0.25rem 0.6rem',borderRadius:'1rem',border:`1px solid ${form.category===c?'#60A5FA':'rgba(255,255,255,0.12)'}`,background:form.category===c?'rgba(96,165,250,0.15)':'transparent',color:form.category===c?'#60A5FA':'#999',cursor:'pointer',fontSize:'0.75rem',fontFamily:'inherit'}}>{c}</button>)}
            </div>
          </div>
          <input value={form.title} onChange={e=>setForm(prev=>({...prev,title:e.target.value}))} placeholder="Makale başlığı..." style={{width:'100%',padding:'0.6rem 0.75rem',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'#E8EDF2',fontSize:'0.9rem',outline:'none',marginBottom:'0.5rem',fontFamily:'inherit'}} />
          <textarea value={form.content} onChange={e=>setForm(prev=>({...prev,content:e.target.value}))} placeholder="Makale içeriği... (min 50 karakter)" rows={5} style={{width:'100%',padding:'0.6rem 0.75rem',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'#E8EDF2',fontSize:'0.85rem',outline:'none',resize:'vertical',fontFamily:'inherit',marginBottom:'0.5rem'}} />
          <button onClick={publish} style={{width:'100%',padding:'0.65rem',background:'rgba(96,165,250,0.15)',border:'1px solid rgba(96,165,250,0.3)',borderRadius:'8px',color:'#60A5FA',cursor:'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'0.9rem'}}>📰 Yayınla (₺5,000)</button>
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PVP DÖVÜŞ SAYFASI
// ═══════════════════════════════════════════════════════
function PvpPage({ profile, setProfile, showNotif }) {
  const [battles, setBattles] = useLs('pvpBattles', []);
  const [pvpCooldown, setPvpCooldown] = useLs('pvpCooldown', {});
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};
  const now = Date.now();
  const updateUser = (upd) => {
    const next = {...cu,...upd};
    setProfile(next);
    localStorage.setItem('rep_userProfile', JSON.stringify(next));
    try { const u2 = JSON.parse(localStorage.getItem('rep_users')||'[]'); localStorage.setItem('rep_users', JSON.stringify(u2.map(u => u.id===next.id ? next : u))); } catch{}
  };

  const allUsers = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch{return [];} })();
  const targets = allUsers.filter(u => u.id!==cu.id && !u.banned);

  const attack = (target) => {
    const lastBattle = pvpCooldown[cu.id]||0;
    if (now-lastBattle < 5*60*1000) { showNotif('⏳ PvP cooldown: 5 dakika!','error'); return; }
    if ((cu.hp||100) < 20) { showNotif('❌ Canın çok az! İyileş önce.','error'); return; }
    const myStr = (cu.level||1)*10 + (cu.meritPoints||0)/10;
    const oppStr = (target.level||1)*10 + (target.meritPoints||0)/10;
    const won = Math.random()*100 < Math.min(80,Math.max(20,(myStr/(myStr+oppStr))*100));
    const stolen = won ? Math.floor(Math.min(target.money||0, (target.money||0)*0.05)) : 0;
    const hpLost = won ? 5 : 15;
    const battle = {id:Date.now(),attacker:cu.username,defender:target.username,result:won?'win':'loss',stolen,date:new Date().toLocaleDateString('tr-TR')};
    setBattles(prev=>[battle,...prev].slice(0,50));
    setPvpCooldown(prev=>({...prev,[cu.id]:now}));
    try { const today=new Date().toDateString(); const dk=`day_${today}`; const s=JSON.parse(localStorage.getItem('rep_dailyTaskState')||'{}'); s[dk]={...(s[dk]||{}),dailyPvpCount:((s[dk]?.dailyPvpCount)||0)+1}; localStorage.setItem('rep_dailyTaskState',JSON.stringify(s)); } catch(e){}
    if (won) {
      updateUser({money:(cu.money||0)+stolen, hp:Math.max(0,(cu.hp||100)-hpLost), meritPoints:(cu.meritPoints||0)+10});
      const newUsers = allUsers.map(u => u.id===target.id ? {...u,money:Math.max(0,(u.money||0)-stolen)} : u);
      localStorage.setItem('rep_users', JSON.stringify(newUsers));
      showNotif(`⚔️ Saldırı başarılı! +₺${stolen.toLocaleString()} +10🏅 -${hpLost}❤️`,'success');
      try { if (stolen > 50000) window._pushGameEvent?.('pvp_galibiyet', `⚔️ ${cu.username} → ${target.username} savaşı kazandı!`, `₺${stolen.toLocaleString()} ganimet alındı.`, '⚔️', 'savaş'); } catch(e){}
    } else {
      updateUser({hp:Math.max(0,(cu.hp||100)-hpLost)});
      showNotif(`💔 Saldırı başarısız! -${hpLost}❤️`,'error');
    }
  };

  const myBattles = battles.filter(b=>b.attacker===cu.username||b.defender===cu.username);
  const wins = myBattles.filter(b=>b.attacker===cu.username&&b.result==='win').length;

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#EF4444',marginBottom:'1rem'}}>⚔️ PvP Savaş Alanı</div>
      <div style={{background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem'}}>
          {[{l:'Can',v:`${cu.hp||100}/100`,c:(cu.hp||100)>50?'#10B981':(cu.hp||100)>20?'#F59E0B':'#EF4444'},{l:'Galibiyet',v:wins,c:'#10B981'},{l:'Toplam Savaş',v:myBattles.length,c:'#60A5FA'}].map(s=>(
            <div key={s.l} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.5rem',textAlign:'center'}}><div style={{fontWeight:700,color:s.c,fontSize:'0.95rem'}}>{s.v}</div><div style={{fontSize:'0.62rem',color:'#666'}}>{s.l}</div></div>
          ))}
        </div>
      </div>
      <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
        <div style={{fontWeight:700,color:'#aaa',marginBottom:'0.75rem',fontSize:'0.9rem'}}>🎯 Saldırı Hedefleri</div>
        {targets.length===0&&<div style={{color:'#555',textAlign:'center',padding:'1rem'}}>Başka oyuncu bulunamadı.</div>}
        {targets.slice(0,15).map(t=>(
          <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0.6rem',background:'rgba(255,255,255,0.03)',borderRadius:'8px',marginBottom:'0.3rem',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div>
              <div style={{fontWeight:600,fontSize:'0.85rem'}}>{t.username}</div>
              <div style={{fontSize:'0.7rem',color:'#999'}}>Lv.{t.level||1} · ❤️{t.hp||100} · ₺{((t.money||0)/1000).toFixed(0)}K</div>
            </div>
            <button onClick={()=>attack(t)} style={{padding:'0.35rem 0.8rem',background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'6px',color:'#EF4444',cursor:'pointer',fontWeight:700,fontSize:'0.78rem',fontFamily:'inherit'}}>⚔️ Saldır</button>
          </div>
        ))}
      </div>
      {myBattles.length>0&&<div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
        <div style={{fontWeight:700,color:'#aaa',marginBottom:'0.5rem',fontSize:'0.9rem'}}>📋 Savaş Geçmişi</div>
        {myBattles.slice(0,10).map(b=>(
          <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.4rem 0.5rem',borderRadius:'6px',marginBottom:'0.25rem',background:'rgba(255,255,255,0.03)',border:`1px solid ${b.result==='win'&&b.attacker===cu.username?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.15)'}`}}>
            <div style={{fontSize:'0.8rem'}}>{b.attacker===cu.username?'⚔️':'🛡️'} <strong>{b.attacker===cu.username?b.defender:b.attacker}</strong></div>
            <div style={{fontSize:'0.78rem',fontWeight:700,color:(b.result==='win'&&b.attacker===cu.username)?'#10B981':'#EF4444'}}>{(b.result==='win'&&b.attacker===cu.username)?`+₺${(b.stolen||0).toLocaleString()}`:'💔'}</div>
          </div>
        ))}
      </div>}
    </div>
  );
}

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
  const endRef = useRef(null);
  const rtdbRef = useRef(null);
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const rooms = ['Genel', 'Liderler', 'Savaş Planı', 'Ticaret'];

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
        <div style={{display:'flex',alignItems:'center',gap:'0.35rem',fontSize:'0.7rem',color:online?'#10B981':'#5A7089',fontWeight:700}}>
          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:online?'#10B981':'#5A7089',boxShadow:online?'0 0 6px #10B981':'none'}}/>
          {online?'Canlı':'Çevrimdışı'}
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

// ═══════════════════════════════════════════════════════
// NPC OYUNCULAR SAYFASI
// ═══════════════════════════════════════════════════════
const NPC_DEFS = [
  {id:'npc1',name:'Don Kemal',   icon:'🤵',role:'Tefeci',      city:'İstanbul',desc:'Finans dünyasının gölge figürü', trait:'Açgözlü',  color:'#EF4444'},
  {id:'npc2',name:'Av. Avcı',    icon:'⚖️',role:'Avukat',      city:'Ankara',  desc:'Her davayı kazanan soğuk kanlı',trait:'Hesaplı',  color:'#3B82F6'},
  {id:'npc3',name:'Çakal Mete',  icon:'🎯',role:'Sokak Lideri',city:'İzmir',   desc:'Sokakların tartışmasız efendisi',trait:'Saldırgan',color:'#F59E0B'},
  {id:'npc4',name:'Büyükanne',   icon:'👵',role:'Bilge',       city:'Bursa',   desc:'Her şeyi bilen gizemli yaşlı kadın',trait:'Bilge',color:'#10B981'},
  {id:'npc5',name:'Korsan Hakan',icon:'🏴‍☠️',role:'Kaptan',  city:'Trabzon', desc:'Karadenizin efsanevi kaptanı',  trait:'Cesur',    color:'#8B5CF6'},
  {id:'npc6',name:'Dr. Yılmaz',  icon:'🔬',role:'Bilim İnsanı',city:'İzmir',  desc:'Tehlikeli bilginin sahibi',     trait:'Gizemli',  color:'#06B6D4'},
  {id:'npc7',name:'General Fırat',icon:'⚔️',role:'Subay',     city:'Ankara',  desc:'Darbe planlarıyla ünlü general',trait:'Otoriter', color:'#DC2626'},
  {id:'npc8',name:'Hacı Murat',  icon:'🕌',role:'Esnaf',       city:'Konya',   desc:'Çarşının gizli patronu',        trait:'Güvenilmez',color:'#D97706'},
];

function NpcPlayersPage({ profile, showNotif }) {
  const { dark } = useTheme();
  const cu = profile || {};
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [relations, setRelations] = useState(()=>{try{return JSON.parse(localStorage.getItem('npcRelations')||'{}');}catch{return {};}});
  const [activity, setActivity] = useState([
    {npc:'Don Kemal',   text:'Borsa üzerinden manipülasyon yaptı',ts:Date.now()-120000},
    {npc:'Çakal Mete',  text:'Güney mahallede toprak genişletti', ts:Date.now()-300000},
    {npc:'General Fırat',text:'Askeri tatbikat ilan etti',        ts:Date.now()-600000},
  ]);
  const [selected, setSelected] = useState(null);

  const doAction = (npc, action) => {
    const cur = relations[npc.id] || 0;
    const delta = action==='trade'?10:action==='alliance'?20:-25;
    const next = Math.max(-100, Math.min(100, cur+delta));
    const updated = {...relations,[npc.id]:next};
    setRelations(updated);
    localStorage.setItem('npcRelations', JSON.stringify(updated));
    const labels = {trade:'Ticaret',alliance:'İttifak',attack:'Saldırı'};
    setActivity(prev=>[{npc:npc.name,text:`${cu.username||'Sen'} ile ${labels[action]} → İlişki: ${next}`,ts:Date.now()},...prev].slice(0,20));
    showNotif(`${npc.icon} ${npc.name} ile ${labels[action]} yapıldı`,action==='attack'?'error':'success');
    setSelected(null);
  };

  const relColor = v => v>=50?'#10B981':v>=0?'#F59E0B':'#EF4444';
  const relLabel = v => v>=50?'Dost':v>=0?'Nötr':'Düşman';

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:800,color:'#818CF8',letterSpacing:'0.08em'}}>🤖 NPC OYUNCULAR</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem'}}>
        {NPC_DEFS.map(npc => {
          const rel = relations[npc.id]||0;
          return (
            <button key={npc.id} onClick={()=>setSelected(npc)}
              style={{background:card,border:`1px solid ${selected?.id===npc.id?npc.color:border}`,borderRadius:'14px',padding:'0.75rem',textAlign:'left',cursor:'pointer',display:'flex',flexDirection:'column',gap:'0.35rem',transition:'all 0.15s',boxShadow:selected?.id===npc.id?`0 0 12px ${npc.color}33`:'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
                <span style={{fontSize:'1.5rem'}}>{npc.icon}</span>
                <div style={{flex:1,overflow:'hidden'}}>
                  <div style={{fontSize:'0.82rem',fontWeight:700,color:dark?'#E8EDF2':'#1E293B',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{npc.name}</div>
                  <div style={{fontSize:'0.68rem',color:npc.color,fontWeight:600}}>{npc.role}</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:'0.65rem',color:'#5A7089'}}>{npc.city}</span>
                <span style={{fontSize:'0.65rem',fontWeight:700,color:relColor(rel)}}>{relLabel(rel)} ({rel>0?'+':''}{rel})</span>
              </div>
              <div style={{height:'3px',borderRadius:'2px',background:dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.abs(rel)}%`,background:relColor(rel),borderRadius:'2px',transition:'width 0.3s'}}/>
              </div>
            </button>
          );
        })}
      </div>
      {selected && (
        <div style={{background:card,border:`1px solid ${selected.color}44`,borderRadius:'16px',padding:'1rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
            <span style={{fontSize:'2rem'}}>{selected.icon}</span>
            <div>
              <div style={{fontSize:'0.95rem',fontWeight:800,color:dark?'#E8EDF2':'#1E293B'}}>{selected.name}</div>
              <div style={{fontSize:'0.75rem',color:'#5A7089'}}>{selected.desc}</div>
            </div>
          </div>
          <div style={{fontSize:'0.78rem',color:'#5A7089'}}>Özellik: <span style={{color:selected.color,fontWeight:700}}>{selected.trait}</span></div>
          <div style={{display:'flex',gap:'0.5rem'}}>
            <button onClick={()=>doAction(selected,'trade')} style={{flex:1,padding:'0.55rem',borderRadius:'10px',border:'1px solid rgba(16,185,129,0.3)',background:'rgba(16,185,129,0.1)',color:'#10B981',fontWeight:700,fontSize:'0.8rem',cursor:'pointer'}}>💼 Ticaret</button>
            <button onClick={()=>doAction(selected,'alliance')} style={{flex:1,padding:'0.55rem',borderRadius:'10px',border:'1px solid rgba(59,130,246,0.3)',background:'rgba(59,130,246,0.1)',color:'#60A5FA',fontWeight:700,fontSize:'0.8rem',cursor:'pointer'}}>🤝 İttifak</button>
            <button onClick={()=>doAction(selected,'attack')} style={{flex:1,padding:'0.55rem',borderRadius:'10px',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.1)',color:'#F87171',fontWeight:700,fontSize:'0.8rem',cursor:'pointer'}}>⚔️ Saldır</button>
          </div>
        </div>
      )}
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'0.78rem',fontWeight:700,color:'#5A7089',textTransform:'uppercase',letterSpacing:'0.1em',marginTop:'0.25rem'}}>Son Aktivite</div>
      <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
        {activity.map((a,i)=>(
          <div key={i} style={{background:card,border:`1px solid ${border}`,borderRadius:'10px',padding:'0.5rem 0.75rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'0.8rem',color:dark?'#E8EDF2':'#1E293B'}}><b style={{color:'#818CF8'}}>{a.npc}</b>: {a.text}</span>
            <span style={{fontSize:'0.65rem',color:'#5A7089',flexShrink:0,marginLeft:'0.5rem'}}>{timeAgo(a.ts)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DUYURULAR SAYFASI
// ═══════════════════════════════════════════════════════
function DuyurularPage({ profile }) {
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [announcements] = useLs('announcements', []);
  const [selected, setSelected] = useState(null);
  const catColor = {Siyaset:'#EF4444',Ekonomi:'#F59E0B',Hukuk:'#3B82F6',Etkinlik:'#10B981',Sistem:'#8B5CF6'};
  const defaultAnn = [
    {id:'ann1',title:'Seçim Krizi!',body:'Seçim sonuçları tartışmalı, siyasi gerilim tırmanıyor. Tüm partiler acil toplantıya çağrıldı.',category:'Siyaset',icon:'🏛️',ts:Date.now()-3600000},
    {id:'ann2',title:'Ekonomi Uyarısı',body:'Merkez Bankası faiz kararı açıkladı. Piyasalarda dalgalanma bekleniyor.',category:'Ekonomi',icon:'💰',ts:Date.now()-7200000},
    {id:'ann3',title:'Yeni Yasa Tasarısı',body:'Meclis yeni bir yasa tasarısı oylamaya sunuyor. Tüm vatandaşlar görüş bildirebilir.',category:'Hukuk',icon:'⚖️',ts:Date.now()-14400000},
    {id:'ann4',title:'Klan Turnuvası',body:'Bu hafta sonu klan savaşı başlıyor! Katılım için klan liderinizle iletişime geçin.',category:'Etkinlik',icon:'⚔️',ts:Date.now()-86400000},
  ];
  const list = [...announcements,...defaultAnn].slice(0,20);

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:800,color:'#F59E0B',letterSpacing:'0.08em'}}>📣 DUYURULAR</div>
      {selected ? (
        <div style={{background:card,border:`1px solid ${catColor[selected.category]||border}44`,borderRadius:'16px',padding:'1.25rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <span style={{fontSize:'1.8rem'}}>{selected.icon||'📣'}</span>
            <div>
              <div style={{fontSize:'0.95rem',fontWeight:800,color:dark?'#E8EDF2':'#1E293B'}}>{selected.title}</div>
              <div style={{fontSize:'0.72rem',color:catColor[selected.category]||'#F59E0B',fontWeight:700}}>{selected.category} • {timeAgo(selected.ts)}</div>
            </div>
          </div>
          <div style={{fontSize:'0.9rem',color:dark?'#CBD5E1':'#334155',lineHeight:'1.6'}}>{selected.body}</div>
          <button onClick={()=>setSelected(null)} style={{alignSelf:'flex-start',padding:'0.45rem 1rem',borderRadius:'10px',border:`1px solid ${border}`,background:'transparent',color:'#5A7089',fontSize:'0.8rem',cursor:'pointer',fontWeight:600}}>← Geri</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
          {list.map(a=>(
            <button key={a.id||a.ts} onClick={()=>setSelected(a)}
              style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'0.85rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem',cursor:'pointer',textAlign:'left',transition:'all 0.15s'}}>
              <span style={{fontSize:'1.4rem',flexShrink:0}}>{a.icon||'📣'}</span>
              <div style={{flex:1,overflow:'hidden'}}>
                <div style={{fontSize:'0.88rem',fontWeight:700,color:dark?'#E8EDF2':'#1E293B',marginBottom:'0.2rem'}}>{a.title}</div>
                <div style={{fontSize:'0.75rem',color:'#5A7089',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.body}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'0.2rem',flexShrink:0}}>
                <span style={{fontSize:'0.65rem',fontWeight:700,color:catColor[a.category]||'#F59E0B',background:`${catColor[a.category]||'#F59E0B'}15`,padding:'2px 6px',borderRadius:'6px'}}>{a.category}</span>
                <span style={{fontSize:'0.62rem',color:'#5A7089'}}>{timeAgo(a.ts)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SIRALAMA (LEADERBOARD) SAYFASI
// ═══════════════════════════════════════════════════════
function LeaderboardPage({ profile, onNavigate }) {
  const { dark } = useTheme();
  const [allUsers] = useLs('users', []);
  const cu = profile || {};
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const TABS = [
    {id:'money', label:'💰 Servet',  key:'money'},
    {id:'xp',    label:'⭐ XP',      key:'xp'},
    {id:'merit', label:'🏅 Liyakat', key:'meritPoints'},
    {id:'trade', label:'🤝 Ticaret', key:'tradePoints'},
    {id:'level',     label:'📈 Seviye',  key:'level'},
    {id:'edu',       label:'🎓 Eğitim',  key:'educationProgress'},
    {id:'influence', label:'⚡ Etki',    key:'influencePoints'},
    {id:'military',  label:'🪖 Askeri',  key:'militaryPoints'},
  ];
  const [tab, setTab] = useState('money');
  const activeTab = TABS.find(t=>t.id===tab);
  const usersRaw = Array.isArray(allUsers) ? allUsers : [];
  const usersWithMe = usersRaw.map(u => u.id===cu.id ? {...u, ...cu} : u);
  const meInList = usersWithMe.find(u => u.id===cu.id);
  const finalUsers = (meInList || !cu.id) ? usersWithMe : [...usersWithMe, cu];
  const sorted = [...finalUsers].filter(u=>!u.banned).sort((a,b)=>(b[activeTab.key]||0)-(a[activeTab.key]||0)).slice(0,50);
  const myRank = sorted.findIndex(u=>u.id===cu.id)+1;
  const medal = i => i===0?{icon:'🥇',color:'#FFD700',glow:'rgba(255,215,0,0.3)'}:i===1?{icon:'🥈',color:'#C0C0C0',glow:'rgba(192,192,192,0.3)'}:i===2?{icon:'🥉',color:'#CD7F32',glow:'rgba(205,127,50,0.3)'}:null;
  const fmtVal = u => {
    const v=u[activeTab.key]||0;
    if (tab==='edu') return `${Number(v).toLocaleString('tr-TR')} puan`;
    if (tab==='money') return fmtWord(v);
    return Number(v).toLocaleString('tr-TR');
  };

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:800,color:'#FFD700',letterSpacing:'0.08em'}}>🏆 SIRALAMA</div>
      <div style={{display:'flex',background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'3px',gap:'3px'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:'0.45rem 0.2rem',borderRadius:'9px',border:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.7rem',transition:'all 0.15s',whiteSpace:'nowrap',
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
      <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
        {sorted.length===0&&<div style={{color:'#5A7089',fontSize:'0.85rem',textAlign:'center',marginTop:'2rem'}}>Henüz kayıtlı oyuncu yok.</div>}
        {sorted.map((u,i)=>{
          const m=medal(i); const isMe=u.id===cu.id;
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
                {tab==='money'&&u.xp>0&&<div style={{fontSize:'0.62rem',color:'#5A7089'}}>{u.xp?.toLocaleString()} XP</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SocialPage({ profile, showNotif }) {
  const [posts, setPosts] = useLs('socialPosts', []);
  const [newPost, setNewPost] = useState('');
  const [postImage, setPostImage] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};

  const SOCIAL_GIFS = [
    'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
    'https://media.giphy.com/media/l0HlFZ3HqbGrMTBQs/giphy.gif',
    'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    'https://media.giphy.com/media/xT9IgG50Lg7russbBO/giphy.gif',
    'https://media.giphy.com/media/l4FGGafcOHmrlQxG0/giphy.gif',
    'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
    'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    'https://media.giphy.com/media/3oEdv22bMDaqXkOIPS/giphy.gif',
  ];

  const publishPost = (contentOverride, imageOverride) => {
    const content = contentOverride || newPost;
    const image = imageOverride !== undefined ? imageOverride : postImage;
    if (!content.trim() && !image.trim()) { showNotif('❌ Gönderi boş olamaz!','error'); return; }
    if (content.length > 500) { showNotif('❌ Maksimum 500 karakter!','error'); return; }
    const post = {
      id:Date.now(), author:cu.username, content:content.trim(),
      imageUrl: image.trim() || undefined,
      likes:[], comments:[], date:new Date().toLocaleDateString('tr-TR'),
      time:new Date().toLocaleTimeString('tr-TR'), city:cu.city||'İstanbul'
    };
    setPosts(prev=>[post,...prev].slice(0,200));
    setNewPost(''); setPostImage(''); setShowGifPicker(false);
    showNotif('✅ Gönderi paylaşıldı!','success');
    try {
      const ds = JSON.parse(localStorage.getItem('rep_dailyTaskProgress')||'{}');
      const today = new Date().toDateString();
      const ts = ds[today]||{};
      const ps = JSON.parse(localStorage.getItem('rep_socialPosts')||'[]');
      localStorage.setItem('rep_socialPosts', JSON.stringify([post,...ps].slice(0,200)));
    } catch(e){}
  };

  const likePost = (id) => {
    setPosts(prev=>prev.map(p=>{
      if(p.id!==id) return p;
      const liked = (p.likes||[]).includes(cu.username);
      return {...p,likes:liked?(p.likes||[]).filter(l=>l!==cu.username):[...(p.likes||[]),cu.username]};
    }));
  };

  const deletePost = (id) => {
    setPosts(prev=>prev.filter(p=>p.id!==id));
    showNotif('🗑️ Gönderi silindi.','info');
  };

  const imgRx = /(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|gifv)(\?\S*)?|https?:\/\/(?:media\.giphy\.com|i\.giphy\.com|tenor\.com|c\.tenor\.com)\S+)/i;

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#A78BFA',marginBottom:'1rem'}}>📱 Sosyal Medya</div>
      <div style={{background:'rgba(167,139,250,0.05)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
        <textarea value={newPost} onChange={e=>setNewPost(e.target.value)} placeholder={`${cu.username||'Oyuncu'} olarak ne düşünüyorsun?`} rows={3}
          style={{width:'100%',background:'transparent',border:'none',outline:'none',color:'#E8EDF2',fontSize:'0.9rem',resize:'none',fontFamily:'inherit',marginBottom:'0.5rem'}} />
        {postImage && (
          <div style={{position:'relative',marginBottom:'0.5rem'}}>
            <img src={postImage} alt="önizleme" style={{maxWidth:'100%',maxHeight:'180px',borderRadius:'10px',objectFit:'cover',border:'1px solid rgba(167,139,250,0.2)'}} onError={e=>e.target.style.display='none'} />
            <button onClick={()=>setPostImage('')} style={{position:'absolute',top:'4px',right:'4px',background:'rgba(0,0,0,0.6)',border:'none',borderRadius:'50%',width:'22px',height:'22px',color:'#fff',cursor:'pointer',fontSize:'0.75rem',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
        )}
        {showGifPicker && (
          <div style={{marginBottom:'0.5rem'}}>
            <div style={{overflowX:'auto',display:'flex',gap:'0.4rem',paddingBottom:'0.3rem',scrollbarWidth:'none'}}>
              {SOCIAL_GIFS.map((g,i)=>(
                <img key={i} src={g} alt="gif" onClick={()=>{setPostImage(g);setShowGifPicker(false);}}
                  style={{height:'65px',width:'65px',objectFit:'cover',borderRadius:'8px',cursor:'pointer',border:'1px solid rgba(167,139,250,0.25)',flexShrink:0}}
                  onError={e=>e.target.style.display='none'} />
              ))}
            </div>
          </div>
        )}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'0.4rem'}}>
          <div style={{display:'flex',gap:'0.4rem',alignItems:'center'}}>
            <button onClick={()=>setShowGifPicker(v=>!v)} title="GIF ekle"
              style={{background:showGifPicker?'rgba(167,139,250,0.2)':'rgba(255,255,255,0.05)',border:`1px solid ${showGifPicker?'rgba(167,139,250,0.5)':'rgba(255,255,255,0.1)'}`,borderRadius:'8px',padding:'0.3rem 0.55rem',color:showGifPicker?'#A78BFA':'#666',cursor:'pointer',fontSize:'0.8rem',fontWeight:700}}>
              🎞️ GIF
            </button>
            <input value={postImage} onChange={e=>setPostImage(e.target.value)} placeholder="Resim URL..."
              style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'0.3rem 0.6rem',color:'#E8EDF2',fontFamily:'inherit',fontSize:'0.75rem',outline:'none',width:'130px'}} />
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <span style={{fontSize:'0.7rem',color:newPost.length>480?'#EF4444':'#666'}}>{newPost.length}/500</span>
            <button onClick={()=>publishPost()} style={{padding:'0.45rem 1.1rem',background:'rgba(167,139,250,0.15)',border:'1px solid rgba(167,139,250,0.35)',borderRadius:'8px',color:'#A78BFA',cursor:'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'0.85rem'}}>📢 Paylaş</button>
          </div>
        </div>
      </div>
      {posts.map(p=>{
        const textImgMatch = p.content?.match(imgRx);
        const mainImage = p.imageUrl || (textImgMatch ? textImgMatch[0] : null);
        const displayText = textImgMatch ? p.content.replace(textImgMatch[0],'').trim() : p.content;
        return (
          <div key={p.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem'}}>
              <div>
                <div style={{fontWeight:700,color:'#A78BFA',fontSize:'0.88rem'}}>{p.author}</div>
                <div style={{fontSize:'0.65rem',color:'#666'}}>{p.city} · {p.date} {p.time}</div>
              </div>
              {p.author===cu.username&&<button onClick={()=>deletePost(p.id)} style={{background:'none',border:'none',color:'#EF4444',cursor:'pointer',fontSize:'0.85rem'}}>🗑️</button>}
            </div>
            {displayText && <div style={{fontSize:'0.88rem',color:'#ccc',lineHeight:1.6,marginBottom:'0.5rem'}}>{displayText}</div>}
            {mainImage && (
              <img src={mainImage} alt="" style={{maxWidth:'100%',maxHeight:'220px',borderRadius:'10px',objectFit:'cover',display:'block',marginBottom:'0.5rem',border:'1px solid rgba(255,255,255,0.07)'}} onError={e=>e.target.style.display='none'} />
            )}
            <div style={{display:'flex',gap:'0.5rem'}}>
              <button onClick={()=>likePost(p.id)} style={{padding:'0.25rem 0.7rem',background:(p.likes||[]).includes(cu.username)?'rgba(239,68,68,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${(p.likes||[]).includes(cu.username)?'rgba(239,68,68,0.4)':'rgba(255,255,255,0.08)'}`,borderRadius:'6px',color:(p.likes||[]).includes(cu.username)?'#EF4444':'#999',cursor:'pointer',fontSize:'0.78rem',fontFamily:'inherit'}}>❤️ {(p.likes||[]).length}</button>
            </div>
          </div>
        );
      })}
      {posts.length===0&&<div style={{textAlign:'center',padding:'2rem',color:'#555'}}><div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>📱</div>Henüz gönderi yok. İlk paylaşımı yap!</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// BAŞARI SAYFASI
// ═══════════════════════════════════════════════════════
function AchievementsPage({ profile }) {
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};
  const allUsers = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch{return [];} })();
  const factories = (() => { try { return JSON.parse(localStorage.getItem('rep_factories')||'[]'); } catch{return [];} })();
  const gangs = (() => { try { return JSON.parse(localStorage.getItem('rep_gangs')||'[]'); } catch{return [];} })();
  const parties = (() => { try { return JSON.parse(localStorage.getItem('rep_parties')||'[]'); } catch{return [];} })();

  const ACHIEVEMENTS = [
    {id:'first_million',icon:'💰',title:'İlk Milyoner',desc:'₺1,000,000 birikir',check:p=>(p.money||0)+(p.bankMoney||0)>=1000000,color:'#FFD700'},
    {id:'billionaire',icon:'🏦',title:'Milyarder',desc:'₺1,000,000,000 birikir',check:p=>(p.money||0)+(p.bankMoney||0)>=1000000000,color:'#FFD700'},
    {id:'lv10',icon:'⭐',title:'Tecrübeli',desc:'Seviye 10',check:p=>(p.level||1)>=10,color:'#60A5FA'},
    {id:'lv50',icon:'🌟',title:'Efsanevi',desc:'Seviye 50',check:p=>(p.level||1)>=50,color:'#A78BFA'},
    {id:'politician',icon:'🏛️',title:'Siyasetçi',desc:'Bir partiye katıl',check:p=>{const part=parties.find(pt=>(pt.members||[]).includes(p.username));return !!part;},color:'#F59E0B'},
    {id:'gangster',icon:'🔫',title:'Sokak Köpeği',desc:'Bir çeteye katıl',check:p=>{const g=gangs.find(g=>(g.members||[]).includes(p.username));return !!g;},color:'#EF4444'},
    {id:'merit100',icon:'🏅',title:'Kahraman',desc:'100 liyakat puanı',check:p=>(p.meritPoints||0)>=100,color:'#F59E0B'},
    {id:'merit1000',icon:'🏆',title:'Milli Kahraman',desc:'1000 liyakat puanı',check:p=>(p.meritPoints||0)>=1000,color:'#FFD700'},
    {id:'vip',icon:'👑',title:'VIP Üye',desc:'VIP ol',check:p=>p.vip||p.premium,color:'#A78BFA'},
    {id:'factory_owner',icon:'🏭',title:'Sanayici',desc:'Fabrika kur',check:p=>factories.some(f=>f.owner===p.username),color:'#F59E0B'},
    {id:'uc1000',icon:'💎',title:'UC Koleksiyoncusu',desc:'1000 UnderCoin',check:p=>(p.underCoin||0)>=1000,color:'#7DD3FC'},
    {id:'admin',icon:'⚙️',title:'Oyun Yöneticisi',desc:'Admin ol',check:p=>p.role==='admin'||p.isAdmin,color:'#EF4444'},
    {id:'hp_full',icon:'❤️',title:'Sağlıklı Yaşam',desc:'Canı %100 olsun',check:p=>(p.hp||100)>=100,color:'#10B981'},
    {id:'pvp10',icon:'⚔️',title:'Savaşçı',desc:'10 PvP savaşı',check:p=>{const b=(() => { try { return JSON.parse(localStorage.getItem('rep_pvpBattles')||'[]'); } catch{return [];} })(); return b.filter(x=>x.attacker===p.username).length>=10;},color:'#EF4444'},
    {id:'spy5',icon:'🕵️',title:'Ajan',desc:'5 başarılı operasyon',check:p=>{const ops=(() => { try { return JSON.parse(localStorage.getItem('rep_spyOps')||'[]'); } catch{return [];} })(); return ops.filter(o=>o.result==='success').length>=5;},color:'#A78BFA'},
    {id:'social10',icon:'📱',title:'Influencer',desc:'10 gönderi paylaş',check:p=>{const posts=(() => { try { return JSON.parse(localStorage.getItem('rep_socialPosts')||'[]'); } catch{return [];} })(); return posts.filter(x=>x.author===p.username).length>=10;},color:'#EC4899'},
  ];

  const earned = ACHIEVEMENTS.filter(a => { try { return a.check(cu); } catch{return false;} });
  const notEarned = ACHIEVEMENTS.filter(a => { try { return !a.check(cu); } catch{return true;} });

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#FFD700',marginBottom:'0.5rem'}}>🏆 Başarılar</div>
      <div style={{fontSize:'0.82rem',color:'#999',marginBottom:'1rem',background:'rgba(255,215,0,0.07)',borderRadius:'8px',padding:'0.5rem 0.75rem',border:'1px solid rgba(255,215,0,0.2)'}}>
        {earned.length}/{ACHIEVEMENTS.length} başarı kazanıldı · %{Math.round(earned.length/ACHIEVEMENTS.length*100)} tamamlandı
      </div>
      {earned.length>0&&<div style={{marginBottom:'1rem'}}>
        <div style={{fontWeight:700,color:'#FFD700',fontSize:'0.85rem',marginBottom:'0.5rem'}}>✅ Kazanılan Başarılar ({earned.length})</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
          {earned.map(a=>(
            <div key={a.id} style={{background:`rgba(255,215,0,0.06)`,border:`1px solid ${a.color}44`,borderRadius:'10px',padding:'0.75rem',display:'flex',gap:'0.5rem',alignItems:'center'}}>
              <span style={{fontSize:'1.5rem'}}>{a.icon}</span>
              <div><div style={{fontWeight:700,fontSize:'0.8rem',color:a.color}}>{a.title}</div><div style={{fontSize:'0.65rem',color:'#999'}}>{a.desc}</div></div>
            </div>
          ))}
        </div>
      </div>}
      <div>
        <div style={{fontWeight:700,color:'#666',fontSize:'0.85rem',marginBottom:'0.5rem'}}>🔒 Kilitli Başarılar ({notEarned.length})</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
          {notEarned.map(a=>(
            <div key={a.id} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'0.75rem',display:'flex',gap:'0.5rem',alignItems:'center',opacity:0.55}}>
              <span style={{fontSize:'1.5rem',filter:'grayscale(1)'}}>{a.icon}</span>
              <div><div style={{fontWeight:700,fontSize:'0.8rem',color:'#aaa'}}>{a.title}</div><div style={{fontSize:'0.65rem',color:'#666'}}>{a.desc}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// KRİZ YÖNETİMİ SAYFASI
// ═══════════════════════════════════════════════════════
function CrisisPage({ profile, setProfile, showNotif }) {
  const [crises, setCrises] = useLs('activeCrises', []);
  const [crisisLog, setCrisisLog] = useLs('crisisLog', []);
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};
  const uid = cu.uid || cu.id;
  const now = Date.now();

  const CRISIS_TEMPLATES = [
    {id:'earthquake',name:'Deprem',icon:'🌍',desc:'Büyük bir deprem şehri vurdu! Altyapı ciddi hasar gördü.',severity:'Kritik',color:'#EF4444',poolTarget:500000,duration:12*3600000},
    {id:'economic',name:'Ekonomik Kriz',icon:'📉',desc:'Piyasalar çöküyor, enflasyon tırmanıyor.',severity:'Yüksek',color:'#F59E0B',poolTarget:300000,duration:8*3600000},
    {id:'pandemic',name:'Salgın Hastalık',icon:'🦠',desc:'Tehlikeli bir salgın hızla yayılıyor.',severity:'Kritik',color:'#A78BFA',poolTarget:750000,duration:24*3600000},
    {id:'political',name:'Siyasi Kriz',icon:'🏛️',desc:'Hükümet krizi derinleşiyor, meclis kilitlendi.',severity:'Orta',color:'#60A5FA',poolTarget:200000,duration:6*3600000},
    {id:'war',name:'Savaş Tehdidi',icon:'⚔️',desc:'Sınırda gerilim tırmanıyor, ordu alarma geçti.',severity:'Yüksek',color:'#DC2626',poolTarget:1000000,duration:18*3600000},
    {id:'flood',name:'Sel Felaketi',icon:'🌊',desc:'Şiddetli yağışlar sel baskınına neden oldu.',severity:'Yüksek',color:'#3B82F6',poolTarget:400000,duration:10*3600000},
  ];

  useEffect(() => {
    const lastGen = parseInt(localStorage.getItem('rep_lastCrisisGen')||'0');
    const GEN_INTERVAL = 2*3600000;
    const nowTs = Date.now();
    if (nowTs - lastGen > GEN_INTERVAL) {
      const active = crises.filter(c => c.active && (nowTs-c.startTime)<c.duration);
      if (active.length < 2) {
        const tmpl = CRISIS_TEMPLATES[Math.floor(Math.random()*CRISIS_TEMPLATES.length)];
        const crisis = {
          id:genId(), type:tmpl.id, name:tmpl.name, icon:tmpl.icon, desc:tmpl.desc,
          severity:tmpl.severity, color:tmpl.color, startTime:nowTs, duration:tmpl.duration,
          poolTarget:tmpl.poolTarget, poolCurrent:0, contributions:{}, active:true,
        };
        setCrises(prev => [crisis,...prev.filter(c=>c.active&&(nowTs-c.startTime)<c.duration)].slice(0,5));
        setCrisisLog(prev => [{id:genId(),icon:crisis.icon,text:`🚨 Otomatik uyarı: ${crisis.name} krizi başladı!`,time:new Date().toLocaleTimeString('tr-TR')},...prev].slice(0,50));
        localStorage.setItem('rep_lastCrisisGen', String(nowTs));
      }
    }
  }, []);

  const contribute = (crisisId, amount) => {
    if (!amount||amount<=0) return;
    if ((cu.money||0)<amount) { showNotif('❌ Yetersiz bakiye!','error'); return; }
    let resolved = false;
    setCrises(prev => prev.map(c => {
      if (c.id!==crisisId) return c;
      const newPool = (c.poolCurrent||0)+amount;
      resolved = newPool >= c.poolTarget;
      return {...c, poolCurrent:newPool, contributions:{...(c.contributions||{}),[uid]:((c.contributions||{})[uid]||0)+amount}, active:!resolved, resolvedAt:resolved?Date.now():undefined};
    }));
    const xpGain = Math.floor(amount/1000);
    const meritGain = Math.floor(amount/10000);
    setProfile(pr => { const np={...pr,money:(pr.money||0)-amount,xp:(pr.xp||0)+xpGain,meritPoints:(pr.meritPoints||0)+meritGain}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    const crisis = crises.find(c=>c.id===crisisId);
    if (crisis && (crisis.poolCurrent||0)+amount >= crisis.poolTarget) {
      setCrisisLog(prev => [{id:genId(),icon:'✅',text:`${crisis.name} krizi havuz doldurularak çözüldü!`,time:new Date().toLocaleTimeString('tr-TR')},...prev].slice(0,50));
      showNotif(`✅ ${crisis.name} krizi çözüldü! Katkın için teşekkürler. +${xpGain} XP`,'success');
    } else {
      showNotif(`💪 Havuza ${fmtWord(amount)} katkı! +${xpGain} XP +${meritGain}🏅`,'success');
    }
  };

  const activeCrises = crises.filter(c => c.active && (now-c.startTime)<c.duration);

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#EF4444',marginBottom:'0.3rem'}}>🚨 Kriz Merkezi</div>
      <div style={{fontSize:'0.78rem',color:'#5A7089',marginBottom:'1rem'}}>Krizler sistem tarafından otomatik oluşturulur. Havuza para katkısı yaparak çöz, XP ve Puan kazan!</div>

      {activeCrises.length===0 && (
        <Card style={{textAlign:'center',padding:'2rem',marginBottom:'1rem'}}>
          <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>✅</div>
          <div style={{fontWeight:700,color:'#10B981',marginBottom:'0.3rem'}}>Şu an aktif kriz yok</div>
          <div style={{fontSize:'0.78rem',color:'#5A7089'}}>Sistem her 2 saatte bir kriz üretebilir</div>
        </Card>
      )}

      {activeCrises.map(c=>{
        const pct = Math.min(100,Math.round((c.poolCurrent||0)/c.poolTarget*100));
        const timeLeft = Math.ceil(Math.max(0,c.duration-(now-c.startTime))/3600000);
        const myContrib = (c.contributions||{})[uid]||0;
        const remaining = c.poolTarget-(c.poolCurrent||0);
        return (
          <div key={c.id} style={{background:'rgba(239,68,68,0.05)',border:`1px solid ${c.color||'#EF4444'}44`,borderRadius:'14px',padding:'1rem',marginBottom:'0.75rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.6rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
                <span style={{fontSize:'2rem'}}>{c.icon}</span>
                <div>
                  <div style={{fontWeight:800,color:c.color||'#EF4444',fontSize:'0.95rem'}}>{c.name}</div>
                  <div style={{fontSize:'0.7rem',color:'#5A7089',maxWidth:'180px'}}>{c.desc}</div>
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:'0.72rem',color:'#F59E0B',fontWeight:700}}>⏰ {timeLeft}sa</div>
                <Tag color='red'>{c.severity}</Tag>
              </div>
            </div>
            <div style={{marginBottom:'0.65rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.68rem',color:'#5A7089',marginBottom:'4px'}}>
                <span style={{color:'#10B981',fontWeight:700}}>💰 Havuz: {fmtWord(c.poolCurrent||0)}</span>
                <span>Hedef: {fmtWord(c.poolTarget)}</span>
              </div>
              <div style={{height:'8px',background:'rgba(255,255,255,0.06)',borderRadius:'100px',overflow:'hidden',marginBottom:'4px'}}>
                <div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,#10B981,${c.color||'#EF4444'})`,borderRadius:'100px',transition:'width 0.5s'}} />
              </div>
              <div style={{fontSize:'0.62rem',color:'#5A7089'}}>{pct}% tamamlandı • {fmtWord(remaining)} daha gerekli</div>
              {myContrib>0&&<div style={{fontSize:'0.65rem',color:'#10B981',marginTop:'2px'}}>✅ Senin katkın: {fmtWord(myContrib)}</div>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.35rem',marginBottom:'0.35rem'}}>
              {[10000,25000,50000,100000].map(amt=>{
                const can=(cu.money||0)>=amt;
                return (
                  <button key={amt} onClick={()=>can&&contribute(c.id,amt)} disabled={!can}
                    style={{padding:'0.45rem 0.2rem',borderRadius:'8px',border:`1px solid ${can?'rgba(16,185,129,0.3)':'rgba(255,255,255,0.06)'}`,background:can?'rgba(16,185,129,0.08)':'rgba(255,255,255,0.02)',color:can?'#10B981':'#3B4E63',cursor:can?'pointer':'not-allowed',fontWeight:700,fontSize:'0.65rem',fontFamily:"'DM Sans',sans-serif"}}>
                    {fmtWord(amt)}
                  </button>
                );
              })}
            </div>
            <div style={{fontSize:'0.62rem',color:'#5A7089'}}>Katkı yap → XP + Puan kazan • Kriz çözülünce katkıcılar ödüllenir</div>
          </div>
        );
      })}

      {crisisLog.length>0 && (
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem'}}>
          <div style={{fontWeight:700,color:'#5A7089',marginBottom:'0.5rem',fontSize:'0.85rem'}}>📋 Kriz Kayıtları</div>
          {crisisLog.slice(0,10).map((c,i)=>(
            <div key={i} style={{display:'flex',gap:'0.5rem',padding:'0.3rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <span style={{fontSize:'1rem',flexShrink:0}}>{c.icon}</span>
              <div style={{flex:1,fontSize:'0.75rem',color:'#8BA0B5'}}>{c.text}</div>
              <div style={{fontSize:'0.62rem',color:'#5A7089',flexShrink:0}}>{c.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// GELİŞMİŞ KUMARhane SAYFASI (Blackjack + Poker ekli)
// ═══════════════════════════════════════════════════════
function CasinoPage({ profile, setProfile, showNotif }) {
  const [tab, setTab] = useState('wheel');
  const [bjState, setBjState] = useState(null);
  const [pokerState, setPokerState] = useState(null);
  const [betAmt, setBetAmt] = useState(10000);
  const [spinResult, setSpinResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [dailySpin, setDailySpin] = useLs('dailySpin2', {});
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};
  const now = Date.now();
  const updateUser = (upd) => {
    const next = {...cu,...upd};
    setProfile(next);
    localStorage.setItem('rep_userProfile', JSON.stringify(next));
    try { const u2 = JSON.parse(localStorage.getItem('rep_users')||'[]'); localStorage.setItem('rep_users', JSON.stringify(u2.map(u => u.id===next.id ? next : u))); } catch{}
  };

  // Card deck utilities
  const SUITS = ['♠️','♥️','♦️','♣️'];
  const RANKS_BJ = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const newDeck = () => {
    const deck = [];
    for(const s of SUITS) for(const r of RANKS_BJ) deck.push({suit:s,rank:r});
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    return deck;
  };
  const cardVal = (rank) => {
    if(['J','Q','K'].includes(rank)) return 10;
    if(rank==='A') return 11;
    return parseInt(rank);
  };
  const handVal = (hand) => {
    let v=hand.reduce((s,c)=>s+cardVal(c.rank),0);
    let aces=hand.filter(c=>c.rank==='A').length;
    while(v>21&&aces>0){v-=10;aces--;}
    return v;
  };

  const startBlackjack = () => {
    if(betAmt<1000){showNotif('❌ Minimum bahis: ₺1,000!','error');return;}
    if((cu.money||0)<betAmt){showNotif('❌ Yetersiz bakiye!','error');return;}
    const deck=newDeck();
    const playerH=[deck.pop(),deck.pop()];
    const dealerH=[deck.pop(),deck.pop()];
    updateUser({money:(cu.money||0)-betAmt});
    setBjState({deck,playerHand:playerH,dealerHand:dealerH,bet:betAmt,phase:'playing'});
  };

  const bjHit = () => {
    if(!bjState||bjState.phase!=='playing') return;
    const deck=[...bjState.deck];
    const playerHand=[...bjState.playerHand,deck.pop()];
    const pv=handVal(playerHand);
    if(pv>21) setBjState(prev=>({...prev,deck,playerHand,phase:'bust'}));
    else setBjState(prev=>({...prev,deck,playerHand}));
  };

  const bjStand = () => {
    if(!bjState||bjState.phase!=='playing') return;
    let {deck,dealerHand,bet}=bjState;
    deck=[...deck]; dealerHand=[...dealerHand];
    while(handVal(dealerHand)<17) dealerHand.push(deck.pop());
    const pv=handVal(bjState.playerHand), dv=handVal(dealerHand);
    let result,payout=0;
    if(pv>21){result='bust';}
    else if(dv>21||pv>dv){result='win';payout=bet*2;}
    else if(pv===dv){result='push';payout=bet;}
    else{result='lose';}
    if(payout>0) updateUser({money:(cu.money||0)+payout});
    setBjState(prev=>({...prev,deck,dealerHand,phase:result}));
    const msgs={win:`🃏 Kazandın! +₺${payout.toLocaleString()}`,lose:'💔 Kaybettin!',push:`🤝 Beraberlik! Bahis iade.`,bust:'💥 Battı! 21\'i geçtin!'};
    showNotif(msgs[result]||'',result==='win'?'success':'error');
  };

  const startPoker = () => {
    if(betAmt<5000){showNotif('❌ Minimum poker bahsi: ₺5,000!','error');return;}
    if((cu.money||0)<betAmt){showNotif('❌ Yetersiz bakiye!','error');return;}
    const deck=newDeck();
    const hand=[deck.pop(),deck.pop(),deck.pop(),deck.pop(),deck.pop()];
    updateUser({money:(cu.money||0)-betAmt});
    setPokerState({hand,held:new Array(5).fill(false),deck,bet:betAmt,phase:'hold'});
  };

  const pokerHold = (i) => {
    if(!pokerState||pokerState.phase!=='hold') return;
    setPokerState(prev=>({...prev,held:prev.held.map((h,idx)=>idx===i?!h:h)}));
  };

  const pokerDraw = () => {
    if(!pokerState) return;
    let {hand,held,deck,bet}=pokerState;
    deck=[...deck]; hand=[...hand];
    for(let i=0;i<5;i++) if(!held[i]) hand[i]=deck.pop();
    const rank=evalPokerHand(hand);
    const payouts={royalFlush:800,straightFlush:50,fourOfAKind:25,fullHouse:9,flush:6,straight:4,threeOfAKind:3,twoPair:2,jacksOrBetter:1};
    const mult=payouts[rank]||0;
    const win=mult*bet;
    if(win>0) updateUser({money:(cu.money||0)+win});
    setPokerState(prev=>({...prev,hand,phase:'result',result:rank,win}));
    showNotif(win>0?`✅ ${rank}! +₺${win.toLocaleString()}`:'💔 Kazanmadın!',win>0?'success':'error');
  };

  const evalPokerHand = (hand) => {
    const vals=hand.map(c=>cardVal(c.rank)).sort((a,b)=>a-b);
    const suits=hand.map(c=>c.suit);
    const isFlush=new Set(suits).size===1;
    const isStraight=vals[4]-vals[0]===4&&new Set(vals).size===5;
    const counts={};
    vals.forEach(v=>counts[v]=(counts[v]||0)+1);
    const groups=Object.values(counts).sort((a,b)=>b-a);
    if(isFlush&&isStraight&&vals[0]===10) return 'royalFlush';
    if(isFlush&&isStraight) return 'straightFlush';
    if(groups[0]===4) return 'fourOfAKind';
    if(groups[0]===3&&groups[1]===2) return 'fullHouse';
    if(isFlush) return 'flush';
    if(isStraight) return 'straight';
    if(groups[0]===3) return 'threeOfAKind';
    if(groups[0]===2&&groups[1]===2) return 'twoPair';
    if(groups[0]===2&&vals.some(v=>v>=11)) return 'jacksOrBetter';
    return 'nothing';
  };

  const SPIN_PRIZES=[
    {label:'₺10,000',icon:'💵',type:'money',value:10000,color:'#10B981',weight:25},
    {label:'₺50,000',icon:'💰',type:'money',value:50000,color:'#10B981',weight:12},
    {label:'₺200,000',icon:'💎',type:'money',value:200000,color:'#10B981',weight:4},
    {label:'20 UC',icon:'🪙',type:'uc',value:20,color:'#FFB800',weight:20},
    {label:'100 UC',icon:'💎',type:'uc',value:100,color:'#A78BFA',weight:5},
    {label:'+10 HP',icon:'❤️',type:'hp',value:10,color:'#EF4444',weight:18},
    {label:'+10🏅',icon:'🏅',type:'merit',value:10,color:'#F59E0B',weight:10},
    {label:'JACKPOT!',icon:'👑',type:'money',value:1000000,color:'#FFD700',weight:1},
    {label:'Kaybettin',icon:'💔',type:'none',value:0,color:'#555',weight:15},
  ];
  const totalW=SPIN_PRIZES.reduce((s,p)=>s+p.weight,0);
  const spinData=dailySpin[cu.id]||{lastSpin:0,streak:0};
  const canSpin=(now-spinData.lastSpin)>=24*3600000;
  const nextMs=Math.max(0,24*3600000-(now-spinData.lastSpin));

  const doSpin=()=>{
    if(!canSpin||isSpinning) return;
    setIsSpinning(true);
    setTimeout(()=>{
      let r=Math.random()*totalW, prize=SPIN_PRIZES[SPIN_PRIZES.length-1];
      for(const p of SPIN_PRIZES){r-=p.weight;if(r<=0){prize=p;break;}}
      if(prize.type==='money') updateUser({money:(cu.money||0)+prize.value});
      else if(prize.type==='uc') updateUser({underCoin:(cu.underCoin||0)+prize.value});
      else if(prize.type==='merit') updateUser({meritPoints:(cu.meritPoints||0)+prize.value});
      else if(prize.type==='hp') updateUser({hp:Math.min(100,(cu.hp||100)+prize.value)});
      const newStreak=prize.type==='none'?0:(spinData.streak||0)+1;
      setDailySpin(prev=>({...prev,[cu.id]:{lastSpin:now,streak:newStreak}}));
      setSpinResult(prize);
      setIsSpinning(false);
      showNotif(prize.type!=='none'?`🎡 ${prize.label} kazandın!`:'💔 Bu sefer olmadı!',prize.type!=='none'?'success':'error');
    },1800);
  };

  const playSlots=()=>{
    if((cu.money||0)<1000){showNotif('❌ Min ₺1,000!','error');return;}
    const bet=Math.max(1000,Math.min(betAmt,cu.money||0));
    const SYMS=['🍒','🍋','🍊','⭐','💎','7️⃣'];
    const s=[SYMS[Math.floor(Math.random()*SYMS.length)],SYMS[Math.floor(Math.random()*SYMS.length)],SYMS[Math.floor(Math.random()*SYMS.length)]];
    let mult=0;
    if(s[0]===s[1]&&s[1]===s[2]){mult=s[0]==='7️⃣'?10:s[0]==='💎'?7:3;}
    else if(s[0]===s[1]||s[1]===s[2]||s[0]===s[2]) mult=1.5;
    const win=Math.floor(bet*mult);
    updateUser({money:(cu.money||0)-bet+win});
    if(win>0) showNotif(`${s.join('')} KAZANDI! +₺${(win-bet).toLocaleString()}`,'success');
    else showNotif(`${s.join('')} Kaybettin! -₺${bet.toLocaleString()}`,'error');
  };

  const playCoinFlip=()=>{
    if((cu.money||0)<500){showNotif('❌ Min ₺500!','error');return;}
    const bet=Math.max(500,Math.min(betAmt,cu.money||0));
    const won=Math.random()<0.5;
    updateUser({money:(cu.money||0)+(won?bet:-bet)});
    showNotif(won?`🪙 YAZΙ! +₺${bet.toLocaleString()}`:`🪙 TURA! -₺${bet.toLocaleString()}`,won?'success':'error');
  };

  const renderCard=(c,hidden=false)=>(
    <div style={{width:45,height:65,borderRadius:6,background:hidden?'#1a3a6e':'#fff',border:'1px solid rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:hidden?'1.2rem':'0.8rem',fontWeight:700,color:['♥️','♦️'].includes(c?.suit)?'#EF4444':'#1a1a1a',boxShadow:'0 2px 8px rgba(0,0,0,0.3)'}}>
      {hidden?'🂠':`${c.rank}${c.suit}`}
    </div>
  );

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#FFD700',marginBottom:'1rem'}}>🎰 Kumarhane</div>
      <div style={{display:'flex',gap:'0.35rem',marginBottom:'1rem',overflowX:'auto',paddingBottom:'0.2rem'}}>
        {[{k:'wheel',l:'🎡 Çark'},{k:'blackjack',l:'🃏 Blackjack'},{k:'poker',l:'♠️ Poker'},{k:'slots',l:'🎰 Slot'},{k:'coinflip',l:'🪙 Yazı-Tura'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{flexShrink:0,padding:'0.4rem 0.85rem',borderRadius:'2rem',border:`1px solid ${tab===t.k?'#FFD700':'rgba(255,255,255,0.12)'}`,background:tab===t.k?'rgba(255,215,0,0.12)':'transparent',color:tab===t.k?'#FFD700':'#999',cursor:'pointer',fontWeight:tab===t.k?700:400,fontSize:'0.82rem',fontFamily:'inherit'}}>{t.l}</button>
        ))}
      </div>
      <div style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'8px',padding:'0.5rem 0.75rem',fontSize:'0.75rem',color:'#999',marginBottom:'1rem'}}>⚠️ Tüm şans oyunlarında kazanç veya kayıp tamamen rastgeledir. Sorumlu oynayın!</div>

      {tab==='wheel'&&<div style={{maxWidth:400,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:'1rem'}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.2rem',fontWeight:700,color:'#FFD700'}}>🎡 Günlük Çark</div>
          <div style={{fontSize:'0.78rem',color:'#999'}}>Günde bir kez ücretsiz çevirme</div>
          {spinData.streak>0&&<div style={{fontSize:'0.72rem',color:'#F59E0B',marginTop:'0.15rem'}}>🔥 {spinData.streak} gün streak!</div>}
        </div>
        {spinResult&&<div style={{textAlign:'center',padding:'0.75rem',background:`rgba(255,255,255,0.05)`,borderRadius:'12px',border:`1px solid ${spinResult.color}44`,marginBottom:'1rem'}}>
          <div style={{fontSize:'2rem'}}>{spinResult.icon}</div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1rem',fontWeight:700,color:spinResult.color}}>{spinResult.label}</div>
        </div>}
        {canSpin?<button onClick={doSpin} style={{width:'100%',padding:'0.8rem',background:isSpinning?'rgba(255,215,0,0.05)':'linear-gradient(135deg,#B45309,#FFD700)',border:'none',borderRadius:'10px',color:isSpinning?'#FFD700':'#000',fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:700,cursor:isSpinning?'not-allowed':'pointer',opacity:isSpinning?0.6:1}}>{isSpinning?'🎡 Dönüyor...':'🎡 ÇARK ÇEVİR!'}</button>
        :<div style={{textAlign:'center',padding:'0.75rem',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'10px'}}>
          <div style={{color:'#F59E0B',fontWeight:700}}>⏳ Sonraki çevirme</div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:'1.1rem',color:'#FFB800',marginTop:4}}>{Math.floor(nextMs/3600000)}s {Math.floor((nextMs%3600000)/60000)}dk</div>
        </div>}
        <div style={{marginTop:'1rem',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.3rem'}}>
          {SPIN_PRIZES.filter(p=>p.type!=='none').map((p,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'0.35rem',padding:'0.3rem 0.5rem',background:'rgba(255,255,255,0.03)',borderRadius:'6px',border:`1px solid ${p.color}22`}}>
              <span style={{fontSize:'0.9rem'}}>{p.icon}</span>
              <span style={{fontSize:'0.72rem',color:p.color,fontWeight:700}}>{p.label}</span>
              <span style={{fontSize:'0.6rem',color:'#444',marginLeft:'auto'}}>%{((p.weight/totalW)*100).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>}

      {tab==='blackjack'&&<div style={{maxWidth:400,margin:'0 auto'}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:700,color:'#10B981',marginBottom:'0.75rem',textAlign:'center'}}>🃏 Blackjack</div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'0.75rem',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <span style={{fontSize:'0.82rem',color:'#999'}}>Bahis:</span>
          <input type="number" value={betAmt} onChange={e=>setBetAmt(Math.max(1000,parseInt(e.target.value)||1000))} style={{flex:1,padding:'0.4rem 0.5rem',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'6px',color:'#E8EDF2',fontSize:'0.9rem',outline:'none',fontFamily:'inherit'}} />
          <span style={{fontSize:'0.78rem',color:'#999'}}>Bak: ₺{((cu.money||0)/1000).toFixed(0)}K</span>
        </div>
        {!bjState&&<button onClick={startBlackjack} style={{width:'100%',padding:'0.7rem',background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.35)',borderRadius:'10px',color:'#10B981',cursor:'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'1rem'}}>🃏 Oyunu Başlat</button>}
        {bjState&&<div>
          <div style={{marginBottom:'0.75rem'}}>
            <div style={{fontSize:'0.72rem',color:'#999',marginBottom:'0.3rem'}}>KUMARHANE ({bjState.phase==='playing'?'?':handVal(bjState.dealerHand)})</div>
            <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
              {bjState.dealerHand.map((c,i)=>renderCard(c,i===1&&bjState.phase==='playing'))}
            </div>
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <div style={{fontSize:'0.72rem',color:'#999',marginBottom:'0.3rem'}}>SEN ({handVal(bjState.playerHand)})</div>
            <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
              {bjState.playerHand.map((c,i)=><div key={i}>{renderCard(c)}</div>)}
            </div>
          </div>
          {bjState.phase==='playing'&&<div style={{display:'flex',gap:'0.5rem'}}>
            <button onClick={bjHit} style={{flex:1,padding:'0.6rem',background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:'8px',color:'#60A5FA',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>🃏 Kart Al</button>
            <button onClick={bjStand} style={{flex:1,padding:'0.6rem',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'8px',color:'#F59E0B',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>✋ Dur</button>
          </div>}
          {bjState.phase!=='playing'&&<div>
            <div style={{textAlign:'center',padding:'0.75rem',background:bjState.phase==='win'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${bjState.phase==='win'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,borderRadius:'10px',marginBottom:'0.5rem'}}>
              <div style={{fontSize:'1.5rem',marginBottom:'0.25rem'}}>{bjState.phase==='win'?'🏆':bjState.phase==='push'?'🤝':'💔'}</div>
              <div style={{fontWeight:700,color:bjState.phase==='win'?'#10B981':bjState.phase==='push'?'#F59E0B':'#EF4444'}}>{bjState.phase==='win'?`Kazandın! +₺${(bjState.bet).toLocaleString()}`:bjState.phase==='push'?'Beraberlik!':bjState.phase==='bust'?'Battı!':'Kaybettin!'}</div>
            </div>
            <button onClick={()=>setBjState(null)} style={{width:'100%',padding:'0.6rem',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'8px',color:'#aaa',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>🔄 Tekrar Oyna</button>
          </div>}
        </div>}
        <div style={{marginTop:'0.75rem',background:'rgba(255,255,255,0.02)',borderRadius:'8px',padding:'0.5rem',fontSize:'0.72rem',color:'#666'}}>
          🎴 Kural: 21'e en yakın ol. A=11/1, J/Q/K=10. 21=Blackjack (2.5x)!
        </div>
      </div>}

      {tab==='poker'&&<div style={{maxWidth:400,margin:'0 auto'}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:700,color:'#A78BFA',marginBottom:'0.75rem',textAlign:'center'}}>♠️ Video Poker (Jacks or Better)</div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'0.75rem',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <span style={{fontSize:'0.82rem',color:'#999'}}>Bahis:</span>
          <input type="number" value={betAmt} onChange={e=>setBetAmt(Math.max(5000,parseInt(e.target.value)||5000))} style={{flex:1,padding:'0.4rem 0.5rem',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'6px',color:'#E8EDF2',fontSize:'0.9rem',outline:'none',fontFamily:'inherit'}} />
        </div>
        {!pokerState&&<div>
          <button onClick={startPoker} style={{width:'100%',padding:'0.7rem',background:'rgba(167,139,250,0.12)',border:'1px solid rgba(167,139,250,0.3)',borderRadius:'10px',color:'#A78BFA',cursor:'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'1rem'}}>♠️ Poker Başlat</button>
          <div style={{marginTop:'0.75rem',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.3rem'}}>
            {[{h:'Royal Flush',p:'800x'},{h:'Straight Flush',p:'50x'},{h:'Four of a Kind',p:'25x'},{h:'Full House',p:'9x'},{h:'Flush',p:'6x'},{h:'Straight',p:'4x'},{h:'Three of a Kind',p:'3x'},{h:'Two Pair',p:'2x'},{h:'Jacks or Better',p:'1x'}].map(r=>(
              <div key={r.h} style={{display:'flex',justifyContent:'space-between',padding:'0.25rem 0.5rem',background:'rgba(255,255,255,0.03)',borderRadius:'5px',fontSize:'0.72rem'}}>
                <span style={{color:'#aaa'}}>{r.h}</span><span style={{color:'#FFD700',fontWeight:700}}>{r.p}</span>
              </div>
            ))}
          </div>
        </div>}
        {pokerState&&<div>
          <div style={{display:'flex',gap:'0.4rem',justifyContent:'center',marginBottom:'0.75rem'}}>
            {pokerState.hand.map((c,i)=>(
              <div key={i} onClick={()=>pokerState.phase==='hold'&&pokerHold(i)} style={{cursor:pokerState.phase==='hold'?'pointer':'default'}}>
                <div style={{width:50,height:70,borderRadius:7,background:pokerState.held[i]?'#1a3a6e':'#fff',border:`2px solid ${pokerState.held[i]?'#60A5FA':'rgba(255,255,255,0.2)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem',fontWeight:700,color:['♥️','♦️'].includes(c.suit)?'#EF4444':'#1a1a1a',boxShadow:'0 2px 8px rgba(0,0,0,0.3)'}}>
                  {c.rank}{c.suit}
                </div>
                {pokerState.phase==='hold'&&<div style={{textAlign:'center',fontSize:'0.65rem',color:pokerState.held[i]?'#60A5FA':'#555',marginTop:'0.15rem',fontWeight:700}}>{pokerState.held[i]?'TUTUL':'TUTS?'}</div>}
              </div>
            ))}
          </div>
          {pokerState.phase==='hold'&&<button onClick={pokerDraw} style={{width:'100%',padding:'0.65rem',background:'rgba(167,139,250,0.15)',border:'1px solid rgba(167,139,250,0.35)',borderRadius:'10px',color:'#A78BFA',cursor:'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'0.95rem'}}>🃏 Kartları Dağıt</button>}
          {pokerState.phase==='result'&&<div>
            <div style={{textAlign:'center',padding:'0.75rem',background:pokerState.win>0?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${pokerState.win>0?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,borderRadius:'10px',marginBottom:'0.5rem'}}>
              <div style={{fontWeight:700,color:pokerState.win>0?'#10B981':'#EF4444',fontSize:'0.95rem'}}>{pokerState.result} {pokerState.win>0?`+₺${pokerState.win.toLocaleString()}`:'Kazanmadın!'}</div>
            </div>
            <button onClick={()=>setPokerState(null)} style={{width:'100%',padding:'0.6rem',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'8px',color:'#aaa',cursor:'pointer',fontWeight:700,fontFamily:'inherit'}}>🔄 Tekrar Oyna</button>
          </div>}
        </div>}
      </div>}

      {tab==='slots'&&<div style={{maxWidth:400,margin:'0 auto',textAlign:'center'}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:700,color:'#FFD700',marginBottom:'0.75rem'}}>🎰 Slot Makinesi</div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'0.75rem',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <span style={{fontSize:'0.82rem',color:'#999'}}>Bahis:</span>
          <input type="number" value={betAmt} onChange={e=>setBetAmt(Math.max(1000,parseInt(e.target.value)||1000))} style={{flex:1,padding:'0.4rem 0.5rem',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'6px',color:'#E8EDF2',fontSize:'0.9rem',outline:'none',fontFamily:'inherit'}} />
        </div>
        <div style={{fontSize:'2.5rem',background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem',letterSpacing:'0.2em'}}>🎰🎰🎰</div>
        <div style={{fontSize:'0.78rem',color:'#999',marginBottom:'0.75rem'}}>3 aynı: 3x · Jackpot (7️⃣): 10x · 2 aynı: 1.5x</div>
        <button onClick={playSlots} style={{width:'100%',padding:'0.75rem',background:'linear-gradient(135deg,#B45309,#FFD700)',border:'none',borderRadius:'10px',color:'#000',cursor:'pointer',fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1rem'}}>🎰 ÇEVİR!</button>
      </div>}

      {tab==='coinflip'&&<div style={{maxWidth:400,margin:'0 auto',textAlign:'center'}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:700,color:'#F59E0B',marginBottom:'0.75rem'}}>🪙 Yazı-Tura</div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'0.75rem',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <span style={{fontSize:'0.82rem',color:'#999'}}>Bahis:</span>
          <input type="number" value={betAmt} onChange={e=>setBetAmt(Math.max(500,parseInt(e.target.value)||500))} style={{flex:1,padding:'0.4rem 0.5rem',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'6px',color:'#E8EDF2',fontSize:'0.9rem',outline:'none',fontFamily:'inherit'}} />
        </div>
        <div style={{fontSize:'5rem',marginBottom:'1rem'}}>🪙</div>
        <div style={{fontSize:'0.85rem',color:'#999',marginBottom:'1rem'}}>Doğru tahmin et, 2x kazan!</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
          <button onClick={playCoinFlip} style={{padding:'0.7rem',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'10px',color:'#F59E0B',cursor:'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'0.9rem'}}>🪙 YAZΙ</button>
          <button onClick={playCoinFlip} style={{padding:'0.7rem',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'10px',color:'#F59E0B',cursor:'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'0.9rem'}}>🏦 TURA</button>
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CANLI OLAYLAR TICKER (Floating News Bar)
// ═══════════════════════════════════════════════════════
function GameEventTicker({ events, onNavigate }) {
  const [idx, setIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const recent = [...events].sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,8);

  useEffect(() => {
    if (recent.length === 0) return;
    const t = setInterval(() => setIdx(i => (i + 1) % recent.length), 4500);
    return () => clearInterval(t);
  }, [recent.length]);

  if (dismissed || recent.length === 0) return null;

  const evt = recent[idx % recent.length];
  const timeStr = evt.ts ? (() => {
    const diff = Date.now() - evt.ts;
    if (diff < 60000) return 'şimdi';
    if (diff < 3600000) return Math.floor(diff/60000)+'dk';
    return Math.floor(diff/3600000)+'s';
  })() : '';

  const CAT_COLORS = {
    seçim:'#A78BFA', savaş:'#EF4444', ihale:'#F59E0B', grev:'#F97316',
    parti:'#8B5CF6', çete:'#EF4444', aile:'#60A5FA', ohal:'#DC2626',
    duyuru:'#10B981', sendika:'#3B82F6', genel:'#5A7089',
  };
  const color = CAT_COLORS[evt.category] || '#5A7089';

  return (
    <div style={{
      display:'flex',alignItems:'center',gap:'0',
      background:'rgba(6,12,24,0.97)',borderBottom:'1px solid rgba(255,255,255,0.06)',
      padding:'0',overflow:'hidden',minHeight:30,flexShrink:0,position:'relative',
    }}>
      {/* Category badge */}
      <div style={{
        background:color,color:'#000',
        padding:'0 0.55rem',alignSelf:'stretch',
        display:'flex',alignItems:'center',
        fontSize:'0.6rem',fontWeight:900,textTransform:'uppercase',
        letterSpacing:'0.04em',whiteSpace:'nowrap',flexShrink:0,
      }}>
        {evt.icon||'📢'} {(evt.category||'olay').toUpperCase()}
      </div>
      {/* Scrolling text */}
      <div style={{flex:1,overflow:'hidden',padding:'0 0.6rem',cursor:'pointer'}}
        onClick={()=>{ try { onNavigate('election_events'); } catch(e){} }}>
        <div key={evt.id} style={{
          fontSize:'0.71rem',fontWeight:700,color:'#E8EDF2',
          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
          animation:'ticker-slide-in 0.35s ease',
        }}>
          {evt.title}
          {evt.desc && <span style={{color:'#5A7089',fontWeight:400}}> — {evt.desc.slice(0,60)}{evt.desc.length>60?'…':''}</span>}
        </div>
      </div>
      {/* Time + dot indicators */}
      <div style={{display:'flex',alignItems:'center',gap:'0.35rem',padding:'0 0.5rem',flexShrink:0}}>
        <span style={{fontSize:'0.58rem',color:'#5A7089',fontFamily:"'JetBrains Mono',monospace"}}>{timeStr}</span>
        <div style={{display:'flex',gap:'2px'}}>
          {recent.slice(0,Math.min(recent.length,5)).map((_,i)=>(
            <div key={i} onClick={()=>setIdx(i)} style={{width:4,height:4,borderRadius:'50%',background:i===idx%recent.length?color:'rgba(255,255,255,0.15)',cursor:'pointer',transition:'background 0.3s'}}/>
          ))}
        </div>
        <button onClick={()=>setDismissed(true)} style={{background:'none',border:'none',color:'#5A7089',cursor:'pointer',padding:'2px',fontSize:'0.65rem',lineHeight:1}}>✕</button>
      </div>
      <style>{`@keyframes ticker-slide-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ANA UYGULAMA
// ═══════════════════════════════════════════════════════
