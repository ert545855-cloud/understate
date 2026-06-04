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

