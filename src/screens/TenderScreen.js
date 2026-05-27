
// ═══════════════════════════════════════════════════════
// UNDERSTATE — Devlet İhaleleri (State Tenders) Ekranı
// Sistem otomatik ihale oluşturur — Devlet Başkanı SADECE iletir
// ═══════════════════════════════════════════════════════
window.TenderScreen = function TenderScreen({ cu, families, allUsers, setCurrentPage }) {
  const S = {
    load: (k, def) => { try { const v = localStorage.getItem("us_tender_"+k); return v ? JSON.parse(v) : def; } catch { return def; } },
    save: (k, v)   => { try { localStorage.setItem("us_tender_"+k, JSON.stringify(v)); } catch {} },
  };

  // Sistem havuzu — Devlet Başkanı bunları AKTARIR (oluşturmaz)
  const SYSTEM_POOL = [
    {id:"sys_1",title:"Karayolu Altyapı Projesi",description:"300 km'lik çift yönlü otoyol yapımı. Ulaşım altyapısı güçlendirilecek.",startBid:5000000,category:"Altyapı"},
    {id:"sys_2",title:"Devlet Hastanesi İnşaatı",description:"500 yataklı tam teşekküllü devlet hastanesi yapımı.",startBid:8000000,category:"Sağlık"},
    {id:"sys_3",title:"Liman Genişletme İhalesi",description:"Ana limanın kapasitesi 3 katına çıkarılacak.",startBid:12000000,category:"Lojistik"},
    {id:"sys_4",title:"Yenilenebilir Enerji Santrali",description:"Güneş ve rüzgar enerjisi karma santrali kurulumu.",startBid:20000000,category:"Enerji"},
    {id:"sys_5",title:"Şehir Metro Hattı",description:"Yeni metro hattı yapım ve 10 yıllık işletme ihalesi.",startBid:35000000,category:"Ulaşım"},
    {id:"sys_6",title:"Tarımsal Sulama Projesi",description:"5.000 dönümlük arazi için modern sulama sistemi.",startBid:3000000,category:"Tarım"},
    {id:"sys_7",title:"Okul Yenileme Projesi",description:"50 devlet okulunun yenilenmesi ve modernizasyonu.",startBid:7000000,category:"Eğitim"},
    {id:"sys_8",title:"Köprü ve Viyadük Onarımı",description:"Şehir içi 12 köprünün kapsamlı onarımı.",startBid:4500000,category:"Altyapı"},
    {id:"sys_9",title:"Atık Su Arıtma Tesisi",description:"Büyükşehir için modern atık su arıtma tesisi.",startBid:9000000,category:"Çevre"},
    {id:"sys_10",title:"Akıllı Şehir Sistemi",description:"Trafik, güvenlik ve kamu hizmetlerinin dijital entegrasyonu.",startBid:15000000,category:"Teknoloji"},
  ];

  const initTenders = React.useCallback(()=>{
    const stored = S.load("list", null);
    if (stored) return stored;
    // Başlangıçta sistem 3 ihale otomatik açar (48-72 saat aralıklı)
    const now2 = Date.now();
    return SYSTEM_POOL.slice(0, 3).map((t, i) => ({
      ...t,
      presidentId: "Sistem",
      relayedBy: null,
      currentBid: t.startBid,
      currentBidder: null,
      bids: [],
      status: "open",
      endsAt: now2 + (48 + i * 24) * 3600000,
      controlInterval: 8,
      lastControl: null,
      missedControls: 0,
      createdAt: now2,
    }));
  }, []);

  const [tenders, setTenders] = React.useState(()=>initTenders());
  const [pendingPool, setPendingPool] = React.useState(()=>{
    // Kalan sistem ihaleleri (henüz aktif edilmemiş)
    try {
      const stored = S.load("pending_pool", null);
      if (stored) return stored;
      const activeSysIds = new Set((initTenders()||[]).map(t=>t.id));
      return SYSTEM_POOL.filter(p=>!activeSysIds.has(p.id));
    } catch { return SYSTEM_POOL.slice(3); }
  });
  const [tab, setTab] = React.useState("list");
  const [bidInput, setBidInput] = React.useState({});
  const [relayDuration, setRelayDuration] = React.useState("72");
  const [msg, setMsg] = React.useState(null);

  const saveTenders = (t) => { setTenders(t); S.save("list", t); };
  const savePool    = (p) => { setPendingPool(p); S.save("pending_pool", p); };
  const showMsg = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };

  const fmtMoney = (n) => { if(!n)return "₺0"; if(n>=1e9)return "₺"+(n/1e9).toFixed(1)+"Mlr"; if(n>=1e6)return "₺"+(n/1e6).toFixed(1)+"M"; if(n>=1e3)return "₺"+(n/1e3).toFixed(0)+"K"; return "₺"+n; };
  const fmtTime  = (ms) => { if(ms<=0)return "Süresi Doldu"; const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000); return h>0?`${h}s ${m}dk`:`${m}dk`; };
  const now = Date.now();

  const fams = Array.isArray(families) ? families : [];
  const isPresident  = cu?.position==="Devlet Başkanı" || cu?.role==="admin";
  const isFamilyLeader = fams.some(f=>f.leader===cu?.username);
  const userFamily   = fams.find(f=>f.leader===cu?.username||(Array.isArray(f.members)&&f.members.includes(cu?.username)));

  // Devlet Başkanı bir sistem ihalesini iletiyor/aktarıyor
  const relayTender = (poolItem) => {
    if (!isPresident) return showMsg("Sadece Devlet Başkanı ihale iletebilir", "error");
    const hours = parseInt(relayDuration) || 72;
    const newTender = {
      ...poolItem,
      id: poolItem.id + "_" + Date.now(),
      presidentId: "Sistem",
      relayedBy: cu.username,
      currentBid: poolItem.startBid,
      currentBidder: null,
      bids: [],
      status: "open",
      endsAt: now + hours * 3600000,
      controlInterval: 8,
      lastControl: null,
      missedControls: 0,
      createdAt: now,
    };
    saveTenders([newTender, ...tenders]);
    savePool(pendingPool.filter(p=>p.id !== poolItem.id));
    showMsg(`✅ "${poolItem.title}" ihalesi duyuruldu! (${hours} saat)`, "success");
    setTab("list");
    try { window._pushGameEvent?.('ihale_duyuruldu', `🏗️ İhale: ${poolItem.title}`, `Devlet Başkanı ${cu.username} yeni ihale açtı. Taban: ₺${(poolItem.startBid||0).toLocaleString()}`, '🏗️', 'ihale'); } catch(e){}
  };

  const placeBid = (tenderId) => {
    if (!isFamilyLeader) return showMsg("Sadece aile liderleri teklif verebilir", "error");
    const amount = parseInt(bidInput[tenderId]);
    if (!amount||isNaN(amount)) return showMsg("Geçerli bir teklif miktarı girin", "error");
    const updated = tenders.map(t => {
      if (t.id!==tenderId) return t;
      if (t.status!=="open") return t;
      if (t.endsAt<now) return {...t, status:"closed"};
      if (amount<=t.currentBid) return (showMsg(`Mevcut tekliften (${fmtMoney(t.currentBid)}) yüksek teklif verin`,"error"),t);
      const bid = {bidder:cu.username, amount, familyName:userFamily?.name||cu.username, timestamp:now};
      return {...t, currentBid:amount, currentBidder:cu.username, bids:[bid,...(t.bids||[])].slice(0,20)};
    });
    saveTenders(updated);
    setBidInput(prev=>({...prev,[tenderId]:""}));
    showMsg("Teklifiniz verildi! ✓", "success");
    const tender = tenders.find(t=>t.id===tenderId);
    if (tender && amount > (tender.currentBid || 0)) {
      try { window._pushGameEvent?.('ihale_teklif', `💰 İhale Teklifi: ${tender.title}`, `${cu.username} ₺${amount.toLocaleString()} teklif verdi.`, '💰', 'ihale'); } catch(e){}
    }
  };

  const doControl = (tenderId) => {
    const updated = tenders.map(t => {
      if (t.id!==tenderId||t.currentBidder!==cu.username) return t;
      return {...t, lastControl:now, status:"active"};
    });
    saveTenders(updated);
    showMsg("Kontrol başarıyla yapıldı! ✓", "success");
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
      <p style={{fontSize:"0.82rem",color:"#6B7C93",marginBottom:"0.6rem"}}>
        İhaleler sistem tarafından otomatik oluşturulur. <strong style={{color:"#F59E0B"}}>Devlet Başkanı ihaleleri duyurur</strong>, aileler teklif verir, kazanan projeyi üstlenir.
      </p>

      {/* Bilgi kutusu */}
      <div style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:10,padding:"0.55rem 0.75rem",marginBottom:"0.75rem",fontSize:"0.75rem",color:"#818CF8",lineHeight:1.5}}>
        ℹ️ Devlet Başkanı kendi ihalesi <strong>oluşturamaz</strong>. Sistem havuzundaki ihaleleri seçerek kamuoyuna <strong>iletir/duyurur</strong>.
      </div>

      {msg&&(
        <div style={{padding:"0.6rem 0.85rem",borderRadius:10,marginBottom:"0.75rem",background:msg.type==="success"?"rgba(16,185,129,0.12)":msg.type==="error"?"rgba(239,68,68,0.12)":"rgba(59,130,246,0.12)",border:`1px solid ${msg.type==="success"?"rgba(16,185,129,0.3)":msg.type==="error"?"rgba(239,68,68,0.3)":"rgba(59,130,246,0.3)"}`,color:msg.type==="success"?"#10B981":msg.type==="error"?"#EF4444":"#60A5FA",fontSize:"0.82rem",fontWeight:600}}>
          {msg.text}
        </div>
      )}

      <div style={{display:"flex",gap:"0.4rem",overflowX:"auto",paddingBottom:"0.5rem",marginBottom:"0.75rem",scrollbarWidth:"none"}}>
        {tabBtn("list","Aktif İhaleler","📋")}
        {tabBtn("my","İhalelerim","🏆")}
        {isPresident && tabBtn("relay","Duyur","📢")}
      </div>

      {/* AKTİF İHALELER */}
      {tab==="list" && (
        <div>
          {tenders.length===0 && (
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🏗️</div>
              <div style={{color:"#5E7390",fontSize:"0.85rem",marginBottom:"0.5rem"}}>Henüz duyurulan ihale yok.</div>
              <div style={{color:"#3B4E63",fontSize:"0.75rem"}}>Devlet Başkanı sistem havuzundan ihale duyurduğunda burada görünür.</div>
            </div>
          )}
          {tenders.map(tender=>{
            const remaining = tender.endsAt - now;
            const isOpen = tender.status==="open" && remaining>0;
            const isWinner = tender.currentBidder===cu?.username;
            const statusColor = isOpen?"#10B981":tender.status==="active"?"#F59E0B":"#5E7390";
            const statusText  = isOpen?"Açık":tender.status==="active"?"Aktif Proje":tender.status==="completed"?"Tamamlandı":"Kapandı";
            return (
              <div key={tender.id} style={{...card,border:isWinner?"1px solid rgba(255,184,0,0.3)":"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.4rem",marginBottom:"0.15rem"}}>
                      {tender.category && <span style={{background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:5,padding:"0.1rem 0.45rem",fontSize:"0.6rem",fontWeight:700,color:"#818CF8"}}>{tender.category}</span>}
                    </div>
                    <div style={{fontWeight:700,color:"#fff",fontSize:"0.95rem"}}>{tender.title}</div>
                    {tender.description && <div style={{fontSize:"0.72rem",color:"#5E7390",marginTop:"0.1rem",lineHeight:1.4}}>{tender.description}</div>}
                    <div style={{fontSize:"0.65rem",color:"#3B4E63",marginTop:"0.15rem"}}>
                      Duyuran: {tender.relayedBy ? `🏛️ ${tender.relayedBy}` : "⚙️ Sistem"}
                    </div>
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
                      <div style={{fontWeight:700,fontSize:"0.82rem",color:s.c,fontFamily:"JetBrains Mono,monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.v}</div>
                      <div style={{fontSize:"0.57rem",color:"#5E7390",marginTop:"0.1rem"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {isOpen && isFamilyLeader && (
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
                {isOpen && !isFamilyLeader && !isPresident && (
                  <div style={{fontSize:"0.72rem",color:"#5E7390",padding:"0.35rem 0"}}>🏠 Teklif vermek için aile lideri olmanız gerekiyor.</div>
                )}
                {isWinner && tender.status==="active" && (
                  <div>
                    <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:8,padding:"0.5rem",marginBottom:"0.4rem",fontSize:"0.78rem",color:"#F59E0B"}}>
                      ⚠️ {tender.lastControl ? `Son kontrol: ${new Date(tender.lastControl).toLocaleTimeString("tr-TR")}` : "Henüz kontrol yapılmadı!"} · Kaçırılan: {tender.missedControls||0}
                    </div>
                    <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>doControl(tender.id)}>✅ Proje Kontrolü Yap</button>
                  </div>
                )}
                {tender.bids && tender.bids.length>0 && (
                  <div style={{marginTop:"0.5rem",borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:"0.5rem"}}>
                    <div style={{fontSize:"0.63rem",color:"#5E7390",marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.06em"}}>Teklif Geçmişi</div>
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
      {tab==="my" && (
        <div>
          {wonTenders.length===0 && (
            <div style={{...card,textAlign:"center",color:"#5E7390",padding:"1.5rem"}}>
              <div style={{fontSize:"1.5rem",marginBottom:"0.5rem"}}>🏆</div>
              <div style={{fontSize:"0.85rem"}}>Henüz teklif verdiğiniz veya kazandığınız ihale yok.</div>
              {!isFamilyLeader && (
                <div style={{marginTop:"0.75rem",fontSize:"0.75rem",color:"#3B4E63"}}>Teklif verebilmek için bir aile lideri olmanız gerekiyor.</div>
              )}
            </div>
          )}
          {wonTenders.map(t=>(
            <div key={t.id} style={{...card,border:"1px solid rgba(255,184,0,0.25)"}}>
              <div style={{fontWeight:700,color:"#FFB800",marginBottom:"0.25rem"}}>{t.title}</div>
              <div style={{fontSize:"0.8rem",color:"#8899AA"}}>Teklifiniz: {fmtMoney(t.currentBid)} · Durum: {t.status}</div>
              {t.status==="active" && (
                <button className="btn btn-primary" style={{marginTop:"0.5rem",width:"100%"}} onClick={()=>doControl(t.id)}>✅ Proje Kontrolü Yap</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DEVLET BAŞKANI — SİSTEM İHALESİ DUYUR */}
      {tab==="relay" && isPresident && (
        <div>
          <div style={{...card,border:"1px solid rgba(245,158,11,0.3)",marginBottom:"0.75rem"}}>
            <div style={{fontWeight:700,color:"#F59E0B",fontSize:"0.85rem",marginBottom:"0.5rem"}}>📢 Devlet Başkanı İhale İletme Paneli</div>
            <p style={{fontSize:"0.78rem",color:"#8BA0B5",lineHeight:1.5,margin:"0 0 0.65rem 0"}}>
              Sistem tarafından hazırlanmış ihalelerden birini seçip duyurun. İhaleyi kendiniz oluşturamazsınız — sadece sistemin hazırladıklarını halka iletirsiniz.
            </p>
            <div style={{marginBottom:"0.75rem"}}>
              <div style={{fontSize:"0.7rem",color:"#5E7390",marginBottom:"0.25rem"}}>İhale Süresi</div>
              <select value={relayDuration} onChange={e=>setRelayDuration(e.target.value)}
                style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"0.5rem 0.75rem",color:"#fff",fontSize:"0.82rem",outline:"none",width:"100%"}}>
                <option value="24" style={{background:"#0B1527"}}>24 saat</option>
                <option value="48" style={{background:"#0B1527"}}>48 saat</option>
                <option value="72" style={{background:"#0B1527"}}>72 saat (3 gün)</option>
                <option value="120" style={{background:"#0B1527"}}>5 gün</option>
                <option value="168" style={{background:"#0B1527"}}>7 gün</option>
              </select>
            </div>
          </div>

          {pendingPool.length === 0 && (
            <div style={{...card,textAlign:"center",padding:"2rem",color:"#5E7390"}}>
              <div style={{fontSize:"1.5rem",marginBottom:"0.5rem"}}>✅</div>
              <div style={{fontSize:"0.85rem"}}>Tüm sistem ihaleleri duyurulmuş. Yeni ihaleler periyodik olarak sisteme eklenir.</div>
            </div>
          )}

          {pendingPool.map(item=>(
            <div key={item.id} style={{...card,border:"1px solid rgba(99,102,241,0.2)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                <div style={{flex:1}}>
                  {item.category && (
                    <span style={{background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:5,padding:"0.1rem 0.45rem",fontSize:"0.6rem",fontWeight:700,color:"#818CF8",display:"inline-block",marginBottom:"0.25rem"}}>{item.category}</span>
                  )}
                  <div style={{fontWeight:700,color:"#E8EDF2",fontSize:"0.95rem"}}>{item.title}</div>
                  <div style={{fontSize:"0.72rem",color:"#5E7390",marginTop:"0.1rem",lineHeight:1.4}}>{item.description}</div>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"0.5rem"}}>
                <div>
                  <span style={{fontSize:"0.72rem",color:"#5E7390"}}>Taban Bedeli: </span>
                  <span style={{fontWeight:700,color:"#FFB800",fontFamily:"JetBrains Mono,monospace"}}>{fmtMoney(item.startBid)}</span>
                </div>
                <button className="btn btn-primary" onClick={()=>relayTender(item)} style={{padding:"0.38rem 0.85rem",fontSize:"0.78rem"}}>
                  📢 Duyur
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
