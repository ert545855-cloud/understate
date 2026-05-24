
// ═══════════════════════════════════════════════════════
// UNDERSTATE — Ordu (Army) Ekranı
// ═══════════════════════════════════════════════════════
window.ArmyScreen = function ArmyScreen({ cu, allUsers, setCurrentPage }) {
  const S = {
    load: (k, def) => { try { const v = localStorage.getItem("us_army2_"+k); return v ? JSON.parse(v) : def; } catch { return def; } },
    save: (k, v)   => { try { localStorage.setItem("us_army2_"+k, JSON.stringify(v)); } catch {} },
  };

  const [tab, setTab] = React.useState("overview");
  const [soldiers, setSoldiers] = React.useState(()=>S.load("soldiers",{}));
  const [operations, setOperations] = React.useState(()=>S.load("operations",[]));
  const [missions, setMissions]     = React.useState(()=>S.load("missions",{}));
  const [msg, setMsg] = React.useState(null);

  const showMsg = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };
  const fmtMoney = (n) => { if(!n)return "₺0"; if(n>=1e6)return "₺"+(n/1e6).toFixed(1)+"M"; if(n>=1e3)return "₺"+(n/1e3).toFixed(0)+"K"; return "₺"+n; };
  const fmtTime  = (ms) => { if(ms<=0)return "Bitti"; const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000); return `${h}s ${m}dk`; };
  const now = Date.now();

  const RANKS = [
    {id:"recruit", label:"Er",           minXP:0,     icon:"🪖",salary:3000},
    {id:"private", label:"Onbaşı",       minXP:500,   icon:"⭐",salary:6000},
    {id:"corporal",label:"Çavuş",        minXP:1500,  icon:"⭐⭐",salary:10000},
    {id:"sergeant",label:"Çavuş Üstü",  minXP:4000,  icon:"🎖️",salary:16000},
    {id:"officer", label:"Teğmen",       minXP:10000, icon:"🏅",salary:25000},
    {id:"captain", label:"Yüzbaşı",      minXP:25000, icon:"🏅🏅",salary:40000},
    {id:"major",   label:"Binbaşı",      minXP:60000, icon:"🥇",salary:60000},
    {id:"colonel", label:"Albay",        minXP:150000,icon:"🥇🥇",salary:90000},
    {id:"general", label:"General",      minXP:400000,icon:"⭐⭐⭐",salary:150000},
  ];

  const MISSIONS_LIST = [
    {id:"patrol",   title:"Devriye Görevi",   duration:2*3600000, rewardMoney:4000,  rewardXP:200,  icon:"🚶",minRank:"recruit"},
    {id:"training", title:"Silah Eğitimi",    duration:3*3600000, rewardMoney:6000,  rewardXP:400,  icon:"🎯",minRank:"recruit"},
    {id:"recon",    title:"Keşif Operasyonu", duration:6*3600000, rewardMoney:12000, rewardXP:800,  icon:"🔭",minRank:"corporal"},
    {id:"escort",   title:"Vip Koruma",       duration:4*3600000, rewardMoney:18000, rewardXP:1200, icon:"🛡️",minRank:"sergeant"},
    {id:"raid",     title:"Çete Baskını",     duration:8*3600000, rewardMoney:35000, rewardXP:3000, icon:"⚔️",minRank:"officer"},
    {id:"martial",  title:"Sıkıyönetim",      duration:12*3600000,rewardMoney:60000, rewardXP:6000, icon:"🏙️",minRank:"captain"},
  ];

  const mySoldier  = soldiers[cu?.username];
  const isEnlisted = !!mySoldier;
  const myRankData = RANKS.find(r=>r.id===(mySoldier?.rank||"recruit"))||RANKS[0];
  const nextRank   = RANKS[RANKS.findIndex(r=>r.id===myRankData.id)+1];
  const rankProgress = nextRank ? Math.min(100,Math.round(((mySoldier?.xp||0)-myRankData.minXP)/Math.max(1,(nextRank.minXP-myRankData.minXP))*100)) : 100;
  const myMission  = missions[cu?.username];
  const missionActive = myMission && myMission.end > now;
  const missionDone   = myMission && myMission.end <= now && !myMission.collected;

  const isDefenseMinister = cu?.position==="Savunma Bakanı"||cu?.role==="admin";
  const isGeneralChief    = cu?.position==="Genelkurmay Başkanı"||cu?.role==="admin";

  const rankIdx = (rankId) => RANKS.findIndex(r=>r.id===rankId);

  const enlist = () => {
    if(isEnlisted) return showMsg("Zaten orduya kayıtlısınız","error");
    const s = {username:cu.username,rank:"recruit",xp:0,salary:3000,enrolledAt:now};
    const upd = {...soldiers,[cu.username]:s};
    setSoldiers(upd); S.save("soldiers",upd);
    showMsg("Orduya katıldınız! 🪖 Görev almaya hazırsınız.","success");
  };

  const discharge = () => {
    if(!isEnlisted) return;
    const upd = {...soldiers};
    delete upd[cu.username];
    setSoldiers(upd); S.save("soldiers",upd);
    showMsg("Terhis oldunuz.","info");
  };

  const startMission = (mission) => {
    if(!isEnlisted) return showMsg("Göreve başlamak için orduya katılın","error");
    if(missionActive) return showMsg("Zaten aktif bir görev var","error");
    if(rankIdx(mySoldier.rank)<rankIdx(mission.minRank)) return showMsg(`Bu görev için en az ${RANKS.find(r=>r.id===mission.minRank)?.label} rütbesi gerekli`,"error");
    const m = {missionId:mission.id,title:mission.title,start:now,end:now+mission.duration,rewardMoney:mission.rewardMoney,rewardXP:mission.rewardXP,collected:false};
    const upd = {...missions,[cu.username]:m};
    setMissions(upd); S.save("missions",upd);
    showMsg(`"${mission.title}" görevi başladı! ✓`,"success");
  };

  const collectMission = () => {
    if(!missionDone) return;
    const xpEarned = myMission.rewardXP;
    const newXP = (mySoldier.xp||0) + xpEarned;
    const newRank = RANKS.filter(r=>r.minXP<=newXP).pop()?.id||"recruit";
    const upd = {...soldiers,[cu.username]:{...mySoldier,xp:newXP,rank:newRank}};
    setSoldiers(upd); S.save("soldiers",upd);
    const mUpd = {...missions,[cu.username]:{...myMission,collected:true}};
    setMissions(mUpd); S.save("missions",mUpd);
    showMsg(`Görev tamamlandı! +${xpEarned} XP · ${newRank!==mySoldier.rank?`Rütbe yükseltildi: ${RANKS.find(r=>r.id===newRank)?.label}! 🎖️`:""}${fmtMoney(myMission.rewardMoney)} kazandınız`,"success");
  };

  const startOperation = () => {
    if(!isGeneralChief) return showMsg("Sadece Genelkurmay Başkanı operasyon başlatabilir","error");
    const title  = prompt("Operasyon adı:");
    if(!title) return;
    const target = prompt("Hedef bölge (örn: Kadıköy):");
    if(!target) return;
    const durationH = parseInt(prompt("Süre (saat):")||"8");
    const op = {id:"op_"+Date.now(),title,target,commander:cu.username,status:"active",startedAt:now,endsAt:now+durationH*3600000};
    const upd = [op,...operations].slice(0,20);
    setOperations(upd); S.save("operations",upd);
    showMsg(`"${title}" operasyonu başlatıldı! ✓`,"success");
  };

  const coupReadiness = Math.min(100, Math.round(
    (operations.filter(o=>o.status==="active").length * 15) +
    (Object.keys(soldiers).length * 3) +
    (isGeneralChief ? 30 : 0)
  ));

  const card = {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"1rem",marginBottom:"0.75rem"};
  const tabBtn = (id,lbl,icon) => (
    <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"0.42rem 0.85rem",borderRadius:20,border:"none",background:tab===id?"var(--accent)":"rgba(255,255,255,0.06)",color:tab===id?"#000":"#8899AA",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Syne,sans-serif",minHeight:36}}>{icon} {lbl}</button>
  );

  const enrolledList = Object.values(soldiers);

  return (
    <div>
      <div className="ministry-header">🪖 Ordu</div>
      {msg&&(
        <div style={{padding:"0.6rem 0.85rem",borderRadius:10,marginBottom:"0.75rem",background:msg.type==="success"?"rgba(16,185,129,0.12)":msg.type==="error"?"rgba(239,68,68,0.12)":"rgba(59,130,246,0.12)",border:`1px solid ${msg.type==="success"?"rgba(16,185,129,0.3)":msg.type==="error"?"rgba(239,68,68,0.3)":"rgba(59,130,246,0.3)"}`,color:msg.type==="success"?"#10B981":msg.type==="error"?"#EF4444":"#60A5FA",fontSize:"0.82rem",fontWeight:600}}>
          {msg.text}
        </div>
      )}
      <div style={{display:"flex",gap:"0.4rem",overflowX:"auto",paddingBottom:"0.5rem",marginBottom:"0.75rem",scrollbarWidth:"none"}}>
        {tabBtn("overview","Genel","🪖")}
        {tabBtn("career","Kariyerim","⭐")}
        {tabBtn("missions","Görevler","🎯")}
        {tabBtn("operations","Operasyonlar","⚔️")}
        {(isDefenseMinister||isGeneralChief)&&tabBtn("manage","Yönetim","👑")}
      </div>

      {/* GENEL BAKIŞ */}
      {tab==="overview"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.45rem",marginBottom:"0.75rem"}}>
            {[
              {l:"Asker Sayısı",v:enrolledList.length,c:"#60A5FA",icon:"👥"},
              {l:"Aktif Operasyon",v:operations.filter(o=>o.status==="active"&&o.endsAt>now).length,c:"#EF4444",icon:"⚔️"},
              {l:"Darbe Riski",v:`%${coupReadiness}`,c:coupReadiness>70?"#EF4444":coupReadiness>40?"#F59E0B":"#10B981",icon:"⚡"},
            ].map(s=>(
              <div key={s.l} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${s.c}22`,borderRadius:10,padding:"0.65rem",textAlign:"center"}}>
                <div style={{fontSize:"1rem"}}>{s.icon}</div>
                <div style={{fontWeight:900,fontSize:"0.95rem",color:s.c,fontFamily:"Syne,sans-serif"}}>{s.v}</div>
                <div style={{fontSize:"0.58rem",color:"#5E7390",marginTop:"0.1rem"}}>{s.l}</div>
              </div>
            ))}
          </div>

          {coupReadiness>70&&(
            <div style={{...card,border:"1px solid rgba(239,68,68,0.4)",background:"rgba(239,68,68,0.05)"}}>
              <div style={{fontWeight:700,color:"#EF4444",marginBottom:"0.25rem"}}>🚨 Yüksek Darbe Riski!</div>
              <div style={{fontSize:"0.78rem",color:"#EF4444AA"}}>Ordu güçlü ve aktif. Siyasi istikrarsızlık riski yüksek. Hükümet dikkatli olmalı.</div>
            </div>
          )}

          <div style={card}>
            <div className="card-title">🏅 Komuta Zinciri</div>
            {[
              {pos:"Devlet Başkanı (Başkomutan)",icon:"🇹🇷"},
              {pos:"Savunma Bakanı",icon:"🛡️"},
              {pos:"Genelkurmay Başkanı",icon:"⚔️"},
            ].map(p=>{
              const holder = Array.isArray(allUsers)?allUsers.find(u=>u.position===p.pos):null;
              return (
                <div key={p.pos} style={{display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.45rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{fontSize:"1.1rem"}}>{p.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:"0.82rem",color:"#fff"}}>{p.pos}</div>
                    <div style={{fontSize:"0.7rem",color:holder?"#10B981":"#5E7390"}}>{holder?holder.username:"Atanmadı"}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={card}>
            <div className="card-title">⚔️ Aktif Operasyonlar</div>
            {operations.filter(o=>o.status==="active"&&o.endsAt>now).length===0&&(
              <div style={{textAlign:"center",color:"#5E7390",fontSize:"0.82rem",padding:"0.5rem"}}>Aktif operasyon yok.</div>
            )}
            {operations.filter(o=>o.endsAt>now).slice(0,5).map(op=>(
              <div key={op.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.45rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:"0.82rem"}}>
                <div>
                  <div style={{fontWeight:700}}>{op.title}</div>
                  <div style={{fontSize:"0.7rem",color:"#5E7390"}}>Hedef: {op.target}</div>
                </div>
                <span style={{fontFamily:"JetBrains Mono,monospace",color:"#F59E0B",fontSize:"0.75rem"}}>{fmtTime(op.endsAt-now)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KARİYERİM */}
      {tab==="career"&&(
        <div>
          {isEnlisted ? (
            <div>
              <div style={{...card,background:"linear-gradient(135deg,rgba(96,165,250,0.08),rgba(0,0,0,0))"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
                  <div>
                    <div style={{fontFamily:"Syne,sans-serif",fontWeight:900,fontSize:"1.2rem",color:"#60A5FA"}}>{myRankData.icon} {myRankData.label}</div>
                    <div style={{fontSize:"0.72rem",color:"#5E7390",marginTop:"0.15rem"}}>{mySoldier.xp||0} XP · Maaş: {fmtMoney(myRankData.salary)}/ay</div>
                  </div>
                </div>
                {nextRank&&(
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.7rem",color:"#5E7390",marginBottom:"0.3rem"}}>
                      <span>Sonraki: {nextRank.icon} {nextRank.label}</span>
                      <span>{rankProgress}%</span>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.08)",borderRadius:6,height:8,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${rankProgress}%`,background:"linear-gradient(90deg,#60A5FA,#A78BFA)",borderRadius:6,transition:"width 0.4s"}}/>
                    </div>
                    <div style={{fontSize:"0.65rem",color:"#5E7390",marginTop:"0.25rem"}}>{(nextRank.minXP-(mySoldier?.xp||0)).toLocaleString()} XP daha gerekli</div>
                  </div>
                )}
              </div>
              <div style={card}>
                <div className="card-title">📋 Askerlik Bilgileri</div>
                {[
                  {l:"Katılım Tarihi",v:new Date(mySoldier.enrolledAt||now).toLocaleDateString("tr-TR")},
                  {l:"Toplam XP",v:(mySoldier.xp||0).toLocaleString()},
                  {l:"Aylık Maaş",v:fmtMoney(myRankData.salary)},
                  {l:"Rütbe",v:`${myRankData.icon} ${myRankData.label}`},
                ].map(s=>(
                  <div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"0.4rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:"0.82rem"}}>
                    <span style={{color:"#5E7390"}}>{s.l}</span>
                    <span style={{fontWeight:700,color:"#ddd"}}>{s.v}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-red" style={{width:"100%"}} onClick={discharge}>🏳 Terhis Ol</button>
            </div>
          ) : (
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2.5rem",marginBottom:"0.75rem"}}>🪖</div>
              <div style={{fontSize:"1rem",fontWeight:700,color:"#fff",marginBottom:"0.5rem"}}>Orduya Katıl</div>
              <div style={{fontSize:"0.82rem",color:"#5E7390",marginBottom:"1.5rem",lineHeight:1.6}}>
                Görevler yaparak rütbe kazanın. Her rütbe daha yüksek maaş ve daha zorlu görevler demektir.
              </div>
              <button className="btn btn-primary" style={{minWidth:160}} onClick={enlist}>🪖 Orduya Katıl</button>
            </div>
          )}
        </div>
      )}

      {/* GÖREVLER */}
      {tab==="missions"&&(
        <div>
          {!isEnlisted&&(
            <div style={{...card,textAlign:"center",color:"#5E7390",padding:"1.5rem"}}>
              Görev almak için önce orduya katılın.
              <button className="btn btn-primary" style={{marginTop:"0.75rem",display:"block",width:"100%"}} onClick={()=>setTab("career")}>Kariyerime Git</button>
            </div>
          )}
          {missionDone&&(
            <div style={{...card,border:"1px solid rgba(255,184,0,0.4)",background:"rgba(255,184,0,0.06)"}}>
              <div style={{fontWeight:700,color:"#FFB800",marginBottom:"0.25rem"}}>✅ Görev Tamamlandı!</div>
              <div style={{fontSize:"0.82rem",color:"#bbb",marginBottom:"0.6rem"}}>{myMission.title}</div>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={collectMission}>
                Ödülü Al — {fmtMoney(myMission.rewardMoney)} + {myMission.rewardXP} XP
              </button>
            </div>
          )}
          {missionActive&&(
            <div style={{...card,border:"1px solid rgba(96,165,250,0.3)",background:"rgba(96,165,250,0.05)"}}>
              <div style={{fontWeight:700,color:"#60A5FA",marginBottom:"0.25rem"}}>🎯 Aktif Görev: {myMission.title}</div>
              <div style={{textAlign:"center",padding:"0.5rem"}}>
                <div style={{fontFamily:"JetBrains Mono,monospace",fontWeight:900,fontSize:"1.4rem",color:"#60A5FA"}}>{fmtTime(myMission.end-now)}</div>
                <div style={{fontSize:"0.7rem",color:"#5E7390"}}>Kalan Süre</div>
              </div>
              <div style={{display:"flex",justifyContent:"center",gap:"1rem",fontSize:"0.8rem",color:"#8899AA"}}>
                <span>💰 {fmtMoney(myMission.rewardMoney)}</span>
                <span>⭐ {myMission.rewardXP} XP</span>
              </div>
            </div>
          )}
          {isEnlisted&&MISSIONS_LIST.map(m=>{
            const rankOk = rankIdx(mySoldier?.rank||"recruit")>=rankIdx(m.minRank);
            const minRankLabel = RANKS.find(r=>r.id===m.minRank)?.label||"Er";
            return (
              <div key={m.id} style={{...card,opacity:rankOk?1:0.5}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:"0.9rem"}}>{m.icon} {m.title}</div>
                    <div style={{fontSize:"0.7rem",color:"#5E7390",marginTop:"0.15rem"}}>Min. rütbe: {minRankLabel} · {fmtTime(m.duration)}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0,marginLeft:"0.5rem"}}>
                    <div style={{fontSize:"0.78rem",fontWeight:700,color:"#10B981"}}>{fmtMoney(m.rewardMoney)}</div>
                    <div style={{fontSize:"0.65rem",color:"#A78BFA"}}>+{m.rewardXP} XP</div>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{width:"100%",opacity:missionActive||missionDone?0.4:1}}
                  disabled={!rankOk||missionActive||missionDone}
                  onClick={()=>startMission(m)}
                >
                  {!rankOk?`🔒 ${minRankLabel} rütbesi gerekli`:missionActive?"Görev Aktif":missionDone?"Önce Ödülü Al":"▶ Görevi Başlat"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* OPERASYONLAR */}
      {tab==="operations"&&(
        <div>
          {isGeneralChief&&(
            <button className="btn btn-primary" style={{width:"100%",marginBottom:"0.75rem"}} onClick={startOperation}>⚔️ Yeni Operasyon Başlat</button>
          )}
          {operations.length===0&&<div style={{...card,textAlign:"center",color:"#5E7390",padding:"1.5rem"}}>Henüz operasyon yok.</div>}
          {operations.map(op=>{
            const active = op.endsAt>now;
            return (
              <div key={op.id} style={{...card,borderColor:active?"rgba(239,68,68,0.3)":"rgba(255,255,255,0.07)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.4rem"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:"0.9rem"}}>{op.title}</div>
                    <div style={{fontSize:"0.72rem",color:"#5E7390"}}>Hedef: {op.target} · Komutan: {op.commander}</div>
                  </div>
                  <span style={{background:active?"rgba(239,68,68,0.12)":"rgba(255,255,255,0.05)",border:`1px solid ${active?"rgba(239,68,68,0.3)":"rgba(255,255,255,0.1)"}`,borderRadius:5,padding:"0.15rem 0.45rem",fontSize:"0.62rem",fontWeight:700,color:active?"#EF4444":"#5E7390",flexShrink:0}}>{active?"Aktif":"Tamamlandı"}</span>
                </div>
                <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"0.8rem",color:active?"#F59E0B":"#5E7390"}}>{active?`⏱ ${fmtTime(op.endsAt-now)}`:"✅ Tamamlandı"}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* YÖNETİM */}
      {tab==="manage"&&(isDefenseMinister||isGeneralChief)&&(
        <div>
          <div style={card}>
            <div className="card-title">📊 Ordu İstatistikleri</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"0.4rem"}}>
              {[
                {l:"Toplam Asker",v:enrolledList.length,c:"#60A5FA"},
                {l:"Aktif Operasyon",v:operations.filter(o=>o.endsAt>now).length,c:"#EF4444"},
                {l:"Darbe Potansiyeli",v:`%${coupReadiness}`,c:coupReadiness>70?"#EF4444":coupReadiness>40?"#F59E0B":"#10B981"},
                {l:"En Yüksek Rütbe",v:enrolledList.length>0?RANKS.filter(r=>enrolledList.some(s=>s.rank===r.id)).pop()?.label||"Er":"—",c:"#A78BFA"},
              ].map(s=>(
                <div key={s.l} style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"0.5rem",textAlign:"center"}}>
                  <div style={{fontWeight:700,fontSize:"0.9rem",color:s.c}}>{s.v}</div>
                  <div style={{fontSize:"0.6rem",color:"#5E7390",marginTop:"0.1rem"}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={card}>
            <div className="card-title">👥 Personel Listesi</div>
            {enrolledList.length===0&&<div style={{textAlign:"center",color:"#5E7390",padding:"0.75rem",fontSize:"0.82rem"}}>Kayıtlı asker yok.</div>}
            {enrolledList.sort((a,b)=>(b.xp||0)-(a.xp||0)).slice(0,20).map((s,i)=>{
              const rankData = RANKS.find(r=>r.id===s.rank)||RANKS[0];
              return (
                <div key={s.username||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.45rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div>
                    <span style={{fontWeight:700,fontSize:"0.85rem",color:"#ddd"}}>{s.username}</span>
                    <span style={{marginLeft:"0.4rem",fontSize:"0.7rem",color:"#60A5FA"}}>{rankData.icon} {rankData.label}</span>
                  </div>
                  <span style={{fontSize:"0.75rem",color:"#A78BFA",fontFamily:"JetBrains Mono,monospace"}}>{(s.xp||0).toLocaleString()} XP</span>
                </div>
              );
            })}
          </div>
          {isGeneralChief&&coupReadiness>50&&(
            <div style={{...card,border:"1px solid rgba(239,68,68,0.4)",background:"rgba(239,68,68,0.05)"}}>
              <div style={{fontWeight:700,color:"#EF4444",marginBottom:"0.5rem"}}>⚠️ Darbe Mekanizması</div>
              <div style={{fontSize:"0.78rem",color:"#EF4444AA",marginBottom:"0.75rem"}}>
                Darbe hazırlık puanı %{coupReadiness}. Yeterli koşullar oluşursa bildiri gönderilebilir.
              </div>
              <button className="btn btn-red" style={{width:"100%"}} onClick={()=>showMsg("Hükümete uyarı bildirisi gönderildi!","info")}>
                📢 Uyarı Bildirisi Gönder
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
