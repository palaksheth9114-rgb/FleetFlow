const jwt = require('jsonwebtoken');
const db = require('../db');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Unauthorized: Access token missing' });

  const secret = process.env.JWT_SECRET || 'fleetflow_default_jwt_secret_key';
  jwt.verify(token, secret, async (err, decodedUser) => {
    if (err) return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
    
    try {
      // Check database to verify user still exists and account is active
      const [rows] = await db.query('SELECT id, username, role, is_active FROM users WHERE id = ?', [decodedUser.id]);
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Unauthorized: User account no longer exists' });
      }

      const user = rows[0];
      if (user.is_active === 0 || user.is_active === false) {
        return res.status(403).json({ message: 'Forbidden: Account has been deactivated. Please contact an administrator.' });
      }

      req.user = user;
      next();
    } catch (dbErr) {
      return res.status(500).json({ message: 'Internal server error during authentication' });
    }
  });
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticateToken, requireRole };
