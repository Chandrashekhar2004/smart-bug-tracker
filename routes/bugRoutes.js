/**
 * Bug Routes - REST API for all bug operations
 */

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/bugController');
const { requireAuth, requireAdmin, requireTester, requireDeveloper } = require('../utils/auth');
const { DEVELOPERS } = require('../utils/auth');

function canAccessBug(user, bug) {
  if (user.role === 'admin') return true;
  if (user.role === 'tester') return bug.submitted_by === user.email;
  if (user.role === 'developer') return bug.assigned_to === user.email;
  return false;
}

// POST /api/bugs — Tester submits a bug
router.post('/', requireTester, (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description)
      return res.status(400).json({ error: 'Title and description are required' });

    const bug = ctrl.createBug({ title, description }, req.user.email);
    res.status(201).json({ success: true, message: 'Bug submitted successfully', data: bug });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/bugs — Filtered list
router.get('/', requireAuth, (req, res) => {
  try {
    const filters = {
      priority:    req.query.priority    || null,
      status:      req.query.status      || null,
      search:      req.query.search      || null,
      assigned_to: req.query.assigned_to || null
    };

    // Testers see their submitted queries, developers see assigned work, admins see all.
    if (req.user.role === 'tester') {
      filters.submitted_by = req.user.email;
    }
    if (req.user.role === 'developer') {
      filters.assigned_to = req.user.email;
    }

    const bugs = ctrl.getAllBugs(filters);
    res.json({ success: true, count: bugs.length, data: bugs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bugs/stats/overview
router.get('/stats/overview', requireAuth, (req, res) => {
  try {
    const filters = {};
    if (req.user.role === 'tester') filters.submitted_by = req.user.email;
    if (req.user.role === 'developer') filters.assigned_to = req.user.email;
    res.json({ success: true, data: ctrl.getStatistics(filters) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bugs/developers — list of available developers (admin use)
router.get('/developers', requireAdmin, (req, res) => {
  res.json({ success: true, data: DEVELOPERS });
});

// GET /api/bugs/:id
router.get('/:id', requireAuth, (req, res) => {
  try {
    const bug = ctrl.getBugById(req.params.id);
    if (!bug) return res.status(404).json({ error: 'Bug not found' });
    if (!canAccessBug(req.user, bug))
      return res.status(403).json({ error: 'You do not have access to this bug' });
    res.json({ success: true, data: bug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bugs/:id/assign — Admin assigns bug to developer
router.put('/:id/assign', requireAdmin, (req, res) => {
  try {
    const { developer_email } = req.body;
    if (!developer_email) return res.status(400).json({ error: 'developer_email is required' });
    if (!DEVELOPERS.some(d => d.email === developer_email))
      return res.status(400).json({ error: 'Selected developer does not exist' });

    const bug = ctrl.assignBug(req.params.id, developer_email);
    res.json({ success: true, message: `Bug assigned to ${developer_email}`, data: bug });
  } catch (err) {
    const code = err.message === 'Bug not found' ? 404 : 400;
    res.status(code).json({ error: err.message });
  }
});

// PUT /api/bugs/:id/resolve — Developer marks bug resolved
router.put('/:id/resolve', requireDeveloper, (req, res) => {
  try {
    const { resolved_notes } = req.body;
    const bug = ctrl.resolveBug(req.params.id, resolved_notes, req.user.email);
    res.json({ success: true, message: 'Bug marked as resolved', data: bug });
  } catch (err) {
    const code = err.message === 'Bug not found' ? 404 : 400;
    res.status(code).json({ error: err.message });
  }
});

// PUT /api/bugs/:id — Admin close / reopen
router.put('/:id', requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const bug = ctrl.updateBugStatus(req.params.id, status);
    res.json({ success: true, message: `Bug status updated to ${status}`, data: bug });
  } catch (err) {
    const code = err.message === 'Bug not found' ? 404 : 400;
    res.status(code).json({ error: err.message });
  }
});

// DELETE /api/bugs/:id — Admin only
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    ctrl.deleteBug(req.params.id);
    res.json({ success: true, message: 'Bug deleted successfully' });
  } catch (err) {
    const code = err.message === 'Bug not found' ? 404 : 500;
    res.status(code).json({ error: err.message });
  }
});

module.exports = router;
