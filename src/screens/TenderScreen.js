
// ═══════════════════════════════════════════════════════
// UNDERSTATE — Devlet İhaleleri (State Tenders) Ekranı
// ═══════════════════════════════════════════════════════
window.TenderScreen = function TenderScreen({ cu, families, allUsers, setCurrentPage }) {
  const S = {
    load: (k, def) => { try { const v = localStorage.getItem("us_tender_"+k); return v ? JSON.parse(v) : def; } catch { return def; } },
    save: (k, v)   => { try { localStorage.setItem("us_tender_"+k, JSON.stringify(v)); } catch {} },
  };

  const AUTO_TENDERS = [
    {title:"Karayolu Altyapı Projesi",description:"300 km'lik çift yönlü otoyol yapımı",startBid:5000000},
    {title:"Hastane İnşaatı",description:"500 yataklı devlet hastanesi yapımı",startBid:8000000},
    {title:"Liman Genişletme İhalesi",description:"Ana liman kapasitesinin 3 katına çıkarılması",startBid:12000000},
    {title:"Enerji Santrali Kurulumu",description:"Yenilenebilir enerji santrali inşaatı",startBid:20000000},
    {title:"Şehir Metro Hattı",description:"Yeni metro hattı yapım ve işletme ihalesi",startBid:35000000},
    {title:"Tarımsal Sulama Projesi",description:"5.000 dönümlük arazi için sulama sistemi",startBid:3000000},
    {title:"Okul Yenileme Projesi",description:"50 devlet okulunun yenilenmesi",startBid:7000000},
  ];
  const initTenders = React.useCallback(()=>{
    const stored = S.load("list", null);
    if(stored) return stored;
    const now2 = Date.now();
    return AUTO_TENDERS.slice(0,4).map((t,i)=>({
      id:"t_auto_"+i, ...t, presidentId:"Sistem", currentBid:t.startBid,
      currentBidder:null, bids:[], status:"open",
      endsAt:now2+(24+i*12)*3600000, controlInterval:8, lastControl:null, missedControls:0, createdAt:now2,
    }));
  }, []);
  const [tenders, setTenders] = React.useState(()=>initTenders());
  const [tab, setTab]         = React.useState("list");
  const [newTender, setNewTender] = React.useState({title:"",description:"",startBid:"",durationHours:"24"});
  const [bidInput, setBidInput]   = React.useState({});
  const [msg, setMsg] = React.useState(null);

  const saveTenders = (t) => { setTenders(t); S.save("list", t); };
  const showMsg = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000); };

  const fams = Array.isArray(families)?families:[];
  const fmtMoney = (n) => { if(!n)return "₺0"; if(n>=1e9)return "₺"+(n/1e9).toFixed(1)+"Mlr"; if(n>=1e6)return "₺"+(n/1e6).toFixed(1)+"M"; if(n>=1e3)return "₺"+(n/1e3).toFixed(0)+"K"; return "₺"+n; };
  const fmtTime = (ms) => { if(ms<=0)return "Süresi Doldu"; const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000); return h>0?`${h}s ${m}dk`:`${m}dk`; };
  const now = Date.now();

  const userFamily = fams.find(f=>f.leader===cu?.username || (Array.isArray(f.members)&&f.members.includes(cu?.username)));
  const isPresident = cu?.position==="Devlet Başkanı"||cu?.role==="admin";
  const isFamilyLeader = fams.some(f=>f.leader===cu?.username);

  const createTender = () => {
    if(!isPresident) return showMsg("Sadece Devlet Başkanı ihale açabilir","error");
    if(!newTender.title.trim()) return showMsg("İhale başlığı zorunlu","error");
    if(!newTender.startBid||isNaN(newTender.startBid)) return showMsg("Geçerli bir başlangıç bedeli girin","error");
    const tender = {
      id: "t_"+Date.now(),
      title: newTender.title.trim(),
      description: newTender.description.trim(),
      presidentId: cu.username,
      startBid: parseInt(newTender.startBid),
      currentBid: parseInt(newTender.startBid),
      currentBidder: null,
      bids: [],
      status: "open",
      endsAt: now + parseInt(newTender.durationHours)*3600000,
      controlInterval: 8,
      lastControl: null,
      missedControls: 0,
      createdAt: now,
    };
    const updated = [tender, ...tenders];
    saveTenders(updated);
    setNewTender({title:"",description:"",startBid:"",durationHours:"24"});
    setTab("list");
    showMsg("İhale başarıyla açıldı! ✓","success");
  };

  const placeBid = (tenderId) => {
    if(!isFamilyLeader) return showMsg("Sadece aile liderleri teklif verebilir","error");
    const amount = parseInt(bidInput[tenderId]);
    if(!amount||isNaN(amount)) return showMsg("Geçerli bir teklif miktarı girin","error");
    const updated = tenders.map(t => {
      if(t.id!==tenderId) return t;
      if(t.status!=="open") return t;
      if(t.endsAt<now) return {...t,status:"closed"};
      if(amount<=t.currentBid) return (showMsg(`Mevcut tekliften (${fmtMoney(t.currentBid)}) yüksek teklif verin`,"error"),t);
      const bid = {bidder:cu.username,amount,familyName:userFamily?.name||cu.username,timestamp:now};
      return {...t, currentBid:amount, currentBidder:cu.username, bids:[bid,...(t.bids||[])].slice(0,20)};
    });
    saveTenders(updated);
    setBidInput(prev=>({...prev,[tenderId]:""}));
    showMsg("Teklifiniz verildi! ✓","success");
  };

  const doControl = (tenderId) => {
    const updated = tenders.map(t => {
      if(t.id!==tenderId||t.currentBidder!==cu.username) return t;
      return {...t, lastControl:now, status:"active"};
    });
    saveTenders(updated);
    showMsg("Kontrol başarıyla yapıldı! ✓","success");
  };

  const card = {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"1rem",marginBottom:"0.75rem"};
  const tabBtn = (id,lbl,icon) => (
    <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"0.42rem 0.85rem",borderRadius:20,border:"none",background:tab===id?"var(--accent)":"rgba(255,255,255,0.06)",color:tab===id?"#000":"#8899AA",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Syne,sans-serif",minHeight:36}}>{icon} {lbl}</button>
  );

  const activeTenders = tenders.filter(t=>t.status==="open"&&t.endsAt>now);
  const wonTenders    = tenders.filter(t=>t.currentBidder===cu?.username);

  return (
    <div>
      <div className="ministry-header">🏗️ Devlet İhaleleri</div>
      <p style={{fontSize:"0.82rem",color:"#6B7C93",marginBottom:"1rem"}}>Devlet tarafından açılan ihalelere teklif verin. Kazanan aile projeyi üstlenir.</p>

      {msg&&(
        <div style={{padding:"0.6rem 0.85rem",borderRadius:10,marginBottom:"0.75rem",background:msg.type==="success"?"rgba(16,185,129,0.12)":msg.type==="error"?"rgba(239,68,68,0.12)":"rgba(59,130,246,0.12)",border:`1px solid ${msg.type==="success"?"rgba(16,185,129,0.3)":msg.type==="error"?"rgba(239,68,68,0.3)":"rgba(59,130,246,0.3)"}`,color:msg.type==="success"?"#10B981":msg.type==="error"?"#EF4444":"#60A5FA",fontSize:"0.82rem",fontWeight:600}}>
          {msg.text}
        </div>
      )}

      <div style={{display:"flex",gap:"0.4rem",overflowX:"auto",paddingBottom:"0.5rem",marginBottom:"0.75rem",scrollbarWidth:"none"}}>
        {tabBtn("list","İhaleler","📋")}
        {tabBtn("my","İhalelerim","🏆")}
        {isPresident&&tabBtn("create","Yeni İhale","+")}
      </div>

      {/* İHALE LİSTESİ */}
      {tab==="list"&&(
        <div>
          {tenders.length===0&&(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🏗️</div>
              <div style={{color:"#5E7390",fontSize:"0.85rem"}}>Henüz açık ihale bulunmamaktadır.</div>
              {isPresident&&<button className="btn btn-primary" style={{marginTop:"1rem"}} onClick={()=>setTab("create")}>+ İlk İhaleyi Aç</button>}
            </div>
          )}
          {tenders.map(tender=>{
            const remaining = tender.endsAt - now;
            const isOpen = tender.status==="open"&&remaining>0;
            const isWinner = tender.currentBidder===cu?.username;
            const statusColor = isOpen?"#10B981":tender.status==="active"?"#F59E0B":"#5E7390";
            const statusText  = isOpen?"Açık":tender.status==="active"?"Aktif Proje":tender.status==="completed"?"Tamamlandı":"Kapandı";
            return (
              <div key={tender.id} style={{...card,border:isWinner?"1px solid rgba(255,184,0,0.3)":"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:"#fff",fontSize:"0.95rem"}}>{tender.title}</div>
                    {tender.description&&<div style={{fontSize:"0.72rem",color:"#5E7390",marginTop:"0.15rem"}}>{tender.description}</div>}
                    <div style={{fontSize:"0.7rem",color:"#5E7390",marginTop:"0.15rem"}}>Açan: {tender.presidentId}</div>
                  </div>
                  <span style={{background:`${statusColor}22`,border:`1px solid ${statusColor}44`,borderRadius:6,padding:"0.2rem 0.55rem",fontSize:"0.65rem",fontWeight:700,color:statusColor,flexShrink:0,marginLeft:"0.5rem"}}>{statusText}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.4rem",marginBottom:"0.65rem"}}>
                  {[
                    {l:"Mevcut Teklif",v:fmtMoney(tender.currentBid),c:"#FFB800"},
                    {l:"Teklif Veren", v:tender.currentBidder||"—",c:"#60A5FA"},
                    {l:"Kalan Süre",   v:fmtTime(remaining),c:remaining<3600000?"#EF4444":"#10B981"},
                  ].map(s=>(
                    <div key={s.l} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"0.4rem",textAlign:"center"}}>
                      <div style={{fontWeight:700,fontSize:"0.82rem",color:s.c,fontFamily:"JetBrains Mono,monospace"}}>{s.v}</div>
                      <div style={{fontSize:"0.58rem",color:"#5E7390",marginTop:"0.1rem"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {isOpen&&isFamilyLeader&&(
                  <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.4rem"}}>
                    <input
                      type="number"
                      placeholder={`Min: ${fmtMoney(tender.currentBid+1)}`}
                      value={bidInput[tender.id]||""}
                      onChange={e=>setBidInput(p=>({...p,[tender.id]:e.target.value}))}
                      style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"0.5rem 0.75rem",color:"#fff",fontSize:"0.82rem",fontFamily:"JetBrains Mono,monospace",outline:"none"}}
                    />
                    <button className="btn btn-primary" style={{flexShrink:0}} onClick={()=>placeBid(tender.id)}>Teklif Ver</button>
                  </div>
                )}
                {isWinner&&tender.status==="active"&&(
                  <div>
                    <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:8,padding:"0.5rem",marginBottom:"0.4rem",fontSize:"0.78rem",color:"#F59E0B"}}>
                      ⚠️ {tender.lastControl ? `Son kontrol: ${new Date(tender.lastControl).toLocaleTimeString("tr-TR")}` : "Henüz kontrol yapılmadı!"} · Kaçırılan: {tender.missedControls||0}
                    </div>
                    <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>doControl(tender.id)}>✅ Kontrol Yap</button>
                  </div>
                )}
                {tender.bids&&tender.bids.length>0&&(
                  <div style={{marginTop:"0.5rem",borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:"0.5rem"}}>
                    <div style={{fontSize:"0.65rem",color:"#5E7390",marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.06em"}}>Teklif Geçmişi</div>
                    {tender.bids.slice(0,3).map((b,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"0.72rem",padding:"0.2rem 0",color:"#8899AA"}}>
                        <span>{b.familyName||b.bidder}</span>
                        <span style={{color:"#FFB800",fontFamily:"JetBrains Mono,monospace"}}>{fmtMoney(b.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* İHALELERİM */}
      {tab==="my"&&(
        <div>
          {wonTenders.length===0&&<div style={{...card,textAlign:"center",color:"#5E7390",padding:"1.5rem"}}>Henüz kazandığınız veya teklif verdiğiniz ihale yok.</div>}
          {wonTenders.map(t=>(
            <div key={t.id} style={{...card,border:"1px solid rgba(255,184,0,0.25)"}}>
              <div style={{fontWeight:700,color:"#FFB800",marginBottom:"0.25rem"}}>{t.title}</div>
              <div style={{fontSize:"0.8rem",color:"#8899AA"}}>Teklif: {fmtMoney(t.currentBid)} · Durum: {t.status}</div>
              {t.status==="active"&&(
                <button className="btn btn-primary" style={{marginTop:"0.5rem",width:"100%"}} onClick={()=>doControl(t.id)}>✅ Kontrol Yap</button>
              )}
            </div>
          ))}
          {!isFamilyLeader&&<div style={{...card,textAlign:"center",color:"#5E7390",fontSize:"0.82rem",padding:"1.5rem"}}>Teklif verebilmek için bir aile lideri olmanız gerekiyor.</div>}
        </div>
      )}

      {/* YENİ İHALE OLUŞTUR (sadece Devlet Başkanı) */}
      {tab==="create"&&isPresident&&(
        <div style={card}>
          <div className="card-title">+ Yeni İhale Aç</div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.6rem",marginTop:"0.5rem"}}>
            {[
              {lbl:"İhale Başlığı *",key:"title",type:"text",ph:"Örn: Şehir Altyapı Projesi"},
              {lbl:"Açıklama",key:"description",type:"text",ph:"İhale detayları..."},
              {lbl:"Başlangıç Bedeli (₺) *",key:"startBid",type:"number",ph:"1000000"},
              {lbl:"Süre (Saat)",key:"durationHours",type:"number",ph:"24"},
            ].map(f=>(
              <div key={f.key}>
                <div style={{fontSize:"0.72rem",color:"#5E7390",marginBottom:"0.25rem"}}>{f.lbl}</div>
                <input
                  type={f.type}
                  placeholder={f.ph}
                  value={newTender[f.key]}
                  onChange={e=>setNewTender(p=>({...p,[f.key]:e.target.value}))}
                  style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"0.55rem 0.75rem",color:"#fff",fontSize:"0.85rem",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
                />
              </div>
            ))}
            <button className="btn btn-primary" onClick={createTender} style={{width:"100%",marginTop:"0.25rem"}}>
              🏗️ İhale Aç
            </button>
          </div>
        </div>
      )}
      {tab==="create"&&!isPresident&&(
        <div style={{...card,textAlign:"center",color:"#5E7390",padding:"1.5rem"}}>Sadece Devlet Başkanı ihale açabilir.</div>
      )}
    </div>
  );
};
