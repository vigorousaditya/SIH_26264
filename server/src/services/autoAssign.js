const { db } = require('../storage/db');

/**
 * Executes Smart Official Workload & Auto-Assignment Algorithm (UVP 1)
 * @param {Object} caseData - The complaint details { department, category, institutionName, ... }
 * @returns {Promise<Object>} Assignment result with assignedOfficial, explanation, status ('ASSIGNED' | 'UNASSIGNED')
 */
async function autoAssignCase(caseData) {
  const { department, category } = caseData;

  // 1. Fetch all active officials
  const allOfficials = await db.officials.find({ active: true });

  // 2. Filter by department
  const deptOfficials = allOfficials.filter(off => 
    off.department.toLowerCase().trim() === department.toLowerCase().trim()
  );

  if (deptOfficials.length === 0) {
    return {
      status: 'UNASSIGNED',
      official: null,
      explanation: `No registered officials found in department "${department}". Case routed to Unassigned Queue for administrative review.`,
      reasonCategory: 'NO_DEPT_OFFICIALS'
    };
  }

  // 3. Exclude unavailable officials (e.g., 'On Leave', 'Unavailable', 'Busy')
  const availableOfficials = deptOfficials.filter(off => 
    off.availabilityStatus === 'Available'
  );

  if (availableOfficials.length === 0) {
    const leaveNames = deptOfficials.map(o => `${o.name} (${o.availabilityStatus})`).join(', ');
    return {
      status: 'UNASSIGNED',
      official: null,
      explanation: `All officials in ${department} are currently unavailable: ${leaveNames}. Case held in Unassigned Queue.`,
      reasonCategory: 'ALL_UNAVAILABLE'
    };
  }

  // 4. Exclude officials whose active case count has reached their configured limit
  const underLimitOfficials = availableOfficials.filter(off => 
    off.activeCasesCount < off.maxActiveCases
  );

  if (underLimitOfficials.length === 0) {
    const capacities = availableOfficials.map(o => `${o.name} (${o.activeCasesCount}/${o.maxActiveCases})`).join(', ');
    return {
      status: 'UNASSIGNED',
      official: null,
      explanation: `All available officials in ${department} have reached their configured workload limits: ${capacities}. Strictly avoiding overload; queued for administrator triage.`,
      reasonCategory: 'ALL_AT_CAPACITY'
    };
  }

  // 5. Categorize by expertise match
  const expertiseMatches = underLimitOfficials.filter(off => 
    Array.isArray(off.expertiseCategories) &&
    off.expertiseCategories.some(exp => 
      exp.toLowerCase().includes(category.toLowerCase()) || 
      category.toLowerCase().includes(exp.toLowerCase())
    )
  );

  const candidatePool = expertiseMatches.length > 0 ? expertiseMatches : underLimitOfficials;
  const isExpertiseMatch = expertiseMatches.length > 0;

  // 6. Sort candidate pool by lowest workload percentage, then active count, then deterministic ID tie-breaker
  candidatePool.sort((a, b) => {
    const loadA = a.activeCasesCount / a.maxActiveCases;
    const loadB = b.activeCasesCount / b.maxActiveCases;
    if (loadA !== loadB) return loadA - loadB; // lowest workload percentage first
    if (a.activeCasesCount !== b.activeCasesCount) return a.activeCasesCount - b.activeCasesCount;
    return a.id.localeCompare(b.id); // deterministic tie-breaker
  });

  const selected = candidatePool[0];
  const workloadPct = Math.round((selected.activeCasesCount / selected.maxActiveCases) * 100);

  // 7. Formulate clear, transparent explanation
  let explanation = `Assigned to ${selected.name} (${selected.designation}) because the officer belongs to ${selected.department}, `;
  if (isExpertiseMatch) {
    explanation += `possesses direct category expertise in "${category}", `;
  } else {
    explanation += `is the most balanced eligible officer in the bureau (secondary category fallback), `;
  }
  explanation += `is currently Available, and holds the lowest workload utilization (${selected.activeCasesCount} of ${selected.maxActiveCases} active cases, ${workloadPct}% capacity).`;

  return {
    status: 'ASSIGNED',
    official: selected,
    explanation,
    isExpertiseMatch,
    candidatePoolCount: candidatePool.length
  };
}

module.exports = {
  autoAssignCase
};
