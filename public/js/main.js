/**
 * Main App — role-based logic and event handling
 */
const App = {
  user:          null,
  developers:    [],
  searchTimer:   null,
  pendingBugId:  null,
  adminTab:      'all',   // 'all' | 'pending' | 'resolved'

  // ── INIT ────────────────────────────────────────────────────────────────────
  async init() {
    const token = sessionStorage.getItem('token');
    if (token) {
      API.setToken(token);
      try {
        const r = await API.getMe();
        if (r.data.authenticated) {
          this.user = r.data;
          await this.loadDeveloperList();
          this.showDashboard();
          this.loadDashboard();
          return;
        }
      } catch {}
    }
    // Show login screen
    document.getElementById('loginScreen').classList.remove('hidden');
  },

  // ── LOGIN ────────────────────────────────────────────────────────────────────
  async login(role) {
    const emailMap = { tester: 'testerEmail', admin: 'adminEmail', developer: 'devEmail' };
    const passMap  = { tester: 'testerPassword', admin: 'adminPassword', developer: 'devPassword' };
    const errMap   = { tester: 'testerError', admin: 'adminError', developer: 'devError' };

    const email    = document.getElementById(emailMap[role]).value.trim();
    const password = document.getElementById(passMap[role]).value;
    const errEl    = document.getElementById(errMap[role]);
    errEl.textContent = '';

    if (!email || !password) {
      errEl.textContent = 'Please enter ID and password.';
      return;
    }

    try {
      const r = await API.login(email, password);
      if (r.data.role !== role && !(role === 'developer' && r.data.role === 'developer')) {
        // allow any developer account for that panel
        if (r.data.role !== role) {
          errEl.textContent = `This account is a "${r.data.role}", not a "${role}".`;
          return;
        }
      }
      sessionStorage.setItem('token', r.data.token);
      API.setToken(r.data.token);
      this.user = r.data;
      await this.loadDeveloperList();
      this.showDashboard();
      this.loadDashboard();
    } catch (err) {
      errEl.textContent = err.message;
    }
  },

  // ── LOGOUT ──────────────────────────────────────────────────────────────────
  async logout() {
    try { await API.logout(); } catch {}
    sessionStorage.removeItem('token');
    API.setToken(null);
    this.user = null;
    location.reload();
  },

  // ── SHOW CORRECT DASHBOARD ───────────────────────────────────────────────────
  showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');

    // User badge
    const roleIcons = { tester: '🧪', admin: '🛡️', developer: '💻' };
    document.getElementById('userBadge').innerHTML =
      `${roleIcons[this.user.role] || ''} <strong>${this.user.name}</strong> <small>(${this.user.role})</small>`;

    // Show the right dashboard
    ['testerDashboard', 'adminDashboard', 'developerDashboard'].forEach(id =>
      document.getElementById(id).classList.add('hidden'));

    const dashMap = { tester: 'testerDashboard', admin: 'adminDashboard', developer: 'developerDashboard' };
    document.getElementById(dashMap[this.user.role]).classList.remove('hidden');
  },

  // ── LOAD DASHBOARD DATA ──────────────────────────────────────────────────────
  async loadDashboard() {
    await this.loadStats();
    const roleLoader = {
      tester:    () => this.loadTesterBugs(),
      admin:     () => this.loadAdminBugs(),
      developer: () => this.loadDevBugs()
    };
    await roleLoader[this.user.role]?.();
  },

  async loadStats() {
    try {
      const r = await API.getStats();
      const s = r.data;
      document.getElementById('statTotal').textContent    = s.total;
      document.getElementById('statOpen').textContent     = s.by_status.Open    || 0;
      document.getElementById('statAssigned').textContent = s.by_status.Assigned || 0;
      document.getElementById('statResolved').textContent = s.by_status.Resolved || 0;
      document.getElementById('statClosed').textContent   = s.by_status.Closed   || 0;
    } catch {}
  },

  // ── TESTER ──────────────────────────────────────────────────────────────────
  async handleBugSubmit(e) {
    e.preventDefault();
    try {
      await API.createBug({
        title:       document.getElementById('bugTitle').value,
        description: document.getElementById('bugDescription').value
      });
      this.toast('Query submitted to Admin successfully.', 'success');
      document.getElementById('bugForm').reset();
      await this.loadDashboard();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  },

  async loadTesterBugs() {
    const filters = {
      status: document.getElementById('testerStatusFilter')?.value || 'All',
      search: document.getElementById('testerSearch')?.value || ''
    };
    try {
      const r = await API.getBugs(filters);
      this.renderTable('testerTableBody', r.data, 'tester');
    } catch (err) { this.toast(err.message, 'error'); }
  },

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  switchAdminTab(tab, btn) {
    this.adminTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const statusEl = document.getElementById('adminStatusFilter');
    if (tab === 'pending')  { statusEl.value = 'Open';     }
    if (tab === 'resolved') { statusEl.value = 'Resolved'; }
    if (tab === 'all')      { statusEl.value = 'All';      }
    this.loadAdminBugs();
  },

  async loadAdminBugs() {
    const filters = {
      priority: document.getElementById('adminPriorityFilter')?.value || 'All',
      status:   document.getElementById('adminStatusFilter')?.value   || 'All',
      search:   document.getElementById('adminSearch')?.value         || ''
    };
    try {
      const r = await API.getBugs(filters);
      this.renderTable('adminTableBody', r.data, 'admin');
    } catch (err) { this.toast(err.message, 'error'); }
  },

  // ── DEVELOPER ───────────────────────────────────────────────────────────────
  async loadDevBugs() {
    const filters = {
      status: document.getElementById('devStatusFilter')?.value || 'All',
      search: document.getElementById('devSearch')?.value || ''
    };
    try {
      const r = await API.getBugs(filters);
      this.renderTable('devTableBody', r.data, 'developer');
    } catch (err) { this.toast(err.message, 'error'); }
  },

  // ── DEVELOPER LIST ───────────────────────────────────────────────────────────
  async loadDeveloperList() {
    if (this.user?.role !== 'admin') return;
    try {
      const r = await API.getDevelopers();
      this.developers = r.data;
    } catch {}
  },

  // ── DEBOUNCED SEARCH ─────────────────────────────────────────────────────────
  debouncedLoad() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      if (this.user?.role === 'tester')    this.loadTesterBugs();
      if (this.user?.role === 'admin')     this.loadAdminBugs();
      if (this.user?.role === 'developer') this.loadDevBugs();
    }, 250);
  },

  // ── TABLE RENDERING ──────────────────────────────────────────────────────────
  renderTable(tbodyId, bugs, role) {
    const tbody = document.getElementById(tbodyId);
    if (!bugs.length) {
      const msgs = {
        tester:    'No queries found. Submit your first query.',
        admin:     'No queries match your filters.',
        developer: 'No queries assigned to you yet.'
      };
      tbody.innerHTML = `<tr class="empty-row"><td colspan="9">${msgs[role]}</td></tr>`;
      return;
    }

    tbody.innerHTML = bugs.map(bug => this.buildRow(bug, role)).join('');
  },

  buildRow(bug, role) {
    const pi    = this.priorityIcon(bug.priority);
    const si    = this.statusIcon(bug.status);
    const date  = this.fmtDate(bug.created_at);
    const esc   = t => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };

    const viewBtn = `<button class="btn btn-sm btn-outline" onclick="App.openModal('${bug.id}')">View</button>`;

    if (role === 'tester') {
      return `<tr>
        <td><code class="bug-id">${bug.id.slice(0,12)}…</code></td>
        <td>${esc(bug.title)}</td>
        <td><span class="badge badge-${bug.priority.toLowerCase()}">${pi} ${bug.priority}</span></td>
        <td><span class="status-tag status-${bug.status.toLowerCase()}">${si} ${bug.status}</span></td>
        <td>${bug.assigned_to ? `<code>${bug.assigned_to}</code>` : '<span class="muted">—</span>'}</td>
        <td>${date}</td>
        <td>${viewBtn}</td>
      </tr>`;
    }

    if (role === 'admin') {
      const assignBtn = (bug.status === 'Open')
        ? `<button class="btn btn-sm btn-admin" onclick="App.openAssignModal('${bug.id}')">Assign</button>`
        : '';
      const closeBtn = (bug.status === 'Resolved')
        ? `<button class="btn btn-sm btn-tester" onclick="App.closeBug('${bug.id}')">Close</button>
           <button class="btn btn-sm btn-outline" onclick="App.reopenBug('${bug.id}')">Keep Open</button>`
        : '';
      const deleteBtn = `<button class="btn btn-sm btn-danger" onclick="App.deleteBug('${bug.id}')">Delete</button>`;
      return `<tr>
        <td><code class="bug-id">${bug.id.slice(0,12)}…</code></td>
        <td>${esc(bug.title)}</td>
        <td><span class="badge badge-${bug.priority.toLowerCase()}">${pi} ${bug.priority}</span></td>
        <td><span class="status-tag status-${bug.status.toLowerCase()}">${si} ${bug.status}</span></td>
        <td><code>${bug.submitted_by || '—'}</code></td>
        <td>${bug.assigned_to ? `<code>${bug.assigned_to}</code>` : '<span class="muted">—</span>'}</td>
        <td>${date}</td>
        <td class="action-cell">${viewBtn} ${assignBtn} ${closeBtn} ${deleteBtn}</td>
      </tr>`;
    }

    if (role === 'developer') {
      const resolveBtn = bug.status === 'Assigned'
        ? `<button class="btn btn-sm btn-dev" onclick="App.openResolveModal('${bug.id}')">Report Resolved</button>`
        : '';
      return `<tr>
        <td><code class="bug-id">${bug.id.slice(0,12)}…</code></td>
        <td>${esc(bug.title)}</td>
        <td><span class="badge badge-${bug.priority.toLowerCase()}">${pi} ${bug.priority}</span></td>
        <td><span class="status-tag status-${bug.status.toLowerCase()}">${si} ${bug.status}</span></td>
        <td><code>${bug.submitted_by || '—'}</code></td>
        <td>${date}</td>
        <td class="action-cell">${viewBtn} ${resolveBtn}</td>
      </tr>`;
    }
    return '';
  },

  // ── BUG DETAIL MODAL ─────────────────────────────────────────────────────────
  async openModal(id) {
    try {
      const r   = await API.getBugById(id);
      const bug = r.data;
      this.pendingBugId = id;

      const esc  = t => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
      const pi   = this.priorityIcon(bug.priority);
      const si   = this.statusIcon(bug.status);

      document.getElementById('modalTitle').textContent = `Query: ${bug.id}`;
      document.getElementById('modalBody').innerHTML = `
        <div class="detail-grid">
          <div class="detail-row"><span class="detail-label">Title</span><span>${esc(bug.title)}</span></div>
          <div class="detail-row"><span class="detail-label">Description</span><span style="white-space:pre-wrap">${esc(bug.description)}</span></div>
          <div class="detail-row"><span class="detail-label">Priority</span>
            <span class="badge badge-${bug.priority.toLowerCase()}">${pi} ${bug.priority} (score: ${bug.score}, confidence: ${bug.confidence}%)</span></div>
          <div class="detail-row"><span class="detail-label">Status</span>
            <span class="status-tag status-${bug.status.toLowerCase()}">${si} ${bug.status}</span></div>
          <div class="detail-row"><span class="detail-label">Submitted By</span><code>${bug.submitted_by || '—'}</code></div>
          <div class="detail-row"><span class="detail-label">Assigned To</span><code>${bug.assigned_to || '—'}</code></div>
          ${bug.resolved_notes ? `<div class="detail-row"><span class="detail-label">Resolution Notes</span><span style="white-space:pre-wrap">${esc(bug.resolved_notes)}</span></div>` : ''}
          <div class="detail-row"><span class="detail-label">Created</span>${new Date(bug.created_at).toLocaleString()}</div>
          <div class="detail-row"><span class="detail-label">Updated</span>${new Date(bug.updated_at).toLocaleString()}</div>
        </div>`;

      // Actions for admin in modal
      const actEl = document.getElementById('modalActions');
      actEl.innerHTML = '';
      if (this.user?.role === 'admin') {
        if (bug.status === 'Open') {
          const ab = document.createElement('button');
          ab.className = 'btn btn-admin'; ab.textContent = '🔧 Assign to Developer';
          ab.onclick = () => { this.closeModal(); this.openAssignModal(id); };
          actEl.appendChild(ab);
        }
        if (bug.status === 'Resolved') {
          const cb = document.createElement('button');
          cb.className = 'btn btn-tester'; cb.textContent = 'Close Query';
          cb.onclick = () => this.closeBug(id);
          actEl.appendChild(cb);
          const rb = document.createElement('button');
          rb.className = 'btn btn-outline'; rb.textContent = 'Keep Open';
          rb.onclick = () => this.reopenBug(id);
          actEl.appendChild(rb);
        }
        const db = document.createElement('button');
        db.className = 'btn btn-danger'; db.textContent = '🗑️ Delete';
        db.onclick = () => this.deleteBug(id);
        actEl.appendChild(db);
      }
      if (this.user?.role === 'developer' && bug.status === 'Assigned') {
        const rb = document.createElement('button');
          rb.className = 'btn btn-dev'; rb.textContent = 'Report Resolved';
        rb.onclick = () => { this.closeModal(); this.openResolveModal(id); };
        actEl.appendChild(rb);
      }
      const cl = document.createElement('button');
      cl.className = 'btn btn-outline'; cl.textContent = 'Close';
      cl.onclick = () => this.closeModal();
      actEl.appendChild(cl);

      document.getElementById('bugModal').classList.remove('hidden');
    } catch (err) { this.toast(err.message, 'error'); }
  },

  closeModal(e) {
    if (e && e.target !== document.getElementById('bugModal')) return;
    document.getElementById('bugModal').classList.add('hidden');
    this.pendingBugId = null;
  },

  // ── ASSIGN MODAL ─────────────────────────────────────────────────────────────
  openAssignModal(bugId) {
    this.pendingBugId = bugId;
    const sel = document.getElementById('devSelect');
    sel.innerHTML = this.developers.map(d =>
      `<option value="${d.email}">${d.name} (${d.email})</option>`).join('');
    document.getElementById('assignModal').classList.remove('hidden');
  },

  closeAssignModal(e) {
    if (e && e.target !== document.getElementById('assignModal')) return;
    document.getElementById('assignModal').classList.add('hidden');
  },

  async confirmAssign() {
    const devEmail = document.getElementById('devSelect').value;
    if (!devEmail) return;
    try {
      await API.assignBug(this.pendingBugId, devEmail);
      this.toast(`Query assigned to ${devEmail}.`, 'success');
      document.getElementById('assignModal').classList.add('hidden');
      await this.loadDashboard();
    } catch (err) { this.toast(err.message, 'error'); }
  },

  // ── RESOLVE MODAL ─────────────────────────────────────────────────────────────
  openResolveModal(bugId) {
    this.pendingBugId = bugId;
    document.getElementById('resolveNotes').value = '';
    document.getElementById('resolveModal').classList.remove('hidden');
  },

  closeResolveModal(e) {
    if (e && e.target !== document.getElementById('resolveModal')) return;
    document.getElementById('resolveModal').classList.add('hidden');
  },

  async confirmResolve() {
    const notes = document.getElementById('resolveNotes').value.trim();
    if (!notes) { this.toast('Please describe your fix.', 'error'); return; }
    try {
      await API.resolveBug(this.pendingBugId, notes);
      this.toast('Resolution sent back to Admin.', 'success');
      document.getElementById('resolveModal').classList.add('hidden');
      await this.loadDashboard();
    } catch (err) { this.toast(err.message, 'error'); }
  },

  // ── ADMIN ACTIONS ────────────────────────────────────────────────────────────
  async closeBug(id) {
    if (!confirm('Close this query?')) return;
    try {
      await API.updateStatus(id, 'Closed');
      this.toast('Query closed.', 'success');
      document.getElementById('bugModal').classList.add('hidden');
      await this.loadDashboard();
    } catch (err) { this.toast(err.message, 'error'); }
  },

  async reopenBug(id) {
    if (!confirm('Keep this query open? It will return to the tester queue and be unassigned.')) return;
    try {
      await API.updateStatus(id, 'Open');
      this.toast('Query kept open.', 'success');
      document.getElementById('bugModal').classList.add('hidden');
      await this.loadDashboard();
    } catch (err) { this.toast(err.message, 'error'); }
  },

  async deleteBug(id) {
    if (!confirm('Permanently delete this query?')) return;
    try {
      await API.deleteBug(id);
      this.toast('Query deleted.', 'success');
      document.getElementById('bugModal').classList.add('hidden');
      await this.loadDashboard();
    } catch (err) { this.toast(err.message, 'error'); }
  },

  // ── HELPERS ──────────────────────────────────────────────────────────────────
  priorityIcon(p) { return { High: '🔴', Medium: '🟡', Low: '🟢' }[p] || '⚪'; },
  statusIcon(s)   { return { Open: '📂', Assigned: '🔧', Resolved: '✅', Closed: '🔒' }[s] || '❓'; },

  fmtDate(iso) {
    const d = new Date(iso), t = new Date();
    if (d.toDateString() === t.toDateString())
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const y = new Date(t); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  },

  toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;
