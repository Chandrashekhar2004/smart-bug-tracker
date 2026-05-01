/**
 * Bug Routes - REST API endpoints for bug management
 */

const express = require('express');
const router = express.Router();
const bugController = require('../controllers/bugController');
const { requireAdmin } = require('../utils/adminAuth');

/**
 * POST /api/bugs - Create a new bug
 * Body: { title, description }
 * Returns: Created bug object with priority calculated
 */
router.post('/', (req, res) => {
  try {
    const { title, description } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'description']
      });
    }

    const bug = bugController.createBug({ title, description });
    res.status(201).json({
      success: true,
      message: 'Bug created successfully',
      data: bug
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * GET /api/bugs - Get all bugs with optional filters
 * Query params: priority (High/Medium/Low), status (Open/Closed), search
 * Returns: Array of bug objects
 */
router.get('/', (req, res) => {
  try {
    const filters = {
      priority: req.query.priority || null,
      status: req.query.status || null,
      search: req.query.search || null
    };

    const bugs = bugController.getAllBugs(filters);
    res.json({
      success: true,
      count: bugs.length,
      data: bugs
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/bugs/stats/overview - Get bug statistics
 * Returns: Statistics about bugs
 */
router.get('/stats/overview', (req, res) => {
  try {
    const stats = bugController.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/bugs/:id - Get a specific bug by ID
 * Returns: Single bug object
 */
router.get('/:id', (req, res) => {
  try {
    const bug = bugController.getBugById(req.params.id);
    
    if (!bug) {
      return res.status(404).json({
        error: 'Bug not found'
      });
    }

    res.json({
      success: true,
      data: bug
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * PUT /api/bugs/:id - Update bug status
 * Body: { status } - "Open" or "Closed"
 * Returns: Updated bug object
 */
router.put('/:id', requireAdmin, (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status field is required'
      });
    }

    const bug = bugController.updateBugStatus(req.params.id, status);
    res.json({
      success: true,
      message: `Bug status updated to ${status}`,
      data: bug
    });
  } catch (error) {
    if (error.message === 'Bug not found') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * DELETE /api/bugs/:id - Delete a bug
 * Returns: Success message
 */
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    bugController.deleteBug(req.params.id);
    res.json({
      success: true,
      message: 'Bug deleted successfully'
    });
  } catch (error) {
    if (error.message === 'Bug not found') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;
