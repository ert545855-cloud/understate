function PoliticsPage({ profile, setProfile, showNotif }) {
  const [parties, setParties] = useLs('parties', []);
  const [laws, setLaws] = useLs('laws', []);
  const [elections, setElections] = useLs('elections', {
    phase:'idle', nextElection:Date.now()+7*24*60*60*1000, candidates:[], votes:{}, results:null
  });
  const [cabinet, setCabinet] = useLs('cabinet', {});
  const [sub, setSub] = useState('parties');
  const [createModal, setCreateModal] = useState(false);
  const [pForm, setPForm] = useState({ name:'', ideology:'merkez', desc:'', color:'#8B5CF6' });
  const [lawModal, setLawModal] = useState(false);
  const [lawForm, setLawForm] = useState({ title:'', desc:'', category:'vergi' });
  const [managePartyModal, setManagePartyModal] = useState(false);
  const [donateModal, setDonateModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState('');
  const [govCooldowns, setGovCooldowns] = useLs('govCooldowns', {});
  const [elections_multi, setElections_multi] = useLs('rep_elections_multi', {});
  const [transferModal, setTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [disbandConfirm, setDisbandConfirm] = useState(false);
  const [meclisAtama, setMeclisAtama] = useLs('meclisAtama', {});
  const [coalition, setCoalition] = useLs('rep_coalition', null);
  const [coalitionModal, setCoalitionModal] = useState(false);
  const [coalitionForm, setCoalitionForm] = useState({ name:'', program:'', partners:[] });

  const myParty = parties.find(p => p.leaderId===profile?.uid || (p.members||[]).includes(profile?.uid));
  const isLeader = myParty?.leaderId === profile?.uid;
  const isPresident = cabinet['Devlet Başkanı'] === profile?.username;

  const CABINET_ROLES = [
    'Devlet Başkanı','Meclis Başkanı','Milletvekili',
    'İçişleri Bakanı','Belediye Başkanı','Vali',
    'Genelkurmay Başkanı','Ticaret Bakanı','Maliye Bakanı'
  ];

  const PARTY_CREATE_COST = 100000;

  const createParty = () => {
    if (!pForm.name.trim()) { showNotif('Parti adı gerekli', 'error'); return; }
    if (myParty) { showNotif('Zaten bir partiye üyesin', 'error'); return; }
    if (profile?.gang) {
      const allGs = (() => { try { return JSON.parse(localStorage.getItem('rep_gangs')||'[]'); } catch{return[];} })();
      const myG = allGs.find(g=>g.id===profile.gang);
      if (myG) { showNotif(`${myG.type==='family'?'👨‍👩‍👧‍👦 Aile':'⚔️ Çete'} üyeleri parti kuramazlar. Önce ayrılın.`, 'error'); return; }
    }
    if ((profile?.money||0) < PARTY_CREATE_COST) { showNotif(`Parti kurmak için ₺${PARTY_CREATE_COST.toLocaleString('tr-TR')} gerekli`, 'error'); return; }
    const eduDiploma = profile?.education?.diploma || profile?.diplomaLevel || 'ilkokul';
    const eduCycles = profile?.education?.educationCycles || 0;
    const eduOrder = ['ilkokul','ortaokul','lise','universite','yukseklisans','doktora','profesor'];
    const hasUniversite = eduOrder.indexOf(eduDiploma) >= eduOrder.indexOf('universite');
    if (!hasUniversite) { showNotif('Parti başkanı olmak için Üniversite diploması gerekli', 'error'); return; }
    const party = {
      id:genId(), name:pForm.name.trim(), ideology:pForm.ideology, desc:pForm.desc,
      color:pForm.color, leaderId:profile?.uid, leaderName:profile?.username,
      members:[profile?.uid], memberCount:1, treasury:0,
      support:5+Math.floor(Math.random()*10), createdAt:Date.now()
    };
    setParties(prev => { const next=[...prev, party]; try{window._socket?.emit('party:create',{party});window._socket?.emit('party:sync',{parties:next});}catch(e){}; return next; });
    setProfile(p => { const np={...p,party:party.id,money:(p.money||0)-PARTY_CREATE_COST}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setCreateModal(false);
    showNotif(`🏛️ ${pForm.name} partisi kuruldu!`, 'success');
    try { window._pushGameEvent?.('parti_kuruldu', `🏛️ ${party.name} partisi kuruldu!`, `${profile?.username||'Bir oyuncu'} "${party.name}" partisini ${party.ideology} ideolojisiyle kurdu.`, '🏛️', 'parti'); } catch(e){}
  };

  const joinParty = (party) => {
    if (myParty) { showNotif('Zaten bir partidesin', 'error'); return; }
    if (profile?.gang) {
      const allGs = (() => { try { return JSON.parse(localStorage.getItem('rep_gangs')||'[]'); } catch{return[];} })();
      const myG = allGs.find(g=>g.id===profile.gang);
      if (myG) { showNotif(`${myG.type==='family'?'👨‍👩‍👧‍👦 Aile':'⚔️ Çete'} üyeleri partiye katılamaz. Önce ayrılın.`, 'error'); return; }
    }
    setParties(prev => { const next=prev.map(p => p.id===party.id ? {...p, members:[...(p.members||[]),profile.uid], memberCount:(p.memberCount||0)+1, support:Math.min(100,(p.support||0)+2)} : p); try{window._socket?.emit('party:join',{partyId:party.id});window._socket?.emit('party:sync',{parties:next});}catch(e){}; return next; });
    setProfile(p => { const np={...p,party:party.id}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`✅ ${party.name} partisine katıldın`, 'success');
  };

  const leaveParty = () => {
    if (!myParty) return;
    if (isLeader) { showNotif('Lider partiden ayrılamaz. Önce liderliği devret.', 'error'); return; }
    setParties(prev => { const next=prev.map(p => p.id===myParty.id ? {...p, members:(p.members||[]).filter(m=>m!==profile.uid), memberCount:Math.max(0,(p.memberCount||1)-1)} : p); try{window._socket?.emit('party:leave',{partyId:myParty.id});window._socket?.emit('party:sync',{parties:next});}catch(e){}; return next; });
    setProfile(p => { const np={...p,party:null}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif('Partiden ayrıldın', 'info');
  };

  const kickMember = (uid) => {
    if (!isLeader) return;
    const updated = parties.map(p => p.id===myParty.id ? {...p, members:(p.members||[]).filter(m=>m!==uid), memberCount:Math.max(0,(p.memberCount||1)-1)} : p);
    setParties(updated);
    showNotif('Üye partiden çıkarıldı', 'info');
  };

  const transferLeadership = () => {
    if (!isLeader||!transferTarget.trim()) { showNotif('Kullanıcı adı girin','error'); return; }
    const memberUids = (myParty.members||[]).filter(u => u !== myParty.leaderId);
    if (!memberUids.length) { showNotif('Devredecek üye yok','error'); return; }
    const users = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch{return [];} })();
    const tgt = users.find(u => u.username===transferTarget.trim());
    if (!tgt) { showNotif('Kullanıcı bulunamadı','error'); return; }
    if (!memberUids.includes(tgt.id) && tgt.id !== profile?.uid) { showNotif('Bu kişi partinde değil','error'); return; }
    setParties(prev => prev.map(p => p.id===myParty.id ? {...p, leaderId:tgt.id, leaderName:tgt.username} : p));
    setTransferModal(false); setTransferTarget('');
    showNotif(`👑 Liderlik ${tgt.username} kişisine devredildi`, 'success');
  };

  const disbandParty = () => {
    if (!isLeader) return;
    setParties(prev => { const next=prev.filter(p => p.id !== myParty.id); try{window._socket?.emit('party:sync',{parties:next});}catch(e){}; return next; });
    setProfile(pr => { const np={...pr,party:null}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setDisbandConfirm(false);
    showNotif('🏛️ Parti feshedildi','info');
  };

  const partyAction = (actionId, cooldownMs, effect) => {
    if (!myParty) return;
    const key = `party_${myParty.id}_${actionId}`;
    const last = govCooldowns[key]||0;
    const rem = cooldownMs - (Date.now()-last);
    if (rem > 0) { showNotif(`⏳ ${Math.ceil(rem/3600000)}s sonra tekrar kullanılabilir`,'error'); return; }
    effect();
    setGovCooldowns(prev => ({...prev, [key]: Date.now()}));
  };

  const govAction = (actionId, cooldownMs, effect) => {
    const key = `gov_${profile?.uid}_${actionId}`;
    const last = govCooldowns[key]||0;
    const rem = cooldownMs - (Date.now()-last);
    if (rem > 0) { showNotif(`⏳ ${Math.ceil(rem/3600000)}s sonra tekrar kullanılabilir`,'error'); return; }
    effect();
    setGovCooldowns(prev => ({...prev, [key]: Date.now()}));
  };

  const removeFromCabinet = (role) => {
    if (!isPresident&&!isLeader) { showNotif('Bu yetkiye sahip değilsiniz','error'); return; }
    setCabinet(prev => { const np={...prev}; delete np[role]; localStorage.setItem('rep_cabinet',JSON.stringify(np)); return np; });
    showNotif(`${role} görevden alındı`,'info');
  };

  const GOV_ROLE_DEFS = {
    'Devlet Başkanı':    {icon:'👑', cd:4*3600000,  label:'Ulusal Duyuru',       xp:500,  money:0,      desc:'Ulusal karar al, XP kazan'},
    'Meclis Başkanı':    {icon:'🏛️',cd:3*3600000,  label:'Meclis Oturumu',      xp:300,  money:0,      desc:'Milletvekilleri oylaması yönet'},
    'Milletvekili':      {icon:'📋', cd:2*3600000,  label:'Yasa Önergesi',       xp:200,  money:0,      desc:'Meclis gündemine önerge ver'},
    'İçişleri Bakanı':   {icon:'🚔', cd:2*3600000,  label:'Polis Operasyonu',    xp:200,  money:0,      desc:'Güvenlik operasyonu başlat'},
    'Belediye Başkanı':  {icon:'🏙️', cd:4*3600000,  label:'Şehir Projesi',       xp:400,  money:200000, desc:'Şehir projesi başlat, kira topla'},
    'Vali':              {icon:'🏛️', cd:6*3600000,  label:'İl Kalkınması',       xp:350,  money:150000, desc:'İl yönet, vergi topla'},
    'Genelkurmay Başkanı':{icon:'⚔️',cd:4*3600000, label:'Askeri Operasyon',    xp:500,  money:0,      desc:'Ordu komutanı, savaş başlatır'},
    'Ticaret Bakanı':    {icon:'📦', cd:5*3600000,  label:'Ticaret Anlaşması',   xp:200,  money:250000, desc:'Ekonomiyi büyüt'},
    'Maliye Bakanı':     {icon:'💸', cd:6*3600000,  label:'Bütçe Kararı',        xp:150,  money:0,      desc:'Para bas, vergi ve faiz oranı ayarla'},
  };

  const donateToParty = () => {
    const amt = parseInt(donateAmount);
    if (!amt||amt<=0) { showNotif('Geçerli tutar girin','error'); return; }
    if ((profile?.money||0)<amt) { showNotif('Yetersiz para','error'); return; }
    setParties(prev => prev.map(p => p.id===myParty.id ? {...p, treasury:(p.treasury||0)+amt} : p));
    setProfile(p => { const np={...p,money:(p.money||0)-amt}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setDonateModal(false); setDonateAmount('');
    showNotif(`💰 ${fmtWord(amt)} parti kasasına bağışlandı`, 'success');
  };

  const proposeLaw = () => {
    if (!lawForm.title.trim()) { showNotif('Yasa başlığı gerekli','error'); return; }
    if (!myParty) { showNotif('Yasa önermek için parti üyesi olun','error'); return; }
    const law = {
      id:genId(), title:lawForm.title.trim(), desc:lawForm.desc, category:lawForm.category,
      proposedBy:profile?.username, partyName:myParty?.name,
      votes:{yes:0,no:0,voters:{}}, status:'voting', createdAt:Date.now(),
      expiresAt:Date.now()+3*24*60*60*1000
    };
    setLaws(prev => { const next=[...prev, law]; try{window._socket?.emit('law:propose',{law});window._socket?.emit('law:sync',{laws:next});}catch(e){}; return next; });
    setLawModal(false); setLawForm({title:'',desc:'',category:'vergi'});
    showNotif(`⚖️ "${law.title}" yasası oylamaya açıldı!`, 'success');
  };

  const voteOnLaw = (lawId, choice) => {
    if (laws.find(l=>l.id===lawId)?.votes?.voters?.[profile?.uid]) { showNotif('Bu yasaya zaten oy verdiniz','error'); return; }
    setLaws(prev => prev.map(l => {
      if (l.id!==lawId) return l;
      const newV = {...l.votes, [choice]:(l.votes[choice]||0)+1, voters:{...(l.votes.voters||{}), [profile.uid]:choice}};
      const total = (newV.yes||0)+(newV.no||0);
      return {...l, votes:newV, status:(newV.yes>newV.no&&total>=3)?'passed':l.status};
    }));
    setProfile(p => { const np={...p,xp:(p.xp||0)+50}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    try { const today=new Date().toDateString(); const dk=`day_${today}`; const s=JSON.parse(localStorage.getItem('rep_dailyTaskState')||'{}'); s[dk]={...(s[dk]||{}),dailyVoteCount:((s[dk]?.dailyVoteCount)||0)+1}; localStorage.setItem('rep_dailyTaskState',JSON.stringify(s)); } catch(e){}
    showNotif(`🗳️ ${choice==='yes'?'Evet':'Hayır'} oyunuz kaydedildi`, 'success');
  };

  const registerCandidate = () => {
    if (elections.candidates?.some(c=>c.uid===profile?.uid)) { showNotif('Zaten adaysın','error'); return; }
    if (!myParty) { showNotif('Aday olmak için parti üyesi olun','error'); return; }
    const sortedByInf = [...parties].sort((a,b)=>(b.influencePoints||0)-(a.influencePoints||0));
    const top5Ids = sortedByInf.slice(0,5).map(p=>p.id);
    if (!top5Ids.includes(myParty.id)) {
      const myRank = sortedByInf.findIndex(p=>p.id===myParty.id)+1;
      showNotif(`❌ Seçime aday çıkarmak için ilk 5 partiden biri olmalısın! Şu an: #${myRank} (Etki: ${(myParty.influencePoints||0).toLocaleString()} ⚡)`, 'error');
      return;
    }
    setElections(e => { const next={...e, candidates:[...(e.candidates||[]),{uid:profile.uid,username:profile.username,party:myParty.name,partyId:myParty.id,votes:0,slogan:'Değişim için oyunuzu isterim!'}]}; try{window._socket?.emit('election:sync',{elections:next});}catch(ex){}; return next; });
    showNotif('🗳️ Devlet başkanlığı adaylığın kaydedildi!', 'success');
  };

  const voteInElection = (candidateUid) => {
    if ((elections.votes||{})[profile?.uid]) { showNotif('Zaten oy kullandınız','error'); return; }
    const allUsers = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch{return [];} })();
    // Ticaret sıralamasına göre oy katsayısı
    const tradeSorted = [...allUsers].sort((a,b)=>(b.tradePoints||0)-(a.tradePoints||0));
    const tradeRank = tradeSorted.findIndex(u=>u.id===profile?.id) + 1;
    let voteWeight = 1;
    if (tradeRank === 1)       voteWeight = 6;
    else if (tradeRank === 2)  voteWeight = 4;
    else if (tradeRank <= 5)   voteWeight = 3;
    else if (tradeRank <= 20)  voteWeight = 2;
    else if (tradeRank <= 50)  voteWeight = 2;
    else                       voteWeight = 1;
    // Eğitim sıralamasına göre bonus katsayı
    const eduSorted = [...allUsers].sort((a,b)=>(b.educationProgress||0)-(a.educationProgress||0));
    const eduRank = eduSorted.findIndex(u=>u.id===profile?.id) + 1;
    let eduBonus = 0;
    if (eduRank === 1)         eduBonus = 3;
    else if (eduRank <= 3)     eduBonus = 2;
    else if (eduRank <= 10)    eduBonus = 1;
    voteWeight += eduBonus;
    // UC katsayı bonusu
    const ucBonus = profile?.voteMultiplier || 0;
    voteWeight += ucBonus;
    setElections(e => { const next={...e, votes:{...(e.votes||{}),[profile.uid]:candidateUid}, candidates:(e.candidates||[]).map(c=>c.uid===candidateUid?{...c,votes:(c.votes||0)+voteWeight}:c)}; try{window._socket?.emit('election:sync',{elections:next});}catch(ex){}; return next; });
    setProfile(p => { const np={...p,xp:(p.xp||0)+100}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    // Günlük görev
    try { const today=new Date().toDateString(); const dk=`day_${today}`; const s=JSON.parse(localStorage.getItem('rep_dailyTaskState')||'{}'); s[dk]={...(s[dk]||{}),dailyVoteCount:((s[dk]?.dailyVoteCount)||0)+1}; localStorage.setItem('rep_dailyTaskState',JSON.stringify(s)); } catch(e){}
    const bonusInfo = [tradeRank<=50?`Ticaret #${tradeRank}`:null, eduBonus>0?`Eğitim +${eduBonus}`:null, ucBonus>0?`UC +${ucBonus}`:null].filter(Boolean).join(', ');
    showNotif(`🗳️ Oyunuz kullanıldı! (${voteWeight}x katsayı${bonusInfo?` — ${bonusInfo}`:''})`, 'success');
  };


  const sortedCandidates = [...(elections.candidates||[])].sort((a,b)=>(b.votes||0)-(a.votes||0));
  const userVoted = !!(elections.votes||{})[profile?.uid];
  const myVote = (elections.votes||{})[profile?.uid];
  const inputSt = {width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'};
  const subs = [{id:'parties',label:'🏛️ Partiler'},{id:'harita',label:'🗺️ Harita'},{id:'management',label:'⚙️ Yönetim'},{id:'govpanel',label:'🏛️ Makam'},{id:'laws',label:'⚖️ Yasalar'},{id:'election',label:'🗳️ Seçim'}];

  const ALL_POSITIONS = [
    { id:'devlet_baskani', title:'Devlet Başkanı', icon:'👑', desc:'En yüksek yönetim makamı', req:'Parti üyesi olmak zorunlu', openTo:'parti', electionKey:'presElection' },
    { id:'meclis_baskani', title:'Meclis Başkanı', icon:'🏛️', desc:'Meclis oturumlarını yönetir', req:'Milletvekili seçilmek gerekir', openTo:'mp', electionKey:'speakerElection' },
    { id:'milletvekili', title:'Milletvekili', icon:'📋', desc:'Yasama organı üyesi', req:'Parti üyesi olmak zorunlu', openTo:'parti', electionKey:'mpElection' },
    { id:'icisleri', title:'İçişleri Bakanı', icon:'🚔', desc:'Güvenlik ve polis operasyonları', req:'Devlet Başkanı atar', openTo:'atama', electionKey:null },
    { id:'belediye', title:'Belediye Başkanı', icon:'🏙️', desc:'Şehir yönetimi ve projeleri', req:'Genel seçimle belirlenir', openTo:'genel', electionKey:'mayorElection' },
    { id:'vali', title:'Vali', icon:'🏛️', desc:'İl yönetimi ve kalkınma', req:'Devlet Başkanı atar', openTo:'atama', electionKey:null },
    { id:'genelkurmay', title:'Genelkurmay Başkanı', icon:'⚔️', desc:'Ordunun tek komutanı — savaş başlatır', req:'Herkes aday olabilir (parti şartı yok)', openTo:'herkese', electionKey:'generalElection' },
    { id:'ticaret', title:'Ticaret Bakanı', icon:'📦', desc:'Ekonomi ve ticaret anlaşmaları', req:'Devlet Başkanı atar', openTo:'atama', electionKey:null },
    { id:'maliye', title:'Maliye Bakanı', icon:'💸', desc:'Para basma, vergi ve faiz oranı', req:'Parti üyesi olmak zorunlu', openTo:'parti', electionKey:'financeElection' },
  ];

  return (
    <div>
      <div style={{display:'flex',gap:'4px',padding:'0.5rem 0.7rem',overflowX:'auto',scrollbarWidth:'none',background:'rgba(6,12,24,0.97)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
        {subs.map(s => (
          <button key={s.id} onClick={()=>setSub(s.id)}
            style={{padding:'0.38rem 0.75rem',borderRadius:'8px',border:`1px solid ${sub===s.id?'rgba(139,92,246,0.4)':'rgba(255,255,255,0.07)'}`,background:sub===s.id?'rgba(139,92,246,0.12)':'rgba(255,255,255,0.03)',color:sub===s.id?'#A78BFA':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.76rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{padding:'0.7rem'}}>

        {sub==='harita' && (
          <div>
            <div style={{background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:'14px',padding:'1rem',marginBottom:'0.75rem'}}>
              <div style={{fontSize:'0.65rem',color:'#A78BFA',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'0.5rem'}}>🗺️ Parti Yayılım Haritası</div>
              <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.6rem'}}>Üye sayısına göre her ilde hangi partinin baskın olduğunu gösterir.</div>
              <TurkeyMap parties={parties} partyMode={true} />
              {parties.length > 0 ? (
                <div style={{display:'flex',flexWrap:'wrap',gap:'0.35rem',marginTop:'0.6rem'}}>
                  {parties.map(p => {
                    const allU = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch { return []; } })();
                    const cities = new Set((p.members||[]).map(uid => allU.find(u=>u.id===uid)?.city).filter(Boolean));
                    return (
                      <div key={p.id} style={{display:'flex',alignItems:'center',gap:'4px',background:'rgba(255,255,255,0.04)',borderRadius:'6px',padding:'3px 9px',border:'1px solid rgba(255,255,255,0.06)'}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'50%',background:p.color||'#8B5CF6',flexShrink:0}}/>
                        <span style={{fontSize:'0.66rem',color:'#E8EDF2',fontWeight:700}}>{p.name}</span>
                        <span style={{fontSize:'0.58rem',color:'#5A7089'}}>({cities.size} il)</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{textAlign:'center',color:'#5A7089',padding:'0.75rem',fontSize:'0.78rem',marginTop:'0.4rem'}}>Haritada renk görmek için parti kur ve üye topla</div>
              )}
            </div>

            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'1rem'}}>
              <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.85rem',marginBottom:'0.6rem'}}>🏛️ Güncel Kabine</div>
              {Object.entries(cabinet).length === 0 ? (
                <div style={{textAlign:'center',color:'#5A7089',padding:'1rem',fontSize:'0.8rem'}}>Henüz kabine oluşturulmamış</div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem'}}>
                  {CABINET_ROLES.map(role => (
                    <div key={role} style={{background:'rgba(255,255,255,0.03)',borderRadius:'8px',padding:'0.5rem 0.65rem',border:'1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{fontSize:'0.6rem',color:'#5A7089',marginBottom:'1px'}}>{role}</div>
                      <div style={{fontSize:'0.78rem',fontWeight:700,color:cabinet[role]?'#60A5FA':'#3B4E63',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cabinet[role]||'Boş'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {sub==='parties' && (
          <div>
            {myParty ? (
              <div style={{background:'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(11,21,39,0.9))',border:'1px solid rgba(139,92,246,0.3)',borderRadius:'14px',padding:'1rem',marginBottom:'0.75rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem'}}>
                  <div>
                    <div style={{fontSize:'0.65rem',color:'#A78BFA',fontWeight:700,textTransform:'uppercase',marginBottom:'0.2rem'}}>{isLeader?'👑 Parti Lideri':'✅ Üye'}</div>
                    <div style={{fontWeight:900,color:'#E8EDF2',fontSize:'1.05rem'}}>{myParty.name}</div>
                    <div style={{fontSize:'0.7rem',color:'#5A7089',marginTop:'0.15rem'}}>{myParty.memberCount} üye • {myParty.ideology} • %{myParty.support||0} destek</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{color:'#10B981',fontWeight:800,fontSize:'0.9rem'}}>{fmtWord(myParty.treasury||0)}</div>
                    <div style={{fontSize:'0.58rem',color:'#5A7089'}}>Kasa</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                  <Btn variant='ghost' size='sm' onClick={()=>setManagePartyModal(true)}>👥 Üyeler</Btn>
                  <Btn variant='ghost' size='sm' onClick={()=>setDonateModal(true)}>💰 Bağış</Btn>
                  {!isLeader && <Btn variant='danger' size='sm' onClick={leaveParty}>🚪 Ayrıl</Btn>}
                </div>
              </div>
            ) : (
              <Btn variant='ghost' size='sm' onClick={()=>setCreateModal(true)} style={{marginBottom:'0.75rem',width:'100%'}}>🏛️ Yeni Parti Kur (₺100.000 + Üniversite)</Btn>
            )}
            {parties.map(party => (
              <Card key={party.id} style={{marginBottom:'0.5rem',padding:'0.85rem',border:`1px solid ${party.id===myParty?.id?'rgba(139,92,246,0.3)':'rgba(255,255,255,0.05)'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'0.5rem'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'0.2rem'}}>
                      <div style={{width:'10px',height:'10px',borderRadius:'50%',background:party.color||'#8B5CF6',flexShrink:0}} />
                      <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{party.name}</div>
                    </div>
                    <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{party.memberCount||0} üye • {party.ideology}</div>
                    {party.desc && <div style={{fontSize:'0.68rem',color:'#8BA0B5',marginTop:'0.2rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{party.desc}</div>}
                    <div style={{marginTop:'0.4rem'}}>
                      <ProgressBar pct={party.support||0} color='#8B5CF6' h={3} />
                      <div style={{fontSize:'0.58rem',color:'#5A7089',marginTop:'2px'}}>%{party.support||0} destek</div>
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{color:'#10B981',fontWeight:800,fontSize:'0.8rem'}}>{fmtWord(party.treasury||0)}</div>
                    <div style={{fontSize:'0.55rem',color:'#5A7089',marginBottom:'0.3rem'}}>Kasa</div>
                    {!myParty && <Btn variant='ghost' size='sm' onClick={()=>joinParty(party)}>Katıl</Btn>}
                    {party.id===myParty?.id && <Tag color='violet'>Üyesin</Tag>}
                  </div>
                </div>
              </Card>
            ))}
            {parties.length===0 && <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>Henüz parti yok. İlk sen kur! 🏛️</div>}
          </div>
        )}

        {sub==='management' && (
          <div>
            {!myParty ? (
              <Card style={{textAlign:'center',padding:'2rem'}}>
                <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>🏛️</div>
                <div style={{color:'#5A7089',fontSize:'0.85rem'}}>Yönetim panelini görmek için bir partiye katıl</div>
              </Card>
            ) : (
              <div>
                {/* Party header stats */}
                <Card style={{marginBottom:'0.65rem',background:'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(11,21,39,0.95))'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.65rem'}}>
                    <div style={{width:'10px',height:'10px',borderRadius:'50%',background:myParty.color||'#8B5CF6',flexShrink:0}} />
                    <div style={{fontWeight:900,color:'#E8EDF2',fontSize:'1rem'}}>{myParty.name}</div>
                    {isLeader&&<Tag color='gold'>👑 Lider</Tag>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.35rem',marginBottom:'0.65rem'}}>
                    {[['👑','Lider',myParty.leaderName||'?'],['👥','Üye',myParty.memberCount||1],['📊','Destek',`%${myParty.support||0}`],['💰','Kasa',fmtWord(myParty.treasury||0)]].map(([ic,lb,v])=>(
                      <div key={lb} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.5rem',textAlign:'center'}}>
                        <div style={{fontSize:'0.9rem',marginBottom:'0.1rem'}}>{ic}</div>
                        <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.75rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
                        <div style={{fontSize:'0.55rem',color:'#5A7089',textTransform:'uppercase'}}>{lb}</div>
                      </div>
                    ))}
                  </div>
                  {/* Base actions */}
                  <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',marginBottom:'0.5rem'}}>
                    <Btn variant='ghost' size='sm' onClick={()=>setDonateModal(true)}>💰 Bağış</Btn>
                    {!isLeader && <Btn variant='danger' size='sm' onClick={leaveParty}>🚪 Ayrıl</Btn>}
                  </div>
                </Card>

                {/* Leader-only action panel */}
                {isLeader && (
                  <Card style={{marginBottom:'0.65rem',border:'1px solid rgba(245,158,11,0.2)'}}>
                    <div style={{fontWeight:700,color:'#F59E0B',marginBottom:'0.65rem',fontSize:'0.82rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>👑 Lider Yetkileri</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem',marginBottom:'0.5rem'}}>
                      {[
                        {label:'📢 Propaganda', cd:6*3600000, id:'prop', onClick:()=>partyAction('prop',6*3600000,()=>{setParties(prev=>prev.map(p=>p.id===myParty.id?{...p,support:Math.min(100,(p.support||0)+3)}:p));showNotif('📢 Propaganda başarılı! +3% destek','success');})},
                        {label:'🎯 Üye Kazan', cd:8*3600000, id:'recruit', onClick:()=>partyAction('recruit',8*3600000,()=>{setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+200};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});showNotif('🎯 Üyelik sürücüsü! +200 XP','success');})},
                        {label:'💼 Bağış Kampanyası', cd:12*3600000, id:'fundraise', onClick:()=>partyAction('fundraise',12*3600000,()=>{setParties(prev=>prev.map(p=>p.id===myParty.id?{...p,treasury:(p.treasury||0)+10000}:p));showNotif('💼 Kampanya başarılı! +₺10.000 kasa','success');})},
                        {label:'🗞️ Basın Açıklaması', cd:4*3600000, id:'press', onClick:()=>partyAction('press',4*3600000,()=>{setParties(prev=>prev.map(p=>p.id===myParty.id?{...p,support:Math.min(100,(p.support||0)+1)}:p));setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+150};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});showNotif('🗞️ Basın açıklaması yayınlandı! +1% destek, +150 XP','success');})},
                      ].map(a => {
                        const key = `party_${myParty.id}_${a.id}`;
                        const rem = Math.max(0, a.cd - (Date.now() - (govCooldowns[key]||0)));
                        return (
                          <button key={a.id} onClick={a.onClick} disabled={rem>0}
                            style={{padding:'0.55rem 0.4rem',background:rem>0?'rgba(255,255,255,0.03)':'rgba(245,158,11,0.08)',border:`1px solid ${rem>0?'rgba(255,255,255,0.07)':'rgba(245,158,11,0.25)'}`,borderRadius:'10px',color:rem>0?'#3B4E63':'#F59E0B',cursor:rem>0?'not-allowed':'pointer',fontWeight:700,fontSize:'0.72rem',fontFamily:"'DM Sans',sans-serif",textAlign:'center',lineHeight:1.3}}>
                            {a.label}{rem>0&&<div style={{fontSize:'0.6rem',marginTop:'2px',color:'#5A7089'}}>⏳{Math.ceil(rem/3600000)}s</div>}
                          </button>
                        );
                      })}
                    </div>
                    {/* Dangerous leader actions */}
                    <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'0.5rem',marginTop:'0.2rem'}}>
                      <Btn variant='ghost' size='sm' onClick={()=>setTransferModal(true)}>🔄 Liderliği Devret</Btn>
                      <Btn variant='danger' size='sm' onClick={()=>setDisbandConfirm(true)}>🗑️ Partiyi Feshet</Btn>
                    </div>
                  </Card>
                )}

                {/* Party Influence Farming - Leader and Deputy Only */}
                {(isLeader || myParty?.deputies?.includes(profile?.uid)) && (
                  <Card style={{marginBottom:'0.65rem',border:'1px solid rgba(167,139,250,0.25)',background:'linear-gradient(135deg,rgba(167,139,250,0.06),rgba(11,21,39,0.95))'}}>
                    <div style={{fontWeight:700,color:'#C4B5FD',marginBottom:'0.65rem',fontSize:'0.82rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>⚡ ETKİ PUANI KAZAN</div>
                    <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.6rem',lineHeight:1.5}}>
                      Parti faaliyetleri yürüterek etki puanı kazanın. Sadece lider ve parti yöneticileri bu bölümü kullanabilir.
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem'}}>
                      {[
                        {id:'mitinq',label:'🎤 Miting Düzenle',cd:6*3600000,inf:15,xp:300,fn:()=>{setParties(p=>p.map(pt=>pt.id===myParty.id?{...pt,influencePoints:(pt.influencePoints||0)+15,support:Math.min(100,(pt.support||0)+2)}:pt));setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+300};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});showNotif('🎤 Miting başarılı! +15 Etki +300 XP','success');}},
                        {id:'lobicilik',label:'🤝 Lobi Faaliyeti',cd:8*3600000,inf:20,xp:200,fn:()=>{setParties(p=>p.map(pt=>pt.id===myParty.id?{...pt,influencePoints:(pt.influencePoints||0)+20}:pt));setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+200,meritPoints:(pr.meritPoints||0)+10};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});showNotif('🤝 Lobi başarılı! +20 Etki +10 Liyakat','success');}},
                        {id:'sosyalMedya',label:'📱 Sosyal Medya',cd:4*3600000,inf:8,xp:150,fn:()=>{setParties(p=>p.map(pt=>pt.id===myParty.id?{...pt,influencePoints:(pt.influencePoints||0)+8,support:Math.min(100,(pt.support||0)+1)}:pt));setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+150};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});showNotif('📱 Sosyal medya paylaşımı! +8 Etki','success');}},
                        {id:'halkaGit',label:'🚶 Sahaya İn',cd:12*3600000,inf:25,xp:400,fn:()=>{setParties(p=>p.map(pt=>pt.id===myParty.id?{...pt,influencePoints:(pt.influencePoints||0)+25,support:Math.min(100,(pt.support||0)+3)}:pt));setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+400};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});showNotif('🚶 Halka gidildi! +25 Etki +3% Destek','success');}},
                      ].map(a => {
                        const key = `party_${myParty.id}_farm_${a.id}`;
                        const rem = Math.max(0, a.cd - (Date.now() - (govCooldowns[key]||0)));
                        return (
                          <button key={a.id} disabled={rem>0} onClick={()=>{if(rem>0)return;a.fn();setGovCooldowns(prev=>({...prev,[key]:Date.now()}));}}
                            style={{padding:'0.55rem 0.4rem',background:rem>0?'rgba(255,255,255,0.03)':'rgba(167,139,250,0.1)',border:`1px solid ${rem>0?'rgba(255,255,255,0.07)':'rgba(167,139,250,0.3)'}`,borderRadius:'10px',color:rem>0?'#3B4E63':'#C4B5FD',cursor:rem>0?'not-allowed':'pointer',fontWeight:700,fontSize:'0.7rem',fontFamily:"'DM Sans',sans-serif",textAlign:'center',lineHeight:1.3}}>
                            {a.label}
                            <div style={{fontSize:'0.6rem',marginTop:'2px',color:rem>0?'#3B4E63':'#A78BFA'}}>+{a.inf} Etki • +{a.xp} XP</div>
                            {rem>0&&<div style={{fontSize:'0.58rem',marginTop:'1px',color:'#5A7089'}}>⏳{Math.ceil(rem/3600000)}s</div>}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{marginTop:'0.5rem',fontSize:'0.65rem',color:'#5A7089',display:'flex',justifyContent:'space-between'}}>
                      <span>Toplam Etki Puanı:</span>
                      <span style={{color:'#C4B5FD',fontWeight:700}}>{(myParty.influencePoints||0).toLocaleString()} ⚡</span>
                    </div>
                  </Card>
                )}

                {/* Members list */}
                <Card>
                  <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.65rem',fontSize:'0.85rem'}}>👥 Parti Üyeleri ({myParty.memberCount||1})</div>
                  {(myParty.members||[]).map((uid,i) => (
                    <div key={uid} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.45rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'rgba(139,92,246,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem'}}>{uid===myParty.leaderId?'👑':'👤'}</div>
                        <div>
                          <div style={{fontSize:'0.82rem',fontWeight:700,color:uid===profile?.uid?'#A78BFA':'#E8EDF2'}}>
                            {uid===profile?.uid?profile?.username:`Üye #${i+1}`} {uid===myParty.leaderId&&<Tag color='gold'>Lider</Tag>}
                          </div>
                          {uid===myParty.leaderId&&<div style={{fontSize:'0.62rem',color:'#5A7089'}}>Parti kurucusu</div>}
                        </div>
                      </div>
                      {isLeader&&uid!==myParty.leaderId&&uid!==profile?.uid&&(
                        <button onClick={()=>kickMember(uid)} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'6px',padding:'2px 8px',color:'#FCA5A5',cursor:'pointer',fontSize:'0.68rem',fontWeight:700}}>Çıkar</button>
                      )}
                    </div>
                  ))}
                  {(myParty.members||[]).length===0&&<div style={{color:'#5A7089',fontSize:'0.82rem',textAlign:'center',padding:'1rem'}}>Henüz üye yok</div>}
                </Card>
              </div>
            )}
          </div>
        )}

        {sub==='govpanel' && (
          <div>
            {/* Info banner */}
            <div style={{background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:'12px',padding:'0.75rem',marginBottom:'0.75rem',fontSize:'0.78rem',color:'#A78BFA'}}>
              🏛️ Devlet makamlarını yönet. Her makam sahibi özel yetkiler kullanabilir.
            </div>

            {/* Meclis Koltuk Dağılımı */}
            {(() => {
              const TOTAL_SEATS = 600;
              const THRESH_PCT = 0.10;
              const allParties = JSON.parse(localStorage.getItem('rep_parties')||'[]');
              const totalInf = allParties.reduce((s,p)=>s+(p.influencePoints||0),0)||1;
              const eligibleP = allParties.filter(p=>(p.influencePoints||0)/totalInf>=THRESH_PCT);
              // D'Hondt algorithm
              const seatsData = eligibleP.map(p=>({name:p.name,color:p.color||'#8B5CF6',influencePoints:p.influencePoints||0,seats:0}));
              for(let i=0;i<TOTAL_SEATS;i++){
                let bi=0,bs=-1;
                seatsData.forEach((p,idx)=>{const sc=p.influencePoints/(p.seats+1);if(sc>bs){bs=sc;bi=idx;}});
                if(seatsData.length>0) seatsData[bi].seats++;
              }
              const totalAssigned = seatsData.reduce((s,p)=>s+p.seats,0);
              return (
                <div style={{background:'rgba(139,92,246,0.06)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:'14px',padding:'1rem',marginBottom:'0.75rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.65rem'}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,color:'#A78BFA',fontSize:'0.88rem'}}>🏛️ Meclis Koltuk Dağılımı</div>
                    <div style={{fontSize:'0.68rem',color:'#5A7089',fontWeight:700}}>{TOTAL_SEATS} Milletvekili</div>
                  </div>
                  {/* Yarı daire görsel */}
                  <div style={{marginBottom:'0.65rem'}}>
                    <div style={{display:'flex',height:'12px',borderRadius:'100px',overflow:'hidden',gap:'1px'}}>
                      {seatsData.length > 0 ? seatsData.map((p,i)=>(
                        <div key={i} style={{flex:p.seats,background:p.color,minWidth:p.seats>0?'2px':'0',transition:'flex 0.4s'}} title={`${p.name}: ${p.seats} koltuk`} />
                      )) : (
                        <div style={{flex:1,background:'rgba(255,255,255,0.06)',borderRadius:'100px'}} />
                      )}
                    </div>
                  </div>
                  {/* Parti listesi */}
                  {seatsData.length > 0 ? seatsData.sort((a,b)=>b.seats-a.seats).map((p,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.35rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <div style={{width:'10px',height:'10px',borderRadius:'3px',background:p.color,flexShrink:0}} />
                        <span style={{fontSize:'0.78rem',color:'#E8EDF2',fontWeight:600}}>{p.name}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
                        <span style={{fontSize:'0.65rem',color:'#5A7089'}}>%{Math.round(p.seats/TOTAL_SEATS*100)}</span>
                        <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:900,color:p.color,fontSize:'0.88rem'}}>{p.seats}</span>
                        <span style={{fontSize:'0.6rem',color:'#5A7089'}}>koltuk</span>
                      </div>
                    </div>
                  )) : (
                    <div style={{fontSize:'0.78rem',color:'#5A7089',textAlign:'center',padding:'0.5rem'}}>Henüz parti kurulmamış — koltuklar atıl</div>
                  )}
                  {seatsData.length > 0 && (
                    <div style={{marginTop:'0.5rem',paddingTop:'0.4rem',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',justifyContent:'space-between',fontSize:'0.65rem',color:'#5A7089'}}>
                      <span>Çoğunluk eşiği: {Math.ceil(TOTAL_SEATS/2)+1} koltuk</span>
                      <span>{seatsData.filter(p=>p.seats>Math.ceil(TOTAL_SEATS/2)).length>0?'✅ Çoğunluk var':'⚠️ Koalisyon gerekli'}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* My positions */}
            {CABINET_ROLES.filter(r => cabinet[r]===profile?.username).length > 0 && (
              <div style={{marginBottom:'0.75rem'}}>
                <div style={{fontSize:'0.72rem',color:'#F59E0B',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'0.4rem'}}>⭐ Senin Makamların</div>
                {CABINET_ROLES.filter(r => cabinet[r]===profile?.username).map(role => {
                  const def = GOV_ROLE_DEFS[role];
                  if (!def) return null;
                  const key = `gov_${profile?.uid}_${role.replace(/\s/g,'_')}`;
                  const rem = Math.max(0, def.cd - (Date.now() - (govCooldowns[key]||0)));
                  const canAct = rem === 0;
                  return (
                    <Card key={role} style={{marginBottom:'0.5rem',border:'1px solid rgba(245,158,11,0.3)',background:'linear-gradient(135deg,rgba(245,158,11,0.06),rgba(11,21,39,0.95))'}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:'0.65rem'}}>
                        <div style={{fontSize:'1.75rem',flexShrink:0,lineHeight:1}}>{def.icon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'0.1rem'}}>
                            <div style={{fontWeight:800,color:'#F59E0B',fontSize:'0.9rem'}}>{role}</div>
                            <Tag color='gold'>Aktif</Tag>
                          </div>
                          <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.5rem'}}>{def.desc}</div>
                          <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.4rem',fontSize:'0.68rem'}}>
                            {def.xp>0&&<span style={{background:'rgba(139,92,246,0.12)',padding:'2px 8px',borderRadius:'6px',color:'#A78BFA',fontWeight:700}}>+{def.xp} XP</span>}
                            {def.money>0&&<span style={{background:'rgba(16,185,129,0.12)',padding:'2px 8px',borderRadius:'6px',color:'#10B981',fontWeight:700}}>+{fmtWord(def.money)}</span>}
                          </div>
                          {canAct ? (
                            <Btn variant='gold' size='sm' onClick={()=>govAction(role.replace(/\s/g,'_'), def.cd, ()=>{
                              setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+def.xp,money:(pr.money||0)+def.money};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});
                              showNotif(`${def.icon} ${def.label} gerçekleştirildi!${def.xp>0?` +${def.xp} XP`:''}${def.money>0?` +${fmtWord(def.money)}`:''}`, 'success');
                            })}>
                              {def.icon} {def.label}
                            </Btn>
                          ) : (
                            <div style={{fontSize:'0.72rem',color:'#5A7089'}}>⏳ {Math.ceil(rem/3600000)} saat sonra tekrar kullanılabilir</div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* All positions overview */}
            <div style={{fontSize:'0.72rem',color:'#5A7089',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'0.4rem'}}>👔 Tüm Devlet Makamları</div>
            {CABINET_ROLES.map(role => {
              const assigned = cabinet[role];
              const isMyRole = assigned===profile?.username;
              const def = GOV_ROLE_DEFS[role];
              return (
                <Card key={role} style={{marginBottom:'0.4rem',padding:'0.75rem',border:`1px solid ${isMyRole?'rgba(245,158,11,0.3)':assigned?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.03)'}`}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
                      <div style={{fontSize:'1.3rem',flexShrink:0}}>{def?.icon||'🏛️'}</div>
                      <div>
                        <div style={{fontWeight:700,color:isMyRole?'#F59E0B':'#E8EDF2',fontSize:'0.82rem'}}>{role}</div>
                        {assigned
                          ? <div style={{fontSize:'0.68rem',color:isMyRole?'#10B981':'#5A7089',marginTop:'1px'}}>👤 {assigned}{isMyRole?' (Sen)':''}</div>
                          : <div style={{fontSize:'0.68rem',color:'#5A7089',fontStyle:'italic',marginTop:'1px'}}>Boş — Atanmamış</div>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'0.3rem',alignItems:'center',flexShrink:0}}>
                      {isMyRole&&<Tag color='gold'>⭐</Tag>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        {sub==='laws' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
              <div style={{color:'#5A7089',fontSize:'0.78rem'}}>⚖️ Yasa önerileri</div>
              {myParty && <Btn variant='ghost' size='sm' onClick={()=>setLawModal(true)}>+ Yasa Öner</Btn>}
            </div>
            {laws.length===0 && (
              <Card style={{textAlign:'center',padding:'2rem'}}>
                <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>⚖️</div>
                <div style={{color:'#5A7089',fontSize:'0.85rem',marginBottom:'1rem'}}>Henüz yasa önerisi yok</div>
                {myParty && <Btn variant='ghost' size='sm' onClick={()=>setLawModal(true)}>+ Yasa Öner</Btn>}
              </Card>
            )}
            {laws.map(law => {
              const total = (law.votes?.yes||0)+(law.votes?.no||0);
              const yesPct = total>0 ? Math.round((law.votes?.yes||0)/total*100) : 50;
              const myVoteLaw = law.votes?.voters?.[profile?.uid];
              const expired = Date.now()>law.expiresAt;
              const timeLeft = Math.max(0,Math.floor((law.expiresAt-Date.now())/3600000));
              return (
                <Card key={law.id} style={{marginBottom:'0.6rem',padding:'1rem',border:`1px solid ${law.status==='passed'?'rgba(16,185,129,0.3)':expired?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.06)'}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem',marginBottom:'0.2rem'}}>{law.title}</div>
                      <div style={{fontSize:'0.68rem',color:'#5A7089'}}>{law.partyName} • {law.proposedBy}</div>
                      {law.desc && <div style={{fontSize:'0.72rem',color:'#8BA0B5',marginTop:'0.25rem'}}>{law.desc}</div>}
                    </div>
                    <div style={{marginLeft:'0.5rem',flexShrink:0}}>
                      {law.status==='passed'?<Tag color='green'>✅ Kabul</Tag>:expired?<Tag color='red'>❌ Reddedildi</Tag>:<Tag color='blue'>🗳️ Oylamada</Tag>}
                    </div>
                  </div>
                  <div style={{marginBottom:'0.5rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.65rem',color:'#5A7089',marginBottom:'3px'}}>
                      <span style={{color:'#10B981'}}>✅ Evet: {law.votes?.yes||0}</span>
                      <span>{total} oy</span>
                      <span style={{color:'#EF4444'}}>Hayır: {law.votes?.no||0} ❌</span>
                    </div>
                    <div style={{height:'6px',background:'rgba(239,68,68,0.3)',borderRadius:'100px',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${yesPct}%`,background:'#10B981',borderRadius:'100px',transition:'width 0.5s'}} />
                    </div>
                  </div>
                  {!myVoteLaw&&!expired&&law.status!=='passed'&&(
                    <div style={{display:'flex',gap:'0.4rem'}}>
                      <Btn variant='green' size='sm' style={{flex:1}} onClick={()=>voteOnLaw(law.id,'yes')}>✅ Evet</Btn>
                      <Btn variant='danger' size='sm' style={{flex:1}} onClick={()=>voteOnLaw(law.id,'no')}>❌ Hayır</Btn>
                    </div>
                  )}
                  {myVoteLaw && <div style={{fontSize:'0.72rem',color:'#5A7089',textAlign:'center',padding:'0.25rem'}}>Oyunuz: <span style={{color:myVoteLaw==='yes'?'#10B981':'#EF4444',fontWeight:700}}>{myVoteLaw==='yes'?'✅ Evet':'❌ Hayır'}</span></div>}
                  {!expired&&law.status!=='passed'&&<div style={{fontSize:'0.62rem',color:'#5A7089',marginTop:'0.3rem',textAlign:'right'}}>⏳ {timeLeft}s kaldı</div>}
                </Card>
              );
            })}
          </div>
        )}

        {sub==='election' && (() => {
          const VOTE_POSITIONS = [
            {key:'devlet_baskani',   title:'Devlet Başkanı',      icon:'👑',  openTo:'parti'},
            {key:'meclis_baskani',   title:'Meclis Başkanı',       icon:'🏛️', openTo:'parti'},
            {key:'milletvekili',     title:'Milletvekili',         icon:'📜',  openTo:'parti'},
            {key:'icisleri_bakani',  title:'İçişleri Bakanı',      icon:'🛡️', openTo:'atama'},
            {key:'belediye_baskani', title:'Belediye Başkanı',     icon:'🏙️', openTo:'genel'},
            {key:'vali',             title:'Vali',                 icon:'🏢',  openTo:'atama'},
            {key:'genelkurmay',      title:'Genelkurmay Başkanı',  icon:'⚔️', openTo:'herkese'},
            {key:'ticaret_bakani',   title:'Ticaret Bakanı',       icon:'📊',  openTo:'atama'},
            {key:'maliye_bakani',    title:'Maliye Bakanı',        icon:'💰',  openTo:'parti'},
          ];
          const activeElections = VOTE_POSITIONS.filter(p => elections_multi[p.key]?.active);
          const sortedByInfEl = [...parties].sort((a,b)=>(b.influencePoints||0)-(a.influencePoints||0));
          const top5IdsEl = sortedByInfEl.slice(0,5).map(p=>p.id);
          return (
            <div>
              {/* ── Parti Etki Puanı & Seçim Hakkı ── */}
              <div style={{background:'rgba(167,139,250,0.07)',border:'1px solid rgba(167,139,250,0.25)',borderRadius:'14px',padding:'0.85rem',marginBottom:'0.75rem'}}>
                <div style={{fontWeight:800,color:'#C4B5FD',fontSize:'0.8rem',marginBottom:'0.5rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
                  ⚡ Parti Etki Puanı Sıralaması
                  <span style={{fontSize:'0.62rem',color:'#5A7089',fontWeight:400}}>— İlk 5 parti seçime aday çıkarabilir</span>
                </div>
                {sortedByInfEl.length === 0 ? (
                  <div style={{fontSize:'0.75rem',color:'#5A7089',textAlign:'center',padding:'0.5rem'}}>Henüz parti yok</div>
                ) : sortedByInfEl.map((p,i) => {
                  const canRun = top5IdsEl.includes(p.id);
                  const isMyP = p.id === myPartyId;
                  return (
                    <div key={p.id} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.4rem 0.5rem',borderRadius:'8px',marginBottom:'3px',background:isMyP?'rgba(167,139,250,0.08)':'transparent'}}>
                      <div style={{width:'20px',textAlign:'center',fontSize:'0.72rem',fontWeight:800,color:i<3?['#FFD700','#C0C0C0','#CD7F32'][i]:'#3B4E63',flexShrink:0}}>{i<3?['🥇','🥈','🥉'][i]:`#${i+1}`}</div>
                      <div style={{width:'8px',height:'8px',borderRadius:'50%',background:p.color||'#8B5CF6',flexShrink:0}}/>
                      <div style={{flex:1,fontSize:'0.78rem',fontWeight:isMyP?800:600,color:isMyP?'#C4B5FD':'#E8EDF2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}{isMyP?' (Senin)':''}</div>
                      <div style={{fontSize:'0.72rem',fontWeight:800,color:'#A78BFA',flexShrink:0}}>{(p.influencePoints||0).toLocaleString()} ⚡</div>
                      {canRun ? (
                        <span style={{fontSize:'0.58rem',fontWeight:800,color:'#10B981',background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'5px',padding:'1px 6px',flexShrink:0}}>✅ ADAY</span>
                      ) : (
                        <span style={{fontSize:'0.58rem',fontWeight:800,color:'#5A7089',background:'rgba(255,255,255,0.04)',borderRadius:'5px',padding:'1px 6px',flexShrink:0}}>❌</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{background:'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(11,21,39,0.9))',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'14px',padding:'0.85rem',marginBottom:'0.75rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontWeight:800,color:'#F59E0B',fontSize:'0.85rem'}}>🗳️ SEÇİM ODASI</div>
                  <div style={{fontSize:'0.7rem',color:'#8BA0B5',marginTop:'0.2rem'}}>9 devlet makamı için oylamalar</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:900,color:activeElections.length>0?'#10B981':'#5A7089',fontSize:'1.1rem'}}>{activeElections.length}</div>
                  <div style={{fontSize:'0.62rem',color:'#5A7089'}}>Aktif Seçim</div>
                </div>
              </div>

              {VOTE_POSITIONS.map(pos => {
                const el = elections_multi[pos.key] || {};
                const isActive = !!el.active;
                const hasEnded = !isActive && !!el.winner;
                const candidates = (el.candidates || []).map(c => ({
                  ...c, voteCount: (el.votes || {})[c.username] || 0
                })).sort((a,b) => b.voteCount - a.voteCount);
                const totalVotes = candidates.reduce((s,c)=>s+c.voteCount, 0);
                const alreadyVoted = (el.userVotedIds || []).includes(profile?.uid);
                const myVotedFor = (el.myVotes || {})[profile?.uid];
                const isCandidate = candidates.some(c => c.username === profile?.username);
                const canSelfReg = isActive && !isCandidate && pos.openTo !== 'atama' && (pos.openTo === 'herkese' || pos.openTo === 'genel' || (pos.openTo === 'parti' && !!myParty));

                const selfRegister = () => {
                  setElections_multi(prev => {
                    const e = prev[pos.key] || {active:true,candidates:[],votes:{},userVotedIds:[],myVotes:{}};
                    if ((e.candidates||[]).find(c=>c.username===profile.username)) { showNotif('Zaten adaysın!','error'); return prev; }
                    return {...prev, [pos.key]: {...e, candidates:[...(e.candidates||[]),{username:profile.username,id:profile.uid}], votes:{...(e.votes||{}),[profile.username]:0}}};
                  });
                  showNotif(`📝 ${pos.title} adaylığın kaydedildi!`, 'success');
                };

                const voteFor = (candidateUsername) => {
                  if (!isActive) { showNotif('Bu seçim aktif değil!','error'); return; }
                  if (alreadyVoted) { showNotif('Bu seçimde zaten oy kullandınız!','error'); return; }
                  if (candidateUsername === profile?.username) { showNotif('Kendinize oy veremezsiniz!','error'); return; }
                  const allUsers = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch{return[];} })();
                  const sorted = [...allUsers].sort((a,b)=>(b.tradePoints||0)-(a.tradePoints||0));
                  const rank = sorted.findIndex(u=>u.id===profile?.id) + 1;
                  const weight = rank<=1?6:rank<=2?4:rank<=5?3:rank<=20?2:1;
                  setElections_multi(prev => {
                    const e = prev[pos.key] || {active:true,candidates:[],votes:{},userVotedIds:[],myVotes:{}};
                    return {...prev, [pos.key]: {...e,
                      votes: {...(e.votes||{}), [candidateUsername]: ((e.votes||{})[candidateUsername]||0)+weight},
                      userVotedIds: [...(e.userVotedIds||[]), profile.uid],
                      myVotes: {...(e.myVotes||{}), [profile.uid]: candidateUsername}
                    }};
                  });
                  setProfile(p => { const np={...p,xp:(p.xp||0)+100}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
                  showNotif(`🗳️ ${pos.title} oyunuz kullanıldı! +100 XP`, 'success');
                };

                const borderColor = isActive ? 'rgba(16,185,129,0.35)' : hasEnded ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)';
                const bgColor = isActive ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)';

                return (
                  <div key={pos.key} style={{background:bgColor,border:`1px solid ${borderColor}`,borderRadius:'14px',padding:'0.9rem',marginBottom:'0.6rem'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.55rem'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <span style={{fontSize:'1.4rem'}}>{pos.icon}</span>
                        <div>
                          <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.88rem'}}>{pos.title}</div>
                          <div style={{fontSize:'0.62rem',color:'#5A7089',marginTop:'1px'}}>
                            {isActive ? `${candidates.length} aday • ${(el.userVotedIds||[]).length} oy` : hasEnded ? `🏆 Kazanan: ${el.winner}` : 'Seçim bekleniyor'}
                          </div>
                        </div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'3px'}}>
                        {isActive && <span style={{fontSize:'0.6rem',fontWeight:800,color:'#10B981',background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'6px',padding:'1px 7px'}}>● AKTİF</span>}
                        {hasEnded && <span style={{fontSize:'0.6rem',fontWeight:800,color:'#F59E0B',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:'6px',padding:'1px 7px'}}>✅ BİTTİ</span>}
                        {!isActive && !hasEnded && <span style={{fontSize:'0.6rem',color:'#5A7089',background:'rgba(255,255,255,0.04)',borderRadius:'6px',padding:'1px 7px'}}>beklemede</span>}
                        {cabinet[pos.title] && <span style={{fontSize:'0.62rem',color:'#A78BFA',fontWeight:700}}>👤 {cabinet[pos.title]}</span>}
                      </div>
                    </div>

                    {pos.openTo === 'atama' && !isActive && (
                      <div style={{fontSize:'0.7rem',color:'#5A7089',background:'rgba(255,255,255,0.03)',borderRadius:'8px',padding:'0.4rem 0.6rem'}}>
                        🏛️ Bu makam Devlet Başkanı tarafından atanır.
                      </div>
                    )}

                    {(isActive || candidates.length > 0) && (
                      <>
                        {canSelfReg && (
                          <button onClick={selfRegister} style={{width:'100%',marginBottom:'0.5rem',padding:'0.35rem',borderRadius:'8px',border:'1px solid rgba(139,92,246,0.35)',background:'rgba(139,92,246,0.08)',color:'#A78BFA',fontWeight:700,fontSize:'0.73rem',cursor:'pointer'}}>
                            📝 Adaylığını Koy
                          </button>
                        )}
                        {isCandidate && isActive && (
                          <div style={{fontSize:'0.68rem',color:'#A78BFA',fontWeight:700,marginBottom:'0.4rem',textAlign:'center'}}>📝 Bu seçimde adaysın</div>
                        )}
                        {alreadyVoted && (
                          <div style={{fontSize:'0.68rem',color:'#10B981',fontWeight:700,marginBottom:'0.4rem',padding:'0.3rem 0.6rem',background:'rgba(16,185,129,0.07)',borderRadius:'7px',textAlign:'center'}}>
                            ✅ Oyunuzu kullandınız{myVotedFor ? ` → ${myVotedFor}` : ''}
                          </div>
                        )}
                        {candidates.length > 0 ? (
                          <div style={{display:'flex',flexDirection:'column',gap:'0.35rem'}}>
                            {candidates.map((c,i) => {
                              const pct = totalVotes>0?Math.round(c.voteCount/totalVotes*100):0;
                              const isWinner = hasEnded && i===0 && c.voteCount>0;
                              const isMine = c.username===profile?.username;
                              const isMyVote = myVotedFor===c.username;
                              return (
                                <div key={c.username} style={{background: isWinner?'rgba(245,158,11,0.06)':isMine?'rgba(139,92,246,0.06)':'rgba(255,255,255,0.02)',border:`1px solid ${isWinner?'rgba(245,158,11,0.25)':isMine?'rgba(139,92,246,0.2)':'rgba(255,255,255,0.05)'}`,borderRadius:'10px',padding:'0.5rem 0.6rem'}}>
                                  <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.3rem'}}>
                                    <span style={{fontSize:'0.8rem',width:'18px',flexShrink:0}}>{i===0&&c.voteCount>0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
                                    <div style={{flex:1,minWidth:0}}>
                                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                        <span style={{fontWeight:800,color:isMine?'#A78BFA':'#E8EDF2',fontSize:'0.8rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.username}{isMine?' (Sen)':''}</span>
                                        <span style={{fontSize:'0.72rem',color:'#F59E0B',fontWeight:700,flexShrink:0,marginLeft:'0.3rem'}}>{c.voteCount} oy {pct>0&&`(${pct}%)`}</span>
                                      </div>
                                    </div>
                                    {isActive && !alreadyVoted && !isMine && (
                                      <button onClick={()=>voteFor(c.username)} style={{flexShrink:0,padding:'3px 10px',borderRadius:'7px',border:'1px solid rgba(16,185,129,0.4)',background:'rgba(16,185,129,0.1)',color:'#10B981',cursor:'pointer',fontSize:'0.7rem',fontWeight:800}}>Oy Ver</button>
                                    )}
                                    {isMyVote && <span style={{flexShrink:0,fontSize:'0.6rem',color:'#10B981',fontWeight:800,background:'rgba(16,185,129,0.1)',borderRadius:'6px',padding:'2px 6px'}}>✓ Oyum</span>}
                                    {isWinner && !isActive && <span style={{flexShrink:0,fontSize:'0.65rem',color:'#F59E0B',fontWeight:800}}>🏆</span>}
                                  </div>
                                  <ProgressBar pct={pct} color={isWinner?'#F59E0B':isMine?'#8B5CF6':'#3B82F6'} h={3} />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          isActive && <div style={{fontSize:'0.7rem',color:'#5A7089',textAlign:'center',padding:'0.5rem'}}>Henüz aday yok — ilk aday sen ol!</div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Kabine sekmesi kaldırıldı — Admin Paneli üzerinden yönetilir */}
      </div>

      {createModal && (
        <Modal title="🏛️ Parti Kur" onClose={()=>setCreateModal(false)}>
          {[['name','Parti Adı','Parti adı',false],['desc','Açıklama','Kısa bir açıklama...',true]].map(([k,l,ph,ta])=>(
            <div key={k} style={{marginBottom:'0.85rem'}}>
              <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>{l}</div>
              {ta ? <textarea value={pForm[k]} onChange={e=>setPForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} rows={2} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none',resize:'none',boxSizing:'border-box'}} />
              : <input value={pForm[k]} onChange={e=>setPForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={inputSt} />}
            </div>
          ))}
          <div style={{marginBottom:'0.85rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Siyasi Eğilim</div>
            <select value={pForm.ideology} onChange={e=>setPForm(p=>({...p,ideology:e.target.value}))} style={inputSt}>
              {['sol','merkez-sol','merkez','merkez-sağ','sağ','liberal','milliyetçi','eko-yeşil'].map(v=><option key={v} value={v} style={{background:'#0B1527'}}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
            </select>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Parti Rengi</div>
            <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
              {['#8B5CF6','#3B82F6','#EF4444','#10B981','#F59E0B','#EC4899','#14B8A6','#F97316'].map(c=>(
                <button key={c} onClick={()=>setPForm(p=>({...p,color:c}))} style={{width:'28px',height:'28px',borderRadius:'50%',background:c,border:`3px solid ${pForm.color===c?'#fff':'transparent'}`,cursor:'pointer',outline:'none'}} />
              ))}
            </div>
          </div>
          <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#F59E0B',marginBottom:'1rem'}}>
            💡 Parti kurmak için ₺100.000 ve Üniversite diploması gerektirir. Bakiye: {fmtWord(profile?.money||0)}
          </div>
          <Btn variant='primary' size='full' onClick={createParty}>🏛️ Partiyi Kur</Btn>
        </Modal>
      )}

      {managePartyModal&&myParty&&(
        <Modal title={`👥 ${myParty.name} — Üyeler`} onClose={()=>setManagePartyModal(false)}>
          {(myParty.members||[]).map((uid,i) => (
            <div key={uid} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.55rem 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'rgba(139,92,246,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem'}}>{uid===myParty.leaderId?'👑':'👤'}</div>
                <div style={{fontSize:'0.82rem',fontWeight:700,color:uid===profile?.uid?'#A78BFA':'#E8EDF2'}}>
                  {uid===profile?.uid?profile?.username:`Üye #${i+1}`} {uid===myParty.leaderId&&'(Lider)'}
                </div>
              </div>
              {isLeader&&uid!==myParty.leaderId&&uid!==profile?.uid&&(
                <button onClick={()=>kickMember(uid)} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'6px',padding:'3px 8px',color:'#FCA5A5',cursor:'pointer',fontSize:'0.68rem',fontWeight:700}}>Çıkar</button>
              )}
            </div>
          ))}
        </Modal>
      )}

      {donateModal&&(
        <Modal title="💰 Parti Kasasına Bağış" onClose={()=>{setDonateModal(false);setDonateAmount('');}}>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Bağış Miktarı</div>
            <input type="number" value={donateAmount} onChange={e=>setDonateAmount(e.target.value)} placeholder="₺ Tutar" style={inputSt} />
            <div style={{display:'flex',gap:'0.4rem',marginTop:'0.5rem',flexWrap:'wrap'}}>
              {[5000,10000,25000,50000].map(n=><button key={n} onClick={()=>setDonateAmount(String(n))} style={{padding:'0.3rem 0.65rem',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'#8BA0B5',fontSize:'0.72rem',cursor:'pointer',fontWeight:700}}>{fmtWord(n)}</button>)}
            </div>
          </div>
          <Btn variant='gold' size='full' onClick={donateToParty}>💰 Bağış Yap</Btn>
        </Modal>
      )}

      {lawModal&&(
        <Modal title="⚖️ Yasa Öner" onClose={()=>setLawModal(false)}>
          {[['title','Yasa Başlığı','Örn: Vergi indirimi yasası',false],['desc','Açıklama','Yasa hakkında açıklama...',true]].map(([k,l,ph,ta])=>(
            <div key={k} style={{marginBottom:'0.85rem'}}>
              <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>{l}</div>
              {ta ? <textarea value={lawForm[k]} onChange={e=>setLawForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} rows={3} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none',resize:'none',boxSizing:'border-box'}} />
              : <input value={lawForm[k]} onChange={e=>setLawForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={inputSt} />}
            </div>
          ))}
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Kategori</div>
            <select value={lawForm.category} onChange={e=>setLawForm(p=>({...p,category:e.target.value}))} style={inputSt}>
              {['vergi','güvenlik','ekonomi','eğitim','sağlık','çevre','sosyal','diğer'].map(v=><option key={v} value={v} style={{background:'#0B1527'}}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
            </select>
          </div>
          <Btn variant='primary' size='full' onClick={proposeLaw}>⚖️ Yasayı Öner</Btn>
        </Modal>
      )}

      {transferModal&&(
        <Modal title="🔄 Liderliği Devret" onClose={()=>{setTransferModal(false);setTransferTarget('');}}>
          <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#F59E0B',marginBottom:'1rem'}}>
            ⚠️ Liderliği devrettikten sonra artık lider yetkilerine sahip olmayacaksın.
          </div>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Yeni Liderin Kullanıcı Adı</div>
            <input value={transferTarget} onChange={e=>setTransferTarget(e.target.value)} placeholder="Parti üyesinin kullanıcı adı" style={inputSt} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <Btn variant='ghost' size='md' onClick={()=>{setTransferModal(false);setTransferTarget('');}}>İptal</Btn>
            <Btn variant='gold' size='md' onClick={transferLeadership}>🔄 Devret</Btn>
          </div>
        </Modal>
      )}

      {disbandConfirm&&(
        <Modal title="🗑️ Partiyi Feshet" onClose={()=>setDisbandConfirm(false)}>
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#FCA5A5',marginBottom:'1rem'}}>
            ⚠️ Bu işlem geri alınamaz! <strong>{myParty?.name}</strong> partisi kalıcı olarak silinecek ve tüm üyeler partisiz kalacak.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <Btn variant='ghost' size='md' onClick={()=>setDisbandConfirm(false)}>İptal</Btn>
            <Btn variant='red' size='md' onClick={disbandParty}>🗑️ Feshet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TÜRKİYE HARİTASI – ORTAK KOMPONENT
// ═══════════════════════════════════════════════════════
const PROVINCE_MAP_DATA = [
  {n:'Adana',x:397,y:295},{n:'Adıyaman',x:532,y:253},{n:'Afyonkarahisar',x:203,y:199},
  {n:'Ağrı',x:736,y:146},{n:'Aksaray',x:352,y:220},{n:'Amasya',x:429,y:95},
  {n:'Ankara',x:302,y:135},{n:'Antalya',x:210,y:301},{n:'Ardahan',x:721,y:70},
  {n:'Artvin',x:684,y:66},{n:'Aydın',x:89,y:249},{n:'Balıkesir',x:91,y:150},
  {n:'Bartın',x:280,y:41},{n:'Batman',x:654,y:246},{n:'Bayburt',x:617,y:117},
  {n:'Bilecik',x:179,y:122},{n:'Bingöl',x:627,y:192},{n:'Bitlis',x:696,y:218},
  {n:'Bolu',x:249,y:91},{n:'Burdur',x:193,y:256},{n:'Bursa',x:140,y:119},
  {n:'Çanakkale',x:27,y:122},{n:'Çankırı',x:334,y:98},{n:'Çorum',x:391,y:100},
  {n:'Denizli',x:141,y:253},{n:'Diyarbakır',x:615,y:245},{n:'Düzce',x:229,y:84},
  {n:'Edirne',x:34,y:39},{n:'Elazığ',x:573,y:204},{n:'Erzincan',x:585,y:144},
  {n:'Erzurum',x:660,y:136},{n:'Eskişehir',x:203,y:143},{n:'Gaziantep',x:494,y:292},
  {n:'Giresun',x:537,y:81},{n:'Gümüşhane',x:584,y:105},{n:'Hakkari',x:765,y:264},
  {n:'Hatay',x:443,y:330},{n:'Iğdır',x:778,y:135},{n:'Isparta',x:204,y:253},
  {n:'İstanbul',x:140,y:75},{n:'İzmir',x:59,y:217},{n:'Kahramanmaraş',x:475,y:263},
  {n:'Karabük',x:292,y:65},{n:'Karaman',x:317,y:285},{n:'Kars',x:738,y:98},
  {n:'Kastamonu',x:341,y:55},{n:'Kayseri',x:414,y:201},{n:'Kırıkkale',x:329,y:139},
  {n:'Kırklareli',x:62,y:35},{n:'Kırşehir',x:357,y:178},{n:'Kilis',x:483,y:311},
  {n:'Kocaeli',x:178,y:92},{n:'Konya',x:286,y:247},{n:'Kütahya',x:180,y:162},
  {n:'Malatya',x:535,y:221},{n:'Manisa',x:71,y:206},{n:'Mardin',x:638,y:278},
  {n:'Mersin',x:378,y:306},{n:'Muğla',x:111,y:283},{n:'Muş',x:670,y:200},
  {n:'Nevşehir',x:381,y:206},{n:'Niğde',x:380,y:242},{n:'Ordu',x:516,y:77},
  {n:'Osmaniye',x:447,y:291},{n:'Rize',x:628,y:75},{n:'Sakarya',x:197,y:88},
  {n:'Samsun',x:450,y:60},{n:'Siirt',x:688,y:244},{n:'Sinop',x:400,y:19},
  {n:'Sivas',x:479,y:144},{n:'Şanlıurfa',x:554,y:287},{n:'Şırnak',x:711,y:266},
  {n:'Tekirdağ',x:74,y:76},{n:'Tokat',x:459,y:114},{n:'Trabzon',x:594,y:76},
  {n:'Tunceli',x:587,y:179},{n:'Uşak',x:155,y:203},{n:'Van',x:749,y:213},
  {n:'Yalova',x:149,y:94},{n:'Yozgat',x:384,y:140},{n:'Zonguldak',x:257,y:51}
];
const GANG_PALETTE = ['#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#84CC16','#F43F5E','#D946EF'];

// Simplified Turkey country outline path (based on border province coordinates)
const TURKEY_OUTLINE_PATH = "M 27,122 L 27,92 L 34,39 L 62,35 L 74,76 L 100,68 L 140,55 L 140,75 L 178,92 L 197,88 L 229,84 L 257,51 L 280,41 L 292,65 L 341,55 L 400,19 L 429,60 L 450,60 L 516,77 L 537,81 L 594,76 L 628,75 L 684,66 L 721,70 L 738,98 L 778,135 L 778,160 L 765,264 L 749,260 L 711,266 L 688,244 L 654,246 L 638,278 L 554,287 L 494,292 L 483,311 L 447,291 L 443,330 L 420,318 L 378,306 L 355,312 L 210,301 L 193,280 L 111,283 L 89,249 L 59,217 L 27,180 Z";

function TurkeyMap({ territories={}, gangs=[], parties=[], partyMode=false, onCityClick=null, selectedCity=null }) {
  const [hovered, setHovered] = React.useState(null);

  const gangColorMap = React.useMemo(() => {
    const m = {};
    gangs.forEach((g, i) => { m[g.id] = GANG_PALETTE[i % GANG_PALETTE.length]; });
    return m;
  }, [gangs.map(g=>g.id).join(',')]);

  const partyColorMap = React.useMemo(() => {
    const m = {};
    parties.forEach(p => { m[p.id] = p.color || '#8B5CF6'; });
    return m;
  }, [parties.map(p=>p.id+p.color).join(',')]);

  const cityDominance = React.useMemo(() => {
    if (!partyMode) return {};
    const allUsers = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch { return []; } })();
    const result = {};
    PROVINCE_MAP_DATA.forEach(({ n: city }) => {
      const counts = {};
      parties.forEach(party => {
        const cnt = (party.members||[]).filter(uid => {
          const u = allUsers.find(x => x.id === uid);
          return u?.city === city;
        }).length;
        if (cnt > 0) counts[party.id] = cnt;
      });
      const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
      if (top) result[city] = top[0];
    });
    return result;
  }, [partyMode, parties.map(p=>(p.members||[]).join('')).join('|')]);

  const gangDominance = React.useMemo(() => {
    if (partyMode) return {};
    const result = {};
    Object.entries(territories).forEach(([city, t]) => { if (t?.gangId) result[city] = t.gangId; });
    return result;
  }, [JSON.stringify(territories)]);

  const getColor = (n) => {
    if (partyMode) {
      const pid = cityDominance[n];
      return pid ? (partyColorMap[pid] || '#8B5CF6') : null;
    }
    const t = territories[n];
    return t ? (gangColorMap[t.gangId] || '#888') : null;
  };

  const getOwner = (n) => {
    if (partyMode) {
      const pid = cityDominance[n];
      return pid ? (parties.find(p=>p.id===pid)?.name || null) : null;
    }
    return territories[n]?.gangName || null;
  };

  // Legend for parties or gangs
  const legendItems = partyMode
    ? parties.filter(p => Object.values(cityDominance).includes(p.id)).slice(0,8)
    : gangs.filter(g => Object.values(gangDominance).includes(g.id)).slice(0,8);

  return (
    <div style={{position:'relative',width:'100%',borderRadius:'12px',overflow:'hidden',background:'rgba(4,9,20,0.97)',border:'1px solid rgba(255,255,255,0.08)'}}>
      <svg viewBox="0 0 820 360" style={{width:'100%',height:'auto',display:'block'}} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="tmglow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="tmshadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.5)"/>
          </filter>
        </defs>
        {/* Turkey country outline — background fill */}
        <path d={TURKEY_OUTLINE_PATH} fill="rgba(15,25,50,0.9)" stroke="rgba(100,150,255,0.25)" strokeWidth="1.5" strokeLinejoin="round"/>
        {/* Grid lines */}
        {[60,120,180,240,300].map(y => <line key={y} x1="0" y1={y} x2="820" y2={y} stroke="rgba(255,255,255,0.018)" strokeWidth="0.5"/>)}
        {[150,300,450,600,750].map(x => <line key={x} x1={x} y1="0" x2={x} y2="360" stroke="rgba(255,255,255,0.018)" strokeWidth="0.5"/>)}
        {/* Province circles */}
        {PROVINCE_MAP_DATA.map(({ n, x, y }) => {
          const color = getColor(n);
          const isControlled = !!color;
          const isSelected = selectedCity === n;
          const isHov = hovered === n;
          const r = isHov || isSelected ? 16 : isControlled ? 13 : 8;
          const fill = color || 'rgba(50,80,130,0.4)';
          const strokeColor = isSelected ? '#ffffff' : isControlled ? color : 'rgba(100,150,220,0.3)';
          return (
            <g key={n} style={{cursor: onCityClick ? 'pointer' : 'default'}}
               onClick={() => onCityClick && onCityClick(n)}
               onMouseEnter={() => setHovered(n)}
               onMouseLeave={() => setHovered(null)}>
              {/* Outer glow ring for controlled provinces */}
              {isControlled && (
                <circle cx={x} cy={y} r={r + 8} fill={fill} opacity="0.08"/>
              )}
              {/* Province circle */}
              <circle cx={x} cy={y} r={r}
                fill={isControlled ? fill : 'rgba(20,35,65,0.85)'}
                stroke={strokeColor}
                strokeWidth={isSelected ? 2.5 : isControlled ? 1.5 : 0.7}
                opacity={isHov || isSelected ? 1 : isControlled ? 0.92 : 0.65}
                filter={isControlled ? 'url(#tmglow)' : 'none'}
              />
              {/* Province abbreviation label for controlled cities */}
              {(isControlled || isHov) && (
                <text x={x} y={y+4} textAnchor="middle" fontSize={isHov?8:isControlled?6:0}
                  fill="rgba(255,255,255,0.85)" fontWeight="700" style={{pointerEvents:'none',fontFamily:'sans-serif'}}>
                  {n.slice(0,3)}
                </text>
              )}
            </g>
          );
        })}
        {hovered && (() => {
          const prov = PROVINCE_MAP_DATA.find(p => p.n === hovered);
          if (!prov) return null;
          const owner = getOwner(hovered);
          const color = getColor(hovered);
          const bx = Math.min(720, Math.max(60, prov.x));
          const by = prov.y < 65 ? prov.y + 24 : prov.y - 34;
          return (
            <g>
              <rect x={bx-58} y={by-15} width={116} height={owner ? 32 : 22} rx="5"
                fill="rgba(5,10,22,0.97)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.7"/>
              <text x={bx} y={by-1} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#E8EDF2" fontFamily="'DM Sans',sans-serif">{hovered}</text>
              {owner && <text x={bx} y={by+13} textAnchor="middle" fontSize="8" fill={color||'#5A7089'} fontFamily="'DM Sans',sans-serif">{owner}</text>}
            </g>
          );
        })()}
      </svg>
      {/* Legend */}
      {legendItems.length > 0 && (
        <div style={{display:'flex',flexWrap:'wrap',gap:'0.35rem',padding:'0.5rem 0.75rem',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          {legendItems.map((item,i) => (
            <div key={item.id||i} style={{display:'flex',alignItems:'center',gap:'0.3rem',background:'rgba(255,255,255,0.03)',borderRadius:'6px',padding:'0.2rem 0.45rem',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{width:'8px',height:'8px',borderRadius:'2px',background:partyMode?(item.color||'#8B5CF6'):(GANG_PALETTE[i%GANG_PALETTE.length]),flexShrink:0}}/>
              <span style={{fontSize:'0.6rem',color:'#7A8FA6',fontWeight:600,whiteSpace:'nowrap'}}>{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// BÖLGE SİSTEMİ (81 İL)
// ═══════════════════════════════════════════════════════
function TerritorySystem({ profile, setProfile, showNotif, myGang, gangs, setGangs, isGangLeader }) {
  const { dark } = useTheme();
  const [territories, setTerritories] = useLs('gangTerritories', {});
  const [warCooldowns, setWarCooldowns] = useLs('territoryWarCooldowns', {});
  const [attackModal, setAttackModal] = useState(null);
  const [tick, setTick] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => { setTick(p=>p+1); setNowTs(Date.now()); }, 1000); return () => clearInterval(t); }, []);

  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const uid = profile?.uid || profile?.id;

  const captureProv = (city) => {
    if (!myGang) { showNotif('Çeteye katıl!', 'error'); return; }
    if (!isGangLeader) { showNotif('Sadece lider bölge alabilir!', 'error'); return; }
    const warKey = `war_${city}`;
    const now = Date.now();
    const noWarUntil = warCooldowns[warKey] || 0;
    if (now < noWarUntil) {
      const rem = Math.ceil((noWarUntil - now) / 3600000);
      showNotif(`⏳ Bu il için ${rem} saat sonra savaş açılabilir!`, 'error');
      return;
    }
    const current = territories[city];
    const cost = 150000;
    if ((profile?.money || 0) < cost) { showNotif(`Bölge almak için ₺${fmtWord(cost)} gerekli!`, 'error'); return; }
    const weapons = myGang?.weapons || 0;
    const myPower = (myGang?.power || 10) + (weapons * 5);
    if (current && current.gangId !== myGang.id) {
      const enemyGang = gangs.find(g => g.id === current.gangId);
      const enemyPower = (enemyGang?.power || 5) + ((enemyGang?.weapons || 0) * 5);
      const winChance = myPower / (myPower + enemyPower);
      const won = Math.random() < winChance;
      if (won) {
        const newTerritories = { ...territories, [city]: { gangId: myGang.id, gangName: myGang.name, capturedAt: now } };
        setTerritories(newTerritories);
        setGangs(prev => prev.map(g => {
          if (g.id === myGang.id) return { ...g, territory: (g.territory || 0) + 1, power: (g.power || 10) + 2 };
          if (g.id === current.gangId) {
            const newKey = `war_${city}_lost_${g.id}`;
            const newCds = { ...warCooldowns, [warKey]: now + 24*60*60*1000, [newKey]: now + 14*24*60*60*1000 };
            setWarCooldowns(newCds);
            return { ...g, territory: Math.max(0, (g.territory || 0) - 1) };
          }
          return g;
        }));
        setProfile(p => { const np={...p, money:(p.money||0)-cost, xp:(p.xp||0)+500}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
        showNotif(`🏆 ${city} fethedildi! +500 XP`, 'success');
        const evts = JSON.parse(localStorage.getItem('rep_gameEvents')||'[]');
        const myTerCount = Object.values(newTerritories).filter(t=>t.gangId===myGang.id).length;
        if (myTerCount >= 10) {
          evts.push({ id: genId(), type: 'security_crisis', title: '🚨 Güvenlik Krizi!', desc: `${myGang.name} çetesi ${myTerCount} ili kontrol ediyor. İçişleri Bakanlığı acil toplantı çağrısı yaptı!`, ts: now });
          localStorage.setItem('rep_gameEvents', JSON.stringify(evts.slice(-50)));
          window.dispatchEvent(new CustomEvent('game-event', { detail: evts[evts.length-1] }));
        }
      } else {
        setWarCooldowns(prev => ({ ...prev, [warKey]: now + 2*60*60*1000 }));
        setProfile(p => { const np={...p, money:(p.money||0)-cost, xp:(p.xp||0)+50}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
        showNotif(`❌ ${city} savunuldu! Para harcandı.`, 'error');
      }
    } else if (!current) {
      setTerritories(prev => ({ ...prev, [city]: { gangId: myGang.id, gangName: myGang.name, capturedAt: now } }));
      setGangs(prev => prev.map(g => g.id === myGang.id ? { ...g, territory: (g.territory || 0) + 1 } : g));
      setWarCooldowns(prev => ({ ...prev, [warKey]: now + 24*60*60*1000 }));
      setProfile(p => { const np={...p, money:(p.money||0)-cost, xp:(p.xp||0)+200}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
      showNotif(`🗺️ ${city} alındı! +200 XP`, 'success');
    } else {
      showNotif('Bu bölge zaten sizin!', 'info');
    }
    setAttackModal(null);
  };

  const myTerritories = Object.entries(territories).filter(([,t]) => t.gangId === myGang?.id);
  const totalIncome = myTerritories.length * 5000;

  return (
    <div style={{padding:'0.7rem'}}>
      <div style={{background:'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(11,21,39,0.97))',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'14px',padding:'1rem',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'0.65rem',color:'#EF4444',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.2rem'}}>🗺️ BÖLGE KONTROLÜ</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.4rem'}}>
          {[['🗺️','Kontrol',myTerritories.length+' il'],['💰','Gelir',fmtWord(totalIncome)+'/saat'],['⚡','Güç',(myGang?.power||0)+((myGang?.weapons||0)*5)]].map(([ic,lb,v])=>(
            <div key={lb} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.4rem',textAlign:'center'}}>
              <div style={{fontSize:'0.85rem'}}>{ic}</div>
              <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.78rem'}}>{v}</div>
              <div style={{fontSize:'0.55rem',color:'#5A7089',textTransform:'uppercase'}}>{lb}</div>
            </div>
          ))}
        </div>
        {!myGang && <div style={{marginTop:'0.5rem',fontSize:'0.75rem',color:'#F87171',textAlign:'center'}}>Bölge almak için bir çeteye katıl!</div>}
        <div style={{marginTop:'0.5rem',fontSize:'0.65rem',color:'#5A7089'}}>💡 Bölge almak: ₺150.000 • Ele geçirme sonrası 1 gün savaş yok • Kaybedince 2 hafta savaş yok</div>
      </div>

      {/* ── Türkiye Haritası ── */}
      <div style={{marginBottom:'0.75rem'}}>
        <div style={{fontSize:'0.65rem',color:'#EF4444',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'0.4rem'}}>🗺️ Türkiye Bölge Haritası — İl tıkla → saldır</div>
        <TurkeyMap
          territories={territories}
          gangs={gangs}
          onCityClick={(city) => {
            if (!myGang || !isGangLeader) return;
            const ter = territories[city];
            const warKey = `war_${city}`;
            const blocked = (warCooldowns[warKey]||0) > nowTs;
            if (!ter || (ter.gangId !== myGang.id && !blocked)) setAttackModal(city);
          }}
          selectedCity={attackModal}
        />
        {gangs.some(g => Object.values(territories).some(t => t.gangId === g.id)) && (
          <div style={{display:'flex',flexWrap:'wrap',gap:'0.3rem',marginTop:'0.45rem'}}>
            {gangs.map((g, i) => {
              const count = Object.values(territories).filter(t => t.gangId === g.id).length;
              if (!count) return null;
              return (
                <div key={g.id} style={{display:'flex',alignItems:'center',gap:'4px',background:'rgba(255,255,255,0.04)',borderRadius:'5px',padding:'2px 8px',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{width:'7px',height:'7px',borderRadius:'50%',background:GANG_PALETTE[i%GANG_PALETTE.length],flexShrink:0}}/>
                  <span style={{fontSize:'0.62rem',color:'#8BA0B5',fontWeight:700}}>{g.name}</span>
                  <span style={{fontSize:'0.58rem',color:'#5A7089'}}>({count} il)</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.45rem'}}>
        {CITIES.map(city => {
          const ter = territories[city];
          const isOurs = ter?.gangId === myGang?.id;
          const warKey = `war_${city}`;
          const noWarUntil = warCooldowns[warKey] || 0;
          const warRem = noWarUntil - nowTs;
          const warBlocked = warRem > 0;
          const ownerGang = ter ? gangs.find(g=>g.id===ter.gangId) : null;
          const warRemStr = (() => {
            if (!warBlocked) return '';
            const h = Math.floor(warRem / 3600000);
            const m = Math.floor((warRem % 3600000) / 60000);
            const s2 = Math.floor((warRem % 60000) / 1000);
            return h > 0 ? `${h}s ${m}dk` : m > 0 ? `${m}dk ${s2}sn` : `${s2}sn`;
          })();
          return (
            <div key={city} style={{background:isOurs?'rgba(16,185,129,0.08)':ter?'rgba(239,68,68,0.06)':card,border:`1px solid ${isOurs?'rgba(16,185,129,0.35)':ter?'rgba(239,68,68,0.2)':border}`,borderRadius:'10px',padding:'0.55rem 0.65rem',cursor:'pointer'}}
              onClick={()=>myGang&&isGangLeader&&!isOurs&&!warBlocked?setAttackModal(city):null}>
              <div style={{fontSize:'0.75rem',fontWeight:800,color:isOurs?'#10B981':ter?'#F87171':'#E8EDF2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{city}</div>
              <div style={{fontSize:'0.6rem',color:'#5A7089',marginTop:'1px'}}>
                {isOurs?'✅ Bizim':ter?`⚔️ ${ter.gangName||'?'}`:warBlocked?'🕊️ Barış':'Boş'}
              </div>
              {warBlocked&&!isOurs&&<div style={{fontSize:'0.55rem',color:'#F59E0B',marginTop:'1px'}}>🛡️ {warRemStr} sonra açılır</div>}
            </div>
          );
        })}
      </div>

      {attackModal && (
        <Modal title={`⚔️ ${attackModal} Fethi`} onClose={()=>setAttackModal(null)}>
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',padding:'0.75rem',marginBottom:'1rem',fontSize:'0.82rem',color:'#FCA5A5',lineHeight:1.6}}>
            <div style={{fontWeight:800,marginBottom:'0.3rem'}}>🗺️ {attackModal}</div>
            {territories[attackModal] ? (
              <div>⚔️ Mevcut sahip: <strong>{territories[attackModal].gangName}</strong><br/>Güç hesabına göre savaş sonucu belirlenir.</div>
            ) : (
              <div>Boş bölge! Hemen sahiplen.</div>
            )}
            <div style={{marginTop:'0.5rem',color:'#F59E0B'}}>💰 Maliyet: ₺150.000<br/>🔫 Silah bonusu: +{(myGang?.weapons||0)*5} güç</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <Btn variant='ghost' size='md' onClick={()=>setAttackModal(null)}>İptal</Btn>
            <Btn variant='danger' size='md' onClick={()=>captureProv(attackModal)}>⚔️ Saldır</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SİLAH SİSTEMİ (Sadece Çeteler)
// ═══════════════════════════════════════════════════════
function WeaponSystem({ profile, setProfile, showNotif, myGang, gangs, setGangs, isGangLeader }) {
  const { dark } = useTheme();
  const card   = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [buyQty,  setBuyQty]  = useState(1);
  const [ammoQty, setAmmoQty] = useState(1);
  const [ammoTab, setAmmoTab] = useState(0);

  const WEAPON_COST = 150000;
  const AMMO_TYPES = [
    { id:'standart', name:'Standart Mermi', icon:'🔴', costPerBox:200000, powerPerBox:3,  boxSize:50,  desc:'50 mermi kutusu' },
    { id:'agir',     name:'Ağır Mermi',     icon:'🟠', costPerBox:600000, powerPerBox:8,  boxSize:20,  desc:'20 mermi kutusu' },
    { id:'ap',       name:'Çelik Çekirdek', icon:'💥', costPerBox:2000000,powerPerBox:20, boxSize:10,  desc:'10 mermi kutusu · Zırh deler' },
  ];

  const myWeapons = myGang?.weapons || 0;
  const myAmmo    = myGang?.ammo    || 0;
  const weaponPower = myWeapons * 5;
  const ammoPower   = myAmmo * 3;
  const totalBonus  = weaponPower + ammoPower;

  const buyWeapons = () => {
    if (!myGang) { showNotif('Silah almak için bir çeteye katıl!', 'error'); return; }
    if (myGang.type === 'family') { showNotif('❌ Aileler silah satın alamaz!', 'error'); return; }
    if (!isGangLeader) { showNotif('Silah sadece çete lideri tarafından alınabilir!', 'error'); return; }
    const qty   = Math.max(1, parseInt(buyQty) || 1);
    const total = qty * WEAPON_COST;
    if ((profile?.money || 0) < total) { showNotif(`Yetersiz para! Gerekli: ₺${fmtWord(total)}`, 'error'); return; }
    setGangs(prev => prev.map(g => g.id === myGang.id ? { ...g, weapons: (g.weapons || 0) + qty } : g));
    setProfile(p => { const np = { ...p, money: (p.money||0) - total, xp: (p.xp||0) + qty * 50 }; localStorage.setItem('rep_userProfile', JSON.stringify(np)); return np; });
    showNotif(`🔫 ${qty} silah satın alındı! +${qty*50} XP`, 'success');
  };

  const sellWeapons = (qty) => {
    if (!isGangLeader) { showNotif('Silah satışı sadece lider yapabilir!', 'error'); return; }
    if (myWeapons < qty) { showNotif('Yeterli silah yok!', 'error'); return; }
    const gain = Math.floor(qty * WEAPON_COST * 0.7);
    setGangs(prev => prev.map(g => g.id === myGang.id ? { ...g, weapons: (g.weapons || 0) - qty } : g));
    setProfile(p => { const np = { ...p, money: (p.money||0) + gain }; localStorage.setItem('rep_userProfile', JSON.stringify(np)); return np; });
    showNotif(`💰 ${qty} silah satıldı. +₺${fmtWord(gain)}`, 'success');
  };

  const buyAmmo = () => {
    if (!myGang) { showNotif('Mermi almak için bir çeteye katıl!', 'error'); return; }
    if (myGang.type === 'family') { showNotif('❌ Aileler mermi satın alamaz!', 'error'); return; }
    if (!isGangLeader) { showNotif('Mermi sadece çete lideri tarafından alınabilir!', 'error'); return; }
    const ammoType = AMMO_TYPES[ammoTab];
    const qty   = Math.max(1, parseInt(ammoQty) || 1);
    const total = qty * ammoType.costPerBox;
    if ((profile?.money || 0) < total) { showNotif(`Yetersiz para! Gerekli: ₺${fmtWord(total)}`, 'error'); return; }
    const powerGain = qty * ammoType.powerPerBox;
    setGangs(prev => prev.map(g => g.id === myGang.id ? { ...g, ammo: (g.ammo || 0) + powerGain } : g));
    setProfile(p => { const np = { ...p, money: (p.money||0) - total, xp: (p.xp||0) + qty * 80 }; localStorage.setItem('rep_userProfile', JSON.stringify(np)); return np; });
    showNotif(`${ammoType.icon} ${qty} kutu ${ammoType.name} alındı! +${powerGain} güç, +${qty*80} XP`, 'success');
  };

  const sellAmmo = (pwr) => {
    if (!isGangLeader) { showNotif('Mermi satışı sadece lider yapabilir!', 'error'); return; }
    if (myAmmo < pwr) { showNotif('Yeterli mermi yok!', 'error'); return; }
    const gain = Math.floor(pwr * 40000);
    setGangs(prev => prev.map(g => g.id === myGang.id ? { ...g, ammo: Math.max(0, (g.ammo || 0) - pwr) } : g));
    setProfile(p => { const np = { ...p, money: (p.money||0) + gain }; localStorage.setItem('rep_userProfile', JSON.stringify(np)); return np; });
    showNotif(`💰 Mermi satıldı. +₺${fmtWord(gain)}`, 'success');
  };

  return (
    <div style={{ padding: '0.7rem' }}>
      {/* ── Durum kartı ── */}
      <div style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(11,21,39,0.97))', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 14, padding: '1rem', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.62rem', color: '#EF4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.55rem' }}>⚔️ SİLAH & MERMİ DEPOSU</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.35rem', marginBottom: '0.6rem' }}>
          {[
            ['🔫', 'Silah',       myWeapons,          '#EF4444'],
            ['🔴', 'Mermi Gücü',  myAmmo,              '#F97316'],
            ['⚡', 'Silah Bonusu',`+${weaponPower}`,    '#60A5FA'],
            ['💥', 'Mermi Bonusu',`+${ammoPower}`,      '#FB923C'],
          ].map(([ic,lb,v,c]) => (
            <div key={lb} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.4rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem' }}>{ic}</div>
              <div style={{ fontWeight: 800, color: c, fontSize: '0.82rem' }}>{v}</div>
              <div style={{ fontSize: '0.5rem', color: '#5A7089', textTransform: 'uppercase', marginTop: 1 }}>{lb}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '0.4rem 0.6rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#5A7089' }}>Toplam Güç Bonusu: </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#10B981' }}>+{totalBonus}</span>
          <span style={{ fontSize: '0.62rem', color: '#5A7089', marginLeft: 6 }}>({weaponPower} silah + {ammoPower} mermi)</span>
        </div>
      </div>

      {!myGang ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#5A7089', fontSize: '0.85rem' }}>Silah almak için bir çeteye katıl! (Aileler silah alamaz)</div>
      ) : (
        <>
          {/* ── Silah bölümü ── */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '1rem', marginBottom: '0.65rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#EF4444', marginBottom: '0.65rem' }}>🔫 Silah Al (₺{fmtWord(WEAPON_COST)}/adet · +5 güç)</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center' }}>
                <button onClick={() => setBuyQty(q => Math.max(1, q - 1))} style={{ background: 'none', border: 'none', color: '#E8EDF2', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '1rem' }}>-</button>
                <span style={{ flex: 1, textAlign: 'center', color: '#E8EDF2', fontWeight: 800 }}>{buyQty}</span>
                <button onClick={() => setBuyQty(q => q + 1)} style={{ background: 'none', border: 'none', color: '#E8EDF2', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '1rem' }}>+</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                <div style={{ fontSize: '0.65rem', color: '#5A7089' }}>Toplam</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#EF4444' }}>₺{fmtWord(buyQty * WEAPON_COST)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              {[1,5,10,25].map(n => <button key={n} onClick={() => setBuyQty(n)} style={{ padding: '0.28rem 0.6rem', borderRadius: 8, border: `1px solid ${buyQty===n?'rgba(239,68,68,0.4)':'rgba(255,255,255,0.1)'}`, background: buyQty===n?'rgba(239,68,68,0.12)':'rgba(255,255,255,0.04)', color: buyQty===n?'#F87171':'#8BA0B5', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 700 }}>{n}</button>)}
            </div>
            <Btn variant='danger' size='full' onClick={buyWeapons} disabled={!isGangLeader}>{isGangLeader ? `🔫 ${buyQty} Silah Al (+${buyQty*5} güç)` : 'Sadece lider alabilir'}</Btn>
            {myWeapons > 0 && (
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {[1,5,10].filter(n => n <= myWeapons).map(n => (
                  <button key={n} onClick={() => sellWeapons(n)} disabled={!isGangLeader}
                    style={{ flex: 1, padding: '0.4rem', borderRadius: 8, border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.07)', color: '#F59E0B', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                    {n} sat (+₺{fmtWord(Math.floor(n * WEAPON_COST * 0.7))})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Mermi bölümü ── */}
          <div style={{ background: 'linear-gradient(135deg,rgba(249,115,22,0.08),rgba(11,21,39,0.95))', border: '1px solid rgba(249,115,22,0.22)', borderRadius: 14, padding: '1rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#F97316', marginBottom: '0.65rem' }}>🔴 Mermi Satın Al</div>

            {/* Ammo type tabs */}
            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.65rem' }}>
              {AMMO_TYPES.map((t, i) => (
                <button key={t.id} onClick={() => setAmmoTab(i)}
                  style={{ flex: 1, padding: '0.35rem 0.25rem', borderRadius: 8, border: `1px solid ${ammoTab===i?'rgba(249,115,22,0.5)':'rgba(255,255,255,0.08)'}`, background: ammoTab===i?'rgba(249,115,22,0.15)':'rgba(255,255,255,0.03)', color: ammoTab===i?'#FB923C':'#8BA0B5', fontSize: '0.62rem', cursor: 'pointer', fontWeight: 700, textAlign: 'center' }}>
                  {t.icon}<br/><span style={{ fontSize: '0.58rem' }}>{t.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Selected ammo info */}
            {(() => {
              const at = AMMO_TYPES[ammoTab];
              return (
                <>
                  <div style={{ background: 'rgba(249,115,22,0.07)', borderRadius: 10, padding: '0.5rem 0.65rem', marginBottom: '0.55rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#FB923C', fontSize: '0.82rem' }}>{at.icon} {at.name}</div>
                      <div style={{ fontSize: '0.62rem', color: '#5A7089', marginTop: 2 }}>{at.desc} · +{at.powerPerBox} güç/kutu</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#EF4444', fontSize: '0.9rem' }}>₺{fmtWord(at.costPerBox)}</div>
                      <div style={{ fontSize: '0.58rem', color: '#5A7089' }}>kutu başı</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center' }}>
                      <button onClick={() => setAmmoQty(q => Math.max(1, q - 1))} style={{ background: 'none', border: 'none', color: '#E8EDF2', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '1rem' }}>-</button>
                      <span style={{ flex: 1, textAlign: 'center', color: '#E8EDF2', fontWeight: 800 }}>{ammoQty}</span>
                      <button onClick={() => setAmmoQty(q => q + 1)} style={{ background: 'none', border: 'none', color: '#E8EDF2', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '1rem' }}>+</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                      <div style={{ fontSize: '0.65rem', color: '#5A7089' }}>+{ammoQty * at.powerPerBox} güç</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#F97316' }}>₺{fmtWord(ammoQty * at.costPerBox)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem' }}>
                    {[1,3,5].map(n => <button key={n} onClick={() => setAmmoQty(n)} style={{ flex: 1, padding: '0.28rem', borderRadius: 8, border: `1px solid ${ammoQty===n?'rgba(249,115,22,0.4)':'rgba(255,255,255,0.1)'}`, background: ammoQty===n?'rgba(249,115,22,0.12)':'rgba(255,255,255,0.03)', color: ammoQty===n?'#FB923C':'#8BA0B5', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 700 }}>{n} kutu</button>)}
                  </div>
                  <button onClick={buyAmmo} disabled={!isGangLeader}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 10, border: isGangLeader ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.08)', background: isGangLeader ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.04)', color: isGangLeader ? '#FB923C' : '#5A7089', fontFamily: 'inherit', fontWeight: 800, fontSize: '0.82rem', cursor: isGangLeader ? 'pointer' : 'not-allowed' }}>
                    {isGangLeader ? `${at.icon} ${ammoQty} Kutu Al (+${ammoQty * at.powerPerBox} güç)` : 'Sadece lider alabilir'}
                  </button>
                </>
              );
            })()}

            {myAmmo > 0 && (
              <div style={{ marginTop: '0.55rem' }}>
                <div style={{ fontSize: '0.65rem', color: '#5A7089', marginBottom: '0.3rem' }}>Mevcut Mermi Gücü: <strong style={{ color: '#FB923C' }}>{myAmmo}</strong> (+{ammoPower} güç)</div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {[10,50,100].filter(n => n <= myAmmo).map(n => (
                    <button key={n} onClick={() => sellAmmo(n)} disabled={!isGangLeader}
                      style={{ flex: 1, padding: '0.35rem', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.06)', color: '#F59E0B', fontWeight: 700, fontSize: '0.68rem', cursor: 'pointer' }}>
                      {n} sat (+₺{fmtWord(n * 40000)})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// YETKİLERİM SAYFASI
// ═══════════════════════════════════════════════════════
