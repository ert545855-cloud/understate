
// ═══════════════════════════════════════════════════════
// UNDERSTATE — Çete Kasası & Lojistik Ekranı
// treasury (sunucu) kullanır, silahlar DB'ye kaydedilir
// ═══════════════════════════════════════════════════════
window.GangTreasuryScreen = function GangTreasuryScreen({ cu, gangs, allUsers, setCurrentPage }) {
  const [tab, setTab]         = React.useState("treasury");
  const [weapons, setWeapons] = React.useState({});
  const [txLog, setTxLog]     = React.useState([]);
  const [contracts, setContracts] = React.useState(() => { try { return JSON.parse(localStorage.getItem("us_gangt_contracts") || "{}"); } catch { return {}; } });
  const [msg, setMsg]         = React.useState(null);

  const fmtMoney = (n) => { if(!n)return "₺0"; if(n>=1e9)return "₺"+(n/1e9).toFixed(1)+"Mlr"; if(n>=1e6)return "₺"+(n/1e6).toFixed(1)+"M"; if(n>=1e3)return "₺"+(n/1e3).toFixed(0)+"K"; return "₺"+n; };
  const showMsg = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000); };

  const gangsArr = Array.isArray(gangs) ? gangs : [];
  const myGang = gangsArr.find(g =>
    g.leader===cu?.username || g.leaderName===cu?.username ||
    (Array.isArray(g.members) && g.members.includes(cu?.username)) ||
    (Array.isArray(g.members) && g.members.includes(cu?.id))
  );
  const isLeader = myGang?.leader===cu?.username || myGang?.leaderName===cu?.username;

  // Silahları sunucudan yükle
  React.useEffect(() => {
    if (!myGang?.id) return;
    const sock = window._socket;
    if (!sock) return;
    sock.emit('gang:getWeapons', { gangId: myGang.id });
    const onWeapons = (data) => {
      if (data.gangId === myGang.id) setWeapons(data.weapons || {});
    };
    sock.on('gang:weapons', onWeapons);
    // Silah satın alma sonucu
    const onWeaponResult = (data) => {
      if (!data.ok) { showMsg(data.msg || 'Hata', 'error'); return; }
      if (data.gangId === myGang.id) {
        setWeapons(data.weapons || {});
        setTxLog(prev => [{ type:"buy", item: data.weaponId, amount: -(WEAPONS_CATALOG.find(w=>w.id===data.weaponId)?.price||0), timestamp: Date.now() }, ...prev].slice(0,30));
        showMsg(`Silah satın alındı! ✓`, "success");
      }
    };
    sock.on('gang:weaponResult', onWeaponResult);
    return () => { sock.off('gang:weapons', onWeapons); sock.off('gang:weaponResult', onWeaponResult); };
  }, [myGang?.id]);

  const WEAPONS_CATALOG = [
    {id:"knife",   name:"Bıçak",       price:5000,   power:2,  icon:"🔪"},
    {id:"pistol",  name:"Tabanca",     price:25000,  power:8,  icon:"🔫"},
    {id:"rifle",   name:"Tüfek",       price:80000,  power:20, icon:"🪖"},
    {id:"shotgun", name:"Pompalı",     price:60000,  power:15, icon:"💥"},
    {id:"smg",     name:"Hafif Mak.",  price:120000, power:30, icon:"⚡"},
    {id:"vehicle", name:"Zırhlı Araç", price:500000, power:60, icon:"🚗"},
  ];

  // treasury (sunucu DB) kullan — bank değil!
  const gangTreasury = myGang?.treasury || myGang?.bank || 0;
  const totalPower   = WEAPONS_CATALOG.reduce((a,w) => a + (weapons[w.id]||0)*w.power, 0);
  const myContracts  = contracts[myGang?.id] || [];
  const weeklyIncome = myContracts.reduce((a,c)=>a+(c.weeklyFee||0), 0);

  const buyWeapon = (weapon) => {
    if (!isLeader)  return showMsg("Sadece çete lideri silah alabilir", "error");
    if (!myGang)    return showMsg("Önce bir çeteye lider olun", "error");
    if (gangTreasury < weapon.price) return showMsg(`Yetersiz bakiye. Mevcut: ${fmtMoney(gangTreasury)}`, "error");
    const sock = window._socket;
    if (!sock?.connected) return showMsg("Sunucuya bağlı değilsiniz", "error");
    sock.emit('gang:buyWeapon', { gangId: myGang.id, weaponId: weapon.id });
  };

  const collectFee = (contractIdx) => {
    if (!isLeader) return showMsg("Sadece çete lideri koruma ücreti toplayabilir", "error");
    const contract = myContracts[contractIdx];
    if (!contract) return;
    const tx = {type:"fee", item:`Koruma ücreti: ${contract.familyName}`, amount:contract.weeklyFee, timestamp:Date.now()};
    setTxLog(prev => [tx, ...prev].slice(0,30));
    showMsg(`${fmtMoney(contract.weeklyFee)} koruma ücreti toplandı! ✓`, "success");
  };

  const addContract = () => {
    if (!isLeader) return showMsg("Sadece çete lideri anlaşma yapabilir", "error");
    const familyName = prompt("Anlaşma yapılacak aile adı:");
    if (!familyName) return;
    const weeklyFee = parseInt(prompt("Haftalık koruma ücreti (₺):"));
    if (!weeklyFee || isNaN(weeklyFee)) return showMsg("Geçerli bir ücret girin", "error");
    const contract = {id:"c_"+Date.now(), familyName, weeklyFee, startDate:Date.now(), status:"active"};
    const updC = {...contracts, [myGang.id]:[...myContracts, contract]};
    setContracts(updC);
    try { localStorage.setItem("us_gangt_contracts", JSON.stringify(updC)); } catch {}
    showMsg(`${familyName} ile koruma anlaşması yapıldı! ✓`, "success");
  };

  const card    = {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"1rem",marginBottom:"0.75rem"};
  const tabBtn  = (id,lbl,icon) => (
    <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"0.42rem 0.85rem",borderRadius:20,border:"none",background:tab===id?"var(--accent)":"rgba(255,255,255,0.06)",color:tab===id?"#000":"#8899AA",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Syne,sans-serif",minHeight:36}}>{icon} {lbl}</button>
  );

  if (!myGang) return (
    <div>
      <div className="ministry-header">💰 Çete Kasası & Lojistik</div>
      <div style={{...card,textAlign:"center",padding:"2rem"}}>
        <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🔫</div>
        <div style={{color:"#5E7390",fontSize:"0.85rem",marginBottom:"1rem"}}>Çete kasasına erişmek için bir çeteye üye veya lider olmanız gerekiyor.</div>
        <button className="btn btn-primary" onClick={()=>setCurrentPage("gang")}>🔫 Çete Sistemine Git</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="ministry-header">💰 {myGang.name} — Kasa & Lojistik</div>
      {msg&&(
        <div style={{padding:"0.6rem 0.85rem",borderRadius:10,marginBottom:"0.75rem",background:msg.type==="success"?"rgba(16,185,129,0.12)":msg.type==="error"?"rgba(239,68,68,0.12)":"rgba(59,130,246,0.12)",border:`1px solid ${msg.type==="success"?"rgba(16,185,129,0.3)":msg.type==="error"?"rgba(239,68,68,0.3)":"rgba(59,130,246,0.3)"}`,color:msg.type==="success"?"#10B981":msg.type==="error"?"#EF4444":"#60A5FA",fontSize:"0.82rem",fontWeight:600}}>
          {msg.text}
        </div>
      )}
      <div style={{display:"flex",gap:"0.4rem",overflowX:"auto",paddingBottom:"0.5rem",marginBottom:"0.75rem",scrollbarWidth:"none"}}>
        {tabBtn("treasury","Kasa","💰")}
        {tabBtn("weapons","Silahlar","🔫")}
        {tabBtn("contracts","Anlaşmalar","📋")}
        {tabBtn("txlog","İşlemler","📊")}
      </div>

      {tab==="treasury"&&(
        <div>
          <div style={{...card,background:"linear-gradient(135deg,rgba(239,68,68,0.08),rgba(0,0,0,0))"}}>
            <div style={{textAlign:"center",padding:"0.75rem"}}>
              <div style={{fontSize:"0.72rem",color:"#5E7390",marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.07em"}}>Mevcut Kasa (Sunucu)</div>
              <div style={{fontFamily:"JetBrains Mono,monospace",fontWeight:900,fontSize:"1.8rem",color:"#EF4444"}}>{fmtMoney(gangTreasury)}</div>
              <div style={{fontSize:"0.72rem",color:"#5E7390",marginTop:"0.25rem"}}>Haftalık beklenen gelir: <span style={{color:"#10B981",fontWeight:700}}>{fmtMoney(weeklyIncome)}</span></div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.45rem",marginBottom:"0.75rem"}}>
            {[
              {l:"Toplam Güç",v:totalPower,c:"#EF4444",icon:"⚔️"},
              {l:"Üye Sayısı",v:(myGang.members||[]).length,c:"#60A5FA",icon:"👥"},
              {l:"Anlaşmalar",v:myContracts.length,c:"#F59E0B",icon:"📋"},
            ].map(s=>(
              <div key={s.l} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${s.c}22`,borderRadius:10,padding:"0.6rem",textAlign:"center"}}>
                <div style={{fontSize:"1rem"}}>{s.icon}</div>
                <div style={{fontWeight:900,fontSize:"0.95rem",color:s.c,fontFamily:"Syne,sans-serif"}}>{s.v}</div>
                <div style={{fontSize:"0.58rem",color:"#5E7390",marginTop:"0.1rem"}}>{s.l}</div>
              </div>
            ))}
          </div>
          {isLeader&&(
            <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
              <button className="btn btn-primary" onClick={()=>setTab("weapons")}>🔫 Silah Al</button>
              <button className="btn" style={{border:"1px solid rgba(245,158,11,0.4)",color:"#F59E0B"}} onClick={()=>setTab("contracts")}>📋 Koruma Anlaşmaları</button>
            </div>
          )}
        </div>
      )}

      {tab==="weapons"&&(
        <div>
          <div style={card}>
            <div className="card-title">⚔️ Mevcut Silahlar</div>
            {WEAPONS_CATALOG.filter(w=>(weapons[w.id]||0)>0).length===0&&(
              <div style={{textAlign:"center",color:"#5E7390",padding:"0.75rem",fontSize:"0.82rem"}}>Henüz silah yok.</div>
            )}
            {WEAPONS_CATALOG.filter(w=>(weapons[w.id]||0)>0).map(w=>(
              <div key={w.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.45rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <span style={{fontSize:"0.85rem"}}>{w.icon} {w.name}</span>
                <div style={{textAlign:"right"}}>
                  <span style={{fontWeight:700,color:"#EF4444"}}>x{weapons[w.id]}</span>
                  <span style={{fontSize:"0.68rem",color:"#5E7390",marginLeft:"0.4rem"}}>(+{(weapons[w.id]||0)*w.power} güç)</span>
                </div>
              </div>
            ))}
            <div style={{marginTop:"0.6rem",padding:"0.4rem",background:"rgba(239,68,68,0.06)",borderRadius:8,textAlign:"center",fontSize:"0.8rem",color:"#EF4444",fontWeight:700}}>
              Toplam Silah Gücü: {totalPower}
            </div>
          </div>
          {isLeader&&(
            <div style={card}>
              <div className="card-title">🛒 Silah Mağazası</div>
              <div style={{fontSize:"0.75rem",color:"#5E7390",marginBottom:"0.75rem"}}>Kasa: {fmtMoney(gangTreasury)}</div>
              {WEAPONS_CATALOG.map(w=>(
                <div key={w.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.55rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:"0.85rem"}}>{w.icon} {w.name}</div>
                    <div style={{fontSize:"0.68rem",color:"#5E7390"}}>+{w.power} güç · {fmtMoney(w.price)}</div>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{padding:"0.35rem 0.75rem",fontSize:"0.75rem",minHeight:32,opacity:gangTreasury>=w.price?1:0.4}}
                    onClick={()=>buyWeapon(w)}
                    disabled={gangTreasury<w.price}
                  >
                    Satın Al
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==="contracts"&&(
        <div>
          <div style={card}>
            <div className="card-title">📋 Koruma Anlaşmaları</div>
            {myContracts.length===0&&(
              <div style={{textAlign:"center",color:"#5E7390",padding:"1rem",fontSize:"0.82rem"}}>
                Henüz koruma anlaşması yok.
              </div>
            )}
            {myContracts.map((c,i)=>(
              <div key={c.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.6rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.85rem"}}>{c.familyName}</div>
                  <div style={{fontSize:"0.7rem",color:"#5E7390"}}>Haftalık: {fmtMoney(c.weeklyFee)}</div>
                </div>
                <div style={{display:"flex",gap:"0.3rem",alignItems:"center"}}>
                  <span style={{background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:5,padding:"0.15rem 0.4rem",fontSize:"0.62rem",fontWeight:700,color:"#10B981"}}>Aktif</span>
                  {isLeader&&<button className="btn btn-primary" style={{padding:"0.3rem 0.6rem",fontSize:"0.72rem",minHeight:28}} onClick={()=>collectFee(i)}>Topla</button>}
                </div>
              </div>
            ))}
            {isLeader&&(
              <button className="btn btn-primary" style={{width:"100%",marginTop:"0.75rem"}} onClick={addContract}>
                + Yeni Anlaşma Ekle
              </button>
            )}
          </div>
          <div style={card}>
            <div className="card-title">💡 Koruma Mekanikleri</div>
            <ul style={{fontSize:"0.8rem",color:"#8899AA",lineHeight:1.7,paddingLeft:"1.2rem",margin:0}}>
              <li>Aileler fabrikalarını korumak için ödeme yapar</li>
              <li>Ödeme yapılmazsa fabrikalara sabotaj düzenlenebilir</li>
              <li>Sevkiyatlar engellenebilir</li>
              <li>Çete kasası silah ve maaş için kullanılır</li>
            </ul>
          </div>
        </div>
      )}

      {tab==="txlog"&&(
        <div>
          <div style={card}>
            <div className="card-title">📊 İşlem Geçmişi</div>
            {txLog.length===0&&(
              <div style={{textAlign:"center",color:"#5E7390",padding:"1rem",fontSize:"0.82rem"}}>Henüz işlem yok.</div>
            )}
            {txLog.map((tx,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.45rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:"0.8rem"}}>
                <div>
                  <div style={{color:"#ddd"}}>{tx.item || tx.type}</div>
                  <div style={{fontSize:"0.65rem",color:"#5E7390"}}>{new Date(tx.timestamp).toLocaleDateString("tr-TR")}</div>
                </div>
                <span style={{fontWeight:700,fontFamily:"JetBrains Mono,monospace",color:(tx.amount||0)>=0?"#10B981":"#EF4444"}}>{(tx.amount||0)>=0?"+":""}{fmtMoney(tx.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
