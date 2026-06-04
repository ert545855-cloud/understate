// ═══════════════════════════════════════════════════════
// DUYURULAR SAYFASI
// ═══════════════════════════════════════════════════════
function DuyurularPage({ profile }) {
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [announcements] = useLs('announcements', []);
  const [selected, setSelected] = useState(null);
  const catColor = {Siyaset:'#EF4444',Ekonomi:'#F59E0B',Hukuk:'#3B82F6',Etkinlik:'#10B981',Sistem:'#8B5CF6'};
  const defaultAnn = [
    {id:'ann1',title:'Seçim Krizi!',body:'Seçim sonuçları tartışmalı, siyasi gerilim tırmanıyor. Tüm partiler acil toplantıya çağrıldı.',category:'Siyaset',icon:'🏛️',ts:Date.now()-3600000},
    {id:'ann2',title:'Ekonomi Uyarısı',body:'Merkez Bankası faiz kararı açıkladı. Piyasalarda dalgalanma bekleniyor.',category:'Ekonomi',icon:'💰',ts:Date.now()-7200000},
    {id:'ann3',title:'Yeni Yasa Tasarısı',body:'Meclis yeni bir yasa tasarısı oylamaya sunuyor. Tüm vatandaşlar görüş bildirebilir.',category:'Hukuk',icon:'⚖️',ts:Date.now()-14400000},
    {id:'ann4',title:'Klan Turnuvası',body:'Bu hafta sonu klan savaşı başlıyor! Katılım için klan liderinizle iletişime geçin.',category:'Etkinlik',icon:'⚔️',ts:Date.now()-86400000},
  ];
  const list = [...announcements,...defaultAnn].slice(0,20);

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:800,color:'#F59E0B',letterSpacing:'0.08em'}}>📣 DUYURULAR</div>
      {selected ? (
        <div style={{background:card,border:`1px solid ${catColor[selected.category]||border}44`,borderRadius:'16px',padding:'1.25rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <span style={{fontSize:'1.8rem'}}>{selected.icon||'📣'}</span>
            <div>
              <div style={{fontSize:'0.95rem',fontWeight:800,color:dark?'#E8EDF2':'#1E293B'}}>{selected.title}</div>
              <div style={{fontSize:'0.72rem',color:catColor[selected.category]||'#F59E0B',fontWeight:700}}>{selected.category} • {timeAgo(selected.ts)}</div>
            </div>
          </div>
          <div style={{fontSize:'0.9rem',color:dark?'#CBD5E1':'#334155',lineHeight:'1.6'}}>{selected.body}</div>
          <button onClick={()=>setSelected(null)} style={{alignSelf:'flex-start',padding:'0.45rem 1rem',borderRadius:'10px',border:`1px solid ${border}`,background:'transparent',color:'#5A7089',fontSize:'0.8rem',cursor:'pointer',fontWeight:600}}>← Geri</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
          {list.map(a=>(
            <button key={a.id||a.ts} onClick={()=>setSelected(a)}
              style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'0.85rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem',cursor:'pointer',textAlign:'left',transition:'all 0.15s'}}>
              <span style={{fontSize:'1.4rem',flexShrink:0}}>{a.icon||'📣'}</span>
              <div style={{flex:1,overflow:'hidden'}}>
                <div style={{fontSize:'0.88rem',fontWeight:700,color:dark?'#E8EDF2':'#1E293B',marginBottom:'0.2rem'}}>{a.title}</div>
                <div style={{fontSize:'0.75rem',color:'#5A7089',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.body}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'0.2rem',flexShrink:0}}>
                <span style={{fontSize:'0.65rem',fontWeight:700,color:catColor[a.category]||'#F59E0B',background:`${catColor[a.category]||'#F59E0B'}15`,padding:'2px 6px',borderRadius:'6px'}}>{a.category}</span>
                <span style={{fontSize:'0.62rem',color:'#5A7089'}}>{timeAgo(a.ts)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

