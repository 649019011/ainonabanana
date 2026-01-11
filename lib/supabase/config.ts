function getEnv(name: string): string | undefined {
  return process.env[name]
}

export const supabaseUrl = getEnv('SUPABASE_URL')
export const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY')

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey)
}

