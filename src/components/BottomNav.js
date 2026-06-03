"use strict";
// ═══════════════════════════════════════════════════════
// ALT NAVİGASYON BİLEŞENİ
// ═══════════════════════════════════════════════════════
const { useState: useStateNav, useContext: useContextNav } = React;

const NAV_GROUPS = [
  { id:'home', icon:'🏠', label:'Ana Sayfa', rgb:'59,130,246', direct:true },
  {
    id:'ekonomi', icon:'💰', svgIcon:'money', label:'Ekonomi', rgb:'16,185,129',
    items:[
      { id:'jobs',            icon:'💼', svgIcon:'briefcase', label:'İşler',          rgb:'16,185,129' },
      { id:'kariyer',         icon:'🏗️',                      label:'Kariyer Çalışma', rgb:'245,158,11' },
      { id:'economy',         icon:'📊', svgIcon:'chart',     label:'Genel',          rgb:'16,185,129' },
      { id:'farm',            icon:'🌾',                      label:'Tarım',          rgb:'34,197,94'  },
      { id:'livestock',       icon:'🐄',                      label:'Hayvancılık',    rgb:'16,185,129' },
      { id:'market',          icon:'🛒',                      label:'Market',         rgb:'236,72,153' },
      { id:'holdings',        icon:'🏢',                      label:'Şirketler',      rgb:'245,158,11' },
      { id:'economic_empire', icon:'🏢',                      label:'İmparatorluk',   rgb:'16,185,129' },
      { id:'factory',         icon:'🏭', svgIcon:'factory',   label:'Fabrika',        rgb:'245,158,11' },
      { id:'mining',          icon:'⛏️',                     label:'Maden',          rgb:'161,97,40'  },
      { id:'education',       icon:'🎓', svgIcon:'education', label:'Eğitim',         rgb:'59,130,246' },
      { id:'unions',          icon:'🏭',                      label:'Sendikalar',     rgb:'16,185,129' },
      { id:'daily',           icon:'📅',                      label:'Görevler',       rgb:'245,158,11' },
    ],
  },
  {
    id:'savas', icon:'⚔️', label:'Savaş', rgb:'239,68,68',
    items:[
      { id:'army',             icon:'⚔️',                   label:'Ordu',       rgb:'239,68,68'  },
      { id:'pvp',              icon:'🥊',                   label:'Dövüş',      rgb:'239,68,68'  },
      { id:'gang',             icon:'🔫', svgIcon:'weapon', label:'Çete',       rgb:'239,68,68'  },
      { id:'family',           icon:'👨‍👩‍👧‍👦',                  label:'Aile',       rgb:'245,158,11' },
      { id:'tournament',       icon:'🎯',                   label:'Turnuva',    rgb:'239,68,68'  },
      { id:'crisis',           icon:'🚨',                   label:'Kriz',       rgb:'239,68,68'  },
      { id:'army_system',      icon:'🪖',                   label:'Genelkurmay',rgb:'239,68,68'  },
      { id:'independent_army', icon:'🪖',                   label:'Ordu Sistemi',rgb:'239,68,68' },
      { id:'protection_deals', icon:'🛡️',                   label:'Koruma',     rgb:'239,68,68'  },
      { id:'gang_treasury',    icon:'💰',                   label:'Çete Kasası',rgb:'239,68,68'  },
      { id:'crime',            icon:'⚖️', svgIcon:'law',   label:'Mahkeme',    rgb:'239,68,68'  },
    ],
  },
  {
    id:'devlet', icon:'🏛️', svgIcon:'government', label:'Devlet', rgb:'245,200,66',
    items:[
      { id:'politics',        icon:'🏛️', svgIcon:'government', label:'Siyaset',    rgb:'245,200,66' },
      { id:'yetkilerim',      icon:'⭐',                        label:'Yetkilerim', rgb:'245,200,66' },
      { id:'election_events', icon:'🚨',                        label:'Olaylar',    rgb:'239,68,68'  },
      { id:'teamwar',         icon:'⚔️',                       label:'Savaş',      rgb:'239,68,68'  },
      { id:'citygov',         icon:'🏙️',                       label:'Yönetim',    rgb:'99,102,241' },
      { id:'taxgov',          icon:'🏦', svgIcon:'bank',        label:'Belediye',   rgb:'245,158,11' },
      { id:'citybuild',       icon:'🏗️',                       label:'İnşaat',     rgb:'245,158,11' },
      { id:'map',             icon:'🗺️', svgIcon:'map',         label:'Harita',     rgb:'0,200,100'  },
      { id:'alliance',        icon:'🤝',                        label:'İttifak',    rgb:'96,165,250' },
      { id:'world',           icon:'🌍',                        label:'Dünya',      rgb:'59,130,246' },
      { id:'npcplayers',      icon:'🤖',                        label:'NPC',        rgb:'99,102,241' },
      { id:'parti_etki',      icon:'⚡',                        label:'Etki Puanı', rgb:'167,139,250'},
      { id:'party_center',    icon:'🏛️',                        label:'Meclis',     rgb:'167,139,250'},
      { id:'power_triangle',  icon:'⚡',                        label:'Güç Üçgeni', rgb:'245,200,66' },
      { id:'tenders',         icon:'🏗️',                        label:'İhaleler',   rgb:'245,200,66' },
      { id:'wiki',            icon:'📚',                        label:'Wiki',       rgb:'59,130,246' },
    ],
  },
  {
    id:'sosyal', icon:'👥', label:'Sosyal', rgb:'139,92,246',
    items:[
      { id:'chat',         icon:'💬', label:'Sohbet',    rgb:'139,92,246' },
      { id:'klanchat',     icon:'🔒', label:'Klan',      rgb:'139,92,246' },
      { id:'dm',           icon:'📬', label:'Mesaj',     rgb:'96,165,250' },
      { id:'players',      icon:'👥', label:'Oyuncular', rgb:'59,130,246' },
      { id:'social',       icon:'📱', label:'Sosyal',    rgb:'167,139,250'},
      { id:'newspaper',    icon:'📰', label:'Gazete',    rgb:'96,165,250' },
      { id:'football',     icon:'⚽', label:'Futbol',    rgb:'16,185,129' },
      { id:'casino',       icon:'🎰', label:'Kumarhane', rgb:'255,215,0'  },
      { id:'duyurular',    icon:'📣', label:'Duyurular', rgb:'245,158,11' },
      { id:'leaderboard',  icon:'🏆', label:'Sıralama',  rgb:'255,215,0'  },
      { id:'achievements', icon:'🎖️', label:'Başarılar', rgb:'255,215,0'  },
    ],
  },
];

