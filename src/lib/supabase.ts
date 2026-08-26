import { createClient } from '@supabase/supabase-js';

// Helper to check if a value is a placeholder
const isPlaceholder = (val: string | undefined) => !val || val.startsWith('your-') || val.includes('placeholder');

// Determine Supabase URL: Prefer env, fallback to proxy
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = !isPlaceholder(envUrl) ? envUrl : '/supabase-proxy';

// Determine Anon Key: Prefer env, fallback to dummy for proxy
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseAnonKey = !isPlaceholder(envKey) ? envKey : 'dummy-anon-key-single-user-proxy';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
