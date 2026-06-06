// ═══════════════════════════════════════════════════════
// ÇETE / AİLE SAYFASI
// ═══════════════════════════════════════════════════════
function GangPage({ profile, setProfile, showNotif, typeFilter }) {
  const [gangs, setGangs] = useLs('gangs', []);
  const [sub, setSub] = useState('gangs');
  const [createModal, setCreateModal] = useState(false);
  const [gForm, setGForm] = useState({ name:'', type:'gang', desc:'' });
  const [gangCooldowns, setGangCooldowns] = useLs('gangCooldowns', {});
  const [transferModal, setTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [disbandConfirm, setDisbandConfirm] = useState(false);
  const [donateModal, setDonateModal] = useState(false);
  const [donateAmt, setDonateAmt] = useState('');
  const [halefModal, setHalefModal] = useState(false);
  const [halefTarget, setHalefTarget] = useState('');
  const [rankMenuUid, setRankMenuUid] = useState(null);

  const uid = profile?.uid || profile?.id;
  const filteredGangs = typeFilter ? gangs.filter(g=>g.type===typeFilter) : gangs;
  const myGang = gangs.find(g => (!typeFilter || g.type===typeFilter) && (g.leaderId===uid || (g.members||[]).includes(uid)));
  const isMyGangMatchFilter = !!myGang;
  const isGangLeader = !!uid && myGang?.leaderId === uid;

  const createGang = () => {
    if (!gForm.name.trim()) { showNotif('İsim gerekli','error'); return; }
    if (myGang) { showNotif(`Zaten bir ${isFamily?'aileye':'çeteye'} üyesin`,'error'); return; }
    if (profile?.party) { showNotif('🏛️ Parti üyeleri çete veya aile kuramazlar. Önce partiden ayrılın.','error'); return; }
    const actualType = typeFilter || gForm.type;
    const cost = actualType==='family' ? 500000 : 100000;
    if ((profile?.money||0) < cost) { showNotif(`${actualType==='family'?'Aile kurmak için ₺500.000':'Çete kurmak için ₺100.000'} gerekli`,'error'); return; }
    const gang = {
      id:genId(), name:gForm.name.trim(), type:actualType, desc:gForm.desc,
      leaderId:uid, leaderName:profile?.username,
      members:[uid], memberCount:1, treasury:0,
      power:10, territory:0, reputation:0, createdAt:Date.now()
    };
    setGangs(prev => { const next=[...prev, gang]; try{window._socket?.emit('gang:create',{gang});window._socket?.emit('gang:sync',{gangs:next});}catch(e){}; return next; });
    setProfile(p => { const field=actualType==='family'?'family':'gang'; const np={...p,[field]:gang.id,money:(p.money||0)-cost}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setCreateModal(false);
    setGForm({name:'',type:'gang',desc:''});
    showNotif(`${gang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'} ${gang.name} kuruldu!`,'success');
    try { window._pushGameEvent?.(gang.type==='family'?'aile_kuruldu':'cete_kuruldu', `${gang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'} ${gang.name} kuruldu!`, `${profile?.username||'Bir oyuncu'} yeni bir ${gang.type==='family'?'aile':'çete'} kurdu.`, gang.type==='family'?'👨‍👩‍👧‍👦':'⚔️', gang.type==='family'?'aile':'çete'); } catch(e){} 
  };

  const joinGang = (gang) => {
    if (myGang) { showNotif(`Zaten bir ${isFamily?'aileye':'çeteye'} üyesin`,'error'); return; }
    if (profile?.party) { showNotif('🏛️ Parti üyeleri çete veya aileye katılamaz. Önce partiden ayrılın.','error'); return; }
    setGangs(prev => { const next=prev.map(g => g.id===gang.id ? {...g, members:[...(g.members||[]),uid], memberCount:(g.memberCount||0)+1, power:(g.power||10)+50} : g); try{window._socket?.emit('gang:join',{gangId:gang.id});window._socket?.emit('gang:sync',{gangs:next});}catch(e){}; return next; });
    setProfile(p => { const field=gang.type==='family'?'family':'gang'; const np={...p,[field]:gang.id}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`✅ ${gang.name}'e katıldın! Çete gücüne +50 eklendi.`,'success');
  };

  const leaveGang = () => {
    if (!myGang) return;
    if (isGangLeader) {
      if (!myGang.successorId) { showNotif('Lider ayrılamaz. Önce "Halef Belirle" ile bir halef seç veya liderliği devret.','error'); return; }
      setGangs(prev => { const next=prev.map(g => g.id===myGang.id ? {...g, leaderId:g.successorId, leaderName:g.successorName, successorId:null, successorName:null, members:(g.members||[]).filter(m=>m!==uid), memberCount:Math.max(0,(g.memberCount||1)-1), power:Math.max(10,(g.power||10)-50)} : g); try{window._socket?.emit('gang:sync',{gangs:next});}catch(e){}; return next; });
      setProfile(p => { const field=myGang.type==='family'?'family':'gang'; const np={...p,[field]:null}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
      showNotif(`👑 Liderlik ${myGang.successorName}'e otomatik devredildi. Çeteden ayrıldın.`,'success');
      return;
    }
    setGangs(prev => { const next=prev.map(g => g.id===myGang.id ? {...g,members:(g.members||[]).filter(m=>m!==uid),memberCount:Math.max(0,(g.memberCount||1)-1),power:Math.max(10,(g.power||10)-50)} : g); try{window._socket?.emit('gang:leave',{gangId:myGang.id});window._socket?.emit('gang:sync',{gangs:next});}catch(e){}; return next; });
    setProfile(p => { const field=myGang.type==='family'?'family':'gang'; const np={...p,[field]:null}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif('Çeteden ayrıldın. -50 güç.','info');
  };

  const setGangSuccessor = () => {
    if (!isGangLeader || !halefTarget.trim()) { showNotif('Kullanıcı adı girin','error'); return; }
    const users = (()=>{ try{return JSON.parse(localStorage.getItem('rep_users')||'[]');}catch{return[];} })();
    const tgt = users.find(u => u.username===halefTarget.trim());
    if (!tgt) { showNotif('Kullanıcı bulunamadı','error'); return; }
    const tgtId = tgt.id||tgt.uid;
    if (!(myGang.members||[]).includes(tgtId)) { showNotif('Bu kişi çetede değil','error'); return; }
    if (tgtId===uid) { showNotif('Kendinizi halef seçemezsiniz','error'); return; }
    setGangs(prev => prev.map(g => g.id===myGang.id ? {...g, successorId:tgtId, successorName:tgt.username} : g));
    setHalefModal(false); setHalefTarget('');
    showNotif(`👑 ${tgt.username} halef olarak belirlendi. Ayrıldığında liderlik otomatik devrolur.`,'success');
  };

  const clearSuccessor = () => {
    setGangs(prev => prev.map(g => g.id===myGang.id ? {...g, successorId:null, successorName:null} : g));
    showNotif('Halef seçimi iptal edildi','info');
  };

  const changeMemberRank = (muid, rank) => {
    if (!isGangLeader) return;
    setGangs(prev => prev.map(g => g.id===myGang.id ? {...g, ranks:{...(g.ranks||{}), [muid]:rank}} : g));
    setRankMenuUid(null);
    showNotif(`Rütbe güncellendi ✓`,'success');
  };

  const kickMember = (muid) => {
    if (!isGangLeader) return;
    setGangs(prev => prev.map(g => g.id===myGang.id ? {...g,members:(g.members||[]).filter(m=>m!==muid),memberCount:Math.max(0,(g.memberCount||1)-1),power:Math.max(10,(g.power||10)-50)} : g));
    showNotif('Üye çeteden çıkarıldı. -50 güç.','info');
  };

  const donateToGang = () => {
    const amt = parseInt(donateAmt);
    if (!amt||amt<=0) { showNotif('Geçerli tutar girin','error'); return; }
    if ((profile?.money||0)<amt) { showNotif('Yetersiz para','error'); return; }
    setGangs(prev => prev.map(g => g.id===myGang.id ? {...g,treasury:(g.treasury||0)+amt} : g));
    setProfile(p => { const np={...p,money:(p.money||0)-amt}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setDonateModal(false); setDonateAmt('');
    showNotif(`💰 ${fmtWord(amt)} kasaya yatırıldı`,'success');
  };

  const gangAction = (actionId, cdMs, fn) => {
    const key = `gang_${myGang?.id}_${actionId}`;
    const rem = cdMs - (Date.now()-(gangCooldowns[key]||0));
    if (rem > 0) { showNotif(`⏳ ${Math.ceil(rem/3600000)}s sonra tekrar`,'error'); return; }
    fn();
    setGangCooldowns(prev => ({...prev,[key]:Date.now()}));
  };

  const transferGangLeadership = () => {
    if (!isGangLeader||!transferTarget.trim()) { showNotif('Kullanıcı adı girin','error'); return; }
    const users = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch{return[];} })();
    const tgt = users.find(u => u.username===transferTarget.trim());
    if (!tgt) { showNotif('Kullanıcı bulunamadı','error'); return; }
    if (!(myGang.members||[]).includes(tgt.id||tgt.uid)) { showNotif('Bu kişi çetede değil','error'); return; }
    setGangs(prev => prev.map(g => g.id===myGang.id ? {...g,leaderId:tgt.id||tgt.uid,leaderName:tgt.username} : g));
    setTransferModal(false); setTransferTarget('');
    showNotif(`👑 Liderlik ${tgt.username} kişisine devredildi`,'success');
  };

  const disbandGang = () => {
    if (!isGangLeader) return;
    setGangs(prev => { const next=prev.filter(g => g.id!==myGang.id); try{window._socket?.emit('gang:disband',{gangId:myGang.id});window._socket?.emit('gang:sync',{gangs:next});}catch(e){}; return next; });
    setProfile(p => { const field=myGang.type==='family'?'family':'gang'; const np={...p,[field]:null}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setDisbandConfirm(false);
    showNotif(`${myGang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'} ${myGang.name} dağıtıldı`,'info');
  };

  const inpSt = {width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'};
  const isFamily = typeFilter==='family';
  const subItems = isMyGangMatchFilter
    ? (isFamily
        ? [{id:'gangs',label:'👨‍👩‍👧‍👦 Liste'},{id:'management',label:'⚙️ Yönetim'}]
        : [{id:'gangs',label:'⚔️ Liste'},{id:'management',label:'⚙️ Yönetim'},{id:'attack',label:'🥊 Suç'},{id:'territory',label:'🗺️ Bölge'},{id:'weapons',label:'🔫 Silah'}])
    : (isFamily
        ? [{id:'gangs',label:'👨‍👩‍👧‍👦 Aileler'}]
        : [{id:'gangs',label:'⚔️ Çeteler'},{id:'attack',label:'🥊 Suç'},{id:'territory',label:'🗺️ Bölge'}]);

  return (
    <div>
      <div style={{display:'flex',gap:'4px',padding:'0.5rem 0.7rem',overflowX:'auto',scrollbarWidth:'none',background:'rgba(6,12,24,0.97)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
        {subItems.map(s=>(
          <button key={s.id} onClick={()=>setSub(s.id)}
            style={{padding:'0.38rem 0.75rem',borderRadius:'8px',border:`1px solid ${sub===s.id?'rgba(239,68,68,0.4)':'rgba(255,255,255,0.07)'}`,background:sub===s.id?'rgba(239,68,68,0.12)':'rgba(255,255,255,0.03)',color:sub===s.id?'#FCA5A5':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.76rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{padding:'0.7rem'}}>

        {sub==='gangs' && (
          <div>
            {myGang && (
              <div style={{background:'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(11,21,39,0.95))',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'14px',padding:'1rem',marginBottom:'0.75rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.6rem',marginBottom:'0.5rem'}}>
                  <div style={{fontSize:'1.5rem'}}>{myGang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'}</div>
                  <div>
                    <div style={{fontWeight:900,color:'#E8EDF2',fontSize:'1rem'}}>{myGang.name}</div>
                    <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{myGang.memberCount} üye • Güç: {(myGang.power||10)+((myGang.weapons||0)*5)} • {isGangLeader?'👑 Lidersin':'Üye'}</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.35rem',marginBottom:'0.5rem'}}>
                  {[['💰','Kasa',fmtWord(myGang.treasury||0)],['⚡','Güç',(myGang.power||10)+((myGang.weapons||0)*5)],['🗺️','Bölge',myGang.territory||0]].map(([ic,lb,v])=>(
                    <div key={lb} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.4rem',textAlign:'center'}}>
                      <div style={{fontSize:'0.9rem'}}>{ic}</div>
                      <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.78rem'}}>{v}</div>
                      <div style={{fontSize:'0.55rem',color:'#5A7089',textTransform:'uppercase'}}>{lb}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                  <Btn variant='ghost' size='sm' onClick={()=>setSub('management')}>⚙️ Yönet</Btn>
                  <Btn variant='ghost' size='sm' onClick={()=>setDonateModal(true)}>💰 Bağış</Btn>
                  {!isGangLeader && <Btn variant='danger' size='sm' onClick={leaveGang}>🚪 Ayrıl</Btn>}
                </div>
              </div>
            )}
            {!myGang && (
              <div style={{marginBottom:'0.75rem'}}>
                {!isFamily && <Btn variant='danger' size='sm' style={{width:'100%',marginBottom:'0.4rem'}} onClick={()=>{setGForm(p=>({...p,type:'gang'}));setCreateModal(true);}}>⚔️ Çete Kur (₺2 Mlr)</Btn>}
                {isFamily && <Btn variant='ghost' size='sm' style={{width:'100%'}} onClick={()=>{setGForm(p=>({...p,type:'family'}));setCreateModal(true);}}>👨‍👩‍👧‍👦 Aile Kur (₺5 Mlr)</Btn>}
              </div>
            )}
            {filteredGangs.map(gang => (
              <Card key={gang.id} style={{marginBottom:'0.5rem',padding:'0.85rem',border:`1px solid ${gang.id===myGang?.id?'rgba(239,68,68,0.3)':gang.type==='family'?'rgba(245,158,11,0.15)':'rgba(239,68,68,0.1)'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{gang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'} {gang.name}</div>
                    <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{gang.memberCount} üye • Güç: {(gang.power||10)+((gang.weapons||0)*5)} • {fmtWord(gang.treasury||0)} kasa</div>
                  </div>
                  <div style={{display:'flex',gap:'0.3rem',alignItems:'center'}}>
                    {gang.id===myGang?.id && <Tag color='red'>Üyesin</Tag>}
                    {!myGang && <Btn variant='ghost' size='sm' onClick={()=>joinGang(gang)}>Katıl</Btn>}
                  </div>
                </div>
              </Card>
            ))}
            {filteredGangs.length===0 && <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>{isFamily?'Henüz aile yok. İlk sen kur! 👨‍👩‍👧‍👦':'Henüz çete yok. İlk sen kur! ⚔️'}</div>}
          </div>
        )}

        {sub==='management' && (
          <div>
            {!myGang ? (
              <Card style={{textAlign:'center',padding:'2rem'}}><div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>⚔️</div><div style={{color:'#5A7089',fontSize:'0.85rem'}}>Yönetim için bir çeteye katıl</div></Card>
            ) : (
              <div>
                <Card style={{marginBottom:'0.65rem',background:'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(11,21,39,0.95))'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.65rem'}}>
                    <div style={{fontSize:'1.5rem'}}>{myGang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'}</div>
                    <div style={{fontWeight:900,color:'#E8EDF2',fontSize:'1rem'}}>{myGang.name}</div>
                    {isGangLeader&&<Tag color='red'>👑 Lider</Tag>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.35rem',marginBottom:'0.5rem'}}>
                    {[['👑','Lider',myGang.leaderName||'?'],['👥','Üye',myGang.memberCount||1],['⚡','Güç',(myGang.power||10)+((myGang.weapons||0)*5)],['💰','Kasa',fmtWord(myGang.treasury||0)]].map(([ic,lb,v])=>(
                      <div key={lb} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.4rem',textAlign:'center'}}>
                        <div style={{fontSize:'0.8rem'}}>{ic}</div>
                        <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.7rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
                        <div style={{fontSize:'0.52rem',color:'#5A7089',textTransform:'uppercase'}}>{lb}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                    <Btn variant='ghost' size='sm' onClick={()=>setDonateModal(true)}>💰 Kasa Yatır</Btn>
                    {!isGangLeader && <Btn variant='danger' size='sm' onClick={leaveGang}>🚪 Ayrıl</Btn>}
                  </div>
                </Card>

                {isGangLeader && (
                  <Card style={{marginBottom:'0.65rem',border:'1px solid rgba(239,68,68,0.2)'}}>
                    <div style={{fontWeight:700,color:'#FCA5A5',marginBottom:'0.65rem',fontSize:'0.82rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>👑 Lider Yetkileri</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem',marginBottom:'0.5rem'}}>
                      {[
                        {id:'harac',label:'💰 Haraç Topla',cd:2*3600000,fn:()=>{const g=Math.floor((myGang.power||10)*150);setGangs(prev=>prev.map(x=>x.id===myGang.id?{...x,treasury:(x.treasury||0)+g}:x));showNotif(`💰 Haraç! +${fmtWord(g)} kasa`,'success');}},
                        {id:'bolge',label:'🗺️ Bölge Al',cd:3*3600000,fn:()=>{setGangs(prev=>prev.map(x=>x.id===myGang.id?{...x,territory:(x.territory||0)+1,power:(x.power||10)+2}:x));setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+150};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});showNotif('🗺️ Yeni bölge! +1 bölge, +2 güç, +150 XP','success');}},
                        {id:'savunma',label:'🛡️ Güvenli Alan',cd:4*3600000,fn:()=>{setGangs(prev=>prev.map(x=>x.id===myGang.id?{...x,power:(x.power||10)+5}:x));showNotif('🛡️ Güvenli alan! +5 güç','success');}},
                        {id:'baskin',label:'⚔️ Baskın',cd:6*3600000,fn:()=>{const won=Math.random()<0.55;const prize=won?Math.floor((myGang.power||10)*200):0;if(won){setGangs(prev=>prev.map(x=>x.id===myGang.id?{...x,power:(x.power||10)+3}:x));setProfile(pr=>{const np={...pr,money:(pr.money||0)+prize,xp:(pr.xp||0)+200};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});}else{setGangs(prev=>prev.map(x=>x.id===myGang.id?{...x,power:Math.max(5,(x.power||10)-2)}:x));}showNotif(won?`⚔️ Baskın başarılı! +${fmtWord(prize)}`:'⚔️ Başarısız! -2 güç',won?'success':'error');}},
                      ].map(a=>{
                        const key=`gang_${myGang.id}_${a.id}`;
                        const rem=Math.max(0,a.cd-(Date.now()-(gangCooldowns[key]||0)));
                        return (
                          <button key={a.id} onClick={()=>gangAction(a.id,a.cd,a.fn)} disabled={rem>0}
                            style={{padding:'0.55rem 0.4rem',background:rem>0?'rgba(255,255,255,0.03)':'rgba(239,68,68,0.08)',border:`1px solid ${rem>0?'rgba(255,255,255,0.07)':'rgba(239,68,68,0.2)'}`,borderRadius:'10px',color:rem>0?'#3B4E63':'#FCA5A5',cursor:rem>0?'not-allowed':'pointer',fontWeight:700,fontSize:'0.72rem',fontFamily:"'DM Sans',sans-serif",textAlign:'center',lineHeight:1.3}}>
                            {a.label}{rem>0&&<div style={{fontSize:'0.6rem',marginTop:'2px',color:'#5A7089'}}>⏳{Math.ceil(rem/3600000)}s</div>}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'0.5rem'}}>
                      <Btn variant='ghost' size='sm' onClick={()=>setHalefModal(true)}>🎖️ Halef Belirle</Btn>
                      <Btn variant='ghost' size='sm' onClick={()=>setTransferModal(true)}>🔄 Liderliği Devret</Btn>
                      <Btn variant='danger' size='sm' onClick={leaveGang}>🚪 Ayrıl</Btn>
                      <Btn variant='danger' size='sm' onClick={()=>setDisbandConfirm(true)}>🗑️ Dağıt</Btn>
                    </div>
                  </Card>
                )}

                {/* HALEF KARTI */}
                {isGangLeader && (
                  <Card style={{marginBottom:'0.65rem',background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.35rem'}}>
                      <div style={{fontWeight:700,color:'#FCD34D',fontSize:'0.82rem'}}>🎖️ Halef (Vasiyet)</div>
                      <button onClick={()=>setHalefModal(true)} style={{background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'6px',padding:'2px 8px',color:'#FCD34D',cursor:'pointer',fontSize:'0.68rem',fontWeight:700}}>Değiştir</button>
                    </div>
                    {myGang.successorId ? (
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div style={{fontSize:'0.82rem',color:'#E8EDF2'}}>
                          <span style={{marginRight:'0.4rem'}}>👑</span>
                          <strong>{myGang.successorName}</strong>
                          <span style={{color:'#5A7089',fontSize:'0.7rem',marginLeft:'0.4rem'}}>— Ayrıldığında otomatik lider olur</span>
                        </div>
                        <button onClick={clearSuccessor} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'6px',padding:'2px 8px',color:'#FCA5A5',cursor:'pointer',fontSize:'0.65rem',fontWeight:700}}>İptal</button>
                      </div>
                    ) : (
                      <div style={{fontSize:'0.78rem',color:'#5A7089'}}>Henüz halef belirlenmedi. Liderin ayrılmak için halef belirlemesi gerekir.</div>
                    )}
                  </Card>
                )}

                <Card>
                  <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.65rem',fontSize:'0.85rem'}}>👥 Üyeler ({myGang.memberCount||1})</div>
                  {(()=>{
                    const RANKS = ['👤 Çaylak','🔫 Asker','⚡ Kapodecima','💀 Underboss'];
                    return (myGang.members||[]).map((muid,i)=>{
                      const isLeaderRow = muid===myGang.leaderId;
                      const memberRank = isLeaderRow ? '👑 Lider' : ((myGang.ranks||{})[muid] || '👤 Çaylak');
                      const isSuccessor = muid===myGang.successorId;
                      return (
                        <div key={muid} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',paddingBottom:'0.35rem',marginBottom:'0.35rem'}}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                            <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                              <div style={{width:'28px',height:'28px',borderRadius:'50%',background:isLeaderRow?'rgba(239,68,68,0.15)':isSuccessor?'rgba(245,158,11,0.15)':'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem'}}>
                                {isLeaderRow?'👑':isSuccessor?'🎖️':'👤'}
                              </div>
                              <div>
                                <div style={{fontSize:'0.82rem',fontWeight:700,color:muid===uid?'#FCA5A5':'#E8EDF2'}}>
                                  {muid===uid?profile?.username:`Üye #${i+1}`}
                                  {isSuccessor&&<span style={{marginLeft:'0.3rem',fontSize:'0.65rem',color:'#FCD34D',fontWeight:700}}>HALEF</span>}
                                </div>
                                <div style={{fontSize:'0.65rem',color:'#5A7089'}}>{memberRank}</div>
                              </div>
                            </div>
                            {isGangLeader&&!isLeaderRow&&(
                              <div style={{display:'flex',gap:'0.3rem'}}>
                                <button onClick={()=>setRankMenuUid(rankMenuUid===muid?null:muid)} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',padding:'2px 7px',color:'#8BA0B5',cursor:'pointer',fontSize:'0.65rem',fontWeight:700}}>Rütbe</button>
                                <button onClick={()=>kickMember(muid)} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'6px',padding:'2px 8px',color:'#FCA5A5',cursor:'pointer',fontSize:'0.65rem',fontWeight:700}}>Çıkar</button>
                              </div>
                            )}
                          </div>
                          {rankMenuUid===muid&&(
                            <div style={{display:'flex',gap:'0.3rem',flexWrap:'wrap',marginTop:'0.35rem',paddingLeft:'2.2rem'}}>
                              {RANKS.map(r=>(
                                <button key={r} onClick={()=>changeMemberRank(muid,r)}
                                  style={{background:memberRank===r?'rgba(239,68,68,0.15)':'rgba(255,255,255,0.05)',border:`1px solid ${memberRank===r?'rgba(239,68,68,0.35)':'rgba(255,255,255,0.08)'}`,borderRadius:'6px',padding:'2px 7px',color:memberRank===r?'#FCA5A5':'#8BA0B5',cursor:'pointer',fontSize:'0.65rem',fontWeight:700}}>
                                  {r}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </Card>
              </div>
            )}
          </div>
        )}

        {sub==='attack' && (
          <div>
            {[['🥊','Sokak Kavgası',80,'₺500-2.000',500],['🔫','Gasp Girişimi',60,'₺2.000-8.000',3000],['💣','Banka Soygunu',30,'₺20K-100K',10000],['🚗','Araba Hırsızlığı',70,'₺5.000-15.000',2000]].map(([ic,name,rate,earn,fine])=>(
              <button key={name} onClick={()=>{
                const success=Math.random()*100<rate;
                const amount=success?Math.floor(Math.random()*(rate===30?80000:rate===60?6000:rate===70?10000:1500)+2000):0;
                const penalty=success?0:fine;
                setProfile(p=>{const np={...p,money:(p.money||0)+amount-penalty,xp:(p.xp||0)+(success?100:20)};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});
                showNotif(success?`🎉 Başarılı! +${fmtWord(amount)}`:`😔 Başarısız! -${fmtWord(penalty)} ceza`,success?'success':'error');
                if (success && amount >= 20000) { try { window._pushGameEvent?.('suc_basarili', `${ic} ${name}`, `${profile?.username||'Bir çete üyesi'} başarılı! +₺${amount.toLocaleString()} ganimet.`, ic, 'çete'); } catch(e){} }
              }}
                style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.85rem',background:'rgba(20,36,60,0.8)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'12px',width:'100%',marginBottom:'0.5rem',cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
                <span style={{fontSize:'1.5rem',width:'32px',textAlign:'center',flexShrink:0}}>{ic}</span>
                <div style={{flex:1,textAlign:'left'}}>
                  <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{name}</div>
                  <div style={{fontSize:'0.67rem',color:'#10B981'}}>%{rate} başarı • Kazanç: {earn}</div>
                  <div style={{fontSize:'0.65rem',color:'#EF4444'}}>Ceza riski: {fmtWord(fine)}</div>
                </div>
                <span style={{color:'#EF4444',fontSize:'0.85rem'}}>→</span>
              </button>
            ))}
          </div>
        )}

        {sub==='territory' && (
          <TerritorySystem profile={profile} setProfile={setProfile} showNotif={showNotif} myGang={myGang} gangs={gangs} setGangs={setGangs} isGangLeader={isGangLeader} />
        )}

        {sub==='weapons' && (
          <WeaponSystem profile={profile} setProfile={setProfile} showNotif={showNotif} myGang={myGang} gangs={gangs} setGangs={setGangs} isGangLeader={isGangLeader} />
        )}
      </div>

      {createModal && (
        <Modal title={(typeFilter||gForm.type)==='gang'?'⚔️ Çete Kur':'👨‍👩‍👧‍👦 Aile Kur'} onClose={()=>{setCreateModal(false);setGForm({name:'',type:'gang',desc:''});}}>
          <div style={{marginBottom:'0.85rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>İsim</div>
            <input value={gForm.name} onChange={e=>setGForm(p=>({...p,name:e.target.value}))} placeholder={(typeFilter||gForm.type)==='gang'?'Çete adı...':'Aile adı...'} style={inpSt} />
          </div>
          <div style={{marginBottom:'0.85rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Açıklama (opsiyonel)</div>
            <textarea value={gForm.desc} onChange={e=>setGForm(p=>({...p,desc:e.target.value}))} placeholder="Kısa bir açıklama..." rows={2}
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none',resize:'none',boxSizing:'border-box'}} />
          </div>
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#FCA5A5',marginBottom:'1rem'}}>
            💡 Kurmak için gereken: {fmtWord((typeFilter||gForm.type)==='family'?5000000000:2000000000)} • Bakiye: {fmtWord(profile?.money)}
          </div>
          <Btn variant='danger' size='full' onClick={createGang}>{(typeFilter||gForm.type)==='gang'?'⚔️ Çeteyi Kur':'👨‍👩‍👧‍👦 Aileyi Kur'}</Btn>
        </Modal>
      )}

      {donateModal&&(
        <Modal title="💰 Kasaya Para Yatır" onClose={()=>{setDonateModal(false);setDonateAmt('');}}>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Tutar</div>
            <input type="number" value={donateAmt} onChange={e=>setDonateAmt(e.target.value)} placeholder="₺ Tutar" style={inpSt} />
            <div style={{display:'flex',gap:'0.4rem',marginTop:'0.5rem',flexWrap:'wrap'}}>
              {[5000,10000,25000,50000].map(n=><button key={n} onClick={()=>setDonateAmt(String(n))} style={{padding:'0.3rem 0.65rem',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'#8BA0B5',fontSize:'0.72rem',cursor:'pointer',fontWeight:700}}>{fmtWord(n)}</button>)}
            </div>
          </div>
          <Btn variant='danger' size='full' onClick={donateToGang}>💰 Yatır</Btn>
        </Modal>
      )}

      {transferModal&&(
        <Modal title="🔄 Liderliği Devret" onClose={()=>{setTransferModal(false);setTransferTarget('');}}>
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#FCA5A5',marginBottom:'1rem'}}>
            ⚠️ Liderliği devrettikten sonra artık lider yetkilerine sahip olmayacaksın.
          </div>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Yeni Lider Kullanıcı Adı</div>
            <input value={transferTarget} onChange={e=>setTransferTarget(e.target.value)} placeholder="Çete üyesinin kullanıcı adı" style={inpSt} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <Btn variant='ghost' size='md' onClick={()=>{setTransferModal(false);setTransferTarget('');}}>İptal</Btn>
            <Btn variant='danger' size='md' onClick={transferGangLeadership}>🔄 Devret</Btn>
          </div>
        </Modal>
      )}

      {disbandConfirm&&(
        <Modal title="🗑️ Çeteyi Dağıt" onClose={()=>setDisbandConfirm(false)}>
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#FCA5A5',marginBottom:'1rem'}}>
            ⚠️ Bu işlem geri alınamaz! <strong>{myGang?.name}</strong> kalıcı olarak dağıtılacak.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <Btn variant='ghost' size='md' onClick={()=>setDisbandConfirm(false)}>İptal</Btn>
            <Btn variant='red' size='md' onClick={disbandGang}>🗑️ Dağıt</Btn>
          </div>
        </Modal>
      )}

      {halefModal&&(
        <Modal title="🎖️ Halef Belirle" onClose={()=>{setHalefModal(false);setHalefTarget('');}}>
          <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#FCD34D',marginBottom:'1rem'}}>
            👑 Ayrıldığında liderlik otomatik bu kişiye devredilir. İstediğinde iptal edebilirsin.
          </div>
          {myGang?.successorId && (
            <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.5rem 0.75rem',marginBottom:'0.75rem',fontSize:'0.78rem',color:'#8BA0B5'}}>
              Mevcut halef: <strong style={{color:'#FCD34D'}}>{myGang.successorName}</strong>
            </div>
          )}
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Yeni Halef Kullanıcı Adı</div>
            <input value={halefTarget} onChange={e=>setHalefTarget(e.target.value)} placeholder="Çete üyesinin kullanıcı adı"
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'}} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <Btn variant='ghost' size='md' onClick={()=>{setHalefModal(false);setHalefTarget('');}}>İptal</Btn>
            <Btn variant='ghost' size='md' onClick={setGangSuccessor} style={{background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',color:'#FCD34D'}}>🎖️ Halef Belirle</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

