const logger = require('../utils/logger');
const db = require('./dbService');
const { processOverdueLoans } = require('./loanService');

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
  // Oyun entity önbellekleri (DB'den yüklenir)
  gangs: [],
  parties: [],
  alliances: [],
  elections: { phase: 'idle', candidates: [], votes: {} },
  elections_multi: {},
  laws: [],
  announcements: [],
  cabinet: {},
};

const STOCK_COMPANIES = [
  { id: 'UNDR', name: 'UnderCorp',        price: 100, volatility: 0.03  },
  { id: 'BLDG', name: 'İnşaat A.Ş.',      price: 250, volatility: 0.02  },
  { id: 'ENRJ', name: 'Enerji Ltd.',       price: 75,  volatility: 0.04  },
  { id: 'TECH', name: 'Teknoloji A.Ş.',    price: 500, volatility: 0.05  },
  { id: 'BANK', name: 'Devlet Bankası',    price: 180, volatility: 0.015 },
  { id: 'AGRI', name: 'Tarım Kooperatifi', price: 60,  volatility: 0.025 },
  { id: 'MED',  name: 'Sağlık Grubu',      price: 320, volatility: 0.02  },
  { id: 'AUTO', name: 'Otomotiv San.',     price: 140, volatility: 0.035 },
];

STOCK_COMPANIES.forEach(c => {
  state.market[c.id] = {
    companyId: c.id, name: c.name, price: c.price,
    change: 0, changePercent: 0,
    volume: Math.floor(Math.random() * 10000) + 1000,
    high: c.price, low: c.price, history: [c.price],
  };
});

function randomWalk(value, volatility, min = 1) {
  const change = value * volatility * (Math.random() * 2 - 1);
  return Math.max(min, +(value + change).toFixed(2));
}

// #14 Market manipulation detection
const _priceVelocity = {}; // companyId → { ticks above threshold }
const MANIP_THRESHOLD = 0.08; // >8% single-tick move is suspicious
const MANIP_TICKS     = 3;    // 3 consecutive anomalous ticks = flag

