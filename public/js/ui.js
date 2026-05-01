/**
 * UI Module - Handles all UI rendering and interactions
 */

const UI = {
  // Cache DOM elements
  elements: {},

  /**
   * Initialize UI by caching DOM elements
   */
  init() {
    this.elements = {
      // Form elements
      bugForm: document.getElementById('bugForm'),
      bugTitle: document.getElementById('bugTitle'),
      bugDescription: document.getElementById('bugDescription'),

      // Stats
      totalBugs: document.getElementById('totalBugs'),
      openBugs: document.getElementById('openBugs'),
      highBugs: document.getElementById('highBugs'),

      // Table and controls
      bugsTableBody: document.getElementById('bugsTableBody'),
      searchInput: document.getElementById('searchInput'),
      priorityFilter: document.getElementById('priorityFilter'),
      statusFilter: document.getElementById('statusFilter'),
      resetFilters: document.getElementById('resetFilters'),

      // Modal
      bugModal: document.getElementById('bugModal'),
      bugModalBody: document.getElementById('bugModalBody'),
      toggleStatusBtn: document.getElementById('toggleStatusBtn'),
      deleteBugBtn: document.getElementById('deleteBugBtn'),

      // Toast
      toast: document.getElementById('toast')
    };
  },

  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @param {string} type - success, error, info (default)
   * @param {number} duration - Duration in ms
   */
  showToast(message, type = 'info', duration = 3000) {
    const toast = this.elements.toast;
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  },

  /**
   * Render bugs table
   * @param {array} bugs - Array of bug objects
   */
  renderBugsTable(bugs) {
    const tbody = this.elements.bugsTableBody;

    if (bugs.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-state">
          <td colspan="7">
            <p>📭 No bugs found. Try adjusting your filters or submit a new bug.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = bugs.map(bug => this.createBugRow(bug)).join('');
  },

  /**
   * Create a single bug table row
   * @param {object} bug - Bug object
   * @returns {string} - HTML row string
   */
  createBugRow(bug) {
    const priorityIcon = this.getPriorityIcon(bug.priority);
    const statusIcon = bug.status === 'Open' ? '📂' : '✅';
    const createdDate = this.formatDate(bug.created_at);

    return `
      <tr data-bug-id="${bug.id}">
        <td>
          <span class="bug-id">${bug.id}</span>
        </td>
        <td>
          <span class="bug-title">${this.escapeHtml(bug.title)}</span>
        </td>
        <td>
          <span class="priority-badge priority-${bug.priority.toLowerCase()}">
            ${priorityIcon} ${bug.priority}
          </span>
        </td>
        <td>
          <span class="status-badge status-${bug.status.toLowerCase()}">
            ${statusIcon} ${bug.status}
          </span>
        </td>
        <td>
          <div class="confidence-meter">
            <div class="confidence-bar">
              <div class="confidence-fill" style="width: ${bug.confidence}%"></div>
            </div>
            <span>${bug.confidence}%</span>
          </div>
        </td>
        <td>
          <span class="bug-date">${createdDate}</span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-primary btn-small" onclick="UI.openBugModal('${bug.id}')">View</button>
          </div>
        </td>
      </tr>
    `;
  },

  /**
   * Get priority icon
   * @param {string} priority - Priority level
   * @returns {string} - Icon emoji
   */
  getPriorityIcon(priority) {
    const icons = {
      'High': '🔴',
      'Medium': '🟡',
      'Low': '🟢'
    };
    return icons[priority] || '⚪';
  },

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} - Formatted date
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if date is today
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    // Check if date is yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Format as MM/DD/YY
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  },

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Open bug details modal
   * @param {string} bugId - Bug ID
   */
  async openBugModal(bugId) {
    try {
      const result = await API.getBugById(bugId);
      const bug = result.data;

      this.elements.bugModalBody.innerHTML = this.createBugDetailsHTML(bug);
      this.elements.bugModal.classList.add('active');

      // Store current bug ID for actions
      this.elements.bugModal.dataset.bugId = bugId;

      // Update toggle status button text
      const buttonText = bug.status === 'Open' ? 'Mark as Closed' : 'Mark as Open';
      this.elements.toggleStatusBtn.textContent = buttonText;
    } catch (error) {
      this.showToast('Error loading bug details', 'error');
      console.error(error);
    }
  },

  /**
   * Create HTML for bug details
   * @param {object} bug - Bug object
   * @returns {string} - HTML string
   */
  createBugDetailsHTML(bug) {
    const priorityIcon = this.getPriorityIcon(bug.priority);
    const statusIcon = bug.status === 'Open' ? '📂' : '✅';
    const createdDate = new Date(bug.created_at).toLocaleString();
    const updatedDate = new Date(bug.updated_at).toLocaleString();

    return `
      <div class="modal-detail-row">
        <div class="modal-detail-label">Bug ID</div>
        <div class="modal-detail-value">${bug.id}</div>
      </div>

      <div class="modal-detail-row">
        <div class="modal-detail-label">Title</div>
        <div class="modal-detail-value">${this.escapeHtml(bug.title)}</div>
      </div>

      <div class="modal-detail-row">
        <div class="modal-detail-label">Description</div>
        <div class="modal-detail-value" style="white-space: pre-wrap;">
          ${this.escapeHtml(bug.description)}
        </div>
      </div>

      <div class="modal-detail-row">
        <div class="modal-detail-label">Priority</div>
        <div class="modal-detail-value">
          <span class="priority-badge priority-${bug.priority.toLowerCase()}">
            ${priorityIcon} ${bug.priority}
          </span>
        </div>
      </div>

      <div class="modal-detail-row">
        <div class="modal-detail-label">Priority Score</div>
        <div class="modal-detail-value">${bug.score} points</div>
      </div>

      <div class="modal-detail-row">
        <div class="modal-detail-label">Confidence</div>
        <div class="modal-detail-value">
          <div class="confidence-meter">
            <div class="confidence-bar" style="width: 150px;">
              <div class="confidence-fill" style="width: ${bug.confidence}%"></div>
            </div>
            <span>${bug.confidence}%</span>
          </div>
        </div>
      </div>

      <div class="modal-detail-row">
        <div class="modal-detail-label">Keywords Matched</div>
        <div class="modal-detail-value">${bug.keywords_matched} keywords</div>
      </div>

      <div class="modal-detail-row">
        <div class="modal-detail-label">Status</div>
        <div class="modal-detail-value">
          <span class="status-badge status-${bug.status.toLowerCase()}">
            ${statusIcon} ${bug.status}
          </span>
        </div>
      </div>

      <div class="modal-detail-row">
        <div class="modal-detail-label">Created</div>
        <div class="modal-detail-value">${createdDate}</div>
      </div>

      <div class="modal-detail-row">
        <div class="modal-detail-label">Last Updated</div>
        <div class="modal-detail-value">${updatedDate}</div>
      </div>
    `;
  },

  /**
   * Close modal
   */
  closeModal() {
    this.elements.bugModal.classList.remove('active');
    this.elements.bugModal.dataset.bugId = '';
  },

  /**
   * Update stats display
   * @param {object} stats - Statistics object
   */
  updateStats(stats) {
    this.elements.totalBugs.textContent = stats.total;
    this.elements.openBugs.textContent = stats.by_status.Open;
    this.elements.highBugs.textContent = stats.by_priority.High;
  },

  /**
   * Clear form
   */
  clearForm() {
    this.elements.bugForm.reset();
    this.elements.bugTitle.focus();
  },

  /**
   * Get filter values
   * @returns {object} - { priority, status, search }
   */
  getFilterValues() {
    return {
      priority: this.elements.priorityFilter.value,
      status: this.elements.statusFilter.value,
      search: this.elements.searchInput.value
    };
  },

  /**
   * Reset filters
   */
  resetFilters() {
    this.elements.searchInput.value = '';
    this.elements.priorityFilter.value = 'All';
    this.elements.statusFilter.value = 'All';
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UI.init());
} else {
  UI.init();
}
