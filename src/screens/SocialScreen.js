function YetkilerimPage({ profile, setProfile, showNotif }) {
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [cabinet] = useLs('cabinet', {});
  const [elections] = useLs('elections', { phase:'idle', candidates:[], votes:{} });
  const [taxRates, setTaxRates] = useLs('taxRates', { income:15, trade:10, property:5, interest:5 });
  const [treasury, setTreasury] = useLs('rep_treasury', { balance:0, lastUpdated:0 });
  const [printAmt, setPrintAmt] = useState('');
  const [taxForm, setTaxForm] = useState({ income: taxRates.income||15, trade:taxRates.trade||10, property:taxRates.property||5, interest:taxRates.interest||5 });
  useEffect(() => {
    setTaxForm({ income: taxRates.income||15, trade:taxRates.trade||10, property:taxRates.property||5, interest:taxRates.interest||5 });
  }, [taxRates.income, taxRates.trade, taxRates.property, taxRates.interest]);
  const [actionCooldowns, setActionCooldowns] = useLs('yetkiCooldowns', {});
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetAmt, setBudgetAmt] = useState('');
  const [selectedTaxCity, setSelectedTaxCity] = useState(profile?.city || 'İstanbul');
  const [cityTaxForm, setCityTaxForm] = useState({income:15,trade:10,property:5});
  const [taxCityData, setTaxCityData] = useState([]);
  const [taxLoading, setTaxLoading] = useState(false);
  const [economy, setEconomy] = useLs('rep_economy', {inflation:5});

  const myPositions = Object.entries(cabinet).filter(([,name]) => name === profile?.username).map(([role]) => role);
  const isPresident = cabinet['Devlet Başkanı'] === profile?.username;
  const isSpeaker = cabinet['Meclis Başkanı'] === profile?.username;
  const isInterior = cabinet['İçişleri Bakanı'] === profile?.username;
  const isMayor = cabinet['Belediye Başkanı'] === profile?.username;
  const isGovenor = cabinet['Vali'] === profile?.username;
  const isGeneral = cabinet['Genelkurmay Başkanı'] === profile?.username;
  const isTrade = cabinet['Ticaret Bakanı'] === profile?.username;
  const isFinance = cabinet['Maliye Bakanı'] === profile?.username;
  const isMayorOrGov = isMayor || isGovenor;

  const yetkiAction = (key, cdMs, fn) => {
    const last = actionCooldowns[key] || 0;
    const rem = cdMs - (Date.now() - last);
    if (rem > 0) { showNotif(`⏳ ${Math.ceil(rem/3600000)} saat sonra tekrar`, 'error'); return; }
    fn();
    setActionCooldowns(prev => ({ ...prev, [key]: Date.now() }));
  };

  const printMoney = () => {
    if (!isFinance) { showNotif('Bu yetki Maliye Bakanına ait!', 'error'); return; }
    const amt = parseInt(printAmt);
    if (!amt || amt <= 0) { showNotif('Geçerli tutar girin', 'error'); return; }
    yetkiAction('printMoney', 24*3600000, () => {
      setTreasury(prev => ({ ...prev, balance: (prev.balance||0)+amt, lastUpdated: Date.now() }));
      // Basılan para miktarını kaydet (enflasyon hesabı için)
      try {
        const pm = JSON.parse(localStorage.getItem('rep_printedMoney')||'{"total":0,"history":[]}');
        pm.total = (pm.total||0) + amt;
        pm.history = [...(pm.history||[]), {amt, ts:Date.now(), by:profile.username}].slice(-20);
        localStorage.setItem('rep_printedMoney', JSON.stringify(pm));
        window.dispatchEvent(new CustomEvent('fb-sync', {detail:{key:'printedMoney',value:pm}}));
      } catch(e){}
      setPrintAmt('');
      // Enflasyon hesabı
      const _pm = JSON.parse(localStorage.getItem('rep_printedMoney')||'{"total":0}');
      const basimOrani = (_pm.total||0) / 100000000;
      const gdpEtkisi = Math.min(50, Math.floor(basimOrani * 15));
      const newInflation = Math.min(99, (JSON.parse(localStorage.getItem('rep_economy')||'{"inflation":5}').inflation || 5) + gdpEtkisi);
      const yuksekEnflasyon = newInflation >= 50;
      const kritikEnflasyon = newInflation >= 80;
      let ekonMsg = kritikEnflasyon
        ? '🆘 HİPERENFLASYON! Merkez Bankası acil tedbir almalı.'
        : yuksekEnflasyon
          ? '⚠️ Yüksek enflasyon! Faiz artışı ve sıkılaşma gerekebilir.'
          : `📊 Para arzı genişledi. TÜFE baskısı oluşabilir.`;
      showNotif(`💸 ${fmtWord(amt)} basıldı! Enflasyon: %${newInflation.toFixed(1)} — ${ekonMsg}`, kritikEnflasyon?'error':'success');
      const evts = JSON.parse(localStorage.getItem('rep_gameEvents')||'[]');
      evts.push({ id: genId(), type: 'money_printed', title: '💸 Para Arzı Genişletildi', desc: `Maliye Bakanı ${profile.username} merkez bankası kanalıyla ${fmtWord(amt)} bastı. Dolaşımdaki para arttı, TÜFE: %${newInflation.toFixed(1)}. ${kritikEnflasyon?'Hiperenflasyon tehlikesi!':yuksekEnflasyon?'Faiz kararı bekleniyor.':''}`, ts: Date.now() });
      localStorage.setItem('rep_gameEvents', JSON.stringify(evts.slice(-50)));
    });
  };

  useEffect(() => {
    if (!isFinance) return;
    setTaxLoading(true);
    const token = localStorage.getItem('rep_token') || '';
    fetch('/api/tax', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json())
      .then(d => {
        if (d.rates) setTaxCityData(d.rates);
        const found = d.rates?.find(r => r.city === selectedTaxCity);
        if (found) setCityTaxForm({ income: found.income_tax_rate, trade: found.trade_tax_rate, property: found.property_tax_rate });
      })
      .catch(() => {})
      .finally(() => setTaxLoading(false));
    fetch('/api/tax/summary/economy')
      .then(r => r.json())
      .then(d => { if (d.inflation != null) setEconomy(prev => ({ ...prev, inflation: d.inflation, serverTreasury: d.treasury })); })
      .catch(() => {});
  }, [isFinance]);

  const saveTaxRates = () => {
    if (!isFinance) { showNotif('Bu yetki Maliye Bakanına ait!', 'error'); return; }
    const income = Math.max(0, Math.min(50, parseInt(taxForm.income)||15));
    const trade = Math.max(0, Math.min(30, parseInt(taxForm.trade)||10));
    const property = Math.max(0, Math.min(25, parseInt(taxForm.property)||5));
    const interest = Math.max(0, Math.min(20, parseInt(taxForm.interest)||5));
    setTaxRates({ income, trade, property, interest });
    const token = localStorage.getItem('rep_token') || '';
    CITIES.forEach(city => {
      fetch(`/api/tax/${encodeURIComponent(city)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ income, trade, property })
      }).catch(() => {});
    });
    showNotif('✅ Ulusal vergi oranları güncellendi!', 'success');
  };

  const saveCityTaxRates = () => {
    if (!isFinance) { showNotif('Bu yetki Maliye Bakanına ait!', 'error'); return; }
    const income = Math.max(0, Math.min(50, parseInt(cityTaxForm.income)||15));
    const trade = Math.max(0, Math.min(30, parseInt(cityTaxForm.trade)||10));
    const property = Math.max(0, Math.min(25, parseInt(cityTaxForm.property)||5));
    const token = localStorage.getItem('rep_token') || '';
    fetch(`/api/tax/${encodeURIComponent(selectedTaxCity)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ income, trade, property })
    })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        setTaxCityData(prev => {
          const exists = prev.find(r => r.city === selectedTaxCity);
          if (exists) return prev.map(r => r.city === selectedTaxCity ? { ...r, income_tax_rate: income, trade_tax_rate: trade, property_tax_rate: property } : r);
          return [...prev, { city: selectedTaxCity, income_tax_rate: income, trade_tax_rate: trade, property_tax_rate: property }];
        });
        showNotif(`✅ ${selectedTaxCity} vergi oranları kaydedildi!`, 'success');
      }
    })
    .catch(() => showNotif('Sunucu hatası', 'error'));
  };

  const fundMilitary = () => {
    if (!isPresident) { showNotif('Bu yetki Devlet Başkanına ait!', 'error'); return; }
    const amt = parseInt(budgetAmt);
    if (!amt || amt <= 0) { showNotif('Geçerli tutar girin', 'error'); return; }
    if ((profile?.money||0) < amt) { showNotif('Yetersiz para!', 'error'); return; }
    yetkiAction('fundMilitary', 6*3600000, () => {
      setProfile(p => { const np={...p, money:(p.money||0)-amt}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
      setTreasury(prev => ({ ...prev, militaryBudget: (prev.militaryBudget||0)+amt, lastUpdated: Date.now() }));
      setBudgetModal(false); setBudgetAmt('');
      showNotif(`⚔️ ₺${fmtWord(amt)} askeri bütçeye aktarıldı!`, 'success');
    });
  };

  // Gerginlik hesaplama (YetkilerimPage içi)
  const calcCurrentTension = () => {
    const _gangs = JSON.parse(localStorage.getItem('rep_gangs')||'[]');
    const _taxRates = JSON.parse(localStorage.getItem('rep_taxRates')||'{}');
    const _territory = JSON.parse(localStorage.getItem('rep_gangTerritories')||'{}');
    const _wars = JSON.parse(localStorage.getItem('rep_activeWars')||'[]');
    const gangCount = _gangs.length;
    const incomeTax = _taxRates.income || 15;
    const controlledRegions = Object.values(_territory).filter(v=>v).length;
    const activeWarCount = _wars.filter(w=>w.status==='active').length;
    return Math.min(100, Math.round(gangCount * 5 + controlledRegions * 8 + Math.max(0, incomeTax-15)*1.2 + activeWarCount*10));
  };
  const currentTension = calcCurrentTension();
  const coupEnabled = currentTension >= 75;

  const POSITION_POWERS = {
    'Devlet Başkanı': {
      icon: '👑', color: '#F59E0B',
      powers: [
        { key:'national_announce', label:'📢 Ulusal Duyuru', desc:'Tüm oyunculara acil duyuru yayınla (+500 XP)', cd:4*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+500};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); const evts=JSON.parse(localStorage.getItem('rep_gameEvents')||'[]'); evts.push({id:genId(),type:'announce',title:'📢 Cumhurbaşkanı Duyurusu',desc:`Devlet Başkanı ${profile.username} ulusal duyuru yayınladı!`,ts:Date.now()}); localStorage.setItem('rep_gameEvents',JSON.stringify(evts.slice(-50))); showNotif('📢 Ulusal duyuru yayınlandı! +500 XP','success'); }},
        { key:'appoint_gov', label:'🏛️ Vali/Bakan Ata', desc:'Şehir ve bakanlıklara yönetici ata', cd:8*3600000, action:()=>{ showNotif('🏛️ Atama yetkisi aktif. Kabine panelinden atama yapın.','info'); }},
        { key:'fund_military', label:'💰 Askeri Fon Ayır', desc:'Hazineden askeri bütçeye transfer', cd:0, action:()=>setBudgetModal(true) },
        { key:'ohal', label:'🚨 OHAL İlan Et', desc:'Olağanüstü hal — ordu yetkilerini genişletir (+1000 XP)', cd:72*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+1000};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); const evts=JSON.parse(localStorage.getItem('rep_gameEvents')||'[]'); evts.push({id:genId(),type:'ohal',title:'🚨 OHAL İlan Edildi!',desc:`Devlet Başkanı ${profile.username} Olağanüstü Hal ilan etti!`,ts:Date.now()}); localStorage.setItem('rep_gameEvents',JSON.stringify(evts.slice(-50))); showNotif('🚨 OHAL ilan edildi! Tüm oyuncular bilgilendirildi.','success'); }},
        { key:'tax_amnesty', label:'💳 Vergi Affı', desc:'Vergi borçlarını sıfırla, destek kazan (+600 XP)', cd:48*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+600};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('💳 Vergi affı yayınlandı! Halk memnuniyeti arttı. +600 XP','success'); }},
        { key:'press_conf', label:'🎙️ Basın Toplantısı', desc:'Uluslararası arenada prestij kazan (+400 XP)', cd:12*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+400};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🎙️ Basın toplantısı yapıldı! +400 XP','success'); }},
      ]
    },
    'Meclis Başkanı': {
      icon: '🏛️', color: '#8B5CF6',
      powers: [
        { key:'open_session', label:'🗳️ Meclis Oturumu Aç', desc:'Yasa oylaması başlat — 81 milletvekili oy kullanır (+300 XP)', cd:3*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+300};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); const evts=JSON.parse(localStorage.getItem('rep_gameEvents')||'[]'); evts.push({id:genId(),type:'session',title:'🏛️ Meclis Oturumu Açıldı',desc:`Meclis Başkanı ${profile.username} yasa oylaması başlattı!`,ts:Date.now()}); localStorage.setItem('rep_gameEvents',JSON.stringify(evts.slice(-50))); showNotif('🏛️ Meclis oturumu açıldı! +300 XP','success'); }},
        { key:'speaker_veto', label:'🚫 Yasa Veto Et', desc:'Onaylanmış kanunu iptal et', cd:12*3600000, action:()=>{ showNotif('🚫 Veto yetkisi kullanıldı! Yasa iptal edildi.','success'); }},
        { key:'confidence_vote', label:'📋 Güven Oyu', desc:'Hükümete güven oylaması yap (+500 XP)', cd:24*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+500};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('📋 Güven oyu oylaması başlatıldı! +500 XP','success'); }},
        { key:'emergency_session', label:'🔔 Acil Oturum', desc:'Kriz durumunda acil meclis topla (+400 XP)', cd:18*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+400};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🔔 Acil oturum çağrısı yapıldı! +400 XP','success'); }},
      ]
    },
    'İçişleri Bakanı': {
      icon: '🚔', color: '#EF4444',
      powers: [
        { key:'police_op', label:'🚔 Polis Operasyonu', desc:'Toplu güvenlik operasyonu (+200 XP)', cd:2*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+200};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🚔 Polis operasyonu başlatıldı! +200 XP','success'); }},
        { key:'gang_raid', label:'⚠️ Çete Baskını', desc:'Çete yuvalarına baskın — bölge geri al (+350 XP)', cd:6*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+350};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('⚠️ Çete baskını başarılı! +350 XP','success'); }},
        { key:'border_control', label:'🛂 Sınır Kontrolü', desc:'Yasadışı geçişleri durdur (+250 XP)', cd:10*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+250};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🛂 Sınır kontrolü güçlendirildi! +250 XP','success'); }},
        { key:'city_lockdown', label:'🔒 Şehir Kilidi', desc:'Suç oranı yüksek şehre sokağa çıkma yasağı (+500 XP)', cd:24*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+500};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🔒 Sokağa çıkma yasağı ilan edildi! +500 XP','success'); }},
        { key:'intel_share', label:'🔭 İstihbarat Paylaş', desc:'Güvenlik birimlerine bilgi aktar (+300 XP)', cd:8*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+300};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🔭 İstihbarat paylaşıldı! +300 XP','success'); }},
      ]
    },
    'Belediye Başkanı': {
      icon: '🏙️', color: '#3B82F6',
      powers: [
        { key:'city_project', label:'🏗️ Şehir Projesi', desc:'Altyapı projesi başlat (+400 XP)', cd:6*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+400};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🏗️ Şehir projesi başlatıldı! +400 XP','success'); }},
        { key:'local_tax', label:'💵 Yerel Vergi Topla', desc:'Şehir kasa geliri (+200K)', cd:12*3600000, action:()=>{ setProfile(p=>{const np={...p,money:(p.money||0)+200000};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('💵 Yerel vergi toplandı! +₺200.000','success'); }},
        { key:'city_fest', label:'🎉 Şehir Festivali', desc:'Halk mutluluğunu artır (+450 XP)', cd:48*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+450};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🎉 Şehir festivali düzenlendi! +450 XP','success'); }},
        { key:'metro_plan', label:'🚇 Ulaşım Planı', desc:'Şehir ulaşım projesi (+600 XP)', cd:72*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+600};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🚇 Ulaşım planı onaylandı! +600 XP','success'); }},
      ]
    },
    'Vali': {
      icon: '🏢', color: '#06B6D4',
      powers: [
        { key:'province_dev', label:'📈 İl Kalkınma', desc:'İl altyapı projesi (+350 XP)', cd:8*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+350};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('📈 İl kalkınma projesi başladı! +350 XP','success'); }},
        { key:'province_tax', label:'💰 İl Vergi Toplaması', desc:'İl vergi geliri (+150K)', cd:8*3600000, action:()=>{ setProfile(p=>{const np={...p,money:(p.money||0)+150000};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('💰 İl vergisi toplandı! +₺150.000','success'); }},
        { key:'province_security', label:'🛡️ İl Güvenliği', desc:'Valiliğe bağlı güvenlik kuvveti konuşlandır (+300 XP)', cd:12*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+300};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🛡️ İl güvenliği artırıldı! +300 XP','success'); }},
        { key:'province_invest', label:'🏭 Yatırım Çek', desc:'İle özel yatırım getir (+500 XP +100K)', cd:24*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+500,money:(p.money||0)+100000};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🏭 Yatırım başarıyla çekildi! +500 XP +₺100.000','success'); }},
      ]
    },
    'Genelkurmay Başkanı': {
      icon: '⚔️', color: '#EF4444',
      powers: [
        { key:'military_op', label:'🪖 Askeri Operasyon', desc:'Ordu sevk et, bölge güvenliğini sağla (+500 XP)', cd:4*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+500};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🪖 Askeri operasyon başlatıldı! +500 XP','success'); }},
        { key:'declare_war', label:'⚔️ Savaş İlan Et', desc:'Resmi savaş başlat — tüm oyuncular katılabilir', cd:24*3600000, action:()=>{ const evts=JSON.parse(localStorage.getItem('rep_gameEvents')||'[]'); evts.push({id:genId(),type:'war_declared',title:'⚔️ Savaş İlan Edildi!',desc:`Genelkurmay Başkanı ${profile.username} savaş ilan etti!`,ts:Date.now()}); localStorage.setItem('rep_gameEvents',JSON.stringify(evts.slice(-50))); showNotif('⚔️ Savaş ilan edildi!','success'); }},
        { key:'mobilize', label:'📣 Seferberlik İlan Et', desc:'Tüm ordu birimlerini hazır konuma al (+700 XP)', cd:36*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+700};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('📣 Seferberlik ilan edildi! +700 XP','success'); }},
        { key:'intel_op', label:'🔭 İstihbarat Operasyonu', desc:'Düşman güçleri hakkında bilgi topla (+400 XP)', cd:12*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+400};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🔭 İstihbarat operasyonu başarılı! +400 XP','success'); }},
        { key:'strategic_reserve', label:'🏦 Stratejik Rezerv', desc:'Askeri rezervleri aktive et (+300 XP +50K)', cd:18*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+300,money:(p.money||0)+50000};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🏦 Stratejik rezervler aktive edildi! +300 XP +₺50.000','success'); }},
      ]
    },
    'Ticaret Bakanı': {
      icon: '📦', color: '#10B981',
      powers: [
        { key:'trade_deal', label:'🤝 Ticaret Anlaşması', desc:'Ekonomiyi büyüt (+250K +200 XP)', cd:5*3600000, action:()=>{ setProfile(p=>{const np={...p,money:(p.money||0)+250000,xp:(p.xp||0)+200};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🤝 Ticaret anlaşması! +₺250.000 +200 XP','success'); }},
        { key:'monopoly_check', label:'🔍 Tekel Soruşturması', desc:'Şirket tekelini soruştur (+400 XP)', cd:12*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+400};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🔍 Tekel soruşturması başlatıldı! +400 XP','success'); }},
        { key:'export_drive', label:'🚢 İhracat Kampanyası', desc:'Ülke ihracatını artır (+500K)', cd:24*3600000, action:()=>{ setProfile(p=>{const np={...p,money:(p.money||0)+500000,xp:(p.xp||0)+300};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('🚢 İhracat kampanyası başarılı! +₺500.000 +300 XP','success'); }},
        { key:'market_reg', label:'📜 Piyasa Düzenleme', desc:'Fiyat denetimi uygula (+350 XP)', cd:16*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+350};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('📜 Piyasa düzenlemesi uygulandı! +350 XP','success'); }},
      ]
    },
    'Maliye Bakanı': {
      icon: '💸', color: '#F59E0B',
      powers: [
        { key:'print_money_btn', label:'🖨️ Para Bas', desc:'Hazineye para ekle (günde bir kez max 10M)', cd:0, action:()=>{} },
        { key:'set_tax', label:'📊 Vergi Oranı Ayarla', desc:'Gelir/Ticaret/Mülk/Faiz vergilerini düzenle', cd:0, action:()=>{} },
        { key:'budget_review', label:'📋 Bütçe Analizi', desc:'Devlet gelir-gider raporu (+300 XP)', cd:6*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+300};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('📋 Bütçe analizi tamamlandı! +300 XP','success'); }},
        { key:'bonds', label:'📄 Devlet Tahvili', desc:'Hazine bonosu çıkar, bütçe dengesi kur (+500 XP)', cd:48*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+500};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); setTreasury(prev=>({...prev,balance:(prev.balance||0)+5000000,lastUpdated:Date.now()})); showNotif('📄 Devlet tahvili çıkarıldı! +₺5.000.000 hazineye, +500 XP','success'); }},
        { key:'inflation_ctrl', label:'📉 Enflasyon Kontrolü', desc:'Merkez bankası faiz kararı al (+400 XP)', cd:24*3600000, action:()=>{ setProfile(p=>{const np={...p,xp:(p.xp||0)+400};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('📉 Faiz oranı güncellendi! +400 XP','success'); }},
      ]
    },
  };

  if (myPositions.length === 0) {
    return (
      <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
        <div style={{background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:'14px',padding:'2rem',textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>🏛️</div>
          <div style={{fontWeight:800,color:'#A78BFA',fontSize:'1rem',marginBottom:'0.5rem'}}>Henüz Makamın Yok</div>
          <div style={{color:'#5A7089',fontSize:'0.82rem',lineHeight:1.6}}>
            Seçimlere katılarak veya Devlet Başkanı tarafından atanarak devlet makamı alabilirsin.<br/>
            Seçim sayfasına giderek aday ol!
          </div>
        </div>
        {/* ── Etki Puanı Kazan (tüm oyuncular) ── */}
        <div style={{background:'rgba(139,92,246,0.06)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:'14px',padding:'1rem',marginTop:'0.75rem',marginBottom:'0.75rem'}}>
          <div style={{fontWeight:800,color:'#A78BFA',fontSize:'0.88rem',marginBottom:'0.2rem'}}>⚡ Etki Puanı Kazan</div>
          <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.65rem'}}>Oyun parası harcayarak etki puanı (liyakat) kazan. Az ücretliden çok ücretliye.</div>
          {[
            {key:'inf_local',   label:'📣 Yerel Etkinlik',     cost:5000,   merit:5,   cd:2*3600000},
            {key:'inf_region',  label:'🗺️ Bölgesel Kampanya',  cost:25000,  merit:20,  cd:4*3600000},
            {key:'inf_media',   label:'📺 Medya Görünümü',     cost:75000,  merit:55,  cd:8*3600000},
            {key:'inf_national',label:'🏛️ Ulusal Lobi',        cost:200000, merit:150, cd:16*3600000},
            {key:'inf_intl',    label:'🌍 Uluslararası Zirve', cost:750000, merit:500, cd:48*3600000},
          ].map(act => {
            const rem = Math.max(0, act.cd - (Date.now() - (actionCooldowns[act.key]||0)));
            const canAct = rem === 0;
            const canAfford = (profile?.money||0) >= act.cost;
            return (
              React.createElement('div',{key:act.key,style:{display:'flex',alignItems:'center',gap:'0.5rem',background:'rgba(255,255,255,0.03)',borderRadius:'10px',padding:'0.55rem 0.75rem',marginBottom:'0.4rem',border:'1px solid rgba(255,255,255,0.05)'}},
                React.createElement('div',{style:{flex:1,minWidth:0}},
                  React.createElement('div',{style:{fontWeight:700,color:'#E8EDF2',fontSize:'0.82rem'}},act.label),
                  React.createElement('div',{style:{fontSize:'0.62rem',color:'#5A7089'}},`₺${act.cost.toLocaleString('tr-TR')} → +${act.merit} Etki Puanı`)
                ),
                canAct
                  ? canAfford
                    ? React.createElement('button',{onClick:()=>yetkiAction(act.key,act.cd,()=>{setProfile(p=>{const np={...p,money:(p.money||0)-act.cost,meritPoints:(p.meritPoints||0)+act.merit};localStorage.setItem('rep_userProfile',JSON.stringify(np));try{const _tk=localStorage.getItem('rep_token');if(_tk)fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_tk},body:JSON.stringify({money:np.money,xp:np.xp||0,level:np.level||1,meritPoints:np.meritPoints||0})}).catch(()=>{});}catch(e){}return np;});showNotif(`${act.label} başarılı! +${act.merit} Etki Puanı`,'success');}),style:{background:'rgba(139,92,246,0.15)',border:'1px solid rgba(139,92,246,0.3)',borderRadius:'8px',padding:'5px 12px',color:'#A78BFA',cursor:'pointer',fontSize:'0.7rem',fontWeight:700,flexShrink:0}},'Kazan')
                    : React.createElement('span',{style:{color:'#EF4444',fontSize:'0.65rem',flexShrink:0,fontWeight:700}},'Yetersiz ₺')
                  : React.createElement('span',{style:{color:'#5A7089',fontSize:'0.65rem',flexShrink:0}},`⏳ ${Math.ceil(rem/3600000)}s`)
              )
            );
          })}
        </div>

        <div style={{marginTop:'0.25rem',background:card,border:`1px solid ${border}`,borderRadius:'14px',padding:'1rem'}}>
          <div style={{fontWeight:800,color:'#E8EDF2',marginBottom:'0.65rem',fontSize:'0.85rem'}}>📋 Tüm Makamlar</div>
          {Object.entries(POSITION_POWERS).map(([pos, def]) => (
            <div key={pos} style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.45rem 0',borderBottom:`1px solid ${border}`}}>
              <span style={{fontSize:'1.25rem'}}>{def.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.82rem'}}>{pos}</div>
                <div style={{fontSize:'0.62rem',color:'#5A7089'}}>{def.powers.length} yetki</div>
              </div>
              <div style={{fontSize:'0.65rem',color:cabinet[pos]?'#10B981':'#3B4E63'}}>{cabinet[pos]||'Boş'}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      {/* ── Etki Puanı Kazan ── */}
      <div style={{background:'rgba(139,92,246,0.06)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:'14px',padding:'1rem',marginBottom:'0.75rem'}}>
        <div style={{fontWeight:800,color:'#A78BFA',fontSize:'0.88rem',marginBottom:'0.2rem'}}>⚡ Etki Puanı Kazan</div>
        <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.65rem'}}>Oyun parası harcayarak etki puanı (liyakat) kazan.</div>
        {[
          {key:'inf_local',   label:'📣 Yerel Etkinlik',     cost:5000,   merit:5,   cd:2*3600000},
          {key:'inf_region',  label:'🗺️ Bölgesel Kampanya',  cost:25000,  merit:20,  cd:4*3600000},
          {key:'inf_media',   label:'📺 Medya Görünümü',     cost:75000,  merit:55,  cd:8*3600000},
          {key:'inf_national',label:'🏛️ Ulusal Lobi',        cost:200000, merit:150, cd:16*3600000},
          {key:'inf_intl',    label:'🌍 Uluslararası Zirve', cost:750000, merit:500, cd:48*3600000},
        ].map(act => {
          const rem = Math.max(0, act.cd - (Date.now() - (actionCooldowns[act.key]||0)));
          const canAct = rem === 0;
          const canAfford = (profile?.money||0) >= act.cost;
          return (
            React.createElement('div',{key:act.key,style:{display:'flex',alignItems:'center',gap:'0.5rem',background:'rgba(255,255,255,0.03)',borderRadius:'10px',padding:'0.5rem 0.75rem',marginBottom:'0.35rem',border:'1px solid rgba(255,255,255,0.05)'}},
              React.createElement('div',{style:{flex:1,minWidth:0}},
                React.createElement('div',{style:{fontWeight:700,color:'#E8EDF2',fontSize:'0.82rem'}},act.label),
                React.createElement('div',{style:{fontSize:'0.62rem',color:'#5A7089'}},`₺${act.cost.toLocaleString('tr-TR')} → +${act.merit} Etki Puanı`)
              ),
              canAct
                ? canAfford
                  ? React.createElement('button',{onClick:()=>yetkiAction(act.key,act.cd,()=>{setProfile(p=>{const np={...p,money:(p.money||0)-act.cost,meritPoints:(p.meritPoints||0)+act.merit};localStorage.setItem('rep_userProfile',JSON.stringify(np));try{const _tk=localStorage.getItem('rep_token');if(_tk)fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_tk},body:JSON.stringify({money:np.money,xp:np.xp||0,level:np.level||1,meritPoints:np.meritPoints||0})}).catch(()=>{});}catch(e){}return np;});showNotif(`${act.label} başarılı! +${act.merit} Etki Puanı`,'success');}),style:{background:'rgba(139,92,246,0.15)',border:'1px solid rgba(139,92,246,0.3)',borderRadius:'8px',padding:'5px 12px',color:'#A78BFA',cursor:'pointer',fontSize:'0.7rem',fontWeight:700,flexShrink:0}},'Kazan')
                  : React.createElement('span',{style:{color:'#EF4444',fontSize:'0.65rem',flexShrink:0,fontWeight:700}},'Yetersiz ₺')
                : React.createElement('span',{style:{color:'#5A7089',fontSize:'0.65rem',flexShrink:0}},`⏳ ${Math.ceil(rem/3600000)}s`)
            )
          );
        })}
      </div>

      <div style={{background:'linear-gradient(135deg,rgba(245,200,66,0.12),rgba(11,21,39,0.97))',border:'1px solid rgba(245,200,66,0.25)',borderRadius:'14px',padding:'1rem',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'0.6rem',color:'#F5C842',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.2rem'}}>⭐ SENİN MAKAMLARLIN</div>
        <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
          {myPositions.map(pos => (
            <span key={pos} style={{background:'rgba(245,200,66,0.12)',border:'1px solid rgba(245,200,66,0.3)',borderRadius:'8px',padding:'3px 10px',fontSize:'0.72rem',color:'#F5C842',fontWeight:700}}>{pos}</span>
          ))}
        </div>
      </div>

      {myPositions.map(pos => {
        const def = POSITION_POWERS[pos];
        if (!def) return null;
        return (
          <div key={pos} style={{background:card,border:`1px solid ${border}`,borderRadius:'14px',padding:'1rem',marginBottom:'0.65rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.6rem',marginBottom:'0.75rem'}}>
              <span style={{fontSize:'1.75rem'}}>{def.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:900,color:def.color,fontSize:'0.92rem'}}>{pos}</div>
                <div style={{fontSize:'0.65rem',color:'#5A7089'}}>{def.powers.length} özel yetki</div>
              </div>
              {pos === 'Genelkurmay Başkanı' && (
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'0.6rem',color:'#5A7089',marginBottom:'2px'}}>Ülke Gerginliği</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'0.9rem',fontWeight:900,color:currentTension>=75?'#EF4444':currentTension>=50?'#F59E0B':'#10B981'}}>%{currentTension}</div>
                </div>
              )}
            </div>

            {/* Genelkurmay için Gerginlik Göstergesi + Darbe Butonu */}
            {pos === 'Genelkurmay Başkanı' && (
              <div style={{marginBottom:'0.75rem'}}>
                <div style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'12px',padding:'0.75rem',marginBottom:'0.5rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.35rem'}}>
                    <div style={{fontSize:'0.72rem',color:'#5A7089',fontWeight:700}}>🌡️ Ülke Gerginlik Barometresi</div>
                    <span style={{fontSize:'0.62rem',fontWeight:800,color:currentTension>=75?'#EF4444':currentTension>=50?'#F59E0B':'#10B981',background:currentTension>=75?'rgba(239,68,68,0.12)':currentTension>=50?'rgba(245,158,11,0.12)':'rgba(16,185,129,0.12)',borderRadius:'5px',padding:'1px 7px'}}>
                      {currentTension>=75?'KRİTİK ⚠️':currentTension>=50?'YÜKSEK':'NORMAL'}
                    </span>
                  </div>
                  <div style={{height:'8px',background:'rgba(255,255,255,0.06)',borderRadius:'100px',overflow:'hidden',marginBottom:'0.3rem'}}>
                    <div style={{height:'100%',width:`${currentTension}%`,background:`linear-gradient(90deg,#10B981 0%,${currentTension>=50?'#F59E0B':'#10B981'} 50%,${currentTension>=75?'#EF4444':'transparent'} 100%)`,borderRadius:'100px',transition:'width 0.6s'}} />
                  </div>
                  <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',fontSize:'0.6rem',color:'#5A7089'}}>
                    <span>Çete sayısı etkisi</span>
                    <span>•</span>
                    <span>Bölge kontrolü etkisi</span>
                    <span>•</span>
                    <span>Vergi oranı etkisi</span>
                  </div>
                </div>
                {/* Darbe Butonu */}
                <div style={{position:'relative'}}>
                  <button
                    onClick={() => {
                      if (!coupEnabled) { showNotif('❌ Darbe için ülke gerginliğinin %75\'e ulaşması gerekiyor!','error'); return; }
                      const cdKey = 'coup_attempt';
                      const last = actionCooldowns[cdKey] || 0;
                      const rem = 72*3600000 - (Date.now()-last);
                      if (rem > 0) { showNotif(`⏳ Darbe girişimi bekleme süresi: ${Math.ceil(rem/3600000)} saat`,'error'); return; }
                      setActionCooldowns(prev=>({...prev,[cdKey]:Date.now()}));
                      setProfile(p=>{const np={...p,xp:(p.xp||0)+5000,meritPoints:(p.meritPoints||0)+100};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});
                      const evts=JSON.parse(localStorage.getItem('rep_gameEvents')||'[]');
                      evts.push({id:genId(),type:'coup_attempt',title:'🎖️ DARBE GİRİŞİMİ!',desc:`Genelkurmay Başkanı ${profile.username} hükümete karşı darbe girişiminde bulundu! Gerginlik: %${currentTension}`,ts:Date.now()});
                      localStorage.setItem('rep_gameEvents',JSON.stringify(evts.slice(-50)));
                      window.dispatchEvent(new CustomEvent('game-event',{detail:evts[evts.length-1]}));
                      showNotif('🎖️ DARBE GİRİŞİMİ BAŞLADI! +5000 XP +100 Liyakat','success');
                    }}
                    style={{
                      width:'100%',padding:'0.75rem',
                      background:coupEnabled?'linear-gradient(135deg,#7C0000,#DC2626,#7C0000)':'rgba(255,255,255,0.04)',
                      border:`2px solid ${coupEnabled?'#EF4444':'rgba(255,255,255,0.1)'}`,
                      borderRadius:'12px',
                      color:coupEnabled?'#fff':'#3B4E63',
                      cursor:coupEnabled?'pointer':'not-allowed',
                      fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'0.9rem',
                      letterSpacing:'0.05em',
                      transition:'all 0.3s',
                      opacity:coupEnabled?1:0.5,
                    }}>
                    {coupEnabled ? '🎖️ DARBE BAŞLAT — KRİTİK GERGİNLİK EŞIĞI AŞILDI' : `🔒 DARBE BUTONU — Gerginlik %${currentTension}/75 gerekli`}
                  </button>
                  {coupEnabled && (
                    <div style={{position:'absolute',top:'-6px',right:'8px',background:'#EF4444',borderRadius:'100px',padding:'1px 8px',fontSize:'0.58rem',fontWeight:900,color:'#fff',letterSpacing:'0.05em',animation:'pulse 1s infinite'}}>
                      AKTİF
                    </div>
                  )}
                </div>
              </div>
            )}

            {pos === 'Ticaret Bakanı' && (()=>{
              const pending = JSON.parse(localStorage.getItem('rep_pendingCompanies')||'[]');
              if (!pending.length) return (
                <div style={{marginBottom:'0.75rem',padding:'0.6rem 0.75rem',background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:'10px',fontSize:'0.72rem',color:'#10B981'}}>
                  ✅ Bekleyen şirket kurulum talebi yok.
                </div>
              );
              return (
                <div style={{marginBottom:'0.75rem',padding:'0.75rem',background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'10px'}}>
                  <div style={{fontWeight:700,color:'#10B981',fontSize:'0.78rem',marginBottom:'0.5rem'}}>🏢 Şirket Kurulum Onayları ({pending.length})</div>
                  {pending.map(c=>{
                    const rem = Math.max(0,(c.pendingAt+24*3600000)-Date.now());
                    const h3=Math.floor(rem/3600000); const m3=Math.floor((rem%3600000)/60000);
                    return (
                      <div key={c.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',padding:'0.5rem',marginBottom:'0.35rem',fontSize:'0.72rem'}}>
                        <div style={{fontWeight:700,color:'#E8EDF2'}}>{c.sectorIcon} {c.name}</div>
                        <div style={{color:'#5A7089',marginBottom:'0.3rem'}}>Sahip: {c.ownerName} · Sektör: {c.sectorLabel} · Değer: {fmtWord(c.value)}</div>
                        <div style={{color:'#F59E0B',fontSize:'0.65rem',marginBottom:'0.35rem'}}>⏳ Otomatik onay: {rem>0?`${h3}s ${m3}dk`:'Süre doldu'}</div>
                        <div style={{display:'flex',gap:'0.4rem'}}>
                          <button onClick={()=>{
                            const all=JSON.parse(localStorage.getItem('rep_pendingCompanies')||'[]');
                            const approved=all.filter(x=>x.id!==c.id);
                            localStorage.setItem('rep_pendingCompanies',JSON.stringify(approved));
                            const holdings=JSON.parse(localStorage.getItem('rep_holdings')||'[]');
                            const {pendingAt,tradeMin,...hClean}=c;
                            holdings.push(hClean);
                            localStorage.setItem('rep_holdings',JSON.stringify(holdings));
                            window.dispatchEvent(new CustomEvent('fb-sync',{detail:{key:'pendingCompanies',value:approved}}));
                            window.dispatchEvent(new CustomEvent('fb-sync',{detail:{key:'holdings',value:holdings}}));
                            showNotif(`✅ ${c.name} şirketi onaylandı!`,'success');
                          }} style={{flex:1,padding:'0.3rem',borderRadius:'6px',border:'1px solid rgba(16,185,129,0.4)',background:'rgba(16,185,129,0.12)',color:'#10B981',fontWeight:700,cursor:'pointer',fontSize:'0.68rem'}}>✅ Onayla</button>
                          <button onClick={()=>{
                            const all=JSON.parse(localStorage.getItem('rep_pendingCompanies')||'[]');
                            const rejected=all.filter(x=>x.id!==c.id);
                            localStorage.setItem('rep_pendingCompanies',JSON.stringify(rejected));
                            window.dispatchEvent(new CustomEvent('fb-sync',{detail:{key:'pendingCompanies',value:rejected}}));
                            showNotif(`❌ ${c.name} şirketi reddedildi.`,'error');
                          }} style={{flex:1,padding:'0.3rem',borderRadius:'6px',border:'1px solid rgba(239,68,68,0.35)',background:'rgba(239,68,68,0.08)',color:'#EF4444',fontWeight:700,cursor:'pointer',fontSize:'0.68rem'}}>❌ Reddet</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {pos === 'Maliye Bakanı' && (
              <div style={{marginBottom:'0.75rem'}}>

                {/* ── Hazine Özeti ── */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.4rem',marginBottom:'0.75rem'}}>
                  {[
                    {label:'Devlet Hazinesi', value: fmtWord(treasury.balance||0), color:'#10B981', icon:'🏦'},
                    {label:'Askeri Bütçe',    value: fmtWord(treasury.militaryBudget||0), color:'#EF4444', icon:'⚔️'},
                    {label:'Enflasyon',       value: `%${(economy.inflation||5).toFixed(1)}`, color: (economy.inflation||5)<40?'#10B981':(economy.inflation||5)<70?'#F59E0B':'#EF4444', icon:'📉'},
                  ].map(s=>(
                    <div key={s.label} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'0.6rem 0.5rem',textAlign:'center'}}>
                      <div style={{fontSize:'1rem',marginBottom:'2px'}}>{s.icon}</div>
                      <div style={{fontWeight:800,color:s.color,fontSize:'0.82rem'}}>{s.value}</div>
                      <div style={{fontSize:'0.55rem',color:'#5A7089',marginTop:'1px'}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* ── Para Basma ── */}
                <div style={{padding:'0.75rem',background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'10px',marginBottom:'0.5rem'}}>
                  <div style={{fontWeight:700,color:'#F59E0B',marginBottom:'0.35rem',fontSize:'0.78rem'}}>🖨️ Para Basma (Merkez Bankası Yetkisi)</div>
                  <div style={{fontSize:'0.63rem',color:'#5A7089',marginBottom:'0.45rem'}}>Aşırı para basımı enflasyonu artırır. Dikkatli kullanın.</div>
                  <div style={{display:'flex',gap:'0.5rem'}}>
                    <input type="number" value={printAmt} onChange={e=>setPrintAmt(e.target.value)} placeholder="Basılacak tutar (₺)"
                      style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'0.5rem 0.75rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none'}} />
                    <button onClick={printMoney} style={{padding:'0.5rem 0.85rem',borderRadius:'8px',border:'none',background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',fontWeight:800,fontSize:'0.75rem',cursor:'pointer'}}>Bas</button>
                  </div>
                </div>

                {/* ── Belediye Hazine Talepleri ── */}
                {(()=>{
                  const reqs = JSON.parse(localStorage.getItem('rep_treasuryRequests')||'[]');
                  const pending = reqs.filter(r=>r.status==='bekliyor');
                  if(!pending.length) return <div style={{fontSize:'0.63rem',color:'#5A7089',marginBottom:'0.5rem',padding:'0.4rem 0.6rem',background:'rgba(255,255,255,0.02)',borderRadius:'8px'}}>✅ Bekleyen belediye hazine talebi yok.</div>;
                  return (
                    <div style={{marginBottom:'0.5rem'}}>
                      <div style={{fontWeight:700,color:'#10B981',fontSize:'0.72rem',marginBottom:'0.4rem'}}>🏙️ Belediye Hazine Talepleri ({pending.length})</div>
                      {pending.slice(0,5).map(r=>(
                        <div key={r.id} style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.18)',borderRadius:'8px',padding:'0.5rem',marginBottom:'0.35rem',fontSize:'0.72rem'}}>
                          <div style={{fontWeight:700,color:'#E8EDF2'}}>{r.city} — {r.mayor}</div>
                          <div style={{color:'#5A7089',marginBottom:'0.3rem'}}>Tutar: <span style={{color:'#10B981',fontWeight:700}}>{fmtWord(r.amount)}</span> · {r.reason}</div>
                          <div style={{display:'flex',gap:'0.4rem'}}>
                            <button onClick={()=>{
                              const reqs2=JSON.parse(localStorage.getItem('rep_treasuryRequests')||'[]');
                              const city=r.city; const amt=r.amount;
                              const updated=reqs2.map(x=>x.id===r.id?{...x,status:'onaylandı',approvedBy:profile.username,approvedAt:Date.now()}:x);
                              localStorage.setItem('rep_treasuryRequests',JSON.stringify(updated));
                              const citySlug=city.toLowerCase().replace(/\s/g,'_');
                              const tKey=`cityTreasury_${citySlug}`;
                              const ct=JSON.parse(localStorage.getItem(tKey)||'{"balance":2500000}');
                              ct.balance=(ct.balance||0)+amt;
                              localStorage.setItem(tKey,JSON.stringify(ct));
                              setTreasury(prev=>({...prev,balance:(prev.balance||0)-amt}));
                              showNotif(`✅ ${city} belediyesine ${fmtWord(amt)} gönderildi!`,'success');
                            }} style={{flex:1,padding:'0.3rem',borderRadius:'6px',border:'1px solid rgba(16,185,129,0.4)',background:'rgba(16,185,129,0.12)',color:'#10B981',fontWeight:700,cursor:'pointer',fontSize:'0.68rem'}}>✅ Onayla & Gönder</button>
                            <button onClick={()=>{
                              const reqs2=JSON.parse(localStorage.getItem('rep_treasuryRequests')||'[]');
                              const updated=reqs2.map(x=>x.id===r.id?{...x,status:'reddedildi',rejectedBy:profile.username}:x);
                              localStorage.setItem('rep_treasuryRequests',JSON.stringify(updated));
                              showNotif('❌ Talep reddedildi.','error');
                            }} style={{flex:1,padding:'0.3rem',borderRadius:'6px',border:'1px solid rgba(239,68,68,0.35)',background:'rgba(239,68,68,0.08)',color:'#EF4444',fontWeight:700,cursor:'pointer',fontSize:'0.68rem'}}>❌ Reddet</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* ── Ulusal Vergi Oranları ── */}
                <div style={{background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.18)',borderRadius:'10px',padding:'0.75rem',marginBottom:'0.5rem'}}>
                  <div style={{fontWeight:700,color:'#F59E0B',marginBottom:'0.4rem',fontSize:'0.78rem'}}>📊 Ulusal Vergi Oranları (%)</div>
                  <div style={{fontSize:'0.62rem',color:'#5A7089',marginBottom:'0.5rem'}}>Tüm şehirlere tek seferde uygula.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem',marginBottom:'0.5rem'}}>
                    {[['income','Gelir Vergisi',50],['trade','Ticaret Vergisi',30],['property','Mülk Vergisi',25],['interest','Faiz Oranı',20]].map(([k,lb,mx])=>(
                      <div key={k}>
                        <div style={{fontSize:'0.6rem',color:'#5A7089',marginBottom:'2px'}}>{lb} (max %{mx})</div>
                        <input type="number" value={taxForm[k]} onChange={e=>setTaxForm(p=>({...p,[k]:e.target.value}))} min={0} max={mx}
                          style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',padding:'0.4rem 0.6rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
                      </div>
                    ))}
                  </div>
                  <button onClick={saveTaxRates} style={{width:'100%',padding:'0.45rem',borderRadius:'8px',border:'none',background:'rgba(245,158,11,0.15)',color:'#F59E0B',fontWeight:800,fontSize:'0.78rem',cursor:'pointer'}}>💾 Tüm Şehirlere Uygula</button>
                </div>

                {/* ── Şehre Özel Vergi ── */}
                <div style={{background:'rgba(59,130,246,0.05)',border:'1px solid rgba(59,130,246,0.18)',borderRadius:'10px',padding:'0.75rem',marginBottom:'0.5rem'}}>
                  <div style={{fontWeight:700,color:'#60A5FA',marginBottom:'0.4rem',fontSize:'0.78rem'}}>🏙️ Şehre Özel Vergi Oranı</div>
                  <select value={selectedTaxCity} onChange={e=>{
                    setSelectedTaxCity(e.target.value);
                    const found = taxCityData.find(r=>r.city===e.target.value);
                    setCityTaxForm(found ? {income:found.income_tax_rate,trade:found.trade_tax_rate,property:found.property_tax_rate} : {income:taxForm.income||15,trade:taxForm.trade||10,property:taxForm.property||5});
                  }} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'0.45rem 0.75rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none',marginBottom:'0.45rem',boxSizing:'border-box'}}>
                    {CITIES.map(c=><option key={c} value={c} style={{background:'#0B1527'}}>{c}</option>)}
                  </select>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.35rem',marginBottom:'0.45rem'}}>
                    {[['income','Gelir %'],['trade','Ticaret %'],['property','Mülk %']].map(([k,lb])=>(
                      <div key={k}>
                        <div style={{fontSize:'0.58rem',color:'#5A7089',marginBottom:'2px'}}>{lb}</div>
                        <input type="number" value={cityTaxForm[k]||''} onChange={e=>setCityTaxForm(p=>({...p,[k]:e.target.value}))} min={0} max={50}
                          style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',padding:'0.4rem 0.5rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
                      </div>
                    ))}
                  </div>
                  <button onClick={saveCityTaxRates} style={{width:'100%',padding:'0.45rem',borderRadius:'8px',border:'none',background:'rgba(59,130,246,0.15)',color:'#60A5FA',fontWeight:800,fontSize:'0.78rem',cursor:'pointer'}}>💾 {selectedTaxCity} için Kaydet</button>
                </div>

                {/* ── Tüm Şehirler Tablosu ── */}
                {taxCityData.length > 0 && (
                  <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'0.75rem'}}>
                    <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.75rem',marginBottom:'0.5rem'}}>📋 Kayıtlı Şehir Vergi Oranları {taxLoading && '⏳'}</div>
                    <div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr 1fr',gap:'2px 6px',fontSize:'0.58rem',color:'#5A7089',marginBottom:'0.3rem',paddingBottom:'0.3rem',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                      <span style={{fontWeight:700}}>Şehir</span><span style={{textAlign:'center'}}>Gelir</span><span style={{textAlign:'center'}}>Ticaret</span><span style={{textAlign:'center'}}>Mülk</span>
                    </div>
                    <div style={{maxHeight:'160px',overflowY:'auto',scrollbarWidth:'none'}}>
                      {taxCityData.map(r=>(
                        <div key={r.city} style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr 1fr',gap:'2px 6px',fontSize:'0.65rem',padding:'2px 0',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                          <span style={{color:'#A78BFA',fontWeight:700,whiteSpace:'nowrap'}}>{r.city}</span>
                          <span style={{color:'#10B981',textAlign:'center',fontWeight:600}}>%{r.income_tax_rate}</span>
                          <span style={{color:'#06B6D4',textAlign:'center',fontWeight:600}}>%{r.trade_tax_rate}</span>
                          <span style={{color:'#F59E0B',textAlign:'center',fontWeight:600}}>%{r.property_tax_rate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem'}}>
              {def.powers.filter(pw => pw.key !== 'print_money_btn' && pw.key !== 'set_tax').map(pw => {
                const rem = pw.cd > 0 ? Math.max(0, pw.cd - (Date.now() - (actionCooldowns[pw.key]||0))) : 0;
                return (
                  <button key={pw.key} onClick={()=>pw.cd>0?yetkiAction(pw.key,pw.cd,pw.action):pw.action()} disabled={rem>0}
                    style={{padding:'0.6rem 0.5rem',background:rem>0?'rgba(255,255,255,0.03)':`rgba(${def.color==='#F59E0B'?'245,158,11':def.color==='#EF4444'?'239,68,68':def.color==='#10B981'?'16,185,129':def.color==='#8B5CF6'?'139,92,246':def.color==='#3B82F6'?'59,130,246':def.color==='#06B6D4'?'6,182,212':'245,200,66'},0.1)`,border:`1px solid ${rem>0?'rgba(255,255,255,0.07)':`${def.color}30`}`,borderRadius:'10px',color:rem>0?'#3B4E63':def.color,cursor:rem>0?'not-allowed':'pointer',fontWeight:700,fontSize:'0.72rem',fontFamily:"'DM Sans',sans-serif",textAlign:'center',lineHeight:1.3}}>
                    {pw.label}
                    <div style={{fontSize:'0.6rem',color:'#5A7089',marginTop:'2px'}}>{pw.desc}</div>
                    {rem>0&&<div style={{fontSize:'0.58rem',marginTop:'2px',color:'#5A7089'}}>⏳{Math.ceil(rem/3600000)}s</div>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {budgetModal && (
        <Modal title="💰 Askeri Bütçe" onClose={()=>{setBudgetModal(false);setBudgetAmt('');}}>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Askeri Bütçe Tutarı</div>
            <input type="number" value={budgetAmt} onChange={e=>setBudgetAmt(e.target.value)} placeholder="₺ Tutar"
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'}} />
            <div style={{fontSize:'0.7rem',color:'#5A7089',marginTop:'0.4rem'}}>Bakiyeniz: ₺{fmtWord(profile?.money||0)}</div>
          </div>
          <Btn variant='gold' size='full' onClick={fundMilitary}>⚔️ Bütçeyi Aktar</Btn>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// OLAYLAR / EVENTS SAYFASI
// ═══════════════════════════════════════════════════════
function EventsPage({ profile, setProfile, showNotif }) {
  const { dark } = useTheme();
  const bg = dark ? '#0F172A' : '#F8FAFC';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [events, setEvents] = useLs('rep_gameEvents', []);
  const [myResponses, setMyResponses] = useLs('eventResponses', {});

  useEffect(() => {
    const h = (e) => {
      if (e.detail) setEvents(prev => [...prev.slice(-49), e.detail]);
    };
    window.addEventListener('game-event', h);
    return () => window.removeEventListener('game-event', h);
  }, []);

  const EVENT_ICONS = { security_crisis:'🚨', money_printed:'💸', war_declared:'⚔️', coup_rumors:'🎖️', monopoly:'🏭', corruption:'⚠️', election_win:'🏆', default:'📢' };
  const EVENT_COLORS = { security_crisis:'#EF4444', money_printed:'#F59E0B', war_declared:'#DC2626', coup_rumors:'#8B5CF6', monopoly:'#3B82F6', corruption:'#F59E0B', election_win:'#10B981', default:'#5A7089' };

  const respondToEvent = (eventId, response) => {
    setMyResponses(prev => ({ ...prev, [eventId]: response }));
    const xpMap = { support:100, oppose:100, neutral:50 };
    setProfile(p => { const np={...p, xp:(p.xp||0)+(xpMap[response]||50)}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`✅ Tutumun kaydedildi! +${xpMap[response]||50} XP`, 'success');
  };

  const sortedEvents = [...events].sort((a,b)=>(b.ts||0)-(a.ts||0));

  return (
    <div style={{padding:'1rem',background:bg,minHeight:'100%'}}>
      <div style={{background:'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(11,21,39,0.97))',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'14px',padding:'1rem',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'0.6rem',color:'#EF4444',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.2rem'}}>🚨 OYUN OLAYLARI</div>
        <div style={{fontWeight:900,color:'#E8EDF2',fontSize:'1rem',marginBottom:'0.1rem'}}>Canlı Olaylar</div>
        <div style={{fontSize:'0.72rem',color:'#5A7089'}}>Oyuncu eylemleri olayları tetikler. Tutumunu belirt, XP kazan!</div>
      </div>

      {sortedEvents.length === 0 && (
        <div style={{textAlign:'center',padding:'3rem',color:'#5A7089'}}>
          <div style={{fontSize:'2rem',marginBottom:'0.75rem'}}>📰</div>
          <div style={{fontSize:'0.85rem'}}>Henüz olay yok. Oyuncuların eylemleri olayları tetikleyecek!</div>
          <div style={{fontSize:'0.72rem',marginTop:'0.5rem',color:'#5A7089',lineHeight:1.6}}>
            Örnek: Çete çok fazla il alırsa → Güvenlik Krizi<br/>
            Şirket tekelleşirse → Meclis Soruşturması<br/>
            Parti 2 seçim kazanırsa → Darbe Söylentileri
          </div>
        </div>
      )}

      {sortedEvents.map(evt => {
        const myResp = myResponses[evt.id];
        const color = EVENT_COLORS[evt.type] || EVENT_COLORS.default;
        const icon = EVENT_ICONS[evt.type] || EVENT_ICONS.default;
        const timeAgoStr = evt.ts ? timeAgo(evt.ts) : '';
        return (
          <div key={evt.id} style={{background:card,border:`1px solid ${color}30`,borderRadius:'14px',padding:'1rem',marginBottom:'0.65rem'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',marginBottom:'0.5rem'}}>
              <span style={{fontSize:'1.75rem',flexShrink:0}}>{icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,color,fontSize:'0.9rem',marginBottom:'0.2rem'}}>{evt.title}</div>
                <div style={{fontSize:'0.75rem',color:'#8BA0B5',lineHeight:1.5}}>{evt.desc}</div>
                <div style={{fontSize:'0.62rem',color:'#5A7089',marginTop:'0.3rem'}}>{timeAgoStr}</div>
              </div>
            </div>
            {!myResp ? (
              <div style={{display:'flex',gap:'0.4rem'}}>
                <button onClick={()=>respondToEvent(evt.id,'support')} style={{flex:1,padding:'0.45rem',borderRadius:'8px',border:'1px solid rgba(16,185,129,0.3)',background:'rgba(16,185,129,0.08)',color:'#10B981',fontWeight:700,fontSize:'0.72rem',cursor:'pointer'}}>✅ Destekle (+100 XP)</button>
                <button onClick={()=>respondToEvent(evt.id,'neutral')} style={{flex:1,padding:'0.45rem',borderRadius:'8px',border:`1px solid ${border}`,background:'transparent',color:'#5A7089',fontWeight:700,fontSize:'0.72rem',cursor:'pointer'}}>😐 Tarafsız (+50 XP)</button>
                <button onClick={()=>respondToEvent(evt.id,'oppose')} style={{flex:1,padding:'0.45rem',borderRadius:'8px',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',color:'#F87171',fontWeight:700,fontSize:'0.72rem',cursor:'pointer'}}>❌ Karşı Çık (+100 XP)</button>
              </div>
            ) : (
              <div style={{textAlign:'center',fontSize:'0.72rem',color:'#5A7089',padding:'0.3rem',background:'rgba(255,255,255,0.03)',borderRadius:'8px'}}>
                Tutumun: <span style={{fontWeight:700,color:myResp==='support'?'#10B981':myResp==='oppose'?'#EF4444':'#5A7089'}}>{myResp==='support'?'✅ Destekliyorsun':myResp==='oppose'?'❌ Karşı çıkıyorsun':'😐 Tarafsızsın'}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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

// ═══════════════════════════════════════════════════════
// ÇETE / AİLE SAYFASI
// ═══════════════════════════════════════════════════════
function GangPage({ profile, setProfile, showNotif, typeFilter }) {
  const [gangs, setGangs] = useLs('gangs', []);
  const [sub, setSub] = useState('gangs');
  const [createModal, setCreateModal] = useState(false);
  const [gForm, setGForm] = useState({ name:'', type:'gang', desc:'' });
  const [gangCooldowns, setGangCooldowns] = useLs('gangCooldowns', {});
  const [transferModal, setTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [disbandConfirm, setDisbandConfirm] = useState(false);
  const [donateModal, setDonateModal] = useState(false);
  const [donateAmt, setDonateAmt] = useState('');

  const uid = profile?.uid || profile?.id;
  const filteredGangs = typeFilter ? gangs.filter(g=>g.type===typeFilter) : gangs;
  const myGang = gangs.find(g => (!typeFilter || g.type===typeFilter) && (g.leaderId===uid || (g.members||[]).includes(uid)));
  const isMyGangMatchFilter = !!myGang;
  const isGangLeader = !!uid && myGang?.leaderId === uid;

  const createGang = () => {
    if (!gForm.name.trim()) { showNotif('İsim gerekli','error'); return; }
    if (myGang) { showNotif(`Zaten bir ${isFamily?'aileye':'çeteye'} üyesin`,'error'); return; }
    if (profile?.party) { showNotif('🏛️ Parti üyeleri çete veya aile kuramazlar. Önce partiden ayrılın.','error'); return; }
    const actualType = typeFilter || gForm.type;
    const cost = actualType==='family' ? 500000 : 100000;
    if ((profile?.money||0) < cost) { showNotif(`${actualType==='family'?'Aile kurmak için ₺500.000':'Çete kurmak için ₺100.000'} gerekli`,'error'); return; }
    const gang = {
      id:genId(), name:gForm.name.trim(), type:actualType, desc:gForm.desc,
      leaderId:uid, leaderName:profile?.username,
      members:[uid], memberCount:1, treasury:0,
      power:10, territory:0, reputation:0, createdAt:Date.now()
    };
    setGangs(prev => { const next=[...prev, gang]; try{window._socket?.emit('gang:create',{gang});window._socket?.emit('gang:sync',{gangs:next});}catch(e){}; return next; });
    setProfile(p => { const field=actualType==='family'?'family':'gang'; const np={...p,[field]:gang.id,money:(p.money||0)-cost}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setCreateModal(false);
    setGForm({name:'',type:'gang',desc:''});
    showNotif(`${gang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'} ${gang.name} kuruldu!`,'success');
    try { window._pushGameEvent?.(gang.type==='family'?'aile_kuruldu':'cete_kuruldu', `${gang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'} ${gang.name} kuruldu!`, `${profile?.username||'Bir oyuncu'} yeni bir ${gang.type==='family'?'aile':'çete'} kurdu.`, gang.type==='family'?'👨‍👩‍👧‍👦':'⚔️', gang.type==='family'?'aile':'çete'); } catch(e){} 
  };

  const joinGang = (gang) => {
    if (myGang) { showNotif(`Zaten bir ${isFamily?'aileye':'çeteye'} üyesin`,'error'); return; }
    if (profile?.party) { showNotif('🏛️ Parti üyeleri çete veya aileye katılamaz. Önce partiden ayrılın.','error'); return; }
    setGangs(prev => { const next=prev.map(g => g.id===gang.id ? {...g, members:[...(g.members||[]),uid], memberCount:(g.memberCount||0)+1, power:(g.power||10)+50} : g); try{window._socket?.emit('gang:join',{gangId:gang.id});window._socket?.emit('gang:sync',{gangs:next});}catch(e){}; return next; });
    setProfile(p => { const field=gang.type==='family'?'family':'gang'; const np={...p,[field]:gang.id}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`✅ ${gang.name}'e katıldın! Çete gücüne +50 eklendi.`,'success');
  };

  const leaveGang = () => {
    if (!myGang||isGangLeader) { if(isGangLeader) showNotif('Lider ayrılamaz. Önce liderliği devret.','error'); return; }
    setGangs(prev => { const next=prev.map(g => g.id===myGang.id ? {...g,members:(g.members||[]).filter(m=>m!==uid),memberCount:Math.max(0,(g.memberCount||1)-1),power:Math.max(10,(g.power||10)-50)} : g); try{window._socket?.emit('gang:leave',{gangId:myGang.id});window._socket?.emit('gang:sync',{gangs:next});}catch(e){}; return next; });
    setProfile(p => { const field=myGang.type==='family'?'family':'gang'; const np={...p,[field]:null}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif('Çeteden ayrıldın. -50 güç.','info');
  };

  const kickMember = (muid) => {
    if (!isGangLeader) return;
    setGangs(prev => prev.map(g => g.id===myGang.id ? {...g,members:(g.members||[]).filter(m=>m!==muid),memberCount:Math.max(0,(g.memberCount||1)-1),power:Math.max(10,(g.power||10)-50)} : g));
    showNotif('Üye çeteden çıkarıldı. -50 güç.','info');
  };

  const donateToGang = () => {
    const amt = parseInt(donateAmt);
    if (!amt||amt<=0) { showNotif('Geçerli tutar girin','error'); return; }
    if ((profile?.money||0)<amt) { showNotif('Yetersiz para','error'); return; }
    setGangs(prev => prev.map(g => g.id===myGang.id ? {...g,treasury:(g.treasury||0)+amt} : g));
    setProfile(p => { const np={...p,money:(p.money||0)-amt}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setDonateModal(false); setDonateAmt('');
    showNotif(`💰 ${fmtWord(amt)} kasaya yatırıldı`,'success');
  };

  const gangAction = (actionId, cdMs, fn) => {
    const key = `gang_${myGang?.id}_${actionId}`;
    const rem = cdMs - (Date.now()-(gangCooldowns[key]||0));
    if (rem > 0) { showNotif(`⏳ ${Math.ceil(rem/3600000)}s sonra tekrar`,'error'); return; }
    fn();
    setGangCooldowns(prev => ({...prev,[key]:Date.now()}));
  };

  const transferGangLeadership = () => {
    if (!isGangLeader||!transferTarget.trim()) { showNotif('Kullanıcı adı girin','error'); return; }
    const users = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch{return[];} })();
    const tgt = users.find(u => u.username===transferTarget.trim());
    if (!tgt) { showNotif('Kullanıcı bulunamadı','error'); return; }
    if (!(myGang.members||[]).includes(tgt.id||tgt.uid)) { showNotif('Bu kişi çetede değil','error'); return; }
    setGangs(prev => prev.map(g => g.id===myGang.id ? {...g,leaderId:tgt.id||tgt.uid,leaderName:tgt.username} : g));
    setTransferModal(false); setTransferTarget('');
    showNotif(`👑 Liderlik ${tgt.username} kişisine devredildi`,'success');
  };

  const disbandGang = () => {
    if (!isGangLeader) return;
    setGangs(prev => { const next=prev.filter(g => g.id!==myGang.id); try{window._socket?.emit('gang:disband',{gangId:myGang.id});window._socket?.emit('gang:sync',{gangs:next});}catch(e){}; return next; });
    setProfile(p => { const field=myGang.type==='family'?'family':'gang'; const np={...p,[field]:null}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setDisbandConfirm(false);
    showNotif(`${myGang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'} ${myGang.name} dağıtıldı`,'info');
  };

  const inpSt = {width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'};
  const isFamily = typeFilter==='family';
  const subItems = isMyGangMatchFilter
    ? (isFamily
        ? [{id:'gangs',label:'👨‍👩‍👧‍👦 Liste'},{id:'management',label:'⚙️ Yönetim'}]
        : [{id:'gangs',label:'⚔️ Liste'},{id:'management',label:'⚙️ Yönetim'},{id:'attack',label:'🥊 Suç'},{id:'territory',label:'🗺️ Bölge'},{id:'weapons',label:'🔫 Silah'}])
    : (isFamily
        ? [{id:'gangs',label:'👨‍👩‍👧‍👦 Aileler'}]
        : [{id:'gangs',label:'⚔️ Çeteler'},{id:'attack',label:'🥊 Suç'},{id:'territory',label:'🗺️ Bölge'}]);

  return (
    <div>
      <div style={{display:'flex',gap:'4px',padding:'0.5rem 0.7rem',overflowX:'auto',scrollbarWidth:'none',background:'rgba(6,12,24,0.97)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
        {subItems.map(s=>(
          <button key={s.id} onClick={()=>setSub(s.id)}
            style={{padding:'0.38rem 0.75rem',borderRadius:'8px',border:`1px solid ${sub===s.id?'rgba(239,68,68,0.4)':'rgba(255,255,255,0.07)'}`,background:sub===s.id?'rgba(239,68,68,0.12)':'rgba(255,255,255,0.03)',color:sub===s.id?'#FCA5A5':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.76rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{padding:'0.7rem'}}>

        {sub==='gangs' && (
          <div>
            {myGang && (
              <div style={{background:'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(11,21,39,0.95))',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'14px',padding:'1rem',marginBottom:'0.75rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.6rem',marginBottom:'0.5rem'}}>
                  <div style={{fontSize:'1.5rem'}}>{myGang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'}</div>
                  <div>
                    <div style={{fontWeight:900,color:'#E8EDF2',fontSize:'1rem'}}>{myGang.name}</div>
                    <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{myGang.memberCount} üye • Güç: {(myGang.power||10)+((myGang.weapons||0)*5)} • {isGangLeader?'👑 Lidersin':'Üye'}</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.35rem',marginBottom:'0.5rem'}}>
                  {[['💰','Kasa',fmtWord(myGang.treasury||0)],['⚡','Güç',(myGang.power||10)+((myGang.weapons||0)*5)],['🗺️','Bölge',myGang.territory||0]].map(([ic,lb,v])=>(
                    <div key={lb} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.4rem',textAlign:'center'}}>
                      <div style={{fontSize:'0.9rem'}}>{ic}</div>
                      <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.78rem'}}>{v}</div>
                      <div style={{fontSize:'0.55rem',color:'#5A7089',textTransform:'uppercase'}}>{lb}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                  <Btn variant='ghost' size='sm' onClick={()=>setSub('management')}>⚙️ Yönet</Btn>
                  <Btn variant='ghost' size='sm' onClick={()=>setDonateModal(true)}>💰 Bağış</Btn>
                  {!isGangLeader && <Btn variant='danger' size='sm' onClick={leaveGang}>🚪 Ayrıl</Btn>}
                </div>
              </div>
            )}
            {!myGang && (
              <div style={{marginBottom:'0.75rem'}}>
                {!isFamily && <Btn variant='danger' size='sm' style={{width:'100%',marginBottom:'0.4rem'}} onClick={()=>{setGForm(p=>({...p,type:'gang'}));setCreateModal(true);}}>⚔️ Çete Kur (₺2 Mlr)</Btn>}
                {isFamily && <Btn variant='ghost' size='sm' style={{width:'100%'}} onClick={()=>{setGForm(p=>({...p,type:'family'}));setCreateModal(true);}}>👨‍👩‍👧‍👦 Aile Kur (₺5 Mlr)</Btn>}
              </div>
            )}
            {filteredGangs.map(gang => (
              <Card key={gang.id} style={{marginBottom:'0.5rem',padding:'0.85rem',border:`1px solid ${gang.id===myGang?.id?'rgba(239,68,68,0.3)':gang.type==='family'?'rgba(245,158,11,0.15)':'rgba(239,68,68,0.1)'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{gang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'} {gang.name}</div>
                    <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{gang.memberCount} üye • Güç: {(gang.power||10)+((gang.weapons||0)*5)} • {fmtWord(gang.treasury||0)} kasa</div>
                  </div>
                  <div style={{display:'flex',gap:'0.3rem',alignItems:'center'}}>
                    {gang.id===myGang?.id && <Tag color='red'>Üyesin</Tag>}
                    {!myGang && <Btn variant='ghost' size='sm' onClick={()=>joinGang(gang)}>Katıl</Btn>}
                  </div>
                </div>
              </Card>
            ))}
            {filteredGangs.length===0 && <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>{isFamily?'Henüz aile yok. İlk sen kur! 👨‍👩‍👧‍👦':'Henüz çete yok. İlk sen kur! ⚔️'}</div>}
          </div>
        )}

        {sub==='management' && (
          <div>
            {!myGang ? (
              <Card style={{textAlign:'center',padding:'2rem'}}><div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>⚔️</div><div style={{color:'#5A7089',fontSize:'0.85rem'}}>Yönetim için bir çeteye katıl</div></Card>
            ) : (
              <div>
                <Card style={{marginBottom:'0.65rem',background:'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(11,21,39,0.95))'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.65rem'}}>
                    <div style={{fontSize:'1.5rem'}}>{myGang.type==='family'?'👨‍👩‍👧‍👦':'⚔️'}</div>
                    <div style={{fontWeight:900,color:'#E8EDF2',fontSize:'1rem'}}>{myGang.name}</div>
                    {isGangLeader&&<Tag color='red'>👑 Lider</Tag>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.35rem',marginBottom:'0.5rem'}}>
                    {[['👑','Lider',myGang.leaderName||'?'],['👥','Üye',myGang.memberCount||1],['⚡','Güç',(myGang.power||10)+((myGang.weapons||0)*5)],['💰','Kasa',fmtWord(myGang.treasury||0)]].map(([ic,lb,v])=>(
                      <div key={lb} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.4rem',textAlign:'center'}}>
                        <div style={{fontSize:'0.8rem'}}>{ic}</div>
                        <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.7rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
                        <div style={{fontSize:'0.52rem',color:'#5A7089',textTransform:'uppercase'}}>{lb}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                    <Btn variant='ghost' size='sm' onClick={()=>setDonateModal(true)}>💰 Kasa Yatır</Btn>
                    {!isGangLeader && <Btn variant='danger' size='sm' onClick={leaveGang}>🚪 Ayrıl</Btn>}
                  </div>
                </Card>

                {isGangLeader && (
                  <Card style={{marginBottom:'0.65rem',border:'1px solid rgba(239,68,68,0.2)'}}>
                    <div style={{fontWeight:700,color:'#FCA5A5',marginBottom:'0.65rem',fontSize:'0.82rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>👑 Lider Yetkileri</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem',marginBottom:'0.5rem'}}>
                      {[
                        {id:'harac',label:'💰 Haraç Topla',cd:2*3600000,fn:()=>{const g=Math.floor((myGang.power||10)*150);setGangs(prev=>prev.map(x=>x.id===myGang.id?{...x,treasury:(x.treasury||0)+g}:x));showNotif(`💰 Haraç! +${fmtWord(g)} kasa`,'success');}},
                        {id:'bolge',label:'🗺️ Bölge Al',cd:3*3600000,fn:()=>{setGangs(prev=>prev.map(x=>x.id===myGang.id?{...x,territory:(x.territory||0)+1,power:(x.power||10)+2}:x));setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+150};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});showNotif('🗺️ Yeni bölge! +1 bölge, +2 güç, +150 XP','success');}},
                        {id:'savunma',label:'🛡️ Güvenli Alan',cd:4*3600000,fn:()=>{setGangs(prev=>prev.map(x=>x.id===myGang.id?{...x,power:(x.power||10)+5}:x));showNotif('🛡️ Güvenli alan! +5 güç','success');}},
                        {id:'baskin',label:'⚔️ Baskın',cd:6*3600000,fn:()=>{const won=Math.random()<0.55;const prize=won?Math.floor((myGang.power||10)*200):0;if(won){setGangs(prev=>prev.map(x=>x.id===myGang.id?{...x,power:(x.power||10)+3}:x));setProfile(pr=>{const np={...pr,money:(pr.money||0)+prize,xp:(pr.xp||0)+200};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});}else{setGangs(prev=>prev.map(x=>x.id===myGang.id?{...x,power:Math.max(5,(x.power||10)-2)}:x));}showNotif(won?`⚔️ Baskın başarılı! +${fmtWord(prize)}`:'⚔️ Başarısız! -2 güç',won?'success':'error');}},
                      ].map(a=>{
                        const key=`gang_${myGang.id}_${a.id}`;
                        const rem=Math.max(0,a.cd-(Date.now()-(gangCooldowns[key]||0)));
                        return (
                          <button key={a.id} onClick={()=>gangAction(a.id,a.cd,a.fn)} disabled={rem>0}
                            style={{padding:'0.55rem 0.4rem',background:rem>0?'rgba(255,255,255,0.03)':'rgba(239,68,68,0.08)',border:`1px solid ${rem>0?'rgba(255,255,255,0.07)':'rgba(239,68,68,0.2)'}`,borderRadius:'10px',color:rem>0?'#3B4E63':'#FCA5A5',cursor:rem>0?'not-allowed':'pointer',fontWeight:700,fontSize:'0.72rem',fontFamily:"'DM Sans',sans-serif",textAlign:'center',lineHeight:1.3}}>
                            {a.label}{rem>0&&<div style={{fontSize:'0.6rem',marginTop:'2px',color:'#5A7089'}}>⏳{Math.ceil(rem/3600000)}s</div>}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'0.5rem'}}>
                      <Btn variant='ghost' size='sm' onClick={()=>setTransferModal(true)}>🔄 Liderliği Devret</Btn>
                      <Btn variant='danger' size='sm' onClick={()=>setDisbandConfirm(true)}>🗑️ Dağıt</Btn>
                    </div>
                  </Card>
                )}

                <Card>
                  <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.65rem',fontSize:'0.85rem'}}>👥 Üyeler ({myGang.memberCount||1})</div>
                  {(myGang.members||[]).map((muid,i)=>(
                    <div key={muid} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.45rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'rgba(239,68,68,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem'}}>{muid===myGang.leaderId?'👑':'👤'}</div>
                        <div style={{fontSize:'0.82rem',fontWeight:700,color:muid===uid?'#FCA5A5':'#E8EDF2'}}>
                          {muid===uid?profile?.username:`Üye #${i+1}`}{muid===myGang.leaderId&&<span style={{marginLeft:'0.3rem'}}><Tag color='red'>Lider</Tag></span>}
                        </div>
                      </div>
                      {isGangLeader&&muid!==myGang.leaderId&&(
                        <button onClick={()=>kickMember(muid)} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'6px',padding:'2px 8px',color:'#FCA5A5',cursor:'pointer',fontSize:'0.68rem',fontWeight:700}}>Çıkar</button>
                      )}
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </div>
        )}

        {sub==='attack' && (
          <div>
            {[['🥊','Sokak Kavgası',80,'₺500-2.000',500],['🔫','Gasp Girişimi',60,'₺2.000-8.000',3000],['💣','Banka Soygunu',30,'₺20K-100K',10000],['🚗','Araba Hırsızlığı',70,'₺5.000-15.000',2000]].map(([ic,name,rate,earn,fine])=>(
              <button key={name} onClick={()=>{
                const success=Math.random()*100<rate;
                const amount=success?Math.floor(Math.random()*(rate===30?80000:rate===60?6000:rate===70?10000:1500)+2000):0;
                const penalty=success?0:fine;
                setProfile(p=>{const np={...p,money:(p.money||0)+amount-penalty,xp:(p.xp||0)+(success?100:20)};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});
                showNotif(success?`🎉 Başarılı! +${fmtWord(amount)}`:`😔 Başarısız! -${fmtWord(penalty)} ceza`,success?'success':'error');
                if (success && amount >= 20000) { try { window._pushGameEvent?.('suc_basarili', `${ic} ${name}`, `${profile?.username||'Bir çete üyesi'} başarılı! +₺${amount.toLocaleString()} ganimet.`, ic, 'çete'); } catch(e){} }
              }}
                style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.85rem',background:'rgba(20,36,60,0.8)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'12px',width:'100%',marginBottom:'0.5rem',cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
                <span style={{fontSize:'1.5rem',width:'32px',textAlign:'center',flexShrink:0}}>{ic}</span>
                <div style={{flex:1,textAlign:'left'}}>
                  <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{name}</div>
                  <div style={{fontSize:'0.67rem',color:'#10B981'}}>%{rate} başarı • Kazanç: {earn}</div>
                  <div style={{fontSize:'0.65rem',color:'#EF4444'}}>Ceza riski: {fmtWord(fine)}</div>
                </div>
                <span style={{color:'#EF4444',fontSize:'0.85rem'}}>→</span>
              </button>
            ))}
          </div>
        )}

        {sub==='territory' && (
          <TerritorySystem profile={profile} setProfile={setProfile} showNotif={showNotif} myGang={myGang} gangs={gangs} setGangs={setGangs} isGangLeader={isGangLeader} />
        )}

        {sub==='weapons' && (
          <WeaponSystem profile={profile} setProfile={setProfile} showNotif={showNotif} myGang={myGang} gangs={gangs} setGangs={setGangs} isGangLeader={isGangLeader} />
        )}
      </div>

      {createModal && (
        <Modal title={(typeFilter||gForm.type)==='gang'?'⚔️ Çete Kur':'👨‍👩‍👧‍👦 Aile Kur'} onClose={()=>{setCreateModal(false);setGForm({name:'',type:'gang',desc:''});}}>
          <div style={{marginBottom:'0.85rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>İsim</div>
            <input value={gForm.name} onChange={e=>setGForm(p=>({...p,name:e.target.value}))} placeholder={(typeFilter||gForm.type)==='gang'?'Çete adı...':'Aile adı...'} style={inpSt} />
          </div>
          <div style={{marginBottom:'0.85rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Açıklama (opsiyonel)</div>
            <textarea value={gForm.desc} onChange={e=>setGForm(p=>({...p,desc:e.target.value}))} placeholder="Kısa bir açıklama..." rows={2}
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none',resize:'none',boxSizing:'border-box'}} />
          </div>
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#FCA5A5',marginBottom:'1rem'}}>
            💡 Kurmak için gereken: {fmtWord((typeFilter||gForm.type)==='family'?5000000000:2000000000)} • Bakiye: {fmtWord(profile?.money)}
          </div>
          <Btn variant='danger' size='full' onClick={createGang}>{(typeFilter||gForm.type)==='gang'?'⚔️ Çeteyi Kur':'👨‍👩‍👧‍👦 Aileyi Kur'}</Btn>
        </Modal>
      )}

      {donateModal&&(
        <Modal title="💰 Kasaya Para Yatır" onClose={()=>{setDonateModal(false);setDonateAmt('');}}>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Tutar</div>
            <input type="number" value={donateAmt} onChange={e=>setDonateAmt(e.target.value)} placeholder="₺ Tutar" style={inpSt} />
            <div style={{display:'flex',gap:'0.4rem',marginTop:'0.5rem',flexWrap:'wrap'}}>
              {[5000,10000,25000,50000].map(n=><button key={n} onClick={()=>setDonateAmt(String(n))} style={{padding:'0.3rem 0.65rem',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'#8BA0B5',fontSize:'0.72rem',cursor:'pointer',fontWeight:700}}>{fmtWord(n)}</button>)}
            </div>
          </div>
          <Btn variant='danger' size='full' onClick={donateToGang}>💰 Yatır</Btn>
        </Modal>
      )}

      {transferModal&&(
        <Modal title="🔄 Liderliği Devret" onClose={()=>{setTransferModal(false);setTransferTarget('');}}>
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#FCA5A5',marginBottom:'1rem'}}>
            ⚠️ Liderliği devrettikten sonra artık lider yetkilerine sahip olmayacaksın.
          </div>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Yeni Lider Kullanıcı Adı</div>
            <input value={transferTarget} onChange={e=>setTransferTarget(e.target.value)} placeholder="Çete üyesinin kullanıcı adı" style={inpSt} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <Btn variant='ghost' size='md' onClick={()=>{setTransferModal(false);setTransferTarget('');}}>İptal</Btn>
            <Btn variant='danger' size='md' onClick={transferGangLeadership}>🔄 Devret</Btn>
          </div>
        </Modal>
      )}

      {disbandConfirm&&(
        <Modal title="🗑️ Çeteyi Dağıt" onClose={()=>setDisbandConfirm(false)}>
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#FCA5A5',marginBottom:'1rem'}}>
            ⚠️ Bu işlem geri alınamaz! <strong>{myGang?.name}</strong> kalıcı olarak dağıtılacak.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <Btn variant='ghost' size='md' onClick={()=>setDisbandConfirm(false)}>İptal</Btn>
            <Btn variant='red' size='md' onClick={disbandGang}>🗑️ Dağıt</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// İTTİFAK SİSTEMİ
// ═══════════════════════════════════════════════════════
function AlliancePage({ profile, setProfile, showNotif }) {
  const [alliances, setAlliances] = useLs('alliances', []);
  const [sub, setSub] = useState('list');
  const [createModal, setCreateModal] = useState(false);
  const [aForm, setAForm] = useState({ name:'', tag:'', desc:'', type:'open' });
  const [searchQ, setSearchQ] = useState('');
  const [allianceCooldowns, setAllianceCooldowns] = useLs('allianceCooldowns', {});
  const [transferModal, setTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [disbandConfirm, setDisbandConfirm] = useState(false);
  const [donateModal, setDonateModal] = useState(false);
  const [donateAmt, setDonateAmt] = useState('');

  const uid = profile?.uid || profile?.id;
  const myAlliance = alliances.find(a => a.leaderId===uid || (a.members||[]).includes(uid));
  const isAllianceLeader = !!uid && myAlliance?.leaderId === uid;

  const ALLIANCE_COST = 75000;

  const createAlliance = () => {
    if (!aForm.name.trim()||!aForm.tag.trim()) { showNotif('İsim ve etiket gerekli','error'); return; }
    if (aForm.tag.length>5) { showNotif('Etiket max 5 karakter','error'); return; }
    if (myAlliance) { showNotif('Zaten bir ittifaka üyesin','error'); return; }
    if ((profile?.money||0) < ALLIANCE_COST) { showNotif(`İttifak kurmak ${fmtWord(ALLIANCE_COST)} gerektirir`,'error'); return; }
    const a = { id:genId(), name:aForm.name.trim(), tag:aForm.tag.toUpperCase(), desc:aForm.desc, type:aForm.type,
      leaderId:uid, leaderName:profile?.username, members:[uid], memberCount:1, level:1, treasury:0, xp:0, power:10, createdAt:Date.now() };
    setAlliances(prev => { const next=[...prev, a]; try{window._socket?.emit('alliance:sync',{alliances:next});}catch(e){}; return next; });
    setProfile(p => { const np={...p,alliance:a.id,money:(p.money||0)-ALLIANCE_COST}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setCreateModal(false);
    setAForm({name:'',tag:'',desc:'',type:'open'});
    showNotif(`🤝 ${a.name} İttifakı kuruldu!`,'success');
  };

  const joinAlliance = (a) => {
    if (myAlliance) { showNotif('Zaten bir ittifaka üyesin','error'); return; }
    if (a.type!=='open') { showNotif('Bu ittifak kapalı','error'); return; }
    setAlliances(prev => { const next=prev.map(al => al.id===a.id ? {...al,members:[...(al.members||[]),uid],memberCount:(al.memberCount||0)+1} : al); try{window._socket?.emit('alliance:sync',{alliances:next});}catch(e){}; return next; });
    setProfile(p => { const np={...p,alliance:a.id}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif(`✅ ${a.name}'e katıldın!`,'success');
  };

  const leaveAlliance = () => {
    if (!myAlliance||isAllianceLeader) { if(isAllianceLeader) showNotif('Lider ayrılamaz. Önce liderliği devret.','error'); return; }
    setAlliances(prev => { const next=prev.map(a => a.id===myAlliance.id ? {...a,members:(a.members||[]).filter(m=>m!==uid),memberCount:Math.max(0,(a.memberCount||1)-1)} : a); try{window._socket?.emit('alliance:sync',{alliances:next});}catch(e){}; return next; });
    setProfile(p => { const np={...p,alliance:null}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    showNotif('İttifaktan ayrıldın','info');
  };

  const kickAllianceMember = (muid) => {
    if (!isAllianceLeader) return;
    setAlliances(prev => prev.map(a => a.id===myAlliance.id ? {...a,members:(a.members||[]).filter(m=>m!==muid),memberCount:Math.max(0,(a.memberCount||1)-1)} : a));
    showNotif('Üye ittifaktan çıkarıldı','info');
  };

  const donateToAlliance = () => {
    const amt = parseInt(donateAmt);
    if (!amt||amt<=0) { showNotif('Geçerli tutar girin','error'); return; }
    if ((profile?.money||0)<amt) { showNotif('Yetersiz para','error'); return; }
    setAlliances(prev => prev.map(a => a.id===myAlliance.id ? {...a,treasury:(a.treasury||0)+amt} : a));
    setProfile(p => { const np={...p,money:(p.money||0)-amt}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setDonateModal(false); setDonateAmt('');
    showNotif(`💰 ${fmtWord(amt)} ittifak kasasına yatırıldı`,'success');
  };

  const allianceAction = (actionId, cdMs, fn) => {
    const key = `all_${myAlliance?.id}_${actionId}`;
    const rem = cdMs - (Date.now()-(allianceCooldowns[key]||0));
    if (rem > 0) { showNotif(`⏳ ${Math.ceil(rem/3600000)}s sonra tekrar`,'error'); return; }
    fn();
    setAllianceCooldowns(prev => ({...prev,[key]:Date.now()}));
  };

  const transferAllianceLeadership = () => {
    if (!isAllianceLeader||!transferTarget.trim()) { showNotif('Kullanıcı adı girin','error'); return; }
    const users = (() => { try { return JSON.parse(localStorage.getItem('rep_users')||'[]'); } catch{return[];} })();
    const tgt = users.find(u => u.username===transferTarget.trim());
    if (!tgt) { showNotif('Kullanıcı bulunamadı','error'); return; }
    if (!(myAlliance.members||[]).includes(tgt.id||tgt.uid)) { showNotif('Bu kişi ittifakta değil','error'); return; }
    setAlliances(prev => prev.map(a => a.id===myAlliance.id ? {...a,leaderId:tgt.id||tgt.uid,leaderName:tgt.username} : a));
    setTransferModal(false); setTransferTarget('');
    showNotif(`👑 Liderlik ${tgt.username} kişisine devredildi`,'success');
  };

  const disbandAlliance = () => {
    if (!isAllianceLeader) return;
    setAlliances(prev => { const next=prev.filter(a => a.id!==myAlliance.id); try{window._socket?.emit('alliance:sync',{alliances:next});}catch(e){}; return next; });
    setProfile(p => { const np={...p,alliance:null}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
    setDisbandConfirm(false);
    showNotif(`🤝 ${myAlliance.name} ittifakı feshedildi`,'info');
  };

  const filtered = alliances.filter(a => !searchQ || a.name.toLowerCase().includes(searchQ.toLowerCase()) || a.tag.toLowerCase().includes(searchQ.toLowerCase()));
  const inpSt = {width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'};
  const subItems = myAlliance
    ? [{id:'list',label:'🤝 Liste'},{id:'management',label:'⚙️ Yönetim'}]
    : [{id:'list',label:'🤝 İttifaklar'}];

  return (
    <div>
      <div style={{display:'flex',gap:'4px',padding:'0.5rem 0.7rem',overflowX:'auto',scrollbarWidth:'none',background:'rgba(6,12,24,0.97)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
        {subItems.map(s=>(
          <button key={s.id} onClick={()=>setSub(s.id)}
            style={{padding:'0.38rem 0.75rem',borderRadius:'8px',border:`1px solid ${sub===s.id?'rgba(16,185,129,0.4)':'rgba(255,255,255,0.07)'}`,background:sub===s.id?'rgba(16,185,129,0.12)':'rgba(255,255,255,0.03)',color:sub===s.id?'#6EE7B7':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.76rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{padding:'0.7rem'}}>

        {sub==='list' && (
          <div>
            {myAlliance && (
              <Card style={{marginBottom:'0.75rem',background:'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(11,21,39,0.9))',border:'1px solid rgba(16,185,129,0.2)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem'}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'0.2rem'}}>
                      <div style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'6px',padding:'2px 7px',fontWeight:900,fontSize:'0.75rem',color:'#10B981'}}>[{myAlliance.tag}]</div>
                      {isAllianceLeader && <Tag color='gold'>👑 Lider</Tag>}
                    </div>
                    <div style={{fontWeight:900,fontSize:'1.05rem',color:'#E8EDF2'}}>{myAlliance.name}</div>
                    <div style={{fontSize:'0.72rem',color:'#5A7089'}}>{myAlliance.memberCount} üye • Lv.{myAlliance.level||1} • {fmtWord(myAlliance.treasury)} kasa</div>
                  </div>
                </div>
                <div style={{fontSize:'0.78rem',color:'#8BA0B5',marginBottom:'0.5rem'}}>{myAlliance.desc}</div>
                <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                  <Btn variant='green' size='sm' onClick={()=>setSub('management')}>⚙️ Yönet</Btn>
                  <Btn variant='ghost' size='sm' onClick={()=>setDonateModal(true)}>💰 Kasa Yatır</Btn>
                  {!isAllianceLeader && <Btn variant='ghost' size='sm' onClick={leaveAlliance}>🚪 Ayrıl</Btn>}
                </div>
              </Card>
            )}
            <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.75rem'}}>
              <div style={{flex:1,display:'flex',alignItems:'center',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0 0.75rem'}}>
                <span style={{color:'#5A7089',marginRight:'0.4rem'}}>🔍</span>
                <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="İttifak ara..."
                  style={{flex:1,background:'none',border:'none',outline:'none',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',padding:'0.55rem 0'}} />
              </div>
              {!myAlliance && <Btn variant='primary' size='sm' onClick={()=>setCreateModal(true)}>+ Kur</Btn>}
            </div>
            <div style={{fontSize:'0.68rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',marginBottom:'0.5rem',letterSpacing:'0.08em'}}>Tüm İttifaklar ({filtered.length})</div>
            {filtered.map(a => (
              <Card key={a.id} style={{marginBottom:'0.5rem',padding:'0.85rem',border:`1px solid ${a.id===myAlliance?.id?'rgba(16,185,129,0.3)':'rgba(255,255,255,0.06)'}`}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                  <div style={{background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:'8px',padding:'0.4rem 0.6rem',fontWeight:900,fontSize:'0.8rem',color:'#60A5FA',flexShrink:0}}>[{a.tag}]</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.92rem'}}>{a.name}</div>
                    <div style={{fontSize:'0.68rem',color:'#5A7089'}}>{a.memberCount||0} üye • Lv.{a.level||1} • {a.type==='open'?'🔓 Açık':'🔒 Kapalı'}</div>
                  </div>
                  {!myAlliance && a.type==='open' && <Btn variant='primary' size='sm' onClick={()=>joinAlliance(a)}>Katıl</Btn>}
                  {a.id===myAlliance?.id && <Tag color='green'>Üyesin</Tag>}
                </div>
              </Card>
            ))}
            {filtered.length===0 && <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>İttifak bulunamadı. İlk sen kur! 🤝</div>}
          </div>
        )}

        {sub==='management' && (
          <div>
            {!myAlliance ? (
              <Card style={{textAlign:'center',padding:'2rem'}}><div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>🤝</div><div style={{color:'#5A7089',fontSize:'0.85rem'}}>Yönetim için bir ittifaka katıl</div></Card>
            ) : (
              <div>
                <Card style={{marginBottom:'0.65rem',background:'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(11,21,39,0.95))'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.65rem'}}>
                    <div style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'6px',padding:'2px 7px',fontWeight:900,fontSize:'0.8rem',color:'#10B981'}}>[{myAlliance.tag}]</div>
                    <div style={{fontWeight:900,color:'#E8EDF2',fontSize:'1rem'}}>{myAlliance.name}</div>
                    {isAllianceLeader&&<Tag color='gold'>👑 Lider</Tag>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.35rem',marginBottom:'0.5rem'}}>
                    {[['👥','Üye',myAlliance.memberCount||1],['⭐','Seviye',myAlliance.level||1],['⚡','Güç',myAlliance.power||10],['💰','Kasa',fmtWord(myAlliance.treasury||0)]].map(([ic,lb,v])=>(
                      <div key={lb} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.4rem',textAlign:'center'}}>
                        <div style={{fontSize:'0.8rem'}}>{ic}</div>
                        <div style={{fontWeight:700,color:'#E8EDF2',fontSize:'0.7rem'}}>{v}</div>
                        <div style={{fontSize:'0.52rem',color:'#5A7089',textTransform:'uppercase'}}>{lb}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                    <Btn variant='ghost' size='sm' onClick={()=>setDonateModal(true)}>💰 Kasa Yatır</Btn>
                    {!isAllianceLeader && <Btn variant='ghost' size='sm' onClick={leaveAlliance}>🚪 Ayrıl</Btn>}
                  </div>
                </Card>

                {isAllianceLeader && (
                  <Card style={{marginBottom:'0.65rem',border:'1px solid rgba(16,185,129,0.2)'}}>
                    <div style={{fontWeight:700,color:'#6EE7B7',marginBottom:'0.65rem',fontSize:'0.82rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>👑 Lider Yetkileri</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem',marginBottom:'0.5rem'}}>
                      {[
                        {id:'operasyon',label:'🎯 Ortak Operasyon',cd:4*3600000,fn:()=>{const xp=Math.floor((myAlliance.memberCount||1)*80);setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+xp};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});setAlliances(prev=>prev.map(a=>a.id===myAlliance.id?{...a,xp:(a.xp||0)+xp,power:(a.power||10)+1}:a));showNotif(`🎯 Operasyon tamamlandı! +${xp} XP +1 güç`,'success');}},
                        {id:'diplomatik',label:'🕊️ Diplomatik Hamle',cd:6*3600000,fn:()=>{setAlliances(prev=>prev.map(a=>a.id===myAlliance.id?{...a,level:Math.min(10,(a.level||1)+1),power:(a.power||10)+3}:a));setProfile(pr=>{const np={...pr,xp:(pr.xp||0)+200,meritPoints:(pr.meritPoints||0)+20};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;});showNotif('🕊️ Diplomatik hamle! +1 seviye, +3 güç, +200 XP','success');}},
                        {id:'savunma',label:'🛡️ Savunma Hattı',cd:5*3600000,fn:()=>{setAlliances(prev=>prev.map(a=>a.id===myAlliance.id?{...a,power:(a.power||10)+8}:a));showNotif('🛡️ Savunma hattı kuruldu! +8 güç','success');}},
                        {id:'hazine',label:'💎 Hazine Kampanyası',cd:8*3600000,fn:()=>{const earn=Math.floor((myAlliance.level||1)*50000);setAlliances(prev=>prev.map(a=>a.id===myAlliance.id?{...a,treasury:(a.treasury||0)+earn}:a));showNotif(`💎 Kampanya! +${fmtWord(earn)} kasa`,'success');}},
                      ].map(a=>{
                        const key=`all_${myAlliance.id}_${a.id}`;
                        const rem=Math.max(0,a.cd-(Date.now()-(allianceCooldowns[key]||0)));
                        return (
                          <button key={a.id} onClick={()=>allianceAction(a.id,a.cd,a.fn)} disabled={rem>0}
                            style={{padding:'0.55rem 0.4rem',background:rem>0?'rgba(255,255,255,0.03)':'rgba(16,185,129,0.08)',border:`1px solid ${rem>0?'rgba(255,255,255,0.07)':'rgba(16,185,129,0.2)'}`,borderRadius:'10px',color:rem>0?'#3B4E63':'#6EE7B7',cursor:rem>0?'not-allowed':'pointer',fontWeight:700,fontSize:'0.72rem',fontFamily:"'DM Sans',sans-serif",textAlign:'center',lineHeight:1.3}}>
                            {a.label}{rem>0&&<div style={{fontSize:'0.6rem',marginTop:'2px',color:'#5A7089'}}>⏳{Math.ceil(rem/3600000)}s</div>}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'0.5rem'}}>
                      <Btn variant='ghost' size='sm' onClick={()=>setTransferModal(true)}>🔄 Liderliği Devret</Btn>
                      <Btn variant='danger' size='sm' onClick={()=>setDisbandConfirm(true)}>🗑️ Feshet</Btn>
                    </div>
                  </Card>
                )}

                <Card>
                  <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.65rem',fontSize:'0.85rem'}}>👥 Üyeler ({myAlliance.memberCount||1})</div>
                  {(myAlliance.members||[]).map((muid,i)=>(
                    <div key={muid} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.45rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'rgba(16,185,129,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem'}}>{muid===myAlliance.leaderId?'👑':'👤'}</div>
                        <div style={{fontSize:'0.82rem',fontWeight:700,color:muid===uid?'#6EE7B7':'#E8EDF2'}}>
                          {muid===uid?profile?.username:`Üye #${i+1}`}{muid===myAlliance.leaderId&&<span style={{marginLeft:'0.3rem'}}><Tag color='gold'>Lider</Tag></span>}
                        </div>
                      </div>
                      {isAllianceLeader&&muid!==myAlliance.leaderId&&(
                        <button onClick={()=>kickAllianceMember(muid)} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'6px',padding:'2px 8px',color:'#FCA5A5',cursor:'pointer',fontSize:'0.68rem',fontWeight:700}}>Çıkar</button>
                      )}
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {createModal && (
        <Modal title="🤝 İttifak Kur" onClose={()=>{setCreateModal(false);setAForm({name:'',tag:'',desc:'',type:'open'});}}>
          {[['name','İttifak Adı','İttifak adını girin',false],['tag','Etiket (Max 5)','ORG',false],['desc','Açıklama','Kısa bir açıklama...',true]].map(([k,l,ph,ta])=>(
            <div key={k} style={{marginBottom:'0.85rem'}}>
              <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>{l}</div>
              {ta ? <textarea value={aForm[k]} onChange={e=>setAForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} rows={2}
                style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',outline:'none',resize:'none',boxSizing:'border-box'}} />
              : <input value={aForm[k]} onChange={e=>setAForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={inpSt} />}
            </div>
          ))}
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Katılım Tipi</div>
            <div style={{display:'flex',gap:'0.5rem'}}>
              {[['open','🔓 Açık'],['invite','🔒 Davet']].map(([v,l])=>(
                <button key={v} onClick={()=>setAForm(p=>({...p,type:v}))} style={{flex:1,padding:'0.55rem',borderRadius:'10px',border:`1px solid ${aForm.type===v?'rgba(16,185,129,0.4)':'rgba(255,255,255,0.08)'}`,background:aForm.type===v?'rgba(16,185,129,0.12)':'rgba(255,255,255,0.03)',color:aForm.type===v?'#10B981':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,cursor:'pointer'}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'10px',padding:'0.6rem',fontSize:'0.78rem',color:'#F59E0B',marginBottom:'1rem'}}>
            💡 Kurmak {fmtWord(ALLIANCE_COST)} gerektirir. Bakiye: {fmtWord(profile?.money)}
          </div>
          <Btn variant='primary' size='full' onClick={createAlliance}>🤝 İttifak Kur</Btn>
        </Modal>
      )}

      {donateModal&&(
        <Modal title="💰 Kasaya Para Yatır" onClose={()=>{setDonateModal(false);setDonateAmt('');}}>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Tutar</div>
            <input type="number" value={donateAmt} onChange={e=>setDonateAmt(e.target.value)} placeholder="₺ Tutar" style={inpSt} />
            <div style={{display:'flex',gap:'0.4rem',marginTop:'0.5rem',flexWrap:'wrap'}}>
              {[10000,25000,50000,100000].map(n=><button key={n} onClick={()=>setDonateAmt(String(n))} style={{padding:'0.3rem 0.65rem',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'#8BA0B5',fontSize:'0.72rem',cursor:'pointer',fontWeight:700}}>{fmtWord(n)}</button>)}
            </div>
          </div>
          <Btn variant='primary' size='full' onClick={donateToAlliance}>💰 Yatır</Btn>
        </Modal>
      )}

      {transferModal&&(
        <Modal title="🔄 Liderliği Devret" onClose={()=>{setTransferModal(false);setTransferTarget('');}}>
          <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#F59E0B',marginBottom:'1rem'}}>
            ⚠️ Liderliği devrettikten sonra artık lider yetkilerine sahip olmayacaksın.
          </div>
          <div style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Yeni Lider Kullanıcı Adı</div>
            <input value={transferTarget} onChange={e=>setTransferTarget(e.target.value)} placeholder="İttifak üyesinin kullanıcı adı" style={inpSt} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <Btn variant='ghost' size='md' onClick={()=>{setTransferModal(false);setTransferTarget('');}}>İptal</Btn>
            <Btn variant='primary' size='md' onClick={transferAllianceLeadership}>🔄 Devret</Btn>
          </div>
        </Modal>
      )}

      {disbandConfirm&&(
        <Modal title="🗑️ İttifakı Feshet" onClose={()=>setDisbandConfirm(false)}>
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',padding:'0.65rem',fontSize:'0.78rem',color:'#FCA5A5',marginBottom:'1rem'}}>
            ⚠️ Bu işlem geri alınamaz! <strong>{myAlliance?.name}</strong> ittifakı kalıcı olarak feshedilecek.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <Btn variant='ghost' size='md' onClick={()=>setDisbandConfirm(false)}>İptal</Btn>
            <Btn variant='red' size='md' onClick={disbandAlliance}>🗑️ Feshet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// OYUNCULAR SAYFASI
// ═══════════════════════════════════════════════════════
function PlayersPage({ profile, onNavigate, onlinePlayers = [] }) {
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [tab, setTab] = useState('all');
  const [cityFilterActive, setCityFilterActive] = useState(false);
  const [parties] = useLs('parties', []);
  const [gangs] = useLs('gangs', []);
  const [lbSub, setLbSub] = useState('money');
  const socketOnlineCnt = useOnlineCount();
  const onlineCnt = onlinePlayers.length || socketOnlineCnt;
  const onlineIds = new Set(onlinePlayers.map(p => p.userId||p.id||p.username));
  const [allUsers] = useState(() => {
    try { const v=localStorage.getItem('rep_users'); return v?JSON.parse(v):[]; } catch{return [];}
  });

  const me = profile;
  const selfEntry = me ? {
    id: me.uid||me.id||'me', username:me.username, city:me.city||'?',
    level:me.level||1, xp:me.xp||0, gender:me.gender||'male',
    premium:!!me.premium, money:me.money||0, email:me.email, role:me.role
  } : null;
  const combined = selfEntry
    ? [selfEntry, ...allUsers.filter(u=>u.id!==selfEntry.id && u.username!==selfEntry.username)]
    : allUsers;

  const filtered = combined.filter(p => !search ||
    p.username?.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase())
  );
  const topByMoney = [...combined].sort((a,b)=>(b.money||0)-(a.money||0));
  const topByXp = [...combined].sort((a,b)=>(b.xp||0)-(a.xp||0));
  const topByLevel = [...combined].sort((a,b)=>(b.level||1)-(a.level||1));

  const leaderboardData = lbSub==='money'?topByMoney:lbSub==='xp'?topByXp:topByLevel;
  const lbIcon = lbSub==='money'?'💰':lbSub==='xp'?'📊':'⭐';

  const rankIcon = i => ['🥇','🥈','🥉'][i] || `${i+1}.`;

  return (
    <div style={{padding:'0.7rem'}}>
      {/* Arama */}
      <div style={{display:'flex',alignItems:'center',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'0 0.85rem',marginBottom:'0.75rem'}}>
        <span style={{color:'#5A7089',marginRight:'0.5rem'}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Oyuncu / şehir ara..."
          style={{flex:1,background:'none',border:'none',outline:'none',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',padding:'0.6rem 0'}} />
      </div>

      {/* Tab */}
      <div style={{display:'flex',gap:'4px',marginBottom:'0.75rem'}}>
        {[['all',`👥 Tümü (${combined.length})`],['online',`🟢 Çevrimiçi (${onlinePlayers.length||onlineCnt})`],['top','🏆 Liderlik']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:'0.38rem 0.5rem',borderRadius:'8px',border:`1px solid ${tab===v?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.07)'}`,background:tab===v?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.03)',color:tab===v?'#60A5FA':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.7rem',cursor:'pointer',whiteSpace:'nowrap'}}>
            {l}
          </button>
        ))}
      </div>

      {/* Online badge */}
      <div style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:'20px',padding:'4px 12px',marginBottom:'0.75rem',fontSize:'0.72rem',fontWeight:700,color:'#10B981'}}>
        <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#10B981',animation:'pulse 2s infinite'}} />
        {onlinePlayers.length||onlineCnt} çevrimiçi oyuncu
      </div>

      {/* Liderlik alt tablar */}
      {tab==='top' && (
        <div style={{display:'flex',gap:'4px',marginBottom:'0.75rem'}}>
          {[['money','💰 En Zengin'],['xp','📊 En Çok XP'],['level','⭐ En Yüksek Seviye']].map(([v,l])=>(
            <button key={v} onClick={()=>setLbSub(v)} style={{flex:1,padding:'0.3rem 0.4rem',borderRadius:'7px',border:`1px solid ${lbSub===v?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.07)'}`,background:lbSub===v?'rgba(245,158,11,0.1)':'rgba(255,255,255,0.03)',color:lbSub===v?'#F59E0B':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.65rem',cursor:'pointer'}}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Çevrimiçi tab — şehir filtresi */}
      {tab==='online' && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.5rem'}}>
          <span style={{fontSize:'0.68rem',color:'#5A7089'}}>
            {cityFilterActive && profile?.city ? `📍 ${profile.city} şehri` : 'Tüm şehirler'}
          </span>
          <button onClick={()=>setCityFilterActive(v=>!v)}
            style={{background:cityFilterActive?'rgba(59,130,246,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${cityFilterActive?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.1)'}`,borderRadius:'8px',padding:'3px 10px',color:cityFilterActive?'#60A5FA':'#5A7089',fontSize:'0.65rem',fontWeight:700,cursor:'pointer'}}>
            {cityFilterActive?'🌍 Tümü Göster':'📍 Şehrimde'}
          </button>
        </div>
      )}
      {tab==='online' && (() => {
        const filtered = cityFilterActive && profile?.city
          ? onlinePlayers.filter(op => (op.city||'') === profile.city)
          : onlinePlayers;
        if (filtered.length === 0) return React.createElement('div',{style:{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}},
          React.createElement('div',{style:{fontSize:'2rem',marginBottom:'0.5rem'}},'👤'),
          cityFilterActive ? `${profile?.city||''} şehrinde başka çevrimiçi oyuncu yok` : 'Şu an başka çevrimiçi oyuncu yok');
        return null;
      })()}
      {tab==='online' && (cityFilterActive && profile?.city ? onlinePlayers.filter(op=>(op.city||'')===profile.city) : onlinePlayers).map((op,i) => {
        const pData = combined.find(u => u.id===op.userId||u.username===op.username) || {username:op.username, city:op.city||'?', level:op.level||1, xp:0};
        return (
          <button key={op.userId||op.username||i} onClick={()=>setSelectedPlayer(pData)}
            style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.18)',borderRadius:'12px',width:'100%',marginBottom:'0.4rem',cursor:'pointer',WebkitTapHighlightColor:'transparent',transition:'all 0.15s',textAlign:'left'}}>
            <div style={{position:'relative',flexShrink:0}}>
              <Avatar profile={pData} size={42} />
              <div style={{position:'absolute',bottom:0,right:0,width:'10px',height:'10px',borderRadius:'50%',background:'#10B981',border:'2px solid #0F172A'}} />
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.35rem'}}>
                <span style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{op.username}</span>
                <span style={{background:'rgba(16,185,129,0.15)',color:'#10B981',fontSize:'0.5rem',fontWeight:800,padding:'1px 5px',borderRadius:'8px'}}>CANLI</span>
                {pData.premium && <span style={{background:'linear-gradient(90deg,#A78BFA,#7C3AED)',color:'#fff',fontSize:'0.5rem',fontWeight:800,padding:'1px 5px',borderRadius:'8px'}}>VIP</span>}
              </div>
              <div style={{fontSize:'0.68rem',color:'#5A7089'}}>{op.city||'?'} • Lv.{op.level||1}</div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontSize:'0.72rem',color:'#10B981',fontWeight:700}}>{fmtM(op.money||0)}</div>
              <span style={{color:'#5A7089',fontSize:'0.85rem'}}>›</span>
            </div>
          </button>
        );
      })}

      {/* Oyuncu listesi (all/top) */}
      {tab!=='online' && (tab==='top'?leaderboardData:filtered).map((p,i) => {
        const isOnline = onlineIds.has(p.id)||onlineIds.has(p.username);
        const lastOnlineTs = p.lastOnline || p.lastSeen || p.registeredAt || 0;
        const lastOnlineStr = (() => {
          if (!lastOnlineTs) return '';
          const diff = Date.now() - lastOnlineTs;
          if (diff < 60000)      return 'az önce';
          if (diff < 3600000)    return `${Math.floor(diff/60000)} dk önce`;
          if (diff < 86400000)   return `${Math.floor(diff/3600000)} sa önce`;
          if (diff < 604800000)  return `${Math.floor(diff/86400000)} gün önce`;
          return `${Math.floor(diff/604800000)} hafta önce`;
        })();
        return (
        <button key={p.id||p.username} onClick={()=>setSelectedPlayer(p)}
          style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background: p.username===profile?.username?'rgba(59,130,246,0.08)':'rgba(15,28,48,0.85)',border:`1px solid ${p.username===profile?.username?'rgba(59,130,246,0.2)':isOnline?'rgba(16,185,129,0.18)':'rgba(255,255,255,0.05)'}`,borderRadius:'12px',width:'100%',marginBottom:'0.4rem',cursor:'pointer',WebkitTapHighlightColor:'transparent',transition:'all 0.15s',textAlign:'left'}}>
          {tab==='top' && (
            <div style={{width:'28px',textAlign:'center',fontSize:'1rem',flexShrink:0}}>{rankIcon(i)}</div>
          )}
          <div style={{position:'relative',flexShrink:0}}>
            <Avatar profile={p} size={42} />
            {isOnline
              ? <div style={{position:'absolute',bottom:0,right:0,width:'10px',height:'10px',borderRadius:'50%',background:'#10B981',border:'2px solid #0F172A'}} />
              : <div style={{position:'absolute',bottom:0,right:0,width:'10px',height:'10px',borderRadius:'50%',background:'#374151',border:'2px solid #0F172A'}} />
            }
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.35rem',flexWrap:'wrap'}}>
              <span style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{p.username}</span>
              {isOnline
                ? <span style={{background:'rgba(16,185,129,0.15)',color:'#10B981',fontSize:'0.5rem',fontWeight:800,padding:'1px 5px',borderRadius:'8px'}}>● ÇEVRİMİÇİ</span>
                : <span style={{background:'rgba(255,255,255,0.05)',color:'#5A7089',fontSize:'0.5rem',fontWeight:700,padding:'1px 5px',borderRadius:'8px'}}>ÇEVRİMDIŞI</span>
              }
              {p.premium && <span style={{background:'linear-gradient(90deg,#A78BFA,#7C3AED)',color:'#fff',fontSize:'0.5rem',fontWeight:800,padding:'1px 5px',borderRadius:'8px'}}>VIP</span>}
              {p.role==='admin' && <span style={{background:'rgba(245,158,11,0.15)',color:'#F59E0B',fontSize:'0.5rem',fontWeight:800,padding:'1px 5px',borderRadius:'8px'}}>ADMIN</span>}
              {p.username===profile?.username && <span style={{background:'rgba(59,130,246,0.15)',color:'#60A5FA',fontSize:'0.5rem',fontWeight:800,padding:'1px 5px',borderRadius:'8px'}}>SEN</span>}
            </div>
            <div style={{fontSize:'0.68rem',color:'#5A7089'}}>
              {p.city||'?'} • Lv.{p.level||1} • {getLevelInfo(p.xp||0).title}
              {!isOnline && lastOnlineStr && <span style={{color:'#374151',marginLeft:'0.3rem'}}>• {lastOnlineStr}</span>}
            </div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            {tab==='top' ? (
              <div style={{fontSize:'0.78rem',color:lbIcon==='💰'?'#10B981':lbIcon==='📊'?'#3B82F6':'#F59E0B',fontWeight:800}}>
                {lbSub==='money'?fmtM(p.money||0):lbSub==='xp'?`${fmt(p.xp||0)} XP`:`Lv.${p.level||1}`}
              </div>
            ) : (
              <div style={{fontSize:'0.72rem',color:'#10B981',fontWeight:700}}>{fmtM(p.money||0)}</div>
            )}
            <span style={{color:'#5A7089',fontSize:'0.85rem'}}>›</span>
          </div>
        </button>
        );
      })}
      {tab!=='online' && (tab==='top'?leaderboardData:filtered).length===0 && (
        <div style={{textAlign:'center',color:'#5A7089',padding:'2rem',fontSize:'0.85rem'}}>
          {search ? 'Oyuncu bulunamadı' : 'Henüz kayıtlı oyuncu yok'}
        </div>
      )}

      {selectedPlayer && (() => {
        const sp = selectedPlayer;
        const spLvl = getLevelInfo(sp.xp||0);
        const spParty = parties.find(p => p.leaderId===sp.id || p.leaderId===sp.uid || (p.members||[]).includes(sp.id) || (p.members||[]).includes(sp.uid));
        const spGang  = gangs.find(g => g.leaderId===sp.id || g.leaderId===sp.uid || (g.members||[]).includes(sp.id) || (g.members||[]).includes(sp.uid));
        const isMe = sp.username === profile?.username;
        return (
          <Modal title={`👤 ${sp.username}`} onClose={()=>setSelectedPlayer(null)}>
            {/* Banner & Avatar */}
            {sp.bannerUrl && <div style={{height:'80px',borderRadius:'12px',overflow:'hidden',marginBottom:'-30px',background:`url(${sp.bannerUrl}) center/cover no-repeat`,position:'relative'}}><div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 40%,rgba(15,23,42,0.9))'}} /></div>}
            <div style={{textAlign:'center',marginBottom:'0.85rem',paddingTop: sp.bannerUrl ? '0.4rem' : '0'}}>
              <div style={{display:'inline-block',borderRadius:'50%',border:'3px solid #1E3A5F',background:'#0F172A'}}>
                <Avatar profile={sp} size={68} />
              </div>
              <div style={{fontWeight:800,fontSize:'1.05rem',color:'#E8EDF2',marginTop:'0.4rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem'}}>
                {sp.username}
                {sp.premium && <span style={{background:'linear-gradient(90deg,#A78BFA,#7C3AED)',color:'#fff',fontSize:'0.5rem',fontWeight:800,padding:'2px 6px',borderRadius:'8px'}}>VIP</span>}
                {sp.role==='admin' && <span style={{background:'rgba(245,158,11,0.15)',color:'#F59E0B',fontSize:'0.5rem',fontWeight:800,padding:'2px 6px',borderRadius:'8px'}}>ADMIN</span>}
                {isMe && <span style={{background:'rgba(59,130,246,0.15)',color:'#60A5FA',fontSize:'0.5rem',fontWeight:800,padding:'2px 6px',borderRadius:'8px'}}>SEN</span>}
              </div>
              <div style={{fontSize:'0.72rem',color:'#F59E0B',fontWeight:700,marginTop:'0.15rem'}}>{spLvl.title}</div>
              <div style={{fontSize:'0.68rem',color:'#5A7089',marginTop:'0.08rem'}}>{sp.city||'?'} • Lv.{spLvl.lvl}</div>
            </div>

            {/* Parti / Çete */}
            {(spParty||spGang) && (
              <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.75rem',justifyContent:'center'}}>
                {spParty && <div style={{background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:'10px',padding:'0.3rem 0.75rem',fontSize:'0.7rem',color:'#60A5FA',fontWeight:700}}>🏛️ {spParty.name}</div>}
                {spGang  && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'10px',padding:'0.3rem 0.75rem',fontSize:'0.7rem',color:'#FCA5A5',fontWeight:700}}>💀 {spGang.name}</div>}
              </div>
            )}

            {/* İstatistikler */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.45rem',marginBottom:'0.75rem'}}>
              {[
                ['💰','Para',fmtM(sp.money||0),'#10B981'],
                ['🪙','UnderCoin',fmt(sp.underCoin||0)+' UC','#A78BFA'],
                ['📊','XP',fmt(sp.xp||0)+' XP','#3B82F6'],
                ['🏙️','Şehir',sp.city||'?','#94A3B8'],
              ].map(([ic,lb,v,clr])=>(
                <div key={lb} style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'0.6rem',textAlign:'center'}}>
                  <div style={{fontSize:'0.58rem',color:'#5A7089',textTransform:'uppercase',marginBottom:'0.2rem'}}>{ic} {lb}</div>
                  <div style={{fontWeight:700,color:clr,fontSize:'0.88rem'}}>{v}</div>
                </div>
              ))}
            </div>

            {/* XP ilerleme çubuğu */}
            <div style={{marginBottom:'0.75rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.6rem',color:'#5A7089',marginBottom:'4px'}}>
                <span>Lv.{spLvl.lvl} — {spLvl.title}</span>
                <span>{spLvl.pct}%</span>
              </div>
              <div style={{height:'5px',background:'rgba(255,255,255,0.06)',borderRadius:'3px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${spLvl.pct}%`,background:'linear-gradient(90deg,#3B82F6,#8B5CF6)',borderRadius:'3px',transition:'width 0.5s'}} />
              </div>
            </div>

            {/* Cinsiyet & Kayıt */}
            {sp.registeredAt && (
              <div style={{textAlign:'center',fontSize:'0.63rem',color:'#5A7089',marginBottom:'0.6rem'}}>
                Üye: {new Date(sp.registeredAt).toLocaleDateString('tr-TR')}
              </div>
            )}
            {!isMe && onNavigate && (
              <button onClick={()=>{ setSelectedPlayer(null); onNavigate('dm'); }} style={{width:'100%',padding:'0.7rem',background:'linear-gradient(135deg,rgba(59,130,246,0.18),rgba(99,102,241,0.12))',border:'1px solid rgba(59,130,246,0.35)',borderRadius:'12px',color:'#60A5FA',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.88rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem'}}>
                💬 Mesaj Gönder
              </button>
            )}
          </Modal>
        );
      })()}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PROFİL SAYFASI
// ═══════════════════════════════════════════════════════
function ProfilePage({ profile, setProfile, onLogout, showNotif }) {
  const { dark, toggle } = useTheme();
  const lvl = getLevelInfo(profile?.xp || 0);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ username: profile?.username||'', city: profile?.city||'İstanbul' });
  const [tab, setTab] = useState('stats');
  const [photoUrlInput, setPhotoUrlInput] = useState(profile?.photoUrl||'');
  const [avatarUrlInput, setAvatarUrlInput] = useState(profile?.avatarUrl||'');
  const [bannerUrlInput, setBannerUrlInput] = useState(profile?.bannerUrl||'');
  const fileInputRef = useRef(null);

  // ── Yeni state'ler ───────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current:'', newPw:'', confirm:'' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [streak, setStreak] = useState(null);
  const [streakLoading, setStreakLoading] = useState(false);
  const [referralCode, setReferralCode] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [loanAmt, setLoanAmt] = useState('');
  const [twoFAStatus, setTwoFAStatus] = useState(null);
  const [twoFASetup, setTwoFASetup] = useState(null);
  const [twoFAToken, setTwoFAToken] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('us_jwt');
    if (!token) return;
    if (tab === 'settings') {
      fetch('/api/streak', { headers:{ Authorization:`Bearer ${token}` } })
        .then(r=>r.json()).then(d=>{ if(d.success) setStreak(d.streak); }).catch(()=>{});
      fetch('/api/profile/referral', { headers:{ Authorization:`Bearer ${token}` } })
        .then(r=>r.json()).then(d=>{ if(d.success) setReferralCode(d.referralCode); }).catch(()=>{});
      if (twoFAStatus === null)
        fetch('/api/auth/2fa/status', { headers:{ Authorization:`Bearer ${token}` } })
          .then(r=>r.json()).then(d=>{ if(d.success !== undefined) setTwoFAStatus(!!d.enabled); }).catch(()=>{});
    }
    if (tab === 'kredi') {
      setLoansLoading(true);
      fetch('/api/loans', { headers:{ Authorization:`Bearer ${token}` } })
        .then(r=>r.json()).then(d=>{ setLoans(d.loans||[]); setLoansLoading(false); })
        .catch(()=>setLoansLoading(false));
    }
  }, [tab]);

  const _fetchLoans = () => {
    const token = localStorage.getItem('us_jwt');
    if (!token) return;
    fetch('/api/loans', { headers:{ Authorization:`Bearer ${token}` } })
      .then(r=>r.json()).then(d=>setLoans(d.loans||[])).catch(()=>{});
  };

  const doChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw) { setPwMsg('⚠️ Tüm alanları doldurun'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg('⚠️ Şifreler eşleşmiyor'); return; }
    if (pwForm.newPw.length < 6) { setPwMsg('⚠️ En az 6 karakter'); return; }
    setPwLoading(true); setPwMsg('');
    try {
      const token = localStorage.getItem('us_jwt');
      const r = await fetch('/api/auth/change-password', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body: JSON.stringify({ currentPassword:pwForm.current, newPassword:pwForm.newPw })
      });
      const d = await r.json();
      setPwMsg(d.success ? '✅ Şifre güncellendi!' : '⚠️ '+(d.message||'Hata'));
      if (d.success) setPwForm({ current:'', newPw:'', confirm:'' });
    } catch { setPwMsg('⚠️ Bağlantı hatası'); }
    setPwLoading(false);
  };

  const doClaimStreak = async () => {
    setStreakLoading(true);
    try {
      const token = localStorage.getItem('us_jwt');
      const r = await fetch('/api/streak/claim', { method:'POST', headers:{ Authorization:`Bearer ${token}` } });
      const d = await r.json();
      if (d.success) {
        showNotif(`🎁 +${(d.reward?.money||0).toLocaleString('tr-TR')}₺ +${d.reward?.xp||0}XP!`, 'success');
        setStreak(prev => prev ? { ...prev, current_streak:d.streak, last_claim_date:new Date().toISOString().slice(0,10) } : prev);
        if (d.reward) setProfile(p => ({ ...p, money:(p.money||0)+(d.reward.money||0), xp:(p.xp||0)+(d.reward.xp||0) }));
      } else {
        showNotif(d.message || 'Ödül alınamadı', 'error');
      }
    } catch { showNotif('Bağlantı hatası', 'error'); }
    setStreakLoading(false);
  };

  const doSetup2FA = async () => {
    const token = localStorage.getItem('us_jwt');
    const r = await fetch('/api/auth/2fa/setup', { headers:{ Authorization:`Bearer ${token}` } });
    const d = await r.json();
    if (d.success) setTwoFASetup(d);
    else showNotif('⚠️ '+(d.message||'2FA kurulum hatası'), 'error');
  };

  const doEnable2FA = async () => {
    if (!twoFAToken || twoFAToken.length < 6) { showNotif('6 haneli kod girin', 'error'); return; }
    const token = localStorage.getItem('us_jwt');
    const r = await fetch('/api/auth/2fa/enable', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({ token: twoFAToken })
    });
    const d = await r.json();
    if (d.success) { setTwoFAStatus(true); setTwoFASetup(null); setTwoFAToken(''); showNotif('✅ 2FA etkinleştirildi!', 'success'); }
    else showNotif('⚠️ '+(d.message||'Hatalı kod'), 'error');
  };

  const doDisable2FA = async () => {
    if (!twoFAToken || twoFAToken.length < 6) { showNotif('6 haneli kod girin', 'error'); return; }
    const token = localStorage.getItem('us_jwt');
    const r = await fetch('/api/auth/2fa/disable', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({ token: twoFAToken })
    });
    const d = await r.json();
    if (d.success) { setTwoFAStatus(false); setTwoFAToken(''); showNotif('2FA devre dışı bırakıldı', 'info'); }
    else showNotif('⚠️ '+(d.message||'Hatalı kod'), 'error');
  };

  const doRequestLoan = async () => {
    const amt = parseInt(loanAmt);
    if (!amt || amt < 1000) { showNotif('Minimum 1.000₺ kredi alabilirsiniz', 'error'); return; }
    const token = localStorage.getItem('us_jwt');
    const r = await fetch('/api/loans/request', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({ amount: amt })
    });
    const d = await r.json();
    if (d.success) {
      showNotif(`✅ ${amt.toLocaleString('tr-TR')}₺ hesabınıza yüklendi!`, 'success');
      setProfile(p => ({ ...p, money:(p.money||0)+amt }));
      setLoanAmt('');
      _fetchLoans();
    } else {
      showNotif('⚠️ '+(d.message||'Kredi alınamadı'), 'error');
    }
  };

  const doRepayLoan = async (loanId, amount) => {
    const token = localStorage.getItem('us_jwt');
    const r = await fetch(`/api/loans/repay/${loanId}`, {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({ amount })
    });
    const d = await r.json();
    if (d.success) {
      showNotif(d.closed ? '✅ Krediniz kapatıldı!' : `✅ ${amount.toLocaleString('tr-TR')}₺ ödendi`, 'success');
      setProfile(p => ({ ...p, money:(p.money||0)-amount }));
      _fetchLoans();
    } else {
      showNotif('⚠️ '+(d.message||'Ödeme başarısız'), 'error');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showNotif('Sadece resim dosyaları desteklenir', 'error'); return; }
    if (file.size > 3 * 1024 * 1024) { showNotif('Dosya 3MB\'dan küçük olmalı', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const u = {...profile, avatarUrl: dataUrl};
      setProfile(u);
      localStorage.setItem('rep_userProfile', JSON.stringify(u));
      if (u.uid) { try { await saveUserProfile(u.uid, u); } catch {} }
      showNotif('✅ Profil fotoğrafı yüklendi!', 'success');
    };
    reader.readAsDataURL(file);
  };
  const inputSt = {width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'};
  const savePhotoUrl = async () => {
    const u = {...profile, photoUrl: photoUrlInput.trim()};
    setProfile(u); localStorage.setItem('rep_userProfile', JSON.stringify(u));
    if (u.uid) await saveUserProfile(u.uid, u);
    showNotif('✅ Profil fotoğrafı güncellendi', 'success');
  };
  const saveAvatarUrl = async () => {
    const u = {...profile, avatarUrl: avatarUrlInput.trim()};
    setProfile(u); localStorage.setItem('rep_userProfile', JSON.stringify(u));
    if (u.uid) await saveUserProfile(u.uid, u);
    showNotif('✅ GIF avatar güncellendi', 'success');
  };
  const saveVipFrame = async (frameId) => {
    const u = {...profile, vipFrame: frameId};
    setProfile(u); localStorage.setItem('rep_userProfile', JSON.stringify(u));
    if (u.uid) await saveUserProfile(u.uid, u);
    showNotif(`✅ Çerçeve seçildi: ${frameId||'Yok'}`, 'success');
  };
  const saveBannerUrl = async () => {
    const u = {...profile, bannerUrl: bannerUrlInput.trim()};
    setProfile(u); localStorage.setItem('rep_userProfile', JSON.stringify(u));
    if (u.uid) await saveUserProfile(u.uid, u);
    showNotif('✅ Banner güncellendi', 'success');
  };

  const saveProfile = async () => {
    if (!editForm.username.trim()) { showNotif('Kullanıcı adı boş olamaz', 'error'); return; }
    const updated = { ...profile, username:editForm.username.trim(), city:editForm.city };
    setProfile(updated);
    localStorage.setItem('rep_userProfile', JSON.stringify(updated));
    if (profile?.uid) await saveUserProfile(profile.uid, updated);
    setEditModal(false);
    showNotif('✅ Profil güncellendi', 'success');
  };

  const lsState = {};
  ['parties','holdings','stockPortfolio','gangs','laws','elections','userFarms','alliances'].forEach(k=>{
    try{const v=localStorage.getItem('rep_'+k);lsState[k]=v?JSON.parse(v):null;}catch{}
  });
  const achievements = ACHIEVEMENTS_LIST.map(a => {
    let done = false;
    try { done = a.check(profile||{}, lsState); } catch{}
    return { id:a.id, name:a.title, icon:a.icon, desc:a.desc, done:!!done };
  });
  const earnedCount = achievements.filter(a=>a.done).length;

  return (
    <div style={{padding:'0.7rem'}}>
      {/* Profil kartı */}
      <div style={{marginBottom:'0.75rem',borderRadius:'16px',overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)',boxShadow:'0 4px 24px rgba(0,0,0,0.35)'}}>
        {profile?.bannerUrl && (
          <div style={{height:'80px',backgroundImage:`url(${profile.bannerUrl})`,backgroundSize:'cover',backgroundPosition:'center',position:'relative'}}>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(11,21,39,0.7))'}}/>
          </div>
        )}
        <div style={{textAlign:'center',padding:'1.25rem 1rem',background:'linear-gradient(135deg,rgba(11,21,39,0.97),rgba(15,31,54,0.95))'}}>
          <div style={{marginBottom:'0.65rem',marginTop:profile?.bannerUrl?'-28px':'0',position:'relative',display:'inline-block'}}>
            <Avatar profile={profile} size={72} />
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem',marginBottom:'0.2rem'}}>
            <div style={{fontWeight:900,fontSize:'1.15rem',color:'#E8EDF2'}}>{profile?.username || 'Oyuncu'}</div>
            {profile?.premium && <span style={{background:'linear-gradient(90deg,#F59E0B,#D97706)',color:'#000',fontSize:'0.55rem',fontWeight:800,padding:'2px 6px',borderRadius:'8px'}}>VIP</span>}
          </div>
          <div style={{fontSize:'0.75rem',color:'#5A7089',marginBottom:'0.65rem'}}>{lvl.title} • {profile?.city} • Üye: {profile?.registeredAt ? new Date(profile.registeredAt).toLocaleDateString('tr-TR') : '-'}</div>
          <div style={{marginBottom:'0.4rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.65rem',color:'#5A7089',marginBottom:'0.25rem'}}>
              <span>Lv.{lvl.lvl}</span><span>{fmt(profile?.xp||0)} / {fmt(lvl.next.xp)} XP</span><span>Lv.{lvl.next.lvl}</span>
            </div>
            <ProgressBar pct={lvl.pct} color='#3B82F6' h={8} />
          </div>
          <div style={{display:'flex',gap:'0.4rem',justifyContent:'center',marginTop:'0.65rem'}}>
            <Btn variant='ghost' size='sm' onClick={()=>setEditModal(true)}>✏️ Düzenle</Btn>
            <Btn variant='danger' size='sm' onClick={onLogout}>🚪 Çıkış</Btn>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'4px',marginBottom:'0.75rem'}}>
        {[['stats','📊'],['achievements',`🏆(${earnedCount})`],['customize','📸'],['settings','⚙️ Ayarlar'],['kredi','💳 Kredi']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:'0.4rem 0.2rem',borderRadius:'8px',border:`1px solid ${tab===v?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.07)'}`,background:tab===v?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.03)',color:tab===v?'#60A5FA':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.65rem',cursor:'pointer',whiteSpace:'nowrap'}}>
            {l}
          </button>
        ))}
      </div>

      {tab==='stats' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.5rem'}}>
            {[
              ['💰','Nakit',fmtM(profile?.money),'#10B981'],
              ['🏦','Banka',fmtM(profile?.bank),'#3B82F6'],
              ['🪙','UnderCoin',fmtUC(profile?.underCoin),'#F59E0B'],
              ['🏅','Liyakat',fmt(profile?.meritPoints),'#8B5CF6'],
              ['🤝','Ticaret Puanı',fmt(profile?.tradePoints),'#06B6D4'],
              ['🎓','Eğitim',EDU_LEVELS.find(e=>e.id===(profile?.education?.diploma||'ilkokul'))?.label||'İlkokul','#3B82F6'],
              ['❤️','Sağlık',`${profile?.health||100}%`,'#EF4444'],
              ['😊','Mutluluk',`${profile?.happiness||80}%`,'#EC4899'],
              ['⚡','Enerji',`${profile?.energy||100}%`,'#F59E0B'],
              ['📊','Seviye',`Lv.${profile?.level||1}`,'#3B82F6'],
            ].map(([ic,lb,v,c])=>(
              <Card key={lb} style={{padding:'0.75rem'}}>
                <div style={{fontSize:'0.6rem',color:'#5A7089',textTransform:'uppercase',marginBottom:'0.2rem'}}>{ic} {lb}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:c,fontSize:'0.95rem'}}>{v}</div>
              </Card>
            ))}
          </div>
          <Card>
            <div style={{fontSize:'0.72rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',marginBottom:'0.6rem'}}>📈 Aktivite</div>
            {[['💬','Mesaj',profile?.stats?.messages||0],['🤝','Ticaret',profile?.stats?.trades||0],['⚔️','Savaş',profile?.stats?.battles||0],['🗳️','Oy',profile?.stats?.votes||0]].map(([ic,lb,v])=>(
              <div key={lb} style={{display:'flex',justifyContent:'space-between',padding:'0.45rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <span style={{color:'#8BA0B5',fontSize:'0.85rem'}}>{ic} {lb}</span>
                <span style={{color:'#E8EDF2',fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:'0.85rem'}}>{fmt(v)}</span>
              </div>
            ))}
          </Card>
          {/* Oy Katsayısı Kartı */}
          {(()=>{
            const allU=(()=>{try{return JSON.parse(localStorage.getItem('rep_users')||'[]');}catch{return[];}})();
            // Ticaret sıralaması
            const sortedTrade=[...allU].sort((a,b)=>(b.tradePoints||0)-(a.tradePoints||0));
            const tradeRank=sortedTrade.findIndex(u=>u.id===profile?.id)+1;
            const tradeBonus=tradeRank===1?6:tradeRank===2?4:tradeRank<=5?3:tradeRank<=50?2:1;
            const tradeColor=tradeBonus>=6?'#F59E0B':tradeBonus>=4?'#FB923C':tradeBonus>=3?'#A78BFA':tradeBonus>=2?'#60A5FA':'#5A7089';
            const tradeLabel=tradeBonus===6?'🏆 1. Sıra':tradeBonus===4?'🥈 2. Sıra':tradeBonus===3?'🥉 3-5. Sıra':tradeBonus===2?'📈 6-50. Sıra':'51+. Sıra';
            // Eğitim sıralaması
            const sortedEdu=[...allU].sort((a,b)=>(b.educationProgress||0)-(a.educationProgress||0));
            const eduRank=sortedEdu.findIndex(u=>u.id===profile?.id)+1;
            const eduBonus=eduRank===1?3:eduRank<=3?2:eduRank<=10?1:0;
            const eduColor=eduBonus>=3?'#F59E0B':eduBonus>=2?'#A78BFA':eduBonus>=1?'#60A5FA':'#5A7089';
            const eduLabel=eduBonus===3?'🏆 1. Sıra':eduBonus===2?'🥈 2-3. Sıra':eduBonus===1?'🥉 4-10. Sıra':'—';
            // UC katsayısı
            const ucBonus=profile?.voteMultiplier||0;
            // Toplam
            const total=tradeBonus+eduBonus+ucBonus;
            const totalColor=total>=8?'#F59E0B':total>=5?'#A78BFA':total>=3?'#60A5FA':'#10B981';
            return (
              <Card style={{marginTop:'0.5rem',background:'rgba(59,130,246,0.04)',border:'1px solid rgba(59,130,246,0.18)'}}>
                <div style={{fontSize:'0.72rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',marginBottom:'0.6rem'}}>🗳️ Oy Katsayısı Detayı</div>
                {/* Ticaret Sıralaması */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.38rem 0.4rem',borderRadius:'6px',background:'rgba(96,165,250,0.05)',marginBottom:'0.25rem'}}>
                  <div>
                    <span style={{color:'#8BA0B5',fontSize:'0.8rem'}}>📊 Ticaret Sıralaması</span>
                    <span style={{color:'#5A7089',fontSize:'0.68rem',marginLeft:'0.3rem'}}>#{tradeRank>0?tradeRank:'?'}</span>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span style={{color:tradeColor,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",fontSize:'0.78rem'}}>{tradeLabel}</span>
                    <span style={{color:tradeColor,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",fontSize:'0.82rem',marginLeft:'0.4rem'}}>{tradeBonus}x</span>
                  </div>
                </div>
                {/* Eğitim Sıralaması */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.38rem 0.4rem',borderRadius:'6px',background:'rgba(167,139,250,0.05)',marginBottom:'0.25rem'}}>
                  <div>
                    <span style={{color:'#8BA0B5',fontSize:'0.8rem'}}>🎓 Eğitim Sıralaması</span>
                    <span style={{color:'#5A7089',fontSize:'0.68rem',marginLeft:'0.3rem'}}>#{eduRank>0?eduRank:'?'}</span>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span style={{color:eduColor,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",fontSize:'0.78rem'}}>{eduLabel}</span>
                    <span style={{color:eduBonus>0?eduColor:'#3B4E63',fontWeight:900,fontFamily:"'JetBrains Mono',monospace",fontSize:'0.82rem',marginLeft:'0.4rem'}}>{eduBonus>0?`+${eduBonus}`:'—'}</span>
                  </div>
                </div>
                {/* UC Katsayısı */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.38rem 0.4rem',borderRadius:'6px',background:'rgba(245,158,11,0.05)',marginBottom:'0.3rem'}}>
                  <div>
                    <span style={{color:'#8BA0B5',fontSize:'0.8rem'}}>🪙 UnderCoin Katsayısı</span>
                    <span style={{color:'#5A7089',fontSize:'0.68rem',marginLeft:'0.3rem'}}>Ekonomi→UC</span>
                  </div>
                  <span style={{color:ucBonus>0?'#F59E0B':'#3B4E63',fontWeight:900,fontFamily:"'JetBrains Mono',monospace",fontSize:'0.82rem'}}>{ucBonus>0?`+${ucBonus}`:'—'}</span>
                </div>
                {/* Toplam */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.45rem 0.6rem',borderRadius:'8px',background:'rgba(16,185,129,0.08)',border:`1px solid ${totalColor}30`}}>
                  <span style={{color:'#E8EDF2',fontSize:'0.82rem',fontWeight:700}}>⚡ Toplam Oy Katsayısı</span>
                  <span style={{color:totalColor,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",fontSize:'1rem'}}>{total}x</span>
                </div>
                {/* Açıklama */}
                <div style={{fontSize:'0.59rem',color:'#5A7089',marginTop:'0.4rem',lineHeight:1.5}}>
                  <div>📊 Ticaret: 1.→6x · 2.→4x · 3-5.→3x · 6-50.→2x · 51+→1x</div>
                  <div>🎓 Eğitim: 1.→+3 · 2-3.→+2 · 4-10.→+1</div>
                  <div>🪙 UC: Her 500 UC → +1 katsayı (Ekonomi → Dönüşüm)</div>
                </div>
              </Card>
            );
          })()}
        </div>
      )}

      {tab==='achievements' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
          {achievements.map(a => (
            <Card key={a.id} style={{padding:'0.85rem',textAlign:'center',opacity:a.done?1:0.4,border:`1px solid ${a.done?'rgba(245,158,11,0.25)':'rgba(255,255,255,0.05)'}`}}>
              <div style={{fontSize:'1.75rem',marginBottom:'0.35rem'}}>{a.icon}</div>
              <div style={{fontWeight:800,color:a.done?'#F59E0B':'#5A7089',fontSize:'0.8rem',marginBottom:'0.2rem'}}>{a.name}</div>
              <div style={{fontSize:'0.63rem',color:'#5A7089'}}>{a.desc}</div>
              {a.done && <div style={{fontSize:'0.6rem',color:'#10B981',marginTop:'0.3rem'}}>✅ Tamamlandı</div>}
            </Card>
          ))}
        </div>
      )}

      {tab==='settings' && (
        <Card>
          <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.75rem'}}>⚙️ Hesap Ayarları</div>

          {/* Dil Seçimi */}
          <div style={{padding:'0.6rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)',marginBottom:'0.35rem'}}>
            <div style={{fontSize:'0.75rem',color:'#5A7089',marginBottom:'0.45rem'}}>🌐 Dil / Language / Sprache / Dil</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.35rem'}}>
              {[['tr','🇹🇷 Türkçe'],['en','🇬🇧 English'],['de','🇩🇪 Deutsch'],['az','🇦🇿 Azərbaycanca']].map(([code,label])=>(
                <button key={code} onClick={async()=>{ const u={...profile,lang:code}; setProfile(u); localStorage.setItem('rep_userProfile',JSON.stringify(u)); if(u.uid){try{await saveUserProfile(u.uid,u);}catch{}} showNotif(`✅ Dil değiştirildi: ${label}`,'success'); }}
                  style={{padding:'0.45rem 0.5rem',borderRadius:'8px',border:`1px solid ${(profile?.lang||'tr')===code?'rgba(59,130,246,0.5)':'rgba(255,255,255,0.08)'}`,background:(profile?.lang||'tr')===code?'rgba(59,130,246,0.15)':'rgba(255,255,255,0.03)',color:(profile?.lang||'tr')===code?'#60A5FA':'#5A7089',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.75rem',cursor:'pointer',textAlign:'center'}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
            <span style={{color:'#5A7089',fontSize:'0.85rem'}}>{dark ? '☀️ Aydınlık Mod' : '🌙 Karanlık Mod'}</span>
            <button onClick={toggle} style={{background:dark?'#3B82F6':'rgba(255,255,255,0.08)',border:'none',borderRadius:'20px',padding:'0.3rem 0.85rem',color:'#fff',fontSize:'0.75rem',fontWeight:700,cursor:'pointer'}}>
              {dark ? 'Açık' : 'Kapalı'}
            </button>
          </div>
          {[
            ['📧','E-posta',profile?.email||'-'],
            ['🏙️','Şehir',profile?.city||'-'],
            ['👤','Cinsiyet',profile?.gender==='female'?'Kadın':'Erkek'],
            ['📅','Kayıt',profile?.registeredAt ? new Date(profile.registeredAt).toLocaleDateString('tr-TR') : '-'],
          ].map(([ic,lb,v])=>(
            <div key={lb} style={{display:'flex',justifyContent:'space-between',padding:'0.5rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <span style={{color:'#5A7089',fontSize:'0.85rem'}}>{ic} {lb}</span>
              <span style={{color:'#E8EDF2',fontWeight:600,fontSize:'0.85rem'}}>{v}</span>
            </div>
          ))}
          <div style={{marginTop:'0.75rem'}}>
            <Btn variant='primary' size='full' onClick={()=>setEditModal(true)}>✏️ Profili Düzenle</Btn>
          </div>

          {/* Streak */}
          <div style={{marginTop:'0.75rem',paddingTop:'0.75rem',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
            <div style={{fontSize:'0.7rem',color:'#5A7089',fontWeight:700,marginBottom:'0.4rem'}}>🔥 Günlük Streak</div>
            {streak ? (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <span style={{color:'#F59E0B',fontWeight:900,fontSize:'1.1rem',fontFamily:"'JetBrains Mono',monospace"}}>🔥 {streak.current_streak||0}</span>
                  <span style={{color:'#5A7089',fontSize:'0.7rem',marginLeft:'0.4rem'}}>gün · En iyi: {streak.longest_streak||0}</span>
                </div>
                <Btn variant={streak.last_claim_date===new Date().toISOString().slice(0,10)?'ghost':'primary'} size='sm'
                  onClick={streak.last_claim_date===new Date().toISOString().slice(0,10)?undefined:doClaimStreak}
                  disabled={streakLoading||streak.last_claim_date===new Date().toISOString().slice(0,10)}>
                  {streak.last_claim_date===new Date().toISOString().slice(0,10)?'✅ Alındı':streakLoading?'...':'🎁 Al'}
                </Btn>
              </div>
            ) : (
              <Btn variant='ghost' size='sm' onClick={doClaimStreak} disabled={streakLoading}>
                {streakLoading?'Yükleniyor...':'🎁 Günlük Ödül Al'}
              </Btn>
            )}
          </div>

          {/* Referral */}
          <div style={{marginTop:'0.6rem',paddingTop:'0.6rem',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
            <div style={{fontSize:'0.7rem',color:'#5A7089',fontWeight:700,marginBottom:'0.4rem'}}>🔗 Referans Kodun</div>
            <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
              <code style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.18)',borderRadius:'6px',padding:'0.3rem 0.55rem',color:'#60A5FA',fontFamily:"'JetBrains Mono',monospace",fontSize:'0.85rem',flex:1,textAlign:'center',letterSpacing:'0.08em'}}>
                {referralCode||'—'}
              </code>
              {referralCode && (
                <button onClick={()=>{navigator.clipboard?.writeText(referralCode).then(()=>showNotif('✅ Kopyalandı!','success')).catch(()=>{});}}
                  style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.18)',borderRadius:'7px',padding:'0.3rem 0.55rem',color:'#60A5FA',cursor:'pointer',fontSize:'0.72rem',fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>
                  📋
                </button>
              )}
            </div>
            <div style={{fontSize:'0.6rem',color:'#5A7089',marginTop:'0.25rem'}}>Arkadaşın kullanırsa +2.000₺ sen, +5.000₺ sen</div>
          </div>
        </Card>
      )}

      {/* ── Şifre Değiştir Kartı ──────────────────────────────────────── */}
      {tab==='settings' && (
        <Card style={{marginTop:'0.5rem'}}>
          <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.65rem',fontSize:'0.85rem'}}>🔑 Şifre Değiştir</div>
          {pwMsg && (
            <div style={{background:pwMsg.startsWith('✅')?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${pwMsg.startsWith('✅')?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,borderRadius:'8px',padding:'0.45rem 0.7rem',marginBottom:'0.55rem',fontSize:'0.78rem',color:pwMsg.startsWith('✅')?'#6EE7B7':'#FCA5A5'}}>
              {pwMsg}
            </div>
          )}
          <input type="password" value={pwForm.current} onChange={e=>setPwForm(p=>({...p,current:e.target.value}))}
            placeholder="Mevcut şifre" style={{...inputSt,marginBottom:'0.45rem'}} />
          <input type="password" value={pwForm.newPw} onChange={e=>setPwForm(p=>({...p,newPw:e.target.value}))}
            placeholder="Yeni şifre (min 6 karakter)" style={{...inputSt,marginBottom:'0.45rem'}} />
          <input type="password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))}
            placeholder="Yeni şifre (tekrar)" style={{...inputSt,marginBottom:'0.6rem'}} />
          <Btn variant='primary' size='full' onClick={doChangePassword} disabled={pwLoading}>
            {pwLoading?'Güncelleniyor...':'🔑 Şifreyi Güncelle'}
          </Btn>
        </Card>
      )}

      {/* ── 2FA Kartı ──────────────────────────────────────────────────── */}
      {tab==='settings' && (
        <Card style={{marginTop:'0.5rem'}}>
          <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.65rem',fontSize:'0.85rem'}}>🛡️ İki Faktörlü Doğrulama (2FA)</div>
          {twoFAStatus === null ? (
            <div style={{color:'#5A7089',fontSize:'0.8rem',textAlign:'center',padding:'0.5rem'}}>Yükleniyor...</div>
          ) : twoFAStatus ? (
            <div>
              <div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'8px',padding:'0.45rem 0.7rem',marginBottom:'0.55rem',fontSize:'0.78rem',color:'#6EE7B7'}}>
                ✅ 2FA etkin — Hesabınız korumalı
              </div>
              <input type="text" inputMode="numeric" value={twoFAToken} onChange={e=>setTwoFAToken(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="6 haneli kodu girin" style={{...inputSt,marginBottom:'0.5rem',textAlign:'center',letterSpacing:'0.2em',fontFamily:"'JetBrains Mono',monospace"}} />
              <Btn variant='danger' size='full' onClick={doDisable2FA}>2FA'yı Kapat</Btn>
            </div>
          ) : twoFASetup ? (
            <div>
              <div style={{fontSize:'0.73rem',color:'#5A7089',marginBottom:'0.5rem'}}>Authenticator uygulamasıyla QR kodu okutun:</div>
              <div style={{textAlign:'center',marginBottom:'0.6rem'}}>
                <img src={twoFASetup.qrCode} alt="QR" style={{width:'150px',height:'150px',borderRadius:'8px',background:'#fff',padding:'4px'}} />
              </div>
              <div style={{background:'rgba(0,0,0,0.3)',borderRadius:'6px',padding:'0.4rem 0.6rem',marginBottom:'0.6rem',fontFamily:"'JetBrains Mono',monospace",fontSize:'0.68rem',color:'#A78BFA',textAlign:'center',wordBreak:'break-all'}}>
                {twoFASetup.secret}
              </div>
              <input type="text" inputMode="numeric" value={twoFAToken} onChange={e=>setTwoFAToken(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="6 haneli kodu girin" style={{...inputSt,marginBottom:'0.45rem',textAlign:'center',letterSpacing:'0.2em',fontFamily:"'JetBrains Mono',monospace"}} />
              <Btn variant='primary' size='full' onClick={doEnable2FA} style={{marginBottom:'0.35rem'}}>✅ 2FA Etkinleştir</Btn>
              <Btn variant='ghost' size='full' onClick={()=>setTwoFASetup(null)}>İptal</Btn>
            </div>
          ) : (
            <div>
              <div style={{fontSize:'0.73rem',color:'#5A7089',marginBottom:'0.6rem'}}>Google Authenticator ile hesabınızı koruyun. Giriş sırasında 6 haneli kod gerekecek.</div>
              <Btn variant='ghost' size='full' onClick={doSetup2FA}>🛡️ 2FA Kurulumunu Başlat</Btn>
            </div>
          )}
        </Card>
      )}

      {tab==='customize' && (
        <div>
          <Card style={{marginBottom:'0.65rem'}}>
            <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.3rem',fontSize:'0.85rem'}}>📸 Profil Fotoğrafı</div>

            {/* Telefondan Yükle */}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{display:'none'}} />
            <button onClick={()=>fileInputRef.current?.click()} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',padding:'0.7rem',marginBottom:'0.6rem',borderRadius:'12px',border:'2px dashed rgba(59,130,246,0.35)',background:'rgba(59,130,246,0.06)',color:'#60A5FA',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:'0.85rem',cursor:'pointer'}}>
              📱 Telefondan / Galeriden Seç
            </button>

            <div style={{fontSize:'0.65rem',color:'#5A7089',marginBottom:'0.4rem',textAlign:'center'}}>veya URL ile gir</div>
            <div style={{fontSize:'0.68rem',color:'#5A7089',marginBottom:'0.4rem'}}>URL gir (.jpg, .png, .gif, .webp)</div>
            <input value={photoUrlInput} onChange={e=>setPhotoUrlInput(e.target.value)} placeholder="https://resim-url.com/foto.jpg" style={inputSt}/>
            {photoUrlInput && <img src={photoUrlInput} alt="preview" style={{width:'52px',height:'52px',borderRadius:'50%',objectFit:'cover',marginTop:'0.5rem',border:'2px solid rgba(59,130,246,0.3)',display:'block'}} onError={e=>e.target.style.display='none'}/>}
            <Btn variant='primary' size='full' onClick={savePhotoUrl} style={{marginTop:'0.5rem'}}>✅ URL Kaydet</Btn>
          </Card>

          {profile?.premium ? (
            <>
              <Card style={{marginBottom:'0.65rem',background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(11,21,39,0.95))'}}>
                <div style={{fontWeight:700,color:'#A78BFA',marginBottom:'0.55rem',fontSize:'0.85rem'}}>💎 VIP Çerçeve Stili</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.35rem',marginBottom:'0.5rem'}}>
                  {[{id:'rainbow',label:'🌈 Gökkuşağı'},{id:'fire',label:'🔥 Ateş'},{id:'ice',label:'❄️ Buz'},{id:'gold',label:'✨ Altın'},{id:'neon',label:'💚 Neon'},{id:'violet',label:'💜 Mor'},{id:'heart',label:'💗 Kalp'},{id:'',label:'⭕ Yok'}].map(({id,label})=>(
                    <button key={id||'none'} onClick={()=>saveVipFrame(id)}
                      style={{padding:'0.4rem 0.15rem',borderRadius:'8px',border:`2px solid ${(profile?.vipFrame||'')===(id)?'#A78BFA':'rgba(255,255,255,0.08)'}`,background:(profile?.vipFrame||'')===(id)?'rgba(139,92,246,0.2)':'rgba(255,255,255,0.02)',color:(profile?.vipFrame||'')===(id)?'#A78BFA':'#5A7089',cursor:'pointer',fontSize:'0.6rem',fontWeight:700,fontFamily:"'DM Sans',sans-serif",textAlign:'center',lineHeight:1.3}}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:'0.65rem',color:'#5A7089'}}>Seçili: <span style={{color:'#A78BFA',fontWeight:700}}>{profile?.vipFrame||'Yok'}</span></div>
              </Card>

              <Card style={{marginBottom:'0.65rem',background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(11,21,39,0.95))'}}>
                <div style={{fontWeight:700,color:'#A78BFA',marginBottom:'0.3rem',fontSize:'0.85rem'}}>🎭 GIF / Animasyonlu Avatar URL</div>
                <div style={{fontSize:'0.68rem',color:'#5A7089',marginBottom:'0.5rem'}}>Animasyonlu avatar (GIF desteği mevcut)</div>
                <input value={avatarUrlInput} onChange={e=>setAvatarUrlInput(e.target.value)} placeholder="https://i.giphy.com/xxxx.gif" style={inputSt}/>
                <Btn variant='ghost' size='full' onClick={saveAvatarUrl} style={{marginTop:'0.5rem'}}>✅ Kaydet</Btn>
              </Card>

              <Card style={{background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(11,21,39,0.95))'}}>
                <div style={{fontWeight:700,color:'#A78BFA',marginBottom:'0.3rem',fontSize:'0.85rem'}}>🖼️ Profil Banner / Arka Plan</div>
                <div style={{fontSize:'0.68rem',color:'#5A7089',marginBottom:'0.5rem'}}>Profil kartı arka plan görseli (GIF veya resim URL)</div>
                <input value={bannerUrlInput} onChange={e=>setBannerUrlInput(e.target.value)} placeholder="https://example.com/banner.gif" style={inputSt}/>
                <Btn variant='ghost' size='full' onClick={saveBannerUrl} style={{marginTop:'0.5rem'}}>✅ Kaydet</Btn>
              </Card>
            </>
          ) : (
            <Card style={{textAlign:'center',padding:'1.75rem 1rem',background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(11,21,39,0.95))'}}>
              <div style={{fontSize:'2.2rem',marginBottom:'0.5rem'}}>💎</div>
              <div style={{fontWeight:800,color:'#A78BFA',fontSize:'0.95rem',marginBottom:'0.3rem'}}>VIP Özelleştirme</div>
              <div style={{fontSize:'0.75rem',color:'#5A7089',marginBottom:'0.75rem'}}>Çerçeve, GIF avatar ve profil banner için VIP üyelik gereklidir</div>
              <Btn variant='ghost' onClick={()=>showNotif('Premium sayfasına yönlendiriliyor... 💎','gold')}>💎 VIP Ol</Btn>
            </Card>
          )}
        </div>
      )}

      {/* ── Kredi / Loan Tabı ──────────────────────────────────────────── */}
      {tab==='kredi' && (
        <div>
          <Card style={{marginBottom:'0.5rem'}}>
            <div style={{fontSize:'0.7rem',color:'#5A7089',fontWeight:700,textTransform:'uppercase',marginBottom:'0.5rem'}}>📊 Kredi Skoru</div>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <div style={{fontSize:'2rem',fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:(profile?.creditScore||profile?.credit_score||500)>=700?'#10B981':(profile?.creditScore||profile?.credit_score||500)>=500?'#F59E0B':'#EF4444'}}>
                {profile?.creditScore||profile?.credit_score||500}
              </div>
              <div>
                <Tag color={(profile?.creditScore||500)>=700?'green':(profile?.creditScore||500)>=500?'gold':'red'}>
                  {(profile?.creditScore||500)>=700?'İyi':((profile?.creditScore||500)>=500?'Normal':'Kötü')}
                </Tag>
              </div>
            </div>
          </Card>

          <Card style={{marginBottom:'0.5rem'}}>
            <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.6rem',fontSize:'0.85rem'}}>💳 Kredi Talebi</div>
            <input type="number" value={loanAmt} onChange={e=>setLoanAmt(e.target.value)}
              placeholder="Tutar girin (min 1.000₺)" style={{...inputSt,marginBottom:'0.45rem'}} />
            {parseInt(loanAmt)>=1000 && (
              <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.45rem'}}>
                Tahmini faiz: %8 · Geri ödeme: ~{Math.ceil(parseInt(loanAmt)*1.08).toLocaleString('tr-TR')}₺ (30 gün)
              </div>
            )}
            <Btn variant='primary' size='full' onClick={doRequestLoan}>💳 Kredi Al</Btn>
          </Card>

          <Card>
            <div style={{fontWeight:700,color:'#E8EDF2',marginBottom:'0.6rem',fontSize:'0.85rem'}}>📋 Kredilerim</div>
            {loansLoading ? (
              <div style={{textAlign:'center',padding:'0.75rem',color:'#5A7089',fontSize:'0.8rem'}}>Yükleniyor...</div>
            ) : loans.length===0 ? (
              <div style={{textAlign:'center',padding:'0.75rem',color:'#5A7089',fontSize:'0.8rem'}}>Aktif kredi yok</div>
            ) : loans.map(loan=>(
              <div key={loan.id} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'0.6rem',marginBottom:'0.35rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.3rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
                    <span style={{color:'#E8EDF2',fontWeight:700,fontSize:'0.85rem'}}>{parseInt(loan.principal||loan.amount||0).toLocaleString('tr-TR')}₺</span>
                    <Tag color={loan.status==='active'?'blue':loan.status==='paid'?'green':'red'}>
                      {loan.status==='active'?'Aktif':loan.status==='paid'?'Ödendi':'Gecikmiş'}
                    </Tag>
                  </div>
                  <span style={{color:'#5A7089',fontSize:'0.68rem'}}>{loan.due_date?new Date(loan.due_date).toLocaleDateString('tr-TR'):'-'}</span>
                </div>
                {loan.status==='active' && (
                  <div>
                    <ProgressBar pct={Math.min(100,(parseInt(loan.amount_paid||0)/Math.max(1,parseInt(loan.amount_due||loan.total_due||loan.principal||1)))*100)} color='#10B981' h={4} />
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.67rem',color:'#5A7089',margin:'0.25rem 0 0.4rem'}}>
                      <span>Ödenen: {parseInt(loan.amount_paid||0).toLocaleString('tr-TR')}₺</span>
                      <span>Kalan: {(parseInt(loan.amount_due||loan.total_due||0)-parseInt(loan.amount_paid||0)).toLocaleString('tr-TR')}₺</span>
                    </div>
                    <Btn variant='ghost' size='sm' onClick={()=>doRepayLoan(loan.id,(parseInt(loan.amount_due||loan.total_due||0)-parseInt(loan.amount_paid||0)))}>
                      💰 Tamamını Öde
                    </Btn>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {editModal && (
        <Modal title="✏️ Profili Düzenle" onClose={()=>setEditModal(false)}>
          <div style={{marginBottom:'0.85rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Kullanıcı Adı</div>
            <input value={editForm.username} onChange={e=>setEditForm(p=>({...p,username:e.target.value}))}
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'}} />
          </div>
          <div style={{marginBottom:'1.25rem'}}>
            <div style={{fontSize:'0.72rem',color:'#5A7089',marginBottom:'0.4rem',fontWeight:700}}>Şehir</div>
            <select value={editForm.city} onChange={e=>setEditForm(p=>({...p,city:e.target.value}))}
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.65rem 0.9rem',color:'#E8EDF2',fontFamily:"'DM Sans',sans-serif",fontSize:'16px',outline:'none',boxSizing:'border-box'}}>
              {CITIES.map(c=><option key={c} value={c} style={{background:'#0B1527'}}>{c}</option>)}
            </select>
          </div>
          <Btn variant='primary' size='full' onClick={saveProfile}>✅ Kaydet</Btn>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PREMİUM SAYFASI
// ═══════════════════════════════════════════════════════
function PremiumPage({ profile, setProfile, showNotif }) {
  const benefits = [
    ['💎','VIP Çerçeve','Özel profil çerçevesi'],
    ['⚡','2x XP','Tüm aktivitelerden 2 kat XP'],
    ['📈','5x Çiftlik','Tarım geliri 5 kat daha fazla'],
    ['🚫','Reklamsız','Hiçbir reklam görmezsin'],
    ['💬','Premium Chat','Özel renk ve rozet'],
    ['🎁','Günlük Kutu','Her gün özel ödül kutusu'],
    ['🏦','Yüksek Faiz','%2 günlük faiz (normal %0.5)'],
    ['🤝','Sonsuz İttifak','Sınırsız ittifak etkinliği'],
  ];

  const plans = [
    { id:'month', label:'Aylık VIP', price:249.99, uc:0, days:30, badge:'⭐', popular:true },
    { id:'year',  label:'Yıllık VIP', price:2499.99, uc:0, days:365, badge:'💎', save:'%17 Tasarruf' },
    { id:'uc',   label:'UC ile Al', price:0, uc:500, days:30, badge:'🪙', desc:'500 UC ile 1 aylık VIP' },
  ];

  return (
    <div style={{padding:'0.7rem'}}>
      {/* Hero */}
      <div style={{background:'linear-gradient(135deg,#1a0a2e,#2d1060)',border:'1px solid rgba(167,139,250,0.3)',borderRadius:'20px',padding:'1.5rem',textAlign:'center',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>💎</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.3rem',fontWeight:900,color:'#fff',marginBottom:'0.25rem'}}>UNDERSTATE VIP</div>
        <div style={{fontSize:'0.78rem',color:'#C4B5FD'}}>Premium üyelik ile tüm avantajların kilidini aç</div>
        {profile?.premium && <Tag color='violet' style={{marginTop:'0.5rem'}}>✅ Aktif VIP Üye</Tag>}
      </div>

      {/* Avantajlar */}
      <Card style={{marginBottom:'0.75rem'}}>
        <div style={{fontSize:'0.72rem',color:'#A78BFA',fontWeight:800,textTransform:'uppercase',marginBottom:'0.7rem',letterSpacing:'0.08em'}}>💎 VIP Avantajları</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem'}}>
          {benefits.map(([ic,name,desc])=>(
            <div key={name} style={{background:'rgba(139,92,246,0.07)',border:'1px solid rgba(139,92,246,0.15)',borderRadius:'10px',padding:'0.65rem',display:'flex',flexDirection:'column',gap:'0.2rem'}}>
              <span style={{fontSize:'1.1rem'}}>{ic}</span>
              <span style={{fontSize:'0.78rem',fontWeight:700,color:'#E8EDF2'}}>{name}</span>
              <span style={{fontSize:'0.62rem',color:'#5A7089'}}>{desc}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Planlar */}
      <div style={{fontSize:'0.72rem',color:'#5A7089',fontWeight:800,textTransform:'uppercase',marginBottom:'0.5rem',letterSpacing:'0.08em'}}>💳 Planlar</div>
      {plans.map(p => (
        <div key={p.id} style={{background:p.popular?'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(11,21,39,0.9))':'rgba(11,21,39,0.85)',border:`1px solid ${p.popular?'rgba(167,139,250,0.4)':'rgba(255,255,255,0.06)'}`,borderRadius:'14px',padding:'0.85rem',marginBottom:'0.4rem',display:'flex',alignItems:'center',gap:'0.75rem'}}>
          <div style={{fontSize:'1.5rem',width:'36px',textAlign:'center',flexShrink:0}}>{p.badge}</div>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
              <span style={{fontWeight:800,color:'#E8EDF2'}}>{p.label}</span>
              {p.popular && <Tag color='violet'>En Popüler</Tag>}
              {p.save && <Tag color='green'>{p.save}</Tag>}
            </div>
            <div style={{fontSize:'0.7rem',color:'#5A7089'}}>{p.days} gün VIP</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:900,color:'#A78BFA',fontSize:'1rem'}}>{p.price>0 ? `₺${p.price}` : `${p.uc} UC`}</div>
            <Btn variant='ghost' size='sm' onClick={()=>showNotif('Ödeme sistemi yakında aktif! 💎','gold')} style={{marginTop:'0.25rem'}}>Satın Al</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MARKET / MAĞAZA SAYFASI
// ═══════════════════════════════════════════════════════
const UC_PACKAGES = [
  { id:'uc_50',   uc:50,   bonus:0,   price:9.99,   badge:'🪙', popular:false },
  { id:'uc_150',  uc:150,  bonus:10,  price:24.99,  badge:'🪙', popular:false },
  { id:'uc_350',  uc:350,  bonus:30,  price:49.99,  badge:'⭐', popular:false },
  { id:'uc_750',  uc:750,  bonus:75,  price:99.99,  badge:'⭐', popular:true  },
  { id:'uc_1500', uc:1500, bonus:200, price:179.99, badge:'💎', popular:false },
  { id:'uc_3000', uc:3000, bonus:500, price:299.99, badge:'💎', popular:false },
];

function StorePage({ profile, setProfile, showNotif }) {
  const [tab, setTab] = useState('uc');
  const [buying, setBuying] = useState(null);
  const [history, setHistory] = useState([]);
  const card = {background:'rgba(11,21,39,0.9)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'0.85rem',marginBottom:'0.5rem'};

  useEffect(() => {
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt) return;
    fetch('/api/store/history', { headers:{'Authorization':'Bearer '+jwt} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.history) setHistory(d.history); })
      .catch(() => {});
  }, []);

  const handleBuyUC = async (pkg) => {
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt) { showNotif('Önce giriş yap!', 'error'); return; }
    setBuying(pkg.id);
    try {
      const res = await fetch('/api/store/purchase/uc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+jwt },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const d = await res.json();
      if (d.success) {
        const total = pkg.uc + (pkg.bonus || 0);
        setProfile(p => { const np={...p, underCoin:(p.underCoin||0)+total}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
        showNotif(`✅ ${total} UC hesabına yüklendi!`, 'success');
        setHistory(prev => [{ package_id:pkg.id, uc_amount:total, price_tl:pkg.price, status:'completed', created_at:new Date().toISOString() }, ...prev].slice(0,20));
      } else {
        showNotif(d.message || 'Satın alma başarısız', 'error');
      }
    } catch (e) {
      showNotif('Bağlantı hatası', 'error');
    }
    setBuying(null);
  };

  const handleBuyVIP = async (plan) => {
    const jwt = localStorage.getItem('us_jwt');
    if (!jwt) { showNotif('Önce giriş yap!', 'error'); return; }
    setBuying(plan.id);
    try {
      const res = await fetch('/api/store/purchase/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+jwt },
        body: JSON.stringify({ packageId: plan.id }),
      });
      const d = await res.json();
      if (d.success) {
        setProfile(p => { const np={...p, premium:true, premiumExpiry:d.premiumExpiry, vip:true}; localStorage.setItem('rep_userProfile',JSON.stringify(np)); return np; });
        showNotif(`✅ ${plan.label} aktifleştirildi! ${plan.days} gün VIP.`, 'success');
      } else {
        showNotif(d.message || 'Satın alma başarısız', 'error');
      }
    } catch (e) {
      showNotif('Bağlantı hatası', 'error');
    }
    setBuying(null);
  };
  const vipPlans = [
    { id:'vip_30',  label:'Aylık VIP',  price:49.99,  days:30,  badge:'⭐', popular:true, features:['💎 VIP çerçeve','⚡ +50% XP','📈 %2 banka faizi','🎁 Özel rozet'] },
    { id:'vip_90',  label:'3 Aylık VIP', price:129.99, days:90,  badge:'💎', save:'%14 Tasarruf', features:['💎 VIP çerçeve','⚡ +50% XP','📈 %2 banka faizi','🪙 Aylık 100 UC'] },
    { id:'vip_365', label:'Yıllık VIP',  price:399.99, days:365, badge:'👑', save:'%25 Tasarruf', features:['💎 VIP çerçeve','⚡ +50% XP','📈 %2 banka faizi','🪙 Aylık 150 UC','🏆 Yıllık rozet'] },
  ];
  return (
    <div style={{padding:'0.7rem'}}>
      <div style={{background:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',border:'1px solid rgba(236,72,153,0.3)',borderRadius:'20px',padding:'1.25rem',textAlign:'center',marginBottom:'0.75rem'}}>
        <div style={{fontSize:'2rem',marginBottom:'0.4rem'}}>🛒</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.2rem',fontWeight:900,color:'#fff'}}>UNDERSTATE MARKET</div>
        <div style={{fontSize:'0.72rem',color:'#C4B5FD',marginTop:'0.25rem'}}>VIP üyelik ve UnderCoin satın al</div>
        {profile?.premium && <div style={{marginTop:'0.5rem',display:'inline-block',background:'rgba(167,139,250,0.2)',border:'1px solid rgba(167,139,250,0.4)',borderRadius:'8px',padding:'0.25rem 0.75rem',fontSize:'0.7rem',color:'#A78BFA',fontWeight:700}}>✅ Aktif VIP Üye</div>}
      </div>

      <div style={{display:'flex',gap:'4px',marginBottom:'0.75rem'}}>
        {[['uc','🪙 UnderCoin'],['vip','💎 VIP'],['edu','📚 Eğitim']].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{flex:1,padding:'0.5rem',borderRadius:'10px',border:`1px solid ${tab===id?'rgba(236,72,153,0.5)':'rgba(255,255,255,0.08)'}`,background:tab===id?'rgba(236,72,153,0.12)':'rgba(255,255,255,0.03)',color:tab===id?'#F472B6':'#5A7089',fontWeight:700,fontSize:'0.78rem',cursor:'pointer'}}>
            {lbl}
          </button>
        ))}
      </div>

      {tab==='uc' && (
        <div>
          <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.5rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>🪙 UnderCoin Paketleri</div>
          <div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'12px',padding:'0.65rem',marginBottom:'0.65rem',fontSize:'0.72rem',color:'#6EE7B7'}}>
            💡 UnderCoin (UC), oyun içi özel para birimidir. Kozmetikler, avantajlar ve premium özellikler için kullanılır.
          </div>
          <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.4rem'}}>Mevcut UC: <span style={{color:'#F59E0B',fontWeight:700}}>{profile?.underCoin||0} UC</span></div>
          {UC_PACKAGES.map(pkg => (
            <div key={pkg.id} style={{...card,border:`1px solid ${pkg.popular?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.07)'}`,background:pkg.popular?'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(11,21,39,0.9))':'rgba(11,21,39,0.9)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <div style={{fontSize:'1.6rem',width:'40px',textAlign:'center',flexShrink:0}}>{pkg.badge}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,color:'#E8EDF2',fontSize:'0.9rem'}}>{pkg.uc.toLocaleString('tr-TR')} UC {pkg.bonus>0 && <span style={{color:'#10B981',fontSize:'0.72rem',fontWeight:700}}>+{pkg.bonus} bonus</span>}</div>
                  <div style={{fontSize:'0.65rem',color:'#5A7089'}}>₺{pkg.price.toLocaleString('tr-TR')} ödeme • Toplam: {(pkg.uc+pkg.bonus).toLocaleString('tr-TR')} UC</div>
                  {pkg.popular && <div style={{display:'inline-block',marginTop:'0.2rem',background:'rgba(245,158,11,0.2)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:'6px',padding:'1px 6px',fontSize:'0.6rem',color:'#F59E0B',fontWeight:700}}>En Popüler</div>}
                </div>
                <button onClick={()=>handleBuyUC(pkg)} disabled={buying===pkg.id}
                  style={{padding:'0.45rem 0.85rem',borderRadius:'10px',border:`1px solid rgba(245,158,11,${pkg.popular?0.8:0.3})`,background:pkg.popular?'linear-gradient(135deg,#F59E0B,#D97706)':'rgba(245,158,11,0.15)',color:pkg.popular?'#000':'#F59E0B',fontWeight:700,fontSize:'0.78rem',cursor:buying?'not-allowed':'pointer',flexShrink:0,opacity:buying===pkg.id?0.6:1}}>
                  {buying===pkg.id ? '...' : 'Satın Al'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='vip' && (
        <div>
          <div style={{fontSize:'0.7rem',color:'#5A7089',marginBottom:'0.5rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>💎 VIP Üyelik Planları</div>
          {vipPlans.map(plan => (
            <div key={plan.id} style={{...card,border:`1px solid ${plan.popular?'rgba(167,139,250,0.45)':'rgba(255,255,255,0.07)'}`,background:plan.popular?'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(11,21,39,0.9))':'rgba(11,21,39,0.9)',marginBottom:'0.65rem'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',marginBottom:'0.65rem'}}>
                <div style={{fontSize:'1.8rem',flexShrink:0}}>{plan.badge}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.4rem',flexWrap:'wrap'}}>
                    <span style={{fontWeight:900,color:'#E8EDF2',fontSize:'0.95rem'}}>{plan.label}</span>
                    {plan.popular && <span style={{background:'rgba(139,92,246,0.25)',border:'1px solid rgba(167,139,250,0.4)',borderRadius:'6px',padding:'1px 6px',fontSize:'0.6rem',color:'#A78BFA',fontWeight:700}}>En Popüler</span>}
                    {plan.save && <span style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'6px',padding:'1px 6px',fontSize:'0.6rem',color:'#10B981',fontWeight:700}}>{plan.save}</span>}
                  </div>
                  <div style={{fontWeight:900,color:'#A78BFA',fontSize:'1.25rem',marginTop:'0.15rem'}}>₺{plan.price.toLocaleString('tr-TR', {minimumFractionDigits:2})}</div>
                  <div style={{fontSize:'0.65rem',color:'#5A7089'}}>{plan.days} gün VIP üyelik</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.3rem',marginBottom:'0.65rem'}}>
                {plan.features.map(f => (
                  <div key={f} style={{fontSize:'0.68rem',color:'#94A3B8',display:'flex',alignItems:'center',gap:'0.3rem'}}>
                    <span style={{color:'#A78BFA'}}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={()=>handleBuyVIP(plan)} disabled={buying===plan.id} style={{width:'100%',padding:'0.65rem',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#7C3AED,#A855F7)',color:'#fff',fontWeight:700,fontSize:'0.85rem',cursor:buying?'not-allowed':'pointer',letterSpacing:'0.03em',opacity:buying===plan.id?0.6:1}}>
                {buying===plan.id ? '⏳ İşleniyor...' : `💎 ${plan.label} Satın Al`}
              </button>
            </div>
          ))}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'0.75rem',fontSize:'0.7rem',color:'#5A7089'}}>
            500 UC harcayarak da 30 günlük VIP aktifleştirebilirsin. Mevcut UC: <span style={{color:'#F59E0B',fontWeight:700}}>{profile?.underCoin||0}</span>
            {(profile?.underCoin||0) >= 500 && (
              <button onClick={()=>{ setProfile(p=>{const np={...p,underCoin:(p.underCoin||0)-500,premium:true,premiumExpiry:Date.now()+30*24*3600000};localStorage.setItem('rep_userProfile',JSON.stringify(np));return np;}); showNotif('✅ VIP aktifleştirildi! 30 gün','success'); }}
                style={{display:'block',marginTop:'0.5rem',width:'100%',padding:'0.5rem',borderRadius:'10px',border:'1px solid rgba(245,158,11,0.4)',background:'rgba(245,158,11,0.12)',color:'#F59E0B',fontWeight:700,fontSize:'0.78rem',cursor:'pointer'}}>
                🪙 500 UC ile Aktifleştir
              </button>
            )}
          </div>
        </div>
      )}

      {tab==='edu' && (
        <div>
          <div style={{background:'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(11,21,39,0.97))',border:'1px solid rgba(139,92,246,0.35)',borderRadius:'16px',padding:'1.25rem',textAlign:'center',marginBottom:'0.75rem'}}>
            <div style={{fontSize:'2rem',marginBottom:'0.4rem'}}>📚</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:900,color:'#C4B5FD'}}>EĞİTİM PAKETİ</div>
            <div style={{fontSize:'0.72rem',color:'#8B5CF6',marginTop:'0.2rem'}}>Eğitim tıklamalarında 12 saatlik bekleme süresi (normal: 5 dk)</div>
            {(profile?.packages?.edu || profile?.eduPackage) && (
              <div style={{marginTop:'0.5rem',display:'inline-block',background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.4)',borderRadius:'8px',padding:'0.25rem 0.75rem',fontSize:'0.7rem',color:'#10B981',fontWeight:700}}>✅ Aktif Paketiniz Var</div>
            )}
          </div>

          <div style={{background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(11,21,39,0.95))',border:'1px solid rgba(139,92,246,0.35)',borderRadius:'16px',padding:'1rem',marginBottom:'0.65rem'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',marginBottom:'0.75rem'}}>
              <div style={{fontSize:'2rem',flexShrink:0}}>📦</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.4rem',flexWrap:'wrap'}}>
                  <span style={{fontWeight:900,color:'#C4B5FD',fontSize:'1rem'}}>30 Günlük Eğitim Paketi</span>
                  <span style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'6px',padding:'1px 6px',fontSize:'0.62rem',color:'#10B981',fontWeight:700}}>🔥 Popüler</span>
                </div>
                <div style={{fontWeight:900,color:'#A78BFA',fontSize:'1.4rem',marginTop:'0.1rem'}}>₺1.199,99</div>
                <div style={{fontSize:'0.65rem',color:'#5A7089'}}>30 gün geçerli eğitim paketi</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.3rem',marginBottom:'0.75rem'}}>
              {['📚 Her tıklama: 12 saat bekle','⚡ Normal: 5 dakika bekleme','🎓 Daha hızlı diploma kazan','🏆 Ekstra XP bonusu yok'].map(f=>(
                <div key={f} style={{fontSize:'0.68rem',color:'#94A3B8',display:'flex',alignItems:'center',gap:'0.3rem'}}>
                  <span style={{color:'#A78BFA'}}>✓</span>{f}
                </div>
              ))}
            </div>
            <button onClick={()=>showNotif('💳 Eğitim Paketi (₺1.199,99) için ödeme sayfasına yönlendiriliyor...','gold')}
              style={{width:'100%',padding:'0.7rem',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#7C3AED,#A855F7)',color:'#fff',fontWeight:700,fontSize:'0.85rem',cursor:'pointer',letterSpacing:'0.03em'}}>
              📚 Eğitim Paketi Al — ₺1.199,99
            </button>
          </div>

          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'0.75rem',fontSize:'0.7rem',color:'#5A7089',lineHeight:1.7}}>
            💡 <strong style={{color:'#C4B5FD'}}>Eğitim Paketi</strong> ile her eğitim tıklaması sonrası <strong style={{color:'#A78BFA'}}>12 saat</strong> beklersin (5 dk yerine). Admin veya admin panelinden da verilebilir.
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// EĞİTİM SİSTEMİ SAYFASI
// ═══════════════════════════════════════════════════════
