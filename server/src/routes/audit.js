const express = require('express');
const router = express.Router();
const { db } = require('../storage/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/audit (List immutable audit records)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { entityType, action, search } = req.query;
    let logs = await db.auditLogs.find();

    if (entityType && entityType !== 'all') {
      logs = logs.filter(l => l.entityType.toLowerCase() === entityType.toLowerCase());
    }
    if (action && action !== 'all') {
      logs = logs.filter(l => l.action.toLowerCase() === action.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(l => 
        l.details.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        l.entityId.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
