const { db } = require('../storage/db');

/**
 * Appends a tamper-evident record to the system audit trail
 */
async function logAuditAction({
  user,
  action,
  entityType,
  entityId,
  details,
  previousValue = null,
  newValue = null,
  ipAddress = '127.0.0.1'
}) {
  try {
    const record = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: user?.id || 'SYSTEM',
      userName: user?.name || 'Automated Engine',
      userRole: user?.role || 'system',
      action,
      entityType,
      entityId,
      details,
      previousValue,
      newValue,
      ipAddress,
      timestamp: new Date().toISOString()
    };

    await db.auditLogs.create(record);
    return record;
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = {
  logAuditAction
};
