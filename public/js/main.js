/**
 * Main Module - Connects API and UI behavior
 */

const App = {
  searchTimer: null,
  adminToken: localStorage.getItem('adminToken'),
  adminEmail: null,
  isAdmin: false,

  async init() {
    UI.init();
    API.setAdminToken(this.adminToken);
    this.bindEvents();
    await this.loadAdminConfig();
    await this.restoreAdminSession();
    await this.refreshDashboard();
  },

  bindEvents() {
    UI.elements.bugForm.addEventListener('submit', event => this.handleBugSubmit(event));
    UI.elements.adminForm.addEventListener('submit', event => this.handleAdminLogin(event));
    UI.elements.adminLogout.addEventListener('click', () => this.handleAdminLogout());
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

  async loadAdminConfig() {
    try {
      const result = await API.getAdminConfig();
      UI.updateAdminHelp(result.data.admin_email);
    } catch (error) {
      console.error(error);
    }
  },

  async restoreAdminSession() {
    if (!this.adminToken) {
      UI.setAdminState(false);
      return;
    }

    try {
      const result = await API.getAdminProfile();
      this.isAdmin = result.data.authenticated;
      this.adminEmail = result.data.email;

      if (!this.isAdmin) {
        this.clearAdminSession();
      }

      UI.setAdminState(this.isAdmin, this.adminEmail);
    } catch (error) {
      this.clearAdminSession();
      UI.setAdminState(false);
    }
  },

  async handleAdminLogin(event) {
    event.preventDefault();

    try {
      const result = await API.loginAdmin({
        email: UI.elements.adminEmail.value,
        password: UI.elements.adminPassword.value
      });

      this.adminToken = result.data.token;
      this.adminEmail = result.data.email;
      this.isAdmin = true;
      localStorage.setItem('adminToken', this.adminToken);
      API.setAdminToken(this.adminToken);
      UI.elements.adminPassword.value = '';
      UI.setAdminState(true, this.adminEmail);
      UI.showToast('Admin login successful', 'success');
    } catch (error) {
      UI.showToast(error.message, 'error');
    }
  },

  async handleAdminLogout() {
    try {
      await API.logoutAdmin();
    } catch (error) {
      console.error(error);
    } finally {
      this.clearAdminSession();
      UI.setAdminState(false);
      UI.showToast('Admin logged out', 'info');
    }
  },

  clearAdminSession() {
    this.adminToken = null;
    this.adminEmail = null;
    this.isAdmin = false;
    localStorage.removeItem('adminToken');
    API.setAdminToken(null);
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

    if (!this.isAdmin) {
      UI.showToast('Admin login required to change status', 'error');
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

    if (!this.isAdmin) {
      UI.showToast('Admin login required to delete bugs', 'error');
      return;
    }

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

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
