// src/lib/supabaseClient.js
// Central Supabase client — import this everywhere instead of axios for auth
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Edge Function base URLs ──────────────────────────────────────────────────
// All complex operations go through Edge Functions using the user's JWT.
// Simple reads could use PostgREST directly via supabase.from('table').select(),
// but for consistency and RBAC enforcement we route everything through Edge Functions.

export const EDGE = {
  workflow:  `${supabaseUrl}/functions/v1/workflow`,
  analytics: `${supabaseUrl}/functions/v1/analytics`,
  quotation: `${supabaseUrl}/functions/v1/quotation`,
  admin:     `${supabaseUrl}/functions/v1/admin`,
};

// ─── Authenticated fetch helper ───────────────────────────────────────────────
// Automatically attaches the current user's JWT to every Edge Function call.
export async function edgeFetch(url, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || localStorage.getItem('token');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    // Only force-logout on genuine JWT expiry/invalidity (401 with JWT-specific message).
    // Normal RBAC 403s or validation 400s must NOT clear the session —
    // they should be handled by the calling component.
    if (res.status === 401 || res.status === 403) {
      const msg = (data.message || '').toLowerCase().trim();
      const isJwtError =
        msg.includes('invalid jwt') ||
        msg.includes('jwt expired') ||
        msg.includes('not authenticated') ||
        msg.includes('token is expired') ||
        msg === 'unauthorized';
      if (isJwtError) {
        console.warn('[edgeFetch] JWT expired — clearing session and redirecting to login.');
        supabase.auth.signOut().catch(() => {});
        localStorage.clear();
        window.location.href = '/login';
        return; // prevent throw after redirect
      }
    }
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

