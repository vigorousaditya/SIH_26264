const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'casebridge_jwt_super_secret_key_sih2026_aicte';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No bearer token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired authentication token.' });
    }
    req.user = decodedUser;
    next();
  });
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No active session.' });
    }

    if (!Array.isArray(roles)) {
      roles = [roles];
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Forbidden: This action requires one of the following roles: [${roles.join(', ')}]. Current role: ${req.user.role}.` 
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET
};
