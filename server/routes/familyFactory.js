/**
 * Family Factory Routes — /api/family-factory
 *
 * Aile fabrikalarında gelir toplama sunucu tarafında doğrulanır:
 * - Toplama aralığı (24 saat) DB'deki last_collected_at ile kontrol edilir.
 * - Gelir miktarı sabit fabrika tipine göre sunucuda hesaplanır.
 * - İstemciden gelen miktar hiçbir zaman doğrudan kabul edilmez.
 */
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { generalLimiter }  = require('../middleware/rateLimiter');
const db     = require('../services/dbService');
const logger = require('../utils/logger');

// 24 saatte bir toplama hakkı
const COLLECT_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Fabrika tipi → sunucu tarafında tutulan aylık gelir ve minimum influence
const FAMILY_FACTORY_TYPES = {
  sarap:    { label: 'Aile Şarap İmalathanesi',  icon: '🍷', cost: 2500000,  monthlyIncome: 220000,  minInfluence: 0  },
  tekstil:  { label: 'Aile Tekstil Atölyesi',    icon: '🧵', cost: 3500000,  monthlyIncome: 320000,  minInfluence: 0  },
  rafine:   { label: 'Aile Rafinerisi',           icon: '🛢️', cost: 7000000,  monthlyIncome: 600000,  minInfluence: 0  },
  insaat:   { label: 'Aile İnşaat Şirketi',       icon: '🏗️', cost: 12000000, monthlyIncome: 950000,  minInfluence: 0  },
  mucevher: { label: 'Aile Mücevher Atölyesi',   icon: '💎', cost: 20000000, monthlyIncome: 1600000, minInfluence: 50 },
};

// GET /api/family-factory?familyId=xxx
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { familyId } = req.query;
    if (!familyId) return res.status(400).json({ success: false, msg: 'familyId zorunlu' });
    const { rows } = await db.query(
      'SELECT * FROM family_factories WHERE family_id = $1 ORDER BY created_at ASC',
      [familyId]
    );
    const factories = rows.map(r => ({
      id:               r.id,
      familyId:         r.family_id,
      factoryType:      r.factory_type,
      name:             r.name,
      monthlyIncome:    Number(r.monthly_income),
      lastCollectedAt:  Number(r.last_collected_at),
      createdBy:        r.created_by,
      createdAt:        new Date(r.created_at).getTime(),
      // Sunucu hesaplı: şu an toplanabilir mi?
      canCollect:       Number(r.last_collected_at) === 0 ||
                        Date.now() - Number(r.last_collected_at) >= COLLECT_INTERVAL_MS,
      nextCollectAt:    Number(r.last_collected_at) + COLLECT_INTERVAL_MS,
      dailyIncome:      Math.floor(Number(r.monthly_income) / 30),
    }));
    res.json({ success: true, factories });
  } catch (err) {
    logger.error('[FamilyFactory] GET:', err.message);
    res.status(500).json({ success: false });
  }
});

// POST /api/family-factory/buy
// Fabrika kaydı DB'de oluşturulur; treasury güncellemesi istemcide (localStorage)
// yapılır — bu sınırlama tüm aile sistemi localStorage tabanlı olduğu için kabul edilir.
router.post('/buy', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const { familyId, factoryType, name, familyInfluence } = req.body;
    if (!familyId || !factoryType || !name)
      return res.status(400).json({ success: false, msg: 'familyId, factoryType ve name zorunlu' });

    const def = FAMILY_FACTORY_TYPES[factoryType];
    if (!def) return res.status(400).json({ success: false, msg: 'Geçersiz fabrika türü' });

    // Minimum influence kontrolü (mücevher atölyesi için)
    const influence = Number(familyInfluence) || 0;
    if (influence < def.minInfluence)
      return res.status(400).json({
        success: false,
        msg: `Bu fabrika için en az ${def.minInfluence} aile etkisi gerekli (mevcut: ${influence})`,
      });

    const id = `ff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.query(
      `INSERT INTO family_factories
         (id, family_id, factory_type, name, monthly_income, last_collected_at, created_by)
       VALUES ($1,$2,$3,$4,$5,0,$6)`,
      [id, familyId, factoryType, name, def.monthlyIncome, req.user.username]
    );

    logger.info(`[FamilyFactory] Satın alındı: ${name} (${factoryType}) — aile=${familyId} kullanıcı=${req.user.username}`);
    res.json({
      success:  true,
      factory:  { id, familyId, factoryType, name, monthlyIncome: def.monthlyIncome, lastCollectedAt: 0 },
      cost:     def.cost,
      icon:     def.icon,
    });
  } catch (err) {
    logger.error('[FamilyFactory] POST /buy:', err.message);
    res.status(500).json({ success: false });
  }
});

// POST /api/family-factory/collect
// Gelir miktarı ve timing TAMAMEN sunucu tarafında hesaplanır (anti-cheat).
router.post('/collect', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const { factoryId, familyId } = req.body;
    if (!factoryId || !familyId)
      return res.status(400).json({ success: false, msg: 'factoryId ve familyId zorunlu' });

    const { rows } = await db.query(
      'SELECT * FROM family_factories WHERE id = $1 AND family_id = $2',
      [factoryId, familyId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, msg: 'Fabrika bulunamadı' });

    const factory   = rows[0];
    const now       = Date.now();
    const lastColl  = Number(factory.last_collected_at) || 0;
    const elapsed   = now - lastColl;

    if (lastColl > 0 && elapsed < COLLECT_INTERVAL_MS) {
      const rem = COLLECT_INTERVAL_MS - elapsed;
      const h   = Math.floor(rem / 3600000);
      const m   = Math.floor((rem % 3600000) / 60000);
      return res.status(400).json({
        success: false,
        msg: `⏳ ${h}sa ${m}dk sonra toplanabilir`,
        nextCollectAt: lastColl + COLLECT_INTERVAL_MS,
      });
    }

    // Günlük gelir = aylık / 30
    const dailyIncome = Math.floor(Number(factory.monthly_income) / 30);

    await db.query(
      'UPDATE family_factories SET last_collected_at = $1, updated_at = now() WHERE id = $2',
      [now, factoryId]
    );

    logger.info(`[FamilyFactory] Gelir toplandı: ${dailyIncome} — fabrika=${factoryId} kullanıcı=${req.user.username}`);
    res.json({
      success:    true,
      earned:     dailyIncome,
      factoryId,
      familyId,
      nextCollectAt: now + COLLECT_INTERVAL_MS,
    });
  } catch (err) {
    logger.error('[FamilyFactory] POST /collect:', err.message);
    res.status(500).json({ success: false });
  }
});

// DELETE /api/family-factory/:id  (sadece fabrika sahibi aile kaydı siler)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM family_factories WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    logger.error('[FamilyFactory] DELETE:', err.message);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
