function SocialPage({ profile, showNotif }) {
  const [posts, setPosts] = useLs('socialPosts', []);
  const [newPost, setNewPost] = useState('');
  const [postImage, setPostImage] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const cu = profile || {};

  const SOCIAL_GIFS = [
    'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
    'https://media.giphy.com/media/l0HlFZ3HqbGrMTBQs/giphy.gif',
    'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    'https://media.giphy.com/media/xT9IgG50Lg7russbBO/giphy.gif',
    'https://media.giphy.com/media/l4FGGafcOHmrlQxG0/giphy.gif',
    'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
    'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    'https://media.giphy.com/media/3oEdv22bMDaqXkOIPS/giphy.gif',
  ];

  const publishPost = (contentOverride, imageOverride) => {
    const content = contentOverride || newPost;
    const image = imageOverride !== undefined ? imageOverride : postImage;
    if (!content.trim() && !image.trim()) { showNotif('❌ Gönderi boş olamaz!','error'); return; }
    if (content.length > 500) { showNotif('❌ Maksimum 500 karakter!','error'); return; }
    const post = {
      id:Date.now(), author:cu.username, content:content.trim(),
      imageUrl: image.trim() || undefined,
      likes:[], comments:[], date:new Date().toLocaleDateString('tr-TR'),
      time:new Date().toLocaleTimeString('tr-TR'), city:cu.city||'İstanbul'
    };
    setPosts(prev=>[post,...prev].slice(0,200));
    setNewPost(''); setPostImage(''); setShowGifPicker(false);
    showNotif('✅ Gönderi paylaşıldı!','success');
    try {
      const ds = JSON.parse(localStorage.getItem('rep_dailyTaskProgress')||'{}');
      const today = new Date().toDateString();
      const ts = ds[today]||{};
      const ps = JSON.parse(localStorage.getItem('rep_socialPosts')||'[]');
      localStorage.setItem('rep_socialPosts', JSON.stringify([post,...ps].slice(0,200)));
    } catch(e){}
  };

  const likePost = (id) => {
    setPosts(prev=>prev.map(p=>{
      if(p.id!==id) return p;
      const liked = (p.likes||[]).includes(cu.username);
      return {...p,likes:liked?(p.likes||[]).filter(l=>l!==cu.username):[...(p.likes||[]),cu.username]};
    }));
  };

  const deletePost = (id) => {
    setPosts(prev=>prev.filter(p=>p.id!==id));
    showNotif('🗑️ Gönderi silindi.','info');
  };

  const imgRx = /(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|gifv)(\?\S*)?|https?:\/\/(?:media\.giphy\.com|i\.giphy\.com|tenor\.com|c\.tenor\.com)\S+)/i;

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#A78BFA',marginBottom:'1rem'}}>📱 Sosyal Medya</div>
      <div style={{background:'rgba(167,139,250,0.05)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
        <textarea value={newPost} onChange={e=>setNewPost(e.target.value)} placeholder={`${cu.username||'Oyuncu'} olarak ne düşünüyorsun?`} rows={3}
          style={{width:'100%',background:'transparent',border:'none',outline:'none',color:'#E8EDF2',fontSize:'0.9rem',resize:'none',fontFamily:'inherit',marginBottom:'0.5rem'}} />
        {postImage && (
          <div style={{position:'relative',marginBottom:'0.5rem'}}>
            <img src={postImage} alt="önizleme" style={{maxWidth:'100%',maxHeight:'180px',borderRadius:'10px',objectFit:'cover',border:'1px solid rgba(167,139,250,0.2)'}} onError={e=>e.target.style.display='none'} />
            <button onClick={()=>setPostImage('')} style={{position:'absolute',top:'4px',right:'4px',background:'rgba(0,0,0,0.6)',border:'none',borderRadius:'50%',width:'22px',height:'22px',color:'#fff',cursor:'pointer',fontSize:'0.75rem',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
        )}
        {showGifPicker && (
          <div style={{marginBottom:'0.5rem'}}>
            <div style={{overflowX:'auto',display:'flex',gap:'0.4rem',paddingBottom:'0.3rem',scrollbarWidth:'none'}}>
              {SOCIAL_GIFS.map((g,i)=>(
                <img key={i} src={g} alt="gif" onClick={()=>{setPostImage(g);setShowGifPicker(false);}}
                  style={{height:'65px',width:'65px',objectFit:'cover',borderRadius:'8px',cursor:'pointer',border:'1px solid rgba(167,139,250,0.25)',flexShrink:0}}
                  onError={e=>e.target.style.display='none'} />
              ))}
            </div>
          </div>
        )}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'0.4rem'}}>
          <div style={{display:'flex',gap:'0.4rem',alignItems:'center'}}>
            <button onClick={()=>setShowGifPicker(v=>!v)} title="GIF ekle"
              style={{background:showGifPicker?'rgba(167,139,250,0.2)':'rgba(255,255,255,0.05)',border:`1px solid ${showGifPicker?'rgba(167,139,250,0.5)':'rgba(255,255,255,0.1)'}`,borderRadius:'8px',padding:'0.3rem 0.55rem',color:showGifPicker?'#A78BFA':'#666',cursor:'pointer',fontSize:'0.8rem',fontWeight:700}}>
              🎞️ GIF
            </button>
            <input value={postImage} onChange={e=>setPostImage(e.target.value)} placeholder="Resim URL..."
              style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'0.3rem 0.6rem',color:'#E8EDF2',fontFamily:'inherit',fontSize:'0.75rem',outline:'none',width:'130px'}} />
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <span style={{fontSize:'0.7rem',color:newPost.length>480?'#EF4444':'#666'}}>{newPost.length}/500</span>
            <button onClick={()=>publishPost()} style={{padding:'0.45rem 1.1rem',background:'rgba(167,139,250,0.15)',border:'1px solid rgba(167,139,250,0.35)',borderRadius:'8px',color:'#A78BFA',cursor:'pointer',fontWeight:700,fontFamily:'inherit',fontSize:'0.85rem'}}>📢 Paylaş</button>
          </div>
        </div>
      </div>
      {posts.map(p=>{
        const textImgMatch = p.content?.match(imgRx);
        const mainImage = p.imageUrl || (textImgMatch ? textImgMatch[0] : null);
        const displayText = textImgMatch ? p.content.replace(textImgMatch[0],'').trim() : p.content;
        return (
          <div key={p.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem'}}>
              <div>
                <div style={{fontWeight:700,color:'#A78BFA',fontSize:'0.88rem'}}>{p.author}</div>
                <div style={{fontSize:'0.65rem',color:'#666'}}>{p.city} · {p.date} {p.time}</div>
              </div>
              {p.author===cu.username&&<button onClick={()=>deletePost(p.id)} style={{background:'none',border:'none',color:'#EF4444',cursor:'pointer',fontSize:'0.85rem'}}>🗑️</button>}
            </div>
            {displayText && <div style={{fontSize:'0.88rem',color:'#ccc',lineHeight:1.6,marginBottom:'0.5rem'}}>{displayText}</div>}
            {mainImage && (
              <img src={mainImage} alt="" style={{maxWidth:'100%',maxHeight:'220px',borderRadius:'10px',objectFit:'cover',display:'block',marginBottom:'0.5rem',border:'1px solid rgba(255,255,255,0.07)'}} onError={e=>e.target.style.display='none'} />
            )}
            <div style={{display:'flex',gap:'0.5rem'}}>
              <button onClick={()=>likePost(p.id)} style={{padding:'0.25rem 0.7rem',background:(p.likes||[]).includes(cu.username)?'rgba(239,68,68,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${(p.likes||[]).includes(cu.username)?'rgba(239,68,68,0.4)':'rgba(255,255,255,0.08)'}`,borderRadius:'6px',color:(p.likes||[]).includes(cu.username)?'#EF4444':'#999',cursor:'pointer',fontSize:'0.78rem',fontFamily:'inherit'}}>❤️ {(p.likes||[]).length}</button>
            </div>
          </div>
        );
      })}
      {posts.length===0&&<div style={{textAlign:'center',padding:'2rem',color:'#555'}}><div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>📱</div>Henüz gönderi yok. İlk paylaşımı yap!</div>}
    </div>
  );
}

