const logger = require('../utils/logger');

let _io = null;

const state = {
  economy: {
    inflation: 5.0,
    treasury: 1000000,
    taxRate: 10,
    interestRate: 5,
    stability: 100,
    lastUpdate: Date.now(),
  },
  market: {},
  tick: 0,
};

const STOCK_COMPANIES = [
  { id: 'UNDR', name: 'UnderCorp', price: 100, volatility: 0.03 },
  { id: 'BLDG', name: 'İnşaat A.Ş.', price: 250, volatility: 0.02 },
  { id: 'ENRJ', name: 'Enerji Ltd.', price: 75, volatility: 0.04 },
  { id: 'TECH', name: 'Teknoloji A.Ş.', price: 500, volatility: 0.05 },
  { id: 'BANK', name: 'Devlet Bankası', price: 180, volatility: 0.015 },
  { id: 'AGRI', name: 'Tarım Kooperatifi', price: 60, volatility: 0.025 },
  { id: 'MED', name: 'Sağlık Grubu', price: 320, volatility: 0.02 },
  { id: 'AUTO', name: 'Otomotiv San.', price: 140, volatility: 0.035 },
];

// Initialize market
STOCK_COMPANIES.forEach(c => {
  state.market[c.id] = {
    companyId: c.id,
    name: c.name,
    price: c.price,
    change: 0,
    changePercent: 0,
    volume: Math.floor(Math.random() * 10000) + 1000,
    high: c.price,
    low: c.price,
    history: [c.price],
  };
});

function randomWalk(value, volatility, min = 1) {
  const change = value * volatility * (Math.random() * 2 - 1);
  return Math.max(min, +(value + change).toFixed(2));
}

function tickMarket() {
  const updates = [];
  for (const company of STOCK_COMPANIES) {
    const current = state.market[company.id];
    const newPrice = randomWalk(current.price, company.volatility);
    const change = +(newPrice - current.price).toFixed(2);
    const changePercent = +((change / current.price) * 100).toFixed(2);

    state.market[company.id] = {
      ...current,
      price: newPrice,
      change,
      changePercent,
      volume: Math.floor(Math.random() * 10000) + 1000,
      high: Math.max(current.high, newPrice),
      low: Math.min(current.low, newPrice),
      history: [...(current.history || []).slice(-50), newPrice],
    };
    updates.push(state.market[company.id]);
  }
  return updates;
}

function tickEconomy() {
  const e = state.economy;
  // Hafif dalgalanma
  const infShift = (Math.random() - 0.48) * 0.1;
  state.economy = {
    ...e,
    inflation: Math.max(0, Math.min(100, +(e.inflation + infShift).toFixed(2))),
    treasury: Math.max(0, e.treasury + Math.floor((Math.random() - 0.4) * 50000)),
    stability: Math.max(0, Math.min(100, e.stability + (Math.random() - 0.5) * 1)),
    lastUpdate: Date.now(),
  };
  return state.economy;
}

const RANDOM_EVENTS = [
  { title: '📈 Borsa Yükselişi', message: 'Yatırımcılar piyasaya güveniyor. Tüm hisseler yükseliyor!', effect: 'marketBull' },
  { title: '📉 Borsa Düşüşü', message: 'Küresel belirsizlik piyasalara yansıdı. Dikkatli olun!', effect: 'marketBear' },
  { title: '⛏️ Altın Bulgusu', message: 'Doğu vilayetinde büyük altın yatağı keşfedildi!', effect: 'goldRush' },
  { title: '🌾 Hasat Bolluğu', message: 'Bu yıl çiftçiler rekora ulaştı, tarım hisseleri değer kazandı!', effect: 'harvest' },
  { title: '🏭 Fabrika Açılışı', message: 'Yeni sanayi bölgesi açıldı, istihdam ve ekonomi canlanıyor.', effect: 'factory' },
  { title: '💰 Hazine Artışı', message: 'Vergi tahsilatı hedefi aştı, hazineye önemli katkı sağlandı.', effect: 'treasury' },
  { title: '⚡ Enerji Krizi', message: 'Enerji fiyatları tırmanıyor, ekonomi üzerinde baskı oluşuyor.', effect: 'energyCrisis' },
  { title: '🌊 Doğal Afet', message: 'Sel felaketi şehrin bazı bölgelerini etkiledi, hasar büyük.', effect: 'disaster' },
];

function getRandomEvent() {
  return RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
}

function startGameEngine(io) {
  _io = io;

  // Market her 30 saniyede güncelle
  setInterval(() => {
    if (!_io) return;
    state.tick++;
    const marketUpdates = tickMarket();
    _io.emit('marketSnapshot', marketUpdates);

    // Her 5 dakikada ekonomi güncelle
    if (state.tick % 10 === 0) {
      const econ = tickEconomy();
      _io.emit('economyUpdate', econ);
    }

    // Her 10 dakikada random event
    if (state.tick % 20 === 0 && Math.random() < 0.4) {
      const event = getRandomEvent();
      _io.emit('gameEvent', {
        id: Date.now(),
        type: event.effect,
        title: event.title,
        message: event.message,
        timestamp: Date.now(),
      });
      logger.debug(`Game event: ${event.title}`);
    }
  }, 30 * 1000);

  // İlk market snapshot'ı hemen gönder (yeni bağlanan için)
  setTimeout(() => {
    if (_io) {
      _io.emit('marketSnapshot', Object.values(state.market));
      _io.emit('economyUpdate', state.economy);
    }
  }, 3000);

  logger.success('Game Engine başlatıldı (market + ekonomi simülasyonu)');
}

function getMarketSnapshot() {
  return Object.values(state.market);
}

function getEconomyState() {
  return state.economy;
}

module.exports = { startGameEngine, getMarketSnapshot, getEconomyState };
