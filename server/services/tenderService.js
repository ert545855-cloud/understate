/**
 * Tender Service — Devlet İhale Sistemi
 * Tüm ihale verisi PostgreSQL'de, localStorage yok.
 */
const db = require('./dbService');
const logger = require('../utils/logger');

const SYSTEM_POOL = [
  { id:'sys_1', title:'Karayolu Altyapı Projesi',     description:'300 km\'lik çift yönlü otoyol yapımı.',           startBid:5000000,  category:'Altyapı'   },
  { id:'sys_2', title:'Devlet Hastanesi İnşaatı',     description:'500 yataklı tam teşekküllü devlet hastanesi.',    startBid:8000000,  category:'Sağlık'    },
  { id:'sys_3', title:'Liman Genişletme İhalesi',     description:'Ana limanın kapasitesi 3 katına çıkarılacak.',    startBid:12000000, category:'Lojistik'  },
  { id:'sys_4', title:'Yenilenebilir Enerji Santrali',description:'Güneş ve rüzgar enerjisi karma santrali kurulumu.',startBid:20000000, category:'Enerji'    },
  { id:'sys_5', title:'Şehir Metro Hattı',            description:'Yeni metro hattı yapım ve 10 yıllık işletme.',    startBid:35000000, category:'Ulaşım'    },
  { id:'sys_6', title:'Tarımsal Sulama Projesi',      description:'5.000 dönümlük arazi için modern sulama.',        startBid:3000000,  category:'Tarım'     },
  { id:'sys_7', title:'Okul Yenileme Projesi',        description:'50 devlet okulunun yenilenmesi ve modernizasyonu.',startBid:7000000, category:'Eğitim'    },
  { id:'sys_8', title:'Köprü ve Viyadük Onarımı',    description:'Şehir içi 12 köprünün kapsamlı onarımı.',         startBid:4500000,  category:'Altyapı'   },
  { id:'sys_9', title:'Atık Su Arıtma Tesisi',        description:'Büyükşehir için modern atık su arıtma tesisi.',   startBid:9000000,  category:'Çevre'     },
  { id:'sys_10',title:'Akıllı Şehir Sistemi',         description:'Trafik, güvenlik ve kamu hizmetlerinin dijital entegrasyonu.', startBid:15000000, category:'Teknoloji' },
];

async function getTenders() {
  try {
    const { rows } = await db.query(
      'SELECT * FROM tenders ORDER BY created_at DESC'
    );
    return rows.map(rowToTender);
  } catch (err) {
    logger.warn('[Tender] getTenders:', err.message);
    return [];
  }
}

async function getTender(id) {
  try {
    const { rows } = await db.query('SELECT * FROM tenders WHERE id = $1', [id]);
    return rows[0] ? rowToTender(rows[0]) : null;
  } catch (err) {
    logger.warn('[Tender] getTender:', err.message);
    return null;
  }
}

async function getSystemPool() {
  try {
    const { rows } = await db.query("SELECT id FROM tenders WHERE id LIKE 'sys\\_%'");
    const relayedIds = new Set(rows.map(r => {
      const m = r.id.match(/^(sys_\d+)_/);
      return m ? m[1] : r.id;
    }));
    return SYSTEM_POOL.filter(p => !relayedIds.has(p.id));
  } catch (err) {
    logger.warn('[Tender] getSystemPool:', err.message);
    return SYSTEM_POOL;
  }
}

async function relayTender({ poolItem, relayedBy, durationHours }) {
  try {
    const hours = Math.max(24, Math.min(168, parseInt(durationHours) || 72));
    const now = Date.now();
    const id = `${poolItem.id}_${now}`;
    await db.query(
      `INSERT INTO tenders (id, title, description, category, start_bid, current_bid, current_bidder,
        status, ends_at, relayed_by, bids, data, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,'[]','{}',NOW(),NOW())`,
      [id, poolItem.title, poolItem.description || '', poolItem.category || '',
       poolItem.startBid || 0, null, 'open', now + hours * 3600000, relayedBy || null]
    );
    return await getTender(id);
  } catch (err) {
    logger.warn('[Tender] relayTender:', err.message);
    return null;
  }
}

async function placeBid({ tenderId, bidderUsername, familyName, amount }) {
  try {
    const tender = await getTender(tenderId);
    if (!tender) return { ok: false, msg: 'İhale bulunamadı' };
    if (tender.status !== 'open') return { ok: false, msg: 'İhale açık değil' };
    if (tender.endsAt < Date.now()) return { ok: false, msg: 'İhale süresi doldu' };
    if (amount <= tender.currentBid) return { ok: false, msg: `Mevcut tekliften (₺${tender.currentBid.toLocaleString('tr-TR')}) yüksek teklif verin` };

    const newBid = { bidder: bidderUsername, amount, familyName: familyName || bidderUsername, timestamp: Date.now() };
    const bids = [newBid, ...(tender.bids || [])].slice(0, 20);

    await db.query(
      `UPDATE tenders SET current_bid=$1, current_bidder=$2, bids=$3, updated_at=NOW() WHERE id=$4`,
      [amount, bidderUsername, JSON.stringify(bids), tenderId]
    );
    return { ok: true, tender: await getTender(tenderId) };
  } catch (err) {
    logger.warn('[Tender] placeBid:', err.message);
    return { ok: false, msg: 'Sunucu hatası' };
  }
}

async function doControl({ tenderId, username }) {
  try {
    const tender = await getTender(tenderId);
    if (!tender) return { ok: false, msg: 'İhale bulunamadı' };
    if (tender.currentBidder !== username) return { ok: false, msg: 'Bu ihaleyi sen kazanmadın' };

    const now = Date.now();
    const lastControl = tender.data?.lastControl || null;
    const controlInterval = (tender.data?.controlInterval || 8) * 3600000;

    if (lastControl && now - lastControl < controlInterval) {
      const remaining = controlInterval - (now - lastControl);
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      return { ok: false, msg: `Sonraki kontrol için ${h}s ${m}dk bekle` };
    }

    const newData = { ...(tender.data || {}), lastControl: now, controlInterval: 8 };
    await db.query(
      `UPDATE tenders SET status='active', data=$1, updated_at=NOW() WHERE id=$2`,
      [JSON.stringify(newData), tenderId]
    );
    return { ok: true, tender: await getTender(tenderId) };
  } catch (err) {
    logger.warn('[Tender] doControl:', err.message);
    return { ok: false, msg: 'Sunucu hatası' };
  }
}

// Süresi dolan ihaleleri kapat (her 5 dakikada çağrılır)
async function closeExpiredTenders() {
  try {
    const now = Date.now();
    const { rows } = await db.query(
      `UPDATE tenders SET status='closed', updated_at=NOW()
       WHERE status='open' AND ends_at < $1
       RETURNING id, title, current_bidder`,
      [now]
    );
    return rows;
  } catch (err) {
    logger.warn('[Tender] closeExpiredTenders:', err.message);
    return [];
  }
}

function rowToTender(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    startBid: Number(r.start_bid) || 0,
    currentBid: Number(r.current_bid) || 0,
    currentBidder: r.current_bidder,
    status: r.status,
    endsAt: Number(r.ends_at),
    relayedBy: r.relayed_by,
    bids: Array.isArray(r.bids) ? r.bids : [],
    data: r.data || {},
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

module.exports = { getTenders, getTender, getSystemPool, relayTender, placeBid, doControl, closeExpiredTenders, SYSTEM_POOL };
