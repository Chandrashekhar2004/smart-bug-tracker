/**
 * Auth Module - Multi-role authentication (Tester, Admin, Developer)
 */

const crypto = require('crypto');

// All users with their roles
const USERS = [
  { email: 'admin@bugtrack.local',  password: 'Admin@12345', role: 'admin',     name: 'Admin'       },
  { email: 'tester@bugtrack.local', password: 'Tester@123',  role: 'tester',    name: 'QA Tester'   },
  { email: 'dev1@bugtrack.local',   password: 'Dev@12345',   role: 'developer', name: 'Developer 1' },
  { email: 'dev2@bugtrack.local',   password: 'Dev@12345',   role: 'developer', name: 'Developer 2' },
];

// Get all developers for admin assignment dropdown
const DEVELOPERS = USERS.filter(u => u.role === 'developer').map(u => ({ email: u.email, name: u.name }));

// In-memory session store: token -> { email, role, name }
const sessions = new Map();

function createSession(email, password) {
  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user) throw new Error('Invalid email or password');

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    email: user.email,
    role:  user.role,
    name:  user.name,
    created_at: new Date().toISOString()
  });

  return { token, email: user.email, role: user.role, name: user.name };
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' ? token : null;
}

function getSession(req) {
  const token = getTokenFromRequest(req);
  return token && sessions.has(token) ? sessions.get(token) : null;
}

function clearSession(req) {
  const token = getTokenFromRequest(req);
  if (token) sessions.delete(token);
}

// Middleware: any authenticated user
function requireAuth(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  req.user = session;
  next();
}

// Middleware: only admin
function requireAdmin(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  req.user = session;
  next();
}

// Middleware: only tester
function requireTester(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  if (session.role !== 'tester') return res.status(403).json({ error: 'Tester access required' });
  req.user = session;
  next();
}

// Middleware: only developer
function requireDeveloper(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  if (session.role !== 'developer') return res.status(403).json({ error: 'Developer access required' });
  req.user = session;
  next();
}

module.exports = {
  USERS,
  DEVELOPERS,
  createSession,
  getSession,
  clearSession,
  requireAuth,
  requireAdmin,
  requireTester,
  requireDeveloper
};
