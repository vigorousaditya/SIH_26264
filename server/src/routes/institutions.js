const express = require('express');
const router = express.Router();
const { db } = require('../storage/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAuditAction } = require('../services/auditService');

// GET /api/institutions (List with search and filter)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, region } = req.query;
    db.recalculateWorkloads();
    let institutions = await db.institutions.find();

    if (region && region !== 'all') {
      institutions = institutions.filter(i => i.region.toLowerCase() === region.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      institutions = institutions.filter(i => 
        i.name.toLowerCase().includes(q) ||
        i.permanentId.toLowerCase().includes(q) ||
        i.city.toLowerCase().includes(q) ||
        i.state.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: institutions.length, data: institutions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/institutions/:id (Deep profile view)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    db.recalculateWorkloads();
    const inst = await db.institutions.findOne({ id: req.params.id }) ||
                 await db.institutions.findOne({ permanentId: req.params.id });

    if (!inst) {
      return res.status(404).json({ success: false, message: 'Institution record not found.' });
    }

    // Associated cases across all departments
    const cases = await db.cases.find({ institutionId: inst.id });

    // Issue groups for this institution
    const issueGroups = await db.issueGroups.find({ institutionId: inst.id });

    // Case IDs for relationship queries
    const caseIds = cases.map(c => c.id);
    const relationships = (await db.caseRelationships.find()).filter(r => 
      caseIds.includes(r.sourceCaseId) || caseIds.includes(r.targetCaseId)
    );

    // Notifications and alerts
    const alerts = await db.notifications.find({ relatedInstitutionId: inst.id });

    // Calculate status breakdown
    const statusCounts = {
      Pending: cases.filter(c => c.status === 'Pending').length,
      'Under Process': cases.filter(c => c.status === 'Under Process').length,
      Transferred: cases.filter(c => c.status === 'Transferred').length,
      Escalated: cases.filter(c => c.status === 'Escalated').length,
      Disposed: cases.filter(c => c.status === 'Disposed').length,
    };

    res.json({
      success: true,
      institution: inst,
      statusCounts,
      cases,
      issueGroups,
      relationships,
      alerts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/institutions (Admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, permanentId, region, state, city, address, category, principalName, contactEmail, contactPhone } = req.body;
    if (!name || !permanentId || !region) {
      return res.status(400).json({ success: false, message: 'Name, Permanent AICTE ID, and Region are required.' });
    }

    const existing = await db.institutions.findOne({ permanentId });
    if (existing) {
      return res.status(400).json({ success: false, message: `An institution with AICTE Permanent ID "${permanentId}" already exists.` });
    }

    const newInst = {
      id: `INST-${Date.now().toString().slice(-4)}`,
      permanentId: permanentId.trim(),
      name: name.trim(),
      category: category || 'Engineering & Technology',
      region: region.trim(),
      state: state || '',
      city: city || '',
      address: address || '',
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      principalName: principalName || '',
      accreditationStatus: 'AICTE Approved'
    };

    const created = await db.institutions.create(newInst);

    await logAuditAction({
      user: req.user,
      action: 'INSTITUTION_REGISTERED',
      entityType: 'Institution',
      entityId: created.id,
      details: `New institution "${created.name}" (ID: ${created.permanentId}) registered by Admin.`
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/institutions/:id (Admin only)
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const inst = await db.institutions.findOne({ id: req.params.id });
    if (!inst) {
      return res.status(404).json({ success: false, message: 'Institution not found.' });
    }

    const updates = req.body;
    delete updates.id; // protect ID

    await db.institutions.updateOne({ id: req.params.id }, updates);

    await logAuditAction({
      user: req.user,
      action: 'INSTITUTION_UPDATED',
      entityType: 'Institution',
      entityId: inst.id,
      details: `Institution profile updated for ${inst.name}.`,
      previousValue: inst,
      newValue: updates
    });

    res.json({ success: true, message: 'Institution updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
