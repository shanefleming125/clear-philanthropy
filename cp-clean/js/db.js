// db.js — Clear Philanthropy
// All Supabase database operations, auth-aware

const SUPABASE_URL = 'https://raqlumqmxlhecmgntvlt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcWx1bXFteGxoZWNtZ250dmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzE3MDksImV4cCI6MjA5NjAwNzcwOX0.oViokaRl4CWMoOI6BrC8wCW4rq5AI_rjUhtwU_xsumc';

const DB = {

  async headers() {
    // Use auth token if available, fall back to anon key
    let token = SUPABASE_ANON;
    if (typeof AUTH !== 'undefined') {
      const authToken = await AUTH.getToken();
      if (authToken) token = authToken;
    }
    return {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  },

  async saveAssessment(data) {
    try {
      const headers = await this.headers();
      // Add user_id if logged in
      if (typeof AUTH !== 'undefined') {
        const user = await AUTH.getUser();
        if (user) data.user_id = user.id;
      }
      const payload = {
        id: data.id,
        data: data,
        created_at: data.created_at || new Date().toISOString()
      };
      // Include user_id at row level for RLS
      if (data.user_id) payload.user_id = data.user_id;

      const res = await fetch(`${SUPABASE_URL}/rest/v1/assessments`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('DB error ' + res.status);
      localStorage.setItem('cp:' + data.id, JSON.stringify(data));
      return data;
    } catch(e) {
      console.warn('Supabase save failed, using localStorage:', e.message);
      localStorage.setItem('cp:' + data.id, JSON.stringify(data));
      return data;
    }
  },

  async listAssessments() {
    try {
      const headers = await this.headers();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/assessments?order=created_at.desc&select=*`, {
        headers
      });
      if (!res.ok) throw new Error('DB error');
      const rows = await res.json();
      return rows.map(r => r.data || r);
    } catch(e) {
      console.warn('Supabase list failed, using localStorage');
      return this.localList();
    }
  },

  async getAssessment(id) {
    try {
      const headers = await this.headers();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/assessments?id=eq.${id}&select=*`, {
        headers
      });
      if (!res.ok) throw new Error('DB error');
      const rows = await res.json();
      return rows[0]?.data || rows[0] || null;
    } catch(e) {
      const raw = localStorage.getItem('cp:' + id);
      return raw ? JSON.parse(raw) : null;
    }
  },

  async deleteAssessment(id) {
    try {
      const headers = await this.headers();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/assessments?id=eq.${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('DB error ' + res.status);
    } catch(e) {
      console.warn('Supabase delete failed:', e.message);
    }
    localStorage.removeItem('cp:' + id);
  },

  localList() {
    const results = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cp:')) {
        try { results.push(JSON.parse(localStorage.getItem(key))); } catch(e) {}
      }
    }
    return results.sort((a, b) => new Date(b.created_at || b.savedAt) - new Date(a.created_at || a.savedAt));
  }
};
