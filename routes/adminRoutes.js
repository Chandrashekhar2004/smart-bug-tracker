/**
 * Admin Routes - Login and session checks for admin-only actions
 */

const express = require('express');
const {
  ADMIN_EMAIL,
  createAdminSession,
  getAdminSession,
  clearAdminSession
} = require('../utils/adminAuth');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      admin_email: ADMIN_EMAIL
    }
  });
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Admin email and password are required'
      });
    }

    const session = createAdminSession(email.trim(), password);

    res.json({
      success: true,
      message: 'Admin login successful',
      data: session
    });
  } catch (error) {
    res.status(401).json({
      error: error.message
    });
  }
});

router.get('/me', (req, res) => {
  const session = getAdminSession(req);

  res.json({
    success: true,
    data: {
      authenticated: Boolean(session),
      email: session ? session.email : null
    }
  });
});

router.post('/logout', (req, res) => {
  clearAdminSession(req);

  res.json({
    success: true,
    message: 'Admin logged out'
  });
});

module.exports = router;
