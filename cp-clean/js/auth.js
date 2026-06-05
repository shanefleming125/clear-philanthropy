// auth.js — Clear Philanthropy
// Handles all authentication via Supabase Auth REST API

const SUPABASE_URL = 'https://raqlumqmxlhecmgntvlt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcWx1bXFteGxoZWNtZ250dmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzE3MDksImV4cCI6MjA5NjAwNzcwOX0.oViokaRl4CWMoOI6BrC8wCW4rq5AI_rjUhtwU_xsumc';

const AUTH = {

  // Sign in with email + password
  async signIn(email, password) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error_description || data.msg || 'Invalid email or password.' };
      }
      // Store session in localStorage
      localStorage.setItem('cp_session', JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000),
        user: data.user
      }));
      return { user: data.user };
    } catch(e) {
      return { error: 'Connection error. Please try again.' };
    }
  },

  // Sign out
  async signOut() {
    const session = this.getStoredSession();
    if (session) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON,
            'Authorization': `Bearer ${session.access_token}`
          }
        });
      } catch(e) {
        console.warn('Sign out error:', e.message);
      }
    }
    localStorage.removeItem('cp_session');
    window.location.href = 'login.html';
  },

  // Get current session (refreshes if expired)
  async getSession() {
    const session = this.getStoredSession();
    if (!session) return null;

    // Check if token is still valid (with 60s buffer)
    if (Date.now() < session.expires_at - 60000) {
      return session;
    }

    // Try to refresh
    return await this.refreshSession(session.refresh_token);
  },

  // Refresh expired token
  async refreshSession(refreshToken) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (!res.ok) {
        localStorage.removeItem('cp_session');
        return null;
      }
      const data = await res.json();
      const newSession = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000),
        user: data.user
      };
      localStorage.setItem('cp_session', JSON.stringify(newSession));
      return newSession;
    } catch(e) {
      localStorage.removeItem('cp_session');
      return null;
    }
  },

  // Get stored session from localStorage
  getStoredSession() {
    try {
      const raw = localStorage.getItem('cp_session');
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      return null;
    }
  },

  // Get current access token for API calls
  async getToken() {
    const session = await this.getSession();
    return session?.access_token || null;
  },

  // Get current user
  async getUser() {
    const session = await this.getSession();
    return session?.user || null;
  },

  // Require auth — redirect to login if not signed in
  // Call this at the top of any protected page
  async requireAuth() {
    const session = await this.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  }
};