function tickMarket() {
  const updates = [];
  for (const company of STOCK_COMPANIES) {
    const current = state.market[company.id];
    const newPrice = randomWalk(current.price, company.volatility);
    const change = +(newPrice - current.price).toFixed(2);
    const changePercent = +((change / current.price) * 100).toFixed(2);

    // #14 — track suspicious consecutive moves
    const absPct = Math.abs(changePercent) / 100;
    if (absPct > MANIP_THRESHOLD) {
      _priceVelocity[company.id] = (_priceVelocity[company.id] || 0) + 1;
      if (_priceVelocity[company.id] >= MANIP_TICKS) {
        logger.warn(`[MarketManip] ${company.id} — ${MANIP_TICKS} ardışık anormal hareket (${changePercent}%)`);
        _priceVelocity[company.id] = 0; // reset after flagging
      }
    } else {
      _priceVelocity[company.id] = 0;
    }

    state.market[company.id] = {
      ...current, price: newPrice, change, changePercent,
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
  // #26 — Realistic inflation/deflation: drift toward 3% baseline
  const baseline  = 3.0;
  const drift     = (baseline - e.inflation) * 0.02; // mean-revert
  const shock     = (Math.random() - 0.48) * 0.15;
  const newInf    = Math.max(0, Math.min(100, +(e.inflation + drift + shock).toFixed(2)));

  // Interest rate follows inflation with lag
  const targetRate = Math.max(1, Math.min(25, +(newInf * 0.6 + 2).toFixed(2)));
  const newRate    = +(e.interestRate + (targetRate - e.interestRate) * 0.1).toFixed(2);

  // Treasury: taxRate-driven inflow minus random spending
  const taxInflow  = Math.floor(e.treasury * (e.taxRate / 100) * 0.001);
  const spending   = Math.floor((Math.random() * 30000) + 10000);
  const newTreasury = Math.max(0, e.treasury + taxInflow - spending);

  state.economy = {
    ...e,
    inflation:    newInf,
    interestRate: newRate,
    treasury:     newTreasury,
    stability:    Math.max(0, Math.min(100, +(e.stability + (Math.random() - 0.5) * 1).toFixed(2))),
    lastUpdate:   Date.now(),
  };
  return state.economy;
}

const RANDOM_EVENTS = [
  { title: '📈 Borsa Yükselişi',  message: 'Yatırımcılar piyasaya güveniyor. Tüm hisseler yükseliyor!', effect: 'marketBull'    },
  { title: '📉 Borsa Düşüşü',     message: 'Küresel belirsizlik piyasalara yansıdı. Dikkatli olun!',   effect: 'marketBear'    },
  { title: '⛏️ Altın Bulgusu',    message: 'Doğu vilayetinde büyük altın yatağı keşfedildi!',          effect: 'goldRush'      },
  { title: '🌾 Hasat Bolluğu',    message: 'Bu yıl çiftçiler rekora ulaştı, tarım hisseleri değer kazandı!', effect: 'harvest' },
  { title: '🏭 Fabrika Açılışı',  message: 'Yeni sanayi bölgesi açıldı, istihdam ve ekonomi canlanıyor.', effect: 'factory'   },
  { title: '💰 Hazine Artışı',    message: 'Vergi tahsilatı hedefi aştı, hazineye önemli katkı sağlandı.', effect: 'treasury' },
  { title: '⚡ Enerji Krizi',     message: 'Enerji fiyatları tırmanıyor, ekonomi üzerinde baskı oluşuyor.', effect: 'energyCrisis' },
  { title: '🌊 Doğal Afet',       message: 'Sel felaketi şehrin bazı bölgelerini etkiledi, hasar büyük.', effect: 'disaster'  },
];

function getRandomEvent() {
  return RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
}

// ── DB Persistence ────────────────────────────────────────────────────────────

async function loadEconomyFromDB() {
  try {
    if (!db.isReady()) return;
    const saved = await db.getGameState('economy');
    if (saved && saved.inflation !== undefined) {
      state.economy = { ...state.economy, ...saved };
      logger.info("[GameEngine] Ekonomi DB'den yüklendi");
    }
  } catch (err) { logger.warn('[GameEngine] Ekonomi yükleme hatası:', err.message); }
}

async function loadAllGameState() {
  try {
    if (!db.isReady()) return;
    const gs = await db.getFullGameState();
    if (Array.isArray(gs.gangs))         state.gangs         = gs.gangs;
    if (Array.isArray(gs.parties))       state.parties       = gs.parties;
    if (Array.isArray(gs.alliances))     state.alliances     = gs.alliances;
    if (gs.elections)                    state.elections     = gs.elections;
    if (gs.elections_multi)              state.elections_multi = gs.elections_multi;
    if (Array.isArray(gs.laws))          state.laws          = gs.laws;
    if (Array.isArray(gs.announcements)) state.announcements = gs.announcements;
    if (gs.cabinet)                      state.cabinet       = gs.cabinet;
    logger.info(`[GameEngine] Oyun durumu DB'den yüklendi — çete:${state.gangs.length} parti:${state.parties.length} ittifak:${state.alliances.length}`);
  } catch (err) { logger.warn('[GameEngine] Oyun durumu yükleme hatası:', err.message); }
}

async function saveEconomyToDB() {
  try {
    if (!db.isReady()) return;
    await db.setGameState('economy', state.economy);
  } catch (_) {}
}

async function saveGameEventToDB(event) {
  try {
    if (!db.isReady()) return;
    await db.query(
      'INSERT INTO game_events (event_type, title, message, effect, data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
      [event.type, event.title, event.message, event.type, JSON.stringify(event)]
    ).catch(() => {});
  } catch (_) {}
}

async function saveStockMarketToDB() {
  try {
    if (!db.isReady()) return;
    for (const s of Object.values(state.market)) {
      await db.query(
        `INSERT INTO stock_market (company_id, name, share_price, change, change_pct, volume, high, low, price_history, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (company_id) DO UPDATE SET
           name=EXCLUDED.name, share_price=EXCLUDED.share_price, change=EXCLUDED.change,
           change_pct=EXCLUDED.change_pct, volume=EXCLUDED.volume, high=EXCLUDED.high,
           low=EXCLUDED.low, price_history=EXCLUDED.price_history, updated_at=NOW()`,
        [s.companyId, s.name, Math.round(s.price), s.change, s.changePercent,
         s.volume, Math.round(s.high), Math.round(s.low),
         JSON.stringify((s.history || []).slice(-100))]
      ).catch(() => {});
    }
  } catch (_) {}
}

async function pushLeaderboard() {
  try {
    if (!_io || !db.isReady()) return;
    const data = await db.getLeaderboardData(20);
    if (data) _io.emit('leaderboardUpdate', data);
  } catch (_) {}
}

// ── Engine Start ──────────────────────────────────────────────────────────────

async function startGameEngine(io) {
  _io = io;

  await loadEconomyFromDB();
  await loadAllGameState();

  // Market + economy tick her 30 saniyede
  setInterval(async () => {
    if (!_io) return;
    state.tick++;

    const marketUpdates = tickMarket();
    _io.emit('marketSnapshot', marketUpdates);

    if (state.tick % 10 === 0) {
      const econ = tickEconomy();
      _io.emit('economyUpdate', econ);
      await saveEconomyToDB();
    }

    // Her 10 dakikada random event
    if (state.tick % 20 === 0 && Math.random() < 0.4) {
      const ev = getRandomEvent();
      const gameEvent = { id: Date.now(), type: ev.effect, title: ev.title, message: ev.message, timestamp: Date.now() };
      _io.emit('gameEvent', gameEvent);
      await saveGameEventToDB(gameEvent);
      // Tüm oyunculara bildirim
      _io.emit('notification', {
        id: `notif_event_${Date.now()}`,
        type: 'event',
        icon: ev.title.split(' ')[0],
        title: ev.title,
        msg: ev.message,
        ts: Date.now(),
      });
      logger.debug(`Game event: ${ev.title}`);
    }

    // Her 2 dakikada leaderboard push
    if (state.tick % 4 === 0) {
      pushLeaderboard();
    }

    // Her 5 dakikada oyun entity'lerini DB'den yenile (başka sunucu yokken bile)
    if (state.tick % 10 === 0) {
      await loadAllGameState();
    }

    // Her 5 dakikada borsa verilerini stock_market tablosuna kaydet
    if (state.tick % 10 === 0) {
      saveStockMarketToDB();
    }
  }, 30 * 1000);

  // İlk snapshot hemen gönder
  setTimeout(() => {
    if (_io) {
      _io.emit('marketSnapshot', Object.values(state.market));
      _io.emit('economyUpdate', state.economy);
    }
  }, 3000);

  // Günlük vadesi dolmuş kredi kontrolü
  processOverdueLoans().catch(() => {});
  setInterval(() => processOverdueLoans().catch(() => {}), 24 * 60 * 60 * 1000);

  logger.success('Game Engine başlatıldı (market + ekonomi + persistence + full entity sync) ✓');
}

function getMarketSnapshot() { return Object.values(state.market); }
function getEconomyState()   { return state.economy; }
function getGameEntities()   {
  return {
    gangs: state.gangs,
    parties: state.parties,
    alliances: state.alliances,
    elections: state.elections,
    elections_multi: state.elections_multi,
    laws: state.laws,
    announcements: state.announcements,
    cabinet: state.cabinet,
  };
}

module.exports = { startGameEngine, getMarketSnapshot, getEconomyState, getGameEntities };
