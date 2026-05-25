
// ═══════════════════════════════════════════════════════
// UNDERSTATE — Güç Üçgeni (Power Triangle) Ekranı
// ═══════════════════════════════════════════════════════
window.PowerTriangleScreen = function PowerTriangleScreen({ cu, families, gangs, parties, allUsers, setCurrentPage }) {
  const [tab, setTab] = React.useState("overview");
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

  const tabBtn = (id, label, icon) => (
    <button key={id} onClick={()=>setTab(id)} style={{
      flexShrink:0,padding:"0.42rem 0.85rem",borderRadius:20,border:"none",
      background:tab===id?"var(--accent)":"rgba(255,255,255,0.06)",
      color:tab===id?"#000":"#8899AA",fontSize:"0.78rem",fontWeight:700,
      cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Syne,sans-serif",minHeight:36
    }}>{icon} {label}</button>
  );

  return (
    <div>
      <div className="ministry-header">⚡ Güç Üçgeni</div>
      <p style={{fontSize:"0.82rem",color:"#6B7C93",marginBottom:"1rem",padding:"0 0.25rem"}}>
        Aileler, Çeteler ve Partiler arasındaki güç dengesi. Hiçbir grup tek başına tüm ekosistemi domine edemez.
      </p>

      {/* Tab bar */}
      <div style={{display:"flex",gap:"0.4rem",overflowX:"auto",paddingBottom:"0.5rem",marginBottom:"0.75rem",scrollbarWidth:"none"}}>
        {tabBtn("overview","Genel Bakış","📊")}
        {tabBtn("families","Aileler","👪")}
        {tabBtn("gangs","Çeteler","🔫")}
        {tabBtn("parties","Partiler","⚑")}
        {tabBtn("balance","Denge","⚖️")}
      </div>

      {/* GENEL BAKIŞ */}
      {tab==="overview" && (
        <div>
          {/* Üçgen görsel */}
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

          {/* Özet istatistikler */}
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

          {/* İlişki ağı */}
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
              <li>Silah satın alabilirler</li>
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
                  <div style={{fontSize:"0.7rem",color:"#5E7390"}}>Lider: {p.leader} · {(Array.isArray(p.members)?p.members:[]).length} üye</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:900,color:"#A78BFA",fontSize:"0.9rem"}}>{p.seats||0} koltuk</div>
                  <div style={{fontSize:"0.6rem",color:"#5E7390"}}>MECLİS</div>
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
            </ul>
            <button className="btn btn-primary" style={{marginTop:"0.75rem",width:"100%"}} onClick={()=>setCurrentPage("parties")}>
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
              {label:"Sendika Sistemi",               status: "Kurulumu Devam Ediyor", color:"#6B7C93"},
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
            <button className="btn btn-primary" onClick={()=>setCurrentPage("families")}>👪 Aile Sistemine Git</button>
            <button className="btn btn-primary" onClick={()=>setCurrentPage("gangs")}>🔫 Çete Sistemine Git</button>
            <button className="btn btn-primary" onClick={()=>setCurrentPage("parties")}>⚑ Parti Sistemine Git</button>
            <button className="btn" onClick={()=>setCurrentPage("tenders")} style={{border:"1px solid rgba(255,184,0,0.4)",color:"#FFB800"}}>🏗️ Devlet İhalelerine Git</button>
            <button className="btn" onClick={()=>setCurrentPage("unions")} style={{border:"1px solid rgba(16,185,129,0.4)",color:"#10B981"}}>🏭 Sendika Sistemine Git</button>
          </div>
        </div>
      )}
    </div>
  );
};
