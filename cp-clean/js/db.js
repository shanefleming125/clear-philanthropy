const SUPABASE_URL = 'https://raqlumqmxlhecmgntvlt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcWx1bXFteGxoZWNtZ250dmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzE3MDksImV4cCI6MjA5NjAwNzcwOX0.oViokaRl4CWMoOI6BrC8wCW4rq5AI_rjUhtwU_xsumc';

const DB = {
  headers() {
    return {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  },

  async saveAssessment(data) {
    try {
      const existing = localStorage.getItem('cp:' + data.id);
      const method = existing ? 'PATCH' : 'POST';
      const url = existing
        ? `${SUPABASE_URL}/rest/v1/assessments?id=eq.${data.id}`
        : `${SUPABASE_URL}/rest/v1/assessments`;
      const res = await fetch(url, {
        method,
        headers: this.headers(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('DB error ' + res.status);
      localStorage.setItem('cp:' + data.id, JSON.stringify(data));
      return data;
    } catch(e) {
      console.warn('Supabase unavailable, saving locally:', e.message);
      localStorage.setItem('cp:' + data.id, JSON.stringify(data));
      return data;
    }
  },

  async listAssessments() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/assessments?order=created_at.desc&select=*`, {
        headers: this.headers()
      });
      if (!res.ok) throw new Error('DB error');
      return await res.json();
    } catch(e) {
      return this.localList();
    }
  },

  async getAssessment(id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/assessments?id=eq.${id}&select=*`, {
        headers: this.headers()
      });
      if (!res.ok) throw new Error('DB error');
      const rows = await res.json();
      return rows[0] || null;
    } catch(e) {
      const raw = localStorage.getItem('cp:' + id);
      return raw ? JSON.parse(raw) : null;
    }
  },

  async deleteAssessment(id) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/assessments?id=eq.${id}`, {
        method: 'DELETE',
        headers: this.headers()
      });
    } catch(e) {}
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
    return results.sort((a, b) => new Date(b.created_at||b.savedAt) - new Date(a.created_at||a.savedAt));
  }
};
