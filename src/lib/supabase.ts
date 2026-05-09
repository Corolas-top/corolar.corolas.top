import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client configured with PKCE flow for maximum security.
 * PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks.
 * detectSessionInUrl: true - automatically exchanges auth code for session after OAuth redirect.
 * autoRefreshToken: true - automatically refreshes expired access tokens.
 * persistSession: true - persists session in localStorage for SPA behavior.
 */
export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'corolar_sb',
  },
});

export type SupabaseClient = typeof supabase;
