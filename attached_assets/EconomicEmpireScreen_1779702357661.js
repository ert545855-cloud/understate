// ═══════════════════════════════════════════════════════
// UNDERSTATE — Ekonomik İmparatorluk Ekranı (Yeni Senaryo)
// Aileler → Holding/Fabrika/Şirket kurar
// Çeteler → Koruma için para alır (anlaşma)
// Partiler → Ailelerden fon alarak puan kazanır
// ═══════════════════════════════════════════════════════
window.EconomicEmpireScreen = function EconomicEmpireScreen({ cu, families, gangs, parties, allUsers, setCurrentPage }) {
  const S = {
    load: (k, def) => { try { const v = localStorage.getItem("us_empire_"+k); return v ? JSON.parse(v) : def; } catch { return def; } },
    save: (k, v)   => { try { localStorage.setItem("us_empire_"+k, JSON.stringify(v)); } catch {} },
  };

  const [tab, setTab] = React.useState("overview");
  const [holdings, setHoldings]   = React.useState(()=>S.load("holdings",[]));
  const [factories, setFactories] = React.useState(()=>S.load("factories",[]));
  const [companies, setCompanies] = React.useState(()=>S.load("companies",[]));
  const [attacks, setAttacks]     = React.useState(()=>S.load("attacks",[]));
  const [fundDeals, setFundDeals] = React.useState(()=>S.load("fundDeals",[]));
  const [msg, setMsg] = React.useState(null);
  const [form, setForm] = React.useState({name:"",type:"fabrika",budget:""});
  const now = Date.now();

  const showMsg = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };
  const fmtMoney = (n) => { if(!n)return "₺0"; if(n>=1e9)return "₺"+(n/1e9).toFixed(1)+"Mlr"; if(n>=1e6)return "₺"+(n/1e6).toFixed(1)+"M"; if(n>=1e3)return "₺"+(n/1e3).toFixed(0)+"K"; return "₺"+n; };

  const famsArr  = Array.isArray(families)?families:[];
  const gangsArr = Array.isArray(gangs)?gangs:[];
  const partiesArr= Array.isArray(parties)?parties:[];

  // Kullanıcının ailesi ve rolü
  const myFamily = famsArr.find(f=>f.leader===cu?.username||(Array.isArray(f.members)&&f.members.includes(cu?.username)));
  const isFamilyLeader = myFamily?.leader===cu?.username;
  // Aile yönetiminin onayladığı yöneticiler (family.managers listesi)
  const isApprovedManager = myFamily && (isFamilyLeader || (Array.isArray(myFamily.managers)&&myFamily.managers.includes(cu?.username)));

  // Bu ailenin holdingleri
  const myHoldings  = holdings.filter(h=>h.familyId===myFamily?.id);
  const myFactories = factories.filter(f=>f.familyId===myFamily?.id);
  const myCompanies = companies.filter(c=>c.familyId===myFamily?.id);

  // Toplam varlıklar
  const totalAssets = myHoldings.length + myFactories.length + myCompanies.length;
  const totalMonthlyIncome = [
    ...myHoldings.map(h=>h.monthlyIncome||0),
    ...myFactories.map(f=>f.monthlyIncome||0),
    ...myCompanies.map(c=>c.monthlyIncome||0),
  ].reduce((a,b)=>a+b,0);

  // Koruma anlaşmaları — bu ailenin tüm varlıkları için aktif anlaşmalar
  const myProtDeals = S.load("protDeals",[]).filter(d=>d.familyId===myFamily?.id&&d.status==="active");
  const totalProtectionPaid = myProtDeals.reduce((a,d)=>a+(d.weeklyFee||0),0);

  const BUSINESS_TYPES = [
    {id:"holding",  label:"Holding",       icon:"🏢", cost:5000000,  monthlyIncome:500000,  slots:5, desc:"En yüksek yapı. Birden fazla fabrika ve şirketi yönetir."},
    {id:"fabrika",  label:"Fabrika",        icon:"🏭", cost:2000000,  monthlyIncome:200000,  slots:3, desc:"Üretim tesisi. Holding altına alınabilir."},
    {id:"sirket",   label:"Şirket",         icon:"📊", cost:800000,   monthlyIncome:80000,   slots:0, desc:"Ticaret şirketi. Fabrika veya holding gerektirir."},
  ];

  const canBuild = (type) => {
    if(!isApprovedManager) return {ok:false, reason:"Sadece aile lideri veya onaylı yöneticiler işletme kurabilir"};
    if(type==="holding") return {ok:true};
    if(type==="fabrika") {
      if(myHoldings.length===0) return {ok:false, reason:"Fabrika kurmak için önce bir holding gerekli"};
      const availableHolding = myHoldings.find(h=>(h.factories||[]).length<5);
      if(!availableHolding) return {ok:false, reason:"Tüm holdingleriniz dolu (max 5 fabrika/holding)"};
      return {ok:true, holdingId:availableHolding.id};
    }
    if(type==="sirket") {
      if(myFactories.length===0&&myHoldings.length===0) return {ok:false, reason:"Şirket kurmak için fabrika veya holding gerekli"};
      return {ok:true};
    }
    return {ok:false, reason:"Geçersiz tür"};
  };

  const buildBusiness = () => {
    if(!form.name.trim()) return showMsg("İşletme adı zorunlu","error");
    const bt = BUSINESS_TYPES.find(b=>b.id===form.type);
    if(!bt) return showMsg("Geçersiz tür","error");
    const check = canBuild(form.type);
    if(!check.ok) return showMsg(check.reason,"error");
    const budget = parseInt(form.budget);
    if(isNaN(budget)||budget<bt.cost) return showMsg(`Minimum sermaye: ${fmtMoney(bt.cost)}`,"error");

    const entry = {
      id:`biz_${Date.now()}`,
      name:form.name.trim(),
      type:form.type,
      familyId:myFamily.id,
      familyName:myFamily.name,
      owner:cu.username,
      budget:budget,
      monthlyIncome:bt.monthlyIncome,
      createdAt:now,
      underAttack:false,
      protectedBy:null, // çete adı
      attackHistory:[],
      employees:0,
    };

    if(form.type==="holding") {
      const upd = [...holdings, {...entry, factories:[]}];
      setHoldings(upd); S.save("holdings",upd);
    } else if(form.type==="fabrika") {
      const upd = [...factories, entry];
      setFactories(upd); S.save("factories",upd);
      // Holdingi güncelle
      const hUpd = holdings.map(h=>h.id===check.holdingId?{...h,factories:[...(h.factories||[]),entry.id]}:h);
      setHoldings(hUpd); S.save("holdings",hUpd);
    } else {
      const upd = [...companies, entry];
      setCompanies(upd); S.save("companies",upd);
    }
    setForm({name:"",type:"fabrika",budget:""});
    showMsg(`${bt.label} "${entry.name}" kuruldu! ✓`,"success");
  };

  // Parti fonlama
  const fundParty = () => {
    if(!isFamilyLeader) return showMsg("Sadece aile lideri parti fonlayabilir","error");
    const partyName = prompt("Fonlamak istediğiniz parti:");
    if(!partyName) return;
    const amount = parseInt(prompt("Fon miktarı (₺):"));
    if(!amount||isNaN(amount)) return showMsg("Geçerli miktar girin","error");
    const deal = {id:`fund_${Date.now()}`,familyId:myFamily?.id,familyName:myFamily?.name,partyName,amount,date:now,type:"party_fund"};
    const upd = [...fundDeals, deal];
    setFundDeals(upd); S.save("fundDeals",upd);
    showMsg(`${partyName} partisine ${fmtMoney(amount)} fon gönderildi! Siyasi puan kazanıldı. ✓`,"success");
  };

  // Stil sabitleri
  const card = {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"1rem",marginBottom:"0.75rem"};
  const tabBtn = (id,lbl,icon) => (
    <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"0.42rem 0.85rem",borderRadius:20,border:"none",background:tab===id?"var(--accent)":"rgba(255,255,255,0.06)",color:tab===id?"#000":"#8899AA",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Syne,sans-serif",minHeight:36}}>{icon} {lbl}</button>
  );

  if(!myFamily) return (
    <div>
      <div className="ministry-header">🏢 Ekonomik İmparatorluk</div>
      <div style={{...card,textAlign:"center",padding:"2rem"}}>
        <div style={{fontSize:"2.5rem",marginBottom:"0.5rem"}}>🏢</div>
        <div style={{color:"#5E7390",fontSize:"0.85rem",marginBottom:"1rem"}}>Bu ekrana erişmek için bir aileye üye veya lider olmanız gerekiyor.</div>
        <button className="btn btn-primary" onClick={()=>setCurrentPage("families")}>👪 Aile Sistemine Git</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="ministry-header">🏢 {myFamily.name} — Ekonomik İmparatorluk</div>
      {msg&&(
        <div style={{padding:"0.6rem 0.85rem",borderRadius:10,marginBottom:"0.75rem",background:msg.type==="success"?"rgba(16,185,129,0.12)":msg.type==="error"?"rgba(239,68,68,0.12)":"rgba(59,130,246,0.12)",border:`1px solid ${msg.type==="success"?"rgba(16,185,129,0.3)":msg.type==="error"?"rgba(239,68,68,0.3)":"rgba(59,130,246,0.3)"}`,color:msg.type==="success"?"#10B981":msg.type==="error"?"#EF4444":"#60A5FA",fontSize:"0.82rem",fontWeight:600}}>
          {msg.text}
        </div>
      )}

      {/* Tab bar */}
      <div style={{display:"flex",gap:"0.4rem",overflowX:"auto",paddingBottom:"0.5rem",marginBottom:"0.75rem",scrollbarWidth:"none"}}>
        {tabBtn("overview","Genel","📊")}
        {tabBtn("holdings","Holdinglar","🏢")}
        {tabBtn("factories","Fabrikalar","🏭")}
        {tabBtn("companies","Şirketler","📊")}
        {tabBtn("build","Kur","🔨")}
        {tabBtn("politics","Siyaset","⚑")}
      </div>

      {/* GENEL BAKIŞ */}
      {tab==="overview"&&(
        <div>
          <div style={{...card,background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(0,0,0,0))"}}>
            <div style={{textAlign:"center",padding:"0.75rem"}}>
              <div style={{fontSize:"0.72rem",color:"#5E7390",marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.07em"}}>Aylık Toplam Gelir</div>
              <div style={{fontFamily:"JetBrains Mono,monospace",fontWeight:900,fontSize:"1.8rem",color:"#10B981"}}>{fmtMoney(totalMonthlyIncome)}</div>
              <div style={{fontSize:"0.72rem",color:"#5E7390",marginTop:"0.25rem"}}>Haftalık koruma ödemesi: <span style={{color:"#EF4444",fontWeight:700}}>-{fmtMoney(totalProtectionPaid)}</span></div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.45rem",marginBottom:"0.75rem"}}>
            {[
              {l:"Holding",v:myHoldings.length,c:"#60A5FA",icon:"🏢"},
              {l:"Fabrika",v:myFactories.length,c:"#F59E0B",icon:"🏭"},
              {l:"Şirket",v:myCompanies.length,c:"#A78BFA",icon:"📊"},
            ].map(s=>(
              <div key={s.l} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${s.c}22`,borderRadius:10,padding:"0.6rem",textAlign:"center"}}>
                <div style={{fontSize:"1rem"}}>{s.icon}</div>
                <div style={{fontWeight:900,fontSize:"0.95rem",color:s.c,fontFamily:"Syne,sans-serif"}}>{s.v}</div>
                <div style={{fontSize:"0.58rem",color:"#5E7390",marginTop:"0.1rem"}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Koruma durumu */}
          <div style={card}>
            <div className="card-title">🛡️ Aktif Koruma Anlaşmaları</div>
            {myProtDeals.length===0?(
              <div style={{color:"#5E7390",fontSize:"0.82rem",textAlign:"center",padding:"0.75rem"}}>
                ⚠️ Hiçbir koruma anlaşması yok! Çeteler varlıklarınıza saldırabilir.
              </div>
            ):(
              myProtDeals.map((d,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.45rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div>
                    <div style={{fontSize:"0.82rem",fontWeight:700,color:"#E8EDF2"}}>🔫 {d.gangName}</div>
                    <div style={{fontSize:"0.68rem",color:"#5E7390"}}>{d.coverage} koruyor</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"0.78rem",fontWeight:700,color:"#10B981"}}>{d.schedule==="weekly"?"Haftalık":"Aylık"}</div>
                    <div style={{fontSize:"0.72rem",color:"#EF4444",fontWeight:700}}>-{fmtMoney(d.weeklyFee)}</div>
                  </div>
                </div>
              ))
            )}
            <button className="btn btn-primary" style={{marginTop:"0.75rem",width:"100%"}} onClick={()=>setCurrentPage("protection_deals")}>
              🤝 Koruma Anlaşması Yap
            </button>
          </div>

          {/* Parti fonlama */}
          {isFamilyLeader&&(
            <div style={card}>
              <div className="card-title">⚑ Siyasi Yatırım</div>
              <div style={{fontSize:"0.78rem",color:"#5E7390",marginBottom:"0.75rem"}}>
                Siyasi partileri fonlayarak makam atamalarında söz sahibi olun. Fonladığınız parti kazandığında sizden onay alarak atama yapar.
              </div>
              {fundDeals.filter(d=>d.familyId===myFamily?.id).slice(0,3).map((d,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"0.78rem",padding:"0.35rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{color:"#8899AA"}}>⚑ {d.partyName}</span>
                  <span style={{color:"#A78BFA",fontWeight:700}}>{fmtMoney(d.amount)}</span>
                </div>
              ))}
              <button className="btn" style={{border:"1px solid rgba(167,139,250,0.4)",color:"#A78BFA",width:"100%",marginTop:"0.75rem"}} onClick={fundParty}>
                ⚑ Parti Fonla
              </button>
            </div>
          )}
        </div>
      )}

      {/* HOLDİNGLER */}
      {tab==="holdings"&&(
        <div>
          {myHoldings.length===0?(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🏢</div>
              <div style={{color:"#5E7390",fontSize:"0.82rem"}}>Henüz holding yok.</div>
              {isApprovedManager&&<button className="btn btn-primary" style={{marginTop:"0.75rem"}} onClick={()=>setTab("build")}>🔨 Holding Kur</button>}
            </div>
          ):(
            myHoldings.map(h=>(
              <div key={h.id} style={{...card,borderLeft:`3px solid #60A5FA`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:"0.95rem",color:"#E8EDF2",fontFamily:"Syne,sans-serif"}}>🏢 {h.name}</div>
                    <div style={{fontSize:"0.68rem",color:"#5E7390",marginTop:"0.15rem"}}>Kurucu: {h.owner} · {new Date(h.createdAt).toLocaleDateString("tr-TR")}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"0.78rem",fontWeight:700,color:"#10B981"}}>{fmtMoney(h.monthlyIncome)}/ay</div>
                    {h.protectedBy?<div style={{fontSize:"0.62rem",color:"#10B981"}}>🛡️ {h.protectedBy}</div>:<div style={{fontSize:"0.62rem",color:"#EF4444"}}>⚠️ Korumasız</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:"0.35rem",flexWrap:"wrap"}}>
                  <span style={{background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.2)",borderRadius:6,padding:"0.2rem 0.5rem",fontSize:"0.65rem",color:"#60A5FA"}}>
                    🏭 {(h.factories||[]).length}/5 Fabrika
                  </span>
                  <span style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:6,padding:"0.2rem 0.5rem",fontSize:"0.65rem",color:"#10B981"}}>
                    💰 {fmtMoney(h.budget)} sermaye
                  </span>
                  {h.underAttack&&<span style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:6,padding:"0.2rem 0.5rem",fontSize:"0.65rem",color:"#EF4444"}}>⚔️ SALDIRI ALTINDA</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* FABRİKALAR */}
      {tab==="factories"&&(
        <div>
          {myFactories.length===0?(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🏭</div>
              <div style={{color:"#5E7390",fontSize:"0.82rem"}}>Henüz fabrika yok. Fabrika kurmak için önce bir holding gerekli.</div>
              {isApprovedManager&&myHoldings.length>0&&<button className="btn btn-primary" style={{marginTop:"0.75rem"}} onClick={()=>setTab("build")}>🔨 Fabrika Kur</button>}
            </div>
          ):(
            myFactories.map(f=>(
              <div key={f.id} style={{...card,borderLeft:`3px solid #F59E0B`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:"0.95rem",color:"#E8EDF2",fontFamily:"Syne,sans-serif"}}>🏭 {f.name}</div>
                    <div style={{fontSize:"0.68rem",color:"#5E7390",marginTop:"0.15rem"}}>Kurucu: {f.owner} · {new Date(f.createdAt).toLocaleDateString("tr-TR")}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"0.78rem",fontWeight:700,color:"#10B981"}}>{fmtMoney(f.monthlyIncome)}/ay</div>
                    {f.protectedBy?<div style={{fontSize:"0.62rem",color:"#10B981"}}>🛡️ {f.protectedBy}</div>:<div style={{fontSize:"0.62rem",color:"#EF4444"}}>⚠️ Korumasız</div>}
                  </div>
                </div>
                {f.underAttack&&(
                  <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:8,padding:"0.5rem",marginTop:"0.35rem",fontSize:"0.78rem",color:"#EF4444",fontWeight:600}}>
                    ⚔️ Bu fabrika saldırı altında! Koruma anlaşması olmadığı için savunmasız.
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ŞİRKETLER */}
      {tab==="companies"&&(
        <div>
          {myCompanies.length===0?(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📊</div>
              <div style={{color:"#5E7390",fontSize:"0.82rem"}}>Henüz şirket yok.</div>
              {isApprovedManager&&(myHoldings.length>0||myFactories.length>0)&&<button className="btn btn-primary" style={{marginTop:"0.75rem"}} onClick={()=>setTab("build")}>🔨 Şirket Kur</button>}
            </div>
          ):(
            myCompanies.map(c=>(
              <div key={c.id} style={{...card,borderLeft:`3px solid #A78BFA`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:"0.95rem",color:"#E8EDF2",fontFamily:"Syne,sans-serif"}}>📊 {c.name}</div>
                    <div style={{fontSize:"0.68rem",color:"#5E7390",marginTop:"0.15rem"}}>Kurucu: {c.owner}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"0.78rem",fontWeight:700,color:"#10B981"}}>{fmtMoney(c.monthlyIncome)}/ay</div>
                    {c.protectedBy?<div style={{fontSize:"0.62rem",color:"#10B981"}}>🛡️ {c.protectedBy}</div>:<div style={{fontSize:"0.62rem",color:"#EF4444"}}>⚠️ Korumasız</div>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* İŞLETME KUR */}
      {tab==="build"&&(
        <div>
          {!isApprovedManager?(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🔒</div>
              <div style={{color:"#EF4444",fontSize:"0.85rem",fontWeight:600}}>İşletme kurma yetkisi yok</div>
              <div style={{color:"#5E7390",fontSize:"0.78rem",marginTop:"0.5rem"}}>Sadece aile lideri veya aile liderinin atadığı yöneticiler işletme kurabilir.</div>
            </div>
          ):(
            <div>
              <div style={card}>
                <div className="card-title">🔨 Yeni İşletme Kur</div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  <input className="input-field" placeholder="İşletme adı" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
                  <select className="input-field" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{background:"rgba(255,255,255,0.05)",color:"#E8EDF2",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"0.6rem"}}>
                    {BUSINESS_TYPES.map(b=><option key={b.id} value={b.id} style={{background:"#0a1628"}}>{b.icon} {b.label} — Min {fmtMoney(b.cost)}</option>)}
                  </select>
                  <input className="input-field" type="number" placeholder="Sermaye (₺)" value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))} />
                  <button className="btn btn-primary" onClick={buildBusiness}>🔨 Kur</button>
                </div>
              </div>

              {/* İşletme türleri bilgi */}
              {BUSINESS_TYPES.map(bt=>{
                const check=canBuild(bt.id);
                return (
                  <div key={bt.id} style={{...card,opacity:check.ok?1:0.6,borderLeft:`3px solid ${check.ok?"#10B981":"#EF4444"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:"0.88rem",color:"#E8EDF2"}}>{bt.icon} {bt.label}</div>
                        <div style={{fontSize:"0.72rem",color:"#5E7390",marginTop:"0.2rem"}}>{bt.desc}</div>
                        {!check.ok&&<div style={{fontSize:"0.7rem",color:"#EF4444",marginTop:"0.25rem"}}>⛔ {check.reason}</div>}
                      </div>
                      <div style={{textAlign:"right",flexShrink:0,marginLeft:"0.5rem"}}>
                        <div style={{fontSize:"0.72rem",color:"#F59E0B",fontWeight:700}}>Min {fmtMoney(bt.cost)}</div>
                        <div style={{fontSize:"0.65rem",color:"#10B981"}}>+{fmtMoney(bt.monthlyIncome)}/ay</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SİYASET */}
      {tab==="politics"&&(
        <div>
          <div style={{...card,background:"linear-gradient(135deg,rgba(167,139,250,0.08),rgba(0,0,0,0))"}}>
            <div className="card-title">⚑ Siyasi Güç</div>
            <div style={{fontSize:"0.78rem",color:"#8899AA",marginBottom:"0.75rem",lineHeight:1.5}}>
              Partileri fonlayarak siyasi bağlantılar kurabilir, makam atamalarında söz sahibi olabilirsiniz. Fonladığınız parti kazandığında, sizin onayladığınız kişileri bakanlıklara atayabilir.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.75rem"}}>
              {partiesArr.slice(0,4).map(p=>{
                const myFund = fundDeals.filter(d=>d.familyId===myFamily?.id&&d.partyName===p.name).reduce((a,d)=>a+(d.amount||0),0);
                return (
                  <div key={p.id} style={{background:"rgba(255,255,255,0.04)",border:`1px solid rgba(167,139,250,${myFund>0?0.4:0.1})`,borderRadius:10,padding:"0.6rem"}}>
                    <div style={{fontSize:"0.82rem",fontWeight:700,color:"#E8EDF2"}}>⚑ {p.name}</div>
                    <div style={{fontSize:"0.62rem",color:"#5E7390",marginTop:"0.15rem"}}>Lider: {p.leader}</div>
                    {myFund>0&&<div style={{fontSize:"0.7rem",color:"#A78BFA",fontWeight:700,marginTop:"0.25rem"}}>✓ {fmtMoney(myFund)} fon verdik</div>}
                  </div>
                );
              })}
            </div>
            {isFamilyLeader&&(
              <button className="btn" style={{border:"1px solid rgba(167,139,250,0.4)",color:"#A78BFA",width:"100%"}} onClick={fundParty}>
                ⚑ Parti Fonla
              </button>
            )}
          </div>

          <div style={card}>
            <div className="card-title">📋 Fon Geçmişi</div>
            {fundDeals.filter(d=>d.familyId===myFamily?.id).length===0?(
              <div style={{color:"#5E7390",fontSize:"0.78rem",textAlign:"center",padding:"0.5rem"}}>Henüz fon verilmedi.</div>
            ):(
              fundDeals.filter(d=>d.familyId===myFamily?.id).map((d,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.4rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div>
                    <div style={{fontSize:"0.8rem",fontWeight:600,color:"#E8EDF2"}}>⚑ {d.partyName}</div>
                    <div style={{fontSize:"0.62rem",color:"#5E7390"}}>{new Date(d.date).toLocaleDateString("tr-TR")}</div>
                  </div>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:"#A78BFA"}}>{fmtMoney(d.amount)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
