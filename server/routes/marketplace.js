// #24 Marketplace Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const mktSvc = require('../services/marketplaceService');

router.get('/', async (req, res) => {
  const { page, limit, itemType, search, sortBy } = req.query;
  const result = await mktSvc.getListings({ page: parseInt(page) || 1, limit: parseInt(limit) || 20, itemType, search, sortBy });
  res.json({ success: true, ...result });
});

router.post('/list', authMiddleware, async (req, res) => {
  const result = await mktSvc.createListing(req.user.id, req.body);
  res.json({ success: result.ok, ...result });
});

router.post('/buy/:listingId', authMiddleware, async (req, res) => {
  const result = await mktSvc.buyListing(req.user.id, parseInt(req.params.listingId));
  res.json({ success: result.ok, ...result });
});

router.delete('/:listingId', authMiddleware, async (req, res) => {
  const result = await mktSvc.cancelListing(req.user.id, parseInt(req.params.listingId));
  res.json({ success: result.ok });
});

module.exports = router;
