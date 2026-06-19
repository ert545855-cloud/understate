
// ═══════════════════════════════════════════════════════
// UNDERSTATE — Parti Merkezi Ekranı
// ═══════════════════════════════════════════════════════
window.PartyCenterScreen = function PartyCenterScreen({ cu, parties, allUsers, families, setCurrentPage }) {
  const S = {
    load: (k, def) => { try { const v = localStorage.getItem("us_prtctr_"+k); return v ? JSON.parse(v) : def; } catch { return def; } },
    save: (k, v)   => { try { localStorage.setItem("us_prtctr_"+k, JSON.stringify(v)); } catch {} },
  };

  const [tab, setTab]       = React.useState("overview");
  const [proposals, setProposals] = React.useState(()=>S.load("proposals",[]));
  const [newProp, setNewProp]     = React.useState({title:"",description:"",type:"economy"});
  const [sponsors, setSponsors]   = React.useState(()=>S.load("sponsors",{}));
  const [msg, setMsg]             = React.useState(null);
  const [cabinet, setCabinet]     = React.useState(()=>S.load("cabinet",{}));
  const [kampCooldowns, setKampCooldowns] = React.useState(()=>S.load("kampCooldowns",{}));
  const [paySource, setPaySource]         = React.useState("treasury");
  // Parti içi rütbe sistemi: { [partyId]: { [username]: rankId } }
  const [partyRanks, setPartyRanks]       = React.useState(()=>S.load("partyRanks",{}));

  const showMsg = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000); };

  const meclisBroadcast = (icon, title, by, party) => {
    if (window._socket) {
      window._socket.emit('gameEvent', {
        type: 'meclisBanner',
        payload: { icon, title, by: by || (cu && cu.username) || '?', party: party || (myParty && myParty.name) || 'Meclis' }
      });
    }
  };

  const fmtMoney = (n) => { if(!n)return "₺0"; if(n>=1e9)return "₺"+(n/1e9).toFixed(1)+"Mlr"; if(n>=1e6)return "₺"+(n/1e6).toFixed(1)+"M"; if(n>=1e3)return "₺"+(n/1e3).toFixed(0)+"K"; return "₺"+n; };

  // ── Parti Hiyerarşisi (6 kademe) ─────────────────────────────────────────────
  const PARTY_RANKS = [
    { id:'genel_baskan',   label:'⭐ Genel Başkan',       color:'#FFD700', icon:'⭐', maxCount:1,  desc:'Parti kurucusu ve genel yöneticisi. Tüm kararlar burada biter.',      canBeCampaign:true },
    { id:'baskan_yrd',     label:'🏅 Başkan Yardımcısı', color:'#F97316', icon:'🏅', maxCount:2,  desc:'Genel başkanın vekili; kampanya ve yasal süreçleri yönetir.',          canBeCampaign:true },
    { id:'sozcu',          label:'🎙️ Parti Sözcüsü',     color:'#60A5FA', icon:'🎙️', maxCount:1,  desc:'Resmi basın açıklamaları ve medya koordinasyonundan sorumlu.',         canBeCampaign:false},
    { id:'il_baskani',     label:'🌆 İl Başkanı',         color:'#A78BFA', icon:'🌆', maxCount:8,  desc:'Bölgesel örgütlenme ve seçim çalışmalarını yürütür.',                 canBeCampaign:true },
    { id:'milletvekili',   label:'🏛️ Milletvekili',       color:'#10B981', icon:'🏛️', maxCount:30, desc:'Meclis oturumlarında partiyi temsil eder; yasa oylamalarına katılır.', canBeCampaign:false},
    { id:'uye',            label:'👤 Üye',                color:'#5E7390', icon:'👤', maxCount:999,desc:'Genel parti üyesi.',                                                   canBeCampaign:false},
  ];

  const getPartyRank = (username) => {
    if(username===myParty?.leader) return PARTY_RANKS[0];
    const rid = (partyRanks[myParty?.id]||{})[username] || 'uye';
    return PARTY_RANKS.find(r=>r.id===rid) || PARTY_RANKS[PARTY_RANKS.length-1];
  };

  const assignPartyRank = (username, rankId) => {
    if(!isLeader) return showMsg("Sadece Genel Başkan rütbe atayabilir","error");
    if(username===myParty?.leader) return showMsg("Lider rütbesi değiştirilemez","error");
    const rankDef = PARTY_RANKS.find(r=>r.id===rankId);
    if(!rankDef) return showMsg("Geçersiz rütbe","error");
    // Maksimum kişi sayısı kontrolü
    if(rankDef.maxCount<999) {
      const currentHolders = (myParty?.members||[]).filter(m=>m!==username&&getPartyRank(m).id===rankId);
      if(currentHolders.length>=rankDef.maxCount)
        return showMsg(`Bu pozisyon için maksimum ${rankDef.maxCount} kişi atanabilir (mevcut: ${currentHolders.join(', ')})`, "error");
    }
    const updated = {...partyRanks, [myParty.id]:{...(partyRanks[myParty.id]||{}),[username]:rankId}};
    setPartyRanks(updated);
    S.save("partyRanks",updated);
    meclisBroadcast(rankDef.icon, `${username} → ${rankDef.label} atandı`, cu?.username, myParty?.name);
    showMsg(`${username} → ${rankDef.label} ✓`,"success");
  };

  const partyArr = Array.isArray(parties)?parties:[];
  const fams = Array.isArray(families)?families:[];
  // Üyelik kontrolü: members dizisi userId (uid/id) içerir
  const cuId = cu?.uid || cu?.id;
  const myParty = partyArr.find(p => {
    const isLeaderByUsername = p.leader === cu?.username;
    const isLeaderById       = p.leaderId === cuId;
    const isMemberById       = Array.isArray(p.members) && cuId && p.members.includes(cuId);
    const isMemberByUsername = Array.isArray(p.members) && p.members.includes(cu?.username);
    return isLeaderByUsername || isLeaderById || isMemberById || isMemberByUsername;
  });
  const isLeader = myParty?.leader === cu?.username || myParty?.leaderId === cuId;

  const LAW_TYPES = [
    {id:"economy",   label:"Ekonomi Yasası",   icon:"💰",color:"#10B981"},
    {id:"security",  label:"Güvenlik Yasası",  icon:"🛡️",color:"#60A5FA"},
    {id:"labor",     label:"İş Yasası",        icon:"🏭",color:"#F59E0B"},
    {id:"tax",       label:"Vergi Düzenlemesi",icon:"📋",color:"#A78BFA"},
    {id:"education", label:"Eğitim Yasası",    icon:"📚",color:"#34D399"},
  ];

  const CABINET_POSITIONS = [
    "Ekonomi Bakanı","Sanayi Müdürü","İçişleri Bakanı","Maliye Bakanı","Adalet Bakanı","Sağlık Bakanı"
  ];

  const submitProposal = () => {
    if(!isLeader) return showMsg("Sadece parti liderleri yasa teklif edebilir","error");
    if(!newProp.title.trim()) return showMsg("Başlık zorunlu","error");
    const prop = {
      id:"prop_"+Date.now(),
      title:newProp.title.trim(),
      description:newProp.description.trim(),
      type:newProp.type,
      proposer:cu.username,
      party:myParty.name,
      status:"pending",
      votes:{for:[],against:[]},
      createdAt:Date.now(),
    };
    const updated = [prop,...proposals];
    setProposals(updated); S.save("proposals",updated);
    setNewProp({title:"",description:"",type:"economy"});
    meclisBroadcast("📜", "Yasa Teklifi: " + prop.title, prop.proposer, myParty.name);
    showMsg("Yasa teklifi sunuldu! ✓","success");
  };

  const voteProposal = (id, vote) => {
    const updated = proposals.map(p => {
      if(p.id!==id||p.status!=="pending") return p;
      const forV   = (p.votes.for||[]).filter(v=>v!==cu.username);
      const againV = (p.votes.against||[]).filter(v=>v!==cu.username);
      if(vote==="for") forV.push(cu.username);
      else againV.push(cu.username);
      const total = (forV.length+againV.length);
      const status = forV.length>2?"passed":againV.length>2?"rejected":"pending";
      return {...p,votes:{for:forV,against:againV},status};
    });
    setProposals(updated); S.save("proposals",updated);
    // Broadcast when a proposal is decided
    const decided = updated.find(p => p.id === id && (p.status === "passed" || p.status === "rejected"));
    if (decided) {
      const icon = decided.status === "passed" ? "✅" : "❌";
      const label = decided.status === "passed" ? "KABUL EDİLDİ" : "REDDEDİLDİ";
      meclisBroadcast(icon, decided.title + " — " + label, cu.username, myParty && myParty.name);
    }
    showMsg("Oyunuz kaydedildi! ✓","success");
  };

  const addSponsor = () => {
    if(!isLeader) return showMsg("Sadece lider fon anlaşması yapabilir","error");
    const familyName = prompt("Fon sağlayacak aile adı:");
    if(!familyName) return;
    const amount = parseInt(prompt("Fon miktarı (₺):"));
    if(!amount||isNaN(amount)) return showMsg("Geçerli miktar girin","error");
    const s = {...sponsors,[myParty.id]:[...(sponsors[myParty.id]||[]),{familyName,amount,date:Date.now()}]};
    setSponsors(s); S.save("sponsors",s);
    showMsg(`${familyName} sponsorluğu eklendi! ✓`,"success");
  };

  const assignCabinet = (position, username) => {
    if(!isLeader) return showMsg("Sadece lider atama yapabilir","error");
    const c = {...cabinet,[myParty?.id]:{...(cabinet[myParty?.id]||{}),[position]:username}};
    setCabinet(c); S.save("cabinet",c);
    meclisBroadcast("🏅", username + " → " + position + " atandı", cu.username, myParty && myParty.name);
    showMsg(`${username} → ${position} atandı ✓`,"success");
  };

  const card = {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"1rem",marginBottom:"0.75rem"};
  const tabBtn = (id,lbl,icon) => (
    <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"0.42rem 0.85rem",borderRadius:20,border:"none",background:tab===id?"var(--accent)":"rgba(255,255,255,0.06)",color:tab===id?"#000":"#8899AA",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Syne,sans-serif",minHeight:36}}>{icon} {lbl}</button>
  );

  if(!myParty) return (
    <div>
      <div className="ministry-header">🏛️ Parti Merkezi</div>
      <div style={{...card,textAlign:"center",padding:"2.5rem 1.5rem"}}>
        <div style={{fontSize:"2.5rem",marginBottom:"0.75rem"}}>🏛️</div>
        <div style={{fontWeight:800,color:"#E8EDF2",fontSize:"0.95rem",marginBottom:"0.4rem"}}>Şu an bir partiye üye değilsiniz</div>
        <div style={{color:"#5E7390",fontSize:"0.8rem",marginBottom:"1.25rem",lineHeight:1.5}}>
          Parti merkezini kullanabilmek için önce bir partiye katılın veya kendi partinizi kurun.
        </div>
        <button className="btn btn-primary" style={{width:"100%",maxWidth:"260px"}} onClick={()=>setCurrentPage("politics")}>⚑ Parti Sistemine Git</button>
      </div>
    </div>
  );

  const mySponsors = sponsors[myParty.id]||[];
  const myCabinet  = cabinet[myParty.id]||{};
  const totalFunds = mySponsors.reduce((a,s)=>a+s.amount,0);

  return (
    <div>
      <div className="ministry-header">🏛️ {myParty.name} — Parti Merkezi</div>
      {msg&&(
        <div style={{padding:"0.6rem 0.85rem",borderRadius:10,marginBottom:"0.75rem",background:msg.type==="success"?"rgba(16,185,129,0.12)":msg.type==="error"?"rgba(239,68,68,0.12)":"rgba(59,130,246,0.12)",border:`1px solid ${msg.type==="success"?"rgba(16,185,129,0.3)":msg.type==="error"?"rgba(239,68,68,0.3)":"rgba(59,130,246,0.3)"}`,color:msg.type==="success"?"#10B981":msg.type==="error"?"#EF4444":"#60A5FA",fontSize:"0.82rem",fontWeight:600}}>
          {msg.text}
        </div>
      )}
      <div style={{display:"flex",gap:"0.4rem",overflowX:"auto",paddingBottom:"0.5rem",marginBottom:"0.75rem",scrollbarWidth:"none"}}>
        {tabBtn("overview","Genel","🏛️")}
        {tabBtn("yonetim","Yönetim","⚙️")}
        {tabBtn("kabine","Kabine","🏛️")}
        {tabBtn("kampanya","Kampanya","📣")}
        {tabBtn("laws","Yasalar","📜")}
        {tabBtn("sponsors","Sponsorlar","💰")}
        {tabBtn("members","Üyeler","👥")}
      </div>

      {/* ── YÖNETİM HİYERARŞİSİ ─────────────────────────── */}
      {tab==="yonetim"&&(
        <div>
          {/* Org chart — 6 kademeli görsel hiyerarşi */}
          <div style={{...card,background:"linear-gradient(135deg,rgba(167,139,250,0.07),rgba(0,0,0,0))"}}>
            <div className="card-title">🏛️ Parti Teşkilat Yapısı</div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.3rem",marginTop:"0.5rem"}}>
              {PARTY_RANKS.map((r,i)=>{
                const holders=(myParty?.members||[]).filter(m=>getPartyRank(m).id===r.id);
                const isTop=i===0;
                const indent=Math.min(i,4)*8;
                return (
                  <div key={r.id} style={{
                    marginLeft:indent,
                    background:`${r.color}0D`,
                    border:`1px solid ${r.color}33`,
                    borderRadius:10,
                    padding:"0.55rem 0.75rem",
                    position:"relative",
                  }}>
                    {i>0&&<div style={{position:"absolute",left:-8,top:"50%",width:8,height:1,background:`${r.color}55`}}/>}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"0.5rem"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:"0.35rem",marginBottom:"0.15rem"}}>
                          <span style={{background:`${r.color}22`,border:`1px solid ${r.color}44`,borderRadius:6,padding:"0.1rem 0.45rem",fontSize:"0.68rem",fontWeight:800,color:r.color}}>{r.label}</span>
                          <span style={{fontSize:"0.6rem",color:"#5E7390"}}>max {r.maxCount===999?"∞":r.maxCount} kişi</span>
                        </div>
                        <div style={{fontSize:"0.68rem",color:"#5E7390",lineHeight:1.4}}>{r.desc}</div>
                        {holders.length>0&&(
                          <div style={{marginTop:"0.25rem",display:"flex",flexWrap:"wrap",gap:"0.25rem"}}>
                            {holders.map(h=>(
                              <span key={h} style={{background:"rgba(255,255,255,0.07)",borderRadius:5,padding:"0.05rem 0.35rem",fontSize:"0.67rem",color:"#E8EDF2",fontWeight:600}}>{h}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:"0.75rem",fontWeight:700,color:r.color}}>{holders.length}</div>
                        <div style={{fontSize:"0.55rem",color:"#5E7390"}}>kişi</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rütbe Atama — sadece Genel Başkan */}
          {isLeader&&(
            <div style={card}>
              <div className="card-title">⚙️ Rütbe Ata</div>
              <div style={{fontSize:"0.75rem",color:"#8899AA",marginBottom:"0.75rem"}}>Üyeye bir pozisyon atayın. Maksimum sayı aşılamaz.</div>
              {(myParty?.members||[]).filter(m=>m!==myParty?.leader).length===0
                ? <div style={{textAlign:"center",color:"#5E7390",fontSize:"0.82rem",padding:"0.75rem"}}>Atanacak üye yok.</div>
                : (myParty?.members||[]).filter(m=>m!==myParty?.leader).map(m=>{
                  const r=getPartyRank(m);
                  return (
                    <div key={m} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <div>
                        <span style={{fontWeight:700,color:"#E8EDF2",fontSize:"0.85rem"}}>{m}</span>
                        <span style={{marginLeft:6,background:`${r.color}22`,border:`1px solid ${r.color}44`,borderRadius:4,padding:"0.05rem 0.3rem",fontSize:"0.6rem",fontWeight:700,color:r.color}}>{r.label}</span>
                      </div>
                      <select
                        value={r.id}
                        onChange={e=>assignPartyRank(m,e.target.value)}
                        style={{background:"rgba(255,255,255,0.05)",color:"#E8EDF2",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"0.3rem 0.5rem",fontSize:"0.72rem",fontFamily:"inherit",cursor:"pointer"}}
                      >
                        {PARTY_RANKS.filter(pr=>pr.id!=="genel_baskan").map(pr=>(
                          <option key={pr.id} value={pr.id} style={{background:"#111"}}>{pr.icon} {pr.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })
              }
            </div>
          )}

        </div>
      )}

      {/* ── KABİNE ───────────────────────────────────────── */}
      {tab==="kabine"&&(
        <div>
          {/* Kabine özeti */}
          <div style={{...card,background:"linear-gradient(135deg,rgba(245,158,11,0.06),rgba(0,0,0,0))"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem"}}>
              <div>
                <div style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"0.9rem",color:"#F59E0B"}}>🏛️ Hükümet Kabinesi</div>
                <div style={{fontSize:"0.7rem",color:"#5E7390",marginTop:"0.15rem"}}>Seçimi kazanan parti kabine pozisyonlarını doldurur</div>
              </div>
              <div style={{background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:8,padding:"0.35rem 0.65rem",textAlign:"center"}}>
                <div style={{fontWeight:900,color:"#F59E0B",fontSize:"0.95rem"}}>{Object.keys(myCabinet).length}</div>
                <div style={{fontSize:"0.55rem",color:"#5E7390"}}>ATANMIŞ</div>
              </div>
            </div>
          </div>

          {/* Bakanlık pozisyonları */}
          {(()=>{
            const FULL_CABINET = [
              {pos:"Başbakan",           icon:"⭐", color:"#FFD700", note:"Kabineyi yönetir, hükümet sözcüsü"},
              {pos:"Ekonomi Bakanı",     icon:"💰", color:"#10B981", note:"Ekonomi politikası ve bütçe"},
              {pos:"İçişleri Bakanı",    icon:"🛡️", color:"#60A5FA", note:"Güvenlik ve kolluk kuvvetleri"},
              {pos:"Adalet Bakanı",      icon:"⚖️", color:"#A78BFA", note:"Yargı ve hukuk işlemleri"},
              {pos:"Maliye Bakanı",      icon:"📊", color:"#F59E0B", note:"Vergiler ve mali kontrol"},
              {pos:"Sanayi Müdürü",      icon:"🏭", color:"#F97316", note:"Sanayi ve üretim sektörü"},
              {pos:"Sağlık Bakanı",      icon:"🏥", color:"#34D399", note:"Halk sağlığı hizmetleri"},
              {pos:"Eğitim Bakanı",      icon:"📚", color:"#818CF8", note:"Eğitim politikası"},
              {pos:"Dışişleri Bakanı",   icon:"🌍", color:"#22D3EE", note:"Dış ilişkiler ve ittifaklar"},
              {pos:"Savunma Bakanı",     icon:"🎖️", color:"#EF4444", note:"Ordu ve savunma sistemi"},
            ];
            return (
              <div style={card}>
                <div className="card-title">🏅 Bakanlık Pozisyonları</div>
                {FULL_CABINET.map(({pos,icon,color,note})=>{
                  const assignedUser = Object.entries(myCabinet).find(([,v])=>v===pos)?.[0];
                  return (
                    <div key={pos} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.55rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
                          <span style={{background:`${color}18`,border:`1px solid ${color}33`,borderRadius:6,padding:"0.2rem 0.4rem",fontSize:"0.75rem"}}>{icon}</span>
                          <div>
                            <div style={{fontSize:"0.82rem",fontWeight:700,color:"#E8EDF2"}}>{pos}</div>
                            <div style={{fontSize:"0.62rem",color:"#5E7390"}}>{note}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"0.4rem",flexShrink:0}}>
                        {assignedUser
                          ? <span style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:6,padding:"0.2rem 0.5rem",fontSize:"0.72rem",fontWeight:700,color:"#10B981"}}>👤 {assignedUser}</span>
                          : <span style={{fontSize:"0.68rem",color:"#5E7390",fontStyle:"italic"}}>Atanmadı</span>
                        }
                        {isLeader&&(
                          <button className="btn" style={{fontSize:"0.65rem",padding:"0.2rem 0.45rem",border:"1px solid rgba(167,139,250,0.3)",color:"#A78BFA"}}
                            onClick={()=>{const u=prompt(`"${pos}" için kullanıcı adı:`);if(u)assignCabinet(pos,u);}}>
                            {assignedUser?"Değiştir":"Ata"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Kabine kural bilgisi */}
          <div style={card}>
            <div className="card-title">💡 Kabine Hakkında</div>
            <ul style={{fontSize:"0.8rem",color:"#8899AA",lineHeight:1.75,paddingLeft:"1.2rem",margin:0}}>
              <li>Sadece <b>Genel Başkan</b> kabine ataması yapabilir</li>
              <li>Kabine üyeleri yasa süreçlerinde oy ağırlığı kazanır</li>
              <li>Seçim kaybedilirse kabine sıfırlanabilir</li>
              <li>Aynı kişi birden fazla bakanlık tutamaz</li>
            </ul>
          </div>
        </div>
      )}

      {/* GENEL */}
      {tab==="overview"&&(
        <div>
          <div style={{...card,background:"linear-gradient(135deg,rgba(167,139,250,0.08),rgba(0,0,0,0))"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
              <div>
                <div style={{fontFamily:"Syne,sans-serif",fontWeight:900,fontSize:"1.1rem",color:"#A78BFA"}}>{myParty.name}</div>
                <div style={{fontSize:"0.72rem",color:"#5E7390"}}>Lider: {myParty.leader}</div>
              </div>
              <div style={{background:"rgba(167,139,250,0.15)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:8,padding:"0.4rem 0.7rem",textAlign:"center"}}>
                <div style={{fontWeight:900,color:"#A78BFA",fontSize:"1rem"}}>{myParty.seats||0}</div>
                <div style={{fontSize:"0.6rem",color:"#5E7390"}}>KOLTUK</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.35rem"}}>
              {[
                {l:"Üyeler",v:(myParty.members||[]).length,c:"#60A5FA"},
                {l:"Kasa",v:fmtMoney(myParty.treasury||0),c:"#10B981"},
                {l:"Etki Puanı",v:myParty.influencePoints||myParty.support||0,c:"#A78BFA"},
                {l:"Teklifler",v:proposals.filter(p=>p.party===myParty.name).length,c:"#EF4444"},
              ].map(s=>(
                <div key={s.l} style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"0.4rem",textAlign:"center"}}>
                  <div style={{fontWeight:700,fontSize:"0.85rem",color:s.c}}>{s.v}</div>
                  <div style={{fontSize:"0.57rem",color:"#5E7390"}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" style={{width:"100%",marginBottom:"0.4rem"}} onClick={()=>setCurrentPage("politics")}>⚑ Tam Parti Sayfasına Git</button>
          <button className="btn" style={{width:"100%",border:"1px solid rgba(167,139,250,0.4)",color:"#A78BFA"}} onClick={()=>setCurrentPage("election_events")}>🗳️ Seçimlere Git</button>
        </div>
      )}

      {/* KAMPANYA */}
      {tab==="kampanya"&&(()=>{
        const now = Date.now();
        const ACTIVITIES = [
          {id:"miting",     icon:"📣", label:"Parti Mitingi",          desc:"Büyük kalabalık toplantısı. En yüksek etki.",         partyCost:100000, personalCost:60000, pts:20, cooldownMs:6*60*60*1000, cooldownLabel:"6 saat"},
          {id:"reklam",     icon:"📺", label:"Reklam Kampanyası",       desc:"TV, radyo ve dijital reklam yayını.",                  partyCost:30000,  personalCost:20000, pts:8,  cooldownMs:2*60*60*1000, cooldownLabel:"2 saat"},
          {id:"basin",      icon:"🎙️", label:"Basın Toplantısı",       desc:"Medyaya açıklama. Orta düzey görünürlük.",             partyCost:15000,  personalCost:10000, pts:5,  cooldownMs:60*60*1000,   cooldownLabel:"1 saat"},
          {id:"sosyal",     icon:"📱", label:"Sosyal Medya Paylaşımı",  desc:"Online kampanya. Düşük maliyet, hızlı puan.",          partyCost:5000,   personalCost:3000,  pts:2,  cooldownMs:30*60*1000,   cooldownLabel:"30 dk"},
          {id:"bagis",      icon:"🤝", label:"Bağış Kampanyası",        desc:"Vatandaşlardan destek topla. Kasa geliri de artar.",   partyCost:0,      personalCost:50000, pts:15, cooldownMs:4*60*60*1000,  cooldownLabel:"4 saat"},
          {id:"kongre",     icon:"🏛️", label:"Parti Kongresi",          desc:"Tüm üyelerin katıldığı büyük kongre. Lider gerekli.", partyCost:200000, personalCost:120000,pts:40, cooldownMs:24*60*60*1000, cooldownLabel:"24 saat"},
        ];

        const doActivity = (act) => {
          const cd = kampCooldowns[act.id];
          if(cd && now - cd < act.cooldownMs) return showMsg(`${act.label} için bekleme süresi dolmadı.`,"error");
          if(act.id==="kongre"&&!isLeader) return showMsg("Kongre için Parti Lideri olmalısınız","error");

          // Ödeme kaynağı
          const profile = (()=>{try{return JSON.parse(localStorage.getItem('rep_userProfile')||'{}');}catch{return {};}})();
          const allParties = (()=>{try{return JSON.parse(localStorage.getItem('rep_parties')||'[]');}catch{return [];}})();
          const cost = paySource==="treasury" ? act.partyCost : act.personalCost;

          if(paySource==="treasury") {
            if(!isLeader) return showMsg("Kasadan harcama için Parti Lideri yetkisi gerekli","error");
            if((myParty.treasury||0)<cost) return showMsg(`Parti kasasında yeterli para yok (${fmtMoney(cost)} gerekli)`,"error");
            const updParties = allParties.map(p=>p.id===myParty.id?{...p, treasury:(p.treasury||0)-cost, influencePoints:(p.influencePoints||p.support||0)+act.pts}:p);
            localStorage.setItem('rep_parties',JSON.stringify(updParties));
            try{window._socket?.emit('party:sync',{parties:updParties});}catch(e){}
          } else {
            if((profile.money||0)<cost) return showMsg(`Yetersiz bakiye (${fmtMoney(cost)} gerekli)`,"error");
            const np = {...profile, money:(profile.money||0)-cost};
            localStorage.setItem('rep_userProfile',JSON.stringify(np));
            const updParties = allParties.map(p=>p.id===myParty.id?{...p, influencePoints:(p.influencePoints||p.support||0)+act.pts}:p);
            localStorage.setItem('rep_parties',JSON.stringify(updParties));
            try{window._socket?.emit('party:sync',{parties:updParties});}catch(e){}
          }

          const newCd = {...kampCooldowns,[act.id]:now};
          setKampCooldowns(newCd); S.save("kampCooldowns",newCd);
          try{window._socket?.emit('gameEvent',{type:'meclisBanner',payload:{icon:act.icon,title:`${myParty.name} — ${act.label}`,by:cu?.username,party:myParty.name}});}catch(e){}
          showMsg(`${act.icon} ${act.label} başarılı! +${act.pts} etki puanı kazanıldı.`,"success");
        };

        const currentPoints = (()=>{try{const p=(JSON.parse(localStorage.getItem('rep_parties')||'[]')).find(p=>p.id===myParty.id);return p?.influencePoints||p?.support||0;}catch{return myParty.influencePoints||myParty.support||0;}})();

        return (
          <div>
            {/* Mevcut etki puanı */}
            <div style={{...card,background:"linear-gradient(135deg,rgba(167,139,250,0.08),rgba(0,0,0,0))",textAlign:"center",padding:"1.25rem"}}>
              <div style={{fontFamily:"JetBrains Mono,monospace",fontWeight:900,fontSize:"2rem",color:"#A78BFA"}}>{currentPoints}</div>
              <div style={{fontSize:"0.72rem",color:"#5E7390",marginBottom:"0.75rem"}}>ETKİ PUANI</div>
              <div style={{fontSize:"0.78rem",color:"#8899AA"}}>Etki puanı seçimlerde destek oranını, yasalarda oy ağırlığını belirler.</div>
            </div>

            {/* Ödeme kaynağı seçimi */}
            <div style={{...card,padding:"0.75rem"}}>
              <div style={{fontSize:"0.75rem",color:"#8899AA",marginBottom:"0.4rem",fontWeight:700}}>Ödeme Kaynağı:</div>
              <div style={{display:"flex",gap:"0.4rem"}}>
                {[{id:"treasury",lbl:"💰 Parti Kasası",note:"Lider yetkisi"},
                  {id:"personal",lbl:"👤 Kendi Cebim",note:"Herkes"}].map(src=>(
                  <button key={src.id} onClick={()=>setPaySource(src.id)} style={{flex:1,padding:"0.5rem",borderRadius:8,border:"none",background:paySource===src.id?"var(--accent)":"rgba(255,255,255,0.06)",color:paySource===src.id?"#000":"#8899AA",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",textAlign:"center"}}>
                    <div>{src.lbl}</div>
                    <div style={{fontSize:"0.62rem",opacity:0.7}}>{src.note}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Aktiviteler */}
            {ACTIVITIES.map(act=>{
              const lastUsed = kampCooldowns[act.id]||0;
              const elapsed  = now - lastUsed;
              const ready    = elapsed >= act.cooldownMs;
              const remaining= act.cooldownMs - elapsed;
              const hh = Math.floor(remaining/3600000);
              const mm = Math.floor((remaining%3600000)/60000);
              const cost = paySource==="treasury" ? act.partyCost : act.personalCost;
              return (
                <div key={act.id} style={{...card,opacity:ready?1:0.65}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.35rem"}}>
                    <div>
                      <span style={{fontSize:"1.2rem",marginRight:"0.4rem"}}>{act.icon}</span>
                      <span style={{fontWeight:700,color:"#E8EDF2",fontSize:"0.9rem"}}>{act.label}</span>
                    </div>
                    <span style={{background:"rgba(167,139,250,0.15)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:6,padding:"0.15rem 0.5rem",fontSize:"0.72rem",fontWeight:700,color:"#A78BFA",flexShrink:0}}>+{act.pts} puan</span>
                  </div>
                  <div style={{fontSize:"0.75rem",color:"#5E7390",marginBottom:"0.45rem"}}>{act.desc}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:"0.72rem",color:"#10B981",fontFamily:"JetBrains Mono,monospace"}}>
                      {cost===0?"Ücretsiz":`${fmtMoney(cost)}`}
                      <span style={{color:"#5E7390",marginLeft:4}}>· CD: {act.cooldownLabel}</span>
                    </span>
                    {ready ? (
                      <button className="btn btn-primary" style={{fontSize:"0.78rem",padding:"0.35rem 0.8rem"}} onClick={()=>doActivity(act)}>Başlat</button>
                    ) : (
                      <span style={{fontSize:"0.72rem",color:"#F59E0B",fontFamily:"JetBrains Mono,monospace"}}>{hh>0?`${hh}s `:""}{mm}dk bekle</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* YASALAR */}
      {tab==="laws"&&(
        <div>
          {isLeader&&(
            <div style={card}>
              <div className="card-title">📜 Yeni Yasa Teklif Et</div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",marginTop:"0.5rem"}}>
                <input type="text" placeholder="Yasa başlığı *" value={newProp.title} onChange={e=>setNewProp(p=>({...p,title:e.target.value}))} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"0.55rem 0.75rem",color:"#fff",fontSize:"0.85rem",fontFamily:"inherit",outline:"none"}}/>
                <input type="text" placeholder="Açıklama (isteğe bağlı)" value={newProp.description} onChange={e=>setNewProp(p=>({...p,description:e.target.value}))} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"0.55rem 0.75rem",color:"#fff",fontSize:"0.85rem",fontFamily:"inherit",outline:"none"}}/>
                <select value={newProp.type} onChange={e=>setNewProp(p=>({...p,type:e.target.value}))} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"0.55rem 0.75rem",color:"#fff",fontSize:"0.85rem",fontFamily:"inherit",outline:"none"}}>
                  {LAW_TYPES.map(lt=><option key={lt.id} value={lt.id} style={{background:"#111"}}>{lt.icon} {lt.label}</option>)}
                </select>
                <button className="btn btn-primary" onClick={submitProposal}>📜 Teklif Sun</button>
              </div>
            </div>
          )}
          {proposals.length===0&&<div style={{...card,textAlign:"center",color:"#5E7390",padding:"1.5rem"}}>Henüz yasa teklifi yok.</div>}
          {proposals.slice(0,15).map(p=>{
            const lawType = LAW_TYPES.find(lt=>lt.id===p.type)||LAW_TYPES[0];
            const hasVoted = (p.votes.for||[]).includes(cu.username)||(p.votes.against||[]).includes(cu.username);
            const statusColor = p.status==="passed"?"#10B981":p.status==="rejected"?"#EF4444":"#F59E0B";
            const statusText  = p.status==="passed"?"Kabul Edildi":p.status==="rejected"?"Reddedildi":"Oylamada";
            return (
              <div key={p.id} style={card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.4rem"}}>
                  <div style={{flex:1}}>
                    <span style={{background:`${lawType.color}22`,border:`1px solid ${lawType.color}44`,borderRadius:5,padding:"0.1rem 0.4rem",fontSize:"0.62rem",fontWeight:700,color:lawType.color,marginRight:"0.4rem"}}>{lawType.icon}</span>
                    <span style={{fontWeight:700,color:"#fff",fontSize:"0.9rem"}}>{p.title}</span>
                  </div>
                  <span style={{background:`${statusColor}22`,border:`1px solid ${statusColor}44`,borderRadius:5,padding:"0.15rem 0.45rem",fontSize:"0.62rem",fontWeight:700,color:statusColor,flexShrink:0,marginLeft:"0.4rem"}}>{statusText}</span>
                </div>
                {p.description&&<div style={{fontSize:"0.75rem",color:"#5E7390",marginBottom:"0.4rem"}}>{p.description}</div>}
                <div style={{fontSize:"0.7rem",color:"#5E7390",marginBottom:"0.5rem"}}>Teklif: {p.proposer} · {p.party}</div>
                <div style={{display:"flex",gap:"0.4rem",justifyContent:"space-between",fontSize:"0.78rem",marginBottom:p.status==="pending"&&!hasVoted?"0.5rem":"0"}}>
                  <span style={{color:"#10B981"}}>👍 {(p.votes.for||[]).length} Kabul</span>
                  <span style={{color:"#EF4444"}}>👎 {(p.votes.against||[]).length} Red</span>
                </div>
                {p.status==="pending"&&!hasVoted&&(
                  <div style={{display:"flex",gap:"0.4rem"}}>
                    <button className="btn btn-primary" style={{flex:1,fontSize:"0.78rem",padding:"0.4rem"}} onClick={()=>voteProposal(p.id,"for")}>👍 Kabul</button>
                    <button className="btn btn-red" style={{flex:1,fontSize:"0.78rem",padding:"0.4rem"}} onClick={()=>voteProposal(p.id,"against")}>👎 Ret</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SPONSORLAR */}
      {tab==="sponsors"&&(
        <div>
          <div style={card}>
            <div className="card-title">💰 Toplam Fon: {fmtMoney(totalFunds)}</div>
            {mySponsors.length===0&&<div style={{textAlign:"center",color:"#5E7390",padding:"0.75rem",fontSize:"0.82rem"}}>Henüz sponsor yok.</div>}
            {mySponsors.map((s,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.45rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{fontSize:"0.85rem",fontWeight:700}}>{s.familyName}</div>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontWeight:700,color:"#10B981"}}>{fmtMoney(s.amount)}</span>
              </div>
            ))}
            {isLeader&&<button className="btn btn-primary" style={{width:"100%",marginTop:"0.75rem"}} onClick={addSponsor}>+ Sponsor Ekle</button>}
          </div>
          <div style={card}>
            <div className="card-title">💡 Fonlama Avantajları</div>
            <ul style={{fontSize:"0.8rem",color:"#8899AA",lineHeight:1.7,paddingLeft:"1.2rem",margin:0}}>
              <li>Aile fonları seçim kampanyasını güçlendirir</li>
              <li>Seçimi kazanan parti aile üyelerine makam verebilir</li>
              <li>Ekonomik yasalar aile lehine çıkarılabilir</li>
              <li>Fonlama kesilirse parti zayıflar</li>
            </ul>
          </div>
        </div>
      )}

      {/* ÜYELER */}
      {tab==="members"&&(
        <div>
          <div style={card}>
            <div className="card-title">👥 Parti Üyeleri ({(myParty.members||[]).length})</div>
            {(myParty.members||[]).length===0&&<div style={{textAlign:"center",color:"#5E7390",padding:"0.75rem",fontSize:"0.82rem"}}>Henüz üye yok.</div>}
            {(myParty.members||[]).map((m,i)=>{
              const pr=getPartyRank(m);
              const cabinetPos=myCabinet[m];
              return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:"0.35rem",flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:"0.85rem",color:"#E8EDF2"}}>{m}</span>
                      <span style={{background:`${pr.color}22`,border:`1px solid ${pr.color}44`,borderRadius:4,padding:"0.06rem 0.35rem",fontSize:"0.6rem",fontWeight:700,color:pr.color}}>{pr.label}</span>
                      {cabinetPos&&<span style={{background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:4,padding:"0.06rem 0.35rem",fontSize:"0.6rem",fontWeight:700,color:"#A78BFA"}}>🏛️ {cabinetPos}</span>}
                    </div>
                    {m===myParty.leader&&<div style={{fontSize:"0.62rem",color:"#5E7390",marginTop:"0.15rem"}}>Genel Başkan · Parti Kurucusu</div>}
                  </div>
                  <div style={{fontSize:"0.65rem",color:"#5E7390",textAlign:"right"}}>
                    {pr.canBeCampaign&&<div style={{color:"#10B981",fontSize:"0.6rem"}}>📣 Kampanya</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Üye istatistikleri */}
          <div style={{...card,padding:"0.75rem"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.35rem"}}>
              {[
                {l:"Liderlik",v:PARTY_RANKS.slice(0,3).reduce((a,r)=>{const h=(myParty?.members||[]).filter(m=>getPartyRank(m).id===r.id).length;return a+h;},0),c:"#FFD700"},
                {l:"İl Teşkilatı",v:(myParty?.members||[]).filter(m=>getPartyRank(m).id==="il_baskani").length,c:"#A78BFA"},
                {l:"Milletvekili",v:(myParty?.members||[]).filter(m=>getPartyRank(m).id==="milletvekili").length,c:"#10B981"},
              ].map(s=>(
                <div key={s.l} style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"0.5rem",textAlign:"center"}}>
                  <div style={{fontWeight:700,fontSize:"0.9rem",color:s.c}}>{s.v}</div>
                  <div style={{fontSize:"0.6rem",color:"#5E7390"}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
