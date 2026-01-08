import { createBrowserClient } from '@supabase/ssr'

import { supabaseAnonKey, supabaseUrl } from './config'

export function createSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
