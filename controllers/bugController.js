/**
 * Bug Controller - Handles all bug-related business logic
 */

const fs = require('fs');
const path = require('path');
const { calculatePriority } = require('../utils/priorityEngine');

// Path to data file
const DATA_FILE = path.join(__dirname, '../data/bugs.json');

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Read all bugs from JSON file
 * @returns {array} - Array of bug objects
 */
function readBugs() {
  ensureDataDirectory();
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading bugs:', error);
    return [];
  }
}

/**
 * Write bugs to JSON file
 * @param {array} bugs - Array of bug objects
 */
function writeBugs(bugs) {
  ensureDataDirectory();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(bugs, null, 2));
  } catch (error) {
    console.error('Error writing bugs:', error);
    throw new Error('Failed to save bug data');
  }
}

/**
 * Generate unique ID for bug
 * @returns {string} - Unique ID
 */
function generateId() {
  return `BUG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new bug with automatic priority calculation
 * @param {object} bugData - { title, description }
 * @returns {object} - Created bug object
 */
function createBug(bugData) {
  // Validate input
  if (!bugData.title || !bugData.title.trim()) {
    throw new Error('Bug title is required');
  }
  if (!bugData.description || !bugData.description.trim()) {
    throw new Error('Bug description is required');
  }

  // Calculate priority using priority engine
  const priorityInfo = calculatePriority(bugData.title, bugData.description);

  // Create bug object
  const bug = {
    id: generateId(),
    title: bugData.title.trim(),
    description: bugData.description.trim(),
    priority: priorityInfo.priority,
    score: priorityInfo.score,
    confidence: priorityInfo.confidence,
    keywords_matched: priorityInfo.total_keywords_matched,
    status: 'Open', // Open or Closed
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Read existing bugs, add new one, save
  const bugs = readBugs();
  bugs.push(bug);
  writeBugs(bugs);

  return bug;
}

/**
 * Get all bugs, optionally filtered
 * @param {object} filters - { priority, status, search }
 * @returns {array} - Array of bug objects
 */
function getAllBugs(filters = {}) {
  let bugs = readBugs();

  // Filter by priority if specified
  if (filters.priority && filters.priority !== 'All') {
    bugs = bugs.filter(bug => bug.priority === filters.priority);
  }

  // Filter by status if specified
  if (filters.status && filters.status !== 'All') {
    bugs = bugs.filter(bug => bug.status === filters.status);
  }

  // Search in title and description if search term provided
  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.toLowerCase().trim();
    bugs = bugs.filter(bug =>
      bug.title.toLowerCase().includes(searchTerm) ||
      bug.description.toLowerCase().includes(searchTerm) ||
      bug.id.toLowerCase().includes(searchTerm)
    );
  }

  // Sort by creation date (newest first)
  bugs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return bugs;
}

/**
 * Get a single bug by ID
 * @param {string} id - Bug ID
 * @returns {object|null} - Bug object or null if not found
 */
function getBugById(id) {
  const bugs = readBugs();
  return bugs.find(bug => bug.id === id) || null;
}

/**
 * Update bug status
 * @param {string} id - Bug ID
 * @param {string} status - New status (Open or Closed)
 * @returns {object} - Updated bug object
 */
function updateBugStatus(id, status) {
  // Validate status
  if (!['Open', 'Closed'].includes(status)) {
    throw new Error('Invalid status. Must be "Open" or "Closed"');
  }

  const bugs = readBugs();
  const bugIndex = bugs.findIndex(bug => bug.id === id);

  if (bugIndex === -1) {
    throw new Error('Bug not found');
  }

  // Update status and timestamp
  bugs[bugIndex].status = status;
  bugs[bugIndex].updated_at = new Date().toISOString();

  writeBugs(bugs);
  return bugs[bugIndex];
}

/**
 * Delete a bug
 * @param {string} id - Bug ID
 * @returns {boolean} - True if deleted
 */
function deleteBug(id) {
  const bugs = readBugs();
  const initialLength = bugs.length;
  const filtered = bugs.filter(bug => bug.id !== id);

  if (filtered.length === initialLength) {
    throw new Error('Bug not found');
  }

  writeBugs(filtered);
  return true;
}

/**
 * Get priority statistics
 * @returns {object} - Statistics about bugs
 */
function getStatistics() {
  const bugs = readBugs();

  const stats = {
    total: bugs.length,
    by_priority: {
      High: bugs.filter(b => b.priority === 'High').length,
      Medium: bugs.filter(b => b.priority === 'Medium').length,
      Low: bugs.filter(b => b.priority === 'Low').length
    },
    by_status: {
      Open: bugs.filter(b => b.status === 'Open').length,
      Closed: bugs.filter(b => b.status === 'Closed').length
    },
    average_confidence: bugs.length > 0 
      ? Math.round(bugs.reduce((sum, b) => sum + b.confidence, 0) / bugs.length)
      : 0
  };

  return stats;
}

module.exports = {
  createBug,
  getAllBugs,
  getBugById,
  updateBugStatus,
  deleteBug,
  getStatistics,
  readBugs,
  writeBugs
};
