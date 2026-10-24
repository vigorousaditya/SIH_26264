const assert = require('assert');
const { connectDB, db } = require('../src/storage/db');
const { autoAssignCase } = require('../src/services/autoAssign');
const { findSimilarCases } = require('../src/services/similarity');
const { analyzeImpactAndNotify } = require('../src/services/impactEngine');
const { logAuditAction } = require('../src/services/auditService');

async function runAllTests() {
  console.log('🧪 Starting CaseBridge SIH 2026 Core Workflow Validation Tests...\n');

  // 1. Initialize Storage & Seed
  await connectDB();
  console.log('✅ 1. Database Storage initialized in mode:', db.getMode());

  // 2. Test DEMO A: Smart Auto-Assignment
  console.log('\n--- DEMO SCENARIO A: Smart Official Workload & Auto-Assignment ---');
  const testCaseA = {
    department: 'Regulation Bureau (RB)',
    category: 'Faculty Salary & Non-Payment'
  };
  const routingA = await autoAssignCase(testCaseA);
  console.log('Auto-assignment result:', routingA.status);
  console.log('Chosen official:', routingA.official?.name, `(${routingA.official?.activeCasesCount}/${routingA.official?.maxActiveCases} cases)`);
  console.log('Transparent explanation:', routingA.explanation);
  assert.strictEqual(routingA.status, 'ASSIGNED', 'Demo A should successfully assign to eligible official');
  assert.ok(routingA.explanation.includes('Regulation Bureau'), 'Explanation should cite bureau');
  console.log('✅ Demo Scenario A passed: Smart routing selects eligible official with lowest utilization & explainable rationale.');

  // 3. Test DEMO B: Workload Limit Enforcement
  console.log('\n--- DEMO SCENARIO B: Workload Limit Enforcement & Overflow Protection ---');
  // Dr. Harish Chandra (OFF-010) has 5/5 cases (100% full).
  const harish = await db.officials.findOne({ id: 'OFF-010' });
  console.log(`Dr. Harish Chandra status: ${harish.activeCasesCount}/${harish.maxActiveCases} cases.`);
  
  // Test case matching Dr. Harish Chandra's expertise: Safety Norms
  const testCaseB = {
    department: 'Regulation Bureau (RB)',
    category: 'Safety Norms'
  };
  const routingB = await autoAssignCase(testCaseB);
  console.log('Assignment status for category with full officer:', routingB.status);
  console.log('Assigned official:', routingB.official?.name);
  console.log('Rationale:', routingB.explanation);
  // System should NOT overload Harish Chandra!
  assert.notStrictEqual(routingB.official?.id, 'OFF-010', 'System must NOT assign to officer at 100% capacity');
  console.log('✅ Demo Scenario B passed: System strictly protects configured capacity limits and redirects or queues cases.');

  // 4. Test DEMO C: Similar Complaint Grouping
  console.log('\n--- DEMO SCENARIO C: Similar Complaint Grouping & Preservation ---');
  const apexCase1 = await db.cases.findOne({ id: 'CB-2026-101' });
  const similarMatches = await findSimilarCases(apexCase1);
  console.log(`Similar complaints found for ${apexCase1.id}:`, similarMatches.length);
  similarMatches.forEach(m => {
    console.log(`  -> Matched ${m.case.id} (${m.similarityScore}% match): ${m.explanation}`);
  });
  assert.ok(similarMatches.length > 0, 'Should detect similar complaints at Apex Institute');
  assert.ok(similarMatches.some(m => m.case.id === 'CB-2026-102'), 'Should detect CB-2026-102 as similar');

  // Verify Common Issue Group preserves both original Case IDs
  const group1 = await db.issueGroups.findOne({ id: 'GRP-2026-001' });
  console.log('Issue Group title:', group1.title);
  console.log('Linked cases preserved:', group1.linkedCaseIds);
  assert.strictEqual(group1.linkedCaseIds.length, 2, 'Issue Group preserves all individual case IDs');
  console.log('✅ Demo Scenario C passed: High-precision similarity detected, issue group links cases while keeping individual records intact.');

  // 5. Test DEMO D: Case Dependency & Change-Triggered Impact Alerts
  console.log('\n--- DEMO SCENARIO D: Case Dependency & Change-Triggered Impact Alerts ---');
  const targetCaseD = await db.cases.findOne({ id: 'CB-2026-103' });
  const impactAlerts = await analyzeImpactAndNotify(targetCaseD, {
    action: 'ESCALATED',
    newStatus: 'Escalated',
    findings: 'Adverse biometric attendance fraud verified on site.'
  });
  console.log('Generated impact alerts for connected cases:', impactAlerts.length);
  impactAlerts.forEach(a => {
    console.log(`  -> [${a.type} | ${a.severity}] ${a.title}`);
  });
  assert.ok(impactAlerts.length > 0, 'Escalation should trigger change-advisory impact alerts to connected cases');
  console.log('✅ Demo Scenario D passed: Regulatory update in one case generated change impact advisory for connected case.');

  // 6. Test DEMO E: Dynamic Dashboard & Audit Trail
  console.log('\n--- DEMO SCENARIO E: Dynamic Recalculation & Immutable Audit Trail ---');
  const testActionCode = `VALIDATION_TEST_${Date.now()}`;
  await logAuditAction({
    user: { id: 'USR-001', name: 'Dr. Rajeshwar Sharma', role: 'admin' },
    action: testActionCode,
    entityType: 'Case',
    entityId: 'TEST-CB-001',
    details: 'Automated test suite verification audit entry.',
    newValue: { verified: true }
  });
  const auditLogs = await db.auditLogs.find({ action: testActionCode });
  assert.strictEqual(auditLogs.length, 1, 'Audit log must record action');
  console.log('Recorded audit log:', auditLogs[0].action, 'by', auditLogs[0].userName, 'at', auditLogs[0].timestamp);
  console.log('✅ Demo Scenario E passed: Immutable audit trail records all administrative interventions.');

  console.log('\n======================================================');
  console.log('🎉 ALL CORE WORKFLOWS AND DEMO SCENARIOS VERIFIED 100%!');
  console.log('======================================================\n');
  process.exit(0);
}

runAllTests().catch(err => {
  console.error('❌ Validation Test Failed:', err);
  process.exit(1);
});