const NAV_GROUP_TKEYS = { home:'home', ekonomi:'economy', savas:'battle', devlet:'state', sosyal:'social' };
const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.direct ? [{ id:g.id, icon:g.icon, label:g.label, rgb:g.rgb }] : (g.items||[]));
window.NAV_ITEMS = NAV_ITEMS;

function getActiveGroup(page) {
  if (page === 'home') return 'home';
  for (const g of NAV_GROUPS) {
    if (g.direct) continue;
    if (g.items && g.items.some(i => i.id === page)) return g.id;
  }
  return null;
}

function BottomNav({ page, onChange, items, notifMap={} }) {
  const { dark } = useTheme();
  const T = useT();
  const [openGroup, setOpenGroup] = useStateNav(null);
  const activeGroup = getActiveGroup(page);

  const allGroupIds = new Set(NAV_GROUPS.flatMap(g => g.direct ? [g.id] : (g.items||[]).map(i=>i.id)));
  const extraItems  = (items||[]).filter(i => !allGroupIds.has(i.id));
  const extraGroups = extraItems.map(i => ({ ...i, direct:true }));
  const allGroups   = [...NAV_GROUPS, ...extraGroups];

  const handleTabClick = (group) => {
    if (group.direct) { setOpenGroup(null); onChange(group.id); return; }
    setOpenGroup(prev => prev === group.id ? null : group.id);
  };

  const handleItemClick = (itemId) => { setOpenGroup(null); onChange(itemId); };
  const currentGroup = allGroups.find(g => g.id === openGroup);

  const bg     = dark ? '#0F172A' : '#FFFFFF';
  const border = dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)';
  const shadow = dark ? '0 -4px 16px rgba(0,0,0,0.4)'     : '0 -4px 16px rgba(0,0,0,0.08)';
  const navH   = 64;

  return (
    <>
      {openGroup && currentGroup && (
        <>
          <div onClick={() => setOpenGroup(null)} style={{position:'fixed',inset:0,zIndex:890,background:'rgba(0,0,0,0.5)'}} />
          <div style={{position:'fixed',bottom:navH,left:'50%',transform:'translateX(-50%)',width:'min(100vw, 480px)',zIndex:895,background:dark?'#111827':'#F8FAFC',borderTop:`2px solid rgba(${currentGroup.rgb},0.45)`,borderRadius:'18px 18px 0 0',padding:'14px 12px 10px',boxShadow:'0 -8px 40px rgba(0,0,0,0.5)',maxHeight:'56vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',paddingLeft:'2px'}}>
              <span style={{fontSize:'0.95rem',fontWeight:800,color:dark?'#E2E8F0':'#1E293B',fontFamily:"'Syne',sans-serif",letterSpacing:'0.04em'}}>
                {currentGroup.icon}&nbsp;{NAV_GROUP_TKEYS[currentGroup.id]?T(NAV_GROUP_TKEYS[currentGroup.id]):currentGroup.label}
              </span>
              <button onClick={() => setOpenGroup(null)} style={{background:dark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.07)',border:'none',borderRadius:'8px',color:dark?'#94A3B8':'#64748B',fontSize:'0.9rem',cursor:'pointer',padding:'4px 10px',lineHeight:1}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'7px'}}>
              {(currentGroup.items||[]).map(it => {
                const active = page === it.id;
                return (
                  <button key={it.id} onClick={() => handleItemClick(it.id)}
                    style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'5px',padding:'11px 4px',borderRadius:'13px',border:`1px solid ${active?`rgba(${it.rgb},0.5)`:dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}`,background:active?`rgba(${it.rgb},0.18)`:dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)',cursor:'pointer',WebkitTapHighlightColor:'transparent',transition:'all 0.12s',position:'relative'}}>
                    {it.svgIcon
                      ? <SvgIcon name={it.svgIcon} size={26} style={{filter:active?`drop-shadow(0 0 5px rgba(${it.rgb},0.7))`:'none'}} />
                      : <span style={{fontSize:'1.45rem',lineHeight:1,filter:active?`drop-shadow(0 0 5px rgba(${it.rgb},0.7))`:'none'}}>{it.icon}</span>}
                    <span style={{fontSize:'0.58rem',fontWeight:700,color:active?`rgb(${it.rgb})`:dark?'#94A3B8':'#64748B',textAlign:'center',lineHeight:1.2,letterSpacing:'0.01em'}}>{T(NAV_ITEM_TKEYS[it.id]||it.id)||it.label}</span>
                    {notifMap[it.id] > 0 && (
                      <span style={{position:'absolute',top:3,right:5,background:'#EF4444',color:'#fff',fontSize:'0.45rem',fontWeight:900,minWidth:'13px',height:'13px',borderRadius:'7px',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 2px'}}>{notifMap[it.id]}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:900,background:bg,borderTop:border,paddingBottom:'env(safe-area-inset-bottom,0px)',boxShadow:shadow}}>
        <div style={{display:'flex',height:`${navH}px`,maxWidth:'480px',margin:'0 auto'}}>
          {allGroups.map(group => {
            const isActive = group.direct ? page===group.id : activeGroup===group.id;
            const isOpen   = openGroup===group.id;
            const hasNotif = !group.direct && (group.items||[]).some(i => notifMap[i.id] > 0);
            const lit      = isActive || isOpen;
            return (
              <button key={group.id} onClick={() => handleTabClick(group)}
                style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'3px',border:'none',background:isOpen?`rgba(${group.rgb},0.1)`:'transparent',cursor:'pointer',WebkitTapHighlightColor:'transparent',position:'relative',transition:'background 0.15s',borderTop:lit?`2px solid rgb(${group.rgb})`:'2px solid transparent'}}>
                {group.svgIcon
                  ? <SvgIcon name={group.svgIcon} size={22} style={{transform:lit?'scale(1.12)':'scale(1)',transition:'transform 0.15s',filter:lit?`drop-shadow(0 0 5px rgba(${group.rgb},0.7))`:'none'}} />
                  : <span style={{fontSize:'1.25rem',lineHeight:1,transform:lit?'scale(1.12)':'scale(1)',transition:'transform 0.15s',filter:lit?`drop-shadow(0 0 5px rgba(${group.rgb},0.7))`:'none'}}>{group.icon}</span>}
                <span style={{fontSize:'0.5rem',fontWeight:800,letterSpacing:'0.04em',textTransform:'uppercase',color:lit?`rgb(${group.rgb})`:dark?'#475569':'#94A3B8',transition:'color 0.15s'}}>{NAV_GROUP_TKEYS[group.id]?T(NAV_GROUP_TKEYS[group.id]):group.label}</span>
                {hasNotif && <span style={{position:'absolute',top:5,right:'16%',width:'6px',height:'6px',borderRadius:'50%',background:'#EF4444'}} />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
