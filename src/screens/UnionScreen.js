
// ═══════════════════════════════════════════════════════
// UNDERSTATE — Sendika & İşçilik (Union & Labor) Ekranı
// ═══════════════════════════════════════════════════════
window.UnionScreen = function UnionScreen({ cu, allUsers, families, setCurrentPage }) {
  const S = {
    load: (k, def) => { try { const v = localStorage.getItem("us_union_"+k); return v ? JSON.parse(v) : def; } catch { return def; } },
    save: (k, v)   => { try { localStorage.setItem("us_union_"+k, JSON.stringify(v)); } catch {} },
  };

  const UNION_MEMBER_REQUIREMENT = 10;
  const UNION_DEADLINE_MS = 3 * 24 * 60 * 60 * 1000; // 3 gün

  const [unions, setUnions] = React.useState(()=>S.load("list",[]));
  const [tab, setTab]       = React.useState("list");
  const [newUnion, setNewUnion] = React.useState({name:""});
  const [shifts, setShifts] = React.useState(()=>S.load("shifts",{}));
  const [msg, setMsg]       = React.useState(null);
  const now = Date.now();

  const saveUnions = (u) => { setUnions(u); S.save("list", u); };
  const saveShifts = (s) => { setShifts(s); S.save("shifts", s); };
  const showMsg = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };

  const fmtMoney = (n) => { if(!n)return "₺0"; if(n>=1e6)return "₺"+(n/1e6).toFixed(1)+"M"; if(n>=1e3)return "₺"+(n/1e3).toFixed(0)+"K"; return "₺"+n; };
  const fmtTime  = (ms) => { if(ms<=0)return "Bitti"; const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000); return `${h}s ${m}dk`; };

  // Auto-dissolve unions that missed the 3-day / 10-member deadline
  React.useEffect(() => {
    const active = unions.filter(u => {
      const memberCount = (u.members||[]).length;
      const age = now - (u.createdAt || now);
      if (!u.confirmed && memberCount < UNION_MEMBER_REQUIREMENT && age > UNION_DEADLINE_MS) {
        return false; // dissolve
      }
      return true;
    });
    if (active.length !== unions.length) {
      saveUnions(active);
      showMsg("⚠️ 3 günlük sürede 10 üye toplayamayan sendikalar otomatik kapatıldı.", "info");
    }
  }, []);

  const myUnion     = unions.find(u=>u.leader===cu?.username||(Array.isArray(u.members)&&u.members.includes(cu?.username)));
  const myUnionRole = myUnion ? (myUnion.leader===cu?.username?"Lider":"Üye") : null;
  const myShift     = shifts[cu?.username];
  const shiftActive = myShift && myShift.end > now;
  const fams = Array.isArray(families)?families:[];
  const userFamily  = fams.find(f=>f.leader===cu?.username||(Array.isArray(f.members)&&f.members.includes(cu?.username)));

  const createUnion = () => {
    if(!newUnion.name.trim()) return showMsg("Sendika adı zorunlu","error");
    if(myUnion) return showMsg("Zaten bir sendikaya üyesiniz","error");
    if(unions.find(u=>u.name.toLowerCase()===newUnion.name.trim().toLowerCase())) return showMsg("Bu isimde bir sendika zaten var","error");
    const u = {
      id:"un_"+Date.now(),
      name:newUnion.name.trim(),
      leader:cu.username,
      members:[cu.username],
      treasury:0,
      influence:0,
      createdAt:now,
      demands:[],
      strikeActive:false,
      confirmed:false, // becomes true when 10 members reached
    };
    const updated = [...unions, u];
    saveUnions(updated);
    setNewUnion({name:""});
    setTab("list");
    showMsg(`Sendika kuruldu! 3 gün içinde ${UNION_MEMBER_REQUIREMENT} üye toplamalısınız ✓`,"success");
    try { window._pushGameEvent?.('sendika_kuruldu', `🏭 ${u.name} sendikası kuruldu!`, `${cu.username} yeni bir işçi sendikası kurdu. ${UNION_MEMBER_REQUIREMENT} üye için başvuruları bekliyor.`, '🏭', 'sendika'); } catch(e){}
  };

  const joinUnion = (unionId) => {
    if(myUnion) return showMsg("Zaten bir sendikaya üyesiniz","error");
    const updated = unions.map(u=>{
      if(u.id!==unionId) return u;
      const newMembers = [...(u.members||[]),cu.username];
      const confirmed = newMembers.length >= UNION_MEMBER_REQUIREMENT;
      return {...u, members:newMembers, confirmed: u.confirmed || confirmed};
    });
    saveUnions(updated);
    const joined = updated.find(u=>u.id===unionId);
    const memberCount = (joined?.members||[]).length;
    if (memberCount >= UNION_MEMBER_REQUIREMENT && !joined?.confirmed) {
      showMsg(`Sendika tamamlandı! ${memberCount} üyeye ulaşıldı — Sendika onaylandı ✓`,"success");
    } else {
      showMsg(`Sendikaya katıldınız! ${memberCount}/${UNION_MEMBER_REQUIREMENT} üye ✓`,"success");
    }
  };

  const leaveUnion = (unionId) => {
    const u = unions.find(x=>x.id===unionId);
    if(!u) return;
    if(u.leader===cu.username) return showMsg("Lider olarak sendikayı terk edemezsiniz. Önce liderliği devredin.","error");
    const updated = unions.map(x=>{
      if(x.id!==unionId) return x;
      return {...x, members:(x.members||[]).filter(m=>m!==cu.username)};
    });
    saveUnions(updated);
    showMsg("Sendikadan ayrıldınız.","info");
  };

  const startShift = (unionId) => {
    if(shiftActive) return showMsg("Zaten aktif bir vardiya var","error");
    const targetUnion = unions.find(u=>u.id===unionId);
    if(!targetUnion) return showMsg("Sendika bulunamadı","error");
    if(!targetUnion.confirmed && (targetUnion.members||[]).length < UNION_MEMBER_REQUIREMENT) {
      return showMsg(`Sendika henüz onaylanmadı (${(targetUnion.members||[]).length}/${UNION_MEMBER_REQUIREMENT} üye). Fabrikada çalışmak için sendikanın ${UNION_MEMBER_REQUIREMENT} üyeye ulaşması gerekiyor.`,"error");
    }
    const SHIFT_DURATION = 4*3600000;
    const SHIFT_PAY = 5000 + (cu.level||1)*1000 + (targetUnion.influence||0)*100;
    const newShifts = {...shifts,[cu.username]:{start:now,end:now+SHIFT_DURATION,pay:SHIFT_PAY,unionId}};
    saveShifts(newShifts);
    showMsg(`Fabrika vardiyası başladı! ${fmtTime(SHIFT_DURATION)} sonra ${fmtMoney(SHIFT_PAY)} kazanacaksınız ✓`,"success");
  };

  const endShift = () => {
    if(!myShift) return;
    const newShifts = {...shifts};
    delete newShifts[cu.username];
    saveShifts(newShifts);
    if(myShift.end<=now) {
      showMsg(`Vardiya tamamlandı! ${fmtMoney(myShift.pay)} kazandınız ✓`,"success");
    } else {
      showMsg("Vardiyayı erken sonlandırdınız. Ücret alınamadı.","info");
    }
  };

  const toggleStrike = (unionId) => {
    if(unions.find(u=>u.id===unionId)?.leader!==cu.username) return showMsg("Sadece lider grev ilan edebilir","error");
    const updated = unions.map(u=>{
      if(u.id!==unionId) return u;
      return {...u,strikeActive:!u.strikeActive};
    });
    saveUnions(updated);
    const nowStriking = updated.find(u=>u.id===unionId)?.strikeActive;
    showMsg(nowStriking?"Grev ilan edildi! Tüm üyeler durdu.":"Grev sonlandırıldı.","info");
    if (nowStriking) {
      const u = updated.find(x=>x.id===unionId);
      try { window._pushGameEvent?.('grev', `🚨 GREV: ${u?.name||'Sendika'}`, `${cu?.username||'Sendika lideri'} grev ilan etti! Fabrika üretimi durdu.`, '🚨', 'grev'); } catch(e){}
    }
  };

  const card = {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"1rem",marginBottom:"0.75rem"};
  const tabBtn = (id,lbl,icon) => (
    <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"0.42rem 0.85rem",borderRadius:20,border:"none",background:tab===id?"var(--accent)":"rgba(255,255,255,0.06)",color:tab===id?"#000":"#8899AA",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Syne,sans-serif",minHeight:36}}>{icon} {lbl}</button>
  );

  return (
    <div>
      <div className="ministry-header">🏭 Sendika & İşçilik</div>
      <p style={{fontSize:"0.82rem",color:"#6B7C93",marginBottom:"1rem"}}>
        İşçi haklarını koruyun, sendika kurun veya katılın. <strong style={{color:"#F59E0B"}}>3 gün içinde {UNION_MEMBER_REQUIREMENT} üye</strong> toplamalısınız — aksi takdirde sendika kapanır. Sendika üyeleri fabrikalarda çalışabilir.
      </p>

      {msg&&(
        <div style={{padding:"0.6rem 0.85rem",borderRadius:10,marginBottom:"0.75rem",background:msg.type==="success"?"rgba(16,185,129,0.12)":msg.type==="error"?"rgba(239,68,68,0.12)":"rgba(59,130,246,0.12)",border:`1px solid ${msg.type==="success"?"rgba(16,185,129,0.3)":msg.type==="error"?"rgba(239,68,68,0.3)":"rgba(59,130,246,0.3)"}`,color:msg.type==="success"?"#10B981":msg.type==="error"?"#EF4444":"#60A5FA",fontSize:"0.82rem",fontWeight:600}}>
          {msg.text}
        </div>
      )}

      <div style={{display:"flex",gap:"0.4rem",overflowX:"auto",paddingBottom:"0.5rem",marginBottom:"0.75rem",scrollbarWidth:"none"}}>
        {tabBtn("list","Sendikalar","🏭")}
        {tabBtn("career","Kariyerim","💼")}
        {tabBtn("create","Sendika Kur","+")}
      </div>

      {/* SENDİKA LİSTESİ */}
      {tab==="list"&&(
        <div>
          {/* Mevcut üyelik durumu */}
          {myUnion&&(
            <div style={{...card,border:"1px solid rgba(16,185,129,0.3)"}}>
              <div className="card-title">✅ Üyeliğim: {myUnion.name}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.4rem",marginTop:"0.5rem"}}>
                {[
                  {l:"Rolüm",v:myUnionRole,c:"#10B981"},
                  {l:"Üye Sayısı",v:(myUnion.members||[]).length,c:"#60A5FA"},
                  {l:"Etki",v:myUnion.influence||0,c:"#A78BFA"},
                ].map(s=>(
                  <div key={s.l} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"0.4rem",textAlign:"center"}}>
                    <div style={{fontWeight:700,fontSize:"0.85rem",color:s.c}}>{s.v}</div>
                    <div style={{fontSize:"0.58rem",color:"#5E7390"}}>{s.l}</div>
                  </div>
                ))}
              </div>
              {/* Deadline warning */}
              {!myUnion.confirmed && (myUnion.members||[]).length < UNION_MEMBER_REQUIREMENT && (
                <div style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:8,padding:"0.5rem",marginTop:"0.6rem",fontSize:"0.78rem",color:"#F59E0B"}}>
                  ⏳ {(myUnion.members||[]).length}/{UNION_MEMBER_REQUIREMENT} üye — Kalan süre: {fmtTime(Math.max(0, UNION_DEADLINE_MS - (now - (myUnion.createdAt||now))))}
                  <div style={{fontSize:"0.65rem",marginTop:"0.2rem",color:"#D97706"}}>3 gün içinde {UNION_MEMBER_REQUIREMENT} üye toplamazsanız sendika kapanır!</div>
                </div>
              )}
              {myUnion.confirmed && (
                <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:8,padding:"0.4rem",marginTop:"0.6rem",fontSize:"0.72rem",color:"#10B981",fontWeight:700}}>
                  ✅ Sendika Onaylı — Üyeler fabrikalarda çalışabilir
                </div>
              )}
              {myUnion.strikeActive&&(
                <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"0.5rem",marginTop:"0.6rem",fontSize:"0.8rem",color:"#EF4444",fontWeight:700}}>
                  🚨 GREV AKTİF — Fabrika üretimi duruyor!
                </div>
              )}
              <div style={{display:"flex",gap:"0.4rem",marginTop:"0.6rem"}}>
                {myUnion.leader===cu.username&&(
                  <button className={`btn ${myUnion.strikeActive?"btn-red":"btn-primary"}`} style={{flex:1}} onClick={()=>toggleStrike(myUnion.id)}>
                    {myUnion.strikeActive?"✋ Grevi Bitir":"⚡ Grev İlan Et"}
                  </button>
                )}
                {myUnion.leader!==cu.username&&(
                  <button className="btn" style={{flex:1,border:"1px solid rgba(239,68,68,0.4)",color:"#EF4444"}} onClick={()=>leaveUnion(myUnion.id)}>
                    Sendikadan Ayrıl
                  </button>
                )}
              </div>
            </div>
          )}

          {unions.length===0&&(
            <div style={{...card,textAlign:"center",padding:"2rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🏭</div>
              <div style={{color:"#5E7390",fontSize:"0.85rem",marginBottom:"1rem"}}>Henüz kurulmuş sendika yok.</div>
              <button className="btn btn-primary" onClick={()=>setTab("create")}>+ İlk Sendikayı Kur</button>
            </div>
          )}

          {unions.map(u=>{
            const isMember = (u.members||[]).includes(cu.username);
            const isLeader = u.leader===cu.username;
            const memberCount = (u.members||[]).length;
            const timeLeft = Math.max(0, UNION_DEADLINE_MS - (now - (u.createdAt||now)));
            const deadlinePassed = !u.confirmed && memberCount < UNION_MEMBER_REQUIREMENT && timeLeft <= 0;
            if (deadlinePassed) return null; // don't render dissolved unions
            return (
              <div key={u.id} style={{...card,border:isMember?"1px solid rgba(16,185,129,0.25)":u.confirmed?"1px solid rgba(59,130,246,0.2)":"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                  <div>
                    <div style={{fontWeight:700,color:"#fff",fontSize:"0.95rem"}}>{u.name}</div>
                    <div style={{fontSize:"0.72rem",color:"#5E7390"}}>Lider: {u.leader} · {memberCount} üye</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"0.2rem"}}>
                    {u.strikeActive&&<span style={{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:6,padding:"0.2rem 0.5rem",fontSize:"0.65rem",fontWeight:700,color:"#EF4444"}}>GREV</span>}
                    {u.confirmed?<span style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:6,padding:"0.15rem 0.45rem",fontSize:"0.6rem",fontWeight:700,color:"#10B981"}}>✅ Onaylı</span>
                    :<span style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:6,padding:"0.15rem 0.45rem",fontSize:"0.6rem",fontWeight:700,color:"#F59E0B"}}>{memberCount}/{UNION_MEMBER_REQUIREMENT} üye</span>}
                  </div>
                </div>
                {!u.confirmed && (
                  <div style={{fontSize:"0.65rem",color:"#D97706",marginBottom:"0.4rem"}}>
                    ⏳ Son: {fmtTime(timeLeft)} — {UNION_MEMBER_REQUIREMENT} üye hedefi
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.35rem",marginBottom:"0.6rem"}}>
                  {[
                    {l:"Üyeler",v:memberCount,c:"#60A5FA"},
                    {l:"Kasa",v:fmtMoney(u.treasury||0),c:"#10B981"},
                    {l:"Etki",v:u.influence||0,c:"#A78BFA"},
                  ].map(s=>(
                    <div key={s.l} style={{background:"rgba(255,255,255,0.03)",borderRadius:7,padding:"0.35rem",textAlign:"center"}}>
                      <div style={{fontWeight:700,fontSize:"0.8rem",color:s.c}}>{s.v}</div>
                      <div style={{fontSize:"0.57rem",color:"#5E7390"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {!isMember&&!myUnion&&(
                  <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>joinUnion(u.id)}>Sendikaya Katıl</button>
                )}
                {isMember&&<span style={{fontSize:"0.75rem",color:"#10B981",fontWeight:700}}>✅ {isLeader?"Lider":"Üye"}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* KARİYERİM */}
      {tab==="career"&&(
        <div>
          {/* Fabrika Vardiya paneli */}
          <div style={card}>
            <div className="card-title">🏭 Fabrika Vardiyası</div>
            <p style={{fontSize:"0.8rem",color:"#8899AA",marginBottom:"0.75rem"}}>
              Sendika üyeleri fabrikalarda çalışabilir. Her vardiya 4 saat sürer. Tamamlandığında seviyenize ve sendika etkisine göre ücret alırsınız.
            </p>
            {!myUnion ? (
              <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,padding:"0.6rem",fontSize:"0.8rem",color:"#F59E0B"}}>
                ⚠️ Fabrikada çalışmak için önce bir sendikaya katılmanız gerekiyor.
                <button className="btn btn-primary" style={{marginTop:"0.5rem",width:"100%"}} onClick={()=>setTab("list")}>Sendika Listesine Git</button>
              </div>
            ) : !myUnion.confirmed && (myUnion.members||[]).length < UNION_MEMBER_REQUIREMENT ? (
              <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"0.6rem",fontSize:"0.8rem",color:"#EF4444"}}>
                ❌ Sendikanız henüz onaylanmadı. {(myUnion.members||[]).length}/{UNION_MEMBER_REQUIREMENT} üye — Fabrika çalışması için {UNION_MEMBER_REQUIREMENT} üyeye ulaşılmalı.
              </div>
            ) : shiftActive ? (
              <div>
                <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:10,padding:"0.75rem",marginBottom:"0.75rem",textAlign:"center"}}>
                  <div style={{fontSize:"1.1rem",fontWeight:900,color:"#10B981",fontFamily:"JetBrains Mono,monospace"}}>{fmtTime(myShift.end-now)}</div>
                  <div style={{fontSize:"0.7rem",color:"#5E7390",marginTop:"0.2rem"}}>Bitiş Süresi</div>
                  <div style={{fontSize:"0.82rem",color:"#FFB800",fontWeight:700,marginTop:"0.4rem"}}>Beklenen: {fmtMoney(myShift.pay)}</div>
                </div>
                {myShift.end<=now
                  ? <button className="btn btn-primary" style={{width:"100%"}} onClick={endShift}>✅ Ücretimi Al — {fmtMoney(myShift.pay)}</button>
                  : <button className="btn btn-red" style={{width:"100%"}} onClick={endShift}>⏹ Erken Bitir (Ücret Alınamazsınız)</button>
                }
              </div>
            ) : (
              <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>startShift(myUnion.id)}>▶ Fabrika Vardiyasını Başlat (4 saat)</button>
            )}
          </div>

          {/* Sendika bilgisi */}
          <div style={card}>
            <div className="card-title">🏭 Sendika Üyeliğim</div>
            {myUnion ? (
              <div style={{fontSize:"0.85rem",color:"#fff"}}>
                <div style={{marginBottom:"0.3rem"}}><span style={{color:"#5E7390"}}>Sendika:</span> <span style={{fontWeight:700,color:"#10B981"}}>{myUnion.name}</span></div>
                <div style={{marginBottom:"0.3rem"}}><span style={{color:"#5E7390"}}>Rolüm:</span> <span style={{fontWeight:700}}>{myUnionRole}</span></div>
                <div style={{marginBottom:"0.3rem"}}><span style={{color:"#5E7390"}}>Durum:</span> <span style={{fontWeight:700,color:myUnion.confirmed?"#10B981":"#F59E0B"}}>{myUnion.confirmed?"Onaylı ✅":"Onay Bekleniyor"}</span></div>
                <div><span style={{color:"#5E7390"}}>Grev Durumu:</span> <span style={{fontWeight:700,color:myUnion.strikeActive?"#EF4444":"#10B981"}}>{myUnion.strikeActive?"Aktif":"Yok"}</span></div>
              </div>
            ) : (
              <div style={{fontSize:"0.82rem",color:"#5E7390"}}>
                Henüz bir sendikaya üye değilsiniz.
                <button className="btn btn-primary" style={{marginTop:"0.6rem",width:"100%"}} onClick={()=>setTab("list")}>Sendika Listesine Git</button>
              </div>
            )}
          </div>

          {/* Haklar ve avantajlar */}
          <div style={card}>
            <div className="card-title">⚡ Sendika Avantajları</div>
            <ul style={{fontSize:"0.8rem",color:"#8899AA",lineHeight:1.7,paddingLeft:"1.2rem",margin:0}}>
              <li>10 üyeye ulaşınca fabrikalarda çalışma hakkı kazanılır</li>
              <li>Fabrika sahipleriyle toplu sözleşme hakkı</li>
              <li>Grev yaparak üretimi durdurabilirsiniz</li>
              <li>Sendika kasasından acil yardım alabilirsiniz</li>
              <li>Toplu eylem puanı ile etki gücü kazanırsınız</li>
            </ul>
          </div>
        </div>
      )}

      {/* YENİ SENDİKA KUR */}
      {tab==="create"&&(
        <div style={card}>
          <div className="card-title">+ Sendika Kur</div>
          {myUnion ? (
            <div style={{textAlign:"center",color:"#5E7390",padding:"1rem"}}>Zaten bir sendikaya üyesiniz. Önce mevcut sendikanızdan ayrılın.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem",marginTop:"0.5rem"}}>
              <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,padding:"0.6rem",fontSize:"0.75rem",color:"#F59E0B"}}>
                ⚠️ <strong>Önemli:</strong> Sendika kurulduktan sonra <strong>3 gün</strong> içinde <strong>{UNION_MEMBER_REQUIREMENT} üye</strong> toplamanız gerekiyor. Bu hedefe ulaşılmazsa sendika otomatik kapatılır.
              </div>
              <div>
                <div style={{fontSize:"0.72rem",color:"#5E7390",marginBottom:"0.25rem"}}>Sendika Adı *</div>
                <input
                  type="text"
                  placeholder="Örn: Fabrika İşçileri Sendikası"
                  value={newUnion.name}
                  onChange={e=>setNewUnion({name:e.target.value})}
                  style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"0.55rem 0.75rem",color:"#fff",fontSize:"0.85rem",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
                />
              </div>
              <div style={{fontSize:"0.78rem",color:"#5E7390",background:"rgba(255,255,255,0.02)",borderRadius:8,padding:"0.6rem",lineHeight:1.6}}>
                💡 Sendika kurarak işçileri organize edebilir, fabrika sahipleriyle müzakere yapabilir ve gerektiğinde grev ilan edebilirsiniz.
              </div>
              <button className="btn btn-primary" onClick={createUnion} style={{width:"100%"}}>🏭 Sendika Kur</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
