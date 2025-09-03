// routes/leaveBalances.js
const express = require('express');
const LeaveBalance = require('../../models/leaves/leaveBalance');
const router = express.Router();

// GET /api/leave-balances/:user_id
router.get('/:user_id', async (req, res) => {
  try {
    const rows = await LeaveBalance.getByUser(req.params.user_id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
