// ═══════════════════════════════════════════════════════
// UNDERSTATE — Koruma Anlaşmaları Ekranı
//
// KURALLAR:
// • Çete lideri → aile varlıkları için koruma teklifi yapar
// • Haftalık / aylık ücret belirlenir
// • Aile lideri → teklifi kabul/reddeder
// • Diğer çeteler → korumasız varlıklara saldırabilir
// • Ordudaki askerler çete saldırısına uğramaz
// ═══════════════════════════════════════════════════════
window.ProtectionDealsScreen = function ProtectionDealsScreen({ cu, gangs, families, allUsers, setCurrentPage }) {
  const S = {
    load: (k, def) => { try { const v = localStorage.getItem("us_prot_"+k); return v ? JSON.parse(v) : def; } catch { return def; } },
    save: (k, v)   => { try { localStorage.setItem("us_prot_"+k, JSON.stringify(v)); } catch {} },
  };

  const [tab, setTab] = React.useState("deals");
  const [deals, setDeals] = React.useState(() => S.load("deals", []));
  const [offers, setOffers] = React.useState(() => S.load("offers", []));
  const [msg, setMsg] = React.useState(null);
  const [offerForm, setOfferForm] = React.useState({ familyId: "", coverage: "all", fee: "", schedule: "weekly" });
  const now = Date.now();

  const showMsg = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };
  const fmtMoney = (n) => { if(!n)return "₺0"; if(n>=1e6)return "₺"+(n/1e6).toFixed(1)+"M"; if(n>=1e3)return "₺"+(n/1e3).toFixed(0)+"K"; return "₺"+n; };

  const gangsArr   = Array.isArray(gangs)?gangs:[];
  const famsArr    = Array.isArray(families)?families:[];

  const myGang   = gangsArr.find(g=>g.leader===cu?.username||(Array.isArray(g.managers)&&g.managers.includes(cu?.username)));
  const myFamily = famsArr.find(f=>f.leader===cu?.username||(Array.isArray(f.members)&&f.members.includes(cu?.username)));
  const isFamilyLeader = myFamily?.leader===cu?.username;
  const isGangLeader   = myGang?.leader===cu?.username;
  const isGangManager  = myGang && (isGangLeader || (Array.isArray(myGang.managers)&&myGang.managers.includes(cu?.username)));

  const myActiveDeals = deals.filter(d => d.status==="active" && (d.gangId===myGang?.id || d.familyId===myFamily?.id));
  const myPendingOffers = offers.filter(o => o.status==="pending" && (o.gangId===myGang?.id || o.familyId===myFamily?.id));

  const COVERAGE_OPTIONS = [
    { id:"all",       label:"Tüm Varlıklar",  desc:"Holding, fabrika ve şirketlerin tamamı" },
    { id:"holdings",  label:"Sadece Holdinglar", desc:"Yalnızca holdingler korunur" },
    { id:"factories", label:"Sadece Fabrikalar", desc:"Yalnızca fabrikalar korunur" },
  ];

  // Teklif oluştur (çete tarafından)
  const createOffer = () => {
    if(!isGangManager) return showMsg("Koruma teklifi oluşturmak için çete liderliği veya yetkisi gerekli","error");
    if(!offerForm.familyId) return showMsg("Hedef aile seçin","error");
    const fee = parseInt(offerForm.fee);
    if(!fee || isNaN(fee) || fee < 1000) return showMsg("Geçerli bir ücret girin (min ₺1.000)","error");
    const targetFamily = famsArr.find(f=>f.id===offerForm.familyId);
    if(!targetFamily) return showMsg("Aile bulunamadı","error");
    if(offers.some(o=>o.gangId===myGang.id&&o.familyId===targetFamily.id&&o.status==="pending")) {
      return showMsg("Bu aileye zaten bekleyen bir teklifiniz var","error");
    }
    const offer = {
      id: `off_${Date.now()}`,
      gangId: myGang.id,
      gangName: myGang.name,
      familyId: targetFamily.id,
      familyName: targetFamily.name,
      coverage: offerForm.coverage,
      weeklyFee: fee,
      schedule: offerForm.schedule,
      offeredBy: cu.username,
      offeredAt: now,
      status: "pending",
    };
    const upd = [...offers, offer];
    setOffers(upd); S.save("offers", upd);
    setOfferForm({ familyId:"", coverage:"all", fee:"", schedule:"weekly" });
    showMsg(`${targetFamily.name} ailesine koruma teklifi gönderildi!`,"success");
  };

  // Teklifi kabul et (aile tarafından)
  const acceptOffer = (offerId) => {
    if(!isFamilyLeader) return showMsg("Sadece aile lideri teklif kabul edebilir","error");
    const offer = offers.find(o=>o.id===offerId);
    if(!offer) return;
    // Anlaşma oluştur
    const deal = {
      id: `deal_${Date.now()}`,
      gangId: offer.gangId,
      gangName: offer.gangName,
      familyId: offer.familyId,
      familyName: offer.familyName,
      coverage: offer.coverage,
      weeklyFee: offer.weeklyFee,
      schedule: offer.schedule,
      startedAt: now,
      status: "active",
    };
    const dealUpd = [...deals, deal];
    setDeals(dealUpd); S.save("deals", dealUpd);
    // Teklifi güncelle
    const offerUpd = offers.map(o=>o.id===offerId?{...o,status:"accepted"}:o);
    setOffers(offerUpd); S.save("offers", offerUpd);
    // Ayrıca EconomicEmpireScreen'in protDeals'ini de güncelle (cross-screen)
    try {
      const empKey = "us_empire_protDeals";
      const existing = JSON.parse(localStorage.getItem(empKey)||"[]");
      localStorage.setItem(empKey, JSON.stringify([...existing, deal]));
    } catch(_) {}
    showMsg(`${offer.gangName} ile koruma anlaşması başladı!`,"success");
  };

  // Teklifi reddet
  const rejectOffer = (offerId) => {
    if(!isFamilyLeader) return showMsg("Sadece aile lideri teklif reddedebilir","error");
    const upd = offers.map(o=>o.id===offerId?{...o,status:"rejected"}:o);
    setOffers(upd); S.save("offers", upd);
    showMsg("Teklif reddedildi.","info");
  };

  // Anlaşmayı sonlandır
  const endDeal = (dealId) => {
    const deal = deals.find(d=>d.id===dealId);
    if(!deal) return;
    const canEnd = (isFamilyLeader && deal.familyId===myFamily?.id) || (isGangLeader && deal.gangId===myGang?.id);
    if(!canEnd) return showMsg("Bu anlaşmayı sonlandırma yetkiniz yok","error");
    const upd = deals.map(d=>d.id===dealId?{...d,status:"ended"}:d);
    setDeals(upd); S.save("deals", upd);
    try {
      const empKey = "us_empire_protDeals";
      const existing = JSON.parse(localStorage.getItem(empKey)||"[]");
      localStorage.setItem(empKey, JSON.stringify(existing.filter(d=>d.id!==dealId)));
    } catch(_) {}
    showMsg("Anlaşma sonlandırıldı.","info");
  };

  const card = {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"1rem",marginBottom:"0.75rem"};
  const tabBtn = (id,lbl,icon) => (
    <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"0.42rem 0.85rem",borderRadius:20,border:"none",background:tab===id?"var(--accent)":"rgba(255,255,255,0.06)",color:tab===id?"#000":"#8899AA",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Syne,sans-serif",minHeight:36}}>{icon} {lbl}</button>
  );

  const statusColor = (s) => s==="active"?"#10B981":s==="pending"?"#F59E0B":s==="rejected"?"#EF4444":"#5E7390";
  const statusLabel = (s) => s==="active"?"Aktif":s==="pending"?"Bekliyor":s==="rejected"?"Reddedildi":"Sonlandı";

  return (
    <div>
      <div className="ministry-header">🛡️ Koruma Anlaşmaları</div>
      {msg&&(
        <div style={{padding:"0.6rem 0.85rem",borderRadius:10,marginBottom:"0.75rem",background:msg.type==="success"?"rgba(16,185,129,0.12)":msg.type==="error"?"rgba(239,68,68,0.12)":"rgba(59,130,246,0.12)",border:`1px solid ${msg.type==="success"?"rgba(16,185,129,0.3)":msg.type==="error"?"rgba(239,68,68,0.3)":"rgba(59,130,246,0.3)"}`,color:msg.type==="success"?"#10B981":msg.type==="error"?"#EF4444":"#60A5FA",fontSize:"0.82rem",fontWeight:600}}>
          {msg.text}
        </div>
      )}

      {/* Tab bar */}
      <div style={{display:"flex",gap:"0.4rem",overflowX:"auto",paddingBottom:"0.5rem",marginBottom:"0.75rem",scrollbarWidth:"none"}}>
        {tabBtn("deals","Anlaşmalar","🤝")}
        {tabBtn("offers","Teklifler","📩")}
        {isGangManager&&tabBtn("create","Teklif Yap","➕")}
        {tabBtn("rules","Kurallar","📋")}
      </div>

      {/* AKTİF ANLAŞMALAR */}
      {tab==="deals"&&(
        <div>
          {myActiveDeals.length===0?(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🤝</div>
              <div style={{color:"#5E7390",fontSize:"0.82rem"}}>Aktif koruma anlaşması yok.</div>
              {isFamilyLeader&&(
                <div style={{fontSize:"0.75rem",color:"#EF4444",marginTop:"0.5rem",fontWeight:600}}>
                  ⚠️ Korumasız varlıklarınıza çeteler saldırabilir!
                </div>
              )}
            </div>
          ):(
            myActiveDeals.map(d=>(
              <div key={d.id} style={{...card,borderLeft:"3px solid #10B981"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:"0.9rem",color:"#E8EDF2"}}>🔫 {d.gangName}</div>
                    <div style={{fontSize:"0.68rem",color:"#5E7390",marginTop:"0.1rem"}}>👪 {d.familyName} · {COVERAGE_OPTIONS.find(c=>c.id===d.coverage)?.label||d.coverage}</div>
                  </div>
                  <span style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:6,padding:"0.2rem 0.45rem",fontSize:"0.65rem",color:"#10B981",fontWeight:700}}>Aktif</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem"}}>
                  <div style={{fontSize:"0.75rem",color:"#8899AA"}}>{d.schedule==="weekly"?"Haftalık":"Aylık"} ödeme</div>
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"0.82rem",color:"#EF4444",fontWeight:700}}>{fmtMoney(d.weeklyFee)}</div>
                </div>
                {((isFamilyLeader&&d.familyId===myFamily?.id)||(isGangLeader&&d.gangId===myGang?.id))&&(
                  <button onClick={()=>endDeal(d.id)} style={{width:"100%",padding:"0.35rem",borderRadius:8,border:"1px solid rgba(239,68,68,0.3)",background:"transparent",color:"#EF4444",fontSize:"0.72rem",cursor:"pointer",fontFamily:"Syne,sans-serif",fontWeight:600}}>
                    Anlaşmayı Sonlandır
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TEKLİFLER */}
      {tab==="offers"&&(
        <div>
          {myPendingOffers.length===0?(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📩</div>
              <div style={{color:"#5E7390",fontSize:"0.82rem"}}>Bekleyen teklif yok.</div>
            </div>
          ):(
            myPendingOffers.map(o=>(
              <div key={o.id} style={{...card,borderLeft:"3px solid #F59E0B"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:"0.9rem",color:"#E8EDF2"}}>🔫 {o.gangName}</div>
                    <div style={{fontSize:"0.68rem",color:"#5E7390",marginTop:"0.1rem"}}>👪 {o.familyName} · {COVERAGE_OPTIONS.find(c=>c.id===o.coverage)?.label||o.coverage}</div>
                  </div>
                  <span style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:6,padding:"0.2rem 0.45rem",fontSize:"0.65rem",color:"#F59E0B",fontWeight:700}}>Bekliyor</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.75rem"}}>
                  <div style={{fontSize:"0.75rem",color:"#8899AA"}}>{o.schedule==="weekly"?"Haftalık":"Aylık"}</div>
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"0.82rem",color:"#10B981",fontWeight:700}}>{fmtMoney(o.weeklyFee)}</div>
                </div>
                {isFamilyLeader&&o.familyId===myFamily?.id&&(
                  <div style={{display:"flex",gap:"0.5rem"}}>
                    <button className="btn btn-primary" style={{flex:1,fontSize:"0.75rem"}} onClick={()=>acceptOffer(o.id)}>✓ Kabul Et</button>
                    <button onClick={()=>rejectOffer(o.id)} style={{flex:1,padding:"0.45rem",borderRadius:10,border:"1px solid rgba(239,68,68,0.3)",background:"transparent",color:"#EF4444",fontSize:"0.75rem",cursor:"pointer",fontFamily:"Syne,sans-serif",fontWeight:600}}>✗ Reddet</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TEKLİF OLUŞTUR */}
      {tab==="create"&&(
        <div>
          {!isGangManager?(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🔒</div>
              <div style={{color:"#EF4444",fontSize:"0.85rem",fontWeight:600}}>Yetki yok</div>
              <div style={{color:"#5E7390",fontSize:"0.78rem",marginTop:"0.5rem"}}>Koruma teklifi oluşturmak için çete liderliği veya yetkilendirme gerekli.</div>
            </div>
          ):(
            <div style={card}>
              <div className="card-title">➕ Yeni Koruma Teklifi</div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                <select className="input-field" value={offerForm.familyId} onChange={e=>setOfferForm(p=>({...p,familyId:e.target.value}))} style={{background:"rgba(255,255,255,0.05)",color:"#E8EDF2",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"0.6rem"}}>
                  <option value="" style={{background:"#0a1628"}}>— Aile Seç —</option>
                  {famsArr.map(f=><option key={f.id} value={f.id} style={{background:"#0a1628"}}>{f.name}</option>)}
                </select>
                <select className="input-field" value={offerForm.coverage} onChange={e=>setOfferForm(p=>({...p,coverage:e.target.value}))} style={{background:"rgba(255,255,255,0.05)",color:"#E8EDF2",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"0.6rem"}}>
                  {COVERAGE_OPTIONS.map(c=><option key={c.id} value={c.id} style={{background:"#0a1628"}}>{c.label}</option>)}
                </select>
                <select className="input-field" value={offerForm.schedule} onChange={e=>setOfferForm(p=>({...p,schedule:e.target.value}))} style={{background:"rgba(255,255,255,0.05)",color:"#E8EDF2",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"0.6rem"}}>
                  <option value="weekly" style={{background:"#0a1628"}}>Haftalık Ödeme</option>
                  <option value="monthly" style={{background:"#0a1628"}}>Aylık Ödeme</option>
                </select>
                <input className="input-field" type="number" placeholder="Ücret (₺)" value={offerForm.fee} onChange={e=>setOfferForm(p=>({...p,fee:e.target.value}))} />
                <button className="btn btn-primary" onClick={createOffer}>📩 Teklif Gönder</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KURALLAR */}
      {tab==="rules"&&(
        <div style={card}>
          <div className="card-title">📋 Koruma Sistemi Kuralları</div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",fontSize:"0.8rem",lineHeight:1.6}}>
            {[
              {icon:"✓",text:"Çete liderleri/yöneticileri aile varlıkları için teklif yapabilir",c:"#10B981"},
              {icon:"✓",text:"Aile lideri teklifi kabul veya reddeder",c:"#10B981"},
              {icon:"✓",text:"Haftalık veya aylık ödeme planı seçilebilir",c:"#10B981"},
              {icon:"⚔️",text:"Korumasız varlıklara başka çeteler saldırabilir",c:"#F59E0B"},
              {icon:"✗",text:"Ordudaki askerlere çeteler saldıramaz",c:"#EF4444"},
              {icon:"✗",text:"Birden fazla çete aynı varlık için anlaşma yapamaz",c:"#EF4444"},
            ].map((r,i)=>(
              <div key={i} style={{display:"flex",gap:"0.5rem",alignItems:"flex-start"}}>
                <span style={{color:r.c,fontWeight:700,flexShrink:0}}>{r.icon}</span>
                <span style={{color:"#8899AA"}}>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
