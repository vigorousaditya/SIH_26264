const express = require('express');
const router = express.Router();
const { db } = require('../storage/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { autoAssignCase } = require('../services/autoAssign');
const { findSimilarCases } = require('../services/similarity');
const { analyzeImpactAndNotify } = require('../services/impactEngine');
const { logAuditAction } = require('../services/auditService');

// GET /api/cases (Filtered list)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      department, 
      category, 
      priority, 
      status, 
      institutionId, 
      officialId, 
      search, 
      unassigned,
      overdue
    } = req.query;

    db.recalculateWorkloads();
    let cases = await db.cases.find();

    // Filters
    if (department && department !== 'all') {
      cases = cases.filter(c => c.department.toLowerCase() === department.toLowerCase());
    }
    if (category && category !== 'all') {
      cases = cases.filter(c => c.category.toLowerCase() === category.toLowerCase());
    }
    if (priority && priority !== 'all') {
      cases = cases.filter(c => c.priority.toLowerCase() === priority.toLowerCase());
    }
    if (status && status !== 'all') {
      cases = cases.filter(c => c.status.toLowerCase() === status.toLowerCase());
    }
    if (institutionId) {
      cases = cases.filter(c => c.institutionId === institutionId);
    }
    if (officialId) {
      cases = cases.filter(c => c.assignedOfficialId === officialId);
    }
    if (unassigned === 'true') {
      cases = cases.filter(c => !c.assignedOfficialId || c.assignedOfficialId === 'null');
    }
    if (overdue === 'true') {
      const now = Date.now();
      cases = cases.filter(c => c.status !== 'Disposed' && new Date(c.expectedDisposalAt).getTime() < now);
    }
    if (search) {
      const q = search.toLowerCase();
      cases = cases.filter(c => 
        c.id.toLowerCase().includes(q) ||
        c.institutionName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.assignedOfficialName && c.assignedOfficialName.toLowerCase().includes(q)) ||
        (c.complainantName && c.complainantName.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, count: cases.length, data: cases });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cases/unassigned (Unassigned Queue)
