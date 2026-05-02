/**
 * API Module — all backend calls
 */
const API = {
  BASE: '/api',
  token: null,

  setToken(t) { this.token = t; },

  async req(method, endpoint, data = null, auth = false) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (auth && this.token)
      opts.headers['Authorization'] = `Bearer ${this.token}`;
    if (data)
      opts.body = JSON.stringify(data);

    const res  = await fetch(`${this.BASE}${endpoint}`, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  },

  // ── AUTH ─────────────────────────────────────────
  login(email, password)  { return this.req('POST', '/auth/login',  { email, password }); },
  getMe()                  { return this.req('GET',  '/auth/me',     null, true); },
  logout()                 { return this.req('POST', '/auth/logout', null, true); },
  getConfig()              { return this.req('GET',  '/auth/config'); },

  // ── BUGS ─────────────────────────────────────────
  createBug(data)          { return this.req('POST', '/bugs', data, true); },
  getBugs(filters = {}) {
    const p = new URLSearchParams();
    if (filters.priority && filters.priority !== 'All') p.set('priority', filters.priority);
    if (filters.status   && filters.status   !== 'All') p.set('status',   filters.status);
    if (filters.search?.trim())                          p.set('search',   filters.search.trim());
    const qs = p.toString();
    return this.req('GET', `/bugs${qs ? '?' + qs : ''}`, null, true);
  },
  getBugById(id)           { return this.req('GET',    `/bugs/${id}`,         null,  true); },
  assignBug(id, devEmail)  { return this.req('PUT',    `/bugs/${id}/assign`,  { developer_email: devEmail }, true); },
  resolveBug(id, notes)    { return this.req('PUT',    `/bugs/${id}/resolve`, { resolved_notes: notes },     true); },
  updateStatus(id, status) { return this.req('PUT',    `/bugs/${id}`,         { status },                    true); },
  deleteBug(id)            { return this.req('DELETE', `/bugs/${id}`,         null,  true); },
  getStats()               { return this.req('GET',    '/bugs/stats/overview', null, true); },
  getDevelopers()          { return this.req('GET',    '/bugs/developers',     null, true); }
};

window.API = API;
