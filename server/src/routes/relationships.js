const express = require('express');
const router = express.Router();
const { db } = require('../storage/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAuditAction } = require('../services/auditService');

// GET /api/relationships/graph (Formatted graph representation for React Flow)
router.get('/graph', authenticateToken, async (req, res) => {
  try {
    const { institutionId, department, status } = req.query;
    db.recalculateWorkloads();

    let cases = await db.cases.find();
    let relationships = await db.caseRelationships.find();

    // Filters
    if (institutionId && institutionId !== 'all') {
      cases = cases.filter(c => c.institutionId === institutionId);
    }
    if (department && department !== 'all') {
      cases = cases.filter(c => c.department.toLowerCase() === department.toLowerCase());
    }
    if (status && status !== 'all') {
      cases = cases.filter(c => c.status.toLowerCase() === status.toLowerCase());
    }

    const caseIdsInScope = new Set(cases.map(c => c.id));

    // Filter relationships where both or either nodes are in scope
    const scopedRelationships = relationships.filter(rel => 
      caseIdsInScope.has(rel.sourceCaseId) || caseIdsInScope.has(rel.targetCaseId)
    );

    // If an edge points to a case outside current filter, optionally include it or trim
    const allNodeIds = new Set(caseIdsInScope);
    scopedRelationships.forEach(r => {
      allNodeIds.add(r.sourceCaseId);
      allNodeIds.add(r.targetCaseId);
    });

    const allNeededCases = (await db.cases.find()).filter(c => allNodeIds.has(c.id));

    // Construct React Flow Nodes with intelligent circular/hierarchical auto-layout
    const nodes = allNeededCases.map((c, index) => {
      // Circular or grid layout positioning
      const angle = (index / Math.max(1, allNeededCases.length)) * 2 * Math.PI;
      const radius = 280 + (index % 3) * 60;
      const x = Math.round(500 + radius * Math.cos(angle));
      const y = Math.round(350 + radius * Math.sin(angle));

      // Node color by case status
      let statusColor = '#3b82f6'; // blue default
      if (c.status === 'Pending') statusColor = '#f59e0b'; // amber
      if (c.status === 'Under Process') statusColor = '#3b82f6'; // blue
      if (c.status === 'Escalated') statusColor = '#ef4444'; // red
      if (c.status === 'Disposed') statusColor = '#10b981'; // emerald
      if (c.status === 'Transferred') statusColor = '#8b5cf6'; // purple

      return {
        id: c.id,
        type: 'caseNode',
        position: { x, y },
        data: {
          id: c.id,
          label: c.id,
          institutionName: c.institutionName,
          category: c.category,
          status: c.status,
          priority: c.priority,
          department: c.department,
          assignedOfficialName: c.assignedOfficialName || 'Unassigned',
          expectedDisposalAt: c.expectedDisposalAt,
          statusColor,
          description: c.description
        }
      };
    });

    // Construct React Flow Edges
    const edges = scopedRelationships.map((rel, idx) => {
      let strokeColor = '#64748b';
      let strokeDash = undefined;

      if (rel.relationshipType === 'Similar issue') strokeColor = '#3b82f6';
      if (rel.relationshipType === 'Possible dependency') {
        strokeColor = '#f97316';
        strokeDash = '5,5';
      }
      if (rel.relationshipType === 'Needs review') {
        strokeColor = '#ef4444';
        strokeDash = '4,4';
      }

      return {
        id: rel.id || `edge-${rel.sourceCaseId}-${rel.targetCaseId}-${idx}`,
        source: rel.sourceCaseId,
        target: rel.targetCaseId,
        label: `${rel.relationshipType} (${rel.confidenceScore || 80}%)`,
        animated: rel.relationshipType === 'Possible dependency' || rel.relationshipType === 'Needs review',
        style: {
          stroke: strokeColor,
          strokeWidth: 2,
          strokeDasharray: strokeDash
        },
        data: {
          id: rel.id,
          relationshipType: rel.relationshipType,
          explanation: rel.explanation,
          confidenceScore: rel.confidenceScore,
          reviewStatus: rel.reviewStatus
        }
      };
    });

    res.json({
      success: true,
      nodesCount: nodes.length,
      edgesCount: edges.length,
      nodes,
      edges,
      rawRelationships: scopedRelationships
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/relationships (Create relationship between two cases)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { sourceCaseId, targetCaseId, relationshipType, explanation, confidenceScore = 85 } = req.body;
    if (!sourceCaseId || !targetCaseId || !relationshipType || !explanation) {
      return res.status(400).json({ success: false, message: 'Source case, target case, relationship type, and explanation are required.' });
    }

    if (sourceCaseId === targetCaseId) {
      return res.status(400).json({ success: false, message: 'Cannot connect a case to itself.' });
    }

    const relId = `REL-${Date.now().toString().slice(-5)}`;
    const newRel = {
      id: relId,
      sourceCaseId,
      targetCaseId,
      relationshipType,
      explanation,
      confidenceScore: parseInt(confidenceScore, 10) || 85,
      reviewStatus: req.user.role === 'admin' || req.user.role === 'senior_officer' ? 'Confirmed' : 'Suggested',
      reviewedBy: (req.user.role === 'admin' || req.user.role === 'senior_officer') ? req.user.name : null,
      createdAt: new Date().toISOString()
    };

    const created = await db.caseRelationships.create(newRel);

    await logAuditAction({
      user: req.user,
      action: 'CASE_RELATIONSHIP_CREATED',
      entityType: 'CaseRelationship',
      entityId: created.id,
      details: `Created relationship "${relationshipType}" between ${sourceCaseId} and ${targetCaseId}. Reason: ${explanation}`,
      newValue: created
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/relationships/:id/status (Confirm or dismiss suggested link)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { reviewStatus } = req.body; // 'Confirmed' | 'Dismissed'
    if (!['Confirmed', 'Dismissed'].includes(reviewStatus)) {
      return res.status(400).json({ success: false, message: 'Status must be Confirmed or Dismissed.' });
    }

    const rel = await db.caseRelationships.findOne({ id: req.params.id });
    if (!rel) {
      return res.status(404).json({ success: false, message: 'Relationship not found.' });
    }

    await db.caseRelationships.updateOne({ id: req.params.id }, {
      reviewStatus,
      reviewedBy: req.user.name
    });

    await logAuditAction({
      user: req.user,
      action: `RELATIONSHIP_${reviewStatus.toUpperCase()}`,
      entityType: 'CaseRelationship',
      entityId: rel.id,
      details: `Official ${req.user.name} marked relationship ${rel.id} (${rel.sourceCaseId} ↔ ${rel.targetCaseId}) as ${reviewStatus}.`
    });

    res.json({ success: true, message: `Relationship marked as ${reviewStatus}.`, reviewStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
