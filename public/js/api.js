/**
 * API Module - Handles all communication with the backend
 */

const API = {
  BASE_URL: '/api',
  adminToken: null,

  setAdminToken(token) {
    this.adminToken = token;
  },

  /**
   * Make a fetch request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body data
   * @returns {Promise} - Response data
   */
  async request(method, endpoint, data = null, optionsOverride = {}) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (optionsOverride.admin && this.adminToken) {
      options.headers.Authorization = `Bearer ${this.adminToken}`;
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${this.BASE_URL}${endpoint}`, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An error occurred');
      }

      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * Create a new bug
   * @param {object} bugData - { title, description }
   * @returns {Promise} - Created bug object
   */
  async createBug(bugData) {
    return this.request('POST', '/bugs', bugData);
  },

  async getAdminConfig() {
    return this.request('GET', '/admin/config');
  },

  async loginAdmin(credentials) {
    return this.request('POST', '/admin/login', credentials);
  },

  async getAdminProfile() {
    return this.request('GET', '/admin/me', null, { admin: true });
  },

  async logoutAdmin() {
    return this.request('POST', '/admin/logout', null, { admin: true });
  },

  /**
   * Get all bugs with optional filters
   * @param {object} filters - { priority, status, search }
   * @returns {Promise} - Array of bugs
   */
  async getBugs(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.priority && filters.priority !== 'All') {
      params.append('priority', filters.priority);
    }
    if (filters.status && filters.status !== 'All') {
      params.append('status', filters.status);
    }
    if (filters.search && filters.search.trim()) {
      params.append('search', filters.search.trim());
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/bugs?${queryString}` : '/bugs';
    return this.request('GET', endpoint);
  },

  /**
   * Get a single bug by ID
   * @param {string} id - Bug ID
   * @returns {Promise} - Bug object
   */
  async getBugById(id) {
    return this.request('GET', `/bugs/${id}`);
  },

  /**
   * Update bug status
   * @param {string} id - Bug ID
   * @param {string} status - New status
   * @returns {Promise} - Updated bug object
   */
  async updateBugStatus(id, status) {
    return this.request('PUT', `/bugs/${id}`, { status }, { admin: true });
  },

  /**
   * Delete a bug
   * @param {string} id - Bug ID
   * @returns {Promise} - Success message
   */
  async deleteBug(id) {
    return this.request('DELETE', `/bugs/${id}`, null, { admin: true });
  },

  /**
   * Get bug statistics
   * @returns {Promise} - Statistics object
   */
  async getStatistics() {
    return this.request('GET', '/bugs/stats/overview');
  }
};

// Make API available globally
if (typeof window !== 'undefined') {
  window.API = API;
}
