/**
 * Auth Routes - Login / logout / profile for all roles
 */

const express = require('express');
const { DEVELOPERS, createSession, getSession, clearSession, requireAuth } = require('../utils/auth');
const router = express.Router();

// GET /api/auth/config — expose available developer list & demo credentials
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      developers: DEVELOPERS,
      demo_credentials: [
        { role: 'tester',    email: 'tester@bugtrack.local', password: 'Tester@123'  },
        { role: 'admin',     email: 'admin@bugtrack.local',  password: 'Admin@12345' },
        { role: 'developer', email: 'dev1@bugtrack.local',   password: 'Dev@12345'   },
        { role: 'developer', email: 'dev2@bugtrack.local',   password: 'Dev@12345'   },
      ]
    }
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const session = createSession(email.trim(), password);
    res.json({ success: true, message: 'Login successful', data: session });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const session = getSession(req);
  res.json({
    success: true,
    data: {
      authenticated: Boolean(session),
      email: session?.email || null,
      role:  session?.role  || null,
      name:  session?.name  || null
    }
  });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  clearSession(req);
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
