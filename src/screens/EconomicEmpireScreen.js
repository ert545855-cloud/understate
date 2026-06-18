// ═══════════════════════════════════════════════════════
// UNDERSTATE — Ekonomik İmparatorluk Ekranı
// Aileler → Holding/Fabrika/Şirket kurar
// Fabrika geliri sunucu tarafında doğrulanır (anti-cheat)
// ═══════════════════════════════════════════════════════
window.EconomicEmpireScreen = function EconomicEmpireScreen({ cu, families, gangs, parties, allUsers, setCurrentPage }) {
  const S = {
    load: (k, def) => { try { const v = localStorage.getItem("us_empire_"+k); return v ? JSON.parse(v) : def; } catch { return def; } },
    save: (k, v)   => { try { localStorage.setItem("us_empire_"+k, JSON.stringify(v)); } catch {} },
  };

  const [tab, setTab]             = React.useState("overview");
  const [holdings, setHoldings]   = React.useState(()=>S.load("holdings",[]));
  const [companies, setCompanies] = React.useState(()=>S.load("companies",[]));
  const [fundDeals, setFundDeals] = React.useState(()=>S.load("fundDeals",[]));
  // Sunucu tabanlı aile fabrikaları (anti-cheat: gelir & zamanlama server'da)
  const [serverFactories, setServerFactories] = React.useState([]);
  const [factoriesLoading, setFactoriesLoading] = React.useState(false);
  const [collectingId, setCollectingId] = React.useState(null);
  const [msg, setMsg]   = React.useState(null);
  const [form, setForm] = React.useState({name:"",type:"holding",budget:"",factorySubType:"sarap"});
  const now = Date.now();

  // ── Fabrika alt türleri (server/routes/familyFactory.js ile senkronize) ──────
  const FACTORY_SUBTYPES = [
    {id:"sarap",   label:"Aile Şarap İmalathanesi", icon:"🍷", cost:2500000,  monthlyIncome:220000,  product:"Şarap",        minInfluence:0  },
    {id:"tekstil", label:"Aile Tekstil Atölyesi",   icon:"🧵", cost:3500000,  monthlyIncome:320000,  product:"Lüks Kumaş",   minInfluence:0  },
    {id:"rafine",  label:"Aile Rafinerisi",          icon:"🛢️", cost:7000000,  monthlyIncome:600000,  product:"Petrol Ürünü", minInfluence:0  },
    {id:"insaat",  label:"Aile İnşaat Şirketi",      icon:"🏗️", cost:12000000, monthlyIncome:950000,  product:"Yapı Malz.",   minInfluence:0  },
    {id:"mucevher",label:"Aile Mücevher Atölyesi",  icon:"💎", cost:20000000, monthlyIncome:1600000, product:"Mücevher",     minInfluence:50 },
  ];

  const BUSINESS_TYPES = [
    {id:"holding", label:"Holding", icon:"🏢", cost:5000000, monthlyIncome:500000, desc:"En yüksek yapı. Birden fazla fabrika ve şirketi yönetir."},
    {id:"fabrika", label:"Fabrika", icon:"🏭", cost:0,       monthlyIncome:0,      desc:"Üretim tesisi. Holding altına alınabilir. Maliyet fabrika türüne göre değişir."},
    {id:"sirket",  label:"Şirket",  icon:"📊", cost:800000,  monthlyIncome:80000,  desc:"Ticaret şirketi. Fabrika veya holding gerektirir."},
  ];

  // Socket — çete saldırısı
  React.useEffect(() => {
    const sock = window._socket;
    if (!sock) return;
    const handler = (evt) => {
      const mark = (a) => a.id===evt.assetId ? {...a,underAttack:true,lastAttacker:evt.gangName,lastAttackAt:evt.timestamp} : a;
      setHoldings(prev  => { const u=prev.map(mark); S.save("holdings",u);  return u; });
      setCompanies(prev => { const u=prev.map(mark); S.save("companies",u); return u; });
    };
    sock.on('gang:assetAttacked', handler);
    return () => { sock.off('gang:assetAttacked', handler); };
  }, []);

  const showMsg = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };
  const fmtMoney = (n) => { if(!n&&n!==0)return "₺0"; if(n>=1e9)return "₺"+(n/1e9).toFixed(1)+"Mlr"; if(n>=1e6)return "₺"+(n/1e6).toFixed(1)+"M"; if(n>=1e3)return "₺"+(n/1e3).toFixed(0)+"K"; return "₺"+Math.floor(n); };
  const fmtTime  = (ms) => { const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000); return h>0?`${h}sa ${m}dk`:`${m}dk`; };
  const getToken = () => localStorage.getItem('rep_token')||localStorage.getItem('token')||'';

  const famsArr   = Array.isArray(families)?families:[];
  const partiesArr= Array.isArray(parties)?parties:[];

  const myFamily = famsArr.find(f=>f.leader===cu?.username||(Array.isArray(f.members)&&f.members.includes(cu?.username)));
  const isFamilyLeader   = myFamily?.leader===cu?.username;
  const isApprovedManager= myFamily&&(isFamilyLeader||(Array.isArray(myFamily.managers)&&myFamily.managers.includes(cu?.username)));

  const myHoldings  = holdings.filter(h=>h.familyId===myFamily?.id);
  const myCompanies = companies.filter(c=>c.familyId===myFamily?.id);

  const factoryIncome  = serverFactories.reduce((a,f)=>a+(Number(f.monthlyIncome)||0),0);
  const holdingIncome  = myHoldings.reduce((a,h)=>a+(h.monthlyIncome||0),0);
  const companyIncome  = myCompanies.reduce((a,c)=>a+(c.monthlyIncome||0),0);
  const totalMonthlyIncome = holdingIncome + factoryIncome + companyIncome;
  const myProtDeals = S.load("protDeals",[]).filter(d=>d.familyId===myFamily?.id&&d.status==="active");
  const totalProtectionPaid = myProtDeals.reduce((a,d)=>a+(d.weeklyFee||0),0);

  // Aile fabrikalarını sunucudan yükle
  const loadServerFactories = React.useCallback(() => {
    if(!myFamily?.id) return;
    setFactoriesLoading(true);
    fetch(`/api/family-factory?familyId=${encodeURIComponent(myFamily.id)}`,
      {headers:{'Authorization':'Bearer '+getToken()}})
      .then(r=>r.json())
      .then(d=>{if(d.success)setServerFactories(d.factories||[]);})
      .catch(()=>{})
      .finally(()=>setFactoriesLoading(false));
  }, [myFamily?.id]);

  React.useEffect(()=>{loadServerFactories();},[loadServerFactories]);

  const canBuild = (type) => {
    if(!isApprovedManager) return {ok:false,reason:"Sadece aile lideri veya onaylı yöneticiler işletme kurabilir"};
    if(type==="holding") return {ok:true};
    if(type==="fabrika") {
      if(myHoldings.length===0) return {ok:false,reason:"Fabrika kurmak için önce bir holding gerekli"};
      const maxF = myHoldings.length*5; // max 5 fabrika/holding
      if(serverFactories.length>=maxF) return {ok:false,reason:`Maks. fabrika sayısına ulaşıldı (${maxF}). Yeni holding kurun.`};
      const sel = FACTORY_SUBTYPES.find(s=>s.id===form.factorySubType);
      if(sel?.minInfluence&&(myFamily.influence||0)<sel.minInfluence)
        return {ok:false,reason:`${sel.label} için en az ${sel.minInfluence} aile etkisi gerekli (mevcut: ${myFamily.influence||0})`};
      return {ok:true};
    }
    if(type==="sirket") {
      if(myCompanies.length===0&&myHoldings.length===0&&serverFactories.length===0)
        return {ok:false,reason:"Şirket kurmak için fabrika veya holding gerekli"};
      return {ok:true};
    }
    return {ok:false,reason:"Geçersiz tür"};
  };

  // Fabrika satın alma — maliyet kasa (localStorage) üzerinden, kayıt server'da
  const buildFactory = async (subType, name) => {
    const famsLocal = (()=>{try{return JSON.parse(localStorage.getItem('rep_families')||'[]');}catch{return [];}})();
    const myFamLocal = famsLocal.find(f=>f.id===myFamily?.id);
    if(!myFamLocal) return showMsg("Aile bulunamadı","error");
    if((myFamLocal.treasury||0)<subType.cost)
      return showMsg(`Kasa yetersiz! Gerekli: ${fmtMoney(subType.cost)}, Mevcut: ${fmtMoney(myFamLocal.treasury||0)}`,"error");
    try {
      const r = await fetch('/api/family-factory/buy',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
        body:JSON.stringify({familyId:myFamily.id,factoryType:subType.id,name,familyInfluence:myFamily.influence||0}),
      });
      const d = await r.json();
      if(!d.success) return showMsg(d.msg||'Hata','error');
      // Kasadan düş
      const updFams = famsLocal.map(f=>f.id===myFamily.id?{...f,treasury:(f.treasury||0)-subType.cost}:f);
      localStorage.setItem('rep_families',JSON.stringify(updFams));
      try{window._socket?.emit('family:sync',{families:updFams});}catch(_){}
      setServerFactories(prev=>[...prev,{...d.factory,canCollect:false,dailyIncome:Math.floor(subType.monthlyIncome/30),nextCollectAt:Date.now()+24*3600000}]);
      setForm({name:"",type:"holding",budget:"",factorySubType:"sarap"});
      showMsg(`${subType.icon} "${name}" kuruldu! Kasadan ${fmtMoney(subType.cost)} düşüldü. ✓`,"success");
    } catch { showMsg("Sunucu bağlantısı başarısız","error"); }
  };

  const buildBusiness = async () => {
    if(!form.name.trim()) return showMsg("İşletme adı zorunlu","error");
    const check = canBuild(form.type);
    if(!check.ok) return showMsg(check.reason,"error");

    if(form.type==="fabrika") {
      const subType = FACTORY_SUBTYPES.find(s=>s.id===form.factorySubType);
      if(!subType) return showMsg("Fabrika türü seçin","error");
      return await buildFactory(subType, form.name.trim());
    }

    const bt = BUSINESS_TYPES.find(b=>b.id===form.type);
    if(!bt) return;
    const budget = parseInt(form.budget);
    if(isNaN(budget)||budget<bt.cost) return showMsg(`Minimum sermaye: ${fmtMoney(bt.cost)}`,"error");
    const entry = {
      id:`biz_${Date.now()}`,name:form.name.trim(),type:form.type,
      familyId:myFamily.id,familyName:myFamily.name,owner:cu.username,
      budget,monthlyIncome:bt.monthlyIncome,createdAt:now,
      underAttack:false,protectedBy:null,attackHistory:[],employees:0,
    };
    if(form.type==="holding"){const u=[...holdings,{...entry,factories:[]}];setHoldings(u);S.save("holdings",u);}
    else{const u=[...companies,entry];setCompanies(u);S.save("companies",u);}
    setForm({name:"",type:"holding",budget:"",factorySubType:"sarap"});
    showMsg(`${bt.icon} "${entry.name}" kuruldu! ✓`,"success");
  };

  // Gelir topla — sunucu tarafında doğrulanır
  const collectFactory = async (factoryId) => {
    setCollectingId(factoryId);
    try {
      const r = await fetch('/api/family-factory/collect',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
        body:JSON.stringify({factoryId,familyId:myFamily.id}),
      });
      const d = await r.json();
      if(!d.success){showMsg(d.msg||'Toplama başarısız','error');return;}
      // Kasaya ekle
      const famsLocal=(()=>{try{return JSON.parse(localStorage.getItem('rep_families')||'[]');}catch{return [];}})();
      const updFams=famsLocal.map(f=>f.id===myFamily.id?{...f,treasury:(f.treasury||0)+d.earned}:f);
      localStorage.setItem('rep_families',JSON.stringify(updFams));
      try{window._socket?.emit('family:sync',{families:updFams});}catch(_){}
      setServerFactories(prev=>prev.map(f=>f.id===factoryId
        ?{...f,canCollect:false,lastCollectedAt:Date.now(),nextCollectAt:d.nextCollectAt}:f));
      showMsg(`✓ ${fmtMoney(d.earned)} kasaya aktarıldı!`,"success");
    } catch{showMsg("Sunucu bağlantısı başarısız","error");}
    finally{setCollectingId(null);}
  };

  const fundParty = () => {
    if(!isFamilyLeader) return showMsg("Sadece aile lideri parti fonlayabilir","error");
    const partyName = prompt("Fonlamak istediğiniz parti:"); if(!partyName) return;
    const amount = parseInt(prompt("Fon miktarı (₺):")); if(!amount||isNaN(amount)) return showMsg("Geçerli miktar girin","error");
    const deal={id:`fund_${Date.now()}`,familyId:myFamily?.id,familyName:myFamily?.name,partyName,amount,date:now,type:"party_fund"};
    const upd=[...fundDeals,deal]; setFundDeals(upd); S.save("fundDeals",upd);
    showMsg(`${partyName} partisine ${fmtMoney(amount)} fon gönderildi! ✓`,"success");
  };

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
        <button className="btn btn-primary" onClick={()=>setCurrentPage("family")}>👪 Aile Sistemine Git</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="ministry-header">🏢 {myFamily.name} — Ekonomik İmparatorluk</div>
      {msg&&(
        <div style={{padding:"0.6rem 0.85rem",borderRadius:10,marginBottom:"0.75rem",
          background:msg.type==="success"?"rgba(16,185,129,0.12)":msg.type==="error"?"rgba(239,68,68,0.12)":"rgba(59,130,246,0.12)",
          border:`1px solid ${msg.type==="success"?"rgba(16,185,129,0.3)":msg.type==="error"?"rgba(239,68,68,0.3)":"rgba(59,130,246,0.3)"}`,
          color:msg.type==="success"?"#10B981":msg.type==="error"?"#EF4444":"#60A5FA",
          fontSize:"0.82rem",fontWeight:600}}>
          {msg.text}
        </div>
      )}

      <div style={{display:"flex",gap:"0.4rem",overflowX:"auto",paddingBottom:"0.5rem",marginBottom:"0.75rem",scrollbarWidth:"none"}}>
        {tabBtn("overview","Genel","📊")}
        {tabBtn("holdings","Holdinglar","🏢")}
        {tabBtn("factories","Fabrikalar","🏭")}
        {tabBtn("companies","Şirketler","📊")}
        {tabBtn("build","Kur","🔨")}
        {tabBtn("politics","Siyaset","⚑")}
      </div>

      {/* ── GENEL BAKIŞ ─────────────────────────────────────────── */}
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
              {l:"Fabrika",v:serverFactories.length,c:"#F59E0B",icon:"🏭"},
              {l:"Şirket",v:myCompanies.length,c:"#A78BFA",icon:"📊"},
            ].map(s=>(
              <div key={s.l} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${s.c}22`,borderRadius:10,padding:"0.6rem",textAlign:"center"}}>
                <div style={{fontSize:"1rem"}}>{s.icon}</div>
                <div style={{fontWeight:900,fontSize:"0.95rem",color:s.c,fontFamily:"Syne,sans-serif"}}>{s.v}</div>
                <div style={{fontSize:"0.58rem",color:"#5E7390",marginTop:"0.1rem"}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={card}>
            <div className="card-title">🛡️ Aktif Koruma Anlaşmaları</div>
            {myProtDeals.length===0?(
              <div style={{color:"#5E7390",fontSize:"0.82rem",textAlign:"center",padding:"0.75rem"}}>⚠️ Hiçbir koruma anlaşması yok! Çeteler varlıklarınıza saldırabilir.</div>
            ):myProtDeals.map((d,i)=>(
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
            ))}
            <button className="btn btn-primary" style={{marginTop:"0.75rem",width:"100%"}} onClick={()=>setCurrentPage("protection_deals")}>🤝 Koruma Anlaşması Yap</button>
          </div>
          {isFamilyLeader&&(
            <div style={card}>
              <div className="card-title">⚑ Siyasi Yatırım</div>
              <div style={{fontSize:"0.78rem",color:"#5E7390",marginBottom:"0.75rem"}}>Siyasi partileri fonlayarak makam atamalarında söz sahibi olun.</div>
              {fundDeals.filter(d=>d.familyId===myFamily?.id).slice(0,3).map((d,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"0.78rem",padding:"0.35rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{color:"#8899AA"}}>⚑ {d.partyName}</span>
                  <span style={{color:"#A78BFA",fontWeight:700}}>{fmtMoney(d.amount)}</span>
                </div>
              ))}
              <button className="btn" style={{border:"1px solid rgba(167,139,250,0.4)",color:"#A78BFA",width:"100%",marginTop:"0.75rem"}} onClick={fundParty}>⚑ Parti Fonla</button>
            </div>
          )}
        </div>
      )}

      {/* ── HOLDİNGLER ─────────────────────────────────────────── */}
      {tab==="holdings"&&(
        <div>
          {myHoldings.length===0?(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🏢</div>
              <div style={{color:"#5E7390",fontSize:"0.82rem"}}>Henüz holding yok.</div>
              {isApprovedManager&&<button className="btn btn-primary" style={{marginTop:"0.75rem"}} onClick={()=>setTab("build")}>🔨 Holding Kur</button>}
            </div>
          ):myHoldings.map(h=>(
            <div key={h.id} style={{...card,borderLeft:"3px solid #60A5FA"}}>
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
                <span style={{background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.2)",borderRadius:6,padding:"0.2rem 0.5rem",fontSize:"0.65rem",color:"#60A5FA"}}>🏭 {serverFactories.length}/{myHoldings.length*5} Fabrika</span>
                <span style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:6,padding:"0.2rem 0.5rem",fontSize:"0.65rem",color:"#10B981"}}>💰 {fmtMoney(h.budget)} sermaye</span>
                {h.underAttack&&<span style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:6,padding:"0.2rem 0.5rem",fontSize:"0.65rem",color:"#EF4444"}}>⚔️ SALDIRI ALTINDA</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FABRİKALAR — sunucu tabanlı, anti-cheat ─────────────── */}
      {tab==="factories"&&(
        <div>
          {factoriesLoading?(
            <div style={{textAlign:"center",padding:"2rem",color:"#5E7390",fontSize:"0.85rem"}}>⏳ Yükleniyor...</div>
          ):serverFactories.length===0?(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🏭</div>
              <div style={{color:"#5E7390",fontSize:"0.82rem",marginBottom:"0.5rem"}}>Henüz aile fabrikası yok. Fabrika kurmak için önce bir holding gerekli.</div>
              {isApprovedManager&&myHoldings.length>0&&<button className="btn btn-primary" onClick={()=>setTab("build")}>🔨 Fabrika Kur</button>}
            </div>
          ):(
            <div>
              <div style={{...card,background:"linear-gradient(135deg,rgba(245,158,11,0.08),rgba(0,0,0,0))"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:"0.68rem",color:"#5E7390",textTransform:"uppercase",letterSpacing:"0.06em"}}>Toplam Aylık Fabrika Geliri</div>
                    <div style={{fontFamily:"JetBrains Mono,monospace",fontWeight:900,fontSize:"1.3rem",color:"#F59E0B"}}>{fmtMoney(factoryIncome)}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"0.62rem",color:"#5E7390"}}>Günlük Toplam</div>
                    <div style={{fontSize:"0.95rem",fontWeight:700,color:"#10B981"}}>{fmtMoney(serverFactories.reduce((a,f)=>a+Math.floor((f.monthlyIncome||0)/30),0))}</div>
                  </div>
                </div>
              </div>
              {serverFactories.map(f=>{
                const sub     = FACTORY_SUBTYPES.find(s=>s.id===f.factoryType)||{icon:"🏭",label:f.factoryType,product:""};
                const canColl = f.canCollect || Number(f.lastCollectedAt)===0;
                const nextAt  = f.nextCollectAt || (Number(f.lastCollectedAt)||0)+24*3600000;
                const rem     = Math.max(0, nextAt - Date.now());
                const isColl  = collectingId===f.id;
                const daily   = Math.floor((f.monthlyIncome||0)/30);
                return (
                  <div key={f.id} style={{...card,borderLeft:"3px solid #F59E0B"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.45rem"}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:"0.92rem",color:"#E8EDF2",fontFamily:"Syne,sans-serif"}}>{sub.icon} {f.name}</div>
                        <div style={{fontSize:"0.68rem",color:"#5E7390",marginTop:"0.1rem"}}>{sub.label}{sub.product?` · ${sub.product}`:""}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0,marginLeft:"0.5rem"}}>
                        <div style={{fontSize:"0.72rem",fontWeight:700,color:"#10B981"}}>{fmtMoney(f.monthlyIncome)}/ay</div>
                        <div style={{fontSize:"0.62rem",color:"#F59E0B"}}>{fmtMoney(daily)}/gün</div>
                      </div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:"0.68rem",color:canColl?"#10B981":"#5E7390"}}>
                        {canColl?"✅ Toplanabilir":"⏳ "+fmtTime(rem)+" sonra"}
                      </div>
                      <button
                        className="btn btn-primary"
                        disabled={!canColl||isColl}
                        style={{fontSize:"0.72rem",padding:"0.3rem 0.75rem",opacity:canColl&&!isColl?1:0.45}}
                        onClick={()=>collectFactory(f.id)}>
                        {isColl?"...":canColl?"💰 Topla":"⏳ Bekle"}
                      </button>
                    </div>
                  </div>
                );
              })}
              <button style={{width:"100%",background:"none",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"0.45rem",color:"#5E7390",fontSize:"0.72rem",cursor:"pointer"}} onClick={loadServerFactories}>🔄 Yenile</button>
            </div>
          )}
        </div>
      )}

      {/* ── ŞİRKETLER ─────────────────────────────────────────── */}
      {tab==="companies"&&(
        <div>
          {myCompanies.length===0?(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📊</div>
              <div style={{color:"#5E7390",fontSize:"0.82rem"}}>Henüz şirket yok.</div>
              {isApprovedManager&&(myHoldings.length>0||serverFactories.length>0)&&<button className="btn btn-primary" style={{marginTop:"0.75rem"}} onClick={()=>setTab("build")}>🔨 Şirket Kur</button>}
            </div>
          ):myCompanies.map(c=>(
            <div key={c.id} style={{...card,borderLeft:"3px solid #A78BFA"}}>
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
          ))}
        </div>
      )}

      {/* ── İŞLETME KUR ─────────────────────────────────────────── */}
      {tab==="build"&&(
        <div>
          {!isApprovedManager?(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🔒</div>
              <div style={{color:"#EF4444",fontSize:"0.85rem",fontWeight:600}}>İşletme kurma yetkisi yok</div>
              <div style={{color:"#5E7390",fontSize:"0.78rem",marginTop:"0.5rem"}}>Sadece aile lideri veya onaylı yöneticiler işletme kurabilir.</div>
            </div>
          ):(
            <div>
              <div style={card}>
                <div className="card-title">🔨 Yeni İşletme Kur</div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  <input className="input-field" placeholder="İşletme adı" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
                  <select className="input-field" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{background:"rgba(255,255,255,0.05)",color:"#E8EDF2",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"0.6rem"}}>
                    {BUSINESS_TYPES.map(b=><option key={b.id} value={b.id} style={{background:"#0a1628"}}>{b.icon} {b.label}{b.cost>0?` — Min ${fmtMoney(b.cost)}`:""}</option>)}
                  </select>

                  {/* Fabrika alt türü seçimi */}
                  {form.type==="fabrika"&&(
                    <div style={{marginTop:"0.25rem"}}>
                      <div style={{fontSize:"0.72rem",color:"#8899AA",marginBottom:"0.4rem"}}>Fabrika Türü Seçin:</div>
                      {FACTORY_SUBTYPES.map(st=>{
                        const locked = st.minInfluence>0&&(myFamily.influence||0)<st.minInfluence;
                        const sel    = form.factorySubType===st.id;
                        return (
                          <div key={st.id} onClick={()=>!locked&&setForm(p=>({...p,factorySubType:st.id}))}
                            style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                              padding:"0.55rem 0.75rem",borderRadius:10,marginBottom:"0.35rem",cursor:locked?"not-allowed":"pointer",
                              border:`1px solid ${sel?"rgba(245,158,11,0.5)":locked?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.08)"}`,
                              background:sel?"rgba(245,158,11,0.08)":locked?"rgba(0,0,0,0.15)":"rgba(255,255,255,0.02)",
                              opacity:locked?0.45:1}}>
                            <div>
                              <span style={{fontSize:"0.9rem"}}>{st.icon}</span>
                              <span style={{fontSize:"0.82rem",fontWeight:700,color:sel?"#F59E0B":"#E8EDF2",marginLeft:"0.4rem"}}>{st.label}</span>
                              {st.minInfluence>0&&<span style={{marginLeft:"0.4rem",fontSize:"0.62rem",color:"#A78BFA"}}>⭐{st.minInfluence}+ etki</span>}
                            </div>
                            <div style={{textAlign:"right",flexShrink:0}}>
                              <div style={{fontSize:"0.68rem",color:"#F59E0B",fontWeight:700}}>{fmtMoney(st.cost)}</div>
                              <div style={{fontSize:"0.6rem",color:"#10B981"}}>+{fmtMoney(st.monthlyIncome)}/ay</div>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{fontSize:"0.72rem",color:"#5E7390",padding:"0.4rem 0.6rem",background:"rgba(245,158,11,0.06)",borderRadius:8,marginTop:"0.25rem"}}>
                        💡 Maliyet <b>aile kasasından</b> düşülür · Günlük gelir 24 saatte bir "Topla" ile kasaya aktarılır
                      </div>
                    </div>
                  )}

                  {form.type!=="fabrika"&&(
                    <input className="input-field" type="number" placeholder="Sermaye (₺)" value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))}/>
                  )}

                  {(()=>{const ch=canBuild(form.type);return !ch.ok&&<div style={{fontSize:"0.72rem",color:"#EF4444",padding:"0.35rem 0.5rem",background:"rgba(239,68,68,0.08)",borderRadius:8}}>⛔ {ch.reason}</div>;})()}
                  <button className="btn btn-primary" onClick={buildBusiness}>🔨 Kur</button>
                </div>
              </div>

              {BUSINESS_TYPES.filter(bt=>bt.id!=="fabrika").map(bt=>{
                const ch=canBuild(bt.id);
                return (
                  <div key={bt.id} style={{...card,opacity:ch.ok?1:0.6,borderLeft:`3px solid ${ch.ok?"#10B981":"#EF4444"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:"0.88rem",color:"#E8EDF2"}}>{bt.icon} {bt.label}</div>
                        <div style={{fontSize:"0.72rem",color:"#5E7390",marginTop:"0.2rem"}}>{bt.desc}</div>
                        {!ch.ok&&<div style={{fontSize:"0.7rem",color:"#EF4444",marginTop:"0.25rem"}}>⛔ {ch.reason}</div>}
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

      {/* ── SİYASET ─────────────────────────────────────────────── */}
      {tab==="politics"&&(
        <div>
          <div style={{...card,background:"linear-gradient(135deg,rgba(167,139,250,0.08),rgba(0,0,0,0))"}}>
            <div className="card-title">⚑ Siyasi Güç</div>
            <div style={{fontSize:"0.78rem",color:"#8899AA",marginBottom:"0.75rem",lineHeight:1.5}}>
              Partileri fonlayarak siyasi bağlantılar kurabilir, makam atamalarında söz sahibi olabilirsiniz.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.75rem"}}>
              {partiesArr.slice(0,4).map(p=>{
                const myFund=fundDeals.filter(d=>d.familyId===myFamily?.id&&d.partyName===p.name).reduce((a,d)=>a+(d.amount||0),0);
                return (
                  <div key={p.id} style={{background:"rgba(255,255,255,0.04)",border:`1px solid rgba(167,139,250,${myFund>0?0.4:0.1})`,borderRadius:10,padding:"0.6rem"}}>
                    <div style={{fontSize:"0.82rem",fontWeight:700,color:"#E8EDF2"}}>⚑ {p.name}</div>
                    <div style={{fontSize:"0.62rem",color:"#5E7390",marginTop:"0.15rem"}}>Lider: {p.leaderName||p.leader}</div>
                    {myFund>0&&<div style={{fontSize:"0.65rem",color:"#A78BFA",marginTop:"0.2rem",fontWeight:700}}>Fon: {fmtMoney(myFund)}</div>}
                  </div>
                );
              })}
            </div>
            {isFamilyLeader&&<button className="btn" style={{border:"1px solid rgba(167,139,250,0.4)",color:"#A78BFA",width:"100%"}} onClick={fundParty}>⚑ Parti Fonla</button>}
          </div>
        </div>
      )}
    </div>
  );
};
