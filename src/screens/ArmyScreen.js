// ═══════════════════════════════════════════════════════
// UNDERSTATE — Genelkurmay Başkanı Ekranı
// ═══════════════════════════════════════════════════════
window.ArmyScreen = function ArmyScreen({ cu, allUsers, setCurrentPage }) {
  var useState = React.useState;

  var stored = function(key, def) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e) { return def; }
  };
  var persist = function(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
    if (window._socket) {
      window._socket.emit('gameEvent', { type: 'genelkurmayUpdate', payload: { key: key, from: cu && cu.username } });
    }
  };

  var tabState   = useState('panel');
  var tab        = tabState[0]; var setTab = tabState[1];
  var ordersState = useState(function() { return stored('us_genelkurmay_orders', []); });
  var orders     = ordersState[0]; var setOrders = ordersState[1];
  var msgState   = useState(null);
  var msg        = msgState[0]; var setMsg = msgState[1];

  var showMsg = function(text, type) {
    setMsg({ text: text, type: type || 'info' });
    setTimeout(function() { setMsg(null); }, 3500);
  };

  var now = Date.now();

  // ── Kim Genelkurmay Başkanı? ──
  var allPlayers = Array.isArray(allUsers) ? allUsers : [];
  var chief = allPlayers.find(function(u) { return u.position === 'Genelkurmay Başkanı'; }) || null;
  var chiefName = (chief && (chief.username || chief.name)) || null;
  var isChief = (cu && (cu.position === 'Genelkurmay Başkanı' || cu.role === 'admin'));

  // ── Askeri bütçe ──
  var militaryBudget = stored('rep_militaryBudget', 0);
  var fmtMoney = function(n) {
    if (!n) return '₺0';
    if (n >= 1e9) return '₺' + (n/1e9).toFixed(1) + 'Mr';
    if (n >= 1e6) return '₺' + (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '₺' + (n/1e3).toFixed(0) + 'K';
    return '₺' + n;
  };
  var fmtTime = function(ms) {
    if (ms <= 0) return 'Hazır';
    var h = Math.floor(ms / 3600000), m2 = Math.floor((ms % 3600000) / 60000);
    return h + 's ' + m2 + 'dk';
  };

  var activeOrders = orders.filter(function(o) { return o.active && o.expiresAt > now; });

  var ACTIONS = [
    { id:'mobilize',   icon:'📣', label:'Seferberlik İlan Et',  desc:'Tüm birlikleri hazır konuma al',          cd:36*3600000, xp:700,  power:true  },
    { id:'ohal',       icon:'🚨', label:'OHAL İlan Et',          desc:'Olağanüstü hal — ordu yetkileri genişler', cd:72*3600000, xp:1000, power:true  },
    { id:'inspection', icon:'🎖️', label:'Denetim Yap',          desc:'Birlikleri denetle, disiplini artır',      cd:6*3600000,  xp:300,  power:false },
    { id:'budget_req', icon:'💰', label:'Bütçe Talebi',         desc:'Meclisten ek askeri bütçe iste',           cd:24*3600000, xp:200,  power:false },
    { id:'war_plan',   icon:'🗺️', label:'Savaş Planı Hazırla', desc:'Stratejik savunma planı oluştur',          cd:12*3600000, xp:500,  power:false },
    { id:'parade',     icon:'🪖', label:'Askeri Geçit Töreni',  desc:'Halkın moralini yükselt',                  cd:48*3600000, xp:400,  power:false },
  ];

  var doAction = function(action) {
    if (!isChief) return showMsg('Bu yetkiyi sadece Genelkurmay Başkanı kullanabilir.', 'error');
    var cdKey = 'us_gk_cd_' + action.id;
    var lastUse = parseInt(localStorage.getItem(cdKey) || '0');
    var remaining = action.cd - (now - lastUse);
    if (remaining > 0) return showMsg('Bekleme süresi: ' + fmtTime(remaining), 'error');
    localStorage.setItem(cdKey, String(now));
    try {
      var prof = JSON.parse(localStorage.getItem('rep_userProfile') || '{}');
      prof.xp = (prof.xp || 0) + action.xp;
      localStorage.setItem('rep_userProfile', JSON.stringify(prof));
    } catch(e) {}
    var newOrder = {
      id: now, actionId: action.id, label: action.label, icon: action.icon,
      issuedBy: cu && cu.username, issuedAt: now, expiresAt: now + action.cd, active: true,
    };
    var updOrders = [newOrder].concat(orders).slice(0, 20);
    setOrders(updOrders);
    persist('us_genelkurmay_orders', updOrders);
    if (window._socket) window._socket.emit('gameEvent', { type:'militaryOrder', payload:{ order:newOrder, chief:cu && cu.username } });
    showMsg(action.icon + ' ' + action.label + ' emri verildi! +' + action.xp + ' XP', 'success');
  };

  var revokeOrder = function(orderId) {
    if (!isChief) return;
    var upd = orders.map(function(o) { return o.id === orderId ? Object.assign({}, o, { active:false }) : o; });
    setOrders(upd);
    persist('us_genelkurmay_orders', upd);
    showMsg('Emir iptal edildi.', 'info');
  };

  // ── Styles ──
  var bg = '#0F172A', card = '#1E293B', border = 'rgba(255,255,255,0.08)';
  var red = '#EF4444', gold = '#F5C800';

  var soldierCount = Object.keys(stored('us_army2_soldiers', {})).length;
  var armyPower = Math.floor((militaryBudget || 0) / 100000);

  var e = React.createElement;

  return e('div', { style:{ minHeight:'100vh', background:bg, color:'#E2E8F0', fontFamily:"'DM Sans',sans-serif", paddingBottom:90 } },

    // Header
    e('div', { style:{ background:'linear-gradient(135deg,#1a0505,#2d0808,#1a0505)', borderBottom:'2px solid '+red, padding:'16px 16px 12px', display:'flex', alignItems:'center', gap:12 } },
      e('button', { onClick:function(){setCurrentPage('home');}, style:{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:10, color:'#94A3B8', fontSize:'1rem', cursor:'pointer', padding:'6px 12px' } }, '← Geri'),
      e('div', { style:{ flex:1 } },
        e('div', { style:{ fontFamily:"'Syne',sans-serif", fontSize:'1.1rem', fontWeight:900, color:'#fff', letterSpacing:'0.05em' } }, '🪖 GENELKURMAY BAŞKANLIĞI'),
        e('div', { style:{ fontSize:'0.7rem', color:'#94A3B8', marginTop:2 } }, 'Türk Silahlı Kuvvetleri Komutanlığı')
      )
    ),

    // Msg
    msg && e('div', { style:{
      margin:'12px 16px 0', padding:'10px 14px', borderRadius:10, fontSize:'0.82rem', fontWeight:600,
      background: msg.type==='success' ? 'rgba(16,185,129,0.15)' : msg.type==='error' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
      border:'1px solid '+(msg.type==='success' ? 'rgba(16,185,129,0.4)' : msg.type==='error' ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)'),
      color: msg.type==='success' ? '#34D399' : msg.type==='error' ? '#F87171' : '#93C5FD',
    } }, msg.text),

    // Tabs
    e('div', { style:{ display:'flex', gap:8, padding:'12px 16px 0' } },
      ['panel', 'emirler'].map(function(t) {
        return e('button', { key:t, onClick:function(){setTab(t);}, style:{
          flex:1, padding:'8px', borderRadius:10, border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:700,
          background: tab===t ? red : 'rgba(255,255,255,0.06)',
          color: tab===t ? '#fff' : '#94A3B8',
        } }, t==='panel' ? '🎖️ Komuta Paneli' : '📋 Aktif Emirler');
      })
    ),

    // ── PANEL ──
    tab === 'panel' && e('div', { style:{ padding:'12px 16px' } },

      // Başkan kartı
      e('div', { style:{ background:card, border:'2px solid '+(chiefName ? gold : red), borderRadius:16, padding:16, marginBottom:12 } },
        e('div', { style:{ fontSize:'0.65rem', color:'#64748B', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 } }, 'Mevcut Genelkurmay Başkanı'),
        chiefName
          ? e('div', { style:{ display:'flex', alignItems:'center', gap:12 } },
              e('div', { style:{ width:52, height:52, borderRadius:'50%', background:'rgba(245,200,0,0.15)', border:'2px solid '+gold, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem' } }, '🪖'),
              e('div', {},
                e('div', { style:{ fontWeight:900, fontSize:'1.05rem', color:gold, fontFamily:"'Syne',sans-serif" } }, chiefName),
                e('div', { style:{ fontSize:'0.72rem', color:'#94A3B8', marginTop:2 } }, '⭐⭐⭐⭐ Genelkurmay Başkanı'),
                e('div', { style:{ fontSize:'0.68rem', color:'#64748B', marginTop:1 } }, 'Askeri Bütçe: ' + fmtMoney(militaryBudget))
              )
            )
          : e('div', { style:{ textAlign:'center', padding:'12px 0', color:'#64748B', fontSize:'0.85rem' } },
              e('div', { style:{ fontSize:'2rem', marginBottom:8 } }, '🏳️'),
              'Henüz bir Genelkurmay Başkanı atanmamış'
            )
      ),

      // İstatistikler
      e('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 } },
        [
          { label:'Aktif Emir',    value:activeOrders.length,          icon:'📋', color:red     },
          { label:'Askeri Bütçe', value:fmtMoney(militaryBudget),      icon:'💰', color:gold    },
          { label:'Ordu Gücü',    value:armyPower + ' puan',           icon:'⚔️', color:'#60A5FA' },
          { label:'Toplam Asker', value:soldierCount + ' kişi',        icon:'🪖', color:'#34D399' },
        ].map(function(stat) {
          return e('div', { key:stat.label, style:{ background:card, border:'1px solid '+border, borderRadius:12, padding:'12px 10px', textAlign:'center' } },
            e('div', { style:{ fontSize:'1.3rem', marginBottom:4 } }, stat.icon),
            e('div', { style:{ fontSize:'1rem', fontWeight:900, color:stat.color } }, stat.value),
            e('div', { style:{ fontSize:'0.6rem', color:'#64748B', fontWeight:700, textTransform:'uppercase', marginTop:2 } }, stat.label)
          );
        })
      ),

      // Yetkiler
      e('div', { style:{ background:card, border:'1px solid '+border, borderRadius:16, padding:14 } },
        e('div', { style:{ fontSize:'0.7rem', color:'#64748B', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 } }, '⚡ Komuta Yetkileri'),
        !isChief && e('div', { style:{ textAlign:'center', padding:'16px 0', color:'#475569', fontSize:'0.82rem' } },
          '🔒 Bu yetkiler sadece Genelkurmay Başkanı tarafından kullanılabilir'
        ),
        isChief && e('div', { style:{ display:'flex', flexDirection:'column', gap:8 } },
          ACTIONS.map(function(action) {
            var cdKey = 'us_gk_cd_' + action.id;
            var lastUse = parseInt(localStorage.getItem(cdKey) || '0');
            var remMs = action.cd - (now - lastUse);
            var ready = remMs <= 0;
            return e('button', {
              key:action.id, onClick:function(){doAction(action);}, disabled:!ready,
              style:{
                display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:12,
                border:'1px solid '+(ready ? (action.power ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)') : border),
                background: ready ? (action.power ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)') : 'transparent',
                cursor: ready ? 'pointer' : 'not-allowed', opacity: ready ? 1 : 0.5,
                WebkitTapHighlightColor:'transparent', textAlign:'left', width:'100%',
              }
            },
              e('span', { style:{ fontSize:'1.3rem' } }, action.icon),
              e('div', { style:{ flex:1 } },
                e('div', { style:{ fontSize:'0.82rem', fontWeight:700, color: ready ? '#E2E8F0' : '#64748B' } }, action.label),
                e('div', { style:{ fontSize:'0.65rem', color:'#64748B', marginTop:1 } }, action.desc)
              ),
              e('div', { style:{ fontSize:'0.62rem', fontWeight:700, color: ready ? '#34D399' : '#EF4444', whiteSpace:'nowrap' } },
                ready ? '+' + action.xp + ' XP' : fmtTime(remMs)
              )
            );
          })
        )
      ),

      // Aktif emirler özeti
      activeOrders.length > 0 && e('div', { style:{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12, padding:12, marginTop:12 } },
        e('div', { style:{ fontSize:'0.7rem', color:red, fontWeight:700, marginBottom:8 } }, '🚨 ' + activeOrders.length + ' Aktif Emir'),
        activeOrders.slice(0,3).map(function(o) {
          return e('div', { key:o.id, style:{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', color:'#94A3B8' } },
            e('span', {}, o.icon + ' ' + o.label),
            e('span', { style:{ color:'#64748B' } }, fmtTime(o.expiresAt - now))
          );
        })
      )
    ),

    // ── EMİRLER ──
    tab === 'emirler' && e('div', { style:{ padding:'12px 16px' } },
      orders.length === 0
        ? e('div', { style:{ textAlign:'center', padding:'48px 0', color:'#475569' } },
            e('div', { style:{ fontSize:'2.5rem', marginBottom:12 } }, '📋'),
            e('div', { style:{ fontSize:'0.85rem' } }, 'Henüz emir verilmemiş')
          )
        : e('div', { style:{ display:'flex', flexDirection:'column', gap:8 } },
            orders.map(function(o) {
              var expired = o.expiresAt <= now || !o.active;
              return e('div', { key:o.id, style:{ background:card, border:'1px solid '+(expired ? border : 'rgba(239,68,68,0.3)'), borderRadius:12, padding:'12px 14px', opacity: expired ? 0.5 : 1 } },
                e('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 } },
                  e('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
                    e('span', { style:{ fontSize:'1.2rem' } }, o.icon),
                    e('span', { style:{ fontWeight:700, fontSize:'0.85rem', color: expired ? '#64748B' : '#E2E8F0' } }, o.label)
                  ),
                  expired
                    ? e('span', { style:{ fontSize:'0.62rem', color:'#475569', fontWeight:700 } }, 'SONA ERDİ')
                    : isChief && e('button', {
                        onClick:function(){revokeOrder(o.id);},
                        style:{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:red, fontSize:'0.65rem', cursor:'pointer', padding:'3px 8px' }
                      }, 'İptal')
                ),
                e('div', { style:{ display:'flex', justifyContent:'space-between', fontSize:'0.65rem', color:'#64748B' } },
                  e('span', {}, 'Veren: ' + (o.issuedBy || '?')),
                  e('span', {}, expired ? 'Tamamlandı' : '⏳ ' + fmtTime(o.expiresAt - now))
                )
              );
            })
          )
    )
  );
};
