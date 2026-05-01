const crypto = require('crypto');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@smartbugs.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';
const sessions = new Map();

function createAdminSession(email, password) {
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    throw new Error('Invalid admin email or password');
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    email,
    created_at: new Date().toISOString()
  });

  return {
    token,
    email
  };
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' ? token : null;
}

function requireAdmin(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token || !sessions.has(token)) {
    return res.status(401).json({
      error: 'Admin login required'
    });
  }

  req.admin = sessions.get(token);
  next();
}

function getAdminSession(req) {
  const token = getTokenFromRequest(req);
  return token && sessions.has(token) ? sessions.get(token) : null;
}

function clearAdminSession(req) {
  const token = getTokenFromRequest(req);
  if (token) {
    sessions.delete(token);
  }
}

module.exports = {
  ADMIN_EMAIL,
  createAdminSession,
  requireAdmin,
  getAdminSession,
  clearAdminSession
};
