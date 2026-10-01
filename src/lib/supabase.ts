import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The Supabase client, built from environment variables.
 *
 * Set these in a local `.env` file and in Netlify's environment variables:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...
 *
 * When they're absent the app runs in demo mode: it uses the sample data and
 * nothing is saved. As soon as both are set, the app requires sign-in and every
 * change is persisted to your Supabase project.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabase = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabase
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
