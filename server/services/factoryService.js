/**
 * Factory Service — Fabrika & Kariyer Çalışma Sistemi
 * Tüm veri PostgreSQL'de, localStorage yok.
 */
const db = require('./dbService');
const logger = require('../utils/logger');

const FACTORY_JOB_ROLES = {
  textile:     [
    { id:'tekstil_isci',   name:'Tekstil İşçisi',       icon:'🧵', salary:15000,  duration:4*3600000,  level:1  },
    { id:'tekstil_usta',   name:'Usta Terzi',            icon:'✂️', salary:32000,  duration:8*3600000,  level:5  },
  ],
  food:        [
    { id:'gida_isci',      name:'Gıda İşçisi',          icon:'🍞', salary:18000,  duration:3*3600000,  level:1  },
    { id:'gida_sef',       name:'Üretim Şefi',           icon:'👨‍🍳',salary:42000,  duration:8*3600000,  level:8  },
  ],
  steel:       [
    { id:'celik_kaynak',   name:'Kaynakçı',              icon:'🔥', salary:26000,  duration:4*3600000,  level:1  },
    { id:'celik_muhendis', name:'Çelik Mühendisi',       icon:'⚙️', salary:58000,  duration:8*3600000,  level:12 },
  ],
  electronics: [
    { id:'elekt_tekn',     name:'Elektronik Teknisyeni', icon:'🔧', salary:36000,  duration:4*3600000,  level:5  },
    { id:'elekt_usta',     name:'Elektronik Ustası',     icon:'💻', salary:75000,  duration:8*3600000,  level:15 },
  ],
  auto:        [
    { id:'oto_montaj',     name:'Montaj İşçisi',         icon:'🚗', salary:48000,  duration:6*3600000,  level:5  },
    { id:'oto_usta',       name:'Oto Ustası',             icon:'🏆', salary:95000,  duration:12*3600000, level:20 },
  ],
};

// ── FACTORY CRUD ──────────────────────────────────────────────────────────────

async function getFactories() {
  try {
    const { rows } = await db.query('SELECT * FROM factories ORDER BY created_at ASC');
    return rows.map(rowToFactory);
  } catch (err) {
    logger.warn('[Factory] getFactories:', err.message);
    return [];
  }
}

async function getFactory(id) {
  try {
    const { rows } = await db.query('SELECT * FROM factories WHERE id = $1', [id]);
    return rows[0] ? rowToFactory(rows[0]) : null;
  } catch (err) {
    logger.warn('[Factory] getFactory:', err.message);
    return null;
  }
}

