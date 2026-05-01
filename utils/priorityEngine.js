/**
 * Priority Engine - Weighted Keyword Scoring System
 * Analyzes bug description and assigns priority based on keywords
 */

// Define keyword categories with their point values
const KEYWORD_WEIGHTS = {
  // High severity keywords (5 points each)
  high: [
    'crash', 'crashing', 'crashed',
    'payment', 'payment failed', 'transaction failed',
    'data loss', 'lost data', 'data corrupted', 'corruption',
    'security', 'breach', 'vulnerability', 'attack', 'hacked',
    'critical', 'urgent', 'emergency', 'severe',
    'cannot', 'blocked', 'cannot access', 'complete failure',
    'down', 'offline', 'not working', 'broken'
  ],
  // Medium severity keywords (3 points each)
  medium: [
    'slow', 'slowness', 'performance', 'lag', 'lagging',
    'delay', 'delayed', 'timeout',
    'incorrect', 'wrong', 'inconsistent', 'bug', 'issue',
    'error', 'fail', 'failure', 'not respond', 'hang',
    'missing', 'not displaying', 'not showing'
  ],
  // Low severity keywords (1 point each)
  low: [
    'ui', 'alignment', 'spacing', 'typo', 'spelling',
    'style', 'color', 'font', 'layout',
    'minor', 'small', 'cosmetic', 'appearance',
    'usability', 'ux', 'user experience'
  ]
};

/**
 * Calculates priority score based on keywords in bug description
 * @param {string} title - Bug title
 * @param {string} description - Bug description
 * @returns {object} - { score, priority, confidence, keywords_found }
 */
function calculatePriority(title, description) {
  // Combine title and description, convert to lowercase
  const fullText = `${title} ${description}`.toLowerCase();

  // Track found keywords and calculate score
  let score = 0;
  const keywordsFound = {
    high: [],
    medium: [],
    low: []
  };

  // Check high severity keywords
  KEYWORD_WEIGHTS.high.forEach(keyword => {
    if (fullText.includes(keyword)) {
      score += 5;
      keywordsFound.high.push(keyword);
    }
  });

  // Check medium severity keywords
  KEYWORD_WEIGHTS.medium.forEach(keyword => {
    if (fullText.includes(keyword)) {
      score += 3;
      keywordsFound.medium.push(keyword);
    }
  });

  // Check low severity keywords
  KEYWORD_WEIGHTS.low.forEach(keyword => {
    if (fullText.includes(keyword)) {
      score += 1;
      keywordsFound.low.push(keyword);
    }
  });

  // Determine priority level based on score
  let priority = 'Low';
  if (score >= 8) {
    priority = 'High';
  } else if (score >= 4) {
    priority = 'Medium';
  }

  // Calculate confidence percentage
  // Maximum possible score with all keywords = very high
  // Confidence increases with score
  const maxScore = 50; // Arbitrary max for calculation
  let confidence = Math.min((score / maxScore) * 100, 100);
  confidence = Math.round(confidence);

  return {
    score,
    priority,
    confidence,
    keywords_found: keywordsFound,
    total_keywords_matched: Object.values(keywordsFound).flat().length
  };
}

/**
 * Get priority color for UI display
 * @param {string} priority - Priority level (High, Medium, Low)
 * @returns {string} - CSS color class name
 */
function getPriorityColor(priority) {
  const colors = {
    'High': 'priority-high',
    'Medium': 'priority-medium',
    'Low': 'priority-low'
  };
  return colors[priority] || 'priority-low';
}

/**
 * Get priority display information
 * @param {string} priority - Priority level
 * @returns {object} - { level, icon, color }
 */
function getPriorityInfo(priority) {
  const info = {
    'High': { level: 'High', icon: '🔴', color: '#d32f2f' },
    'Medium': { level: 'Medium', icon: '🟡', color: '#f57c00' },
    'Low': { level: 'Low', icon: '🟢', color: '#388e3c' }
  };
  return info[priority] || info['Low'];
}

module.exports = {
  calculatePriority,
  getPriorityColor,
  getPriorityInfo,
  KEYWORD_WEIGHTS
};
