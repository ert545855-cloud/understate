// #25 Loan Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const loanSvc = require('../services/loanService');

router.get('/', authMiddleware, async (req, res) => {
  const loans = await loanSvc.getLoans(req.user.id);
  res.json({ success: true, loans });
});

router.post('/request', authMiddleware, async (req, res) => {
  const { amount } = req.body;
  if (!amount) return res.status(400).json({ success: false, message: 'amount gerekli' });
  const result = await loanSvc.requestLoan(req.user.id, amount);
  res.json({ success: result.ok, ...result });
});

router.post('/repay/:loanId', authMiddleware, async (req, res) => {
  const { amount } = req.body;
  if (!amount) return res.status(400).json({ success: false, message: 'amount gerekli' });
  const result = await loanSvc.repayLoan(req.user.id, parseInt(req.params.loanId), amount);
  res.json({ success: result.ok, ...result });
});

module.exports = router;
