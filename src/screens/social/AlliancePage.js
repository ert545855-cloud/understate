// ═══════════════════════════════════════════════════════
// İTTİFAK SİSTEMİ
// ═══════════════════════════════════════════════════════
function AlliancePage({ profile, setProfile, showNotif }) {
  const [alliances, setAlliances] = useLs('alliances', []);
  const [sub, setSub] = useState('list');
  const [createModal, setCreateModal] = useState(false);
  const [aForm, setAForm] = useState({ name:'', tag:'', desc:'', type:'open' });
  const [searchQ, setSearchQ] = useState('');
  const [allianceCooldowns, setAllianceCooldowns] = useLs('allianceCooldowns', {});
  const [transferModal, setTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [disbandConfirm, setDisbandConfirm] = useState(false);
  const [donateModal, setDonateModal] = useState(false);
  const [donateAmt, setDonateAmt] = useState('');

  const uid = profile?.uid || profile?.id;
  const myAlliance = alliances.find(a => a.leaderId===uid || (a.members||[]).includes(uid));
  const isAllianceLeader = !!uid && myAlliance?.leaderId === uid;

  const ALLIANCE_COST = 75000;

  const createAlliance = () => {
    if (!aForm.name.trim()||!aForm.tag.trim()) { showNotif('İsim ve etiket gerekli','error'); return; }
    if (aForm.tag.length>5) { showNotif('Etiket max 5 karakter','error'); return; }
    if (myAlliance) { showNotif('Zaten bir ittifaka üyesin','error'); return; }
    if ((profile?.money||0) < ALLIANCE_COST) { showNotif(`İttifak kurmak ${fmtWord(ALLIANCE_COST)} gerektirir`,'error'); return; }
    const a = { id:genId(), name:aForm.name.trim(), tag:aForm.tag.toUpperCase(), desc:aForm.desc, type:aForm.type,
      leaderId:uid, leaderName:profile?.username, members:[uid], memberCount:1, level:1, treasury:0, xp:0, power:10, createdAt:Date.now() };
    setAlliances(prev => { const next=[...prev, a]; try{window._socket?.emit('alliance:sync',{alliances:next});}catch(e){}; return next; });
    setProfile(p => { const np={...p,alliance:a.id,money:(p.money||0)-ALLIANCE_COST}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setCreateModal(false);
    setAForm({name:'',tag:'',desc:'',type:'open'});
    showNotif(`🤝 ${a.name} İttifakı kuruldu!`,'success');
  };

  const joinAlliance = (a) => {
    if (myAlliance) { showNotif('Zaten bir ittifaka üyesin','error'); return; }
    if (a.type!=='open') { showNotif('Bu ittifak kapalı','error'); return; }
    setAlliances(prev => { const next=prev.map(al => al.id===a.id ? {...al,members:[...(al.members||[]),uid],memberCount:(al.memberCount||0)+1} : al); try{window._socket?.emit('alliance:sync',{alliances:next});}catch(e){}; return next; });
    setProfile(p => { const np={...p,alliance:a.id}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`✅ ${a.name}'e katıldın!`,'success');
  };

  const leaveAlliance = () => {
    if (!myAlliance||isAllianceLeader) { if(isAllianceLeader) showNotif('Lider ayrılamaz. Önce liderliği devret.','error'); return; }
    setAlliances(prev => { const next=prev.map(a => a.id===myAlliance.id ? {...a,members:(a.members||[]).filter(m=>m!==uid),memberCount:Math.max(0,(a.memberCount||1)-1)} : a); try{window._socket?.emit('alliance:sync',{alliances:next});}catch(e){}; return next; });
    setProfile(p => { const np={...p,alliance:null}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif('İttifaktan ayrıldın','info');
  };

  const kickAllianceMember = (muid) => {
    if (!isAllianceLeader) return;
    setAlliances(prev => prev.map(a => a.id===myAlliance.id ? {...a,members:(a.members||[]).filter(m=>m!==muid),memberCount:Math.max(0,(a.memberCount||1)-1)} : a));
    showNotif('Üye ittifaktan çıkarıldı','info');
  };

  const donateToAlliance = () => {
    const amt = parseInt(donateAmt);
    if (!amt||amt<=0) { showNotif('Geçerli tutar girin','error'); return; }
    if ((profile?.money||0)<amt) { showNotif('Yetersiz para','error'); return; }
    setAlliances(prev => prev.map(a => a.id===myAlliance.id ? {...a,treasury:(a.treasury||0)+amt} : a));
    setProfile(p => { const np={...p,money:(p.money||0)-amt}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setDonateModal(false); setDonateAmt('');
    showNotif(`💰 ${fmtWord(amt)} ittifak kasasına yatırıldı`,'success');
  };

  const allianceAction = (actionId, cdMs, fn) => {
    const key = `all_${myAlliance?.id}_${actionId}`;
    const rem = cdMs - (Date.now()-(allianceCooldowns[key]||0));
    if (rem > 0) { showNotif(`⏳ ${Math.ceil(rem/3600000)}s sonra tekrar`,'error'); return; }
    fn();
    setAllianceCooldowns(prev => ({...prev,[key]:Date.now()}));
  };

  const transferAllianceLeadership = () => {
    if (!isAllianceLeader||!transferTarget.trim()) { showNotif('Kullanıcı adı girin','error'); return; }
    const users = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch{return[];} })();
    const tgt = users.find(u => u.username===transferTarget.trim());
    if (!tgt) { showNotif('Kullanıcı bulunamadı','error'); return; }
    if (!(myAlliance.members||[]).includes(tgt.id||tgt.uid)) { showNotif('Bu kişi ittifakta değil','error'); return; }
    setAlliances(prev => prev.map(a => a.id===myAlliance.id ? {...a,leaderId:tgt.id||tgt.uid,leaderName:tgt.username} : a));
    setTransferModal(false); setTransferTarget('');
    showNotif(`👑 Liderlik ${tgt.username} kişisine devredildi`,'success');
  };

  const disbandAlliance = () => {
    if (!isAllianceLeader) return;
    setAlliances(prev => { const next=prev.filter(a => a.id!==myAlliance.id); try{window._socket?.emit('alliance:sync',{alliances:next});}catch(e){}; return next; });
    setProfile(p => { const np={...p,alliance:null}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setDisbandConfirm(false);
    showNotif(`🤝 ${myAlliance.name} ittifakı feshedildi`,'info');
  };

  const filtered = alliances.filter(a => !searchQ || a.name.toLowerCase().includes(searchQ.toLowerCase()) || a.tag.toLowerCase().includes(searchQ.toLowerCase()));
  const inpSt = {width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'};
  const subItems = myAlliance
    ? [{id:'list',label:'🤝 Liste'},{id:'management',label:'⚙️ Yönetim'}]
    : [{id:'list',label:'🤝 İttifaklar'}];

  return (
    <div>
      <div style={{display:'flex',gap:'4px',padding:'0.5rem 0.7rem',overflowX:'auto',scrollbarWidth:'none',background:'rgba(6,12,24,0.97)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
        {subItems.map(s=>(
          <button key={s.id} onClick={()=>setSub(s.id)}
            style={{padding:'0.38rem 0.75rem',borderRadius:'8px',border:`1px solid ${sub===s.id?'rgba(16,185,129,0.4)':'rgba(255,255,255,0.07)'}`,background:sub===s.id?'rgba(16,185,129,0.12)':'rgba(255,255,255,0.03)',color:sub===s.id?'#6EE7B7':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.76rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{padding:'0.7rem'}}>

        {sub==='list' && (
          <div>
            {myAlliance && (
              <Card style={{marginBottom:'0.75rem',background:'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(11,21,39,0.9))',border:'1px solid rgba(16,185,129,0.2)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem'}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'0.2rem'}}>
                      <div style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'6px',padding:'2px 7px',fontWeight:900,fontSize:'0.75rem',color:'#10B981'}}>[{myAlliance.tag}]</div>
                      {isAllianceLeader && <Tag color='gold'>👑 Lider</Tag>}
                    </div>
                    <div style={{fontWeight:900,fontSize:'1.05rem',color:'#E8EDF2'}}>{myAlliance.name}</div>
                    <div style={{fontSize:'0.72rem',color:'#5A7089'}}>{myAlliance.memberCount} üye • Lv.{myAlliance.level||1} • {fmtWord(myAlliance.treasury)} kasa</div>
                  </div>
                </div>
                <div style={{fontSize:'0.78rem',color:'#8BA0B5',marginBottom:'0.5rem'}}>{myAlliance.desc}</div>
                <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                  <Btn variant='green' size='sm' onClick={()=>setSub('management')}>⚙️ Yönet</Btn>
                  <Btn variant='ghost' size='sm' onClick={()=>setDonateModal(true)}>💰 Kasa Yatır</Btn>
                  {!isAllianceLeader && <Btn variant='ghost' size='sm' onClick={leaveAlliance}>🚪 Ayrıl</Btn>}
                </div>
              </Card>
            )}
            <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.75rem'}}>
              <div style={{flex:1,display:'flex',alignItems:'center',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0 0.75rem'}}>
                <span style={{color:'#5A7089',marginRight:'0.4rem'}}>🔍</span>
                <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="İttifak ara..."
                  style={{flex:1,background:'none',border:'none',outline:'none',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',padding:'0.55rem 0'}} />
              </div>
              {!myAlliance && <Btn variant='primary' size='sm' onClick={()=>setCreateModal(true)}>+ Kur</Btn>}
            </div>
            <div style={{fontSize:'0.68rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',marginBottom:'0.5rem',letterSpacing:'0.08em'}}>Tüm İttifaklar ({filtered.length})</div>
            {filtered.map(a => (
              <Card key={a.id} style={{marginBottom:'0.5rem',padding:'0.85rem',border:`1px solid ${a.id===myAlliance?.id?'rgba(16,185,129,0.3)':'rgba(255,255,255,0.06)'}`}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                  <div style={{background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:'8px',padding:'0.4rem 0.6rem',fontWeight:900,fontSize:'0.8rem',color:'#60A5FA',flexShrink:0}}>[{a.tag}]</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.92rem'}}>{a.name}</div>
                    <div style={{fontSize:'0.68rem',color:'#5A7089'}}>{a.memberCount||0} üye • Lv.{a.level||1} • {a.type==='open'?'🔓 Açık':'🔒 Kapalı'}</div>
                  </div>
                  {!myAlliance && a.type==='open' && <Btn variant='primary' size='sm' onClick={()=>joinAlliance(a)}>Katıl</Btn>}
                  {a.id===myAlliance?.id && <Tag color='green'>Üyesin</Tag>}
                </div>
              </Card>
            ))}
            {filtered.length===0 && <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>İttifak bulunamadı. İlk sen kur! 🤝</div>}
          </div>
        )}

        {sub==='management' && (
          <div>
            {!myAlliance ? (
              <Card style={{textAlign:'center',padding:'2rem'}}><div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>🤝</div><div style={{color:'#5A7089',fontSize:'0.85rem'}}>Yönetim için bir ittifaka katıl</div></Card>
            ) : (
              <div>
                <Card style={{marginBottom:'0.65rem',background:'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(11,21,39,0.95))'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.65rem'}}>
                    <div style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'6px',padding:'2px 7px',fontWeight:900,fontSize:'0.8rem',color:'#10B981'}}>[{myAlliance.tag}]</div>
                    <div style={{fontWeight:900,color:'#E8EDF2',fontSize:'1rem'}}>{myAlliance.name}</div>
                    {isAllianceLeader&&<Tag color='gold'>👑 Lider</Tag>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.35rem',marginBottom:'0.5rem'}}>
                    {[['👥','Üye',myAlliance.memberCount||1],['⭐','Seviye',myAlliance.level||1],['⚡','Güç',myAlliance.power||10],['💰','Kasa',fmtWord(myAlliance.treasury||0)]].map(([ic,lb,v])=>(
                      <div key={lb} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.4rem',textAlign:'center'}}>
                        <div style={{fontSize:'0.8rem'}}>{ic}</div>
                        <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.7rem'}}>{v}</div>
                        <div style={{fontSize:'0.52rem',color:'#5A7089',textTransform:'uppercase'}}>{lb}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                    <Btn variant='ghost' size='sm' onClick={()=>setDonateModal(true)}>💰 Kasa Yatır</Btn>
                    {!isAllianceLeader && <Btn variant='ghost' size='sm' onClick={leaveAlliance}>🚪 Ayrıl</Btn>}
                  </div>
                </Card>

                {isAllianceLeader && (
                  <Card style={{marginBottom:'0.65rem',border:'1px solid rgba(16,185,129,0.2)'}}>
                    <div style={{fontWeight:700,color:'#6EE7B7',marginBottom:'0.65rem',fontSize:'0.82rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>👑 Lider Yetkileri</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem',marginBottom:'0.5rem'}}>
                      {[
                        {id:'operasyon',label:'🎯 Ortak Operasyon',cd:4*3600000,fn:()=>{const xp=Math.floor((myAlliance.memberCount||1)*80);setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+xp};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});setAlliances(prev=>prev.map(a=>a.id===myAlliance.id?{...a,xp:(a.xp||0)+xp,power:(a.power||10)+1}:a));showNotif(`🎯 Operasyon tamamlandı! +${xp} XP +1 güç`,'success');}},
                        {id:'diplomatik',label:'🕊️ Diplomatik Hamle',cd:6*3600000,fn:()=>{setAlliances(prev=>prev.map(a=>a.id===myAlliance.id?{...a,level:Math.min(10,(a.level||1)+1),power:(a.power||10)+3}:a));setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+200,meritPoints:(pr.meritPoints||0)+20};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});showNotif('🕊️ Diplomatik hamle! +1 seviye, +3 güç, +200 XP','success');}},
                        {id:'savunma',label:'🛡️ Savunma Hattı',cd:5*3600000,fn:()=>{setAlliances(prev=>prev.map(a=>a.id===myAlliance.id?{...a,power:(a.power||10)+8}:a));showNotif('🛡️ Savunma hattı kuruldu! +8 güç','success');}},
                        {id:'hazine',label:'💎 Hazine Kampanyası',cd:8*3600000,fn:()=>{const earn=Math.floor((myAlliance.level||1)*50000);setAlliances(prev=>prev.map(a=>a.id===myAlliance.id?{...a,treasury:(a.treasury||0)+earn}:a));showNotif(`💎 Kampanya! +${fmtWord(earn)} kasa`,'success');}},
                      ].map(a=>{
                        const key=`all_${myAlliance.id}_${a.id}`;
                        const rem=Math.max(0,a.cd-(Date.now()-(allianceCooldowns[key]||0)));
                        return (
                          <button key={a.id} onClick={()=>allianceAction(a.id,a.cd,a.fn)} disabled={rem>0}
                            style={{padding:'0.55rem 0.4rem',background:rem>0?'rgba(255,255,255,0.03)':'rgba(16,185,129,0.08)',border:`1px solid ${rem>0?'rgba(255,255,255,0.07)':'rgba(16,185,129,0.2)'}`,borderRadius:'10px',color:rem>0?'#3B4E63':'#6EE7B7',cursor:rem>0?'not-allowed':'pointer',fontWeight:700,fontSize:'0.72rem',fontFamily:"'DM Sans',sans-serif",textAlign:'center',lineHeight:1.3}}>
                            {a.label}{rem>0&&<div style={{fontSize:'0.6rem',marginTop:'2px',color:'#5A7089'}}>⏳{Math.ceil(rem/3600000)}s</div>}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'0.5rem'}}>
                      <Btn variant='ghost' size='sm' onClick={()=>setTransferModal(true)}>🔄 Liderliği Devret</Btn>
                      <Btn variant='danger' size='sm' onClick={()=>setDisbandConfirm(true)}>🗑️ Feshet</Btn>
                    </div>
                  </Card>
                )}

                <Card>
                  <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.65rem',fontSize:'0.85rem'}}>👥 Üyeler ({myAlliance.memberCount||1})</div>
                  {(myAlliance.members||[]).map((muid,i)=>(
                    <div key={muid} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.45rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'rgba(16,185,129,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem'}}>{muid===myAlliance.leaderId?'👑':'👤'}</div>
                        <div style={{fontSize:'0.82rem',fontWeight:700,color:muid===uid?'#6EE7B7':'#E8EDF2'}}>
                          {muid===uid?profile?.username:`Üye #${i+1}`}{muid===myAlliance.leaderId&&<span style={{marginLeft:'0.3rem'}}><Tag color='gold'>Lider</Tag></span>}
                        </div>
                      </div>
                      {isAllianceLeader&&muid!==myAlliance.leaderId&&(
                        <button onClick={()=>kickAllianceMember(muid)} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'6px',padding:'2px 8px',color:'#FCA5A5',cursor:'pointer',fontSize:'0.68rem',fontWeight:700}}>Çıkar</button>
                      )}
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {createModal && (
        <Modal title="🤝 İttifak Kur" onClose={()=>{setCreateModal(false);setAForm({name:'',tag:'',desc:'',type:'open'});}}>
          {[['name','İttifak Adı','İttifak adını girin',false],['tag','Etiket (Max 5)','ORG',false],['desc','Açıklama','Kısa bir açıklama...',true]].map(([k,l,ph,ta])=>(
            <div key={k} style={{marginBottom:'0.85rem'}}>
              <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>{l}</div>
              {ta ? <textarea value={aForm[k]} onChange={e=>setAForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} rows={2}
                style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none',resize:'none',boxSizing:'border-box'}} />
              : <input value={aForm[k]} onChange={e=>setAForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={inpSt} />}
            </div>
          ))}
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Katılım Tipi</div>
            <div style={{display:'flex',gap:'0.5rem'}}>
              {[['open','🔓 Açık'],['invite','🔒 Davet']].map(([v,l])=>(
                <button key={v} onClick={()=>setAForm(p=>({...p,type:v}))} style={{flex:1,padding:'0.55rem',borderRadius:'10px',border:`1px solid ${aForm.type===v?'rgba(16,185,129,0.4)':'rgba(255,255,255,0.08)'}`,background:aForm.type===v?'rgba(16,185,129,0.12)':'rgba(255,255,255,0.03)',color:aForm.type===v?'#10B981':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,cursor:'pointer'}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'10px',padding:'0.6rem',fontSize:'0.78rem',color:'#F59E0B',marginBottom:'1rem'}}>
            💡 Kurmak {fmtWord(ALLIANCE_COST)} gerektirir. Bakiye: {fmtWord(profile?.money)}
          </div>
          <Btn variant='primary' size='full' onClick={createAlliance}>🤝 İttifak Kur</Btn>
        </Modal>
      )}

      {donateModal&&(
        <Modal title="💰 Kasaya Para Yatır" onClose={()=>{setDonateModal(false);setDonateAmt('');}}>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Tutar</div>
            <input type="number" value={donateAmt} onChange={e=>setDonateAmt(e.target.value)} placeholder="₺ Tutar" style={inpSt} />
            <div style={{display:'flex',gap:'0.4rem',marginTop:'0.5rem',flexWrap:'wrap'}}>
              {[10000,25000,50000,100000].map(n=><button key={n} onClick={()=>setDonateAmt(String(n))} style={{padding:'0.3rem 0.65rem',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'#8BA0B5',fontSize:'0.72rem',cursor:'pointer',fontWeight:700}}>{fmtWord(n)}</button>)}
            </div>
          </div>
          <Btn variant='primary' size='full' onClick={donateToAlliance}>💰 Yatır</Btn>
        </Modal>
      )}

      {transferModal&&(
        <Modal title="🔄 Liderliği Devret" onClose={()=>{setTransferModal(false);setTransferTarget('');}}>
          <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#F59E0B',marginBottom:'1rem'}}>
            ⚠️ Liderliği devrettikten sonra artık lider yetkilerine sahip olmayacaksın.
          </div>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Yeni Lider Kullanıcı Adı</div>
            <input value={transferTarget} onChange={e=>setTransferTarget(e.target.value)} placeholder="İttifak üyesinin kullanıcı adı" style={inpSt} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <Btn variant='ghost' size='md' onClick={()=>{setTransferModal(false);setTransferTarget('');}}>İptal</Btn>
            <Btn variant='primary' size='md' onClick={transferAllianceLeadership}>🔄 Devret</Btn>
          </div>
        </Modal>
      )}

      {disbandConfirm&&(
        <Modal title="🗑️ İttifakı Feshet" onClose={()=>setDisbandConfirm(false)}>
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#FCA5A5',marginBottom:'1rem'}}>
            ⚠️ Bu işlem geri alınamaz! <strong>{myAlliance?.name}</strong> ittifakı kalıcı olarak feshedilecek.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <Btn variant='ghost' size='md' onClick={()=>setDisbandConfirm(false)}>İptal</Btn>
            <Btn variant='red' size='md' onClick={disbandAlliance}>🗑️ Feshet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

