const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const db = require('../services/dbService');
const logger = require('../utils/logger');

let _io = null;
function setIO(io) { _io = io; }

router.get('/', async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false, data: [] });
    const { rows } = await db.query(
      "SELECT * FROM elections WHERE status = 'active' ORDER BY created_at DESC"
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('[Election] List error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false });
    const { rows: elRows } = await db.query('SELECT * FROM elections WHERE id = $1', [req.params.id]);
    if (!elRows[0]) return res.status(404).json({ success: false, message: 'Seçim bulunamadı' });
    const election = elRows[0];
    const { rows: votes } = await db.query('SELECT * FROM election_votes WHERE election_id = $1', [req.params.id]);
    const results = {};
    votes.forEach(v => { results[v.candidate_username] = (results[v.candidate_username] || 0) + 1; });
    res.json({ success: true, data: { ...election, election_votes: votes, results, totalVotes: votes.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/create', adminMiddleware, async (req, res) => {
  try {
    const { type, city = 'ulusal', candidates = [], durationHours = 24 } = req.body;
    if (!type) return res.status(400).json({ success: false, message: 'Seçim tipi gerekli' });
    if (!candidates.length) return res.status(400).json({ success: false, message: 'En az 1 aday gerekli' });
    if (!db.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });

    const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    const { rows } = await db.query(
      'INSERT INTO elections (type, city, candidates, status, ends_at, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [type, city, JSON.stringify(candidates), 'active', endsAt, req.user.username]
    );
    const data = rows[0];

    if (_io) {
      _io.emit('gameEvent', {
        id: Date.now(),
        type: 'election_started',
        title: `🗳️ ${type.toUpperCase()} Seçimi Başladı`,
        message: `${city} için yeni bir seçim açıldı! Oy kullanın.`,
        electionId: data.id,
        timestamp: Date.now(),
      });
    }
    logger.info(`[Election] Oluşturuldu: ${type} @ ${city} by ${req.user.username}`);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[Election] Create error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/vote', authMiddleware, authLimiter, async (req, res) => {
  try {
    const { candidateUsername } = req.body;
    if (!candidateUsername) return res.status(400).json({ success: false, message: 'Aday bilgisi gerekli' });
    if (!db.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });

    const { rows: elRows } = await db.query(
      "SELECT * FROM elections WHERE id = $1 AND status = 'active' LIMIT 1",
      [req.params.id]
    );
    if (!elRows[0]) return res.status(404).json({ success: false, message: 'Aktif seçim bulunamadı' });
    const election = elRows[0];

    if (new Date(election.ends_at) < new Date()) {
      await db.query("UPDATE elections SET status = 'ended' WHERE id = $1", [req.params.id]);
      return res.status(400).json({ success: false, message: 'Seçim süresi dolmuş' });
    }

    const { rows: existing } = await db.query(
      'SELECT id FROM election_votes WHERE election_id = $1 AND voter_id = $2 LIMIT 1',
      [req.params.id, req.user.id]
    );
    if (existing[0]) return res.status(409).json({ success: false, message: 'Bu seçimde zaten oy kullandınız' });

    await db.query(
      'INSERT INTO election_votes (election_id, voter_id, voter_username, candidate_username) VALUES ($1,$2,$3,$4)',
      [req.params.id, req.user.id, req.user.username, candidateUsername]
    );

    const { rows: countRows } = await db.query(
      'SELECT COUNT(*) AS count FROM election_votes WHERE election_id = $1',
      [req.params.id]
    );
    const totalVotes = Number(countRows[0]?.count || 0);

    if (_io) {
      _io.emit('electionUpdate', { electionId: req.params.id, totalVotes, lastVoter: req.user.username });
    }
    logger.info(`[Election] Oy: ${req.user.username} → ${candidateUsername}`);
    res.json({ success: true, message: 'Oyunuz kaydedildi' });
  } catch (err) {
    logger.error('[Election] Vote error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/end', adminMiddleware, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { rows: votes } = await db.query(
      'SELECT candidate_username FROM election_votes WHERE election_id = $1',
      [req.params.id]
    );
    const results = {};
    votes.forEach(v => { results[v.candidate_username] = (results[v.candidate_username] || 0) + 1; });
    const winner = Object.entries(results).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    await db.query(
      "UPDATE elections SET status = 'ended', candidates = $1 WHERE id = $2",
      [JSON.stringify({ ...results, _winner: winner }), req.params.id]
    );

    if (_io) {
      _io.emit('gameEvent', {
        id: Date.now(),
        type: 'election_ended',
        title: '🏆 Seçim Sonuçlandı',
        message: winner ? `Kazanan: ${winner} (${results[winner]} oy)` : 'Sonuç eşit',
        results,
        winner,
        electionId: req.params.id,
        timestamp: Date.now(),
      });
    }
    res.json({ success: true, results, winner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { router, setIO };
