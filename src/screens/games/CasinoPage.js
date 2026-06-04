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
