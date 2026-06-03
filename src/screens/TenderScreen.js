
// ═══════════════════════════════════════════════════════
// UNDERSTATE — Devlet İhaleleri (State Tenders) Ekranı
// Tüm veri PostgreSQL'de — çok oyunculu gerçek zamanlı
// ═══════════════════════════════════════════════════════
window.TenderScreen = function TenderScreen({ cu, families, allUsers, setCurrentPage }) {
  const [tenders, setTenders] = React.useState([]);
  const [pool, setPool] = React.useState([]);
  const [tab, setTab] = React.useState("list");
  const [bidInput, setBidInput] = React.useState({});
  const [relayDuration, setRelayDuration] = React.useState("72");
  const [msg, setMsg] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  const jwt = () => localStorage.getItem('us_jwt') || '';
  const showMsg = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };
  const fmtMoney = (n) => { if(!n)return "₺0"; if(n>=1e9)return "₺"+(n/1e9).toFixed(1)+"Mlr"; if(n>=1e6)return "₺"+(n/1e6).toFixed(1)+"M"; if(n>=1e3)return "₺"+(n/1e3).toFixed(0)+"K"; return "₺"+n; };
  const fmtTime  = (ms) => { if(ms<=0)return "Süresi Doldu"; const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000); return h>0?`${h}s ${m}dk`:`${m}dk`; };

  // Tick için sayaç (kalan süre güncelleme)
  React.useEffect(() => {
    const t = setInterval(() => setTick(p=>p+1), 10000);
    return () => clearInterval(t);
  }, []);

  // Sunucudan yükle
  const loadTenders = React.useCallback(async () => {
    try {
      const res = await fetch('/api/tender', { headers: { Authorization: 'Bearer ' + jwt() } });
      const data = await res.json();
      if (data.success) {
        setTenders(data.tenders || []);
        setPool(data.pool || []);
      }
    } catch(e) {}
  }, []);

  React.useEffect(() => { loadTenders(); }, [loadTenders]);

  // Socket: gerçek zamanlı güncelleme
  React.useEffect(() => {
    const s = window._socket;
    if (!s) return;
    const handler = (data) => { if (Array.isArray(data.tenders)) setTenders(data.tenders); };
    s.on('tender:sync', handler);
    return () => s.off('tender:sync', handler);
  }, []);

  const now = Date.now();
  const fams = Array.isArray(families) ? families : [];
  const isPresident  = cu?.position==="Devlet Başkanı" || cu?.role==="admin";
  const isFamilyLeader = fams.some(f=>f.leader===cu?.username);
  const userFamily   = fams.find(f=>f.leader===cu?.username||(Array.isArray(f.members)&&f.members.includes(cu?.username)));

  const relayTender = async (poolItem) => {
    if (!isPresident) return showMsg("Sadece Devlet Başkanı ihale iletebilir", "error");
    setLoading(true);
    try {
      const res = await fetch('/api/tender/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt() },
        body: JSON.stringify({ poolItem, durationHours: parseInt(relayDuration) || 72 }),
      });
      const data = await res.json();
      if (!data.success) { showMsg(data.msg || 'Hata oluştu', 'error'); return; }
      setTenders(data.tenders || []);
      setPool(data.pool || []);
      showMsg(`✅ "${poolItem.title}" ihalesi duyuruldu!`, "success");
      setTab("list");
      try { window._pushGameEvent?.('ihale_duyuruldu', `🏗️ İhale: ${poolItem.title}`, `Devlet Başkanı ${cu.username} yeni ihale açtı. Taban: ${fmtMoney(poolItem.startBid||0)}`, '🏗️', 'ihale'); } catch(e){}
    } catch { showMsg('Bağlantı hatası', 'error'); }
    finally { setLoading(false); }
  };

  const placeBid = async (tenderId) => {
    if (!isFamilyLeader) return showMsg("Sadece aile liderleri teklif verebilir", "error");
    const amount = parseInt(bidInput[tenderId]);
    if (!amount||isNaN(amount)) return showMsg("Geçerli bir teklif miktarı girin", "error");
    setLoading(true);
    try {
      const res = await fetch(`/api/tender/${tenderId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt() },
        body: JSON.stringify({ amount, familyName: userFamily?.name || cu?.username }),
      });
      const data = await res.json();
      if (!data.success) { showMsg(data.msg || 'Hata', 'error'); return; }
      setTenders(data.tenders || []);
      setBidInput(prev=>({...prev,[tenderId]:""}));
      showMsg("Teklifiniz verildi! ✓", "success");
      const t = tenders.find(t=>t.id===tenderId);
      if (t) try { window._pushGameEvent?.('ihale_teklif', `💰 İhale: ${t.title}`, `${cu.username} ${fmtMoney(amount)} teklif verdi.`, '💰', 'ihale'); } catch(e){}
    } catch { showMsg('Bağlantı hatası', 'error'); }
    finally { setLoading(false); }
  };

  const doControl = async (tenderId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tender/${tenderId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt() },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) { showMsg(data.msg || 'Hata', 'error'); return; }
      setTenders(data.tenders || []);
      showMsg("Kontrol başarıyla yapıldı! ✓", "success");
    } catch { showMsg('Bağlantı hatası', 'error'); }
    finally { setLoading(false); }
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

      <div style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:10,padding:"0.55rem 0.75rem",marginBottom:"0.75rem",fontSize:"0.75rem",color:"#818CF8",lineHeight:1.5}}>
        ℹ️ Tüm teklifler <strong>gerçek zamanlı</strong> senkronize edilir. Devlet Başkanı kendi ihalesi <strong>oluşturamaz</strong> — sistem havuzundaki ihaleleri duyurur.
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
              <div style={{color:"#5A7089",fontSize:"0.75rem"}}>Devlet Başkanı sistem havuzundan ihale duyurduğunda burada görünür.</div>
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
                    <div style={{fontSize:"0.65rem",color:"#5A7089",marginTop:"0.15rem"}}>
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
                      placeholder={`Min: ${fmtMoney((tender.currentBid||0)+1)}`}
                      value={bidInput[tender.id]||""}
                      onChange={e=>setBidInput(p=>({...p,[tender.id]:e.target.value}))}
                      style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"0.5rem 0.75rem",color:"#fff",fontSize:"0.82rem",fontFamily:"JetBrains Mono,monospace",outline:"none"}}
                    />
                    <button className="btn btn-primary" style={{flexShrink:0}} onClick={()=>placeBid(tender.id)} disabled={loading}>
                      {loading ? '...' : 'Teklif Ver'}
                    </button>
                  </div>
                )}
                {isOpen && !isFamilyLeader && !isPresident && (
                  <div style={{fontSize:"0.72rem",color:"#5E7390",padding:"0.35rem 0"}}>🏠 Teklif vermek için aile lideri olmanız gerekiyor.</div>
                )}
                {isWinner && tender.status==="active" && (
                  <div>
                    <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:8,padding:"0.5rem",marginBottom:"0.4rem",fontSize:"0.78rem",color:"#F59E0B"}}>
                      ⚠️ {tender.data?.lastControl ? `Son kontrol: ${new Date(tender.data.lastControl).toLocaleTimeString("tr-TR")}` : "Henüz kontrol yapılmadı!"} · Kaçırılan: {tender.data?.missedControls||0}
                    </div>
                    <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>doControl(tender.id)} disabled={loading}>✅ Proje Kontrolü Yap</button>
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
                <div style={{marginTop:"0.75rem",fontSize:"0.75rem",color:"#5A7089"}}>Teklif verebilmek için bir aile lideri olmanız gerekiyor.</div>
              )}
            </div>
          )}
          {wonTenders.map(t=>(
            <div key={t.id} style={{...card,border:"1px solid rgba(255,184,0,0.25)"}}>
              <div style={{fontWeight:700,color:"#FFB800",marginBottom:"0.25rem"}}>{t.title}</div>
              <div style={{fontSize:"0.8rem",color:"#8899AA"}}>Teklifiniz: {fmtMoney(t.currentBid)} · Durum: {t.status}</div>
              {t.status==="active" && (
                <button className="btn btn-primary" style={{marginTop:"0.5rem",width:"100%"}} onClick={()=>doControl(t.id)} disabled={loading}>✅ Proje Kontrolü Yap</button>
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
              Sistem tarafından hazırlanmış ihalelerden birini seçip duyurun. İhaleyi kendiniz oluşturamazsınız.
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

          {pool.length === 0 && (
            <div style={{...card,textAlign:"center",padding:"2rem",color:"#5E7390"}}>
              <div style={{fontSize:"1.5rem",marginBottom:"0.5rem"}}>✅</div>
              <div style={{fontSize:"0.85rem"}}>Tüm sistem ihaleleri duyurulmuş. Yeni ihaleler periyodik olarak sisteme eklenir.</div>
            </div>
          )}

          {pool.map(item=>(
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
                  <span style={{fontSize:"0.72rem",color:"#5E7390"}}>Taban: </span>
                  <span style={{fontWeight:700,color:"#FFB800",fontFamily:"JetBrains Mono,monospace"}}>{fmtMoney(item.startBid)}</span>
                </div>
                <button className="btn btn-primary" onClick={()=>relayTender(item)} style={{padding:"0.38rem 0.85rem",fontSize:"0.78rem"}} disabled={loading}>
                  {loading ? '...' : '📢 Duyur'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
