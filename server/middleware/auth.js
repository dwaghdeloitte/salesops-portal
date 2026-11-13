const jwt = require('jsonwebtoken');
const db = require('../db');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const row = db.prepare('SELECT is_active FROM users WHERE id=?').get(decoded.id);
    if (!row || !row.is_active) return res.status(401).json({ error: 'Account deactivated' });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

function managerOrAdmin(req, res, next) {
  if (!['admin', 'manager'].includes(req.user.role)) return res.status(403).json({ error: 'Manager or admin only' });
  next();
}

module.exports = { auth, adminOnly, managerOrAdmin };
