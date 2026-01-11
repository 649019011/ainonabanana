import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './config'

export function createSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null
  }
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!)
}
