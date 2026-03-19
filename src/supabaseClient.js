import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingVars = [];
if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

if (missingVars.length > 0) {
  const message =
    `[Supabase] Kardesim bak surasi eksik: ${missingVars.join(', ')}. ` +
    'Kontrol: portfoy-app/.env, VITE_ on eki, dev server restart.';

  console.error(message);
  if (typeof window !== 'undefined') {
    alert(message);
  }
  throw new Error(message);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});