// ═══════════════════════════════════════════════════════
// NPC OYUNCULAR SAYFASI
// ═══════════════════════════════════════════════════════
const NPC_DEFS = [
  {id:'npc1',name:'Don Kemal',   icon:'🤵',role:'Tefeci',      city:'İstanbul',desc:'Finans dünyasının gölge figürü', trait:'Açgözlü',  color:'#EF4444'},
  {id:'npc2',name:'Av. Avcı',    icon:'⚖️',role:'Avukat',      city:'Ankara',  desc:'Her davayı kazanan soğuk kanlı',trait:'Hesaplı',  color:'#3B82F6'},
  {id:'npc3',name:'Çakal Mete',  icon:'🎯',role:'Sokak Lideri',city:'İzmir',   desc:'Sokakların tartışmasız efendisi',trait:'Saldırgan',color:'#F59E0B'},
  {id:'npc4',name:'Büyükanne',   icon:'👵',role:'Bilge',       city:'Bursa',   desc:'Her şeyi bilen gizemli yaşlı kadın',trait:'Bilge',color:'#10B981'},
  {id:'npc5',name:'Korsan Hakan',icon:'🏴‍☠️',role:'Kaptan',  city:'Trabzon', desc:'Karadenizin efsanevi kaptanı',  trait:'Cesur',    color:'#8B5CF6'},
  {id:'npc6',name:'Dr. Yılmaz',  icon:'🔬',role:'Bilim İnsanı',city:'İzmir',  desc:'Tehlikeli bilginin sahibi',     trait:'Gizemli',  color:'#06B6D4'},
  {id:'npc7',name:'General Fırat',icon:'⚔️',role:'Subay',     city:'Ankara',  desc:'Darbe planlarıyla ünlü general',trait:'Otoriter', color:'#DC2626'},
  {id:'npc8',name:'Hacı Murat',  icon:'🕌',role:'Esnaf',       city:'Konya',   desc:'Çarşının gizli patronu',        trait:'Güvenilmez',color:'#D97706'},
];

