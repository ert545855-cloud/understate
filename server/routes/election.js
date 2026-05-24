const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const sb = require('../services/supabaseService');
const logger = require('../utils/logger');

let _io = null;
function setIO(io) { _io = io; }

router.get('/', async (req, res) => {
  try {
    if (!sb.isReady()) return res.json({ success: false, data: [] });
    const admin = sb.getAdmin();
    const { data, error } = await admin
      .from('elections')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error('[Election] List error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!sb.isReady()) return res.json({ success: false });
    const admin = sb.getAdmin();
    const { data, error } = await admin
      .from('elections')
      .select('*, election_votes(*)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Seçim bulunamadı' });
    const results = {};
    (data.election_votes || []).forEach(v => {
      results[v.candidate_username] = (results[v.candidate_username] || 0) + 1;
    });
    res.json({ success: true, data: { ...data, results, totalVotes: data.election_votes?.length || 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/create', adminMiddleware, async (req, res) => {
  try {
    const { type, city = 'ulusal', candidates = [], durationHours = 24 } = req.body;
    if (!type) return res.status(400).json({ success: false, message: 'Seçim tipi gerekli' });
    if (!candidates.length) return res.status(400).json({ success: false, message: 'En az 1 aday gerekli' });
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });

    const admin = sb.getAdmin();
    const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin.from('elections').insert([{
      type,
      city,
      candidates,
      votes: {},
      status: 'active',
      started_by: req.user.id,
      ends_at: endsAt,
    }]).select().single();
    if (error) throw error;

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
    const { candidateId, candidateUsername } = req.body;
    if (!candidateUsername) return res.status(400).json({ success: false, message: 'Aday bilgisi gerekli' });
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });

    const admin = sb.getAdmin();

    const { data: election, error: elErr } = await admin
      .from('elections')
      .select('*')
      .eq('id', req.params.id)
      .eq('status', 'active')
      .single();
    if (elErr || !election) return res.status(404).json({ success: false, message: 'Aktif seçim bulunamadı' });
    if (new Date(election.ends_at) < new Date()) {
      await admin.from('elections').update({ status: 'ended' }).eq('id', req.params.id);
      return res.status(400).json({ success: false, message: 'Seçim süresi dolmuş' });
    }

    const { data: existing } = await admin
      .from('election_votes')
      .select('id')
      .eq('election_id', req.params.id)
      .eq('voter_id', req.user.id)
      .single();
    if (existing) return res.status(409).json({ success: false, message: 'Bu seçimde zaten oy kullandınız' });

    const { error: voteErr } = await admin.from('election_votes').insert([{
      election_id: req.params.id,
      voter_id: req.user.id,
      candidate_id: candidateId || null,
      candidate_username: candidateUsername,
    }]);
    if (voteErr) throw voteErr;

    const { count } = await admin
      .from('election_votes')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', req.params.id);

    if (_io) {
      _io.emit('electionUpdate', { electionId: req.params.id, totalVotes: count || 0, lastVoter: req.user.username });
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
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const admin = sb.getAdmin();
    const { data: votes } = await admin.from('election_votes').select('candidate_username').eq('election_id', req.params.id);
    const results = {};
    (votes || []).forEach(v => { results[v.candidate_username] = (results[v.candidate_username] || 0) + 1; });
    const winner = Object.entries(results).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    await admin.from('elections').update({ status: 'ended', votes: results }).eq('id', req.params.id);

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
