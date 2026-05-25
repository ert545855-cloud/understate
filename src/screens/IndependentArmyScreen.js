// ═══════════════════════════════════════════════════════
// UNDERSTATE — Bağımsız Ordu Sistemi (Yeni Senaryo)
//
// KURALLAR:
// • Ordu tamamen bağımsız — siyasi makamlar atayamaz
// • Askeri puan toplamak zorunda (görev, taktik, operasyon)
// • Gerekli puana ulaşanlar Genelkurmay/komutan adayı olabilir
// • Seçilen subaylar HİÇBİR örgüte giremez (aile/çete/parti)
// • Devlet → orduya maaş ödemek zorunda (hazineden)
// • Ordu → çetelere saldırabilir (koşul: çete suç puanı yeterli)
// • Çeteler → orduya SALDIRAMAZLAR
// ═══════════════════════════════════════════════════════
window.IndependentArmyScreen = function IndependentArmyScreen({ cu, allUsers, families, gangs, parties, setCurrentPage }) {
  const S = {
    load: (k, def) => { try { const v = localStorage.getItem("us_indarmy_"+k); return v ? JSON.parse(v) : def; } catch { return def; } },
    save: (k, v)   => { try { localStorage.setItem("us_indarmy_"+k, JSON.stringify(v)); } catch {} },
  };

  const [tab, setTab]           = React.useState("overview");
  const [soldiers, setSoldiers] = React.useState(()=>S.load("soldiers",{}));
  const [missions, setMissions] = React.useState(()=>S.load("missions",{}));
  const [operations, setOps]    = React.useState(()=>S.load("ops",[]));
  const [candidates, setCands]  = React.useState(()=>S.load("candidates",[]));
  const [payroll, setPayroll]   = React.useState(()=>S.load("payroll",[]));
  const [msg, setMsg] = React.useState(null);
  const now = Date.now();

  const showMsg = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };
  const fmtMoney = (n) => { if(!n)return "₺0"; if(n>=1e6)return "₺"+(n/1e6).toFixed(1)+"M"; if(n>=1e3)return "₺"+(n/1e3).toFixed(0)+"K"; return "₺"+n; };
  const fmtTime  = (ms) => { if(ms<=0)return "Bitti"; const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000); return `${h}s ${m}dk`; };

  const gangsArr   = Array.isArray(gangs)?gangs:[];
  const famsArr    = Array.isArray(families)?families:[];
  const partiesArr = Array.isArray(parties)?parties:[];
  const usersArr   = Array.isArray(allUsers)?allUsers:[];

  // Orduda bağlantı kontrolü — hiçbir örgüte bağlı olmamalı
  const isInOrg = (username) => {
    if(gangsArr.some(g=>g.leader===username||(Array.isArray(g.members)&&g.members.includes(username)))) return "Çete";
    if(famsArr.some(f=>f.leader===username||(Array.isArray(f.members)&&f.members.includes(username)))) return "Aile";
    if(partiesArr.some(p=>p.leader===username||(Array.isArray(p.members)&&p.members.includes(username)))) return "Parti";
    return null;
  };

  const myOrg = isInOrg(cu?.username);
  const mySoldier = soldiers[cu?.username];
  const isEnlisted = !!mySoldier;
  const myMission  = missions[cu?.username];
  const missionActive = myMission && myMission.end > now;
  const missionDone   = myMission && myMission.end <= now && !myMission.collected;

  // Rütbe sistemi (askeri puan = MP)
  const RANKS = [
    {id:"private",   label:"Er",           minMP:0,     icon:"🪖",  salary:8000,   commandLevel:0},
    {id:"corporal",  label:"Onbaşı",       minMP:1000,  icon:"⭐",  salary:14000,  commandLevel:0},
    {id:"sergeant",  label:"Çavuş",        minMP:3000,  icon:"⭐⭐",salary:22000,  commandLevel:0},
    {id:"lieutenant",label:"Teğmen",       minMP:8000,  icon:"🏅",  salary:35000,  commandLevel:1},
    {id:"captain",   label:"Yüzbaşı",      minMP:20000, icon:"🏅🏅",salary:55000,  commandLevel:1},
    {id:"major",     label:"Binbaşı",      minMP:50000, icon:"🥇",  salary:80000,  commandLevel:2},
    {id:"colonel",   label:"Albay",        minMP:120000,icon:"🥇🥇",salary:120000, commandLevel:2},
    {id:"general",   label:"General",      minMP:300000,icon:"⭐⭐⭐",salary:200000,commandLevel:3},
    {id:"chief",     label:"Genelkurmay",  minMP:800000,icon:"🎖️",  salary:350000, commandLevel:4},
  ];

  // Görev listesi
  const MISSIONS = [
    {id:"patrol",    title:"Devriye",      dur:2*3600000,  rewardMP:150,  rewardMoney:5000,  minRank:"private",   icon:"🚶"},
    {id:"training",  title:"Silah Eğitimi",dur:3*3600000,  rewardMP:300,  rewardMoney:8000,  minRank:"private",   icon:"🎯"},
    {id:"recon",     title:"Keşif",        dur:6*3600000,  rewardMP:700,  rewardMoney:15000, minRank:"corporal",  icon:"🔭"},
    {id:"logistics", title:"Lojistik",     dur:4*3600000,  rewardMP:500,  rewardMoney:12000, minRank:"sergeant",  icon:"📦"},
    {id:"tactics",   title:"Taktik Planı", dur:8*3600000,  rewardMP:1500, rewardMoney:30000, minRank:"lieutenant",icon:"🗺️"},
    {id:"operation", title:"Operasyon",    dur:12*3600000, rewardMP:4000, rewardMoney:80000, minRank:"captain",   icon:"⚔️"},
    {id:"coup_prevention",title:"Darbe Önleme",dur:24*3600000,rewardMP:12000,rewardMoney:200000,minRank:"colonel",icon:"🛡️"},
  ];

  const rankIdx = (rankId) => RANKS.findIndex(r=>r.id===rankId);
  const myRankData = isEnlisted ? (RANKS.find(r=>r.id===mySoldier.rank)||RANKS[0]) : RANKS[0];
  const nextRank   = isEnlisted ? RANKS[rankIdx(myRankData.id)+1] : RANKS[1];
  const progress   = nextRank && isEnlisted ? Math.min(100,Math.round(((mySoldier.mp||0)-myRankData.minMP)/Math.max(1,nextRank.minMP-myRankData.minMP)*100)) : 100;

  // Komuta sistemi
  const allSoldierList = Object.values(soldiers);
  const generals  = allSoldierList.filter(s=>rankIdx(s.rank)>=rankIdx("general"));
  const chief     = allSoldierList.find(s=>s.rank==="chief");
  const isChief   = chief?.username===cu?.username;
  const isGeneral = mySoldier && rankIdx(mySoldier.rank) >= rankIdx("general");

  // Genelkurmay adaylığı — min 800K MP, hiçbir örgüt üyesi değil
  const MIN_MP_CHIEF = 800000;
  const canBecomeChief = isEnlisted && (mySoldier.mp||0)>=MIN_MP_CHIEF && !myOrg;

  // Ordu maaş fonu (devlet hazinesinden)
  const totalWeeklySalary = allSoldierList.reduce((a,s)=>{
    const r = RANKS.find(r=>r.id===s.rank);
    return a+(r?.salary||0);
  },0);

  // Kayıt
  const enlist = () => {
    if(isEnlisted) return showMsg("Zaten orduda kayıtlısınız","error");
    if(myOrg) return showMsg(`Orduja katılmak için önce ${myOrg} üyeliğinizden çıkmanız gerekiyor. Subay adayları hiçbir örgüte bağlı olamaz.`,"error");
    const s = {username:cu.username,rank:"private",mp:0,salary:8000,enrolledAt:now,missions:0};
    const upd = {...soldiers,[cu.username]:s};
    setSoldiers(upd); S.save("soldiers",upd);
    showMsg("Orduya katıldınız! 🪖 Bağımsız bir asker olarak görev yapacaksınız.","success");
  };

  const discharge = () => {
    if(!isEnlisted) return;
    const upd = {...soldiers};
    delete upd[cu.username];
    setSoldiers(upd); S.save("soldiers",upd);
    showMsg("Terhis oldunuz.","info");
  };

  // Görev başlat
  const startMission = (m) => {
    if(!isEnlisted) return showMsg("Göreve başlamak için orduda kayıtlı olmanız gerekiyor","error");
    if(missionActive) return showMsg("Aktif göreviniz var","error");
    if(myOrg) return showMsg(`${myOrg} üyeliğiyle görev yapamazsınız. Önce örgütten ayrılın.`,"error");
    // Level/rank check removed — all enlisted soldiers can attempt any mission
    const upd = {...missions,[cu.username]:{missionId:m.id,title:m.title,start:now,end:now+m.dur,rewardMP:m.rewardMP,rewardMoney:m.rewardMoney,collected:false}};
    setMissions(upd); S.save("missions",upd);
    showMsg(`"${m.title}" görevi başladı!`,"success");
  };

  // Görev topla
  const collectMission = () => {
    if(!missionDone) return;
    const newMP = (mySoldier.mp||0)+myMission.rewardMP;
    const newRank = RANKS.filter(r=>r.minMP<=newMP).pop()?.id||"private";
    const upd = {...soldiers,[cu.username]:{...mySoldier,mp:newMP,rank:newRank,missions:(mySoldier.missions||0)+1}};
    setSoldiers(upd); S.save("soldiers",upd);
    const mUpd = {...missions,[cu.username]:{...myMission,collected:true}};
    setMissions(mUpd); S.save("missions",mUpd);
    const promoted = newRank!==mySoldier.rank;
    showMsg(`Görev tamamlandı! +${myMission.rewardMP} MP${promoted?` · Rütbe: ${RANKS.find(r=>r.id===newRank)?.label}! 🎖️`:""}`,promoted?"success":"info");
  };

  // Çeteye operasyon başlat (General+ yeterli)
  const launchOp = () => {
    if(!isGeneral) return showMsg("Operasyon başlatmak için General rütbesi gerekli","error");
    if(myOrg) return showMsg(`Aktif ${myOrg} üyeliğiyle operasyon başlatamazsınız.`,"error");
    const gangName = prompt("Hedef çete adı:");
    if(!gangName) return;
    const targetGang = gangsArr.find(g=>g.name.toLowerCase()===gangName.toLowerCase());
    if(!targetGang) return showMsg("Çete bulunamadı","error");
    // Koşul: çetenin suç puanı yeterli VEYA aktif saldırı var
    const gangCrimePower = targetGang.crimePower||0;
    const THRESHOLD = 50;
    if(gangCrimePower<THRESHOLD&&!operations.some(o=>o.gangId===targetGang.id&&Date.now()-o.timestamp<3600000*24)) {
      return showMsg(`Bu çetenin suç puanı yetersiz (${gangCrimePower}/${THRESHOLD}). Aktif saldırı vakası da yok.`,"error");
    }
    const op = {
      id:`op_${Date.now()}`,
      gangName:targetGang.name,
      gangId:targetGang.id,
      commander:cu.username,
      timestamp:now,
      status:"active",
      outcome:null,
    };
    const upd = [...operations, op];
    setOps(upd); S.save("ops",upd);
    showMsg(`${targetGang.name} çetesine operasyon başlatıldı! Ordu saldırıya geçiyor. ⚔️`,"success");
  };

  // Genelkurmay adaylığı
  const applyChief = () => {
    if(!canBecomeChief) return;
    if(candidates.some(c=>c.username===cu.username&&c.status==="pending")) return showMsg("Zaten adaysınız","error");
    const cand = {id:`cnd_${Date.now()}`,username:cu.username,mp:mySoldier.mp,appliedAt:now,status:"pending"};
    const upd = [...candidates, cand];
    setCands(upd); S.save("candidates",upd);
    showMsg("Genelkurmay Başkanlığı adaylığına başvurdunuz! Seçim oylaması başlayacak.","success");
  };

  const card = {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"1rem",marginBottom:"0.75rem"};
  const tabBtn = (id,lbl,icon) => (
    <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"0.42rem 0.85rem",borderRadius:20,border:"none",background:tab===id?"var(--accent)":"rgba(255,255,255,0.06)",color:tab===id?"#000":"#8899AA",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Syne,sans-serif",minHeight:36}}>{icon} {lbl}</button>
  );

  return (
    <div>
      <div className="ministry-header">🪖 Bağımsız Ordu</div>
      {msg&&(
        <div style={{padding:"0.6rem 0.85rem",borderRadius:10,marginBottom:"0.75rem",background:msg.type==="success"?"rgba(16,185,129,0.12)":msg.type==="error"?"rgba(239,68,68,0.12)":"rgba(59,130,246,0.12)",border:`1px solid ${msg.type==="success"?"rgba(16,185,129,0.3)":msg.type==="error"?"rgba(239,68,68,0.3)":"rgba(59,130,246,0.3)"}`,color:msg.type==="success"?"#10B981":msg.type==="error"?"#EF4444":"#60A5FA",fontSize:"0.82rem",fontWeight:600}}>
          {msg.text}
        </div>
      )}

      {/* Örgüt uyarısı */}
      {myOrg&&(
        <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"0.75rem",marginBottom:"0.75rem",fontSize:"0.8rem",color:"#EF4444",fontWeight:600}}>
          ⚠️ {myOrg} üyesisiniz. Subay adayları ve aktif askerler hiçbir örgüte bağlı olamaz. Üyeliğinizden ayrılmadan görev yapamazsınız.
        </div>
      )}

      {/* Tab bar */}
      <div style={{display:"flex",gap:"0.4rem",overflowX:"auto",paddingBottom:"0.5rem",marginBottom:"0.75rem",scrollbarWidth:"none"}}>
        {tabBtn("overview","Genel","📊")}
        {tabBtn("my","Kariyerim","🎖️")}
        {tabBtn("missions","Görevler","🎯")}
        {tabBtn("ranking","Sıralama","🏆")}
        {tabBtn("command","Komuta","⚔️")}
        {tabBtn("budget","Bütçe","💰")}
        {tabBtn("rules","Kurallar","📋")}
      </div>

      {/* GENEL BAKIŞ */}
      {tab==="overview"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.45rem",marginBottom:"0.75rem"}}>
            {[
              {l:"Toplam Asker",v:allSoldierList.length,c:"#60A5FA",icon:"🪖"},
              {l:"General Sayısı",v:generals.length,c:"#F59E0B",icon:"⭐⭐⭐"},
              {l:"Aktif Operasyon",v:operations.filter(o=>o.status==="active").length,c:"#EF4444",icon:"⚔️"},
            ].map(s=>(
              <div key={s.l} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${s.c}22`,borderRadius:10,padding:"0.6rem",textAlign:"center"}}>
                <div style={{fontSize:"1rem"}}>{s.icon}</div>
                <div style={{fontWeight:900,fontSize:"0.95rem",color:s.c,fontFamily:"Syne,sans-serif"}}>{s.v}</div>
                <div style={{fontSize:"0.58rem",color:"#5E7390",marginTop:"0.1rem"}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Genelkurmay */}
          <div style={card}>
            <div className="card-title">🎖️ Komuta Zinciri</div>
            {chief?(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,marginBottom:"0.5rem"}}>
                <div>
                  <div style={{fontSize:"0.85rem",fontWeight:700,color:"#F59E0B"}}>🎖️ Genelkurmay Başkanı</div>
                  <div style={{fontSize:"0.72rem",color:"#8899AA"}}>{chief.username}</div>
                </div>
                <div style={{fontSize:"0.72rem",color:"#F59E0B",fontWeight:700}}>{(chief.mp||0).toLocaleString()} MP</div>
              </div>
            ):(
              <div style={{textAlign:"center",color:"#5E7390",fontSize:"0.78rem",padding:"0.5rem"}}>Henüz Genelkurmay Başkanı yok</div>
            )}
            {generals.filter(g=>g.username!==chief?.username).slice(0,3).map((g,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.4rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <span style={{fontSize:"0.8rem",color:"#E8EDF2"}}>⭐⭐⭐ {g.username}</span>
                <span style={{fontSize:"0.7rem",color:"#5E7390"}}>{(g.mp||0).toLocaleString()} MP</span>
              </div>
            ))}
          </div>

          {/* Kayıt butonu */}
          {!isEnlisted?(
            <button className="btn btn-primary" style={{width:"100%"}} onClick={enlist} disabled={!!myOrg}>
              🪖 {myOrg?`Önce ${myOrg} Üyeliğinden Çık`:"Orduya Katıl"}
            </button>
          ):(
            <button className="btn" style={{width:"100%",border:"1px solid rgba(239,68,68,0.3)",color:"#EF4444"}} onClick={discharge}>
              Terhis Ol
            </button>
          )}
        </div>
      )}

      {/* KARİYERİM */}
      {tab==="my"&&(
        <div>
          {!isEnlisted?(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🪖</div>
              <div style={{color:"#5E7390",fontSize:"0.82rem",marginBottom:"0.75rem"}}>Orduda kayıtlı değilsiniz.</div>
              <button className="btn btn-primary" onClick={enlist} disabled={!!myOrg}>
                {myOrg?`Önce ${myOrg} üyeliğinden ayrılın`:"Orduya Katıl"}
              </button>
            </div>
          ):(
            <div>
              {/* Rütbe kartı */}
              <div style={{...card,background:"linear-gradient(135deg,rgba(239,68,68,0.1),rgba(0,0,0,0))"}}>
                <div style={{textAlign:"center",padding:"0.5rem"}}>
                  <div style={{fontSize:"2rem"}}>{myRankData.icon}</div>
                  <div style={{fontFamily:"Syne,sans-serif",fontWeight:900,fontSize:"1.2rem",color:"#E8EDF2",marginTop:"0.3rem"}}>{myRankData.label}</div>
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"0.9rem",color:"#EF4444",fontWeight:700}}>{(mySoldier.mp||0).toLocaleString()} MP</div>
                </div>
                {nextRank&&(
                  <div style={{marginTop:"0.75rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.68rem",color:"#5E7390",marginBottom:"0.25rem"}}>
                      <span>Sonraki: {nextRank.label}</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{height:6,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#EF4444,#F59E0B)",borderRadius:3,transition:"width 0.3s"}}/>
                    </div>
                    <div style={{fontSize:"0.65rem",color:"#5E7390",marginTop:"0.2rem"}}>
                      {(mySoldier.mp||0).toLocaleString()} / {nextRank.minMP.toLocaleString()} MP
                    </div>
                  </div>
                )}
              </div>

              {/* İstatistikler */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.45rem",marginBottom:"0.75rem"}}>
                {[
                  {l:"Haftalık Maaş",v:fmtMoney(myRankData.salary),c:"#10B981",icon:"💰"},
                  {l:"Görev Sayısı",v:mySoldier.missions||0,c:"#60A5FA",icon:"🎯"},
                  {l:"Komuta Seviyesi",v:myRankData.commandLevel,c:"#F59E0B",icon:"⭐"},
                ].map(s=>(
                  <div key={s.l} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${s.c}22`,borderRadius:10,padding:"0.6rem",textAlign:"center"}}>
                    <div style={{fontSize:"1rem"}}>{s.icon}</div>
                    <div style={{fontWeight:900,fontSize:"0.85rem",color:s.c,fontFamily:"Syne,sans-serif"}}>{s.v}</div>
                    <div style={{fontSize:"0.58rem",color:"#5E7390",marginTop:"0.1rem"}}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Aktif görev */}
              {missionActive&&(
                <div style={{...card,border:"1px solid rgba(245,158,11,0.3)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:"0.88rem",color:"#F59E0B"}}>⏳ {myMission.title}</div>
                      <div style={{fontSize:"0.72rem",color:"#5E7390",marginTop:"0.1rem"}}>+{myMission.rewardMP} MP · {fmtMoney(myMission.rewardMoney)}</div>
                    </div>
                    <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"0.88rem",color:"#F59E0B",fontWeight:700}}>
                      {fmtTime(myMission.end-now)}
                    </div>
                  </div>
                </div>
              )}
              {missionDone&&(
                <button className="btn btn-primary" style={{width:"100%",marginBottom:"0.75rem"}} onClick={collectMission}>
                  🎯 Görevi Tamamla & Ödül Al
                </button>
              )}

              {/* Genelkurmay adaylığı */}
              {canBecomeChief&&!chief&&(
                <div style={{...card,border:"1px solid rgba(245,158,11,0.4)"}}>
                  <div className="card-title" style={{color:"#F59E0B"}}>🎖️ Genelkurmay Başkanlığı</div>
                  <div style={{fontSize:"0.78rem",color:"#8899AA",marginBottom:"0.75rem"}}>Yeterli askeri puanınız var! Bağımsız aday olabilirsiniz. Seçim oylamasıyla belirlenir.</div>
                  <button className="btn" style={{width:"100%",border:"1px solid rgba(245,158,11,0.4)",color:"#F59E0B"}} onClick={applyChief}>
                    🎖️ Adaylık Başvurusu Yap
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* GÖREVLER */}
      {tab==="missions"&&(
        <div>
          {!isEnlisted&&<div style={{...card,textAlign:"center",color:"#5E7390",padding:"1.5rem"}}>Görev yapmak için önce orduya katılın.</div>}
          {missionActive&&(
            <div style={{...card,border:"1px solid rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.06)"}}>
              <div style={{fontWeight:700,color:"#F59E0B",marginBottom:"0.25rem"}}>⏳ Aktif Görev: {myMission.title}</div>
              <div style={{fontSize:"0.75rem",color:"#8899AA"}}>Tamamlanma: {fmtTime(myMission.end-now)}</div>
            </div>
          )}
          {missionDone&&(
            <div style={{...card,border:"1px solid rgba(16,185,129,0.3)",background:"rgba(16,185,129,0.06)"}}>
              <div style={{fontWeight:700,color:"#10B981",marginBottom:"0.5rem"}}>✅ Görev Tamamlandı: {myMission.title}</div>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={collectMission}>🎖️ Ödülü Topla (+{myMission.rewardMP} MP)</button>
            </div>
          )}
          {MISSIONS.map(m=>(
            <div key={m.id} style={{...card,borderLeft:`3px solid ${!missionActive&&!missionDone&&isEnlisted?"#EF4444":"rgba(255,255,255,0.1)"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.4rem"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.88rem",color:"#E8EDF2"}}>{m.icon} {m.title}</div>
                  <div style={{fontSize:"0.68rem",color:"#5E7390",marginTop:"0.1rem"}}>Süre: {Math.floor(m.dur/3600000)}s · Tüm rütbeler</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:"0.75rem",color:"#EF4444",fontWeight:700}}>+{m.rewardMP} MP</div>
                  <div style={{fontSize:"0.68rem",color:"#10B981"}}>{fmtMoney(m.rewardMoney)}</div>
                </div>
              </div>
              {isEnlisted&&!missionActive&&!missionDone&&(
                <button className="btn btn-primary" style={{width:"100%",fontSize:"0.75rem"}} onClick={()=>startMission(m)}>
                  🎯 Göreve Başla
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SIRALAMA */}
      {tab==="ranking"&&(
        <div>
          <div style={card}>
            <div className="card-title" style={{marginBottom:"0.75rem"}}>🏆 Askeri Puan Sıralaması</div>
            {allSoldierList.length===0&&<div style={{textAlign:"center",color:"#5E7390",padding:"1rem"}}>Henüz askere kayıtlı yok.</div>}
            {allSoldierList.sort((a,b)=>(b.mp||0)-(a.mp||0)).map((s,i)=>{
              const rankData = RANKS.find(r=>r.id===s.rank)||RANKS[0];
              const isMe = s.username===cu?.username;
              return (
                <div key={s.username} style={{display:"flex",alignItems:"center",gap:"0.65rem",padding:"0.6rem",borderRadius:10,marginBottom:"0.3rem",background:isMe?"rgba(239,68,68,0.08)":"rgba(255,255,255,0.02)",border:`1px solid ${isMe?"rgba(239,68,68,0.25)":"rgba(255,255,255,0.04)"}`}}>
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontWeight:700,color:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":"#5E7390",minWidth:24,fontSize:"0.75rem"}}>#{i+1}</span>
                  <span style={{fontSize:"1rem"}}>{rankData.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:isMe?"#FCA5A5":"#E8EDF2",fontSize:"0.85rem"}}>{s.username}{isMe?" (sen)":""}</div>
                    <div style={{fontSize:"0.65rem",color:"#5E7390"}}>{rankData.label} · {s.missions||0} görev</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:700,color:"#EF4444",fontSize:"0.82rem",fontFamily:"JetBrains Mono,monospace"}}>{(s.mp||0).toLocaleString()}</div>
                    <div style={{fontSize:"0.55rem",color:"#5E7390"}}>MP</div>
                  </div>
                </div>
              );
            })}
          </div>
          {isEnlisted&&(
            <div style={{...card,background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.2)"}}>
              <div style={{fontSize:"0.8rem",color:"#FCA5A5",fontWeight:700,marginBottom:"0.25rem"}}>📊 Senin Sıran</div>
              <div style={{fontSize:"0.72rem",color:"#8899AA"}}>
                #{allSoldierList.sort((a,b)=>(b.mp||0)-(a.mp||0)).findIndex(s=>s.username===cu.username)+1} / {allSoldierList.length} asker ·{" "}
                {(mySoldier.mp||0).toLocaleString()} MP · {myRankData.label}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KOMUTA */}
      {tab==="command"&&(
        <div>
          <div style={{...card,border:"1px solid rgba(239,68,68,0.2)"}}>
            <div className="card-title" style={{color:"#EF4444"}}>⚔️ Çete Operasyonları</div>
            <div style={{fontSize:"0.78rem",color:"#8899AA",marginBottom:"0.75rem",lineHeight:1.5}}>
              General rütbesine ulaşan, hiçbir örgütle bağı olmayan subaylar çete operasyonu başlatabilir.<br/>
              <span style={{color:"#F59E0B"}}>Koşul:</span> Hedef çetenin suç puanı ≥50 veya son 24s içinde saldırı kaydı olmalı.
            </div>
            {isGeneral&&!myOrg?(
              <button className="btn" style={{width:"100%",border:"1px solid rgba(239,68,68,0.4)",color:"#EF4444"}} onClick={launchOp}>
                ⚔️ Çete Operasyonu Başlat
              </button>
            ):(
              <div style={{fontSize:"0.78rem",color:"#5E7390",textAlign:"center"}}>
                {myOrg?`${myOrg} üyeliğinizden ayrılmanız gerekiyor.`:"General rütbesi gerekli."}
              </div>
            )}
          </div>

          {/* Aktif operasyonlar */}
          {operations.filter(o=>o.status==="active").length>0&&(
            <div style={card}>
              <div className="card-title">⚔️ Aktif Operasyonlar</div>
              {operations.filter(o=>o.status==="active").map((o,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.4rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div>
                    <div style={{fontSize:"0.82rem",fontWeight:700,color:"#E8EDF2"}}>🔫 {o.gangName}</div>
                    <div style={{fontSize:"0.65rem",color:"#5E7390"}}>Komutan: {o.commander}</div>
                  </div>
                  <span style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:6,padding:"0.2rem 0.4rem",fontSize:"0.65rem",color:"#EF4444",fontWeight:700}}>Aktif</span>
                </div>
              ))}
            </div>
          )}

          {/* ÖNEMLİ kural kutusu */}
          <div style={{...card,border:"1px solid rgba(96,165,250,0.2)"}}>
            <div className="card-title" style={{color:"#60A5FA"}}>🛡️ Çete-Ordu Kuralları</div>
            {[
              {icon:"✓",text:"Ordu çetelere saldırabilir (koşullar sağlandığında)",color:"#10B981"},
              {icon:"✗",text:"Çeteler orduya SALDIRAMAZLAR",color:"#EF4444"},
              {icon:"✗",text:"Siyasi makamlar orduya atama yapamaz",color:"#EF4444"},
              {icon:"✓",text:"Ordu, saldırı altındaki aile varlıklarını koruyabilir",color:"#10B981"},
              {icon:"✓",text:"Devlet her hafta orduya maaş ödemek zorunda",color:"#10B981"},
            ].map((r,i)=>(
              <div key={i} style={{display:"flex",gap:"0.4rem",padding:"0.3rem 0",borderBottom:i<4?"1px solid rgba(255,255,255,0.04)":"none",fontSize:"0.75rem"}}>
                <span style={{color:r.color,fontWeight:700,flexShrink:0}}>{r.icon}</span>
                <span style={{color:"#8899AA"}}>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BÜTÇE */}
      {tab==="budget"&&(
        <div>
          <div style={{...card,background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(0,0,0,0))"}}>
            <div style={{textAlign:"center",padding:"0.5rem"}}>
              <div style={{fontSize:"0.72rem",color:"#5E7390",marginBottom:"0.2rem",textTransform:"uppercase",letterSpacing:"0.07em"}}>Haftalık Toplam Maaş Fonu</div>
              <div style={{fontFamily:"JetBrains Mono,monospace",fontWeight:900,fontSize:"1.6rem",color:"#10B981"}}>{fmtMoney(totalWeeklySalary)}</div>
              <div style={{fontSize:"0.68rem",color:"#5E7390",marginTop:"0.15rem"}}>Devlet hazinesinden karşılanmalı</div>
            </div>
          </div>

          <div style={card}>
            <div className="card-title">📊 Rütbe Maaş Tablosu</div>
            {RANKS.map(r=>{
              const count = allSoldierList.filter(s=>s.rank===r.id).length;
              return (
                <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.4rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
                    <span style={{fontSize:"0.85rem"}}>{r.icon}</span>
                    <div>
                      <div style={{fontSize:"0.78rem",color:"#E8EDF2",fontWeight:600}}>{r.label}</div>
                      <div style={{fontSize:"0.6rem",color:"#5E7390"}}>{count} asker</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"0.75rem",fontWeight:700,color:"#10B981"}}>{fmtMoney(r.salary)}/hf</div>
                    {count>0&&<div style={{fontSize:"0.6rem",color:"#5E7390"}}>Toplam: {fmtMoney(r.salary*count)}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Maaş ödeme geçmişi */}
          <div style={card}>
            <div className="card-title">📋 Ödeme Geçmişi</div>
            {payroll.length===0?(
              <div style={{color:"#5E7390",fontSize:"0.78rem",textAlign:"center",padding:"0.5rem"}}>Henüz ödeme yapılmadı.</div>
            ):(
              payroll.slice(-5).reverse().map((p,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"0.78rem",padding:"0.35rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{color:"#8899AA"}}>{new Date(p.date).toLocaleDateString("tr-TR")}</span>
                  <span style={{color:"#10B981",fontWeight:700}}>{fmtMoney(p.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* KURALLAR */}
      {tab==="rules"&&(
        <div>
          {[
            {title:"🪖 Ordu Bağımsızlığı",items:[
              "Orduya katılmak için hiçbir örgüte (aile/çete/parti) bağlı olmamak gerekir",
              "Subay ve komutanlar hiçbir örgüte üye olamaz — üye olurlarsa rütbeleri düşer",
              "Siyasi makamlar (Devlet Başkanı dahil) orduya atama yapamaz",
              "Genelkurmay Başkanı, askeri puana göre seçilir — politikacı değil, asker olmalı",
            ],color:"#60A5FA"},
            {title:"⭐ Genelkurmay Adaylığı",items:[
              `Minimum ${(800000).toLocaleString()} MP (askeri puan) şart`,
              "Herhangi bir örgütle bağlantısı olmamalı",
              "Adaylar arasından oylama yapılır",
              "Seçilen kişi tüm örgütlerden otomatik çıkarılır",
            ],color:"#F59E0B"},
            {title:"⚔️ Operasyon Koşulları",items:[
              "Çeteye saldırmak için General veya üstü rütbe gerekli",
              "Hedef çetenin suç puanı ≥50 VEYA son 24 saat içinde aktif saldırısı olmalı",
              "Çeteler orduda bulunanları/olanlara karşı saldırı başlatamaz",
              "Ordu, aktif bir saldırı varsa aile varlıklarını korumak için devreye girebilir",
            ],color:"#EF4444"},
            {title:"💰 Devlet-Ordu Finansmanı",items:[
              "Devlet hazinesi her hafta ordu maaşını ödemek zorunda",
              "Ödeme yapılmazsa ordunun savaş kapasitesi düşer",
              "Maliye Bakanı ödeme onaylar, ancak ordu üzerinde komuta yetkisi yoktur",
              "Ordu kendi kasasına sahip değil — devlet bütçesine bağımlı",
            ],color:"#10B981"},
          ].map(section=>(
            <div key={section.title} style={{...card,borderLeft:`3px solid ${section.color}`}}>
              <div className="card-title" style={{color:section.color}}>{section.title}</div>
              {section.items.map((item,i)=>(
                <div key={i} style={{fontSize:"0.75rem",color:"#8899AA",padding:"0.3rem 0",borderBottom:i<section.items.length-1?"1px solid rgba(255,255,255,0.04)":"none",lineHeight:1.5}}>
                  • {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
