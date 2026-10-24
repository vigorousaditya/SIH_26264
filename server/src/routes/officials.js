const express = require('express');
const router = express.Router();
const { db } = require('../storage/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAuditAction } = require('../services/auditService');

// GET /api/officials (List with live workload metrics)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { department, availability } = req.query;
    db.recalculateWorkloads();
    let officials = await db.officials.find();

    if (department && department !== 'all') {
      officials = officials.filter(o => o.department.toLowerCase() === department.toLowerCase());
    }
    if (availability && availability !== 'all') {
      officials = officials.filter(o => o.availabilityStatus.toLowerCase() === availability.toLowerCase());
    }

    // Add workload percentage to response
    const enriched = officials.map(off => {
      const activeCount = off.activeCasesCount || 0;
      const maxLimit = off.maxActiveCases || 10;
      const percentage = Math.round((activeCount / maxLimit) * 100);
      return {
        ...off,
        workloadPercentage: percentage,
        isAtLimit: activeCount >= maxLimit,
        isNearLimit: activeCount >= maxLimit - 1 && activeCount < maxLimit
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/officials/:id (Official detail with assigned active cases)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    db.recalculateWorkloads();
    const official = await db.officials.findOne({ id: req.params.id });
    if (!official) {
      return res.status(404).json({ success: false, message: 'Official not found.' });
    }

    const assignedCases = await db.cases.find({ assignedOfficialId: official.id });
    const activeCases = assignedCases.filter(c => c.status !== 'Disposed');
    const disposedCases = assignedCases.filter(c => c.status === 'Disposed');

    res.json({
      success: true,
      official: {
        ...official,
        workloadPercentage: Math.round(((official.activeCasesCount || 0) / (official.maxActiveCases || 10)) * 100)
      },
      activeCases,
      disposedCases,
      totalAssignedCount: assignedCases.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/officials/:id/limit (Configure workload capacity limit - Admin / Senior Officer)
router.put('/:id/limit', authenticateToken, requireRole(['admin', 'senior_officer']), async (req, res) => {
  try {
    const { maxActiveCases } = req.body;
    const limitNum = parseInt(maxActiveCases, 10);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({ success: false, message: 'Max active cases must be a valid number between 1 and 50.' });
    }

    const official = await db.officials.findOne({ id: req.params.id });
    if (!official) {
      return res.status(404).json({ success: false, message: 'Official not found.' });
    }

    const prevLimit = official.maxActiveCases;
    await db.officials.updateOne({ id: req.params.id }, { maxActiveCases: limitNum });

    await logAuditAction({
      user: req.user,
      action: 'WORKLOAD_LIMIT_UPDATED',
      entityType: 'Official',
      entityId: official.id,
      details: `Workload limit for ${official.name} adjusted from ${prevLimit} to ${limitNum} active cases.`,
      previousValue: { maxActiveCases: prevLimit },
      newValue: { maxActiveCases: limitNum }
    });

    res.json({
      success: true,
      message: `Workload capacity for ${official.name} updated to ${limitNum} cases.`,
      newLimit: limitNum
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/officials/:id/availability (Toggle official status e.g. Available / On Leave)
router.put('/:id/availability', authenticateToken, async (req, res) => {
  try {
    const { availabilityStatus } = req.body;
    const allowed = ['Available', 'On Leave', 'Busy', 'Unavailable'];

    if (!allowed.includes(availabilityStatus)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${allowed.join(', ')}` });
    }

    const official = await db.officials.findOne({ id: req.params.id });
    if (!official) {
      return res.status(404).json({ success: false, message: 'Official not found.' });
    }

    // Role check: official can only update their own status unless admin/senior
    if (req.user.role === 'official' && req.user.officialId !== official.id) {
      return res.status(403).json({ success: false, message: 'Officials can only modify their own availability status.' });
    }

    const prevStatus = official.availabilityStatus;
    await db.officials.updateOne({ id: req.params.id }, { availabilityStatus });

    await logAuditAction({
      user: req.user,
      action: 'OFFICIAL_AVAILABILITY_CHANGED',
      entityType: 'Official',
      entityId: official.id,
      details: `Availability status for ${official.name} changed from "${prevStatus}" to "${availabilityStatus}".`,
      previousValue: { availabilityStatus: prevStatus },
      newValue: { availabilityStatus }
    });

    res.json({
      success: true,
      message: `Availability status updated to "${availabilityStatus}".`,
      officialId: official.id,
      availabilityStatus
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
