// db.js — Clear Philanthropy
// All Supabase database operations, auth-aware
// Note: SUPABASE_URL and SUPABASE_ANON are defined in auth.js

const DB = {

  async headers() {
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
      if (typeof AUTH !== 'undefined') {
        const user = await AUTH.getUser();
        if (user) data.user_id = user.id;
      }
      const payload = {
        id: data.id,
        data: data,
        created_at: data.created_at || new Date().toISOString()
      };
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
      const userAssessments = rows.map(r => r.data || r);

      const sampleRes = await fetch(`${SUPABASE_URL}/rest/v1/assessments?select=*&data->>is_sample=eq.true`, {
        headers
      });
      let sampleAssessments = [];
      if (sampleRes.ok) {
        const sampleRows = await sampleRes.json();
        sampleAssessments = sampleRows
          .map(r => r.data || r)
          .filter(d => d.is_sample && !userAssessments.find(u => u.id === d.id));
      }

      return [...userAssessments, ...sampleAssessments];
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

  // ── File uploads ───────────────────────────────────────────────────────────

  async uploadFile(assessmentId, file) {
    try {
      const headers = await this.headers();
      // Remove Content-Type so fetch sets correct multipart boundary
      delete headers['Content-Type'];

      // Sanitize filename — remove special chars, preserve extension
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${assessmentId}/${Date.now()}_${safeName}`;

      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/assessment-files/${path}`,
        {
          method: 'POST',
          headers,
          body: file
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Upload failed ' + res.status);
      }

      return { path, name: file.name, size: file.size, type: file.type, uploadedAt: new Date().toISOString() };
    } catch(e) {
      console.error('File upload error:', e.message);
      throw e;
    }
  },

  async listFiles(assessmentId) {
    try {
      const headers = await this.headers();

      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/list/assessment-files`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prefix: `${assessmentId}/`,
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' }
          })
        }
      );

      if (!res.ok) {
        console.warn('listFiles response not ok:', res.status, await res.text());
        return [];
      }
      const files = await res.json();
      console.log('listFiles raw response:', files);
      return (files || []).filter(f => f.name && f.name !== '.emptyFolderPlaceholder');
    } catch(e) {
      console.warn('File list error:', e.message);
      return [];
    }
  },

  async getFileUrl(path) {
    try {
      const headers = await this.headers();

      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/sign/assessment-files/${path}`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresIn: 3600 })
        }
      );

      if (!res.ok) {
        console.warn('getFileUrl not ok:', res.status, await res.text());
        return null;
      }
      const data = await res.json();
      return `${SUPABASE_URL}/storage/v1${data.signedURL}`;
    } catch(e) {
      console.warn('Signed URL error:', e.message);
      return null;
    }
  },

async deleteFile(path) {
    try {
      const headers = await this.headers();
      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/assessment-files`,
        {
          method: 'DELETE',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefixes: [path] })
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('File delete error:', res.status, err);
        throw new Error('Delete failed ' + res.status);
      }
      return true;
    } catch(e) {
      console.warn('File delete error:', e.message);
      return false;
    }
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
 /* ════════════════════════════════════════════════════════════════
   PATCH FOR db.js
   Add these two functions inside the DB object, before the final
   closing }; of the DB object.
   ════════════════════════════════════════════════════════════════ */

  // ── Share token generation ─────────────────────────────────────────────────

  async function generateToken() {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
  },

  async saveShareToken(assessmentId, token) {
    // Fetch the current record, add the token, save back
    try {
      const data = await this.getAssessment(assessmentId);
      if (!data) throw new Error('Assessment not found');
      data.shareToken = token;
      await this.saveAssessment(data);
      return token;
    } catch(e) {
      console.error('saveShareToken error:', e.message);
      throw e;
    }
  },

  async getAssessmentByToken(token) {
    // Public fetch — no auth header, just anon key
    // The assessment record stores shareToken in the data jsonb column
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/assessments?select=data&data->>shareToken=eq.${token}`,
        {
          headers: {
            'apikey': SUPABASE_ANON,
            'Authorization': `Bearer ${SUPABASE_ANON}`,
          }
        }
      );
      if (!res.ok) throw new Error('Not found');
      const rows = await res.json();
      if (!rows.length) return null;
      return rows[0]?.data || null;
    } catch(e) {
      console.error('getAssessmentByToken error:', e.message);
      return null;
    }
  }, 
};
