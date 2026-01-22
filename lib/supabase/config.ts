function getEnv(name: string): string | undefined {
  return process.env[name]
}

export const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL')
export const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
export const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

export function isSupabaseConfigured(): boolean {
  return !!(
    (getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL')) &&
    (getEnv('SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
  )
}

