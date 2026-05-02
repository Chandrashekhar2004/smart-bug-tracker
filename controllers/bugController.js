/**
 * Bug Controller - All bug CRUD + workflow actions
 * Statuses: Open → Assigned → Resolved → Closed (or back to Open)
 */

const fs   = require('fs');
const path = require('path');
const { calculatePriority } = require('../utils/priorityEngine');

const DATA_FILE = path.join(__dirname, '../data/bugs.json');

function ensureDataDirectory() {
  const dir = path.join(__dirname, '../data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readBugs() {
  ensureDataDirectory();
  try {
    if (!fs.existsSync(DATA_FILE)) { fs.writeFileSync(DATA_FILE, '[]'); return []; }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch { return []; }
}

function writeBugs(bugs) {
  ensureDataDirectory();
  fs.writeFileSync(DATA_FILE, JSON.stringify(bugs, null, 2));
}

function generateId() {
  return `BUG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ── CREATE ─────────────────────────────────────────────────────────────────────
function createBug(bugData, submittedBy) {
  if (!bugData.title?.trim())       throw new Error('Bug title is required');
  if (!bugData.description?.trim()) throw new Error('Bug description is required');

  const priorityInfo = calculatePriority(bugData.title, bugData.description);

  const bug = {
    id:               generateId(),
    title:            bugData.title.trim(),
    description:      bugData.description.trim(),
    priority:         priorityInfo.priority,
    score:            priorityInfo.score,
    confidence:       priorityInfo.confidence,
    keywords_matched: priorityInfo.total_keywords_matched,
    status:           'Open',        // Open | Assigned | Resolved | Closed
    submitted_by:     submittedBy || 'anonymous',
    assigned_to:      null,          // developer email
    resolved_notes:   null,
    created_at:       new Date().toISOString(),
    updated_at:       new Date().toISOString()
  };

  const bugs = readBugs();
  bugs.push(bug);
  writeBugs(bugs);
  return bug;
}

// ── READ ───────────────────────────────────────────────────────────────────────
function getAllBugs(filters = {}) {
  let bugs = readBugs();

  if (filters.priority && filters.priority !== 'All')
    bugs = bugs.filter(b => b.priority === filters.priority);

  if (filters.status && filters.status !== 'All')
    bugs = bugs.filter(b => b.status === filters.status);

  if (filters.assigned_to)
    bugs = bugs.filter(b => b.assigned_to === filters.assigned_to);

  if (filters.submitted_by)
    bugs = bugs.filter(b => b.submitted_by === filters.submitted_by);

  if (filters.search?.trim()) {
    const q = filters.search.toLowerCase().trim();
    bugs = bugs.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q)
    );
  }

  return bugs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getBugById(id) {
  return readBugs().find(b => b.id === id) || null;
}

// ── ADMIN: ASSIGN ──────────────────────────────────────────────────────────────
function assignBug(id, developerEmail) {
  if (!developerEmail) throw new Error('Developer email is required');

  const bugs = readBugs();
  const idx  = bugs.findIndex(b => b.id === id);
  if (idx === -1) throw new Error('Bug not found');
  if (bugs[idx].status !== 'Open') throw new Error('Only open bugs can be assigned');

  bugs[idx].assigned_to   = developerEmail;
  bugs[idx].status        = 'Assigned';
  bugs[idx].updated_at    = new Date().toISOString();

  writeBugs(bugs);
  return bugs[idx];
}

// ── DEVELOPER: RESOLVE ─────────────────────────────────────────────────────────
function resolveBug(id, resolvedNotes, developerEmail) {
  const bugs = readBugs();
  const idx  = bugs.findIndex(b => b.id === id);
  if (idx === -1) throw new Error('Bug not found');

  const bug = bugs[idx];
  if (bug.assigned_to !== developerEmail)
    throw new Error('This bug is not assigned to you');
  if (bug.status !== 'Assigned')
    throw new Error('Only assigned bugs can be marked as resolved');

  bug.status         = 'Resolved';
  bug.resolved_notes = (resolvedNotes || '').trim() || 'Marked as resolved.';
  bug.updated_at     = new Date().toISOString();

  writeBugs(bugs);
  return bug;
}

// ── ADMIN: CLOSE / REOPEN ──────────────────────────────────────────────────────
function updateBugStatus(id, status) {
  if (!['Open', 'Closed'].includes(status))
    throw new Error('Invalid status. Must be "Open" or "Closed"');

  const bugs = readBugs();
  const idx  = bugs.findIndex(b => b.id === id);
  if (idx === -1) throw new Error('Bug not found');
  const currentStatus = bugs[idx].status;

  if (status === 'Closed' && currentStatus !== 'Resolved')
    throw new Error('Only resolved bugs can be closed');
  if (status === 'Open' && !['Resolved', 'Closed'].includes(currentStatus))
    throw new Error('Only resolved or closed bugs can be reopened');

  bugs[idx].status     = status;
  bugs[idx].updated_at = new Date().toISOString();
  // Clear assignment if reopening
  if (status === 'Open') {
    bugs[idx].assigned_to   = null;
    bugs[idx].resolved_notes = null;
  }

  writeBugs(bugs);
  return bugs[idx];
}

// ── ADMIN: DELETE ──────────────────────────────────────────────────────────────
function deleteBug(id) {
  const bugs     = readBugs();
  const filtered = bugs.filter(b => b.id !== id);
  if (filtered.length === bugs.length) throw new Error('Bug not found');
  writeBugs(filtered);
  return true;
}

// ── STATS ──────────────────────────────────────────────────────────────────────
function getStatistics(filters = {}) {
  const bugs = getAllBugs(filters);
  return {
    total:       bugs.length,
    by_priority: {
      High:   bugs.filter(b => b.priority === 'High').length,
      Medium: bugs.filter(b => b.priority === 'Medium').length,
      Low:    bugs.filter(b => b.priority === 'Low').length
    },
    by_status: {
      Open:     bugs.filter(b => b.status === 'Open').length,
      Assigned: bugs.filter(b => b.status === 'Assigned').length,
      Resolved: bugs.filter(b => b.status === 'Resolved').length,
      Closed:   bugs.filter(b => b.status === 'Closed').length
    },
    average_confidence: bugs.length > 0
      ? Math.round(bugs.reduce((s, b) => s + b.confidence, 0) / bugs.length)
      : 0
  };
}

module.exports = {
  createBug, getAllBugs, getBugById,
  assignBug, resolveBug,
  updateBugStatus, deleteBug, getStatistics,
  readBugs, writeBugs
};
