import { createClient } from '@supabase/supabase-js';

// Use the project URL (for example, https://<project-ref>.supabase.co), not
// the REST endpoint ending in /rest/v1. The Supabase client adds that path.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
