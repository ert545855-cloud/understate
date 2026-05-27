
// ═══════════════════════════════════════════════════════
// UNDERSTATE — Güç Üçgeni (Power Triangle) Ekranı
// ═══════════════════════════════════════════════════════
window.PowerTriangleScreen = function PowerTriangleScreen({ cu, families, gangs, parties, allUsers, setCurrentPage }) {
  const [tab, setTab] = React.useState("overview");
  const [proposals, setProposals] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("us_pt_proposals")||"[]"); } catch { return []; }
  });
  const [propForm, setPropForm] = React.useState({type:"party_family",targetName:"",terms:"",offer:""});
  const [showPropForm, setShowPropForm] = React.useState(false);
  const [msg, setMsg] = React.useState(null);

  const saveProposals = (p) => { setProposals(p); try { localStorage.setItem("us_pt_proposals", JSON.stringify(p)); } catch {} };
  const showMsg = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };

  const fmtMoney = (n) => {
    if (!n) return "₺0";
    if (n >= 1e9) return "₺" + (n/1e9).toFixed(1) + "Mlr";
    if (n >= 1e6) return "₺" + (n/1e6).toFixed(1) + "M";
    if (n >= 1e3) return "₺" + (n/1e3).toFixed(0) + "K";
    return "₺" + n;
  };

  const fams = Array.isArray(families) ? families : [];
  const gangsArr = Array.isArray(gangs) ? gangs : [];
  const partyArr = Array.isArray(parties) ? parties : [];
  const users = Array.isArray(allUsers) ? allUsers : [];

  const totalFamilyPower = fams.reduce((a,f) => a + (f.power||0), 0);
  const totalGangPower   = gangsArr.reduce((a,g) => a + (g.power||0), 0);
  const totalPartySeats  = partyArr.reduce((a,p) => a + (p.seats||0), 0);
  const totalFamilyBank  = fams.reduce((a,f) => a + (f.bank||0), 0);
  const totalGangBank    = gangsArr.reduce((a,g) => a + (g.bank||0), 0);
  const totalPartyBank   = partyArr.reduce((a,p) => a + (p.treasury||0), 0);

  // Determine cu's role
  const myParty  = partyArr.find(p => p.leaderId===cu?.uid || p.leaderName===cu?.username || (Array.isArray(p.members)&&p.members.includes(cu?.uid)));
  const myFamily = fams.find(f => f.leader===cu?.username || (Array.isArray(f.members)&&f.members.includes(cu?.username)));
  const myGang   = gangsArr.find(g => g.leader===cu?.username || (Array.isArray(g.members)&&g.members.includes(cu?.username)));
  const isPartyLeader  = myParty?.leaderName === cu?.username || myParty?.leaderId === cu?.uid;
  const isFamilyLeader = myFamily?.leader === cu?.username;
  const isGangLeader   = myGang?.leader === cu?.username;

  const sendProposal = () => {
    if (!propForm.targetName.trim()) return showMsg("Hedef ismi girin", "error");
    if (!propForm.terms.trim()) return showMsg("Teklif şartlarını girin", "error");
    let fromName = "";
    let fromType = "";
    if (propForm.type === "party_family") {
      if (!isPartyLeader) return showMsg("Bu teklifi sadece parti lideri gönderebilir", "error");
      fromName = myParty.name; fromType = "Parti";
    } else if (propForm.type === "family_gang") {
      if (!isFamilyLeader) return showMsg("Bu teklifi sadece aile lideri gönderebilir", "error");
      fromName = myFamily.name; fromType = "Aile";
    } else if (propForm.type === "gang_family") {
      if (!isGangLeader) return showMsg("Bu teklifi sadece çete lideri gönderebilir", "error");
      fromName = myGang.name; fromType = "Çete";
    }
    const p = {
      id:"prop_"+Date.now(),
      type: propForm.type,
      fromName, fromType,
      toName: propForm.targetName.trim(),
      terms: propForm.terms.trim(),
      offer: propForm.offer.trim(),
      status: "pending",
      createdAt: Date.now(),
      by: cu?.username,
    };
    saveProposals([...proposals, p]);
    setShowPropForm(false);
    setPropForm({type:"party_family",targetName:"",terms:"",offer:""});
    showMsg("✅ Teklif gönderildi! Karşı taraf kabul/ret edebilir.", "success");
  };

  const respondProposal = (id, response) => {
    const updated = proposals.map(p => p.id===id ? {...p, status:response, respondedAt:Date.now(), respondedBy:cu?.username} : p);
    saveProposals(updated);
    showMsg(response==="accepted" ? "✅ Teklif kabul edildi!" : "❌ Teklif reddedildi.", response==="accepted"?"success":"info");
  };

  const myProposals = proposals.filter(p => p.by===cu?.username || p.toName===myParty?.name || p.toName===myFamily?.name || p.toName===myGang?.name);
  const pendingForMe = proposals.filter(p => p.status==="pending" && (p.toName===myParty?.name || p.toName===myFamily?.name || p.toName===myGang?.name));
  const acceptedProposals = proposals.filter(p => p.status==="accepted");

  const card = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: "1rem",
    marginBottom: "0.75rem"
  };

  const statBox = (icon, label, val, color) => (
    <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${color}22`,borderRadius:10,padding:"0.65rem",textAlign:"center"}}>
      <div style={{fontSize:"1.1rem"}}>{icon}</div>
      <div style={{fontWeight:900,fontSize:"1rem",color,fontFamily:"Syne,sans-serif",marginTop:"0.15rem"}}>{val}</div>
      <div style={{fontSize:"0.6rem",color:"#5E7390",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:"0.1rem"}}>{label}</div>
    </div>
  );

  const tabBtn = (id, label, icon, badge) => (
    <button key={id} onClick={()=>setTab(id)} style={{
      flexShrink:0,padding:"0.42rem 0.85rem",borderRadius:20,border:"none",
      background:tab===id?"var(--accent)":"rgba(255,255,255,0.06)",
      color:tab===id?"#000":"#8899AA",fontSize:"0.78rem",fontWeight:700,
      cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Syne,sans-serif",minHeight:36,
      position:"relative"
    }}>
      {icon} {label}
      {badge>0 && <span style={{position:"absolute",top:2,right:2,background:"#EF4444",color:"#fff",borderRadius:8,fontSize:"0.55rem",padding:"0.1rem 0.3rem",fontWeight:900}}>{badge}</span>}
    </button>
  );

  return (
    <div>
      <div className="ministry-header">⚡ Güç Üçgeni</div>
      <p style={{fontSize:"0.82rem",color:"#6B7C93",marginBottom:"1rem",padding:"0 0.25rem"}}>
        Aileler, Çeteler ve Partiler arasındaki güç dengesi. Teklif gönderin, ittifaklar kurun.
      </p>

      {msg&&(
        <div style={{padding:"0.55rem 0.85rem",borderRadius:10,marginBottom:"0.75rem",background:msg.type==="success"?"rgba(16,185,129,0.12)":msg.type==="error"?"rgba(239,68,68,0.12)":"rgba(59,130,246,0.12)",border:`1px solid ${msg.type==="success"?"rgba(16,185,129,0.3)":msg.type==="error"?"rgba(239,68,68,0.3)":"rgba(59,130,246,0.3)"}`,color:msg.type==="success"?"#10B981":msg.type==="error"?"#EF4444":"#60A5FA",fontSize:"0.82rem",fontWeight:600}}>
          {msg.text}
        </div>
      )}

      {/* Tab bar */}
      <div style={{display:"flex",gap:"0.4rem",overflowX:"auto",paddingBottom:"0.5rem",marginBottom:"0.75rem",scrollbarWidth:"none"}}>
        {tabBtn("overview","Genel Bakış","📊",0)}
        {tabBtn("proposals","Teklifler","🤝",pendingForMe.length)}
        {tabBtn("families","Aileler","👪",0)}
        {tabBtn("gangs","Çeteler","🔫",0)}
        {tabBtn("parties","Partiler","⚑",0)}
        {tabBtn("balance","Denge","⚖️",0)}
      </div>

      {/* GENEL BAKIŞ */}
      {tab==="overview" && (
        <div>
          <div style={{...card,textAlign:"center",padding:"1.5rem 1rem"}}>
            <div style={{fontSize:"0.75rem",color:"#5E7390",marginBottom:"0.75rem",textTransform:"uppercase",letterSpacing:"0.08em"}}>Güç Dağılımı</div>
            <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",gap:"0.5rem",height:90}}>
              {[
                {label:"Aileler",val:totalFamilyPower,color:"#60A5FA",icon:"👪"},
                {label:"Çeteler",val:totalGangPower,color:"#EF4444",icon:"🔫"},
                {label:"Partiler",val:totalPartySeats*100,color:"#A78BFA",icon:"⚑"},
              ].map(item => {
                const maxVal = Math.max(totalFamilyPower, totalGangPower, totalPartySeats*100, 1);
                const h = Math.max(20, Math.round((item.val/maxVal)*80));
                return (
                  <div key={item.label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.3rem"}}>
                    <span style={{fontSize:"0.65rem",fontWeight:700,color:item.color}}>{item.val.toLocaleString()}</span>
                    <div style={{width:52,height:h,background:`linear-gradient(180deg,${item.color}AA,${item.color}33)`,borderRadius:"6px 6px 0 0",border:`1px solid ${item.color}44`}}/>
                    <div style={{fontSize:"0.7rem",color:"#8899AA"}}>{item.icon} {item.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.45rem",marginBottom:"0.75rem"}}>
            {statBox("👪","Aile Sayısı",fams.length,"#60A5FA")}
            {statBox("🔫","Çete Sayısı",gangsArr.length,"#EF4444")}
            {statBox("⚑","Parti Sayısı",partyArr.length,"#A78BFA")}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.45rem",marginBottom:"0.75rem"}}>
            {statBox("💰","Aile Kasası",fmtMoney(totalFamilyBank),"#10B981")}
            {statBox("💰","Çete Kasası",fmtMoney(totalGangBank),"#F59E0B")}
            {statBox("💰","Parti Kasası",fmtMoney(totalPartyBank),"#8B5CF6")}
          </div>

          {/* Kabul Edilen Anlaşmalar */}
          {acceptedProposals.length > 0 && (
            <div style={card}>
              <div className="card-title" style={{color:"#10B981"}}>✅ Kabul Edilen Anlaşmalar ({acceptedProposals.length})</div>
              {acceptedProposals.map(p=>(
                <div key={p.id} style={{display:"flex",flexDirection:"column",gap:"0.2rem",padding:"0.5rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem"}}>
                    <span style={{color:"#E8EDF2",fontWeight:700}}>{p.fromName} → {p.toName}</span>
                    <span style={{fontSize:"0.65rem",color:p.type==="party_family"?"#A78BFA":p.type==="family_gang"?"#60A5FA":"#EF4444"}}>{p.type==="party_family"?"⚑→👪":p.type==="family_gang"?"👪→🔫":"🔫→👪"}</span>
                  </div>
                  <div style={{fontSize:"0.7rem",color:"#8BA0B5"}}>{p.terms}</div>
                  {p.offer && <div style={{fontSize:"0.68rem",color:"#10B981"}}>💰 {p.offer}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={card}>
            <div className="card-title">🕸️ Güç İlişkileri</div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",marginTop:"0.5rem"}}>
              {[
                {from:"👪 Aile",to:"🔫 Çete",rel:"Koruma Ücreti Öder",color:"#60A5FA",arrow:"→"},
                {from:"👪 Aile",to:"⚑ Parti",rel:"Siyasi Fon Sağlar",color:"#A78BFA",arrow:"→"},
                {from:"⚑ Parti",to:"👪 Aile",rel:"Yasal Ayrıcalık Verir",color:"#10B981",arrow:"→"},
                {from:"⚑ Parti",to:"🔫 Çete",rel:"Polis Baskını Yapar",color:"#EF4444",arrow:"→"},
                {from:"🔫 Çete",to:"👪 Aile",rel:"Güvenlik Sağlar",color:"#F59E0B",arrow:"→"},
              ].map((r,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.4rem 0.6rem",background:"rgba(255,255,255,0.02)",borderRadius:8,fontSize:"0.78rem"}}>
                  <span style={{fontWeight:700,minWidth:65}}>{r.from}</span>
                  <span style={{color:r.color,fontSize:"0.9rem"}}>{r.arrow}</span>
                  <span style={{color:r.color,flex:1}}>{r.rel}</span>
                  <span style={{fontWeight:700,color:"#5E7390",minWidth:65,textAlign:"right"}}>{r.to}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TEKLİFLER */}
      {tab==="proposals" && (
        <div>
          {/* Gelen teklifler */}
          {pendingForMe.length > 0 && (
            <div style={{...card,border:"1px solid rgba(245,158,11,0.3)"}}>
              <div style={{fontWeight:700,color:"#F59E0B",marginBottom:"0.65rem",fontSize:"0.85rem"}}>📬 Bekleyen Teklifler ({pendingForMe.length})</div>
              {pendingForMe.map(p=>(
                <div key={p.id} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"0.75rem",marginBottom:"0.5rem",border:"1px solid rgba(245,158,11,0.2)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.4rem"}}>
                    <span style={{fontWeight:700,color:"#E8EDF2",fontSize:"0.85rem"}}>{p.fromName}</span>
                    <span style={{fontSize:"0.65rem",color:"#5E7390",background:"rgba(255,255,255,0.06)",padding:"0.15rem 0.45rem",borderRadius:6}}>{p.fromType}</span>
                  </div>
                  <div style={{fontSize:"0.78rem",color:"#8BA0B5",marginBottom:"0.35rem"}}>📋 {p.terms}</div>
                  {p.offer && <div style={{fontSize:"0.72rem",color:"#10B981",marginBottom:"0.5rem"}}>💰 {p.offer}</div>}
                  <div style={{display:"flex",gap:"0.4rem"}}>
                    <button className="btn btn-primary" style={{flex:1,padding:"0.4rem"}} onClick={()=>respondProposal(p.id,"accepted")}>✅ Kabul Et</button>
                    <button className="btn btn-red" style={{flex:1,padding:"0.4rem"}} onClick={()=>respondProposal(p.id,"rejected")}>❌ Reddet</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Teklif gönder */}
          {(isPartyLeader || isFamilyLeader || isGangLeader) && (
            <div style={card}>
              <div style={{fontWeight:700,color:"#E8EDF2",marginBottom:"0.65rem",fontSize:"0.85rem"}}>📤 Teklif Gönder</div>
              {!showPropForm ? (
                <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>setShowPropForm(true)}>+ Yeni Teklif Oluştur</button>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  <div>
                    <div style={{fontSize:"0.7rem",color:"#5E7390",marginBottom:"0.25rem"}}>Teklif Türü</div>
                    <select value={propForm.type} onChange={e=>setPropForm(p=>({...p,type:e.target.value}))}
                      style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"0.5rem 0.7rem",color:"#fff",fontSize:"0.82rem",outline:"none"}}>
                      {isPartyLeader && <option value="party_family" style={{background:"#0B1527"}}>⚑ Parti → 👪 Aile (İttifak Teklifi)</option>}
                      {isFamilyLeader && <option value="family_gang" style={{background:"#0B1527"}}>👪 Aile → 🔫 Çete (Koruma Anlaşması)</option>}
                      {isGangLeader && <option value="gang_family" style={{background:"#0B1527"}}>🔫 Çete → 👪 Aile (Güvenlik Teklifi)</option>}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:"0.7rem",color:"#5E7390",marginBottom:"0.25rem"}}>Hedef Grup Adı *</div>
                    <input type="text" placeholder="Örn: Kızıl Hanedanlık" value={propForm.targetName} onChange={e=>setPropForm(p=>({...p,targetName:e.target.value}))}
                      style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"0.5rem 0.7rem",color:"#fff",fontSize:"0.82rem",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:"0.7rem",color:"#5E7390",marginBottom:"0.25rem"}}>Teklif Şartları *</div>
                    <textarea rows={2} placeholder="Anlaşma koşullarını yazın..." value={propForm.terms} onChange={e=>setPropForm(p=>({...p,terms:e.target.value}))}
                      style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"0.5rem 0.7rem",color:"#fff",fontSize:"0.82rem",outline:"none",resize:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:"0.7rem",color:"#5E7390",marginBottom:"0.25rem"}}>Mali Teklif (opsiyonel)</div>
                    <input type="text" placeholder="Örn: Ayda ₺500.000 koruma ücreti" value={propForm.offer} onChange={e=>setPropForm(p=>({...p,offer:e.target.value}))}
                      style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"0.5rem 0.7rem",color:"#fff",fontSize:"0.82rem",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{display:"flex",gap:"0.4rem"}}>
                    <button className="btn btn-primary" style={{flex:1}} onClick={sendProposal}>📤 Gönder</button>
                    <button className="btn" style={{flex:1,border:"1px solid rgba(255,255,255,0.12)",color:"#8899AA"}} onClick={()=>setShowPropForm(false)}>İptal</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gönderilmiş teklifler */}
          {myProposals.filter(p=>p.by===cu?.username).length > 0 && (
            <div style={card}>
              <div style={{fontWeight:700,color:"#E8EDF2",marginBottom:"0.65rem",fontSize:"0.85rem"}}>📋 Gönderdiğim Teklifler</div>
              {myProposals.filter(p=>p.by===cu?.username).map(p=>(
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.45rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:"0.78rem"}}>
                  <div>
                    <span style={{color:"#E8EDF2",fontWeight:600}}>{p.fromName} → {p.toName}</span>
                    <div style={{fontSize:"0.65rem",color:"#5E7390",marginTop:"0.1rem"}}>{p.terms.slice(0,40)}{p.terms.length>40?"...":""}</div>
                  </div>
                  <span style={{fontWeight:700,fontSize:"0.72rem",color:p.status==="accepted"?"#10B981":p.status==="rejected"?"#EF4444":"#F59E0B",flexShrink:0,marginLeft:"0.5rem"}}>
                    {p.status==="accepted"?"✅ Kabul":p.status==="rejected"?"❌ Red":"⏳ Bekliyor"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {pendingForMe.length===0 && myProposals.filter(p=>p.by===cu?.username).length===0 && !showPropForm && (
            <div style={{...card,textAlign:"center",padding:"2rem",color:"#5E7390",fontSize:"0.85rem"}}>
              Henüz teklif yok. Lider iseniz yukarıdan yeni teklif oluşturabilirsiniz.
            </div>
          )}
        </div>
      )}

      {/* AİLELER */}
      {tab==="families" && (
        <div>
          <div style={card}>
            <div className="card-title">👪 Aile Gücü Sıralaması</div>
            {fams.length===0 && <div style={{color:"#5E7390",textAlign:"center",padding:"1rem"}}>Henüz aktif aile yok.</div>}
            {fams.sort((a,b)=>(b.power||0)-(a.power||0)).map((f,i)=>(
              <div key={f.id||i} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.6rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontWeight:700,color:"#5E7390",minWidth:22,fontSize:"0.75rem"}}>#{i+1}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:"#fff",fontSize:"0.9rem"}}>{f.name}</div>
                  <div style={{fontSize:"0.7rem",color:"#5E7390"}}>Lider: {f.leader} · {(Array.isArray(f.members)?f.members:[]).length} üye</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:900,color:"#60A5FA",fontSize:"0.9rem"}}>{(f.power||0).toLocaleString()}</div>
                  <div style={{fontSize:"0.6rem",color:"#5E7390"}}>GÜÇ</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{...card}}>
            <div className="card-title">💡 Aile Mekanikleri</div>
            <ul style={{fontSize:"0.8rem",color:"#8899AA",lineHeight:1.7,paddingLeft:"1.2rem",margin:0}}>
              <li>Fabrika ve holding sahibi olabilirler</li>
              <li>Devlet ihalelerine katılabilirler</li>
              <li>Çetelere koruma ücreti öderler</li>
              <li>Partilere siyasi fon sağlarlar</li>
              <li>Sendikalarla toplu sözleşme yaparlar</li>
              <li>Silah ALAMAZLAR (sadece çeteler alabilir)</li>
            </ul>
            <button className="btn btn-primary" style={{marginTop:"0.75rem",width:"100%"}} onClick={()=>setCurrentPage("family")}>
              👪 Aile Sistemine Git
            </button>
          </div>
        </div>
      )}

      {/* ÇETELER */}
      {tab==="gangs" && (
        <div>
          <div style={card}>
            <div className="card-title">🔫 Çete Gücü Sıralaması</div>
            {gangsArr.length===0 && <div style={{color:"#5E7390",textAlign:"center",padding:"1rem"}}>Henüz aktif çete yok.</div>}
            {gangsArr.sort((a,b)=>(b.power||0)-(a.power||0)).map((g,i)=>(
              <div key={g.id||i} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.6rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontWeight:700,color:"#5E7390",minWidth:22,fontSize:"0.75rem"}}>#{i+1}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:"#fff",fontSize:"0.9rem"}}>{g.name}</div>
                  <div style={{fontSize:"0.7rem",color:"#5E7390"}}>Lider: {g.leader} · {(Array.isArray(g.members)?g.members:[]).length} üye</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:900,color:"#EF4444",fontSize:"0.9rem"}}>{(g.power||0).toLocaleString()}</div>
                  <div style={{fontSize:"0.6rem",color:"#5E7390"}}>GÜÇ</div>
                </div>
              </div>
            ))}
          </div>
          <div style={card}>
            <div className="card-title">💡 Çete Mekanikleri</div>
            <ul style={{fontSize:"0.8rem",color:"#8899AA",lineHeight:1.7,paddingLeft:"1.2rem",margin:0}}>
              <li>Ailelerden haftalık koruma ücreti alırlar</li>
              <li>Bölge kontrolü sağlarlar</li>
              <li>Silah satın alabilirler (aileler alamaz)</li>
              <li>Üyelerine maaş öderler</li>
              <li>Fabrikalara sabotaj yapabilirler</li>
            </ul>
            <button className="btn btn-primary" style={{marginTop:"0.75rem",width:"100%"}} onClick={()=>setCurrentPage("gang")}>
              🔫 Çete Sistemine Git
            </button>
          </div>
        </div>
      )}

      {/* PARTİLER */}
      {tab==="parties" && (
        <div>
          <div style={card}>
            <div className="card-title">⚑ Parti Güç Sıralaması</div>
            {partyArr.length===0 && <div style={{color:"#5E7390",textAlign:"center",padding:"1rem"}}>Henüz aktif parti yok.</div>}
            {partyArr.sort((a,b)=>(b.seats||0)-(a.seats||0)).map((p,i)=>(
              <div key={p.id||i} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.6rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontWeight:700,color:"#5E7390",minWidth:22,fontSize:"0.75rem"}}>#{i+1}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:"#fff",fontSize:"0.9rem"}}>{p.name}</div>
                  <div style={{fontSize:"0.7rem",color:"#5E7390"}}>Lider: {p.leaderName||p.leader} · {(Array.isArray(p.members)?p.members:[]).length} üye · %{p.support||0} destek</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:900,color:"#A78BFA",fontSize:"0.9rem"}}>{p.influencePoints||0} ⚡</div>
                  <div style={{fontSize:"0.6rem",color:"#5E7390"}}>ETKİ</div>
                </div>
              </div>
            ))}
          </div>
          <div style={card}>
            <div className="card-title">💡 Parti Mekanikleri</div>
            <ul style={{fontSize:"0.8rem",color:"#8899AA",lineHeight:1.7,paddingLeft:"1.2rem",margin:0}}>
              <li>Yasaları belirler ve uygularlar</li>
              <li>Devlet bütçesini yönetirler</li>
              <li>Ailelere yasal ayrıcalıklar tanıyabilirler</li>
              <li>Çetelere yönelik polis baskınları başlatabilirler</li>
              <li>Seçimleri kazanarak güçlenirler</li>
              <li>Meclis seçimi: İlk 10 parti otomatik aday</li>
            </ul>
            <button className="btn btn-primary" style={{marginTop:"0.75rem",width:"100%"}} onClick={()=>setCurrentPage("politics")}>
              ⚑ Parti Sistemine Git
            </button>
          </div>
        </div>
      )}

      {/* DENGE */}
      {tab==="balance" && (
        <div>
          <div style={card}>
            <div className="card-title">⚖️ Güç Dengesi Analizi</div>
            {[
              {label:"Aile → Çete (Koruma Ücreti)", status: fams.length>0&&gangsArr.length>0?"Aktif":"Pasif", color:fams.length>0&&gangsArr.length>0?"#10B981":"#EF4444"},
              {label:"Aile → Parti (Siyasi Fon)",    status: fams.length>0&&partyArr.length>0?"Aktif":"Pasif", color:fams.length>0&&partyArr.length>0?"#10B981":"#EF4444"},
              {label:"Parti → Çete (Polis Baskını)", status: partyArr.length>0&&gangsArr.length>0?"Potansiyel":"Pasif", color:partyArr.length>0&&gangsArr.length>0?"#F59E0B":"#EF4444"},
              {label:"Kabul Edilen Anlaşmalar",      status: acceptedProposals.length+" anlaşma", color:acceptedProposals.length>0?"#10B981":"#6B7C93"},
            ].map((item,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:"0.82rem"}}>
                <span style={{color:"#bbb"}}>{item.label}</span>
                <span style={{fontWeight:700,color:item.color,fontSize:"0.75rem"}}>{item.status}</span>
              </div>
            ))}
          </div>
          <div style={{...card,border:"1px solid rgba(245,158,11,0.3)"}}>
            <div style={{fontSize:"0.82rem",color:"#F59E0B",fontWeight:700,marginBottom:"0.5rem"}}>⚠️ Denge Uyarısı</div>
            <p style={{fontSize:"0.8rem",color:"#8899AA",lineHeight:1.6,margin:0}}>
              Herhangi bir grubun diğerlerine göre fazla güçlenmesi dengeyi bozar.
              Aile çeteye ödeme yapmazsa fabrikalar sabote edilir.
              Parti yasalar çıkarmazsa çeteler kontrolden çıkar.
              Çete partiye itaat etmezse polis baskınları artar.
            </p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
            <button className="btn btn-primary" onClick={()=>setCurrentPage("family")}>👪 Aile Sistemine Git</button>
            <button className="btn btn-primary" onClick={()=>setCurrentPage("gang")}>🔫 Çete Sistemine Git</button>
            <button className="btn btn-primary" onClick={()=>setCurrentPage("politics")}>⚑ Parti Sistemine Git</button>
            <button className="btn" onClick={()=>setCurrentPage("tenders")} style={{border:"1px solid rgba(255,184,0,0.4)",color:"#FFB800"}}>🏗️ Devlet İhalelerine Git</button>
            <button className="btn" onClick={()=>setCurrentPage("unions")} style={{border:"1px solid rgba(16,185,129,0.4)",color:"#10B981"}}>🏭 Sendika Sistemine Git</button>
          </div>
        </div>
      )}
    </div>
  );
};