router.get('/unassigned', authenticateToken, async (req, res) => {
  try {
    const cases = await db.cases.find();
    const unassignedCases = cases.filter(c => !c.assignedOfficialId || c.assignedOfficialId === 'null');
    res.json({ success: true, count: unassignedCases.length, data: unassignedCases });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cases/preview-assignment (Interactive Workload & Route Simulator)
router.post('/preview-assignment', authenticateToken, async (req, res) => {
  try {
    const { department, category } = req.body;
    if (!department || !category) {
      return res.status(400).json({ success: false, message: 'Department and category are required for assignment preview.' });
    }

    const preview = await autoAssignCase({ department, category });
    res.json({ success: true, preview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cases/:id (Case detail with history, similar suggestions, and relationships)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const c = await db.cases.findOne({ id: req.params.id });
    if (!c) {
      return res.status(404).json({ success: false, message: 'Case not found.' });
    }

    // Fetch case history
    const history = await db.caseHistories.find({ caseId: c.id });

    // Fetch issue group if linked
    let issueGroup = null;
    if (c.issueGroupId) {
      issueGroup = await db.issueGroups.findOne({ id: c.issueGroupId });
    }

    // Find similar cases suggestions
    const similarCases = await findSimilarCases(c);

    // Fetch confirmed/suggested relationships
    const relationships = (await db.caseRelationships.find()).filter(r => 
      r.sourceCaseId === c.id || r.targetCaseId === c.id
    );

    res.json({
      success: true,
      data: c,
      history,
      issueGroup,
      similarCases,
      relationships
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cases (Register new complaint with UVP 1 auto-assignment & UVP 2 similarity detection)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      institutionId,
      category,
      description,
      priority = 'Medium',
      department,
      complainantName = 'Confidential Complainant',
      complainantType = 'Faculty',
      daysToDisposal = 15,
      manualOfficialId = null,
      overrideReason = ''
    } = req.body;

    if (!institutionId || !category || !description || !department) {
      return res.status(400).json({ 
        success: false, 
        message: 'Institution, category, description, and department are required.' 
      });
    }

    // Verify institution
    const inst = await db.institutions.findOne({ id: institutionId });
    if (!inst) {
      return res.status(400).json({ success: false, message: 'Selected institution does not exist.' });
    }

    // Generate Case ID
    const count = await db.cases.countDocuments();
    const caseId = `CB-2026-${100 + count + 1}`;

    const now = new Date();
    const expectedDisposalDate = new Date(now.getTime() + (Number(daysToDisposal) || 15) * 24 * 60 * 60 * 1000);

    // Determine Official Assignment
    let assignedOfficialId = null;
    let assignedOfficialName = 'Unassigned';
    let assignmentReason = '';
    let assignedBy = 'System Auto-Assignment';

    if (manualOfficialId) {
      // Supervisor or Admin manual override
      const manualOff = await db.officials.findOne({ id: manualOfficialId });
      if (manualOff) {
        assignedOfficialId = manualOff.id;
        assignedOfficialName = manualOff.name;
        assignedBy = req.user.name;
        assignmentReason = `Manual Assignment / Override by ${req.user.name} (${req.user.role}). Reason: ${overrideReason || 'Administrative discretion.'}`;
      }
    } else {
      // Execute UVP 1 Smart Auto-Assignment
      const routing = await autoAssignCase({ department, category });
      if (routing.status === 'ASSIGNED' && routing.official) {
        assignedOfficialId = routing.official.id;
        assignedOfficialName = routing.official.name;
        assignmentReason = routing.explanation;
        assignedBy = 'System Auto-Assignment';
      } else {
        assignedOfficialId = null;
        assignedOfficialName = 'Unassigned';
        assignmentReason = routing.explanation;
        assignedBy = 'System Queue Rule';

        // Create alert for Unassigned Queue
        await db.notifications.create({
          id: `NOTIF-UNAS-${Date.now()}`,
          recipientId: 'ALL_OFFICIALS',
          recipientRole: 'admin',
          type: 'UNASSIGNED_CASE',
          severity: 'high',
          title: `New Case ${caseId} entered Unassigned Queue`,
          message: `Complaint for ${inst.name} could not be auto-assigned: ${routing.explanation}`,
          relatedCaseId: caseId,
          relatedInstitutionId: inst.id,
          acknowledged: false,
          read: false,
          createdAt: now.toISOString()
        });
      }
    }

    const newCase = {
      id: caseId,
      institutionId: inst.id,
      institutionName: inst.name,
      institutionPermanentId: inst.permanentId,
      category,
      description,
      complainantName,
      complainantType,
      priority,
      department,
      assignedOfficialId,
      assignedOfficialName,
      status: 'Pending',
      receivedAt: now.toISOString(),
      expectedDisposalAt: expectedDisposalDate.toISOString(),
      lastActionDate: now.toISOString(),
      nextAction: assignedOfficialId ? 'Preliminary Case Assessment & Verification' : 'Supervisor / Admin Manual Assignment Required',
      issueGroupId: null,
      assignmentReason,
      assignedBy,
      findings: '',
      disposalRemarks: '',
      createdBy: `${req.user.name} (${req.user.role})`
    };

    const createdCase = await db.cases.create(newCase);

    // Record Case History (Registration)
    await db.caseHistories.create({
      id: `HIST-${Date.now()}-1`,
      caseId: createdCase.id,
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'REGISTERED',
      previousValue: null,
      newValue: { status: 'Pending', priority, category, department },
      remarks: `Complaint formally registered. ${assignmentReason}`,
      timestamp: now.toISOString()
    });

    if (assignedOfficialId) {
      await db.caseHistories.create({
        id: `HIST-${Date.now()}-2`,
        caseId: createdCase.id,
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'ASSIGNED',
        previousValue: { assignedOfficialId: null },
        newValue: { assignedOfficialId, assignedOfficialName },
        remarks: assignmentReason,
        timestamp: new Date(now.getTime() + 1000).toISOString()
      });
    }

    // Log Audit Trail
    await logAuditAction({
      user: req.user,
      action: 'CASE_REGISTERED',
      entityType: 'Case',
      entityId: createdCase.id,
      details: `Complaint ${createdCase.id} registered for ${inst.name}. ${assignmentReason}`,
      newValue: createdCase
    });

    // Check UVP 2 Similar Complaint Suggestion
    const similarMatches = await findSimilarCases(createdCase);
    if (similarMatches.length > 0) {
      const topMatch = similarMatches[0];
      await db.notifications.create({
        id: `NOTIF-SIM-${Date.now()}`,
        recipientId: assignedOfficialId || 'ALL_OFFICIALS',
        recipientRole: 'official',
        type: 'SIMILAR_COMPLAINTS',
        severity: topMatch.similarityScore > 80 ? 'high' : 'medium',
        title: `Similar Complaint Alert: Case ${caseId} matches ${topMatch.case.id} (${topMatch.similarityScore}%)`,
        message: `Case ${caseId} shares strong similarity with existing case ${topMatch.case.id} at ${inst.name}. Reason: ${topMatch.explanation}. Review in Similar Grouping tab.`,
        relatedCaseId: caseId,
        relatedInstitutionId: inst.id,
        acknowledged: false,
        read: false,
        createdAt: now.toISOString()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Complaint registered successfully.',
      data: createdCase,
      assignmentExplanation: assignmentReason,
      similarMatchesCount: similarMatches.length,
      similarMatches
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/cases/:id/status (Update status, add remarks, triggers impact analyzer UVP 3)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, remarks, nextAction, findings, disposalRemarks } = req.body;
    const currentCase = await db.cases.findOne({ id: req.params.id });

    if (!currentCase) {
      return res.status(404).json({ success: false, message: 'Case not found.' });
    }

    const previousStatus = currentCase.status;
    const updates = {
      lastActionDate: new Date().toISOString()
    };

    if (status) updates.status = status;
    if (nextAction) updates.nextAction = nextAction;
    if (findings !== undefined) updates.findings = findings;
    if (disposalRemarks !== undefined) updates.disposalRemarks = disposalRemarks;

    await db.cases.updateOne({ id: req.params.id }, updates);
    const updatedCase = await db.cases.findOne({ id: req.params.id });

    // History record
    await db.caseHistories.create({
      id: `HIST-${Date.now()}`,
      caseId: currentCase.id,
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: status === 'Escalated' ? 'ESCALATED' : status === 'Disposed' ? 'DISPOSED' : 'STATUS_CHANGE',
      previousValue: { status: previousStatus },
      newValue: { status: updatedCase.status, nextAction: updatedCase.nextAction },
      remarks: remarks || `Status updated from ${previousStatus} to ${updatedCase.status}.`,
      timestamp: new Date().toISOString()
    });

    // Audit log
    await logAuditAction({
      user: req.user,
      action: 'CASE_STATUS_CHANGED',
      entityType: 'Case',
      entityId: currentCase.id,
      details: `Case ${currentCase.id} status changed from "${previousStatus}" to "${updatedCase.status}". Remarks: ${remarks || 'None'}`,
      previousValue: { status: previousStatus },
      newValue: { status: updatedCase.status, remarks }
    });

    // UVP 3: Run Case Dependency & Change-Triggered Impact Analyzer
    const impactAlerts = await analyzeImpactAndNotify(updatedCase, {
      actor: req.user,
      action: status === 'Escalated' ? 'ESCALATED' : 'STATUS_CHANGE',
      previousStatus,
      newStatus: updatedCase.status,
      remarks,
      findings: findings || currentCase.findings
    });

    res.json({
      success: true,
      message: `Case status updated to ${updatedCase.status}.`,
      data: updatedCase,
      impactAlertsGenerated: impactAlerts.length,
      impactAlerts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/cases/:id/assign (Manual Assign / Reassign / Supervisor Override)
router.put('/:id/assign', authenticateToken, async (req, res) => {
  try {
    const { officialId, overrideReason } = req.body;
    if (!officialId) {
      return res.status(400).json({ success: false, message: 'Please select an official to assign.' });
    }

    const currentCase = await db.cases.findOne({ id: req.params.id });
    if (!currentCase) {
      return res.status(404).json({ success: false, message: 'Case not found.' });
    }

    const official = await db.officials.findOne({ id: officialId });
    if (!official) {
      return res.status(404).json({ success: false, message: 'Target official not found.' });
    }

    // Workload check & guardrail
    if (official.availabilityStatus !== 'Available' && req.user.role !== 'admin' && req.user.role !== 'senior_officer') {
      return res.status(400).json({
        success: false,
        message: `Official ${official.name} is currently "${official.availabilityStatus}". Administrative override privilege required.`
      });
    }

    if (official.activeCasesCount >= official.maxActiveCases && req.user.role !== 'admin' && req.user.role !== 'senior_officer') {
      return res.status(400).json({
        success: false,
        message: `Official ${official.name} has reached maximum limit (${official.activeCasesCount}/${official.maxActiveCases}). Administrative override privilege required.`
      });
    }

    const prevOfficial = currentCase.assignedOfficialName;
    const isOverride = official.activeCasesCount >= official.maxActiveCases || official.availabilityStatus !== 'Available';

    const updates = {
      assignedOfficialId: official.id,
      assignedOfficialName: official.name,
      assignedBy: req.user.name,
      assignmentReason: isOverride 
        ? `Manual Override by ${req.user.name} (${req.user.role}). Reason: ${overrideReason || 'Authorized supervisor assignment.'}`
        : `Reassigned by ${req.user.name} (${req.user.role}). Reason: ${overrideReason || 'Departmental redistribution.'}`,
      lastActionDate: new Date().toISOString()
    };

    await db.cases.updateOne({ id: req.params.id }, updates);
    const updatedCase = await db.cases.findOne({ id: req.params.id });

    // Case History
    await db.caseHistories.create({
      id: `HIST-${Date.now()}`,
      caseId: currentCase.id,
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'REASSIGNED',
      previousValue: { assignedOfficialId: currentCase.assignedOfficialId, assignedOfficialName: prevOfficial },
      newValue: { assignedOfficialId: official.id, assignedOfficialName: official.name },
      remarks: updates.assignmentReason,
      timestamp: new Date().toISOString()
    });

    // Audit log
    await logAuditAction({
      user: req.user,
      action: 'CASE_REASSIGNED',
      entityType: 'Case',
      entityId: currentCase.id,
      details: `Reassigned Case ${currentCase.id} from "${prevOfficial}" to "${official.name}". ${updates.assignmentReason}`,
      previousValue: { assignedOfficialId: currentCase.assignedOfficialId },
      newValue: { assignedOfficialId: official.id }
    });

    // Notification to assigned official
    await db.notifications.create({
      id: `NOTIF-ASG-${Date.now()}`,
      recipientId: official.id,
      recipientRole: 'official',
      type: 'ASSIGNMENT',
      severity: 'medium',
      title: `New Case Assigned: ${currentCase.id}`,
      message: `You have been assigned Case ${currentCase.id} (${currentCase.institutionName}) by ${req.user.name}.`,
      relatedCaseId: currentCase.id,
      relatedInstitutionId: currentCase.institutionId,
      acknowledged: false,
      read: false,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Case successfully assigned to ${official.name}.`,
      data: updatedCase
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cases/:id/remarks (Add remark / case note)
router.post('/:id/remarks', authenticateToken, async (req, res) => {
  try {
    const { remarks, nextAction } = req.body;
    if (!remarks) {
      return res.status(400).json({ success: false, message: 'Remarks text cannot be empty.' });
    }

    const currentCase = await db.cases.findOne({ id: req.params.id });
    if (!currentCase) {
      return res.status(404).json({ success: false, message: 'Case not found.' });
    }

    const updates = {
      lastActionDate: new Date().toISOString()
    };
    if (nextAction) updates.nextAction = nextAction;

    await db.cases.updateOne({ id: req.params.id }, updates);

    // Add History
    await db.caseHistories.create({
      id: `HIST-${Date.now()}`,
      caseId: currentCase.id,
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'REMARKED',
      previousValue: null,
      newValue: { nextAction },
      remarks,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Action remarks appended to case history.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
