/**
 * Main Module - Connects API and UI behavior
 */

const App = {
  searchTimer: null,

  async init() {
    UI.init();
    this.bindEvents();
    await this.refreshDashboard();
  },

  bindEvents() {
    UI.elements.bugForm.addEventListener('submit', event => this.handleBugSubmit(event));
    UI.elements.priorityFilter.addEventListener('change', () => this.loadBugs());
    UI.elements.statusFilter.addEventListener('change', () => this.loadBugs());
    UI.elements.resetFilters.addEventListener('click', () => this.handleResetFilters());
    UI.elements.searchInput.addEventListener('input', () => this.handleSearchInput());

    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(button => {
      button.addEventListener('click', () => UI.closeModal());
    });

    UI.elements.bugModal.addEventListener('click', event => {
      if (event.target === UI.elements.bugModal) {
        UI.closeModal();
      }
    });

    UI.elements.toggleStatusBtn.addEventListener('click', () => this.handleToggleStatus());
    UI.elements.deleteBugBtn.addEventListener('click', () => this.handleDeleteBug());
  },

  async refreshDashboard() {
    await Promise.all([
      this.loadBugs(),
      this.loadStats()
    ]);
  },

  async loadBugs() {
    try {
      const result = await API.getBugs(UI.getFilterValues());
      UI.renderBugsTable(result.data);
    } catch (error) {
      UI.showToast('Unable to load bugs', 'error');
      console.error(error);
    }
  },

  async loadStats() {
    try {
      const result = await API.getStatistics();
      UI.updateStats(result.data);
    } catch (error) {
      UI.showToast('Unable to load statistics', 'error');
      console.error(error);
    }
  },

  async handleBugSubmit(event) {
    event.preventDefault();

    const bugData = {
      title: UI.elements.bugTitle.value,
      description: UI.elements.bugDescription.value
    };

    try {
      await API.createBug(bugData);
      UI.showToast('Bug created successfully', 'success');
      UI.clearForm();
      await this.refreshDashboard();
    } catch (error) {
      UI.showToast(error.message, 'error');
    }
  },

  handleSearchInput() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadBugs(), 250);
  },

  async handleResetFilters() {
    UI.resetFilters();
    await this.loadBugs();
  },

  async handleToggleStatus() {
    const bugId = UI.elements.bugModal.dataset.bugId;
    if (!bugId) {
      return;
    }

    try {
      const currentBug = await API.getBugById(bugId);
      const nextStatus = currentBug.data.status === 'Open' ? 'Closed' : 'Open';
      await API.updateBugStatus(bugId, nextStatus);
      UI.showToast(`Bug marked as ${nextStatus}`, 'success');
      UI.closeModal();
      await this.refreshDashboard();
    } catch (error) {
      UI.showToast(error.message, 'error');
    }
  },

  async handleDeleteBug() {
    const bugId = UI.elements.bugModal.dataset.bugId;
    if (!bugId || !confirm('Delete this bug?')) {
      return;
    }

    try {
      await API.deleteBug(bugId);
      UI.showToast('Bug deleted successfully', 'success');
      UI.closeModal();
      await this.refreshDashboard();
    } catch (error) {
      UI.showToast(error.message, 'error');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
