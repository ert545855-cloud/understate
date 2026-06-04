// ═══════════════════════════════════════════════════════
// TAKIM SAVAŞI SİSTEMİ
// ═══════════════════════════════════════════════════════
function TeamWarPage({ profile, setProfile, showNotif }) {
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [wars, setWars] = useLs('activeWars', []);
  const [cabinet] = useLs('cabinet', {});
  const [treasury] = useLs('rep_treasury', { balance:0, militaryBudget:0 });
  const [gangs] = useLs('gangs', []);
  const [territories] = useLs('gangTerritories', {});
  const [playerArmy] = useLs('playerArmy', {});
  const [createModal, setCreateModal] = useState(false);
  const [warForm, setWarForm] = useState({ city:'', attackerType:'gang', attackerId:'', defenderType:'army' });
  const [warTab, setWarTab] = useState('active');

  const uid = profile?.uid || profile?.id;
  const isGeneral = cabinet['Genelkurmay Başkanı'] === profile?.username;
  const militaryBudget = treasury.militaryBudget || 0;

  // Gerginlik hesaplama
  const calcTension = () => {
    const _gangs = JSON.parse(localStorage.getItem('rep_gangs')||'[]');
    const _taxRates = JSON.parse(localStorage.getItem('rep_taxRates')||'{}');
    const _territory = JSON.parse(localStorage.getItem('rep_gangTerritories')||'{}');
    const gangCount = _gangs.length;
    const incomeTax = _taxRates.income || 15;
    const controlledRegions = Object.values(_territory).filter(v=>v).length;
    const activeWarCount = wars.filter(w=>w.status==='active').length;
    const tension = Math.min(100,
      gangCount * 5 +
      controlledRegions * 8 +
      Math.max(0, incomeTax - 15) * 1.2 +
      activeWarCount * 10
    );
    return Math.round(tension);
  };
  const tension = calcTension();

  const joinWar = (warId, side) => {
    setWars(prev => prev.map(w => {
      if (w.id !== warId) return w;
      const already = [...(w.attackerPlayers||[]), ...(w.defenderPlayers||[])].includes(uid);
      if (already) { showNotif('Zaten bu savaşa katıldın!','error'); return w; }
      const myArr = side==='attacker' ? 'attackerPlayers' : 'defenderPlayers';
      return { ...w, [myArr]: [...(w[myArr]||[]), uid] };
    }));
    setProfile(p => { const np={...p,xp:(p.xp||0)+200}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif('⚔️ Savaşa katıldın! +200 XP', 'success');
  };

  const resolveWar = (warId) => {
    if (!isGeneral) { showNotif('Sadece Genelkurmay Başkanı savaşı sonuçlandırabilir!','error'); return; }
    setWars(prev => prev.map(w => {
      if (w.id !== warId) return w;
      const aP = (w.attackerPlayers||[]).length;
      const dP = (w.defenderPlayers||[]).length;
      const aPow = aP * 12 + (w.attackerStr || 0);
      const dPow = dP * 10 + Math.floor(militaryBudget/100000);
      const winner = aPow > dPow ? 'attacker' : 'defender';
      return { ...w, status:'finished', winner, resolvedAt: Date.now() };
    }));
    showNotif('🏆 Savaş sonuçlandırıldı!', 'success');
  };

  const getArmyStrength = () => {
    const ARMY_UNIT_STR = {infantry:10,cavalry:25,artillery:80,navy:200,airforce:500};
    const ARMY_WEAPON_STR = {rifles:50,tanks:500,aircraft:2000};
    const myA = playerArmy[uid] || {};
    let str = Object.entries(ARMY_UNIT_STR).reduce((s,[k,v])=>s+(myA[k]||0)*v,0);
    const aw = myA.armyWeapons || {};
    str += Object.entries(ARMY_WEAPON_STR).reduce((s,[k,v])=>s+(aw[k]||0)*v,0);
    return str;
  };

  const createCityWar = () => {
    if (!isGeneral) { showNotif('Sadece Genelkurmay Başkanı savaş başlatabilir!','error'); return; }
    if (!warForm.city) { showNotif('Şehir seçin','error'); return; }
    if (militaryBudget < 500000) { showNotif('Askeri bütçe yetersiz! (min ₺500.000)','error'); return; }
    const attGang = gangs.find(g=>g.id===warForm.attackerId);
    const cityCtrl = territories[warForm.city];
    const ctrlGang = cityCtrl ? gangs.find(g=>g.id===cityCtrl.gangId) : null;
    const war = {
      id: genId(),
      city: warForm.city,
      attackerName: attGang ? attGang.name : (warForm.attackerId==='rebel'?'İsyancı Kuvvetler':'Bilinmeyen Güç'),
      attackerType: warForm.attackerType,
      attackerStr: attGang ? ((attGang.members||[]).length * 15 + (attGang.power||0) + (attGang.weapons||0)*5) : Math.floor(Math.random()*500+100),
      defenderName: ctrlGang ? ctrlGang.name : 'Devlet Ordusu',
      defenderType: ctrlGang ? 'gang' : 'army',
      defenderGangId: ctrlGang ? ctrlGang.id : null,
      defenderLeader: ctrlGang ? ctrlGang.leaderName : null,
      attackerPlayers: [], defenderPlayers: [uid],
      status: 'active', createdAt: Date.now(), createdBy: profile.username,
      warDamage: 0,
    };
    setWars(prev => [...prev, war]);
    setCreateModal(false);
    const evts = JSON.parse(localStorage.getItem('rep_gameEvents')||'[]');
    const defDesc = ctrlGang ? `Hedef: ${ctrlGang.name} (lider: ${ctrlGang.leaderName||'?'})` : 'Devlet kuvvetleri karşı çıkacak';
    evts.push({ id:genId(), type:'war_declared', title:`⚔️ ${war.city}'de Savaş!`, desc:`Genelkurmay Başkanı ${profile.username} ${war.city}'de askeri operasyon başlattı! ${defDesc}.`, ts:Date.now() });
    localStorage.setItem('rep_gameEvents', JSON.stringify(evts.slice(-50)));
    window.dispatchEvent(new CustomEvent('game-event', { detail: evts[evts.length-1] }));
    showNotif(`⚔️ ${war.city}'de operasyon başladı!`, 'success');
  };

  const activeWars = wars.filter(w => w.status === 'active');
  const finishedWars = wars.filter(w => w.status === 'finished').slice(-5);

  const tensionColor = tension >= 75 ? '#EF4444' : tension >= 50 ? '#F59E0B' : '#10B981';
  const tensionLabel = tension >= 75 ? 'KRİTİK' : tension >= 50 ? 'YÜKSEK' : tension >= 25 ? 'ORTA' : 'DÜŞÜK';

  return (
    <div style={{padding:'0.75rem',background:bg,minHeight:'100%'}}>
      {/* Başlık */}
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.25rem',fontWeight:900,color:'#EF4444',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
        ⚔️ Savaşlar
        {isGeneral && <span style={{fontSize:'0.62rem',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.4)',borderRadius:'6px',padding:'2px 8px',color:'#F87171',fontWeight:700}}>👑 KOMUTAN</span>}
      </div>

      {/* Gerginlik göstergesi */}
      <div style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${tensionColor}30`,borderRadius:'12px',padding:'0.75rem',marginBottom:'0.75rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.4rem'}}>
          <div style={{fontSize:'0.72rem',color:'#5A7089',fontWeight:700}}>🌡️ Ülke Gerginliği</div>
          <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'1rem',fontWeight:900,color:tensionColor}}>%{tension}</span>
            <span style={{fontSize:'0.6rem',fontWeight:800,color:tensionColor,background:`${tensionColor}18`,border:`1px solid ${tensionColor}35`,borderRadius:'5px',padding:'1px 6px'}}>{tensionLabel}</span>
          </div>
        </div>
        <div style={{height:'8px',background:'rgba(255,255,255,0.06)',borderRadius:'100px',overflow:'hidden',marginBottom:'0.35rem'}}>
          <div style={{height:'100%',width:`${tension}%`,background:`linear-gradient(90deg,#10B981,${tension>=50?'#F59E0B':'#10B981'},${tension>=75?'#EF4444':'transparent'})`,borderRadius:'100px',transition:'width 0.6s'}} />
        </div>
        <div style={{fontSize:'0.62rem',color:'#5A7089'}}>
          Çete bölge kontrolü, enflasyon ve aktif savaşlar gerginliği artırır
        </div>
      </div>

      {/* Aktif savaş yok banner */}
      {activeWars.length === 0 && (
        <div style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'10px',padding:'0.75rem',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <span style={{fontSize:'1.2rem'}}>🕊️</span>
          <div style={{fontSize:'0.82rem',color:'#10B981',fontWeight:700}}>Ülkende aktif savaş yok!</div>
        </div>
      )}

      {/* Genelkurmay'a özel eylem */}
      {isGeneral && (
        <div style={{marginBottom:'0.75rem'}}>
          <button onClick={()=>setCreateModal(true)}
            style={{width:'100%',padding:'0.7rem',background:'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.08))',border:'1px solid rgba(239,68,68,0.4)',borderRadius:'12px',color:'#EF4444',cursor:'pointer',fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'0.88rem'}}>
            ⚔️ Askeri Operasyon Başlat
          </button>
          {militaryBudget < 500000 && <div style={{fontSize:'0.68rem',color:'#F59E0B',textAlign:'center',marginTop:'0.3rem'}}>⚠️ Askeri bütçe yetersiz — min ₺500.000 gerekli</div>}
        </div>
      )}

      {/* Aktif çatışmalar */}
      {activeWars.length > 0 && (
        <div style={{marginBottom:'0.75rem'}}>
          <div style={{fontSize:'0.65rem',color:'#EF4444',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'0.5rem'}}>🔴 AKTİF ÇATIŞMALAR ({activeWars.length})</div>
          {activeWars.map(war => {
            const myJoined = [...(war.attackerPlayers||[]),...(war.defenderPlayers||[])].includes(uid);
            const mySide = (war.attackerPlayers||[]).includes(uid) ? 'attacker' : (war.defenderPlayers||[]).includes(uid) ? 'defender' : null;
            const aPow = war.attackerStr || (war.attackerPlayers||[]).length * 12;
            const armyStr = getArmyStrength();
            const dPow = Math.floor(militaryBudget/100000) + (war.defenderPlayers||[]).length * 10 + (war.defenderType==='army'?armyStr:0);
            const totalPow = aPow + dPow || 1;
            const aPct = Math.round(aPow/totalPow*100);
            return (
              <div key={war.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'14px',marginBottom:'0.65rem',overflow:'hidden'}}>
                {/* Şehir başlığı */}
                <div style={{background:'rgba(239,68,68,0.1)',padding:'0.6rem 0.85rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontWeight:900,color:'#EF4444',fontSize:'0.9rem'}}>📍 {war.city}</div>
                  <div style={{display:'flex',gap:'0.4rem',alignItems:'center'}}>
                    <span style={{fontSize:'0.58rem',fontWeight:800,color:'#10B981',background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.35)',borderRadius:'5px',padding:'1px 7px'}}>🔴 AKTİF</span>
                    <span style={{fontSize:'0.6rem',color:'#5A7089'}}>{timeAgo(war.createdAt)}</span>
                  </div>
                </div>

                <div style={{padding:'0.75rem'}}>
                  {/* Savaşan taraflar */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 36px 1fr',gap:'0.35rem',alignItems:'stretch',marginBottom:'0.65rem'}}>
                    {/* Saldırgan */}
                    <div style={{background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',padding:'0.65rem 0.5rem',textAlign:'center'}}>
                      <div style={{fontSize:'1.8rem',marginBottom:'0.25rem'}}>✊</div>
                      <div style={{fontWeight:800,color:'#F87171',fontSize:'0.78rem',marginBottom:'0.1rem'}}>{war.attackerName}</div>
                      <div style={{fontSize:'0.6rem',color:'#5A7089',marginBottom:'0.3rem'}}>{war.attackerType==='gang'?'Çete Kuvveti':'İsyancılar'}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'0.9rem',fontWeight:900,color:'#EF4444'}}>{war.attackerStr?.toLocaleString('tr-TR') || '?'}</div>
                      <div style={{fontSize:'0.55rem',color:'#4A5A6A',textTransform:'uppercase'}}>Güç Puanı</div>
                      <div style={{fontSize:'0.62rem',color:'#F87171',marginTop:'0.2rem'}}>{(war.attackerPlayers||[]).length} katılımcı</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'#EF4444',fontSize:'0.9rem'}}>VS</div>
                    {/* Savunmacı */}
                    <div style={{background:'rgba(59,130,246,0.07)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'10px',padding:'0.65rem 0.5rem',textAlign:'center'}}>
                      <div style={{fontSize:'1.8rem',marginBottom:'0.25rem'}}>🛡️</div>
                      <div style={{fontWeight:800,color:'#60A5FA',fontSize:'0.78rem',marginBottom:'0.1rem'}}>{war.defenderName || 'Devlet Ordusu'}</div>
                      <div style={{fontSize:'0.6rem',color:'#5A7089',marginBottom:'0.3rem'}}>Devlet Kuvvetleri</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'0.9rem',fontWeight:900,color:'#60A5FA'}}>{dPow.toLocaleString('tr-TR')}</div>
                      <div style={{fontSize:'0.55rem',color:'#4A5A6A',textTransform:'uppercase'}}>Güç Puanı</div>
                      <div style={{fontSize:'0.62rem',color:'#60A5FA',marginTop:'0.2rem'}}>{(war.defenderPlayers||[]).length} asker</div>
                    </div>
                  </div>

                  {/* Güç dağılımı */}
                  <div style={{marginBottom:'0.65rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.6rem',color:'#5A7089',marginBottom:'3px'}}>
                      <span style={{color:'#F87171'}}>Saldırgan %{aPct}</span>
                      <span style={{color:'#60A5FA'}}>Savunmacı %{100-aPct}</span>
                    </div>
                    <div style={{height:'6px',borderRadius:'100px',overflow:'hidden',display:'flex'}}>
                      <div style={{width:`${aPct}%`,background:'#EF4444',transition:'width 0.5s'}} />
                      <div style={{flex:1,background:'#3B82F6'}} />
                    </div>
                  </div>

                  {/* Katılım butonları */}
                  {!myJoined ? (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem'}}>
                      <button onClick={()=>joinWar(war.id,'attacker')}
                        style={{padding:'0.5rem',borderRadius:'10px',border:'1px solid rgba(239,68,68,0.4)',background:'rgba(239,68,68,0.1)',color:'#F87171',fontWeight:700,fontSize:'0.75rem',cursor:'pointer'}}>
                        ✊ Saldır
                      </button>
                      <button onClick={()=>joinWar(war.id,'defender')}
                        style={{padding:'0.5rem',borderRadius:'10px',border:'1px solid rgba(59,130,246,0.4)',background:'rgba(59,130,246,0.1)',color:'#60A5FA',fontWeight:700,fontSize:'0.75rem',cursor:'pointer'}}>
                        🛡️ Savun
                      </button>
                    </div>
                  ) : (
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:'0.75rem',color:mySide==='attacker'?'#F87171':'#60A5FA',fontWeight:700}}>
                        {mySide==='attacker'?'✊ Saldırgan tarafındasın':'🛡️ Savunmacı tarafındasın'}
                      </span>
                      {isGeneral && (
                        <button onClick={()=>resolveWar(war.id)}
                          style={{padding:'0.35rem 0.75rem',borderRadius:'8px',border:'none',background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',fontWeight:800,fontSize:'0.7rem',cursor:'pointer'}}>
                          🏆 Sonuçlandır
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Geçmiş savaşlar */}
      {finishedWars.length > 0 && (
        <div>
          <div style={{fontSize:'0.65rem',color:'#5A7089',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'0.5rem'}}>📜 GEÇMIŞ SAVAŞLAR</div>
          {finishedWars.map(war => (
            <div key={war.id} style={{background:'rgba(255,255,255,0.02)',border:`1px solid ${border}`,borderRadius:'10px',padding:'0.7rem',marginBottom:'0.4rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:'0.75rem',fontWeight:700,color:'#E8EDF2'}}>📍 {war.city}</div>
                <div style={{fontSize:'0.62rem',color:'#5A7089',marginTop:'1px'}}>{war.attackerName} — {timeAgo(war.resolvedAt||war.createdAt)}</div>
              </div>
              <span style={{fontSize:'0.68rem',fontWeight:700,color:'#F59E0B',background:'rgba(245,158,11,0.1)',borderRadius:'6px',padding:'2px 8px'}}>
                {war.winner==='defender'?'🛡️ Devlet Kazandı':'⚔️ Saldırgan Kazandı'}
              </span>
            </div>
          ))}
        </div>
      )}

      {wars.length === 0 && (
        <div style={{textAlign:'center',padding:'2rem',color:'#5A7089'}}>
          <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>🕊️</div>
          <div style={{fontSize:'0.85rem',color:'#5A7089'}}>Henüz savaş kaydı yok</div>
          <div style={{fontSize:'0.72rem',color:'#5A7089',marginTop:'0.3rem'}}>Çeteler bölge ele geçirince savaşlar burada görünür</div>
        </div>
      )}

      {/* Savaş başlatma modalı */}
      {createModal && (
        <Modal title="⚔️ Askeri Operasyon" onClose={()=>setCreateModal(false)}>
          <div style={{marginBottom:'0.85rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Çatışma Şehri</div>
            <select value={warForm.city} onChange={e=>setWarForm(p=>({...p,city:e.target.value}))}
              style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'15px',outline:'none',boxSizing:'border-box'}}>
              <option value=''>— Şehir Seç —</option>
              {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{marginBottom:'0.85rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Saldıran Güç (Çete)</div>
            <select value={warForm.attackerId} onChange={e=>setWarForm(p=>({...p,attackerId:e.target.value}))}
              style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'15px',outline:'none',boxSizing:'border-box'}}>
              <option value=''>— Düşman Güç Seç —</option>
              {gangs.map(g=><option key={g.id} value={g.id}>{g.name} ({(g.members||[]).length} üye)</option>)}
              <option value='rebel'>İsyancı Kuvvetler</option>
            </select>
          </div>
          {warForm.city && (() => {
            const ctrl = territories[warForm.city];
            const ctrlG = ctrl ? gangs.find(g=>g.id===ctrl.gangId) : null;
            return (
              <div style={{background: ctrlG ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)', border: ctrlG ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(59,130,246,0.2)', borderRadius:'10px', padding:'0.65rem', fontSize:'0.78rem', color: ctrlG ? '#FCA5A5' : '#93C5FD', marginBottom:'1rem'}}>
                {ctrlG ? (
                  <>🎯 Hedef (bölge kontrolcüsü): <strong>{ctrlG.name}</strong> — Lider: <strong>{ctrlG.leaderName||'?'}</strong><br/><span style={{fontSize:'0.7rem',color:'#999'}}>Güç: {(ctrlG.power||0) + (ctrlG.weapons||0)*5} • {ctrlG.territory||0} bölge</span></>
                ) : (
                  <>🛡️ Savunmacı: <strong>Devlet Ordusu</strong> (₺{fmtWord(militaryBudget)} bütçe + ordu gücü)</>
                )}
              </div>
            );
          })()}
          <Btn variant='danger' size='full' onClick={createCityWar}>⚔️ Operasyonu Başlat</Btn>
        </Modal>
      )}
    </div>
  );
}

