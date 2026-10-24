const { db } = require('../storage/db');

/**
 * Triggers impact analysis when an important case event occurs (UVP 3)
 * @param {Object} updatedCase - The case that was updated
 * @param {Object} changeContext - { actor, action, previousStatus, newStatus, remarks, findings }
 * @returns {Promise<Array>} List of generated notifications / impact recommendations
 */
async function analyzeImpactAndNotify(updatedCase, changeContext) {
  const generatedAlerts = [];

  // 1. Fetch all confirmed or suggested relationships involving this case
  const relationships = await db.caseRelationships.find();
  const directRelationships = relationships.filter(rel => 
    (rel.sourceCaseId === updatedCase.id || rel.targetCaseId === updatedCase.id) &&
    rel.reviewStatus !== 'Dismissed'
  );

  // 2. Fetch other open cases at the same institution for contextual awareness
  const institutionCases = await db.cases.find({ 
    institutionId: updatedCase.institutionId,
    status: { $ne: 'Disposed' }
  });

  const affectedCaseIds = new Set();
  const impactMap = [];

  // Check directly connected cases
  for (const rel of directRelationships) {
    const peerCaseId = rel.sourceCaseId === updatedCase.id ? rel.targetCaseId : rel.sourceCaseId;
    if (peerCaseId === updatedCase.id) continue;
    affectedCaseIds.add(peerCaseId);
    impactMap.push({
      peerCaseId,
      relationshipType: rel.relationshipType,
      explanation: rel.explanation
    });
  }

  // Check same institution cases with same or related category
  for (const instCase of institutionCases) {
    if (instCase.id === updatedCase.id) continue;
    if (!affectedCaseIds.has(instCase.id)) {
      if (instCase.category === updatedCase.category || updatedCase.priority === 'Critical') {
        affectedCaseIds.add(instCase.id);
        impactMap.push({
          peerCaseId: instCase.id,
          relationshipType: 'Institutional Co-occurrence',
          explanation: `Both cases belong to ${updatedCase.institutionName} and share high-risk administrative nexus.`
        });
      }
    }
  }

  // 3. Generate Impact Alert Notifications if actionable changes took place
  const isHighImpactChange = 
    changeContext.action === 'ESCALATED' ||
    changeContext.newStatus === 'Escalated' ||
    (changeContext.findings && changeContext.findings.length > 5) ||
    changeContext.action === 'FINDING_RECORDED' ||
    (updatedCase.priority === 'Critical' && changeContext.action === 'STATUS_CHANGE');

  if (isHighImpactChange && impactMap.length > 0) {
    for (const impact of impactMap) {
      const peerCase = await db.cases.findOne({ id: impact.peerCaseId });
      if (!peerCase || peerCase.status === 'Disposed') continue;

      const alertTitle = `Impact Advisory: ${updatedCase.id} updated → ${peerCase.id} review suggested`;
      let alertMsg = `Case ${updatedCase.id} (${updatedCase.institutionName}) was updated with ${changeContext.action} [Status: ${changeContext.newStatus || updatedCase.status}]. `;
      alertMsg += `Case ${peerCase.id} (Assigned to: ${peerCase.assignedOfficialName || 'Unassigned'}) may require coordination review because: ${impact.explanation}. `;
      alertMsg += `(Recommendation for official review; not an automated legal finding).`;

      const notificationDoc = {
        id: `NOTIF-IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipientId: peerCase.assignedOfficialId || 'ALL_OFFICIALS',
        recipientRole: 'official',
        type: 'IMPACT_ALERT',
        severity: updatedCase.priority === 'Critical' ? 'critical' : 'high',
        title: alertTitle,
        message: alertMsg,
        relatedCaseId: peerCase.id,
        relatedInstitutionId: updatedCase.institutionId,
        acknowledged: false,
        read: false,
        createdAt: new Date().toISOString()
      };

      await db.notifications.create(notificationDoc);
      generatedAlerts.push(notificationDoc);
    }
  }

  return generatedAlerts;
}

module.exports = {
  analyzeImpactAndNotify
};
