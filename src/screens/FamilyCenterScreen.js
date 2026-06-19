// ═══════════════════════════════════════════════════════
// UNDERSTATE — Aile Merkezi (Legal Organizasyon)
// Boss → Underboss → Yönetici → Üye hiyerarşisi
// Fabrika yönetimi · Halef sistemi · Kasa
// ═══════════════════════════════════════════════════════
window.FamilyCenterScreen = function FamilyCenterScreen({ cu, families, gangs, parties, allUsers, setCurrentPage }) {

  const readFams    = () => { try { return JSON.parse(localStorage.getItem('rep_families')||'[]'); } catch { return []; } };
  const readProfile = () => { try { return JSON.parse(localStorage.getItem('rep_userProfile')||'{}'); } catch { return {}; } };
  const getToken    = () => localStorage.getItem('rep_token')||localStorage.getItem('token')||'';

  // Sunucu tabanlı aile fabrikaları (EconomicEmpireScreen ile senkronize)
  const [serverFactories, setServerFactories] = React.useState([]);

  const [fams, setFams]               = React.useState(readFams);
  const [tab, setTab]                 = React.useState('genel');
  const [createModal, setCreateModal] = React.useState(false);
  const [fForm, setFForm]             = React.useState({ name:'', desc:'', color:'#7C3AED' });
  const [inviteUser, setInviteUser]   = React.useState('');
  const [depositAmt, setDepositAmt]   = React.useState('');
  const [withdrawAmt, setWithdrawAmt] = React.useState('');
  const [msg, setMsg]                 = React.useState(null);
  const [confirmDisband, setConfirmDisband] = React.useState(false);

  const showMsg = (text, type='info') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };
  const fmt = (n) => { if(!n)return '₺0'; if(n>=1e9)return '₺'+(n/1e9).toFixed(1)+'Mlr'; if(n>=1e6)return '₺'+(n/1e6).toFixed(1)+'M'; if(n>=1e3)return '₺'+(n/1e3).toFixed(0)+'K'; return '₺'+Math.floor(n).toLocaleString('tr-TR'); };

  const saveFams = (next) => {
    localStorage.setItem('rep_families', JSON.stringify(next));
    setFams(next);
    try { window._socket?.emit('family:sync', { families: next }); } catch(e) {}
  };

  const myFamily = fams.find(f =>
    f.leaderId === cu?.uid || f.leader === cu?.username ||
    (Array.isArray(f.memberIds) && f.memberIds.includes(cu?.uid)) ||
    (Array.isArray(f.members)   && f.members.includes(cu?.username))
  );
  const isLeader = myFamily && (myFamily.leaderId===cu?.uid || myFamily.leader===cu?.username);

  const RANKS = [
    { id:'boss',      label:'👑 Boss',            color:'#FFD700', perms:['invite','kick','promote','factory','treasury','heir','disband'] },
    { id:'underboss', label:'⚔️ Underboss',       color:'#F97316', perms:['invite','factory','treasury'] },
    { id:'kasaci',    label:'💰 Kasa Yöneticisi', color:'#10B981', perms:['treasury'] },
    { id:'yonetici',  label:'🏛️ Yönetici',        color:'#A78BFA', perms:['factory'] },
    { id:'uye',       label:'👤 Üye',              color:'#60A5FA', perms:[] },
  ];

  const getMemberRank = (uname) => {
    if(!myFamily) return RANKS[3];
    if(myFamily.leader===uname || myFamily.leaderId===cu?.uid) {
      if(uname===cu?.username || uname===myFamily.leader) return RANKS[0];
    }
    const rid = myFamily.ranks?.[uname] || 'uye';
    return RANKS.find(r=>r.id===rid) || RANKS[3];
  };
  const myRank = isLeader ? RANKS[0] : getMemberRank(cu?.username);
  const hasPerm = (perm) => myRank?.perms?.includes(perm) || false;

  const FAMILY_CREATE_COST = 1000000;

  // ── Aile Kur ──────────────────────────────────────────
  const createFamily = () => {
    if (!fForm.name.trim()) return showMsg('Aile adı gerekli', 'error');
    if (myFamily) return showMsg('Zaten bir ailedeysin', 'error');
    const profile = readProfile();
    if (cu?.gang) return showMsg('Çete üyeleri aile kuramaz. Önce çetenden ayrıl.', 'error');
    if ((profile.money||0) < FAMILY_CREATE_COST) return showMsg(`Aile kurmak için ${fmt(FAMILY_CREATE_COST)} gerekli`, 'error');
    const family = {
      id:'fam_'+Date.now(), name:fForm.name.trim(), desc:fForm.desc.trim(),
      color:fForm.color, leaderId:cu.uid, leader:cu.username,
      members:[cu.username], memberIds:[cu.uid],
      ranks:{}, treasury:0, influence:0, factories:[],
      successorName:null, createdAt:Date.now(),
    };
    saveFams([...fams, family]);
    const np = {...profile, money:(profile.money||0)-FAMILY_CREATE_COST, family:family.id};
    localStorage.setItem('rep_userProfile', JSON.stringify(np));
    setCreateModal(false);
    setFForm({ name:'', desc:'', color:'#7C3AED' });
    showMsg(`👨‍👩‍👧 ${family.name} ailesi kuruldu!`, 'success');
  };

  // ── Üye Ekle ──────────────────────────────────────────
  const inviteMember = () => {
    if (!hasPerm('invite')) return showMsg('Bu işlem için yetkiniz yok', 'error');
    const uname = inviteUser.trim();
    if (!uname) return showMsg('Kullanıcı adı girin', 'error');
    if ((myFamily.members||[]).includes(uname)) return showMsg('Bu kişi zaten üye', 'error');
    saveFams(fams.map(f => f.id===myFamily.id ? {...f, members:[...(f.members||[]), uname]} : f));
    setInviteUser('');
    showMsg(`${uname} aileye eklendi ✓`, 'success');
  };

  // ── Üye Çıkar ─────────────────────────────────────────
  const kickMember = (uname) => {
    if (!hasPerm('kick')) return showMsg('Bu işlem için yetkiniz yok', 'error');
    if (uname===cu?.username) return showMsg('Kendinizi çıkaramazsınız', 'error');
    if (uname===myFamily.leader) return showMsg('Boss çıkarılamaz', 'error');
    saveFams(fams.map(f => f.id===myFamily.id ? {...f, members:(f.members||[]).filter(m=>m!==uname)} : f));
    showMsg(`${uname} aileden çıkarıldı`, 'info');
  };

  // ── Rütbe Değiştir ────────────────────────────────────
  const changeRank = (uname, newRank) => {
    if (!hasPerm('promote')) return showMsg('Bu işlem için yetkiniz yok', 'error');
    if (uname===cu?.username) return showMsg('Kendi rütbenizi değiştiremezsiniz', 'error');
    if (uname===myFamily.leader) return showMsg('Boss rütbesi değiştirilemez', 'error');
    saveFams(fams.map(f => f.id===myFamily.id ? {...f, ranks:{...(f.ranks||{}), [uname]:newRank}} : f));
    showMsg(`${uname} → ${RANKS.find(r=>r.id===newRank)?.label} ✓`, 'success');
  };

  // ── Halef Belirle ─────────────────────────────────────
  const setHeir = (uname) => {
    if (!isLeader) return showMsg('Sadece Boss halef belirleyebilir', 'error');
    if (uname===cu?.username) return showMsg('Kendinizi halef yapamassınız', 'error');
    saveFams(fams.map(f => f.id===myFamily.id ? {...f, successorName:uname} : f));
    showMsg(`${uname} halef (vasiyet) olarak belirlendi ✓`, 'success');
  };

  // ── Kasaya Para Yatır ─────────────────────────────────
  const deposit = () => {
    const amt = parseInt(depositAmt);
    if (!amt||amt<=0) return showMsg('Geçerli miktar girin', 'error');
    const profile = readProfile();
    if ((profile.money||0)<amt) return showMsg('Yetersiz bakiye', 'error');
    const np = {...profile, money:(profile.money||0)-amt};
    localStorage.setItem('rep_userProfile', JSON.stringify(np));
    saveFams(fams.map(f => f.id===myFamily.id ? {...f, treasury:(f.treasury||0)+amt} : f));
    setDepositAmt('');
    showMsg(`${fmt(amt)} kasaya yatırıldı ✓`, 'success');
  };

  // ── Kasadan Para Çek (Boss veya Kasa Yöneticisi) ──────
  const withdraw = () => {
    if (!isLeader && !hasPerm('treasury')) return showMsg('Sadece Boss veya Kasa Yöneticisi para çekebilir', 'error');
    const amt = parseInt(withdrawAmt);
    if (!amt||amt<=0) return showMsg('Geçerli miktar girin', 'error');
    if ((myFamily.treasury||0)<amt) return showMsg('Kasada yeterli para yok', 'error');
    const profile = readProfile();
    const np = {...profile, money:(profile.money||0)+amt};
    localStorage.setItem('rep_userProfile', JSON.stringify(np));
    saveFams(fams.map(f => f.id===myFamily.id ? {...f, treasury:(f.treasury||0)-amt} : f));
    setWithdrawAmt('');
    showMsg(`${fmt(amt)} kasadan çekildi ✓`, 'success');
  };

  // ── Aileyi Dağıt ──────────────────────────────────────
  const disbandFamily = () => {
    if (!isLeader) return;
    saveFams(fams.filter(f=>f.id!==myFamily.id));
    const profile = readProfile();
    localStorage.setItem('rep_userProfile', JSON.stringify({...profile, family:null}));
    setConfirmDisband(false);
    showMsg('Aile dağıtıldı', 'info');
  };

  // ── Sunucu fabrikaları yükle ─────────────────────────
  React.useEffect(()=>{
    if(!myFamily?.id) return;
    fetch(`/api/family-factory?familyId=${encodeURIComponent(myFamily.id)}`,
      {headers:{'Authorization':'Bearer '+getToken()}})
      .then(r=>r.json())
      .then(d=>{if(d.success)setServerFactories(d.factories||[]);})
      .catch(()=>{});
  },[myFamily?.id]);

  const fmtM = (n) => { if(!n&&n!==0)return '₺0'; if(n>=1e6)return '₺'+(n/1e6).toFixed(1)+'M'; if(n>=1e3)return '₺'+(n/1e3).toFixed(0)+'K'; return '₺'+Math.floor(n); };
  const COLLECT_24H = 24*3600*1000;

  // Fabrikalar (eski localStorage tabanlı — geriye uyumluluk için korunur)
  const allFactories    = (()=>{try{return JSON.parse(localStorage.getItem('us_empire_factories')||'[]');}catch{return [];}})();
  const familyFactories = allFactories.filter(f=>f.familyId===myFamily?.id);
  const ownedFree       = allFactories.filter(f=>f.ownerId===cu?.uid&&!f.familyId);

  const assignFactory = (fid) => {
    if (!hasPerm('factory')) return showMsg('Bu işlem için yetkiniz yok', 'error');
    const updated = allFactories.map(f=>f.id===fid?{...f,familyId:myFamily.id,familyName:myFamily.name}:f);
    localStorage.setItem('us_empire_factories', JSON.stringify(updated));
    showMsg('Fabrika aileye atandı ✓', 'success');
  };
  const unassignFactory = (fid) => {
    if (!hasPerm('factory')) return showMsg('Bu işlem için yetkiniz yok', 'error');
    const updated = allFactories.map(f=>f.id===fid?{...f,familyId:null,familyName:null}:f);
    localStorage.setItem('us_empire_factories', JSON.stringify(updated));
    showMsg('Fabrika aileden kaldırıldı', 'info');
  };

  // ── UI yardımcıları ───────────────────────────────────
  const card = {background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'1rem',marginBottom:'0.75rem'};
  const inp  = {background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,padding:'0.55rem 0.75rem',color:'#fff',fontSize:'0.85rem',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'};
  const MsgBar = () => msg ? <div style={{padding:'0.6rem 0.85rem',borderRadius:10,marginBottom:'0.75rem',background:msg.type==='success'?'rgba(16,185,129,0.12)':msg.type==='error'?'rgba(239,68,68,0.12)':'rgba(59,130,246,0.12)',border:`1px solid ${msg.type==='success'?'rgba(16,185,129,0.3)':msg.type==='error'?'rgba(239,68,68,0.3)':'rgba(59,130,246,0.3)'}`,color:msg.type==='success'?'#10B981':msg.type==='error'?'#EF4444':'#60A5FA',fontSize:'0.82rem',fontWeight:600}}>{msg.text}</div> : null;
  const TabBtn = ({id,lbl,icon}) => <button onClick={()=>setTab(id)} style={{flexShrink:0,padding:'0.42rem 0.85rem',borderRadius:20,border:'none',background:tab===id?'var(--accent)':'rgba(255,255,255,0.06)',color:tab===id?'#000':'#8899AA',fontSize:'0.78rem',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',fontFamily:'Syne,sans-serif',minHeight:36}}>{icon} {lbl}</button>;

  // ═══════════════════════════════════════════════════════
  // AİLE YOK — Oluşturma ekranı
  // ═══════════════════════════════════════════════════════
  if (!myFamily) return (
    <div>
      <div className="ministry-header">👨‍👩‍👧 Aile Merkezi</div>
      <MsgBar/>
      <div style={{...card,textAlign:'center',padding:'2rem'}}>
        <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>👨‍👩‍👧</div>
        <div style={{color:'#5E7390',fontSize:'0.85rem',marginBottom:'1.5rem'}}>
          Henüz bir aileye üye değilsiniz.<br/>Kendi ailenizi kurun ya da davet bekleyin.
        </div>
        <div style={{...card,background:'rgba(124,58,237,0.05)',textAlign:'left',marginBottom:'1rem'}}>
          <div className="card-title">Aile Sistemi Nedir?</div>
          <ul style={{fontSize:'0.8rem',color:'#8899AA',lineHeight:1.75,paddingLeft:'1.2rem',margin:0}}>
            <li>Aileler <b>LEGAL</b> organizasyondur — silah alımı ve suç faaliyeti yoktur</li>
            <li>Fabrika, holding, şirket kurabilir ve aile adına yönetebilirsiniz</li>
            <li>👑 Boss → ⚔️ Underboss → 🏛️ Yönetici → 👤 Üye hiyerarşisi</li>
            <li>Boss, siyasi partilere kasa üzerinden fon sağlayabilir</li>
            <li>Boss ayrılmadan önce halef (vasiyet) belirler</li>
          </ul>
        </div>
        <button className="btn btn-primary" style={{width:'100%',marginBottom:'0.5rem'}} onClick={()=>setCreateModal(true)}>
          + Aile Kur ({fmt(FAMILY_CREATE_COST)})
        </button>
        <div style={{fontSize:'0.72rem',color:'#5E7390'}}>Not: Çete üyeleri aile kuramaz</div>
      </div>

      {/* Diğer aileler */}
      <div style={card}>
        <div className="card-title">Mevcut Aileler ({fams.length})</div>
        {fams.length===0 && <div style={{textAlign:'center',color:'#5E7390',padding:'0.75rem',fontSize:'0.82rem'}}>Henüz aile yok.</div>}
        {fams.slice(0,8).map(f=>(
          <div key={f.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
            <div>
              <span style={{width:10,height:10,borderRadius:'50%',background:f.color||'#7C3AED',display:'inline-block',marginRight:6,verticalAlign:'middle'}}/>
              <span style={{fontWeight:700,color:'#ddd',fontSize:'0.88rem'}}>{f.name}</span>
              <span style={{marginLeft:8,fontSize:'0.7rem',color:'#5E7390'}}>Boss: {f.leader}</span>
            </div>
            <span style={{fontSize:'0.7rem',color:'#8899AA'}}>{(f.members||[]).length} üye</span>
          </div>
        ))}
      </div>

      {/* Kurma Modalı */}
      {createModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={e=>{if(e.target===e.currentTarget)setCreateModal(false)}}>
          <div style={{background:'#151C26',borderRadius:18,padding:'1.5rem',width:'100%',maxWidth:400,border:'1px solid rgba(255,255,255,0.1)'}}>
            <div style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:'1.1rem',marginBottom:'1rem',color:'#A78BFA'}}>👨‍👩‍👧 Yeni Aile Kur</div>
            <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
              <input style={inp} placeholder="Aile adı *" value={fForm.name} onChange={e=>setFForm(p=>({...p,name:e.target.value}))}/>
              <input style={inp} placeholder="Kısa açıklama" value={fForm.desc} onChange={e=>setFForm(p=>({...p,desc:e.target.value}))}/>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                <label style={{fontSize:'0.82rem',color:'#8899AA',flexShrink:0}}>Renk:</label>
                <input type="color" value={fForm.color} onChange={e=>setFForm(p=>({...p,color:e.target.value}))} style={{width:40,height:32,border:'none',background:'none',cursor:'pointer'}}/>
                <span style={{fontSize:'0.78rem',color:'#5E7390'}}>({fForm.color})</span>
              </div>
              <div style={{fontSize:'0.78rem',color:'#F59E0B',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:8,padding:'0.5rem 0.75rem'}}>
                💰 Kurulum ücreti: {fmt(FAMILY_CREATE_COST)}
              </div>
              <div style={{display:'flex',gap:'0.5rem',marginTop:'0.25rem'}}>
                <button className="btn btn-primary" style={{flex:1}} onClick={createFamily}>Kur</button>
                <button className="btn" style={{flex:1}} onClick={()=>setCreateModal(false)}>İptal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════
  // AİLE MEVCUT
  // ═══════════════════════════════════════════════════════
  const accentColor = myFamily.color||'#7C3AED';

  return (
    <div>
      <div className="ministry-header">👨‍👩‍👧 {myFamily.name} — Aile Merkezi</div>
      <MsgBar/>

      {/* Rütbe rozeti */}
      <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.75rem'}}>
        <span style={{background:`${myRank.color}22`,border:`1px solid ${myRank.color}55`,borderRadius:8,padding:'0.25rem 0.65rem',fontSize:'0.78rem',fontWeight:700,color:myRank.color}}>{myRank.label}</span>
        <span style={{fontSize:'0.72rem',color:'#5E7390'}}>{myFamily.name}</span>
      </div>

      {/* Tab navigasyon */}
      <div style={{display:'flex',gap:'0.4rem',overflowX:'auto',paddingBottom:'0.5rem',marginBottom:'0.75rem',scrollbarWidth:'none'}}>
        <TabBtn id="genel"    lbl="Genel"     icon="🏠"/>
        <TabBtn id="kasa"     lbl="Kasa"      icon="💰"/>
        <TabBtn id="fabrika"  lbl="Fabrikalar"icon="🏭"/>
        <TabBtn id="uyeler"   lbl="Üyeler"    icon="👥"/>
        <TabBtn id="rutbeler" lbl="Rütbeler"  icon="⚔️"/>
        <TabBtn id="harita"   lbl="Harita"    icon="🗺️"/>
        {isLeader && <TabBtn id="halef" lbl="Halef"    icon="👑"/>}
      </div>

      {/* ── GENEL ─────────────────────────────────────────── */}
      {tab==='genel' && (
        <div>
          <div style={{...card,background:`linear-gradient(135deg,${accentColor}12,rgba(0,0,0,0))`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem'}}>
              <div>
                <div style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:'1.15rem',color:accentColor}}>{myFamily.name}</div>
                <div style={{fontSize:'0.72rem',color:'#5E7390'}}>Boss: {myFamily.leader} · {myFamily.desc||'Legal aile organizasyonu'}</div>
              </div>
              <div style={{background:`${accentColor}22`,border:`1px solid ${accentColor}44`,borderRadius:8,padding:'0.35rem 0.65rem',textAlign:'center'}}>
                <div style={{fontWeight:900,color:accentColor,fontSize:'1rem'}}>{myFamily.influence||0}</div>
                <div style={{fontSize:'0.58rem',color:'#5E7390'}}>ETKİ</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.35rem'}}>
              {[
                {l:'Üyeler',   v:(myFamily.members||[]).length, c:'#60A5FA'},
                {l:'Kasa',     v:fmt(myFamily.treasury||0),     c:'#10B981'},
                {l:'Fabrika',  v:serverFactories.length||familyFactories.length, c:'#F59E0B'},
                {l:'Etki',     v:myFamily.influence||0,         c:'#A78BFA'},
              ].map(s=>(
                <div key={s.l} style={{background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'0.4rem',textAlign:'center'}}>
                  <div style={{fontWeight:700,fontSize:'0.85rem',color:s.c}}>{s.v}</div>
                  <div style={{fontSize:'0.57rem',color:'#5E7390'}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Halef bilgisi */}
          {myFamily.successorName && (
            <div style={{...card,background:'rgba(255,215,0,0.04)',border:'1px solid rgba(255,215,0,0.15)'}}>
              <div style={{fontSize:'0.82rem',color:'#FFD700'}}>👑 Vasiyet / Halef: <b>{myFamily.successorName}</b></div>
              <div style={{fontSize:'0.7rem',color:'#5E7390',marginTop:2}}>Boss ayrıldığında liderlik devralacak kişi</div>
            </div>
          )}

          <button className="btn" style={{width:'100%',marginBottom:'0.4rem',border:'1px solid rgba(239,68,68,0.3)',color:'#EF4444'}} onClick={()=>{if(isLeader)setConfirmDisband(true);else{const nf=fams.map(f=>f.id===myFamily.id?{...f,members:(f.members||[]).filter(m=>m!==cu?.username)}:f);saveFams(nf);const p=readProfile();localStorage.setItem('rep_userProfile',JSON.stringify({...p,family:null}));showMsg('Aileden ayrıldın','info');}}}>
            {isLeader ? '💀 Aileyi Dağıt' : '🚪 Aileden Ayrıl'}
          </button>

          {confirmDisband && (
            <div style={{...card,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.3)'}}>
              <div style={{fontSize:'0.85rem',fontWeight:700,color:'#EF4444',marginBottom:'0.5rem'}}>⚠️ Aileyi dağıtmak istediğinizden emin misiniz?</div>
              <div style={{display:'flex',gap:'0.5rem'}}>
                <button className="btn btn-red" style={{flex:1}} onClick={disbandFamily}>Evet, Dağıt</button>
                <button className="btn" style={{flex:1}} onClick={()=>setConfirmDisband(false)}>İptal</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KASA ──────────────────────────────────────────── */}
      {tab==='kasa' && (
        <div>
          {(()=>{
            const kasaci = (myFamily.members||[]).find(m=>(myFamily.ranks||{})[m]==='kasaci');
            const canWithdraw = isLeader || hasPerm('treasury');
            return (
              <>
                {/* Kasa Yöneticisi Kimliği */}
                <div style={{...card,background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.15)'}}>
                  <div style={{textAlign:'center',marginBottom:'0.75rem'}}>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:900,fontSize:'1.6rem',color:'#10B981'}}>{fmt(myFamily.treasury||0)}</div>
                    <div style={{fontSize:'0.7rem',color:'#5E7390'}}>Aile Kasası</div>
                    {kasaci && (
                      <div style={{marginTop:'0.4rem',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:8,padding:'0.3rem 0.6rem',display:'inline-block'}}>
                        <span style={{fontSize:'0.68rem',color:'#10B981',fontWeight:700}}>💰 Kasa Yöneticisi: {kasaci}</span>
                      </div>
                    )}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                    <div>
                      <div style={{fontSize:'0.72rem',color:'#8899AA',marginBottom:'0.25rem'}}>Yatır (Tüm Üyeler)</div>
                      <div style={{display:'flex',gap:'0.35rem'}}>
                        <input style={{...inp,padding:'0.45rem 0.55rem'}} type="number" placeholder="₺" value={depositAmt} onChange={e=>setDepositAmt(e.target.value)}/>
                        <button className="btn btn-primary" style={{flexShrink:0,padding:'0.45rem 0.65rem',fontSize:'0.8rem'}} onClick={deposit}>↑</button>
                      </div>
                    </div>
                    {canWithdraw && (
                      <div>
                        <div style={{fontSize:'0.72rem',color:'#8899AA',marginBottom:'0.25rem'}}>
                          Çek {isLeader?'(Boss)':'(Kasa Yön.)'}
                        </div>
                        <div style={{display:'flex',gap:'0.35rem'}}>
                          <input style={{...inp,padding:'0.45rem 0.55rem'}} type="number" placeholder="₺" value={withdrawAmt} onChange={e=>setWithdrawAmt(e.target.value)}/>
                          <button className="btn btn-red" style={{flexShrink:0,padding:'0.45rem 0.65rem',fontSize:'0.8rem'}} onClick={withdraw}>↓</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Boss — Kasa Yöneticisi Ata */}
                {isLeader && (
                  <div style={card}>
                    <div className="card-title">💰 Kasa Yöneticisi Ata</div>
                    <div style={{fontSize:'0.75rem',color:'#8899AA',marginBottom:'0.6rem',lineHeight:1.5}}>
                      Kasa Yöneticisi kasadan para çekip yatırabilir; diğer üyeler sadece yatırabilir.
                      {kasaci&&<span style={{color:'#EF4444'}}> Mevcut: <b>{kasaci}</b></span>}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                      {(myFamily.members||[]).filter(m=>m!==myFamily.leader).map(m=>{
                        const mRank = getMemberRank(m);
                        const isKasaci = mRank.id==='kasaci';
                        return (
                          <div key={m} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.4rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                            <div>
                              <span style={{fontWeight:600,color:'#E8EDF2',fontSize:'0.85rem'}}>{m}</span>
                              <span style={{marginLeft:6,background:`${mRank.color}22`,border:`1px solid ${mRank.color}44`,borderRadius:4,padding:'0.05rem 0.3rem',fontSize:'0.58rem',fontWeight:700,color:mRank.color}}>{mRank.label}</span>
                            </div>
                            {isKasaci
                              ? <button className="btn btn-red" style={{fontSize:'0.68rem',padding:'0.25rem 0.5rem'}} onClick={()=>changeRank(m,'uye')}>Görevden Al</button>
                              : <button className="btn btn-primary" style={{fontSize:'0.68rem',padding:'0.25rem 0.5rem'}} onClick={()=>changeRank(m,'kasaci')}>Ata</button>
                            }
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={card}>
                  <div className="card-title">💡 Kasa Kullanımı</div>
                  <ul style={{fontSize:'0.8rem',color:'#8899AA',lineHeight:1.75,paddingLeft:'1.2rem',margin:0}}>
                    <li>Tüm üyeler kasaya para <b>yatırabilir</b></li>
                    <li><b>Boss</b> ve <b>Kasa Yöneticisi</b> para çekebilir</li>
                    <li>Boss, herhangi bir üyeyi Kasa Yöneticisi olarak atayabilir</li>
                    <li>Kasa, siyasi parti fonlamasında kullanılabilir</li>
                    <li>Fabrika gelirleri <b>"Fabrikalar"</b> sekmesinden kasaya aktarılır</li>
                  </ul>
                </div>
              </>
            );
          })()}

          {/* ── Fabrika Gelirleri Özeti ──────────────────── */}
          {serverFactories.length>0&&(
            <div style={{...card,background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.15)'}}>
              <div className="card-title">🏭 Fabrika Geliri</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
                <div style={{fontSize:'0.78rem',color:'#8899AA'}}>Toplam Aylık</div>
                <div style={{fontWeight:700,color:'#F59E0B',fontFamily:'JetBrains Mono,monospace'}}>{fmtM(serverFactories.reduce((a,f)=>a+(f.monthlyIncome||0),0))}</div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
                <div style={{fontSize:'0.78rem',color:'#8899AA'}}>Toplanabilir Fabrika</div>
                <div style={{fontWeight:700,color:'#10B981'}}>
                  {serverFactories.filter(f=>f.canCollect||Number(f.lastCollectedAt)===0).length}/{serverFactories.length}
                </div>
              </div>
              <button className="btn btn-primary" style={{width:'100%',fontSize:'0.8rem'}} onClick={()=>setTab('fabrika')}>
                🏭 Fabrikaları Yönet / Gelir Topla
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── FABRİKALAR — sunucu tabanlı ─────────────────── */}
      {tab==='fabrika' && (
        <div>
          {/* Sunucu fabrikaları (anti-cheat: gelir toplaması server doğrulayır) */}
          {serverFactories.length>0 ? (
            <div>
              <div style={{...card,background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.2)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:'0.68rem',color:'#5E7390',textTransform:'uppercase',letterSpacing:'0.06em'}}>Toplam Aylık Fabrika Geliri</div>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:900,fontSize:'1.2rem',color:'#F59E0B'}}>{fmtM(serverFactories.reduce((a,f)=>a+(f.monthlyIncome||0),0))}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'0.62rem',color:'#5E7390'}}>Günlük</div>
                    <div style={{fontSize:'0.85rem',fontWeight:700,color:'#10B981'}}>{fmtM(serverFactories.reduce((a,f)=>a+Math.floor((f.monthlyIncome||0)/30),0))}</div>
                  </div>
                </div>
              </div>
              {serverFactories.map(f=>{
                const canColl = f.canCollect || Number(f.lastCollectedAt)===0;
                const nextAt  = f.nextCollectAt || (Number(f.lastCollectedAt)||0)+COLLECT_24H;
                const rem     = Math.max(0, nextAt - Date.now());
                const h = Math.floor(rem/3600000), m = Math.floor((rem%3600000)/60000);
                return (
                  <div key={f.id} style={{...card,borderLeft:'3px solid #F59E0B'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.4rem'}}>
                      <div>
                        <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.88rem'}}>🏭 {f.name}</div>
                        <div style={{fontSize:'0.68rem',color:'#5E7390'}}>{f.factoryType}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0,marginLeft:'0.5rem'}}>
                        <div style={{fontSize:'0.72rem',fontWeight:700,color:'#10B981'}}>{fmtM(f.monthlyIncome)}/ay</div>
                        <div style={{fontSize:'0.62rem',color:'#F59E0B'}}>{fmtM(Math.floor((f.monthlyIncome||0)/30))}/gün</div>
                      </div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{fontSize:'0.68rem',color:canColl?'#10B981':'#5E7390'}}>
                        {canColl?'✅ Toplanabilir':`⏳ ${h>0?h+'sa ':''}${m}dk sonra`}
                      </div>
                      <button className="btn btn-primary" disabled={!canColl}
                        style={{fontSize:'0.72rem',padding:'0.3rem 0.7rem',opacity:canColl?1:0.45}}
                        onClick={()=>setCurrentPage('economic_empire')}>
                        {canColl?'💰 Topla (İmparatorluk)':'⏳ Bekle'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ):(
            <div style={{...card,textAlign:'center',padding:'2rem'}}>
              <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>🏭</div>
              <div style={{color:'#5E7390',fontSize:'0.82rem',marginBottom:'0.75rem'}}>Henüz aile fabrikası yok. Ekonomik İmparatorluk ekranından fabrika kurabilirsiniz.</div>
              <button className="btn btn-primary" onClick={()=>setCurrentPage('economic_empire')}>🏢 Ekonomik İmparatorluk</button>
            </div>
          )}
        </div>
      )}

      {/* ── ÜYELER ────────────────────────────────────────── */}
      {tab==='uyeler' && (
        <div>
          {hasPerm('invite') && (
            <div style={card}>
              <div className="card-title">+ Üye Ekle</div>
              <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}>
                <input style={inp} placeholder="Kullanıcı adı" value={inviteUser} onChange={e=>setInviteUser(e.target.value)}/>
                <button className="btn btn-primary" style={{flexShrink:0,padding:'0.5rem 0.85rem'}} onClick={inviteMember}>Ekle</button>
              </div>
            </div>
          )}
          <div style={card}>
            <div className="card-title">👥 Üyeler ({(myFamily.members||[]).length})</div>
            {(myFamily.members||[]).map((uname,i)=>{
              const rank = getMemberRank(uname);
              return (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <div>
                    <span style={{fontWeight:700,color:'#ddd',fontSize:'0.85rem'}}>{uname}</span>
                    <span style={{marginLeft:6,background:`${rank.color}22`,border:`1px solid ${rank.color}44`,borderRadius:4,padding:'0.08rem 0.35rem',fontSize:'0.62rem',fontWeight:700,color:rank.color}}>{rank.label}</span>
                    {uname===myFamily.successorName && <span style={{marginLeft:4,fontSize:'0.6rem',color:'#FFD700'}}>HALEF</span>}
                  </div>
                  {hasPerm('kick') && uname!==cu?.username && uname!==myFamily.leader && (
                    <button className="btn btn-red" style={{fontSize:'0.68rem',padding:'0.25rem 0.5rem'}} onClick={()=>kickMember(uname)}>Çıkar</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── RÜTBELER ──────────────────────────────────────── */}
      {tab==='rutbeler' && (
        <div>
          <div style={card}>
            <div className="card-title">⚔️ Rütbe Sistemi</div>
            {RANKS.map(r=>(
              <div key={r.id} style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',padding:'0.6rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <span style={{background:`${r.color}22`,border:`1px solid ${r.color}44`,borderRadius:6,padding:'0.2rem 0.55rem',fontSize:'0.75rem',fontWeight:700,color:r.color,flexShrink:0,minWidth:90,textAlign:'center'}}>{r.label}</span>
                <div style={{fontSize:'0.75rem',color:'#8899AA'}}>
                  {r.id==='boss'      && 'Tüm yetkiler: üye ekle/çıkar, rütbe ver, fabrika yönet, kasadan para çek, halef belirle'}
                  {r.id==='underboss' && 'Üye ekle, fabrika yönet, kasaya para yatır'}
                  {r.id==='yonetici' && 'Fabrika yönetimi'}
                  {r.id==='uye'       && 'Kasaya para yatır, bilgi görüntüle'}
                </div>
              </div>
            ))}
          </div>

          {hasPerm('promote') && (
            <div style={card}>
              <div className="card-title">Rütbe Değiştir</div>
              {(myFamily.members||[]).filter(m=>m!==myFamily.leader&&m!==cu?.username).map((uname,i)=>{
                const cr = getMemberRank(uname);
                return (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.45rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <div>
                      <span style={{fontWeight:700,color:'#ddd',fontSize:'0.82rem'}}>{uname}</span>
                      <span style={{marginLeft:6,fontSize:'0.65rem',color:cr.color}}>{cr.label}</span>
                    </div>
                    <select onChange={e=>changeRank(uname,e.target.value)} value={cr.id} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,padding:'0.3rem 0.5rem',color:'#fff',fontSize:'0.75rem',fontFamily:'inherit',outline:'none'}}>
                      {RANKS.filter(r=>r.id!=='boss').map(r=><option key={r.id} value={r.id} style={{background:'#111'}}>{r.label}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── HARİTA ─────────────────────────────────────────── */}
      {tab==='harita' && (
        <div>
          {window.TurkeyMapScreen ? (
            React.createElement(window.TurkeyMapScreen, {
              profile: cu,
              gangs: [],
              families: JSON.parse(localStorage.getItem('rep_families')||'[]'),
              showNotif,
              mode: 'family',
            })
          ) : (
            <div style={{textAlign:'center',color:'#5E7390',padding:'2rem'}}>Harita yükleniyor…</div>
          )}
        </div>
      )}

      {/* ── HALEF ─────────────────────────────────────────── */}
      {tab==='halef' && isLeader && (
        <div>
          <div style={{...card,background:'rgba(255,215,0,0.04)',border:'1px solid rgba(255,215,0,0.15)'}}>
            <div className="card-title" style={{color:'#FFD700'}}>👑 Halef / Vasiyet Sistemi</div>
            <div style={{fontSize:'0.8rem',color:'#8899AA',marginBottom:'1rem',lineHeight:1.65}}>
              Boss olarak ayrılmak istediğinizde liderliği devralacak kişiyi şimdi belirleyin.
              Halef belirlenmeden ayrılırsanız aile dağılabilir.
            </div>
            {myFamily.successorName ? (
              <div style={{...card,background:'rgba(255,215,0,0.06)',margin:'0 0 0.75rem 0'}}>
                <div style={{fontWeight:700,color:'#FFD700'}}>Mevcut Halef: {myFamily.successorName}</div>
                <button className="btn btn-red" style={{width:'100%',marginTop:'0.5rem',fontSize:'0.8rem'}} onClick={()=>saveFams(fams.map(f=>f.id===myFamily.id?{...f,successorName:null}:f))}>Halefliği İptal Et</button>
              </div>
            ) : (
              <div style={{color:'#5E7390',fontSize:'0.82rem',marginBottom:'0.75rem'}}>Henüz halef belirlenmedi.</div>
            )}
            <div className="card-title" style={{marginBottom:'0.5rem'}}>Üyeden Halef Seç:</div>
            {(myFamily.members||[]).filter(m=>m!==cu?.username).map((uname,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.45rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <span style={{fontWeight:700,color:'#ddd',fontSize:'0.85rem'}}>{uname}</span>
                <button className={`btn ${myFamily.successorName===uname?'btn-primary':''}`} style={{fontSize:'0.75rem',padding:'0.3rem 0.65rem',border:'1px solid rgba(255,215,0,0.3)',color:'#FFD700'}} onClick={()=>setHeir(uname)}>
                  {myFamily.successorName===uname ? '✓ Halef' : 'Halef Yap'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
