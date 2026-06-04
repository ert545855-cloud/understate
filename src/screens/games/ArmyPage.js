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