function NpcPlayersPage({ profile, showNotif }) {
  const { dark } = useTheme();
  const cu = profile || {};
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [relations, setRelations] = useState(()=>{try{return JSON.parse(localStorage.getItem('npcRelations')||'{}');}catch{return {};}});
  const [activity, setActivity] = useState([
    {npc:'Don Kemal',   text:'Borsa üzerinden manipülasyon yaptı',ts:Date.now()-120000},
    {npc:'Çakal Mete',  text:'Güney mahallede toprak genişletti', ts:Date.now()-300000},
    {npc:'General Fırat',text:'Askeri tatbikat ilan etti',        ts:Date.now()-600000},
  ]);
  const [selected, setSelected] = useState(null);

  const doAction = (npc, action) => {
    const cur = relations[npc.id] || 0;
    const delta = action==='trade'?10:action==='alliance'?20:-25;
    const next = Math.max(-100, Math.min(100, cur+delta));
    const updated = {...relations,[npc.id]:next};
    setRelations(updated);
    localStorage.setItem('npcRelations', JSON.stringify(updated));
    const labels = {trade:'Ticaret',alliance:'İttifak',attack:'Saldırı'};
    setActivity(prev=>[{npc:npc.name,text:`${cu.username||'Sen'} ile ${labels[action]} → İlişki: ${next}`,ts:Date.now()},...prev].slice(0,20));
    showNotif(`${npc.icon} ${npc.name} ile ${labels[action]} yapıldı`,action==='attack'?'error':'success');
    setSelected(null);
  };

  const relColor = v => v>=50?'#10B981':v>=0?'#F59E0B':'#EF4444';
  const relLabel = v => v>=50?'Dost':v>=0?'Nötr':'Düşman';

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:800,color:'#818CF8',letterSpacing:'0.08em'}}>🤖 NPC OYUNCULAR</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem'}}>
        {NPC_DEFS.map(npc => {
          const rel = relations[npc.id]||0;
          return (
            <button key={npc.id} onClick={()=>setSelected(npc)}
              style={{background:card,border:`1px solid ${selected?.id===npc.id?npc.color:border}`,borderRadius:'14px',padding:'0.75rem',textAlign:'left',cursor:'pointer',display:'flex',flexDirection:'column',gap:'0.35rem',transition:'all 0.15s',boxShadow:selected?.id===npc.id?`0 0 12px ${npc.color}33`:'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
                <span style={{fontSize:'1.5rem'}}>{npc.icon}</span>
                <div style={{flex:1,overflow:'hidden'}}>
                  <div style={{fontSize:'0.82rem',fontWeight:700,color:dark?'#E8EDF2':'#1E293B',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{npc.name}</div>
                  <div style={{fontSize:'0.68rem',color:npc.color,fontWeight:600}}>{npc.role}</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:'0.65rem',color:'#5A7089'}}>{npc.city}</span>
                <span style={{fontSize:'0.65rem',fontWeight:700,color:relColor(rel)}}>{relLabel(rel)} ({rel>0?'+':''}{rel})</span>
              </div>
              <div style={{height:'3px',borderRadius:'2px',background:dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.abs(rel)}%`,background:relColor(rel),borderRadius:'2px',transition:'width 0.3s'}}/>
              </div>
            </button>
          );
        })}
      </div>
      {selected && (
        <div style={{background:card,border:`1px solid ${selected.color}44`,borderRadius:'16px',padding:'1rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
            <span style={{fontSize:'2rem'}}>{selected.icon}</span>
            <div>
              <div style={{fontSize:'0.95rem',fontWeight:800,color:dark?'#E8EDF2':'#1E293B'}}>{selected.name}</div>
              <div style={{fontSize:'0.75rem',color:'#5A7089'}}>{selected.desc}</div>
            </div>
          </div>
          <div style={{fontSize:'0.78rem',color:'#5A7089'}}>Özellik: <span style={{color:selected.color,fontWeight:700}}>{selected.trait}</span></div>
          <div style={{display:'flex',gap:'0.5rem'}}>
            <button onClick={()=>doAction(selected,'trade')} style={{flex:1,padding:'0.55rem',borderRadius:'10px',border:'1px solid rgba(16,185,129,0.3)',background:'rgba(16,185,129,0.1)',color:'#10B981',fontWeight:700,fontSize:'0.8rem',cursor:'pointer'}}>💼 Ticaret</button>
            <button onClick={()=>doAction(selected,'alliance')} style={{flex:1,padding:'0.55rem',borderRadius:'10px',border:'1px solid rgba(59,130,246,0.3)',background:'rgba(59,130,246,0.1)',color:'#60A5FA',fontWeight:700,fontSize:'0.8rem',cursor:'pointer'}}>🤝 İttifak</button>
            <button onClick={()=>doAction(selected,'attack')} style={{flex:1,padding:'0.55rem',borderRadius:'10px',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.1)',color:'#F87171',fontWeight:700,fontSize:'0.8rem',cursor:'pointer'}}>⚔️ Saldır</button>
          </div>
        </div>
      )}
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'0.78rem',fontWeight:700,color:'#5A7089',textTransform:'uppercase',letterSpacing:'0.1em',marginTop:'0.25rem'}}>Son Aktivite</div>
      <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
        {activity.map((a,i)=>(
          <div key={i} style={{background:card,border:`1px solid ${border}`,borderRadius:'10px',padding:'0.5rem 0.75rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'0.8rem',color:dark?'#E8EDF2':'#1E293B'}}><b style={{color:'#818CF8'}}>{a.npc}</b>: {a.text}</span>
            <span style={{fontSize:'0.65rem',color:'#5A7089',flexShrink:0,marginLeft:'0.5rem'}}>{timeAgo(a.ts)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

