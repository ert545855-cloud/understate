/**
 * Tender Routes — /api/tender
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { generalLimiter } = require('../middleware/rateLimiter');
const tender = require('../services/tenderService');
const logger = require('../utils/logger');

function getIo(req) {
  return req.app.get('io');
}

function broadcast(req, tenders) {
  try { getIo(req)?.emit('tender:sync', { tenders }); } catch(_) {}
}

// GET /api/tender — tüm ihaleler
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [tenders, pool] = await Promise.all([tender.getTenders(), tender.getSystemPool()]);
    res.json({ success: true, tenders, pool });
  } catch (err) {
    logger.error('[Tender] GET /:', err.message);
    res.status(500).json({ success: false });
  }
});

// POST /api/tender/relay — Devlet Başkanı ihale duyurur
router.post('/relay', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'admin' && user.position !== 'Devlet Başkanı') {
      return res.status(403).json({ success: false, msg: 'Sadece Devlet Başkanı ihale duyurabilir' });
    }
    const { poolItem, durationHours } = req.body;
    if (!poolItem?.id || !poolItem?.title) {
      return res.status(400).json({ success: false, msg: 'Geçersiz ihale' });
    }
    const result = await tender.relayTender({ poolItem, relayedBy: user.username, durationHours });
    if (!result) return res.status(500).json({ success: false, msg: 'İhale duyurulamadı' });
    const [tenders, pool] = await Promise.all([tender.getTenders(), tender.getSystemPool()]);
    broadcast(req, tenders);
    res.json({ success: true, tender: result, tenders, pool });
  } catch (err) {
    logger.error('[Tender] POST /relay:', err.message);
    res.status(500).json({ success: false });
  }
});

// POST /api/tender/:id/bid — teklif ver
router.post('/:id/bid', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const { amount, familyName } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, msg: 'Geçerli bir teklif miktarı girin' });
    }
    const result = await tender.placeBid({
      tenderId: req.params.id,
      bidderUsername: req.user.username,
      familyName,
      amount: parseInt(amount),
    });
    if (!result.ok) return res.status(400).json({ success: false, msg: result.msg });
    const tenders = await tender.getTenders();
    broadcast(req, tenders);
    res.json({ success: true, tender: result.tender, tenders });
  } catch (err) {
    logger.error('[Tender] POST /:id/bid:', err.message);
    res.status(500).json({ success: false });
  }
});

// POST /api/tender/:id/control — proje kontrolü
router.post('/:id/control', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const result = await tender.doControl({ tenderId: req.params.id, username: req.user.username });
    if (!result.ok) return res.status(400).json({ success: false, msg: result.msg });
    const tenders = await tender.getTenders();
    broadcast(req, tenders);
    res.json({ success: true, tender: result.tender, tenders });
  } catch (err) {
    logger.error('[Tender] POST /:id/control:', err.message);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
