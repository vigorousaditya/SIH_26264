const express = require('express');
const router = express.Router();
const { db } = require('../storage/db');
const { authenticateToken } = require('../middleware/auth');
const { logAuditAction } = require('../services/auditService');

// GET /api/notifications (List notifications for current user/role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { unreadOnly, type, severity } = req.query;
    let notifications = await db.notifications.find();

    // Filter by role or recipient
    notifications = notifications.filter(n => 
      n.recipientId === 'ALL_OFFICIALS' ||
      n.recipientId === req.user.id ||
      n.recipientId === req.user.officialId ||
      n.recipientRole === 'ALL' ||
      n.recipientRole === req.user.role
    );

    if (unreadOnly === 'true') {
      notifications = notifications.filter(n => !n.read);
    }
    if (type && type !== 'all') {
      notifications = notifications.filter(n => n.type === type);
    }
    if (severity && severity !== 'all') {
      notifications = notifications.filter(n => n.severity === severity);
    }

    const unreadCount = notifications.filter(n => !n.read).length;
    const unacknowledgedCount = notifications.filter(n => !n.acknowledged && (n.type === 'IMPACT_ALERT' || n.type === 'OVERDUE_ALERT')).length;

    res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      unacknowledgedCount,
      data: notifications
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/notifications/:id/read (Mark single notification as read)
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await db.notifications.updateOne({ id: req.params.id }, {
      read: true,
      readAt: new Date().toISOString()
    });
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/notifications/read-all (Mark all notifications as read)
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const notifications = await db.notifications.find();
    for (const n of notifications) {
      if (!n.read) {
        await db.notifications.updateOne({ id: n.id }, {
          read: true,
          readAt: new Date().toISOString()
        });
      }
    }
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/notifications/:id/acknowledge (Acknowledge impact/critical alert)
router.put('/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { remarks } = req.body;
    const notif = await db.notifications.findOne({ id: req.params.id });
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    await db.notifications.updateOne({ id: req.params.id }, {
      acknowledged: true,
      acknowledgedBy: req.user.name,
      acknowledgedAt: new Date().toISOString(),
      read: true,
      readAt: new Date().toISOString()
    });

    await logAuditAction({
      user: req.user,
      action: 'ALERT_ACKNOWLEDGED',
      entityType: 'Alert',
      entityId: notif.id,
      details: `Alert "${notif.title}" acknowledged by ${req.user.name}. Remarks: ${remarks || 'Acknowledged for coordination review.'}`
    });

    res.json({
      success: true,
      message: 'Alert acknowledged successfully.',
      acknowledgedBy: req.user.name,
      acknowledgedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
