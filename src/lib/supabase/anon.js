import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { assertPublicEnv, publicEnv } from '@/src/lib/env';

let anonClient;

export function getAnonSupabase() {
  if (anonClient) return anonClient;
  assertPublicEnv();
  anonClient = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
  return anonClient;
}
