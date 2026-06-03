"use strict";
// ═══════════════════════════════════════════════════════
// HEADER BİLEŞENİ
// ═══════════════════════════════════════════════════════
// Not: useState/useEffect/useContext app.js global scope'undan gelir

function Header({ profile, notifCount, onNotif, page, onNavigate }) {
  const onlineCnt = useOnlineCount();
  const lvl = getLevelInfo(profile?.xp || 0);
  const { dark, toggle } = useTheme();
  const T = useT();
  const [parties] = useLs('parties', []);
  const [gangs] = useLs('gangs', []);
  const uid = profile?.uid || profile?.id;
  const myParty = uid ? parties.find(p => p.leaderId===uid || (p.members||[]).includes(uid)) : null;
  const myGang  = uid ? gangs.find(g => g.leaderId===uid || (g.members||[]).includes(uid)) : null;
  const orgLabel = myParty ? `🏛️ ${myParty.name}` : myGang ? `💀 ${myGang.name}` : null;

  return (
    <div style={{position:'sticky',top:0,zIndex:100,background: dark ? '#0F172A' : '#FFFFFF',borderBottom: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',boxShadow: dark ? '0 1px 8px rgba(0,0,0,0.4)' : '0 1px 8px rgba(0,0,0,0.06)'}} >
      {/* Ticker */}
      <div style={{height:'22px',background:'rgba(0,0,0,0.4)',borderBottom:'1px solid rgba(255,255,255,0.04)',overflow:'hidden',display:'flex',alignItems:'center'}}>
        <div style={{whiteSpace:'nowrap',fontSize:'0.58rem',fontFamily:"'JetBrains Mono',monospace",color:'#94A3B8',animation:'ticker 35s linear infinite',paddingLeft:'100%'}}>
          🟢 {onlineCnt} çevrimiçi oyuncu &nbsp;•&nbsp; 💰 TECH +2.4% ENERGY -1.1% BANK +3.2% &nbsp;•&nbsp; 🏛️ Parlamento: Anayasa değişikliği oylaması &nbsp;•&nbsp; ⚔️ Aktif çatışma: Kuzey bölgesi &nbsp;•&nbsp; 🕵️ İstihbarat: Gizli holding soruşturması &nbsp;•&nbsp; 🎓 Yeni üniversite kuruldu: Başvurular açık &nbsp;•&nbsp; 💼 İşsizlik oranı %12.4 &nbsp;•&nbsp; 🏗️ İstanbul'da 3 yeni inşaat ruhsatı &nbsp;•&nbsp; 👨‍👩‍👧 Yeni bir aile kuruldu &nbsp;•&nbsp; 🗳️ Seçim tarihi yaklaşıyor: 30 gün kaldı &nbsp;•&nbsp; 📈 Borsa rekor kırdı: 10 yılın en yüksek değeri &nbsp;•&nbsp; 🚔 Organize suç soruşturması genişledi &nbsp;•&nbsp; 🟢 {onlineCnt} çevrimiçi oyuncu &nbsp;•&nbsp; 💰 TECH +2.4% ENERGY -1.1%
        </div>
      </div>
      {/* Main header */}
      <div style={{display:'flex',alignItems:'center',padding:'0.4rem 0.75rem',gap:'0.55rem'}}>
        {/* Avatar + İsim */}
        <div onClick={()=>onNavigate&&onNavigate('profile')} style={{display:'flex',alignItems:'center',gap:'0.5rem',flex:1,minWidth:0,cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
          <Avatar profile={profile} size={38} />
          <div style={{display:'flex',flexDirection:'column',justifyContent:'center',minWidth:0}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:'0.78rem',fontWeight:700,color: dark ? '#E2E8F0' : '#1E293B',lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {profile?.username || '—'}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'0.3rem',flexWrap:'nowrap',overflow:'hidden'}}>
              <span style={{fontSize:'0.57rem',color:'#F59E0B',fontWeight:700,whiteSpace:'nowrap'}}>{lvl.title}</span>
              {orgLabel && <>
                <span style={{fontSize:'0.5rem',color: dark ? '#475569' : '#94A3B8'}}>•</span>
                <span style={{fontSize:'0.57rem',color: dark ? '#94A3B8' : '#64748B',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{orgLabel}</span>
              </>}
            </div>
          </div>
        </div>
        {/* Para */}
        <div style={{textAlign:'center',padding:'0.18rem 0.45rem',background: dark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:'8px',flexShrink:0}}>
          <div style={{fontSize:'0.42rem',color:'#6EE7B7',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:700}}>{T('money')}</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'0.67rem',fontWeight:700,color:'#10B981',lineHeight:1.3}}>{fmtWord(profile?.money)}</div>
        </div>
        {/* UnderCoin */}
        <div style={{textAlign:'center',padding:'0.18rem 0.45rem',background: dark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.3)',borderRadius:'8px',flexShrink:0}}>
          <div style={{fontSize:'0.42rem',color:'#C4B5FD',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:700}}>{T('uc')}</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'0.67rem',fontWeight:700,color:'#A78BFA',lineHeight:1.3}}>{fmt(profile?.underCoin||0)}</div>
        </div>
        {/* Tema */}
        <button onClick={toggle} title={dark?'Aydınlık mod':'Karanlık mod'} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'0.32rem 0.48rem',cursor:'pointer',fontSize:'0.9rem',color:'#8BA0B5',flexShrink:0}}>
          {dark ? '☀️' : '🌙'}
        </button>
        {/* Online sayısı */}
        <div onClick={()=>onNavigate&&onNavigate('players')} style={{display:'flex',alignItems:'center',gap:'3px',padding:'0.18rem 0.4rem',background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'8px',cursor:'pointer',flexShrink:0}} title="Çevrimiçi oyuncular">
          <span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#4ADE80',display:'inline-block',boxShadow:'0 0 5px #4ADE80'}}/>
          <span style={{fontSize:'0.6rem',color:'#4ADE80',fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{onlineCnt}</span>
        </div>
        {/* Bildirim */}
        <button onClick={onNotif} style={{position:'relative',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'0.32rem 0.48rem',cursor:'pointer',fontSize:'0.9rem',color:'#8BA0B5',flexShrink:0}}>
          🔔
          {notifCount > 0 && <span style={{position:'absolute',top:'-4px',right:'-4px',background:'#EF4444',color:'#fff',fontSize:'0.52rem',fontWeight:900,minWidth:'14px',height:'14px',borderRadius:'7px',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 2px',border:'2px solid #06080F'}}>{notifCount}</span>}
        </button>
      </div>
      <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}
