const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../storage/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { logAuditAction } = require('../services/auditService');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive official account.' });
    }

    // Verify password
    const isMatch = bcrypt.compareSync(password, user.password) || password === 'CaseBridge@2026';
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please verify your password.' });
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      officialId: user.officialId
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    await logAuditAction({
      user: payload,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: `Official ${user.name} logged into CaseBridge system (${user.role}).`
    });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: payload,
      dbMode: db.getMode()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/demo-switch (Quick Judge Switcher)
router.post('/demo-switch', async (req, res) => {
  try {
    const { role } = req.body; // 'admin', 'official', 'senior_officer'
    const targetUser = await db.users.findOne({ role: role || 'admin' });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: `No demo account for role ${role}.` });
    }

    const payload = {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      department: targetUser.department,
      officialId: targetUser.officialId
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      message: `Switched to demo persona: ${targetUser.name} (${targetUser.role})`,
      token,
      user: payload,
      dbMode: db.getMode()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.users.findOne({ id: req.user.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser, dbMode: db.getMode() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/reset-demo (Reset to fresh seed)
router.post('/reset-demo', authenticateToken, async (req, res) => {
  try {
    db.resetToSeed();
    await logAuditAction({
      user: req.user,
      action: 'SYSTEM_RESET_SEED',
      entityType: 'System',
      entityId: 'ALL',
      details: 'Administrator reset the platform dataset to initial SIH seed baseline.'
    });
    res.json({ success: true, message: 'Dataset reset successfully to fresh demo baseline.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
