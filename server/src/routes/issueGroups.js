const express = require('express');
const router = express.Router();
const { db } = require('../storage/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAuditAction } = require('../services/auditService');
const { findSimilarCases } = require('../services/similarity');

// GET /api/issue-groups (List all common issue groups)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, institutionId } = req.query;
    let groups = await db.issueGroups.find();

    if (status && status !== 'all') {
      groups = groups.filter(g => g.status.toLowerCase() === status.toLowerCase());
    }
    if (institutionId) {
      groups = groups.filter(g => g.institutionId === institutionId);
    }

    // Enrich with count of linked cases
    const enriched = await Promise.all(groups.map(async g => {
      const linkedCases = await db.cases.find({ id: { $in: g.linkedCaseIds || [] } });
      return {
        ...g,
        linkedCasesCount: (g.linkedCaseIds || []).length,
        linkedCases
      };
    }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/issue-groups/:id (Detail view)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const group = await db.issueGroups.findOne({ id: req.params.id });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Common Issue Group not found.' });
    }

    const linkedCases = await db.cases.find({ id: { $in: group.linkedCaseIds || [] } });
    const institution = await db.institutions.findOne({ id: group.institutionId });

    res.json({
      success: true,
      data: group,
      linkedCases,
      institution
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/issue-groups (Create new Common Issue Group)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      institutionId,
      title,
      issueSummary,
      primaryCategory,
      linkedCaseIds = [],
      leadOfficialId = null
    } = req.body;

    if (!institutionId || !title || !issueSummary || !primaryCategory) {
      return res.status(400).json({ success: false, message: 'Institution, title, summary, and category are required.' });
    }

    const inst = await db.institutions.findOne({ id: institutionId });
    if (!inst) {
      return res.status(404).json({ success: false, message: 'Institution not found.' });
    }

    let leadOfficialName = 'Unassigned';
    if (leadOfficialId) {
      const off = await db.officials.findOne({ id: leadOfficialId });
      if (off) leadOfficialName = off.name;
    }

    const count = (await db.issueGroups.find()).length;
    const groupId = `GRP-2026-${String(count + 1).padStart(3, '0')}`;

    const newGroup = {
      id: groupId,
      institutionId: inst.id,
      institutionName: inst.name,
      title,
      issueSummary,
      primaryCategory,
      linkedCaseIds: Array.isArray(linkedCaseIds) ? linkedCaseIds : [linkedCaseIds],
      leadOfficialId,
      leadOfficialName,
      status: req.user.role === 'admin' || req.user.role === 'senior_officer' ? 'Approved' : 'Suggested',
      similarityScore: 90,
      keywordsMatched: ['common-complaint', 'institution-cluster'],
      suggestedAt: new Date().toISOString(),
      approvedBy: (req.user.role === 'admin' || req.user.role === 'senior_officer') ? `${req.user.name} (${req.user.role})` : null,
      approvedAt: (req.user.role === 'admin' || req.user.role === 'senior_officer') ? new Date().toISOString() : null
    };

    const created = await db.issueGroups.create(newGroup);

    // Link original complaints to this group while preserving individual case IDs!
    if (newGroup.status === 'Approved') {
      for (const caseId of newGroup.linkedCaseIds) {
        await db.cases.updateOne({ id: caseId }, { issueGroupId: created.id });
        await db.caseHistories.create({
          id: `HIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          caseId,
          actorId: req.user.id,
          actorName: req.user.name,
          actorRole: req.user.role,
          action: 'GROUPED',
          previousValue: { issueGroupId: null },
          newValue: { issueGroupId: created.id },
          remarks: `Linked to Common Issue Group "${created.title}" (${created.id}). Preserving individual complaint record and complainant identity.`,
          timestamp: new Date().toISOString()
        });
      }
    }

    await logAuditAction({
      user: req.user,
      action: 'ISSUE_GROUP_CREATED',
      entityType: 'IssueGroup',
      entityId: created.id,
      details: `Created Common Issue Group "${created.title}" with ${newGroup.linkedCaseIds.length} linked complaints.`,
      newValue: created
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/issue-groups/:id/status (Approve / Reject / Resolve Common Issue Group)
router.put('/:id/status', authenticateToken, requireRole(['admin', 'senior_officer', 'official']), async (req, res) => {
  try {
    const { status, remarks } = req.body; // 'Approved', 'Rejected', 'Resolved'
    const group = await db.issueGroups.findOne({ id: req.params.id });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Issue group not found.' });
    }

    const prevStatus = group.status;
    const updates = {
      status,
      approvedBy: `${req.user.name} (${req.user.role})`,
      approvedAt: new Date().toISOString()
    };

    await db.issueGroups.updateOne({ id: req.params.id }, updates);

    // If approved, update linked cases
    if (status === 'Approved') {
      for (const caseId of group.linkedCaseIds || []) {
        await db.cases.updateOne({ id: caseId }, { issueGroupId: group.id });
      }
    } else if (status === 'Rejected') {
      for (const caseId of group.linkedCaseIds || []) {
        await db.cases.updateOne({ id: caseId }, { issueGroupId: null });
      }
    }

    await logAuditAction({
      user: req.user,
      action: `ISSUE_GROUP_${status.toUpperCase()}`,
      entityType: 'IssueGroup',
      entityId: group.id,
      details: `Common Issue Group ${group.id} changed from ${prevStatus} to ${status}. Remarks: ${remarks || 'None'}`,
      previousValue: { status: prevStatus },
      newValue: { status, remarks }
    });

    res.json({
      success: true,
      message: `Issue group successfully marked as ${status}.`,
      status
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/issue-groups/scan-suggestions (Scans institution cases for auto-suggestions)
router.post('/scan-suggestions', authenticateToken, async (req, res) => {
  try {
    const { institutionId } = req.body;
    let cases = await db.cases.find({ status: { $ne: 'Disposed' } });
    if (institutionId) {
      cases = cases.filter(c => c.institutionId === institutionId);
    }

    const suggestions = [];
    const seenPairs = new Set();

    for (const c of cases) {
      const matches = await findSimilarCases(c);
      for (const match of matches) {
        if (match.similarityScore >= 75) {
          const pairKey = [c.id, match.case.id].sort().join(':::');
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            suggestions.push({
              primaryCase: c,
              matchedCase: match.case,
              similarityScore: match.similarityScore,
              sharedKeywords: match.sharedKeywords,
              explanation: match.explanation,
              recommendedGroupTitle: `Cluster: ${c.category} at ${c.institutionName}`
            });
          }
        }
      }
    }

    res.json({ success: true, count: suggestions.length, data: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
