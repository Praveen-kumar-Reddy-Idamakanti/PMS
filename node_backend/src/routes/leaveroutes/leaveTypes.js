// routes/leaveTypes.js
const express = require('express');
const LeaveType = require('../../models/leaves/LeaveType');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const types = await LeaveType.getAll();
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const created = await LeaveType.create(req.body);
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