async function createFactory({ id, name, ownerUsername, type, level, data }) {
  try {
    // Bir kullanıcının yalnızca 1 fabrikası olabilir
    const { rows: existing } = await db.query(
      'SELECT id FROM factories WHERE owner_username = $1', [ownerUsername]
    );
    if (existing.length > 0) return { ok: false, msg: 'Zaten bir fabrikan var' };

    const fid = id || `factory_${Date.now()}`;
    await db.query(
      `INSERT INTO factories (id, name, owner_username, type, level, data, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
      [fid, name, ownerUsername, type || 'textile', level || 1, JSON.stringify(data || {})]
    );
    return { ok: true, factory: await getFactory(fid) };
  } catch (err) {
    logger.warn('[Factory] createFactory:', err.message);
    return { ok: false, msg: 'Sunucu hatası' };
  }
}

async function upsertFactory(factory) {
  try {
    const { id, name, owner, ownerUsername, type, level, data } = factory;
    const owner_u = ownerUsername || owner;
    await db.query(
      `INSERT INTO factories (id, name, owner_username, type, level, data, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, owner_username=EXCLUDED.owner_username,
         type=EXCLUDED.type, level=EXCLUDED.level,
         data=EXCLUDED.data, updated_at=NOW()`,
      [id, name, owner_u, type || 'textile', level || 1, JSON.stringify(data || {})]
    );
    return true;
  } catch (err) {
    logger.warn('[Factory] upsertFactory:', err.message);
    return false;
  }
}

async function deleteFactory(id, ownerUsername) {
  try {
    await db.query(
      'DELETE FROM factories WHERE id = $1 AND owner_username = $2', [id, ownerUsername]
    );
    return true;
  } catch (err) {
    logger.warn('[Factory] deleteFactory:', err.message);
    return false;
  }
}

// ── WORK SESSIONS ─────────────────────────────────────────────────────────────

async function getActiveSession(userId) {
  try {
    const { rows } = await db.query(
      'SELECT * FROM factory_sessions WHERE user_id = $1 AND collected = FALSE ORDER BY id DESC LIMIT 1',
      [userId]
    );
    return rows[0] ? rowToSession(rows[0]) : null;
  } catch (err) {
    logger.warn('[Factory] getActiveSession:', err.message);
    return null;
  }
}

async function startWork({ userId, username, factoryId, roleKey, playerLevel }) {
  try {
    // Zaten aktif çalışma var mı?
    const existing = await getActiveSession(userId);
    if (existing) return { ok: false, msg: 'Zaten aktif bir çalışman var! Önce tamamla.' };

    const factory = await getFactory(factoryId);
    if (!factory) return { ok: false, msg: 'Fabrika bulunamadı' };
    if (factory.ownerUsername === username) return { ok: false, msg: 'Kendi fabrikanda çalışamazsın' };

    const roles = FACTORY_JOB_ROLES[factory.type] || [];
    const role = roles.find(r => r.id === roleKey);
    if (!role) return { ok: false, msg: 'Geçersiz iş rolü' };
    if ((playerLevel || 1) < role.level) return { ok: false, msg: `Bu iş için Seviye ${role.level} gerekli!` };

    const now = Date.now();
    const { rows } = await db.query(
      `INSERT INTO factory_sessions
         (user_id, username, factory_id, factory_name, role_key, salary, duration_ms, started_at, ends_at, collected)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE)
       RETURNING *`,
      [userId, username, factoryId, factory.name, roleKey,
       role.salary, role.duration, now, now + role.duration]
    );
    return { ok: true, session: rowToSession(rows[0]), role, factory };
  } catch (err) {
    logger.warn('[Factory] startWork:', err.message);
    return { ok: false, msg: 'Sunucu hatası' };
  }
}

async function collectSalary({ userId, tradePoints }) {
  try {
    const session = await getActiveSession(userId);
    if (!session) return { ok: false, msg: 'Aktif çalışma bulunamadı' };
    if (Date.now() < session.endsAt) {
      const remaining = session.endsAt - Date.now();
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      return { ok: false, msg: `⏳ Daha ${h > 0 ? h+'sa ' : ''}${m}dk ${s}s kaldı!` };
    }

    const bonus = 1 + (tradePoints || 0) * 0.0001;
    const earned = Math.round(session.salary * bonus);
    const xpGain = Math.max(10, Math.floor(earned / 3000));

    await db.query(
      'UPDATE factory_sessions SET collected = TRUE WHERE id = $1', [session.id]
    );
    return { ok: true, earned, xpGain, session };
  } catch (err) {
    logger.warn('[Factory] collectSalary:', err.message);
    return { ok: false, msg: 'Sunucu hatası' };
  }
}

async function cancelWork(userId) {
  try {
    await db.query(
      'UPDATE factory_sessions SET collected = TRUE WHERE user_id = $1 AND collected = FALSE',
      [userId]
    );
    return { ok: true };
  } catch (err) {
    logger.warn('[Factory] cancelWork:', err.message);
    return { ok: false, msg: 'Sunucu hatası' };
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function rowToFactory(r) {
  return {
    id: r.id,
    name: r.name,
    ownerUsername: r.owner_username,
    owner: r.owner_username,
    type: r.type,
    level: r.level,
    icon: (r.data || {}).icon || null,
    data: r.data || {},
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

function rowToSession(r) {
  return {
    id: r.id,
    userId: r.user_id,
    username: r.username,
    factoryId: r.factory_id,
    factoryName: r.factory_name,
    roleKey: r.role_key,
    salary: Number(r.salary),
    durationMs: Number(r.duration_ms),
    startedAt: Number(r.started_at),
    endsAt: Number(r.ends_at),
    collected: r.collected,
  };
}

module.exports = {
  FACTORY_JOB_ROLES,
  getFactories, getFactory, createFactory, upsertFactory, deleteFactory,
  getActiveSession, startWork, collectSalary, cancelWork,
};
