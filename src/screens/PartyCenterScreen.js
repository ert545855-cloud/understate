
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

  const partyArr = Array.isArray(parties)?parties:[];
  const fams = Array.isArray(families)?families:[];
  const myParty = partyArr.find(p=>p.leader===cu?.username||(Array.isArray(p.members)&&p.members.includes(cu?.username)));
  const isLeader = myParty?.leader===cu?.username;

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
      <div style={{...card,textAlign:"center",padding:"2rem"}}>
        <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>⚑</div>
        <div style={{color:"#5E7390",fontSize:"0.85rem",marginBottom:"1rem"}}>Parti merkezine erişmek için bir partiye üye veya lider olmanız gerekiyor.</div>
        <button className="btn btn-primary" onClick={()=>setCurrentPage("politics")}>⚑ Parti Sistemine Git</button>
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
        {tabBtn("laws","Yasalar","📜")}
        {tabBtn("sponsors","Sponsorlar","💰")}
        {tabBtn("members","Üyeler","👥")}
      </div>

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
                {l:"Sponsorlar",v:mySponsors.length,c:"#FFB800"},
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
        <div style={card}>
          <div className="card-title">👥 Parti Üyeleri ({(myParty.members||[]).length})</div>
          {(myParty.members||[]).length===0&&<div style={{textAlign:"center",color:"#5E7390",padding:"0.75rem",fontSize:"0.82rem"}}>Henüz üye yok.</div>}
          {(myParty.members||[]).map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.45rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <div>
                <span style={{fontWeight:700,fontSize:"0.85rem",color:"#ddd"}}>{m}</span>
                {m===myParty.leader&&<span style={{marginLeft:"0.4rem",background:"rgba(255,215,0,0.12)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:4,padding:"0.1rem 0.35rem",fontSize:"0.58rem",fontWeight:700,color:"#FFD700"}}>LİDER</span>}
                {myCabinet[m]&&<span style={{marginLeft:"0.4rem",fontSize:"0.65rem",color:"#A78BFA"}}>{myCabinet[m]}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
